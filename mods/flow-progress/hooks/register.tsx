import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Phase, Progress } from '../types'
import { parseChecklist, parseStatus, summarize } from './progress'
import type { FlowState, TaskInfo } from './progress'

const progress = atom({ plugin: 'flow-progress', key: 'progress' } as const, null)
const isHidden = atom({ plugin: 'flow-progress', key: 'isHidden' } as const, false)

const POLL_MS = 3000
const LABEL: Record<Phase, string> = {
  dev: '⚙ desenvolvimento',
  review: '🔍 review',
  blocked: '⛔ bloqueada',
  integration: '🔀 integração',
  done: '✅ concluído',
  idle: '⏸ aguardando',
}

// The newest `tasks/prd-*/flow-state.json` is the PRD being orchestrated.
async function scan($: any): Promise<Progress | null> {
  const entries = await $.fs.list('tasks').catch(() => [])
  let best: { dir: string; mtime: number } | null = null

  for (const entry of entries) {
    if (entry.kind !== 'directory' || !entry.name.startsWith('prd-')) continue
    const dir = `tasks/${entry.name}`
    const stat = await $.fs.stat(`${dir}/flow-state.json`).catch(() => null)
    if (stat && (!best || stat.mtimeMs > best.mtime)) best = { dir, mtime: stat.mtimeMs }
  }
  if (!best) return null

  const state: FlowState | null = await $.fs
    .read(`${best.dir}/flow-state.json`)
    .then((t: string) => JSON.parse(t))
    .catch(() => null)
  const checklist: TaskInfo[] = await $.fs
    .read(`${best.dir}/tasks.md`)
    .then(parseChecklist)
    .catch(() => [])

  // Frontmatter status is finer than the checkbox (in_progress, validating, blocked).
  const tasks = await Promise.all(
    checklist.map(async t => {
      const status = await $.fs
        .read(`${best.dir}/${t.id.split('.')[0]}_task.md`)
        .then(parseStatus)
        .catch(() => null)
      return { id: t.id, status: t.status === 'done' ? 'done' : (status ?? t.status) }
    }),
  )

  return summarize(best.dir.replace('tasks/', ''), tasks, state)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const refresh = async () => {
      const found = await scan($)
      await update($, progress, () => found)
    }
    await refresh()
    $.clock.every(POLL_MS, refresh)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = (await read($, progress)) as Progress | null

    if (e.props.hasSurvey || !p || p.total === 0 || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const width = 10
    const filled = Math.round((p.done / p.total) * width)
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
    const color =
      p.phase === 'blocked' ? 'red' : p.phase === 'done' ? 'green' : p.phase === 'review' ? 'yellow' : 'cyan'

    return (
      <Box>
        <Text dimColor>{p.prd} </Text>
        <Text>
          {bar} {p.done}/{p.total}{' '}
        </Text>
        <Text color={color}>
          {LABEL[p.phase]}
          {p.task ? ` (task ${p.task})` : ''}{' '}
        </Text>
        <Button key="hide" label="Ocultar" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
