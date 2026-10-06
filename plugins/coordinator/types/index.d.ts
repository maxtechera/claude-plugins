/** One Progress line, `HH:MM <who> | what | next | blocker`. */
export type Entry = {
  /** `HH:MM`, or '' when the line has none. */
  at: string
  who: string
  what: string
  /** The next step, with ` (blocked: <blocker>)` when the line names one. */
  next: string
}

/** A task file, read as tasks-index.py reads it. */
export type Task = {
  id: string
  title: string
  /** The `About:` line, plain words; '' when the task has none. */
  about: string
  status: string
  owner: string
  session: string
  /** `P1`–`P3`; '' when the task has none. */
  priority: string
  /** `High`, `Med` or `Low`; ''. */
  impact: string
  /** `S`, `M` or `L`; ''. */
  effort: string
  /** The last Progress line's `HH:MM`, else the file's `MM-DD`. */
  activity: string
  /** The last Progress line's "what". */
  summary: string
  /** The last Progress line's next step, with its blocker. */
  next: string
  /** The last few Progress lines, oldest first. */
  progress: Entry[]
  /** `owner/repo` of the task dir's GitHub origin, '' when none; PRs and SHAs link there. */
  repo: string
  /** SHAs its text names that `git cat-file -e` found in that repo. */
  commits: string[]
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
  /** Epoch ms it was spawned, or first seen when it predates the mod's load. */
  spawnedAt: number
  what: string
  /** The model of its last step, '' until one is seen. */
  model: string
  /** Context tokens of its last step (input plus cache), 0 until one is seen. */
  context: number
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
