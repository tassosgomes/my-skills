import { expect, test } from 'claude-code/testing'

import { parseChecklist, parseStatus, summarize } from './progress'

const md = `## Tasks\n\n- [x] 1.0 A\n- [ ] 2.0 B\n- [ ] 3.0 C\n`

test('parseChecklist lê checkboxes', () => {
  expect(parseChecklist(md).map(t => t.status)).toEqual(['done', 'pending', 'pending'])
})

test('parseStatus lê o frontmatter', () => {
  expect(parseStatus('---\nstatus: validating\n---\n# x')).toBe('validating')
})

test('fases', () => {
  const t = (s: string[]) => s.map((status, i) => ({ id: `${i + 1}.0`, status }))
  expect(summarize('p', t(['done', 'in_progress', 'pending']), null).phase).toBe('dev')
  expect(summarize('p', t(['done', 'validating', 'pending']), null).phase).toBe('review')
  expect(summarize('p', t(['done', 'blocked', 'pending']), null).phase).toBe('blocked')
  expect(summarize('p', t(['done', 'done']), { phase: 'full' }).phase).toBe('integration')
  expect(summarize('p', t(['done', 'in_progress']), null)).toMatchObject({ done: 1, total: 2 })
})
