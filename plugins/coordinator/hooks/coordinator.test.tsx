import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

// What the engine would answer beneath the plugin: commands, status, clock, its own band.
const engine = (on: On) => {
  mock.clock(on, { now: 600_000 })
  on('command.register', async ($, e) => ({ value: { command: e.name } }))
  on('ui.status', async () => ({ value: undefined }))
  on('ui.render', async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box key="engine">
        <Text>engine</Text>
      </Box>
    )
  })
}

const FILES: Record<string, string> = {
  'T1.md': '# T1 — Build pane\n\nStatus: doing\nOwner: Mod builder\n\n## Progress\n13:05 Mod builder | wrote register | test | none\n',
  'T2.md': '# T2 — Read prior art\n\nStatus: review\nOwner: Reader\n\n## Progress\n',
  'T3.md': '# T3 — Wait on keys\n\nStatus: blocked(user)\nOwner: —\n\n## Progress\n09:00 Coordinator | asked for keys | — | user\n',
}

test('pane lists tasks/*.md merged with live agents', async ($, on) => {
  engine(on)
  on('session.cwd', async () => ({ value: '/repo/sub' }))
  on('session.start', async () => ({ cwd: '/repo/sub' }))
  on('fs.exists', async ($, e) => ({ value: ['/repo/.git', '/repo/tasks'].includes(e.path) }))
  on('fs.list', async () => ({
    value: [
      ...Object.keys(FILES).map(name => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })),
      { name: 'done', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false },
    ],
  }))
  on('fs.read', async ($, e) => {
    const text = FILES[e.path.replace('/repo/tasks/', '')]
    if (text === undefined) throw new Error(`unexpected read ${e.path}`)

    return { value: text }
  })
  on('agent.list', async () => ({ value: [
    { id: 'a1', name: 'mod-builder', description: 'Build pane', type: 'general-purpose', status: 'running' as const },
    { id: 'a2', name: 'explorer', description: 'Look around', type: 'Explore', status: 'idle' as const },
  ] }))

  await $.session.start({ cwd: '/repo/sub', surface: 'terminal', isInteractive: true } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'coordinator',
      surface,
      component: 'Pane',
      requestId: 'coordinator',
      props: { title: 'Coordinator', isFocused: false, bodyColumns: 120 } as never,
    })
    expect(await ui.find({ text: 'doing 1 · review 1 · blocked 1' })).toBeDefined()
    expect(await ui.find({ key: 'task-T1', text: /Build pane/ })).toBeDefined()
    expect(await ui.find({ key: 'task-T1', text: /\[running/ })).toBeDefined()
    expect(await ui.find({ key: 'task-T3', text: /asked for keys/ })).toBeDefined()
    expect(await ui.find({ key: 'agent-a2', text: /explorer/ })).toBeDefined()
    expect(await ui.find({ key: 'agent-a1' })).toBeUndefined()
    await ui.unmount()
  }
})

test('band shows counts only on narrow terminals', async ($, on) => {
  engine(on)
  on('session.cwd', async () => ({ value: '/repo' }))
  on('session.start', async () => ({ cwd: '/repo' }))
  on('fs.exists', async () => ({ value: true }))
  on('fs.list', async () => ({ value: [{ name: 'T1.md', kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false }] }))
  on('fs.read', async () => ({ value: FILES['T1.md']! }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true } as never)

  const band = (bodyColumns: number) =>
    $.ui.mount({
      plugin: 'coordinator',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns } as never,
    })
  const narrow = await band(80)
  expect(await narrow.find({ text: /doing 1/ })).toBeDefined()
  await narrow.unmount()
  const wide = await band(200)
  expect(await wide.find({ text: /doing 1/ })).toBeUndefined()
  expect(await wide.find({ key: 'engine' })).toBeDefined()
  await wide.unmount()
})
