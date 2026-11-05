import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// TSG_DELEGATE_SKILL roda a mesma suite contra outra copia do orchestrator (ex.: a v2 em comparacao).
const delegateSkill = process.env.TSG_DELEGATE_SKILL || 'tsg-flow-orchestrator';
const delegate = join(root, 'skills', delegateSkill, 'scripts/tsg-delegate.sh');

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
  const prd = join(repo, 'work', 'cap-001-example');
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
  settleS = '0', pipeHead = false, profile = null,
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
  if (kind && !profile) args.push('--kind=' + kind);
  if (profile) args.push('--agent-profile=' + profile);
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

test('only implementer and validator workers are told to use subagents', t => {
  for (const [role, mode, expected] of [['implementer', 'implement', true],
    ['validator', 'focused', true], ['integrator', 'prepare-prd-branch', false]]) {
    const r = runDelegate(t, { role, mode });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(/secao Subagentes d/.test(r.prompt), expected, role);
  }
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
    join(root, 'skills', delegateSkill, 'scripts/routing.default.json'), 'utf8'));
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

test('review does not reuse the model that implemented the task', t => {
  // A politica padrao compara agente + modelo: claude/sonnet implementou, claude/opus revisa.
  const impl = runDelegate(t, { kind: 'claude', taskKind: 'vertical' });
  const review = runDelegate(t, {
    role: 'validator', mode: 'focused', kind: null, fix: impl.fixture,
  });
  assert.equal(review.status, 0, review.stdout + review.stderr);
  assert.equal(startedKind(review), 'claude');
  assert.ok(review.start.includes('claude-opus-5'), review.start.join(' '));
  assert.match(review.stdout, /anti-afinidade/);
  assert.match(review.stdout, /profile=claude-opus-max/);
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

const validatePlan = join(root, 'skills/tsg-flow-task-creator/scripts/validate_plan.py');

function visualPlan(t, { techspecVisual = '', taskVisual = '', fatia = 'V-01' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'tsg-flow-plan-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'techspec.md'),
    `# TechSpec\n\n### Bloco Frontend\n\n#### Referência visual\n\n${techspecVisual}\n\n## Mapa\n`);
  writeFileSync(join(dir, 'tasks.md'), '# Plano\n\n- [ ] 1.0 Roles\n\n| RF-01 | 1.0 |\n');
  writeFileSync(join(dir, '1_task.md'), [
    '---', 'status: pending', 'task_kind: vertical', 'blocked_by: []',
    'gate: "pnpm --filter admin exec vitest run roles"', 'gate_expect: "6 testes passam"', '---', '',
    '# 1.0 Roles', '', `**Fatia:** ${fatia} · **Cobre:** RF-01`, '',
    '## Comportamento', '', 'Lista as roles.', '', taskVisual, '',
    '## Pronto quando', '', '- [ ] a lista aparece', ''].join('\n'));
  return command('python3', [validatePlan, dir], dir);
}

const visualTable = '| Fatia | Tela / estado | Referência | Largura | Cenário |\n|---|---|---|---|---|\n' +
  '| V-01 | Roles, lista | `8:19` | 1440 | /acessos/roles, perfil completo |';
const taskTable = '## Referência visual\n\n| Tela / estado | Referência | Largura | Cenário |\n' +
  '|---|---|---|---|\n| Roles, lista | `8:19` | 1440 | /acessos/roles, perfil completo |';

test('a plan without Figma or mockups needs no visual reference', t => {
  const r = visualPlan(t, { techspecVisual: 'Sem referência visual aprovada.' });
  assert.equal(r.status, 0, r.stdout);
});

test('a screen task must list the frames the TechSpec assigns to its slice', t => {
  const r = visualPlan(t, { techspecVisual: visualTable });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /a fatia V-01 tem referência visual na TechSpec/);
});

test('a screen task listing its frames passes', t => {
  const r = visualPlan(t, { techspecVisual: visualTable, taskVisual: taskTable });
  assert.equal(r.status, 0, r.stdout);
});

test('every TechSpec frame must be delivered by some task', t => {
  const r = visualPlan(t, { techspecVisual: visualTable, fatia: 'V-02' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /referência visual 8:19 da TechSpec não está em nenhuma task/);
});

test('a frame id does not match a longer id', t => {
  const r = visualPlan(t, {
    techspecVisual: visualTable,
    taskVisual: taskTable.replace('`8:19`', '`8:190`'),
  });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /referência visual 8:19 da TechSpec não está em nenhuma task/);
});

const validateState = join(root, 'skills/tsg-flow-next/scripts/validate_state.py');

const fm = (type, version, sources = '') =>
  ['---', `tsg_artifact: ${type}`, 'product: demo', `version: ${version}`, 'status: approved',
    'updated: 2026-11-04', `sources: ${sources}`, '---', ''].join('\n');

// The backlog body uses the exact labels the product skill documents for the gate.
const backlogBody = [
  '# Backlog de Capacidades', '', '### Domínio: Identidade', '',
  '#### CAP-001 — Cadastro', '', '- **Dependências:** nenhuma', '- **Fase:** MVP', '',
  '#### CAP-002 — Login', '', '- **Dependências:** CAP-001', '- **Fase:** MVP', ''].join('\n');

function productState(t, { legacy = false, visionVersion = '1.0' } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'tsg-flow-state-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const p = join(repo, 'docs', 'product');
  mkdirSync(p, { recursive: true });
  const v = 'docs/product/vision.md@1.0';
  const m = 'docs/product/domain-map.md@1.0';
  const b = 'docs/product/architecture-baseline.md@1.0';
  writeFileSync(join(p, 'vision.md'), fm('vision', visionVersion));
  writeFileSync(join(p, 'domain-map.md'), fm('domain-map', '1.0', v));
  writeFileSync(join(p, 'architecture-baseline.md'), fm('architecture-baseline', '1.0', `${v}, ${m}`));
  writeFileSync(join(p, 'capabilities.md'), fm('capability-backlog', '1.0', `${v}, ${m}, ${b}`) + backlogBody);
  const state = {
    schema: 'tsg-flow-state/1', product: 'demo', updated: '2026-11-04',
    artifacts: {
      vision: 'docs/product/vision.md', 'domain-map': 'docs/product/domain-map.md',
      'architecture-baseline': 'docs/product/architecture-baseline.md',
      'capability-backlog': 'docs/product/capabilities.md',
    },
    capability_stages: ['backlog', 'domain', 'prd', 'contract', 'techspec', 'tasks',
      'in_progress', 'done', 'descartada'],
    capabilities: [{ id: 'CAP-001', stage: 'done', mvp_order: 1 },
      { id: 'CAP-002', stage: 'backlog', mvp_order: 2 }],
  };
  writeFileSync(join(legacy ? repo : p, 'flow-state.json'), JSON.stringify(state));
  return repo;
}

test('the gate reads product state from docs/product', t => {
  const repo = productState(t);
  const r = command('python3', [validateState, repo], repo);
  assert.equal(r.status, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /layout legado/);
});

test('the gate parses the backlog format the product skill documents', t => {
  const repo = productState(t);
  const r = command('python3', [validateState, repo, '--capability', 'CAP-002'], repo);
  assert.match(r.stdout, /CAP-002 — Login/);
  assert.match(r.stdout, /dominio\s+Identidade/);
  assert.match(r.stdout, /CAP-001\s+done/);
  assert.match(r.stdout, /VEREDITO: SIM/);
});

test('a stale source is reported against the docs/product path', t => {
  const repo = productState(t, { visionVersion: '1.1' });
  const r = command('python3', [validateState, repo], repo);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /DESATUALIZADO docs\/product\/domain-map\.md .* docs\/product\/vision\.md v1\.0/);
});

test('a root flow-state.json still works and is flagged as legacy', t => {
  const repo = productState(t, { legacy: true });
  const r = command('python3', [validateState, repo], repo);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /AVISO layout legado/);
});

test('without any product state the gate is a usage error', t => {
  const repo = mkdtempSync(join(tmpdir(), 'tsg-flow-state-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const r = command('python3', [validateState, repo], repo);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /docs\/product\/flow-state\.json nao encontrado/);
});

// v2: os quatro papeis vivem em tsg-flow-orchestrator-v2; o worker e chamado pelo papel.
const delegateV2 = join(root, 'skills/tsg-flow-orchestrator-v2/scripts/tsg-delegate.sh');
const skillV2 = join(root, 'skills/tsg-flow-orchestrator-v2');

test('v2 invokes the worker by role inside the single skill', t => {
  for (const role of ['implementer', 'validator', 'integrator']) {
    const f = fixture(t);
    const mock = join(f.bin, 'herdr');
    writeFileSync(mock, mockHerdr, { mode: 0o755 });
    writeFileSync(join(f.prd, '1_task.md'),
      '---\nstatus: pending\ntask_kind: vertical\nblocked_by: []\n---\n\n# 1.0 Fixture\n');
    const calls = join(f.dir, 'calls.jsonl');
    const mode = role === 'implementer' ? 'implement' : role === 'validator' ? 'focused' : 'checkpoint-task';
    const r = command('bash', [delegateV2, '--role=' + role, '--prd-dir=' + f.prd, '--mode=' + mode,
      '--attempt=1/3', '--task=1.0'], f.repo, {
      HERDR_ENV: '1', HERDR_BIN_PATH: mock, MOCK_SCENARIO: 'ok', MOCK_CALLS: calls,
      MOCK_SHA: f.sha, MOCK_TREE: f.tree, TSG_DELEGATE_LOG_DIR: join(f.dir, 'logs'),
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const prompt = readFileSync(calls, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
      .find(a => a[0] === 'agent' && a[1] === 'prompt').join(' ');
    assert.match(prompt, new RegExp('tsg-flow-orchestrator-v2 --role=' + role + ' '), role);
    assert.doesNotMatch(prompt, /tsg-flow-(implementer|validator|integrator)/, role);
  }
});

test('v2 writes its ledger apart from v1 by default', () => {
  const script = readFileSync(delegateV2, 'utf8');
  assert.match(script, /\.tsg-flow\/delegate-logs-v2/);
});

test('v2 router names exactly the role files that exist', () => {
  const router = readFileSync(join(skillV2, 'SKILL.md'), 'utf8');
  const linked = [...router.matchAll(/\]\((roles\/[a-z]+\.md)\)/g)].map(m => m[1]);
  assert.deepEqual(linked.sort(),
    ['roles/coordinator.md', 'roles/implementer.md', 'roles/integrator.md', 'roles/validator.md']);
  for (const file of linked) assert.ok(existsSync(join(skillV2, file)), file);
});

test('v2 router carries no role instructions of its own', () => {
  const router = readFileSync(join(skillV2, 'SKILL.md'), 'utf8');
  for (const marker of [/gate_expect/, /checkpoint-task/, /sensor de discrimina/i, /Coordene sem/]) {
    assert.doesNotMatch(router, marker);
  }
});

test('v2 implementer and validator take gate rules from the shared contract only', () => {
  for (const role of ['implementer', 'validator']) {
    const text = readFileSync(join(skillV2, 'roles', role + '.md'), 'utf8');
    assert.match(text, /gate-contract\.md/, role);
    assert.doesNotMatch(text, /O exit code é o veredito/, role);
    assert.doesNotMatch(text, /Nunca encerre o turno/, role);
  }
});

test('every relative link inside v2 resolves', () => {
  const files = ['SKILL.md', 'roles/coordinator.md', 'roles/implementer.md', 'roles/validator.md',
    'roles/integrator.md', 'references/gate-contract.md', 'references/transport.md'];
  for (const file of files) {
    const text = readFileSync(join(skillV2, file), 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)#:]+\.md)(?:#[^)]*)?\)/g)) {
      const base = join(skillV2, file, '..');
      assert.ok(existsSync(join(base, target)), file + ' -> ' + target);
    }
  }
});

// --- Perfis: agente + modelo + esforco sob um nome da politica --------------------------

function profilePolicy(f, extra = {}) {
  const routing = join(f.dir, 'routing.json');
  writeFileSync(routing, JSON.stringify({
    schema_version: 1,
    kinds: {
      codex: { model_flag: '--model', effort_args: ['-c', 'effort={effort}'], extra_args: ['--kind-arg'] },
      claude: { model_flag: '--model', model: 'claude-default', effort_args: ['--effort', '{effort}'] },
    },
    profiles: {
      'codex-lua': { kind: 'codex', model: 'gpt-lua', effort: 'medium' },
      'codex-sol': { kind: 'codex', model: 'gpt-sol', effort: 'high', extra_args: ['--profile-arg'] },
      'codex-sol-xhigh': { kind: 'codex', model: 'gpt-sol', effort: 'xhigh' },
      'claude-opus': { kind: 'claude', model: 'claude-opus', effort: 'max' },
    },
    routes: [
      { role: 'implementer', profile: 'codex-lua', escalation: ['codex-sol'] },
      { role: 'validator', profile: 'codex-sol' },
    ],
    ...extra,
  }));
  return routing;
}

const afterDash = r => r.start.slice(r.start.indexOf('--'));

test('a profile route opens its agent with the profile model and effort', t => {
  const f = fixture(t);
  const routing = profilePolicy(f);
  const r = runDelegate(t, { kind: null, fix: f, routing });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'codex');
  assert.deepEqual(afterDash(r), ['--', '--model', 'gpt-lua', '-c', 'effort=medium', '--kind-arg']);
  assert.match(r.stdout, /ROUTE: kind=codex model=gpt-lua effort=medium source=policy profile=codex-lua/);
  assert.equal(r.ledger[0].profile, 'codex-lua');
  assert.equal(r.ledger[0].model_id, 'gpt-lua');
});

test('escalation can stay on the same agent with a stronger model', t => {
  const f = fixture(t);
  const routing = profilePolicy(f);
  const r = runDelegate(t, { kind: null, fix: f, routing, attempt: '2/3' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'codex');
  assert.deepEqual(afterDash(r),
    ['--', '--model', 'gpt-sol', '-c', 'effort=high', '--kind-arg', '--profile-arg']);
  assert.match(r.stdout, /profile=codex-sol note=escalonado da tentativa 2/);
});

test('anti-affinity by model lets the same agent review with another model', t => {
  const f = fixture(t);
  const routing = profilePolicy(f, { anti_affinity: {
    enabled: true, roles: ['validator'], by: 'model', preference: ['codex-lua', 'claude-opus'] } });
  runDelegate(t, { kind: null, profile: 'codex-sol', fix: f, routing });
  const review = runDelegate(t, { role: 'validator', mode: 'focused', kind: null, fix: f, routing });
  assert.equal(review.status, 0, review.stdout + review.stderr);
  assert.equal(startedKind(review), 'codex');
  assert.ok(review.start.includes('gpt-lua'), review.start.join(' '));
  assert.match(review.stdout, /anti-afinidade com implementer codex\/gpt-sol/);
});

test('anti-affinity by model does not count an effort change as another reviewer', t => {
  const f = fixture(t);
  const routing = profilePolicy(f, { anti_affinity: {
    enabled: true, roles: ['validator'], by: 'model', preference: ['codex-sol-xhigh', 'codex-lua'] } });
  runDelegate(t, { kind: null, profile: 'codex-sol', fix: f, routing });
  const review = runDelegate(t, { role: 'validator', mode: 'focused', kind: null, fix: f, routing });
  assert.ok(review.start.includes('gpt-lua'), review.start.join(' '));
  assert.match(review.stdout, /profile=codex-lua/);
});

test('anti-affinity without by keeps the strict rule: never the same agent', t => {
  const f = fixture(t);
  const routing = profilePolicy(f, { anti_affinity: {
    enabled: true, roles: ['validator'], preference: ['codex-lua', 'claude-opus'] } });
  runDelegate(t, { kind: null, profile: 'codex-sol', fix: f, routing });
  const review = runDelegate(t, { role: 'validator', mode: 'focused', kind: null, fix: f, routing });
  assert.equal(startedKind(review), 'claude');
  assert.match(review.stdout, /profile=claude-opus/);
});

test('an explicit profile is used as is, without escalation', t => {
  const f = fixture(t);
  const routing = profilePolicy(f);
  const r = runDelegate(t, { kind: null, profile: 'claude-opus', fix: f, routing, attempt: '3/3' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(startedKind(r), 'claude');
  assert.deepEqual(afterDash(r), ['--', '--model', 'claude-opus', '--effort', 'max']);
  assert.match(r.stdout, /source=explicit profile=claude-opus/);
  assert.doesNotMatch(r.stdout, /escalonado/);
});

test('an explicit model still wins over the profile model', t => {
  const f = fixture(t);
  const routing = profilePolicy(f);
  const r = runDelegate(t, { kind: null, profile: 'codex-lua', model: 'gpt-override', fix: f, routing });
  assert.ok(r.start.includes('gpt-override'), r.start.join(' '));
  assert.equal(r.start.includes('gpt-lua'), false);
});

test('an unknown profile is a usage error', t => {
  const f = fixture(t);
  const routing = profilePolicy(f);
  const r = runDelegate(t, { kind: null, profile: 'nao-existe', fix: f, routing, allowNoCalls: true });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /perfil inexistente na politica: nao-existe/);
});

test('kind and profile together are a usage error', t => {
  const r = command('bash', [delegate, '--role=implementer', '--prd-dir=/tmp', '--kind=codex',
    '--agent-profile=codex-lua'], root);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /use --kind ou --agent-profile, nao os dois/);
});

test('a profile without kind is a usage error', t => {
  const f = fixture(t);
  const routing = profilePolicy(f, { profiles: { quebrado: { model: 'x' } } });
  const r = runDelegate(t, { kind: null, profile: 'quebrado', fix: f, routing, allowNoCalls: true });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /perfil quebrado sem kind/);
});

test('every name in the default policy resolves to a profile or a kind', () => {
  const policy = JSON.parse(readFileSync(
    join(root, 'skills', delegateSkill, 'scripts/routing.default.json'), 'utf8'));
  const known = n => n in policy.profiles || n in policy.kinds;
  for (const [name, p] of Object.entries(policy.profiles)) assert.ok(p.kind in policy.kinds, name);
  const names = [
    ...policy.routes.flatMap(r => [r.profile ?? r.kind, ...(r.escalation ?? [])]),
    ...Object.values(policy.escalation).flat(),
    ...policy.anti_affinity.preference,
  ];
  for (const n of names) assert.ok(known(n), n);
});
