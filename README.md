# Claude Code Plugins

Simple, focused plugins for Claude Code.

## Plugins

- **coordinator** — Coordinator role skill plus a live `/coordinator` pane of `tasks/*.md` merged with running agents, and a status-line count.

```bash
/plugin marketplace add /home/max/dev/claude-plugins
/plugin install coordinator@max-techera-plugins
```

## Archived

All 11 previous plugins (dev-essentials, feature-dev, code-review, skill-creator,
hormozi, content-creator, youtube, mailerlite, essentials, max-os, skool) were
unused for 30+ days and have been moved to [`plugins/_archived/`](plugins/_archived/).
Their history is preserved; they can be restored or reinstated individually if needed.

## Installation

```bash
# Add the marketplace (once)
/plugin marketplace add maxtechera/claude-plugins
```

## Manual Installation

```bash
git clone https://github.com/maxtechera/claude-plugins
cp -r claude-plugins/plugins/<plugin-name> .claude/plugins/
```

## Workshop

Part of Max's Claude Code workshop. [Join the community](https://skool.com/nodo)

---

Built by [Max Techera](https://maxtechera.dev)
