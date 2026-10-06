import type { AgentInfo } from 'claude-code'

import type { Agent, Entry, Task } from '../types'

// Parsing follows skills/coordinator/tasks-index.py line for line, so the pane and the reply table agree.
const FIELDS = ['status', 'owner', 'session', 'linear', 'about', 'priority', 'impact', 'effort'] as const
// Progress lines kept per task for the activity list.
const KEEP = 8

const pad2 = (n: number) => String(n).padStart(2, '0')

// One Progress line: `HH:MM <who> | what | next | blocker`; `next` carries the blocker as tasks-index.py prints it.
export const parseEntry = (line: string): Entry => {
  const m = line.match(/^(\d{1,2}:\d{2})\s+(.*)$/)
  const rest = m ? (m[2] ?? '') : line
  const parts = rest.split('|').map(part => part.trim())
  let next = parts.length >= 3 ? (parts[2] ?? '') : ''
  const blocker = parts[3] ?? ''
  if (parts.length >= 4 && blocker && !['none', '-', '—'].includes(blocker.toLowerCase()))
    next = `${next} (blocked: ${blocker})`.trim()

  return {
    at: m?.[1] ?? '',
    who: parts.length >= 2 ? (parts[0] ?? '') : '',
    what: parts.length >= 2 ? (parts[1] ?? '') : rest,
    next,
  }
}

export const parseTask = (name: string, text: string, mtimeMs: number, dir: string): Task => {
  const head: Record<string, string> = {}
  let id = name.replace(/\.md$/, '')
  let title = ''
  let section: string | null = null
  const progress: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^#\s+(.+?)\s+[—–-]+\s+(.*)$/)
    if (m && !title && !line.startsWith('##')) {
      id = (m[1] ?? '').trim()
      title = (m[2] ?? '').trim()
      continue
    }
    if (line.startsWith('## ')) {
      section = line.slice(3).trim().toLowerCase()
      continue
    }
    if (section === null) {
      const h = line.match(/^([A-Za-z ]+):\s*(.*)$/)
      const key = h?.[1]?.trim().toLowerCase() ?? ''
      if (h && (FIELDS as readonly string[]).includes(key)) head[key] = (h[2] ?? '').trim()
    } else if (section.startsWith('progress')) {
      const s = line.trim()
      if (s && !s.startsWith('<!--') && !s.startsWith('-->')) progress.push(s.replace(/^[-* ]+/, '').trim())
    }
  }
  const entries = progress.map(parseEntry)
  const last = entries.at(-1)
  const at = new Date(mtimeMs)

  return {
    id,
    title,
    about: head.about ?? '',
    status: head.status ?? '',
    owner: head.owner ?? '',
    session: head.session ?? '',
    priority: head.priority ?? '',
    impact: head.impact ?? '',
    effort: head.effort ?? '',
    activity: last?.at || `${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`,
    summary: last?.what ?? '',
    next: last?.next ?? '',
    progress: entries.slice(-KEEP),
    mtimeMs,
    file: `${dir}/${name}`,
  }
}

export const stateOf = (status: string) => status.replace(/\(.*$/, '').trim().toLowerCase()

// Needs-attention first (a plan waits on the user, as a review does); done and dropped last.
const RANK: Record<string, number> = { blocked: 0, plan: 1, review: 1, doing: 2, todo: 3, done: 5, dropped: 6 }
export const rank = (task: Task) => RANK[stateOf(task.status)] ?? 4
export const isClosed = (task: Task) => rank(task) >= 5

// tasks-index.py's sort key: P1 first and no priority last, then High, Med, Low impact.
const prio = (task: Task) => Number((task.priority ?? '').trim().toUpperCase().match(/^P(\d)/)?.[1] ?? 9)
const IMPACT: Record<string, number> = { h: 0, m: 1, l: 2 }
const impact = (task: Task) => IMPACT[(task.impact ?? '').trim().toLowerCase().slice(0, 1)] ?? 3

// Priority, then impact, as tasks-index.py; within those, needs-user first and done last.
export const sortTasks = (tasks: readonly Task[]) =>
  [...tasks].sort(
    (a, b) =>
      prio(a) - prio(b) ||
      impact(a) - impact(b) ||
      rank(a) - rank(b) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  )

// tasks-index.py's P cell: `P1 · H/S`, or — when the task has no priority.
export const pcell = (task: Task) => {
  const p = (task.priority ?? '').trim().toUpperCase()
  const first = (text: string | undefined) => (text || '?').slice(0, 1).toUpperCase()

  return p ? `${p} · ${first(task.impact)}/${first(task.effort)}` : '—'
}

// This session's tasks, as `tasks-index.py --session` picks them; every task when none names it.
export const mine = (tasks: readonly Task[], sessionId: string) => {
  const own = tasks.filter(task => sessionId && task.session.trim() === sessionId)

  return own.length ? own : [...tasks]
}

export const COUNTED = ['plan', 'review', 'blocked', 'doing', 'todo'] as const
export const NEEDS_USER = new Set<string>(['plan', 'review', 'blocked'])

export const counts = (tasks: readonly Task[]) => {
  const n = { plan: 0, review: 0, blocked: 0, doing: 0, todo: 0 }
  for (const task of tasks) {
    const state = stateOf(task.status)
    if (state in n) n[state as keyof typeof n] += 1
  }

  return n
}

export const isLive = (agent: Agent) => agent.status === 'running' || agent.status === 'waiting'

// The footer and prompt-section line: doing, review, blocked always; plan, todo and live agents when any.
export const summary = (tasks: readonly Task[], agents: readonly Agent[] = []) => {
  const n = counts(tasks)
  const running = agents.filter(a => a.status === 'running').length
  const parts = [`doing ${n.doing}`, `review ${n.review}`, `blocked ${n.blocked}`]
  if (n.plan) parts.push(`plan ${n.plan}`)
  if (running) parts.push(`${running} running`)

  return parts.join(' · ')
}

// The task in plain words: its About: line, else the title.
export const label = (task: Task) => task.about || task.title

// The owning coordinator session, short, as tasks-index.py prints it.
export const coord = (task: Task) => task.session.trim().slice(0, 8) || '—'

export const kebab = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Engine helper loops (prompt suggestions, compaction, memory forks) are not the person's agents.
export const isHelper = (info: AgentInfo) =>
  /suggest|compact|memory|summar/i.test(`${info.type} ${info.name ?? ''}`) || !(info.name || info.description)

// Poll results merge into the records: fields events set (activity, model, context, spawn time) survive.
export const mergeAgents = (before: readonly Agent[], infos: readonly AgentInfo[], now: number) => {
  const old = new Map(before.map(a => [a.id, a]))

  return infos
    .filter(info => !isHelper(info))
    .map(info => {
      const prev = old.get(info.id)

      return {
        id: info.id,
        name: info.name ?? '',
        description: info.description,
        status: info.status,
        activeAt: prev?.activeAt ?? now,
        spawnedAt: prev?.spawnedAt ?? prev?.activeAt ?? now,
        what: prev?.what ?? '',
        model: prev?.model ?? '',
        context: prev?.context ?? 0,
      }
    })
}

const mentions = (text: string, id: string) =>
  new RegExp(`(^|[^a-z0-9])${id.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text.toLowerCase())

// An agent's task: an open task its name or brief names, else an open task it owns (needs-user first), else a closed one its brief names.
export const taskFor = (tasks: readonly Task[], agent: Agent) => {
  const text = `${agent.name} ${agent.description}`
  const sorted = sortTasks(tasks)
  const named = sorted.filter(task => mentions(text, task.id))
  const owned = sorted.filter(task => !isClosed(task) && agent.name && kebab(task.owner) === kebab(agent.name))

  return named.find(task => !isClosed(task)) ?? owned[0] ?? named[0]
}

// A task's agent: the live (else latest) agent whose task it is. Closed tasks show no live owner.
export const agentFor = (agents: readonly Agent[], tasks: readonly Task[], task: Task) => {
  const list = agents.filter(agent => taskFor(tasks, agent)?.file === task.file)

  return list.find(isLive) ?? list.at(-1)
}

const minuteOfDay = (hhmm: string) => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)

  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

// Minutes since a local `HH:MM` today (yesterday if that is in the future).
export const quietMinutes = (hhmm: string, now: number) => {
  const at = minuteOfDay(hhmm)
  if (at === null) return null
  const d = new Date(now)
  let diff = d.getHours() * 60 + d.getMinutes() - at
  if (diff < 0) diff += 24 * 60

  return diff
}

export const age = (minutes: number) =>
  minutes < 1 ? 'now' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`

export const tokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

// tasks-index.py's Last message, with the matched live agent's current step in place of its tmux line.
export const lastMessage = (task: Task, agent: Agent | undefined, now: number) => {
  const state = stateOf(task.status)
  const working = state.startsWith('doing') || state.startsWith('review')
  if (working && agent && isLive(agent) && agent.what)
    return `${agent.what} ${age(Math.floor((now - agent.activeAt) / 60000))}`.slice(0, 80)
  let msg = task.summary.slice(0, 80)
  const at = minuteOfDay(task.activity)
  if (msg && at !== null && working) {
    const d = new Date(now)
    const mins = d.getHours() * 60 + d.getMinutes() - at
    if (mins > 15) msg = `quiet ${mins}m · ${msg}`
  }

  return msg
}

// The last Progress lines across tasks, newest first.
export const activity = (tasks: readonly Task[], n: number) =>
  tasks
    .flatMap(task => task.progress.map((entry, i) => ({ task, entry, i })))
    .filter(({ entry }) => minuteOfDay(entry.at) !== null)
    .sort((a, b) => (minuteOfDay(b.entry.at) ?? 0) - (minuteOfDay(a.entry.at) ?? 0) || b.i - a.i)
    .slice(0, n)

const cell = (text: string) => (text || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')

export const TABLE_HEAD = '| ID | P | Task | Agent | Coordinator | Last activity | Summary | Last message | Next |'

// One row of `tasks-index.py --session`'s table.
export const tableRow = (task: Task, agent: Agent | undefined, now: number) =>
  `| ${[task.id, pcell(task), label(task), task.owner, coord(task), task.activity, task.summary, lastMessage(task, agent, now), task.next]
    .map(cell)
    .join(' | ')} |`

const fit = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

// The /coordinator-board reply: counts, live agents, the session table (priority first, then needs-user), recent Progress.
export const markdown = (tasks: readonly Task[], agents: readonly Agent[], sessionId: string, now: number) => {
  if (tasks.length === 0) return 'No tasks/*.md for this session.'
  const list = sortTasks(mine(tasks, sessionId))
  const crew = agents.filter(isLive).map(agent => {
    const task = taskFor(tasks, agent)
    const what = agent.what ? `${agent.what} ${age(Math.floor((now - agent.activeAt) / 60000))}` : agent.status

    return `- ${agent.name || agent.description} → ${task ? `${task.id} ${fit(label(task), 50)}` : '—'} · ${what}`
  })
  const others = sortTasks(tasks.filter(task => !list.includes(task) && !isClosed(task)))
  const recent = activity(list, 5).map(({ task, entry }) => `- ${entry.at} ${task.id} ${entry.who ? `${entry.who} · ` : ''}${entry.what}`)

  return [
    `**Board:** ${summary(list, agents)}`,
    '',
    ...(crew.length ? [...crew, ''] : []),
    TABLE_HEAD,
    '|---|---|---|---|---|---|---|---|---|',
    ...list.map(task => tableRow(task, agentFor(agents, tasks, task), now)),
    ...(recent.length ? ['', '**Recent:**', ...recent] : []),
    ...(others.length ? ['', `Other sessions: ${others.map(t => `${t.id} (${stateOf(t.status)}, ${coord(t)})`).join(', ')}`] : []),
  ].join('\n')
}
