# Max OS Plugin

Claude Code configuration for the Max OS personal operating system.

## Components

### 1. Statusline (`config/statusline-command.sh`)

Shows Max OS state sync status in Claude Code statusline:

```
Opus [46%] max-os ●
```

- `●` green = synced (< 24h old, < 5 commits)
- `●` yellow = drifting (24-72h old OR 5-10 commits)
- `●` red = stale (> 72h old OR > 10 commits)

### 2. Hooks (`config/hooks.json`)

Claude Code hooks for Max OS workflow:

| Hook | Purpose |
|------|---------|
| PostToolUse (Write/Edit) | Validate JSON after editing state files |
| PostToolUse (Bash) | Remind to sync after git commits |
| SessionStart | Check state drift on session start |
| PreCompact | Capture P0 tasks before context compaction |

## Installation

### Statusline

```bash
# Copy to Claude config
cp config/statusline-command.sh ~/.claude/statusline-command.sh
chmod +x ~/.claude/statusline-command.sh
```

### Hooks

Merge hooks from `config/hooks.json` into your project's `.claude/settings.local.json`:

```bash
# In your project directory
cp config/hooks.json .claude/settings.local.json
# Or merge manually if you have existing settings
```

## Requirements

- Works in `max-techera-web` project (checks for `_docs/OPERATIONS/priorities.json`)
- Uses `grep`/`sed` (no `jq` dependency)
