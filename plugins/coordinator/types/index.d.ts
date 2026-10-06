export type Task = {
  id: string
  title: string
  status: string
  owner: string
  session: string
  last: string
  /** `HH:MM` of the last Progress line, when it has one. */
  lastAt: string
  mtimeMs: number
  /** The file's full path: the record's key across task dirs. */
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
      /** tasks/ dirs outside the root whose files name this session. */
      sessionDirs: string[]
      tasks: Task[]
      agents: Agent[]
      /** Minutes since epoch at the last sync, so staleness redraws once a minute. */
      minute: number
    }
  }
}
