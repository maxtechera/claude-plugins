import type { AgentInfo } from 'claude-code'

import type { Agent, Task } from '../types'

const header = (text: string, name: string) =>
  text.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''

export const parseTask = (file: string, text: string, mtimeMs: number): Task => {
  const title = text.match(/^#\s+(.*)$/m)?.[1] ?? ''
  const [id = file.replace(/\.md$/, ''), rest = title] = title.split(/\s+[—-]\s+/, 2)
  const progress = text.split(/^## Progress\s*$/m)[1] ?? ''
  const lines = progress
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^\d{1,2}:\d{2}\s/.test(line))
  const last = lines.at(-1) ?? ''

  return {
    id: id.trim(),
    title: rest.trim(),
    status: header(text, 'Status') || '?',
    owner: header(text, 'Owner') || '—',
    last: last.replace(/^\d{1,2}:\d{2}\s+/, ''),
    lastAt: last.match(/^(\d{1,2}:\d{2})/)?.[1] ?? '',
    mtimeMs,
    file,
  }
}

export const stateOf = (status: string) => status.replace(/\(.*$/, '').trim()

// Needs-attention first; done and dropped last.
const RANK: Record<string, number> = { blocked: 0, review: 1, doing: 2, todo: 3, done: 5, dropped: 6 }
export const rank = (task: Task) => RANK[stateOf(task.status)] ?? 4
export const isClosed = (task: Task) => rank(task) >= 5

export const sortTasks = (tasks: readonly Task[]) =>
  [...tasks].sort(
    (a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id, undefined, { numeric: true }),
  )

export const counts = (tasks: readonly Task[]) => {
  const n = { doing: 0, review: 0, blocked: 0 }
  for (const task of tasks) {
    const state = stateOf(task.status)
    if (state === 'doing' || state === 'review' || state === 'blocked') n[state] += 1
  }

  return n
}

export const summary = (tasks: readonly Task[], agents: readonly Agent[] = []) => {
  const n = counts(tasks)
  const running = agents.filter(a => a.status === 'running').length
  const parts = [`doing ${n.doing}`, `review ${n.review}`, `blocked ${n.blocked}`]
  if (running) parts.push(`${running} running`)

  return parts.join(' · ')
}

export const kebab = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Engine helper loops (prompt suggestions, compaction, memory forks) are not the person's agents.
export const isHelper = (info: AgentInfo) =>
  /suggest|compact|memory|summar/i.test(`${info.type} ${info.name ?? ''}`) || !(info.name || info.description)

// Poll results merge into the records: fields events set (activeAt, what) survive.
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
        what: prev?.what ?? '',
      }
    })
}

// By task ID named in the agent's name or brief, then by owner name.
export const agentFor = (agents: readonly Agent[], task: Task) => {
  const id = new RegExp(`(^|[^a-z0-9])${task.id.toLowerCase()}([^a-z0-9]|$)`)
  const byId = agents.filter(a => id.test(`${a.name} ${a.description}`.toLowerCase()))
  const pick = (list: Agent[]) => list.find(a => a.status === 'running') ?? list.at(-1)

  return pick(byId) ?? pick(agents.filter(a => a.name && kebab(a.name) === kebab(task.owner)))
}

// Minutes since a local `HH:MM` today (yesterday if that is in the future).
export const quietMinutes = (hhmm: string, now: number) => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const at = new Date(now)
  at.setHours(Number(m[1]), Number(m[2]), 0, 0)
  let diff = Math.floor((now - at.getTime()) / 60000)
  if (diff < 0) diff += 24 * 60

  return diff
}

export const age = (minutes: number) =>
  minutes < 1 ? 'now' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}`

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')

export const markdown = (tasks: readonly Task[], agents: readonly Agent[], now: number) => {
  if (tasks.length === 0) return 'No tasks/*.md in this repo.'
  const rows = sortTasks(tasks).map(task => {
    const agent = agentFor(agents, task)
    const quiet = quietMinutes(task.lastAt, now)
    const who = agent ? `${task.owner} (${agent.status})` : task.owner

    return `| ${cell(task.id)} | ${cell(task.title)} | ${cell(task.status)} | ${cell(who)} | ${cell(task.last)} | ${quiet === null || isClosed(task) ? '' : age(quiet)} |`
  })

  return [
    `**Board:** ${summary(tasks, agents)}`,
    '',
    '| ID | Task | Status | Owner | Last progress | Quiet |',
    '|---|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}
