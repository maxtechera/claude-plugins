import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register } from 'claude-code'

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
const SYNC_MS = 1000
const STALE_MIN = 15
const DISCOVER_MS = 30_000
const root = atom({ plugin: 'coordinator', key: 'root' } as const, null)
const sessionDirs = atom({ plugin: 'coordinator', key: 'sessionDirs' } as const, [])
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
// When the root's child repos were last searched for this session's tasks/.
let discoveredAt = -Infinity

// The repo root: nearest ancestor of `dir` holding .git.
const findRoot = async ($: EngineInterface, from: string) => {
  let dir = from
  for (;;) {
    if (await $.fs.exists(`${dir}/.git`)) return dir
    const up = dir.replace(/\/[^/]+$/, '')
    if (up === dir || up === '') return null
    dir = up
  }
}

const isTaskFile = (entry: FsEntry) => entry.kind === 'file' && entry.name.endsWith('.md')

// The cwd's repo root, resolved again whenever the session's cwd moves.
let rootFor = ''
const syncRoot = async ($: EngineInterface) => {
  const cwd = await $.session.cwd()
  if (cwd === rootFor) return read($, root)
  rootFor = cwd
  const dir = await findRoot($, cwd)
  await update($, root, () => dir)

  return dir
}

// tasks/ dirs one level under the root whose task files name this session; once found, kept.
const discover = async ($: EngineInterface, dir: string) => {
  const id = await $.session.id()
  const known = new Set(await read($, sessionDirs))
  for (const child of await $.fs.list(dir)) {
    if (child.kind !== 'dir' || child.name.startsWith('.')) continue
    const tasksDir = `${dir}/${child.name}/tasks`
    if (known.has(tasksDir) || !(await $.fs.exists(tasksDir))) continue
    for (const entry of (await $.fs.list(tasksDir)).filter(isTaskFile)) {
      const text = await $.fs.read(`${tasksDir}/${entry.name}`)
      if (typeof text === 'string' && parseTask(entry.name, text, 0, tasksDir).session === id) {
        await update($, sessionDirs, list => [...list, tasksDir])
        break
      }
    }
  }
}

// Reads tasks/*.md (not later/ or done/) of the root and of the session's dirs, re-reading only files whose mtime moved.
const syncTasks = async ($: EngineInterface, dir: string | null) => {
  const before = await read($, tasks)
  const dirs = [...new Set([...(dir ? [`${dir}/tasks`] : []), ...(await read($, sessionDirs))])]
  const old = new Map(before.map(task => [task.file, task]))
  const next: Task[] = []
  let changed = false
  for (const tasksDir of dirs) {
    if (!(await $.fs.exists(tasksDir))) continue
    for (const entry of (await $.fs.list(tasksDir)).filter(isTaskFile)) {
      const prev = old.get(`${tasksDir}/${entry.name}`)
      if (prev && prev.mtimeMs === entry.mtimeMs) {
        next.push(prev)
        continue
      }
      const text = await $.fs.read(`${tasksDir}/${entry.name}`)
      if (typeof text !== 'string') continue
      next.push(parseTask(entry.name, text, entry.mtimeMs, tasksDir))
      changed = true
    }
  }

  return changed || next.length !== before.length ? next : before
}

// Never rejects. Keeps tasks, agents and the minute current; the drawings redraw from them.
const sync = async ($: EngineInterface) => {
  if (syncing) return
  syncing = true
  try {
    const now = await $.clock.now()
    const dir = await syncRoot($).catch(() => null)
    if (dir && now - discoveredAt >= DISCOVER_MS) {
      discoveredAt = now
      await discover($, dir).catch(() => undefined)
    }
    const list = await syncTasks($, dir).catch(() => null)
    if (list && list !== (await read($, tasks))) await update($, tasks, () => list)
    const info = await $.agent.list().catch(() => null)
    if (info) {
      const merged = mergeAgents(await read($, agents), info, now)
      if (JSON.stringify(merged) !== JSON.stringify(await read($, agents)))
        await update($, agents, cur => mergeAgents(cur, info, now))
    }
    const m = Math.floor(now / 60000)
    if (m !== (await read($, minute))) await update($, minute, () => m)
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
    rootFor = ''
    discoveredAt = -Infinity
    // 0.1/0.2 pinned the counts with $.ui.status, which draws a warning glyph; the footer label replaces it.
    $.ui.status(undefined)
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
    const width = Math.max(40, e.props.bodyColumns)
    const open = list.filter(task => !isClosed(task))
    const closed = list.length - open.length
    const running = crew.filter(agent => agent.status === 'running')
    const taskOf = (agent: Agent) => list.find(task => agentFor(crew, task)?.id === agent.id)
    // Fixed columns: marker 2, ID 6, status 8, gap 1, owner 15, quiet 7; the title and (when wide) the last line share the rest.
    const rest = width - 39
    const titleW = width >= 110 ? Math.min(32, Math.floor(rest / 2)) : rest
    const lastW = width >= 110 ? rest - titleW - 1 : 0
    const room = Math.max(1, (e.viewport?.rows ?? 30) - 6 - running.length)
    const shown = open.slice(0, room)
    const pad = (text: string, n: number) => cut(text, n).padEnd(n)

    return (
      <Box flexDirection="column">
        <Box key="summary">
          <Text bold>{list.length ? summary(list, crew) : 'No tasks/*.md for this session.'}</Text>
        </Box>
        {running.map(agent => {
          const task = taskOf(agent)

          return (
            <Box key={`agent-${agent.id}`}>
              <Text color={AGENT_COLOR[agent.status] ?? 'inactive'}>{'● '}</Text>
              <Text>{pad(agent.name || agent.description, 18)}</Text>
              <Text bold>{pad(task?.id ?? '—', 6)}</Text>
              <Text dimColor wrap="truncate-end">
                {cut(`${agent.what || agent.status} ${age(Math.floor((now - agent.activeAt) / 60000))}`, width - 26)}
              </Text>
            </Box>
          )
        })}
        <Box key="gap" height={1} />
        {shown.map(task => {
          const state = stateOf(task.status)
          const color = STATE_COLOR[state]
          const agent = agentFor(crew, task)
          const quiet = quietMinutes(task.lastAt, now)
          const isStale = quiet !== null && quiet >= STALE_MIN && state !== 'todo'

          return (
            <Box key={`task-${task.id}`}>
              <Text color={color}>{'▍ '}</Text>
              <Text bold>{pad(task.id, 6)}</Text>
              <Text color={color}>{pad(state, 8)}</Text>
              <Text wrap="truncate-end">{pad(task.title, titleW)}</Text>
              <Text> </Text>
              {lastW > 0 && (
                <Text dimColor wrap="truncate-end">
                  {`${pad(task.last, lastW)} `}
                </Text>
              )}
              <Text color={agent ? AGENT_COLOR[agent.status] ?? 'inactive' : undefined} dimColor={!agent}>
                {pad(`${agent ? '● ' : ''}${task.owner}`, 15)}
              </Text>
              <Text color={isStale ? 'warning' : 'inactive'}>
                {(quiet === null ? '' : isStale ? `quiet ${age(quiet)}` : age(quiet)).padStart(7)}
              </Text>
            </Box>
          )
        })}
        {open.length > shown.length && (
          <Box key="more">
            <Text dimColor>+{open.length - shown.length} more open</Text>
          </Box>
        )}
        {closed > 0 && (
          <Box key="closed">
            <Text color="success">{'✓ '}</Text>
            <Text dimColor>{closed} done</Text>
          </Box>
        )}
      </Box>
    )
  })

  // The counts as a footer mode label (terminal and desktop), beside the engine's own.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const list = await read($, tasks)
    if (list.length === 0) return next(e)

    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, summary(list, await read($, agents))] } })
  })
}
