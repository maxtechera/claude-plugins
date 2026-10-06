import type { AgentInfo, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { sortTasks } from './board'
import type { Task } from '../types'

// 2026-10-06 13:20 local: Progress lines at 13:00 are 20m quiet.
const NOW = new Date(2026, 9, 6, 13, 20).getTime()
const SESSION = 'sess-1'

type Files = Record<string, { text: string; mtimeMs: number }>

// Task files and `tasks-index.py --session sess-1` over them, captured from the script itself (its quiet prefix
// depends on the wall clock, so the open tasks' last lines sit late in the day, where it never fires).
const GOLDEN_FILES: Record<string, string> = {
  "T1.md": "# T1 — Build pane\n\nStatus: doing\nOwner: Mod builder\nSession: sess-1\n\n## Progress\n<!-- log -->\n- 23:50 Mod builder | wrote register | test it | none\n",
  "T2.md": "# T2 – Read prior art\nAbout: Learn from earlier mods\n\nStatus: review\nOwner: Reader\nSession: sess-1\n\n## Goal\nStatus: done\n\n## Progress\n23:40 Reader | findings written | coordinator reviews | -\n",
  "T3.md": "# T3 - Wait on keys\n\nStatus: blocked(user)\nOwner: —\nSession: sess-1\n\n## Progress\n13:15 Coordinator | asked for keys | paste keys | user | extra\n",
  "T4.md": "# T4 — Old work\n\nStatus: done(abc123)\nOwner: Reader\nSession: sess-1\n\n## Progress\n11:00 Reader | shipped a|b split | — | none\n",
  "T5.md": "# T5 — Gate the plan\nAbout: Ship the plan gate\n\nStatus: plan\nOwner: Planner\nSession: sess-1\n\n## Progress\n13:05 Planner | plan written\n",
  "X1.md": "# X1 — Not ours\n\nStatus: doing\nOwner: Someone\nSession: other-session-id\n\n## Progress\n10:00 Someone | busy | more | none\n",
  "_draft.md": "# D — draft\n\nStatus: doing\nSession: sess-1\n",
  "archive/Z1.md": "# Z1 — Archived\n\nStatus: doing\nSession: sess-1\n"
}
const GOLDEN_TABLE = [
  "| ID | Task | Agent | Coordinator | Last activity | Summary | Last message | Next |",
  "|---|---|---|---|---|---|---|---|",
  "| T1 | Build pane | Mod builder | sess-1 | 23:50 | wrote register | wrote register | test it |",
  "| T2 | Learn from earlier mods | Reader | sess-1 | 23:40 | findings written | findings written | coordinator reviews |",
  "| T3 | Wait on keys | — | sess-1 | 13:15 | asked for keys | asked for keys | paste keys (blocked: user) |",
  "| T4 | Old work | Reader | sess-1 | 11:00 | shipped a | shipped a | b split |",
  "| T5 | Ship the plan gate | Planner | sess-1 | 13:05 | plan written | plan written | — |"
]

const task = (id: string, title: string, status: string, owner: string, progress = '', session = SESSION, about = '') =>
  `# ${id} — ${title}\n${about ? `About: ${about}\n` : ''}\nStatus: ${status}\nOwner: ${owner}\nSession: ${session}\n\n## Progress\n${progress}`

const fixture = (dir = '/repo/tasks') => {
  const files: Files = {
    [`${dir}/T1.md`]: { text: task('T1', 'Build pane', 'doing', 'Mod builder', '13:00 Mod builder | wrote register | test | none\n'), mtimeMs: 1 },
    [`${dir}/T2.md`]: { text: task('T2', 'Read prior art', 'review', 'Reader', '12:50 Reader | findings | review | none\n'), mtimeMs: 1 },
    [`${dir}/T3.md`]: { text: task('T3', 'Wait on keys', 'blocked(user)', '—', '13:15 Coordinator | asked for keys | — | user\n'), mtimeMs: 1 },
    [`${dir}/T4.md`]: { text: task('T4', 'Old work', 'done(abc123)', 'Reader', '11:00 Reader | shipped | — | none\n'), mtimeMs: 1 },
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

const pane = (bodyColumns: number, bodyRows = 40) =>
  ({
    plugin: 'coordinator',
    component: 'Pane',
    requestId: 'coordinator',
    props: { title: 'Coordinator', isFocused: false, bodyColumns, placement: 'dock', scroll: { bodyRows } } as never,
  }) as const

const keys = async (ui: { findAll: (q: { type: string }) => Promise<readonly { key?: string }[]> }, prefix: RegExp) =>
  (await ui.findAll({ type: 'Box' })).map(b => b.key ?? '').filter(k => prefix.test(k))

const board = async ($: { command: { run: (e: never) => Promise<unknown> } }) => {
  const ran = (await $.command.run({ command: 'coordinator', args: '' } as never)) as { text?: unknown }

  return String(ran.text ?? '')
}

test('sort puts blocked, then plan and review, doing, todo first and done last', () => {
  const t = (id: string, status: string) => ({ id, status }) as Task
  const order = sortTasks([t('T1', 'done(x)'), t('T2', 'todo'), t('T3', 'doing'), t('T4', 'review'), t('T5', 'blocked(me)'), t('T6', 'plan')])
  expect(order.map(x => x.id)).toEqual(['T5', 'T4', 'T6', 'T3', 'T2', 'T1'])
})

test('/coordinator prints the same table rows as tasks-index.py --session', async ($, on) => {
  const fx = fixture()
  fx.files = Object.fromEntries(Object.entries(GOLDEN_FILES).map(([name, text]) => [`/repo/tasks/${name}`, { text, mtimeMs: 1 }]))
  fx.roster = []
  engine(on, fx)
  await start($)
  const text = await board($)
  for (const row of GOLDEN_TABLE) expect(text).toContain(row)
  // Needs-user first, done last; other sessions' open work on one line; _drafts and archive/ never read.
  expect(text.indexOf('| T3 |')).toBeLessThan(text.indexOf('| T5 |'))
  expect(text.indexOf('| T1 |')).toBeLessThan(text.indexOf('| T4 |'))
  expect(text.startsWith('**Board:** doing 1 · review 1 · blocked 1 · plan 1')).toBe(true)
  expect(text).toContain('Other sessions: X1 (doing, other-se)')
  expect(text).not.toContain('| X1 |')
  expect(text).not.toContain('Z1')
  expect(text).not.toContain('draft')
  expect(text).toContain('**Recent:**\n- 23:50 T1 Mod builder · wrote register\n- 23:40 T2 Reader · findings written')
})

test('pane at 70 columns: header, agent cards, two-line task rows, done row, activity', async ($, on) => {
  const fx = fixture()
  engine(on, fx)
  await start($)
  const ui = await $.ui.mount({ ...pane(70), surface: 'terminal' })
  expect(await ui.find({ key: 'summary', text: /plan 0.*review 1.*blocked 1.*doing 1.*todo 0.*2 running.*1 done/ })).toBeDefined()
  expect(await keys(ui, /^agent-/)).toEqual(['agent-a1', 'agent-a1-task', 'agent-a2', 'agent-a2-task'])
  expect(await ui.find({ key: 'agent-a1', text: /T1/ })).toBeDefined()
  expect(await ui.find({ key: 'agent-a1-task', text: /Build pane — wrote register/ })).toBeDefined()
  expect(await keys(ui, /^task-/)).toEqual(['task-T3', 'task-T3-detail', 'task-T2', 'task-T2-detail', 'task-T1', 'task-T1-detail'])
  expect(await ui.find({ key: 'task-T1', text: /● Mod builder/ })).toBeDefined()
  expect(await ui.find({ key: 'task-T1', text: /sess-1/ })).toBeDefined()
  expect(await ui.find({ key: 'task-T1-detail', text: /wrote register · quiet 20m → test/ })).toBeDefined()
  expect(await ui.find({ key: 'task-T3-detail', text: /blocked: user/ })).toBeDefined()
  expect(await ui.find({ key: 'done-T4', text: /Old work — shipped/ })).toBeDefined()
  expect(await ui.find({ key: 'act-0', text: /13:15.*T3.*Coordinator · asked for keys/ })).toBeDefined()
  // A done task owned by a running agent's name is not shown as live.
  expect(await ui.find({ key: 'done-T4', text: /●/ })).toBeUndefined()
  await ui.unmount()
})

test('pane at 120 columns: one line per task with every table column', async ($, on) => {
  const fx = fixture()
  engine(on, fx)
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...pane(120), surface })
    expect(await ui.find({ key: 'head', text: /ID.*Status.*Task.*Agent.*Coord.*Last.*Summary.*Last message.*Next/ })).toBeDefined()
    expect(await keys(ui, /^task-/)).toEqual(['task-T3', 'task-T2', 'task-T1'])
    expect(await ui.find({ key: 'task-T1', text: /Build pane.*Mod builder.*sess-1.*13:00.*wrote register.*quiet 20m.*test/ })).toBeDefined()
    await ui.unmount()
  }
})

test('a short pane drops activity, then folds done to one line', async ($, on) => {
  const fx = fixture()
  fx.files['/repo/tasks/T6.md'] = { text: task('T6', 'More old', 'done(x)', 'Reader', '10:00 Reader | old | — | none\n'), mtimeMs: 1 }
  engine(on, fx)
  await start($)
  const ui = await $.ui.mount({ ...pane(70, 15), surface: 'terminal' })
  expect(await keys(ui, /^act-/)).toEqual([])
  expect(await keys(ui, /^done/)).toEqual(['done-T4', 'done-T6'])
  await ui.unmount()
  const tiny = await $.ui.mount({ ...pane(70, 14), surface: 'terminal' })
  expect(await keys(tiny, /^done/)).toEqual(['done'])
  expect(await tiny.find({ key: 'done', text: '2 done: T4, T6' })).toBeDefined()
  await tiny.unmount()
})

test('an agent whose brief names a done task follows its open task', async ($, on) => {
  const fx = fixture()
  fx.files['/repo/tasks/T8.md'] = { text: task('T8', 'Own the command', 'done(05f9031)', 'Mod builder', '15:04 Mod builder | committed | — | none\n'), mtimeMs: 1 }
  fx.files['/repo/tasks/T9.md'] = { text: task('T9', 'Richer pane', 'doing', 'Mod builder', '13:10 Mod builder | building | test | none\n'), mtimeMs: 1 }
  fx.files['/repo/tasks/T1.md'] = { text: task('T1', 'Build pane', 'done(x)', 'Mod builder'), mtimeMs: 1 }
  fx.roster = [{ id: 'a1', name: 'mod-builder', description: 'Own /coordinator, sync skill (T8)', type: 'general-purpose', status: 'running' }]
  engine(on, fx)
  await start($)
  const ui = await $.ui.mount({ ...pane(70), surface: 'terminal' })
  expect(await ui.find({ key: 'agent-a1', text: /T9/ })).toBeDefined()
  expect(await ui.find({ key: 'task-T9', text: /● Mod builder/ })).toBeDefined()
  await ui.unmount()
})

test('a refused /coordinator is logged and the board still goes live', async ($, on) => {
  const fx = fixture()
  fx.refuse = '"/coordinator" refused: it is the user\'s /coordinator'
  const clock = engine(on, fx)
  await start($)
  expect(fx.logs.some(line => line.includes('/coordinator not registered') && line.includes('refused'))).toBe(true)
  const ui = await $.ui.mount({ ...pane(70), surface: 'terminal' })
  expect(await ui.find({ key: 'summary', text: /review 1.*doing 1/ })).toBeDefined()
  fx.files['/repo/tasks/T1.md'] = { text: task('T1', 'Build pane', 'review', 'Mod builder', '13:20 Mod builder | tests green | review | none\n'), mtimeMs: 2 }
  fx.roster = [...fx.roster, { id: 'a9', name: 'fixer', description: 'T2 fix the reader', type: 'general-purpose', status: 'running' }]
  await clock.advance(1000)
  expect(await ui.find({ key: 'summary', text: /review 2.*doing 0/ })).toBeDefined()
  expect(await ui.find({ key: 'agent-a9', text: /T2/ })).toBeDefined()
  await ui.unmount()
})

test('session started in a parent repo finds its tasks in a child repo', async ($, on) => {
  const fx = fixture('/dev/child/tasks')
  fx.gits = ['/dev/.git', '/dev/child/.git']
  fx.cwd = '/dev'
  fx.files['/dev/other/tasks/X1.md'] = { text: task('X1', 'Not ours', 'doing', 'Someone', '', 'other-session'), mtimeMs: 1 }
  engine(on, fx)
  await start($, '/dev')
  const ui = await $.ui.mount({ ...pane(70), surface: 'terminal' })
  expect(await keys(ui, /^task-T\d+$/)).toEqual(['task-T3', 'task-T2', 'task-T1'])
  expect(await ui.find({ key: 'task-X1' })).toBeUndefined()
  await ui.unmount()
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
