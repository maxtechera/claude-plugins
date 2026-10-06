export type Task = {
  id: string
  title: string
  status: string
  owner: string
  last: string
}

export type Activity = { at: number; what: string }

declare module 'claude-code' {
  interface PluginState {
    coordinator: {
      root: string | null
      tasks: Task[]
      activity: Record<string, Activity>
    }
  }
}
