import type { AgentInfo, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { sortTasks } from './board'
import type { Task } from '../types'

// 2026-10-06 13:20 local: Progress lines at 13:00 are 20m quiet.
const NOW = new Date(2026, 9, 6, 13, 20).getTime()

const fixture = () => {
  const files: Record<string, { text: string; mtimeMs: number }> = {
    'T1.md': { text: '# T1 — Build pane\n\nStatus: doing\nOwner: Mod builder\n\n## Progress\n13:00 Mod builder | wrote register | test | none\n', mtimeMs: 1 },
    'T2.md': { text: '# T2 — Read prior art\n\nStatus: review\nOwner: Reader\n\n## Progress\n', mtimeMs: 1 },
    'T3.md': { text: '# T3 — Wait on keys\n\nStatus: blocked(user)\nOwner: —\n\n## Progress\n13:15 Coordinator | asked for keys | — | user\n', mtimeMs: 1 },
    'T4.md': { text: '# T4 — Old work\n\nStatus: done(abc123)\nOwner: Reader\n\n## Progress\n', mtimeMs: 1 },
  }
  const roster: AgentInfo[] = [
    { id: 'a1', name: 'mod-builder', description: 'Build pane', type: 'general-purpose', status: 'running' },
    { id: 'a2', name: 'explorer', description: 'Look around', type: 'Explore', status: 'running' },
    { id: 'a3', name: '', description: 'prompt suggestion', type: 'prompt_suggestion', status: 'running' },
  ]

  return { files, roster }
}

const engine = (on: On, fx: ReturnType<typeof fixture>) => {
  const clock = mock.clock(on, { now: NOW })
  on('command.register', async ($, e) => ({ value: { command: e.name } }))
  on('ui.status', async () => ({ value: undefined }))
  on('ui.open', async () => ({ value: undefined as never }))
  on('session.start', async () => ({ cwd: '/repo/sub' }))
  on('session.cwd', async () => ({ value: '/repo/sub' }))
  on('fs.exists', async ($, e) => ({ value: ['/repo/.git', '/repo/tasks'].includes(e.path) }))
  on('fs.list', async () => ({
    value: Object.entries(fx.files).map(([name, f]) => ({ name, kind: 'file' as const, size: 1, mtimeMs: f.mtimeMs, isLink: false })),
  }))
  on('fs.read', async ($, e) => {
    const f = fx.files[e.path.replace('/repo/tasks/', '')]
    if (!f) throw new Error(`unexpected read ${e.path}`)

    return { value: f.text }
  })
  on('agent.list', async () => ({ value: fx.roster }))
  on('ui.render', async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box key="engine">
        <Text>engine</Text>
      </Box>
    )
  })

  return clock
}

const start = ($: { session: { start: (e: never) => Promise<unknown> } }) =>
  $.session.start({ cwd: '/repo/sub', surface: 'terminal', isInteractive: true } as never)

const PANE = {
  plugin: 'coordinator',
  component: 'Pane',
  requestId: 'coordinator',
  props: { title: 'Coordinator', isFocused: false, bodyColumns: 100 } as never,
} as const

test('sort puts blocked, review, doing, todo first and done last', () => {
  const t = (id: string, status: string) => ({ id, status }) as Task
  const order = sortTasks([t('T1', 'done(x)'), t('T2', 'todo'), t('T3', 'doing'), t('T4', 'review'), t('T5', 'blocked(me)')])
  expect(order.map(x => x.id)).toEqual(['T5', 'T4', 'T3', 'T2', 'T1'])
})

test('pane redraws on its own after a task file edit and an agent spawn', async ($, on) => {
  const fx = fixture()
  const clock = engine(on, fx)
  await start($)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'summary', text: 'doing 1 · review 1 · blocked 1 · 2 running' })).toBeDefined()
    // Needs-attention first; done collapsed.
    const keys = (await ui.findAll({ type: 'Box' })).map(b => b.key).filter(k => k?.startsWith('task-'))
    expect(keys).toEqual(['task-T3', 'task-T2', 'task-T1'])
    expect(await ui.find({ key: 'closed', text: '1 done' })).toBeDefined()
    // Matched by owner; helper loop hidden; unmatched running agent listed.
    expect(await ui.find({ key: 'task-T1', text: /running/ })).toBeDefined()
    expect(await ui.find({ key: 'task-T1', text: /quiet 20m/ })).toBeDefined()
    expect(await ui.find({ key: 'agent-a2' })).toBeDefined()
    expect(await ui.find({ key: 'agent-a3' })).toBeUndefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  fx.files['T1.md'] = {
    text: '# T1 — Build pane\n\nStatus: review\nOwner: Mod builder\n\n## Progress\n13:20 Mod builder | tests green | review | none\n',
    mtimeMs: 2,
  }
  fx.roster = [...fx.roster, { id: 'a9', name: 'fixer', description: 'T2 fix the reader', type: 'general-purpose', status: 'running' }]
  await clock.advance(1000)
  expect(await ui.find({ key: 'task-T1', text: /tests green/ })).toBeDefined()
  expect(await ui.find({ key: 'summary', text: 'review 2' })).toBeDefined()
  // Matched by the task ID in its brief.
  expect(await ui.find({ key: 'task-T2', text: /running/ })).toBeDefined()
  expect(await ui.find({ key: 'agent-a9' })).toBeUndefined()
  await ui.unmount()
})

test('/coordinator answers a Markdown board for clients without panes', async ($, on) => {
  engine(on, fixture())
  await start($)
  const ran = await $.command.run({ command: 'coordinator', args: '' } as never)
  const text = 'text' in ran ? String(ran.text) : ''
  expect(text).toContain('| ID | Task | Status | Owner | Last progress | Quiet |')
  expect(text.indexOf('| T3 |')).toBeLessThan(text.indexOf('| T2 |'))
  expect(text.indexOf('| T1 |')).toBeLessThan(text.indexOf('| T4 |'))
  expect(text).toContain('Mod builder (running)')
  expect(text).toContain('| 20m |')
})

test('band shows counts only on narrow terminals and passes on otherwise', async ($, on) => {
  engine(on, fixture())
  await start($)
  const band = (bodyColumns: number) =>
    $.ui.mount({
      plugin: 'coordinator',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns } as never,
    })
  const narrow = await band(80)
  expect(await narrow.find({ key: 'coordinator-band', text: /doing 1/ })).toBeDefined()
  await narrow.unmount()
  const wide = await band(200)
  expect(await wide.find({ key: 'coordinator-band' })).toBeUndefined()
  expect(await wide.find({ key: 'engine' })).toBeDefined()
  await wide.unmount()
})
