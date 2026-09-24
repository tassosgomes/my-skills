import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const delegate = join(root, 'skills/tsg-flow-orchestrator/scripts/tsg-delegate.sh');

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
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(process.env.MOCK_CALLS, JSON.stringify(args) + '\\n');
if (args[0] === 'pane' && args[1] === 'split') {
  console.log(JSON.stringify({result:{pane:{pane_id:'pane-test'}}}));
} else if (args[0] === 'agent' && args[1] === 'start') {
  const starts = readFileSync(process.env.MOCK_CALLS, 'utf8').split('\\n')
    .filter(Boolean).map(JSON.parse).filter(a => a[0] === 'agent' && a[1] === 'start').length;
  if (process.env.MOCK_SCENARIO === 'busy_always' ||
      (process.env.MOCK_SCENARIO === 'busy_first_3' && starts <= 3)) {
    console.error(JSON.stringify({error:{code:'agent_pane_busy',message:'not an available shell'}}));
    process.exit(1);
  }
  if (process.env.MOCK_SCENARIO === 'start_not_ready') {
    console.error(JSON.stringify({error:{code:'agent_not_ready'}}));
    process.exit(1);
  }
} else if (args[0] === 'agent' && args[1] === 'prompt') {
  if (process.env.MOCK_SCENARIO === 'prompt_stalled') {
    console.error(JSON.stringify({error:{code:'agent_prompt_stalled'}}));
    process.exit(1);
  }
  const prompt = args[3];
  const prompts = readFileSync(process.env.MOCK_CALLS, 'utf8').split('\\n')
    .filter(Boolean).map(JSON.parse).filter(a => a[0] === 'agent' && a[1] === 'prompt').length;
  if (process.env.MOCK_SCENARIO === 'prompt_lost_once' && prompts === 1) {
    // o paste some: o Herdr ve o agente concluir, mas nada chega ao pane
    console.log(JSON.stringify({result:{agent:{agent_status:'done'}}}));
    process.exit(0);
  }
  writeFileSync(process.env.MOCK_CALLS + '.prompt', prompt);
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
  if (scenario === 'nested_git') {
    result.report = { branch: result.branch, commit: result.commit, base_ref: result.base_ref };
    result.branch = 'SUBSTITUIR'; result.commit = 'SUBSTITUIR';
  }
  const writeResult = () => {
    writeFileSync(resultPath, scenario === 'partial_json' ? '{' : JSON.stringify(result));
    if (typeof result.report === 'string' && scenario !== 'missing_report') {
      writeFileSync(result.report, 'Run: ' + (scenario === 'stale_report' ? 'old-run' : result.run_id) + '\\n');
    }
  };
  if (scenario === 'false_idle') {
    // o agente parece idle antes de terminar; o resultado so aparece no turno retomado
    writeFileSync(process.env.MOCK_CALLS + '.pending', JSON.stringify({ resultPath, result }));
  } else if (scenario !== 'no_result') {
    writeResult();
  }
  if (scenario === 'stalled_then_working') {
    console.error(JSON.stringify({error:{code:'agent_prompt_stalled'}}));
    process.exit(1);
  }
  if (scenario === 'timeout_with_result') {
    console.error(JSON.stringify({error:{code:'timeout'}}));
    process.exit(1);
  }
  console.log(JSON.stringify({result:{agent:{agent_status:
    scenario === 'agent_blocked' ? 'blocked' : 'idle'}}}));
} else if (args[0] === 'agent' && args[1] === 'wait') {
  const scenario = process.env.MOCK_SCENARIO;
  if (args.includes('--until')) {
    if (!['stalled_then_working', 'false_idle'].includes(scenario)) {
      console.error(JSON.stringify({error:{code:'timeout'}}));
      process.exit(1);
    }
    if (scenario === 'false_idle') {
      const { resultPath, result } = JSON.parse(readFileSync(process.env.MOCK_CALLS + '.pending', 'utf8'));
      writeFileSync(resultPath, JSON.stringify(result));
      if (typeof result.report === 'string') writeFileSync(result.report, 'Run: ' + result.run_id + '\\n');
    }
    console.log(JSON.stringify({result:{agent:{agent_status:'working'}}}));
  } else {
    console.log(JSON.stringify({result:{agent:{agent_status:'idle'}}}));
  }
} else if (args[0] === 'agent' && args[1] === 'read') {
  console.log('TASK READY');
} else if (args[0] === 'pane' && args[1] === 'read') {
  // o pane so mostra o prompt que de fato chegou ao agente
  try { console.log(readFileSync(process.env.MOCK_CALLS + '.prompt', 'utf8')); } catch {}
}
`;

function runDelegate(t, {
  role = 'implementer', mode = 'implement', scenario = 'ok', kind = 'codex',
  attempt = '1/3', taskKind = 'vertical', taskKindField = 'task_kind', taskFile = '1_task.md',
  routing = null, fix = null, model = null, effort = null, allowNoCalls = false, shellWaitS = null,
  settleS = '0', pipeHead = false,
} = {}) {
  const f = fix ?? fixture(t);
  const mock = join(f.bin, 'herdr');
  writeFileSync(mock, mockHerdr, { mode: 0o755 });
  // Nome gravado pelo task-creator: 1_task.md para a task 1.0.
  if (taskFile) {
    writeFileSync(join(f.prd, taskFile),
      `---\nstatus: pending\n${taskKindField}: ${taskKind}\nblocked_by: []\n---\n\n# 1.0 Fixture\n`);
  }
  const calls = join(f.dir, 'calls.jsonl');
  const args = [delegate, '--role=' + role, '--prd-dir=' + f.prd,
    '--mode=' + mode, '--attempt=' + attempt];
  if (kind) args.push('--kind=' + kind);
  if (model) args.push('--model=' + model);
  if (effort) args.push('--effort=' + effort);
  if (mode === 'full') args.push('--base-ref=' + f.sha);
  else if (role !== 'integrator' || ['checkpoint-task', 'reopen-task'].includes(mode)) {
    args.push('--task=1.0');
  }
  const logs = join(f.dir, 'logs');
  const result = command('bash',
    pipeHead ? ['-c', 'bash "$@" | head -1', 'bash', ...args] : args, f.repo, {
      HERDR_ENV: '1', HERDR_BIN_PATH: mock, MOCK_SCENARIO: scenario, MOCK_CALLS: calls,
      MOCK_SHA: f.sha, MOCK_TREE: f.tree, TSG_DELEGATE_LOG_DIR: logs,
      ...(routing ? { TSG_ROUTING_FILE: routing } : {}),
      ...(shellWaitS ? { TSG_START_SHELL_TIMEOUT_S: shellWaitS } : {}),
      ...(settleS !== null ? { TSG_START_SETTLE_S: settleS } : {}),
    });
  const recorded = existsSync(calls)
    ? readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
    : [];
  if (!allowNoCalls) {
    const retained = !['ok', 'busy_first_3', 'busy_always', 'failed_gate', 'infra', 'static',
      'blocked', 'stalled_then_working', 'false_idle', 'prompt_lost_once'].includes(scenario);
    // pane read recent-unwrapped e a checagem de entrega do prompt, nao o diagnostico
    const diagnostic = a => a[1] === 'read' && !(a[0] === 'pane' && a.includes('recent-unwrapped'));
    assert.equal(recorded.filter(diagnostic).length, 1,
      'single transcript or diagnostic read');
    assert.equal(recorded.filter(a => a[1] === 'close').length, retained ? 0 : 1,
      'pane cleanup or retention');
  }
  result.prompt = existsSync(calls + '.prompt') ? readFileSync(calls + '.prompt', 'utf8') : '';
  for (const extra of ['', '.prompt', '.pending']) rmSync(calls + extra, { force: true });
  result.fixture = f;
  result.start = recorded.find(a => a[0] === 'agent' && a[1] === 'start') ?? [];
  result.calls = recorded;
  const ledger = join(logs, 'runs.jsonl');
  result.ledger = existsSync(ledger)
    ? readFileSync(ledger, 'utf8').trim().split('\n').map(JSON.parse) : [];
  return result;
}

function startedKind(result) {
  return result.start[result.start.indexOf('--kind') + 1];
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

test('waits for a newly split pane to become an available shell', t => {
  const r = runDelegate(t, { scenario: 'busy_first_3' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.calls.filter(a => a[0] === 'agent' && a[1] === 'start').length, 4);
});

test('reports persistent pane busy with process diagnostics', t => {
  const r = runDelegate(t, { scenario: 'busy_always', shellWaitS: '1' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.at(-1).reason, 'agent_pane_busy');
  assert.ok(r.calls.some(a => a[0] === 'pane' && a[1] === 'process-info'));
});

test('preserves an agent blocked during startup', t => {
  const r = runDelegate(t, { scenario: 'start_not_ready' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.at(-1).reason, 'agent_not_ready');
  assert.equal(r.calls.filter(a => a[0] === 'agent' && a[1] === 'prompt').length, 0);
  assert.ok(r.calls.some(a => a[0] === 'agent' && a[1] === 'get'));
});

test('preserves the agent after a stalled prompt for reconciliation', t => {
  const r = runDelegate(t, { scenario: 'prompt_stalled' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.at(-1).reason, 'agent_prompt_stalled');
  assert.ok(r.calls.some(a => a[0] === 'agent' && a[1] === 'get'));
  assert.equal(r.calls.filter(a => a[0] === 'agent' && a[1] === 'prompt').length, 3,
    'a prompt that never reached the pane is resent at most twice');
});

test('resends a prompt that never reached the pane', t => {
  const r = runDelegate(t, { scenario: 'prompt_lost_once' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /VERDICT: implementation_complete/);
  assert.equal(r.calls.filter(a => a[0] === 'agent' && a[1] === 'prompt').length, 2);
});

test('never resends a prompt that reached the pane', t => {
  const r = runDelegate(t, { scenario: 'no_result' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.at(-1).reason, 'result_missing');
  assert.equal(r.calls.filter(a => a[0] === 'agent' && a[1] === 'prompt').length, 1);
});

test('returns promptly when an agent is blocked and retains its pane', t => {
  const r = runDelegate(t, { scenario: 'agent_blocked' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.at(-1).reason, 'agent_blocked');
  assert.equal(r.calls.filter(a => a[0] === 'agent' && a[1] === 'prompt').length, 1);
});

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

test('follows a turn that starts after the Herdr stall window', t => {
  const r = runDelegate(t, { scenario: 'stalled_then_working' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /VERDICT: implementation_complete/);
  assert.ok(r.calls.some(a => a[0] === 'agent' && a[1] === 'wait' && a.includes('--until')));
  assert.ok(r.calls.some(a => a[0] === 'agent' && a[1] === 'wait' && !a.includes('--until')),
    'waits for the recovered turn to finish');
});

test('keeps waiting when the agent looked idle before writing its result', t => {
  const r = runDelegate(t, { scenario: 'false_idle' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /VERDICT: implementation_complete/);
});

test('integrator git fields are requested at the top level of the result', t => {
  const r = runDelegate(t, { role: 'integrator', mode: 'prepare-prd-branch' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const schema = JSON.parse(r.prompt.match(/\{\n[\s\S]+?\n\}/)[0]);
  for (const field of ['branch', 'commit', 'base_ref', 'target_ref', 'reason']) {
    assert.ok(field in schema, 'schema carries ' + field);
  }
  assert.match(r.prompt, /nunca\s+dentro de report/);
});

test('rejects git fields nested in report instead of the top level', t => {
  const r = runDelegate(t, { role: 'integrator', mode: 'prepare-prd-branch', scenario: 'nested_git' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.at(-1).reason, 'result_invalid');
});

test('the ledger is written even when the reader closes stdout early', t => {
  const r = runDelegate(t, { pipeHead: true });
  assert.equal(r.ledger.length, 1);
  assert.equal(r.ledger[0].outcome, 'implementation_complete');
});

// --- Roteamento por politica e telemetria por chamada ---

test('routing reads task_kind from the N_task.md file the task creator writes', t => {
  const r = runDelegate(t, { kind: null, taskKind: 'enabling', taskFile: '1_task.md' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'opencode');
  assert.equal(r.ledger[0].task_kind, 'enabling');
});

test('routing also accepts a task file named with the full id', t => {
  const r = runDelegate(t, { kind: null, taskKind: 'enabling', taskFile: '1.0_task.md' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'opencode');
});

test('a missing task file stops the call instead of falling back to the generic route', t => {
  const r = runDelegate(t, { kind: null, taskFile: null, allowNoCalls: true });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /arquivo da task 1\.0 inexistente/);
  assert.equal(r.calls.length, 0);
});

test('an invalid start_settle_s in the policy is a usage error', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { codex: { start_settle_s: 'soon' } },
    routes: [{ role: 'implementer', kind: 'codex' }],
  }));
  const r = runDelegate(t, { kind: null, fix: f, routing, settleS: null, allowNoCalls: true });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /start_settle_s invalido para codex/);
});

test('the default policy gives slow-to-render TUIs a start settle interval', () => {
  const policy = JSON.parse(readFileSync(
    join(root, 'skills/tsg-flow-orchestrator/scripts/routing.default.json'), 'utf8'));
  for (const kind of ['opencode', 'agy', 'codex']) {
    assert.ok(policy.kinds[kind].start_settle_s > 1, kind + ' waits longer than the default');
  }
});

test('policy routes a vertical task to the generative kind', t => {
  const r = runDelegate(t, { kind: null, taskKind: 'vertical' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'codex');
  assert.match(r.stdout, /ROUTE: kind=codex .*source=policy/);
});

test('policy routes an enabling task to the cheap kind', t => {
  const r = runDelegate(t, { kind: null, taskKind: 'enabling' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'opencode');
});

test('task routing rejects the ambiguous legacy kind metadata', t => {
  const r = runDelegate(t, {
    kind: null, taskKind: 'vertical', taskKindField: 'kind', allowNoCalls: true,
  });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /task_kind ausente ou invalido/);
});

test('policy routes the integrator to codex', t => {
  const r = runDelegate(t, { role: 'integrator', mode: 'checkpoint-task', kind: null });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'codex');
});

test('policy routes full validation to the strongest kind', t => {
  const r = runDelegate(t, { role: 'validator', mode: 'full', kind: null });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'claude');
});

test('explicit kind overrides the policy entirely', t => {
  const r = runDelegate(t, { kind: 'agy', taskKind: 'enabling' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'agy');
  assert.match(r.stdout, /source=explicit/);
});

test('a second attempt escalates instead of repeating the same kind', t => {
  const first = runDelegate(t, { kind: null, taskKind: 'vertical', attempt: '1/3' });
  const second = runDelegate(t, {
    kind: null, taskKind: 'vertical', attempt: '2/3', fix: first.fixture,
  });
  assert.equal(startedKind(first), 'codex');
  assert.equal(startedKind(second), 'claude');
  assert.match(second.stdout, /note=escalonado/);
});

test('review does not reuse the kind that implemented the task', t => {
  const impl = runDelegate(t, { kind: 'claude', taskKind: 'vertical' });
  const review = runDelegate(t, {
    role: 'validator', mode: 'focused', kind: null, fix: impl.fixture,
  });
  assert.equal(review.status, 0, review.stdout + review.stderr);
  assert.equal(startedKind(review), 'codex');
  assert.match(review.stdout, /anti-afinidade/);
});

test('the ledger records route, kind and outcome per call', t => {
  const r = runDelegate(t, { kind: null, taskKind: 'vertical' });
  assert.equal(r.ledger.length, 1);
  const [entry] = r.ledger;
  assert.equal(entry.role, 'implementer');
  assert.equal(entry.kind, 'codex');
  assert.equal(entry.task_kind, 'vertical');
  assert.equal(entry.route, 'policy');
  assert.equal(entry.outcome, 'implementation_complete');
  assert.equal(entry.gate, 'passed');
  assert.equal(entry.result, 'ok');
  assert.equal(typeof entry.elapsed_s, 'number');
});

test('the ledger also records transport failures with their reason', t => {
  const r = runDelegate(t, { scenario: 'no_result' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(r.ledger.length, 1);
  assert.equal(r.ledger[0].result, 'transport_failure');
  assert.equal(r.ledger[0].reason, 'result_missing');
});

test('the model flag spelling comes from the policy, not a hardcoded -m', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { codex: { model_flag: '-m', model: 'cheap-model' } },
    routes: [{ role: 'implementer', kind: 'codex' }],
  }));
  const r = runDelegate(t, { kind: null, fix: f, routing });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(r.start.slice(r.start.indexOf('--')), ['--', '-m', 'cheap-model']);
  assert.equal(r.ledger[0].model, 'cheap-model');
});

test('claude never receives the short model flag it does not support', t => {
  const r = runDelegate(t, {
    role: 'validator', mode: 'full', kind: null, model: 'some-model',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'claude');
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'some-model', '--effort', 'max']);
});

test('an invalid routing policy stops the call instead of guessing a kind', t => {
  const f = fixture(t);
  const mock = join(f.bin, 'herdr');
  writeFileSync(mock, mockHerdr, { mode: 0o755 });
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({ schema_version: 2 }));
  const r = command('bash', [delegate, '--role=implementer', '--prd-dir=' + f.prd,
    '--mode=implement', '--task=1.0', '--attempt=1/3'], f.repo, {
    HERDR_ENV: '1', HERDR_BIN_PATH: mock, TSG_ROUTING_FILE: routing, MOCK_SCENARIO: 'ok',
    MOCK_CALLS: join(f.dir, 'calls.jsonl'), MOCK_SHA: f.sha, MOCK_TREE: f.tree,
    TSG_DELEGATE_LOG_DIR: join(f.dir, 'logs'), TSG_START_SETTLE_S: '0',
  });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /politica de roteamento invalida/);
});

test('the escalation ladder walks and then clamps to its last kind', t => {
  const f = fixture(t);
  const steps = ['1/3', '2/3', '3/3', '9/9'].map(attempt =>
    startedKind(runDelegate(t, { kind: null, taskKind: 'enabling', attempt, fix: f })));
  assert.deepEqual(steps, ['opencode', 'codex', 'claude', 'claude']);
});

test('a route model wins over the kind default', t => {
  const r = runDelegate(t, { role: 'validator', mode: 'full', kind: null });
  assert.equal(startedKind(r), 'claude');
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-opus-5', '--effort', 'max']);
  assert.equal(r.ledger[0].model, 'claude-opus-5');
});

test('the kind default applies when the route declares no model', t => {
  const r = runDelegate(t, { role: 'validator', mode: 'focused', kind: 'claude' });
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-sonnet-5', '--effort', 'high']);
});

test('an explicit model wins over the route', t => {
  const r = runDelegate(t, {
    role: 'validator', mode: 'full', kind: null, model: 'claude-haiku-4-5',
  });
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-haiku-4-5', '--effort', 'max']);
});

test('escalation drops a route model that belongs to the previous kind', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { codex: { model: 'codex-default' }, claude: { model: 'claude-sonnet-5' } },
    routes: [{
      role: 'implementer', kind: 'codex', model: 'codex-cheap', escalation: ['claude'],
    }],
  }));
  const first = runDelegate(t, { kind: null, fix: f, routing, attempt: '1/3' });
  const second = runDelegate(t, { kind: null, fix: f, routing, attempt: '2/3' });
  assert.deepEqual(first.start.slice(first.start.indexOf('--')), ['--', '--model', 'codex-cheap']);
  assert.deepEqual(second.start.slice(second.start.indexOf('--')),
    ['--', '--model', 'claude-sonnet-5']);
});

// --- Esforco de raciocinio ---

test('full review asks for the highest reasoning effort', t => {
  const r = runDelegate(t, { role: 'validator', mode: 'full', kind: null });
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-opus-5', '--effort', 'max']);
  assert.equal(r.ledger[0].effort, 'max');
});

test('focused review runs at the cheaper effort of the same kind', t => {
  const r = runDelegate(t, { role: 'validator', mode: 'focused', kind: null, taskKind: 'vertical' });
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-sonnet-5', '--effort', 'high']);
});

test('the effort template is per kind, not a shared spelling', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { codex: { effort_args: ['-c', 'model_reasoning_effort="{effort}"'] } },
    routes: [{ role: 'implementer', kind: 'codex', effort: 'medium' }],
  }));
  const r = runDelegate(t, { kind: null, fix: f, routing });
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '-c', 'model_reasoning_effort="medium"']);
});

test('an explicit effort wins over the route', t => {
  const r = runDelegate(t, { role: 'validator', mode: 'full', kind: null, effort: 'low' });
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-opus-5', '--effort', 'low']);
});

test('an effort a kind cannot express is recorded, never silently dropped', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { opencode: { effort_args: [] } },
    routes: [{ role: 'implementer', kind: 'opencode', effort: 'max' }],
  }));
  const r = runDelegate(t, { kind: null, fix: f, routing });
  assert.equal(r.start.includes('--'), false, 'no native args forwarded');
  assert.match(r.stdout, /effort max ignorado: opencode nao expoe esforco/);
  assert.equal(r.ledger[0].effort, null);
});

test('escalation drops a route effort that belongs to the previous kind', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: {
      codex: { effort_args: ['-c', 'model_reasoning_effort="{effort}"'] },
      claude: { effort_args: ['--effort', '{effort}'], effort: 'high' },
    },
    routes: [{ role: 'implementer', kind: 'codex', effort: 'low', escalation: ['claude'] }],
  }));
  const first = runDelegate(t, { kind: null, fix: f, routing, attempt: '1/3' });
  const second = runDelegate(t, { kind: null, fix: f, routing, attempt: '2/3' });
  assert.deepEqual(first.start.slice(first.start.indexOf('--')),
    ['--', '-c', 'model_reasoning_effort="low"']);
  assert.deepEqual(second.start.slice(second.start.indexOf('--')), ['--', '--effort', 'high']);
});

test('a kind that carries effort inside the model name folds it into the value', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { cursor: { model_template: '{model}[effort={effort}]', effort_args: [] } },
    routes: [{ role: 'implementer', kind: 'cursor', model: 'claude-opus-5', effort: 'high' }],
  }));
  const r = runDelegate(t, { kind: null, fix: f, routing });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(r.start.slice(r.start.indexOf('--')),
    ['--', '--model', 'claude-opus-5[effort=high]']);
  assert.equal(r.ledger[0].effort, 'high', 'effort was applied, not dropped');
});

test('a model template without a model falls back to the discard path', t => {
  const f = fixture(t);
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: { cursor: { model_template: '{model}[effort={effort}]', effort_args: [] } },
    routes: [{ role: 'implementer', kind: 'cursor', effort: 'high' }],
  }));
  const r = runDelegate(t, { kind: null, fix: f, routing });
  assert.equal(r.start.includes('--'), false);
  assert.match(r.stdout, /effort high ignorado: cursor nao expoe esforco/);
  assert.equal(r.ledger[0].effort, null);
});
