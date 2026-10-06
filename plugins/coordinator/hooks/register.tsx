import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register } from 'claude-code'

import type { Agent, Task } from '../types'
import {
  activity,
  age,
  agentFor,
  coord,
  COUNTED,
  counts,
  isClosed,
  isLive,
  label,
  lastMessage,
  markdown,
  mergeAgents,
  mine,
  NEEDS_USER,
  parseTask,
  sortTasks,
  stateOf,
  summary,
  taskFor,
  tokens,
} from './board'

const PANE = 'coordinator'
const SYNC_MS = 1000
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
  plan: 'warning',
  todo: 'inactive',
  done: 'success',
  dropped: 'inactive',
}
const AGENT_COLOR: Record<string, string> = {
  running: 'claude',
  failed: 'error',
  killed: 'error',
  waiting: 'warning',
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

// As tasks-index.py: *.md, not _-prefixed.
const isTaskFile = (entry: FsEntry) => entry.kind === 'file' && entry.name.endsWith('.md') && !entry.name.startsWith('_')

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

// Reads tasks/*.md (not later/, done/ or archive/: files only, no subdirs) of the root and of the session's dirs, re-reading only files whose mtime moved.
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
      // A record from before 0.4 has no progress list: read it again.
      if (prev && prev.mtimeMs === entry.mtimeMs && Array.isArray(prev.progress)) {
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
    // Liveness first: a refused /coordinator (another skill or command owns the name) must not stop the board.
    $.clock.every(SYNC_MS, () => void sync($))
    await sync($)
    try {
      await $.command.register({
        name: 'coordinator',
        description: 'Show the task board (tasks/*.md) with live agents',
      })
    } catch (err) {
      $.ui.log(`coordinator: /coordinator not registered (${err instanceof Error ? err.message : String(err)}); the pane and footer still run`)
    }

    return next(e)
  })

  // Session id and board, as the old session-start hook printed them.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const id = await $.session.id()
    const list = sortTasks(await read($, tasks))
    const board = list.map(t => `${t.id} | ${label(t)} | ${t.status} | ${t.owner} | ${coord(t)}`).join('\n')
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

    return { text: markdown(await read($, tasks), await read($, agents), await $.session.id(), now) }
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
        spawnedAt: now,
        what: 'spawned',
        model: '',
        context: 0,
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
    const result = yield* next(e)
    const usage = result.usage
    const agentId = e.agentId
    if (agentId && usage) {
      const context = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
      await update($, agents, list =>
        list.map(agent => (agent.id === agentId ? { ...agent, model: usage.model, context } : agent)),
      ).catch(() => undefined)
    }

    return result
  })

  // Header, agent cards, the session's task table (as `tasks-index.py --session` prints it), done, activity; fitted to the body's rows.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const all = await read($, tasks)
    const crew = await read($, agents)
    await read($, minute)
    const now = await $.clock.now()
    const list = sortTasks(mine(all, await $.session.id()))
    const others = sortTasks(all.filter(task => !list.includes(task) && !isClosed(task)))
    const open = list.filter(task => !isClosed(task))
    const closed = list.filter(isClosed)
    const live = crew.filter(isLive)
    const n = counts(list)
    const width = Math.max(40, e.props.bodyColumns)
    const height = Math.max(8, e.props.scroll?.bodyRows ?? (e.viewport?.rows ?? 36) - 6)
    const wide = width >= 120
    const since = (at: number) => age(Math.floor((now - at) / 60000))
    // A column w wide: its text and at least one space.
    const pad = (text: string, w: number) => cut(text, w - 1).padEnd(w)

    // Rows: header, agent cards (2 each) and a gap, table head, open rows (2 each when narrow), other sessions.
    let detail = !wide
    const fixed = 1 + live.length * 2 + (live.length ? 1 : 0) + 1 + (others.length ? 1 : 0)
    if (fixed + open.length * (detail ? 2 : 1) > height) detail = false
    let rest = height - fixed - open.length * (detail ? 2 : 1)
    // Done detail outlasts activity: activity goes first, then done folds to one line.
    const doneRows = closed.length === 0 ? 0 : rest >= closed.length ? closed.length : 1
    rest -= doneRows
    const recent = rest >= 3 ? activity(list, Math.min(8, rest - 2)) : []

    // Columns: marker 2, ID 5, status 8, agent 15, coordinator 9, last activity 6; the rest is shared.
    const flex = Math.max(10, width - 45)
    const taskW = wide ? Math.floor(flex * 0.3) : flex
    const sumW = wide ? Math.floor(flex * 0.25) : 0
    const msgW = wide ? Math.floor(flex * 0.25) : 0
    const nextW = wide ? flex - taskW - sumW - msgW : 0

    return (
      <Box flexDirection="column">
        <Box key="summary">
          {list.length === 0 && <Text bold>No tasks/*.md for this session.</Text>}
          {list.length > 0 &&
            COUNTED.map(state => (
              <Text
                key={state}
                bold={NEEDS_USER.has(state) && n[state] > 0}
                color={n[state] > 0 && NEEDS_USER.has(state) ? STATE_COLOR[state] : undefined}
                dimColor={n[state] === 0}
              >
                {`${state} ${n[state]}  `}
              </Text>
            ))}
          {live.length > 0 && <Text color="claude">{`${live.length} running  `}</Text>}
          {closed.length > 0 && <Text dimColor>{`${closed.length} done`}</Text>}
        </Box>
        {live.flatMap(agent => {
          const task = taskFor(all, agent)
          const doing = agent.what ? `${agent.what} ${since(agent.activeAt)}` : agent.status
          const model = agent.model ? ` · ${agent.model.replace(/^claude-/, '')}` : ''
          const ctx = agent.context ? ` ${tokens(agent.context)} ctx` : ''

          return [
            <Box key={`agent-${agent.id}`}>
              <Text color={AGENT_COLOR[agent.status] ?? 'inactive'}>{'● '}</Text>
              <Text bold>{pad(agent.name || agent.description, 18)}</Text>
              <Text bold>{pad(task?.id ?? '—', 6)}</Text>
              <Text wrap="truncate-end">{cut(`${doing} · up ${since(agent.spawnedAt)}${model}${ctx}`, width - 26)}</Text>
            </Box>,
            <Box key={`agent-${agent.id}-task`}>
              <Text dimColor wrap="truncate-end">
                {cut(`  ${task ? label(task) : agent.description}${task?.summary ? ` — ${task.summary}` : ''}`, width)}
              </Text>
            </Box>,
          ]
        })}
        {live.length > 0 && <Box key="gap" height={1} />}
        {list.length > 0 && (
          <Box key="head">
            <Text dimColor bold wrap="truncate-end">
              {`  ${pad('ID', 5)}${pad('Status', 8)}${pad('Task', taskW)}${pad('Agent', 15)}${pad('Coord', 9)}${pad('Last', 6)}${
                wide ? `${pad('Summary', sumW)}${pad('Last message', msgW)}${pad('Next', nextW)}` : ''
              }`}
            </Text>
          </Box>
        )}
        {open.flatMap(task => {
          const state = stateOf(task.status)
          const color = STATE_COLOR[state]
          const agent = agentFor(crew, all, task)
          const msg = lastMessage(task, agent, now)
          // The narrow row's second line: summary, what Last message adds to it, next.
          const extra = msg.endsWith(task.summary) ? msg.slice(0, msg.length - task.summary.length).replace(/ · $/, '') : msg
          const line2 = `${task.summary || '—'}${extra ? ` · ${extra}` : ''}${task.next && task.next !== '—' ? ` → ${task.next}` : ''}`
          const rows = [
            <Box key={`task-${task.id}`}>
              <Text color={color}>{'▍ '}</Text>
              <Text bold>{pad(task.id, 5)}</Text>
              <Text color={color}>{pad(state, 8)}</Text>
              <Text wrap="truncate-end">{pad(label(task), taskW)}</Text>
              <Text color={agent && isLive(agent) ? 'claude' : undefined} dimColor={!agent || !isLive(agent)}>
                {pad(`${agent && isLive(agent) ? '● ' : ''}${task.owner || '—'}`, 15)}
              </Text>
              <Text dimColor>{pad(coord(task), 9)}</Text>
              <Text color={msg.startsWith('quiet') ? 'warning' : 'inactive'}>{pad(task.activity, 6)}</Text>
              {wide && <Text wrap="truncate-end">{pad(task.summary || '—', sumW)}</Text>}
              {wide && (
                <Text dimColor wrap="truncate-end">
                  {pad(msg || '—', msgW)}
                </Text>
              )}
              {wide && <Text wrap="truncate-end">{pad(task.next || '—', nextW)}</Text>}
            </Box>,
          ]
          if (detail)
            rows.push(
              <Box key={`task-${task.id}-detail`}>
                <Text dimColor wrap="truncate-end">
                  {`       ${cut(line2, width - 8)}`}
                </Text>
              </Box>,
            )

          return rows
        })}
        {doneRows > 0 &&
          (doneRows === closed.length ? (
            closed.map(task => (
              <Box key={`done-${task.id}`}>
                <Text color={stateOf(task.status) === 'done' ? 'success' : 'inactive'}>{'✓ '}</Text>
                <Text dimColor>{pad(task.id, 5)}</Text>
                <Text dimColor wrap="truncate-end">
                  {cut(`${label(task)}${task.summary ? ` — ${task.summary}` : ''}`, width - 14)}
                </Text>
                <Text dimColor>{` ${task.activity}`}</Text>
              </Box>
            ))
          ) : (
            <Box key="done">
              <Text color="success">{'✓ '}</Text>
              <Text dimColor wrap="truncate-end">
                {cut(`${closed.length} done: ${closed.map(task => task.id).join(', ')}`, width - 2)}
              </Text>
            </Box>
          ))}
        {recent.length > 0 && <Box key="activity-gap" height={1} />}
        {recent.length > 0 && (
          <Box key="activity">
            <Text dimColor bold>
              Activity
            </Text>
          </Box>
        )}
        {recent.map(({ task, entry }, i) => (
          <Box key={`act-${i}`}>
            <Text dimColor>{`${entry.at.padStart(5)} `}</Text>
            <Text bold>{pad(task.id, 5)}</Text>
            <Text wrap="truncate-end">{cut(`${entry.who ? `${entry.who} · ` : ''}${entry.what}`, width - 11)}</Text>
          </Box>
        ))}
        {others.length > 0 && (
          <Box key="others">
            <Text dimColor wrap="truncate-end">
              {cut(`Other sessions: ${others.map(task => `${task.id} ${stateOf(task.status)} ${coord(task)}`).join(', ')}`, width)}
            </Text>
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
