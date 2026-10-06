import type { AgentInfo, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { sortTasks } from './board'
import type { Task } from '../types'

// 2026-10-06 13:20 local: Progress lines at 13:00 are 20m quiet.
const NOW = new Date(2026, 9, 6, 13, 20).getTime()
const SESSION = 'sess-1'

type Files = Record<string, { text: string; mtimeMs: number }>

const task = (id: string, title: string, status: string, owner: string, progress = '', session = SESSION) =>
  `# ${id} — ${title}\n\nStatus: ${status}\nOwner: ${owner}\nSession: ${session}\n\n## Progress\n${progress}`

const fixture = (dir = '/repo/tasks') => {
  const files: Files = {
    [`${dir}/T1.md`]: { text: task('T1', 'Build pane', 'doing', 'Mod builder', '13:00 Mod builder | wrote register | test | none\n'), mtimeMs: 1 },
    [`${dir}/T2.md`]: { text: task('T2', 'Read prior art', 'review', 'Reader'), mtimeMs: 1 },
    [`${dir}/T3.md`]: { text: task('T3', 'Wait on keys', 'blocked(user)', '—', '13:15 Coordinator | asked for keys | — | user\n'), mtimeMs: 1 },
    [`${dir}/T4.md`]: { text: task('T4', 'Old work', 'done(abc123)', 'Reader'), mtimeMs: 1 },
  }
  const roster: AgentInfo[] = [
    { id: 'a1', name: 'mod-builder', description: 'Build pane', type: 'general-purpose', status: 'running' },
    { id: 'a2', name: 'explorer', description: 'Look around', type: 'Explore', status: 'running' },
    { id: 'a3', name: '', description: 'prompt suggestion', type: 'prompt_suggestion', status: 'running' },
  ]

  return {
    files,
    roster,
    gits: ['/repo/.git'],
    cwd: '/repo/sub',
    pinned: [] as (string | undefined)[],
    modes: [] as readonly string[],
    refuse: '',
    logs: [] as string[],
  }
}

type Fixture = ReturnType<typeof fixture>

// What the engine answers beneath the plugin, over an in-memory file tree.
const engine = (on: On, fx: Fixture) => {
  const clock = mock.clock(on, { now: NOW })
  const isDir = (path: string) => Object.keys(fx.files).some(f => f.startsWith(`${path}/`))
  on('command.register', async ($, e) => {
    if (fx.refuse) return { deny: fx.refuse }

    return { value: { command: e.name } }
  })
  on('ui.log', async ($, e) => {
    fx.logs.push(e.text)

    return { value: undefined }
  })
  on('ui.status', async ($, e) => {
    fx.pinned.push(e.text)

    return { value: undefined }
  })
  on('ui.open', async () => ({ value: undefined as never }))
  on('session.start', async () => ({ cwd: fx.cwd }))
  on('session.cwd', async () => ({ value: fx.cwd }))
  on('session.id', async () => ({ value: SESSION }))
  on('fs.exists', async ($, e) => ({ value: fx.gits.includes(e.path) || e.path in fx.files || isDir(e.path) }))
  on('fs.list', async ($, e) => {
    const names = new Map<string, 'file' | 'dir'>()
    for (const f of Object.keys(fx.files)) {
      if (!f.startsWith(`${e.path}/`)) continue
      const [head = '', ...tail] = f.slice(e.path.length + 1).split('/')
      names.set(head, tail.length ? 'dir' : 'file')
    }
    const value = [...names].map(([name, kind]) => ({
      name,
      kind,
      size: 1,
      mtimeMs: fx.files[`${e.path}/${name}`]?.mtimeMs ?? 0,
      isLink: false,
    }))

    return { value }
  })
  on('fs.read', async ($, e) => {
    const f = fx.files[e.path]
    if (!f) throw new Error(`unexpected read ${e.path}`)

    return { value: f.text }
  })
  on('agent.list', async () => ({ value: fx.roster }))
  on('ui.render', async ($, e) => {
    if (e.component === 'SessionMode') fx.modes = e.props.modes
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box key="engine">
        <Text>engine</Text>
      </Box>
    )
  })

  return clock
}

const start = ($: { session: { start: (e: never) => Promise<unknown> } }, cwd = '/repo/sub') =>
  $.session.start({ cwd, surface: 'terminal', isInteractive: true } as never)

const PANE = {
  plugin: 'coordinator',
  component: 'Pane',
  requestId: 'coordinator',
  props: { title: 'Coordinator', isFocused: false, bodyColumns: 70 } as never,
} as const

const rowKeys = async (ui: { findAll: (q: { type: string }) => Promise<readonly { key?: string }[]> }, prefix: string) =>
  (await ui.findAll({ type: 'Box' })).map(b => b.key).filter(k => k?.startsWith(prefix))

test('sort puts blocked, review, doing, todo first and done last', () => {
  const t = (id: string, status: string) => ({ id, status }) as Task
  const order = sortTasks([t('T1', 'done(x)'), t('T2', 'todo'), t('T3', 'doing'), t('T4', 'review'), t('T5', 'blocked(me)')])
  expect(order.map(x => x.id)).toEqual(['T5', 'T4', 'T3', 'T2', 'T1'])
})

test('pane: one row per task, running agents on top, done collapsed, redraws after a file edit', async ($, on) => {
  const fx = fixture()
  const clock = engine(on, fx)
  await start($)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'summary', text: 'doing 1 · review 1 · blocked 1 · 2 running' })).toBeDefined()
    expect(await rowKeys(ui, 'task-')).toEqual(['task-T3', 'task-T2', 'task-T1'])
    expect(await ui.find({ key: 'closed', text: '1 done' })).toBeDefined()
    // Running agents first, each with its task; helper loop hidden.
    expect(await rowKeys(ui, 'agent-')).toEqual(['agent-a1', 'agent-a2'])
    expect(await ui.find({ key: 'agent-a1', text: /T1/ })).toBeDefined()
    // Short status, no evidence; owner marked live; staleness.
    expect(await ui.find({ key: 'task-T3', text: /blocked\s/ })).toBeDefined()
    expect(await ui.find({ key: 'task-T3', text: /\(user\)/ })).toBeUndefined()
    expect(await ui.find({ key: 'task-T1', text: /● Mod builder/ })).toBeDefined()
    expect(await ui.find({ key: 'task-T1', text: /quiet 20m/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  fx.files['/repo/tasks/T1.md'] = { text: task('T1', 'Build pane', 'review', 'Mod builder', '13:20 Mod builder | tests green | review | none\n'), mtimeMs: 2 }
  fx.roster = [...fx.roster, { id: 'a9', name: 'fixer', description: 'T2 fix the reader', type: 'general-purpose', status: 'running' }]
  await clock.advance(1000)
  expect(await ui.find({ key: 'summary', text: 'review 2' })).toBeDefined()
  expect(await ui.find({ key: 'task-T1', text: /review/ })).toBeDefined()
  // Matched by the task ID in its brief.
  expect(await ui.find({ key: 'agent-a9', text: /T2/ })).toBeDefined()
  expect(await ui.find({ key: 'task-T2', text: /● Reader/ })).toBeDefined()
  await ui.unmount()
})

test('session started in a parent repo finds its tasks in a child repo', async ($, on) => {
  const fx = fixture('/dev/child/tasks')
  fx.gits = ['/dev/.git', '/dev/child/.git']
  fx.cwd = '/dev'
  fx.files['/dev/other/tasks/X1.md'] = { text: task('X1', 'Not ours', 'doing', 'Someone', '', 'other-session'), mtimeMs: 1 }
  engine(on, fx)
  await start($, '/dev')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'summary', text: 'doing 1 · review 1 · blocked 1' })).toBeDefined()
  expect(await ui.find({ key: 'task-X1' })).toBeUndefined()
  await ui.unmount()
})

test('/coordinator answers a Markdown board for clients without panes', async ($, on) => {
  engine(on, fixture())
  await start($)
  const ran = await $.command.run({ command: 'coordinator', args: '' } as never)
  const text = 'text' in ran ? String(ran.text) : ''
  expect(text).toContain('| ID | Task | Status | Owner | Coordinator | Last progress | Quiet |')
  expect(text.indexOf('| T3 |')).toBeLessThan(text.indexOf('| T2 |'))
  expect(text.startsWith('**Board:** doing 1 · review 1 · blocked 1')).toBe(true)
  expect(text).toContain('| T3 | Wait on keys | blocked | — | sess-1 | asked for keys |  |')
  expect(text).toContain('| T1 | Build pane | doing | Mod builder (running) | sess-1 | wrote register | quiet 20m |')
  expect(text).not.toContain('| T4 |')
  expect(text).toContain('1 done: T4')
  expect(text).not.toContain('\\|')
})

test('counts sit in the footer mode labels, with no band and no pinned status', async ($, on) => {
  const fx = fixture()
  engine(on, fx)
  await start($)
  const footer = await $.ui.mount({ plugin: 'coordinator', surface: 'terminal', component: 'SessionMode', props: { modes: ['focus'] } })
  expect(fx.modes).toEqual(['focus', 'doing 1 · review 1 · blocked 1 · 2 running'])
  await footer.unmount()
  const band = await $.ui.mount({
    plugin: 'coordinator',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 80 } as never,
  })
  expect(await band.find({ key: 'engine' })).toBeDefined()
  await band.unmount()
  expect(fx.pinned.every(text => text === undefined)).toBe(true)
})

test('a refused /coordinator is logged and the board still goes live', async ($, on) => {
  const fx = fixture()
  fx.refuse = '"/coordinator" refused: it is the user\'s /coordinator'
  const clock = engine(on, fx)
  await start($)
  expect(fx.logs.some(line => line.includes('/coordinator not registered') && line.includes('refused'))).toBe(true)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'summary', text: 'doing 1 · review 1 · blocked 1 · 2 running' })).toBeDefined()
  fx.files['/repo/tasks/T1.md'] = { text: task('T1', 'Build pane', 'review', 'Mod builder'), mtimeMs: 2 }
  await clock.advance(1000)
  expect(await ui.find({ key: 'summary', text: 'doing 0 · review 2' })).toBeDefined()
  await ui.unmount()
})

test('plan sorts with review, About: replaces the title, the owning session shows, archive/ is ignored', async ($, on) => {
  const fx = fixture()
  fx.files['/repo/tasks/T5.md'] = {
    text: `# T5 — Gate the plan\nAbout: Ship the plan gate\n\nStatus: plan\nOwner: Planner\nSession: other-session-id\n\n## Progress\n`,
    mtimeMs: 1,
  }
  fx.files['/repo/tasks/archive/Z1.md'] = { text: task('Z1', 'Out of scope', 'doing', 'Nobody'), mtimeMs: 1 }
  engine(on, fx)
  await start($)

  const ran = await $.command.run({ command: 'coordinator', args: '' } as never)
  const text = 'text' in ran ? String(ran.text) : ''
  expect(text.startsWith('**Board:** doing 1 · review 1 · blocked 1 · plan 1')).toBe(true)
  expect(text).toContain('| T5 | Ship the plan gate | plan | Planner | other-se |  |  |')
  expect(text.indexOf('| T5 |')).toBeLessThan(text.indexOf('| T1 |'))
  expect(text).not.toContain('Z1')

  const ui = await $.ui.mount({ ...PANE, props: { title: 'Coordinator', isFocused: false, bodyColumns: 140 } as never, surface: 'terminal' })
  expect(await rowKeys(ui, 'task-')).toEqual(['task-T3', 'task-T2', 'task-T5', 'task-T1'])
  expect(await ui.find({ key: 'task-T5', text: /Ship the plan gate/ })).toBeDefined()
  expect(await ui.find({ key: 'task-T5', text: /Gate the plan/ })).toBeUndefined()
  expect(await ui.find({ key: 'task-T5', text: /other-se/ })).toBeDefined()
  expect(await ui.find({ key: 'task-Z1' })).toBeUndefined()
  await ui.unmount()
})
