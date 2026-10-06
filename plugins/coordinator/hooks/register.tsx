import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Agent, Task } from '../types'
import {
  age,
  agentFor,
  isClosed,
  markdown,
  mergeAgents,
  parseTask,
  quietMinutes,
  sortTasks,
  stateOf,
  summary,
} from './board'

const PANE = 'coordinator'
const NARROW = 144
const SYNC_MS = 1000
const STALE_MIN = 15
const root = atom({ plugin: 'coordinator', key: 'root' } as const, null)
const tasks = atom({ plugin: 'coordinator', key: 'tasks' } as const, [])
const agents = atom({ plugin: 'coordinator', key: 'agents' } as const, [])
const minute = atom({ plugin: 'coordinator', key: 'minute' } as const, 0)

// Theme keys, so the board follows the person's theme.
const STATE_COLOR: Record<string, string> = {
  blocked: 'error',
  review: 'warning',
  doing: 'claude',
  todo: 'inactive',
  done: 'success',
  dropped: 'inactive',
}
const AGENT_COLOR: Record<string, string> = {
  running: 'claude',
  failed: 'error',
  killed: 'error',
  completed: 'success',
}

// lazy: one sync at a time; a slow tick only skips the next.
let syncing = false
// The status line as last set, so it is written only on change.
let lastStatus: string | undefined | null = null

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

// Reads <root>/tasks/*.md (not later/ or done/), re-reading only files whose mtime moved.
const syncTasks = async ($: EngineInterface) => {
  const dir = await read($, root)
  const before = await read($, tasks)
  if (!dir || !(await $.fs.exists(`${dir}/tasks`))) return before.length ? [] : before
  const entries = (await $.fs.list(`${dir}/tasks`)).filter(
    entry => entry.kind === 'file' && entry.name.endsWith('.md'),
  )
  const old = new Map(before.map(task => [task.file, task]))
  let changed = entries.length !== before.length
  const next: Task[] = []
  for (const entry of entries) {
    const prev = old.get(entry.name)
    if (prev && prev.mtimeMs === entry.mtimeMs) {
      next.push(prev)
      continue
    }
    const text = await $.fs.read(`${dir}/tasks/${entry.name}`)
    if (typeof text !== 'string') continue
    next.push(parseTask(entry.name, text, entry.mtimeMs))
    changed = true
  }

  return changed ? next : before
}

// Never rejects. Keeps tasks, agents, the minute and the status line current.
const sync = async ($: EngineInterface) => {
  if (syncing) return
  syncing = true
  try {
    const now = await $.clock.now()
    const list = await syncTasks($).catch(() => null)
    if (list && list !== (await read($, tasks))) await update($, tasks, () => list)
    const info = await $.agent.list().catch(() => null)
    if (info) {
      const merged = mergeAgents(await read($, agents), info, now)
      if (JSON.stringify(merged) !== JSON.stringify(await read($, agents)))
        await update($, agents, cur => mergeAgents(cur, info, now))
    }
    const m = Math.floor(now / 60000)
    if (m !== (await read($, minute))) await update($, minute, () => m)
    const all = await read($, tasks)
    const status = all.length ? summary(all, await read($, agents)) : undefined
    if (status !== lastStatus) {
      $.ui.status(status)
      lastStatus = status
    }
  } catch {
    // a failed tick waits for the next
  } finally {
    syncing = false
  }
}

const touch = async ($: EngineInterface, agentId: string, what: string) => {
  const now = await $.clock.now()
  await update($, agents, list =>
    list.map(agent => (agent.id === agentId ? { ...agent, activeAt: now, what } : agent)),
  )
}

const cut = (text: string, n: number) => (text.length > n ? `${text.slice(0, Math.max(1, n - 1))}…` : text)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    lastStatus = null
    await update($, root, () => null)
    const dir = await findRoot($).catch(() => null)
    await update($, root, () => dir)
    await $.command.register({
      name: 'coordinator',
      description: 'Show the task board (tasks/*.md) with live agents',
    })
    $.clock.every(SYNC_MS, () => void sync($))
    await sync($)

    return next(e)
  })

  // Session id and board, as the old session-start hook printed them.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const id = await $.session.id()
    const list = sortTasks(await read($, tasks))
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

  // The Markdown table reaches every client (the Mac app over Remote Control draws no panes).
  on('command.run', { command: 'coordinator' }, async $ => {
    await sync($)
    await $.ui.open({ id: PANE, title: 'Coordinator' }).catch(() => undefined)
    const now = await $.clock.now()

    return { text: markdown(await read($, tasks), await read($, agents), now) }
  })

  // A spawned agent gets its row now, ahead of the next poll.
  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const agentId = spawned.agentId
    if (agentId) {
      const now = await $.clock.now()
      const row: Agent = {
        id: agentId,
        name: e.name ?? '',
        description: e.description,
        status: 'running',
        activeAt: now,
        what: 'spawned',
      }
      await update($, agents, list =>
        list.some(a => a.id === agentId) ? list : [...list, row],
      ).catch(() => undefined)
    }

    return spawned
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) await touch($, e.agentId, e.tool).catch(() => undefined)

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId) await touch($, e.agentId, 'thinking').catch(() => undefined)

    return yield* next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = sortTasks(await read($, tasks))
    const crew = await read($, agents)
    await read($, minute)
    const now = await $.clock.now()
    const width = Math.max(30, e.props.bodyColumns)
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 30) - 4) / 3))
    const open = list.filter(task => !isClosed(task))
    const closed = list.length - open.length
    const shown = open.slice(0, room)
    const claimed = new Set<string>()

    const cards = shown.map(task => {
      const state = stateOf(task.status)
      const color = STATE_COLOR[state]
      const agent = agentFor(crew, task)
      if (agent) claimed.add(agent.id)
      const quiet = quietMinutes(task.lastAt, now)
      const isStale = quiet !== null && quiet >= STALE_MIN && state !== 'todo'
      const head = `${task.id}  ${task.title}`

      return (
        <Box key={`task-${task.id}`} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={color}>{'▍'}</Text>
            <Text bold wrap="truncate-end">
              {cut(head, width - task.status.length - 4)}
            </Text>
            <Text> </Text>
            <Text color={color}>{task.status}</Text>
          </Box>
          <Box>
            <Text color={color}>{'▍'}</Text>
            <Text dimColor>{task.owner}</Text>
            {agent && (
              <Text color={AGENT_COLOR[agent.status] ?? 'inactive'}>
                {` ● ${agent.status}`}
              </Text>
            )}
            {agent && agent.what !== '' && (
              <Text dimColor>{` · ${agent.what} ${age(Math.floor((now - agent.activeAt) / 60000))}`}</Text>
            )}
          </Box>
          <Box>
            <Text color={color}>{'▍'}</Text>
            <Text dimColor wrap="truncate-end">
              {cut(task.last || 'no progress yet', width - 14)}
            </Text>
            {quiet !== null && (
              <Text color={isStale ? 'warning' : 'inactive'}>
                {isStale ? ` quiet ${age(quiet)}` : ` ${age(quiet)}`}
              </Text>
            )}
          </Box>
        </Box>
      )
    })

    const loose = crew.filter(agent => !claimed.has(agent.id) && agent.status === 'running')

    return (
      <Box flexDirection="column">
        <Box key="summary" marginBottom={1}>
          <Text bold>{list.length ? summary(list, crew) : 'No tasks/*.md in this repo.'}</Text>
        </Box>
        {cards}
        {open.length > shown.length && (
          <Box key="more">
            <Text dimColor>+{open.length - shown.length} more open</Text>
          </Box>
        )}
        {closed > 0 && (
          <Box key="closed">
            <Text color="success">✓ </Text>
            <Text dimColor>{closed} done or dropped</Text>
          </Box>
        )}
        {loose.length > 0 && (
          <Box key="loose-head" marginTop={1}>
            <Text bold>Other agents</Text>
          </Box>
        )}
        {loose.map(agent => (
          <Box key={`agent-${agent.id}`}>
            <Text color={AGENT_COLOR[agent.status] ?? 'inactive'}>● </Text>
            <Text wrap="truncate-end">
              {cut(agent.name || agent.description, 24)}
            </Text>
            <Text dimColor>{` ${agent.what} ${age(Math.floor((now - agent.activeAt) / 60000))}`}</Text>
          </Box>
        ))}
      </Box>
    )
  })

  // Narrow terminals can't seat the pane unasked: one row of counts above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, tasks)
    const active = list.filter(t => ['doing', 'review', 'blocked'].includes(stateOf(t.status)))
    if (e.props.hasSurvey || e.props.bodyColumns >= NARROW || active.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box key="coordinator-band">
        <Text dimColor wrap="truncate-end">
          Tasks: {summary(list, await read($, agents))} · /coordinator for the board
        </Text>
      </Box>
    )
  })
}
