import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { Task } from '../types'
import { kebab, parseTask, stateOf, summary } from './board'

const PANE = 'coordinator'
const NARROW = 144
const root = atom({ plugin: 'coordinator', key: 'root' } as const, null)
const tasks = atom({ plugin: 'coordinator', key: 'tasks' } as const, [])
const activity = atom({ plugin: 'coordinator', key: 'activity' } as const, {})

// The repo root: nearest ancestor of the session's directory holding .git.
const findRoot = async ($: EngineInterface) => {
  let dir = await $.session.cwd()
  for (;;) {
    if (await $.fs.exists(`${dir}/.git`)) return dir
    const up = dir.replace(/\/[^/]+$/, '')
    if (up === dir || up === '') return null
    dir = up
  }
}

// Reads only <root>/tasks/*.md (not later/ or done/).
const loadTasks = async ($: EngineInterface) => {
  const dir = await read($, root)
  if (!dir || !(await $.fs.exists(`${dir}/tasks`))) return []
  const entries = await $.fs.list(`${dir}/tasks`)
  const files = entries
    .filter(entry => entry.kind === 'file' && entry.name.endsWith('.md'))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const list: Task[] = []
  for (const file of files) {
    const text = await $.fs.read(`${dir}/tasks/${file}`)
    if (typeof text === 'string') list.push(parseTask(file, text))
  }

  return list
}

// Never throws: the hooks that call it gate tool calls and spawns.
const refresh = async ($: EngineInterface) => {
  const list = await loadTasks($).catch(() => [] as Task[])
  await update($, tasks, () => list).catch(() => undefined)
  $.ui.status(list.length ? summary(list) : undefined)
}

const touch = ($: EngineInterface, agentId: string, what: string) =>
  $.clock.now().then(at => update($, activity, all => ({ ...all, [agentId]: { at, what } })))
    .catch(() => undefined)

const ago = (now: number, at: number) => {
  const m = Math.round((now - at) / 60000)

  return m < 1 ? 'now' : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`
}

const agentFor = (agents: readonly AgentInfo[], owner: string) =>
  agents.find(agent => agent.name && kebab(agent.name) === kebab(owner))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, root, () => null)
    const dir = await findRoot($)
    await update($, root, () => dir)
    await $.command.register({
      name: 'coordinator',
      description: 'Show the task board (tasks/*.md) and live agents in a pane',
    })
    await refresh($)

    return next(e)
  })

  // Session id and board, as the old session-start hook printed them.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const id = await $.session.id()
    const list = await read($, tasks)
    const board = list.map(t => `${t.id} | ${t.title} | ${t.status} | ${t.owner}`).join('\n')
    const text = [
      `Coordinator session id: ${id} (use in task headers)`,
      list.length ? `Task board (tasks/*.md, ${summary(list)}):\n${board}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    return {
      ...composed,
      sections: [...composed.sections, { id: 'coordinator:board', text, scope: 'session' as const }],
    }
  })

  on('command.run', { command: 'coordinator' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'Coordinator' })

    return { text: 'Coordinator pane opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    if (spawned.agentId) await touch($, spawned.agentId, `spawned: ${e.description}`).catch(() => undefined)

    return spawned
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) await touch($, e.agentId, e.tool).catch(() => undefined)
    const ran = await next(e)
    if (e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'Bash') await refresh($).catch(() => undefined)

    return ran
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId) await touch($, e.agentId, `step ${e.index}`)

    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refresh($)

    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, tasks)
    const seen = await read($, activity)
    const agents = await $.agent.list()
    const now = await $.clock.now()
    const width = e.props.bodyColumns
    const cut = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)
    const lastWidth = Math.max(10, width - 52)
    const matched = new Set<string>()

    const rows = list.map(task => {
      const agent = agentFor(agents, task.owner)
      if (agent) matched.add(agent.id)
      const live = agent ? seen[agent.id] : undefined
      const state = stateOf(task.status)

      return (
        <Box key={`task-${task.id}`}>
          <Text bold>{cut(task.id, 6).padEnd(7)}</Text>
          <Text>{cut(task.title, 22).padEnd(23)}</Text>
          <Text color={state === 'blocked' ? 'red' : state === 'review' ? 'yellow' : undefined}>
            {cut(task.status, 10).padEnd(11)}
          </Text>
          <Text dimColor>
            {cut(task.owner, 14)}
            {agent ? ` [${agent.status}${live ? ` ${ago(now, live.at)}` : ''}]` : ''}
            {' '}
            {cut(task.last, lastWidth)}
          </Text>
        </Box>
      )
    })

    const loose = agents.filter(agent => !matched.has(agent.id))

    return (
      <Box flexDirection="column">
        <Text bold>{list.length ? summary(list) : 'No tasks/*.md in this repo.'}</Text>
        {rows}
        {loose.length > 0 && <Text bold>Agents</Text>}
        {loose.map(agent => {
          const live = seen[agent.id]

          return (
            <Box key={`agent-${agent.id}`}>
              <Text dimColor={agent.status !== 'running'}>
                {cut(agent.name ?? agent.description, 20).padEnd(21)}
                {agent.status.padEnd(10)}
                {live ? `${ago(now, live.at)} ${live.what}` : ''}
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })

  // Narrow terminals can't seat the pane unasked: show the counts above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, tasks)
    const active = list.filter(t => ['doing', 'review', 'blocked'].includes(stateOf(t.status)))
    if (e.props.hasSurvey || e.props.bodyColumns >= NARROW || active.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box key="coordinator-band">
        <Text dimColor>Tasks: {summary(list)} · /coordinator for the board</Text>
      </Box>
    )
  })
}
