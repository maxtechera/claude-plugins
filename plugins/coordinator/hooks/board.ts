import type { Task } from '../types'

const header = (text: string, name: string) =>
  text.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''

export const parseTask = (file: string, text: string): Task => {
  const title = text.match(/^#\s+(.*)$/m)?.[1] ?? ''
  const [id = file.replace(/\.md$/, ''), rest = title] = title.split(/\s+[—-]\s+/, 2)
  const progress = text.split(/^## Progress\s*$/m)[1] ?? ''
  const lines = progress
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('<!--') && !line.startsWith('## '))

  return {
    id: id.trim(),
    title: rest.trim(),
    status: header(text, 'Status') || '?',
    owner: header(text, 'Owner') || '—',
    last: lines.at(-1) ?? '',
  }
}

export const stateOf = (status: string) => status.replace(/\(.*$/, '').trim()

export const counts = (tasks: readonly Task[]) => {
  const n = { doing: 0, review: 0, blocked: 0 }
  for (const task of tasks) {
    const state = stateOf(task.status)
    if (state === 'doing' || state === 'review' || state === 'blocked') n[state] += 1
  }

  return n
}

export const summary = (tasks: readonly Task[]) => {
  const n = counts(tasks)

  return `doing ${n.doing} · review ${n.review} · blocked ${n.blocked}`
}

export const kebab = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
