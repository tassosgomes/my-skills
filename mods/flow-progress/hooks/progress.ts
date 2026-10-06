import type { Phase, Progress } from '../types'

export type TaskInfo = { id: string; status: string }

export type FlowState = {
  phase?: string
  active_task?: string | null
  last_result?: unknown
}

// `- [x] 1.0 Título` under tasks.md; the checkbox is the Integrator's record of done.
export const parseChecklist = (md: string): TaskInfo[] =>
  [...md.matchAll(/^\s*- \[([ xX])\]\s+(\d+(?:\.\d+)*)/gm)].map(m => ({
    id: m[2],
    status: m[1] === ' ' ? 'pending' : 'done',
  }))

// Canonical frontmatter values: pending | in_progress | validating | blocked | done.
export const parseStatus = (md: string): string | null => {
  const front = md.match(/^---\n([\s\S]*?)\n---/)
  const line = front?.[1].match(/^status:\s*([a-z_]+)/m)
  return line ? line[1] : null
}

const fromStatus = (status: string): Phase | null =>
  status === 'in_progress'
    ? 'dev'
    : status === 'validating'
      ? 'review'
      : status === 'blocked'
        ? 'blocked'
        : null

const fromPhase = (phase: string): Phase =>
  /block/i.test(phase)
    ? 'blocked'
    : /integrat|full|complete|deliver/i.test(phase)
      ? 'integration'
      : /validat|review|revalid/i.test(phase)
        ? 'review'
        : /implement|fix|dev/i.test(phase)
          ? 'dev'
          : 'idle'

export const summarize = (
  prd: string,
  tasks: TaskInfo[],
  state: FlowState | null,
): Progress => {
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const blocked = tasks.find(t => t.status === 'blocked')
  const active =
    tasks.find(t => t.id === state?.active_task) ??
    tasks.find(t => fromStatus(t.status) !== null && t.status !== 'blocked')

  let phase: Phase
  let task: string | null = null

  if (blocked) {
    phase = 'blocked'
    task = blocked.id
  } else if (total > 0 && done === total) {
    phase = /complete|done/i.test(state?.phase ?? '') && !/full|integrat/i.test(state?.phase ?? '')
      ? 'done'
      : 'integration'
  } else if (active && fromStatus(active.status)) {
    phase = fromStatus(active.status) as Phase
    task = active.id
  } else {
    phase = state?.phase ? fromPhase(state.phase) : 'idle'
    task = state?.active_task ?? null
  }

  return { prd, done, total, phase, task }
}
