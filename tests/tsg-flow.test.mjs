import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const delegate = join(root, 'skills/tsg-flow-orchestrator/scripts/tsg-delegate.sh');
const dotnetGate = join(root, 'skills/tsg-flow-gate-creator/reference/gate.dotnet.sh');
const skeleton = join(root, 'skills/tsg-flow-gate-creator/templates/gate.skeleton.sh');

function command(bin, args, cwd, env = {}) {
  return spawnSync(bin, args, {
    cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 10000,
  });
}

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tsg-flow-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, 'repo with spaces');
  const bin = join(dir, 'bin');
  mkdirSync(repo); mkdirSync(bin);
  for (const args of [
    ['init', '-q', '--initial-branch=main'],
    ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '-q', '--allow-empty', '-m', 'fixture base'],
  ]) {
    const r = command('git', args, repo);
    assert.equal(r.status, 0, r.stderr);
  }
  const prd = join(repo, 'tasks', 'prd-example');
  mkdirSync(prd, { recursive: true });
  const sha = command('git', ['rev-parse', 'HEAD'], repo).stdout.trim();
  const tree = command('git', ['rev-parse', 'HEAD^{tree}'], repo).stdout.trim();
  return { dir, repo, bin, prd, sha, tree };
}

const mockHerdr = `#!/usr/bin/env node
import { appendFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(process.env.MOCK_CALLS, JSON.stringify(args.slice(0, 3)) + '\\n');
if (args[0] === 'pane' && args[1] === 'split') {
  console.log(JSON.stringify({result:{pane:{pane_id:'pane-test'}}}));
} else if (args[0] === 'agent' && args[1] === 'prompt') {
  const prompt = args[3];
  const resultPath = prompt.match(/Grave o resultado final em (.*), somente depois/)[1];
  const result = JSON.parse(prompt.match(/\\{\\n[\\s\\S]+?\\n\\}/)[0]);
  const scenario = process.env.MOCK_SCENARIO;
  const success = {
    'prepare-prd-branch':'branch_ready', 'checkpoint-task':'checkpoint_ok',
    'reopen-task':'task_reopened', 'prepare-integration':'integration_ready',
    'complete-prd':'prd_complete'
  };
  result.outcome = result.role === 'implementer' ? 'implementation_complete' :
    result.role === 'validator' ? 'approved' : success[result.mode];
  result.gate = result.role === 'integrator' ? 'not_run' : 'passed';
  if (result.role === 'integrator') {
    result.branch = 'feature/example';
    result.commit = process.env.MOCK_SHA;
    result.base_ref = process.env.MOCK_SHA;
    result.target_ref = process.env.MOCK_SHA;
  }
  if (result.mode === 'full') {
    result.validated_commit = process.env.MOCK_SHA;
    result.validated_tree = process.env.MOCK_TREE;
    result.base_ref = process.env.MOCK_SHA;
  }
  if (scenario === 'wrong_run') result.run_id = 'old-run';
  if (scenario === 'wrong_task') result.task = '99.0';
  if (scenario === 'failed_gate') {
    result.outcome = result.role === 'validator' ? 'rejected' : 'gate_failed';
    result.gate = 'failed';
  }
  if (scenario === 'false_complete') result.gate = 'not_run';
  if (scenario === 'static') result.gate = 'static_passed';
  if (scenario === 'infra') {
    result.outcome = result.role === 'validator' ? 'validation_error' : 'gate_error';
    result.gate = 'error';
  }
  if (scenario === 'blocked') {
    result.outcome = 'integration_blocked'; result.reason = 'missing delivery authority';
  }
  if (scenario !== 'no_result') {
    writeFileSync(resultPath, scenario === 'partial_json' ? '{' : JSON.stringify(result));
  }
  if (result.report && scenario !== 'missing_report') {
    writeFileSync(result.report, 'Run: ' + (scenario === 'stale_report' ? 'old-run' : result.run_id) + '\\n');
  }
  console.log('TASK READY');
  if (scenario === 'timeout_with_result') process.exit(1);
} else if (args[0] === 'agent' && args[1] === 'read') {
  console.log('TASK READY');
}
`;

function runDelegate(t, { role = 'implementer', mode = 'implement', scenario = 'ok' } = {}) {
  const f = fixture(t);
  const mock = join(f.bin, 'herdr');
  writeFileSync(mock, mockHerdr, { mode: 0o755 });
  const calls = join(f.dir, 'calls.jsonl');
  const args = [delegate, '--role=' + role, '--kind=codex', '--prd-dir=' + f.prd,
    '--mode=' + mode, '--attempt=1/3'];
  if (mode === 'full') args.push('--base-ref=' + f.sha);
  else if (role !== 'integrator' || ['checkpoint-task', 'reopen-task'].includes(mode)) {
    args.push('--task=1.0');
  }
  const result = command('bash', args, f.repo, {
    HERDR_BIN_PATH: mock, MOCK_SCENARIO: scenario, MOCK_CALLS: calls,
    MOCK_SHA: f.sha, MOCK_TREE: f.tree, TSG_DELEGATE_LOG_DIR: join(f.dir, 'logs'),
  });
  const recorded = readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(recorded.filter(a => a[1] === 'read').length, 1, 'single transcript read');
  assert.equal(recorded.filter(a => a[1] === 'close').length, 1, 'pane cleanup');
  return result;
}

for (const [role, mode] of [
  ['implementer', 'implement'], ['implementer', 'fix'], ['validator', 'focused'],
  ['validator', 'revalidation'], ['validator', 'full'],
  ...['prepare-prd-branch', 'checkpoint-task', 'reopen-task', 'prepare-integration', 'complete-prd']
    .map(mode => ['integrator', mode]),
]) {
  test('transport accepts final result: ' + role + '/' + mode, t => {
    const r = runDelegate(t, { role, mode });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /DELEGATE result=ok/);
  });
}

for (const scenario of ['wrong_run', 'wrong_task', 'no_result', 'partial_json',
  'timeout_with_result', 'false_complete']) {
  test('transport rejects incomplete or mismatched result: ' + scenario, t => {
    const r = runDelegate(t, { scenario });
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /TRANSPORT_FAILURE/);
  });
}

for (const scenario of ['missing_report', 'stale_report']) {
  test('validator requires report from current run: ' + scenario, t => {
    const r = runDelegate(t, { role: 'validator', mode: 'focused', scenario });
    assert.equal(r.status, 2, r.stdout + r.stderr);
  });
}

for (const scenario of ['failed_gate', 'infra', 'static']) {
  test('transport preserves worker result: ' + scenario, t => {
    const r = runDelegate(t, { scenario });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /VERDICT: (gate_failed|gate_error|implementation_complete)/);
  });
}

test('integrator can return a concrete operational blocker', t => {
  const r = runDelegate(t, { role: 'integrator', mode: 'complete-prd', scenario: 'blocked' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /VERDICT: integration_blocked/);
});

const mockDotnet = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(process.env.MOCK_CALLS, JSON.stringify(args) + '\\n');
if (process.env.MOCK_TIMEOUT === '1') process.exit(124);
if (args[0] === 'format' && process.env.MOCK_FORMAT_FAIL === '1') {
  for (let n = 0; n < 100; n++) console.log('format-error-' + n);
  process.exit(1);
}
if (args[0] === 'test') {
  console.log('Passed! - Failed: 0, Passed: ' + (args.includes('missing') ? 0 : 2) + ', Skipped: 0');
}
`;

function runGate(t, args, options = {}) {
  const f = fixture(t);
  writeFileSync(join(f.repo, 'App.sln'), 'fixture\n');
  writeFileSync(join(f.repo, 'Removed.cs'), 'fixture\n');
  command('git', ['add', 'Removed.cs'], f.repo);
  const commit = command('git', ['-c', 'user.name=Fixture', '-c',
    'user.email=fixture@example.invalid', 'commit', '-qm', 'tracked source'], f.repo);
  assert.equal(commit.status, 0, commit.stderr);
  rmSync(join(f.repo, 'Removed.cs'));
  if (options.source) writeFileSync(join(f.repo, 'Source with spaces.cs'), 'fixture\n');
  writeFileSync(join(f.bin, 'dotnet'), mockDotnet, { mode: 0o755 });
  const calls = join(f.dir, 'gate-calls.jsonl');
  let script = dotnetGate;
  if (options.skeleton) {
    script = join(f.dir, 'generated-gate.sh');
    const generated = readFileSync(skeleton, 'utf8')
      .replace("SOURCE_EXT_REGEX='\\.EXT$'", () => "SOURCE_EXT_REGEX='\\.cs$'")
      .replaceAll('FORMAT_TOOL', 'dotnet format')
      .replaceAll('BUILD_TOOL', 'dotnet build')
      .replaceAll('ALL_TESTS_TOOL', 'dotnet test')
      .replaceAll('TEST_TOOL', 'dotnet test')
      .replaceAll('PASSED_PATTERN', 'Passed:');
    writeFileSync(script, generated);
  }
  const result = command('bash', [script, ...args], f.repo, {
    PATH: f.bin + ':' + process.env.PATH,
    MOCK_CALLS: calls,
    MOCK_TIMEOUT: options.timeout ? '1' : '0',
    MOCK_FORMAT_FAIL: options.formatFail ? '1' : '0',
  });
  return {
    result,
    calls: existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse) : [],
  };
}

for (const skeleton of [false, true]) {
  const label = skeleton ? 'generated skeleton' : 'dotnet reference';
  for (const args of [[], ['--filter='], ['--filter=   '], ['--static', '--all-tests'],
    ['--static', '--filter=exists'], ['--all-tests', '--skip-tests'],
    ['--static', '--base=missing-ref']]) {
    test(label + ' rejects invalid selection before build: ' + JSON.stringify(args), t => {
      const { result, calls } = runGate(t, args, { skeleton });
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.equal(calls.length, 0);
    });
  }
  test(label + ' static evidence excludes deleted files and does not run tests', t => {
    const { result, calls } = runGate(t, ['--static'], { skeleton, source: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(calls.filter(a => a[0] === 'test').length, 0);
    const format = calls.find(a => a[0] === 'format');
    assert.ok(format.includes('Source with spaces.cs'));
    assert.ok(!format.includes('Removed.cs'));
  });
  for (const [selector, expected] of [['exists', 0], ['missing', 1]]) {
    test(label + ' behavioral selector: ' + selector, t => {
      const { result } = runGate(t, ['--filter=' + selector], { skeleton });
      assert.equal(result.status, expected, result.stdout + result.stderr);
    });
  }
  test(label + ' full explicitly runs all tests', t => {
    const { result, calls } = runGate(t, ['--all-tests'], { skeleton });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(calls.filter(a => a[0] === 'test').length, 1);
    assert.ok(!calls.find(a => a[0] === 'test').includes('--filter'));
  });
  test(label + ' timeout is infrastructure, not convergence failure', t => {
    const { result } = runGate(t, ['--static'], { skeleton, timeout: true });
    assert.equal(result.status, 2, result.stdout + result.stderr);
  });
  test(label + ' failure output stays bounded', t => {
    const { result } = runGate(t, ['--static'], { skeleton, source: true, formatFail: true });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.ok(result.stdout.trim().split('\n').length <= 45);
    assert.match(result.stdout, /format-error-99/);
  });
}
