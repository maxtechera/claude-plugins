import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register } from 'claude-code'

import type { Agent, Task } from '../types'
import {
  activity,
  age,
  agentFor,
  artifact,
  coord,
  COUNTED,
  counts,
  cut,
  detailLine,
  isClosed,
  isLive,
  label,
  lastMessage,
  markdown,
  mergeAgents,
  mine,
  nextCell,
  NEEDS_USER,
  parseTask,
  pcell,
  remoteRepo,
  shas,
  artifactLines,
  short,
  sortTasks,
  stateOf,
  summary,
  taskFor,
  tokens,
} from './board'

const PANE = 'coordinator'
// The board command; the bare /coordinator belongs to the plugin's own skill.
const COMMAND = 'coordinator-board'
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

// `owner/repo` of each repo's GitHub origin, read once per load from .git/config.
const remotes = new Map<string, string>()
const repoOf = async ($: EngineInterface, tasksDir: string) => {
  const dir = await findRoot($, tasksDir.replace(/\/tasks$/, ''))
  if (!dir) return ''
  const known = remotes.get(dir)
  if (known !== undefined) return known
  let repo = ''
  try {
    if (await $.fs.exists(`${dir}/.git/config`)) {
      const text = await $.fs.read(`${dir}/.git/config`)
      if (typeof text === 'string') repo = remoteRepo(text)
    }
  } catch {
    // A worktree's .git is a file, or the config is unreadable: no links.
  }
  remotes.set(dir, repo)

  return repo
}

// Which SHAs exist in a repo, asked of git once per SHA per load.
const known = new Map<string, boolean>()
const commitsOf = async ($: EngineInterface, tasksDir: string, task: Task) => {
  const dir = await findRoot($, tasksDir.replace(/\/tasks$/, ''))
  if (!dir || !task.repo) return []
  const found: string[] = []
  for (const sha of new Set(artifactLines(task).flatMap(shas))) {
    const key = `${dir} ${sha}`
    if (!known.has(key)) {
      const ok = await $.process
        .run(['git', 'cat-file', '-e', `${sha}^{commit}`], { cwd: dir, timeoutMs: 5000 })
        .then(r => r.exitCode === 0)
        .catch(() => false)
      known.set(key, ok)
    }
    if (known.get(key)) found.push(sha)
  }

  return found
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
    const repo = await repoOf($, tasksDir)
    for (const entry of (await $.fs.list(tasksDir)).filter(isTaskFile)) {
      const prev = old.get(`${tasksDir}/${entry.name}`)
      // A record from before 0.4 has no progress list, and one from before 0.6 no repo or commits: read it again.
      if (prev && prev.mtimeMs === entry.mtimeMs && Array.isArray(prev.progress) && prev.repo === repo && Array.isArray(prev.commits)) {
        next.push(prev)
        continue
      }
      const text = await $.fs.read(`${tasksDir}/${entry.name}`)
      if (typeof text !== 'string') continue
      const task = { ...parseTask(entry.name, text, entry.mtimeMs, tasksDir), repo }
      next.push({ ...task, commits: await commitsOf($, tasksDir, task) })
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

const prioOf = (task: Task) => (task.priority ?? '').trim().toUpperCase()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    rootFor = ''
    discoveredAt = -Infinity
    // 0.1/0.2 pinned the counts with $.ui.status, which draws a warning glyph; the footer label replaces it.
    $.ui.status(undefined)
    // Liveness first: a refused /coordinator-board (another skill or command owns the name) must not stop the board.
    $.clock.every(SYNC_MS, () => void sync($))
    await sync($)
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Open the coordinator pane and print the task board (tasks/*.md) with live agents',
      })
    } catch (err) {
      $.ui.log(`coordinator: /${COMMAND} not registered (${err instanceof Error ? err.message : String(err)}); the pane and footer still run`)
    }

    return next(e)
  })

  // Session id and board, as the old session-start hook printed them.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const id = await $.session.id()
    const list = sortTasks(await read($, tasks))
    const board = list.map(t => `${t.id} | ${pcell(t)} | ${label(t)} | ${t.status} | ${t.owner} | ${coord(t)}`).join('\n')
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
  on('command.run', { command: COMMAND }, async $ => {
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
    const { Box, Text, Link } = $.ui.resolve(e)
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

    // Columns: marker 2, ID 5, P (`P1 · H/S` wide, `P1` narrow), status 8, agent 20, last activity
    // (`PR #4 merged` when wide and a row names a PR or commit, else the time); the rest is shared. The
    // coordinator session is always this table's own session (it's already scoped by `mine`), so it only
    // shows where it varies: the "Other sessions" footer line.
    const agentW = 20
    const pW = wide ? 9 : 3
    const lastW = wide && open.some(task => artifact(task)) ? 18 : 6
    const flex = Math.max(10, width - 15 - agentW - pW - lastW)
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
                {cut(`  ${task ? short(label(task)) : agent.description}${task?.summary ? ` — ${short(task.summary)}` : ''}`, width)}
              </Text>
            </Box>,
          ]
        })}
        {live.length > 0 && <Box key="gap" height={1} />}
        {list.length > 0 && (
          <Box key="head">
            <Text dimColor bold wrap="truncate-end">
              {`  ${pad('ID', 5)}${pad('P', pW)}${pad('Status', 8)}${pad('Task', taskW)}${pad('Agent', agentW)}${pad('Last', lastW)}${
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
          const sum = short(task.summary)
          const next = nextCell(task)
          const art = artifact(task)
          const extra = msg.endsWith(sum) ? msg.slice(0, msg.length - sum.length).replace(/ · $/, '') : msg
          const lastColor = msg.startsWith('quiet') ? 'warning' : 'inactive'
          const artText = art ? `${art.kind === 'pr' ? 'PR ' : ''}` : ''
          const artLabel = art ? cut(art.label, Math.max(4, lastW - 2 - artText.length - (art.state ? art.state.length + 1 : 0))) : ''
          const rows = [
            <Box key={`task-${task.id}`}>
              <Text color={color}>{'▍ '}</Text>
              <Text bold>{pad(task.id, 5)}</Text>
              <Text bold={prioOf(task) === 'P1'} dimColor={!task.priority}>
                {pad(wide ? pcell(task) : task.priority ? prioOf(task) : '—', pW)}
              </Text>
              <Text color={color}>{pad(state, 8)}</Text>
              <Text wrap="truncate-end">{pad(short(label(task)), taskW)}</Text>
              <Text color={agent && isLive(agent) ? 'claude' : undefined} dimColor={!agent || !isLive(agent)}>
                {pad(`${agent && isLive(agent) ? '● ' : ''}${task.owner || '—'}`, agentW)}
              </Text>
              {lastW > 6 && art ? (
                <Text color={lastColor} wrap="truncate-end">
                  {artText}
                  <Link key={`link-${task.id}`} href={art.url} label={artLabel} />
                  {pad(art.state ? ` ${art.state}` : ' ', Math.max(2, lastW - artText.length - artLabel.length))}
                </Text>
              ) : (
                <Text color={lastColor}>{pad(task.activity, lastW)}</Text>
              )}
              {wide && <Text wrap="truncate-end">{pad(sum || '—', sumW)}</Text>}
              {wide && (
                <Text dimColor wrap="truncate-end">
                  {pad(msg || '—', msgW)}
                </Text>
              )}
              {wide && <Text wrap="truncate-end">{pad(next || '—', nextW)}</Text>}
            </Box>,
          ]
          if (detail) {
            const artW = art ? artText.length + art.label.length + art.state.length + 4 : 0
            const { head, next: nextSeg } = detailLine(sum, extra, next, width - 8 - artW)
            rows.push(
              <Box key={`task-${task.id}-detail`}>
                <Text dimColor wrap="truncate-end">
                  {'       '}
                  {art && <Link key={`link-${task.id}`} href={art.url} label={`${artText}${art.label}`} />}
                  {art ? ` ${art.state ? `${art.state} · ` : ''}` : ''}
                  {head}
                </Text>
                {nextSeg && (
                  <Text bold wrap="truncate-end">
                    {` → ${nextSeg}`}
                  </Text>
                )}
              </Box>,
            )
          }

          return rows
        })}
        {doneRows > 0 &&
          (doneRows === closed.length ? (
            closed.map(task => (
              <Box key={`done-${task.id}`}>
                <Text color={stateOf(task.status) === 'done' ? 'success' : 'inactive'}>{'✓ '}</Text>
                <Text dimColor>{pad(task.id, 5)}</Text>
                <Text dimColor wrap="truncate-end">
                  {cut(`${short(label(task))}${task.summary ? ` — ${short(task.summary)}` : ''}`, width - 14)}
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
