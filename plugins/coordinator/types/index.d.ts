export type Task = {
  id: string
  title: string
  status: string
  owner: string
  last: string
  /** `HH:MM` of the last Progress line, when it has one. */
  lastAt: string
  mtimeMs: number
  file: string
}

export type Agent = {
  id: string
  name: string
  description: string
  status: string
  /** Epoch ms of the last tool call, step or spawn seen in its loop. */
  activeAt: number
  what: string
}

declare module 'claude-code' {
  interface PluginState {
    coordinator: {
      root: string | null
      tasks: Task[]
      agents: Agent[]
      /** Minutes since epoch at the last sync, so staleness redraws once a minute. */
      minute: number
    }
  }
}
