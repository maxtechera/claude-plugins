# Claude Code Plugins

Simple, focused plugins for Claude Code.

## Plugins

| Plugin | Description | Skills |
|--------|-------------|--------|
| `dev-essentials` | React/Next.js code review and debugging | `react-performance`, `debugging` |
| `productivity` | Sabotage pattern detection | `sabotage-check` |
| `hormozi` | Value Equation for pricing | `value-equation` |

## Installation

### Quick Install
```bash
/plugin install dev-essentials
/plugin install productivity
/plugin install hormozi
```

### From Marketplace
```bash
# Add marketplace
claude plugin add-marketplace https://github.com/maxtechera/claude-plugins

# Install any plugin
/plugin install dev-essentials@max-techera-plugins
```

## Usage Examples

### Dev Essentials
```
"Review this component for performance issues"
"Help me debug this error: [paste error]"
"/review src/components/MyComponent.tsx"
```

### Productivity
```
"Am I sabotaging myself right now?"
"Run a sabotage check"
```

### Hormozi
```
"Score my offer using the value equation"
"Make this offer more valuable"
```

## Plugin Structure

Each plugin follows Anthropic's plugin spec:
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json     # Metadata
├── skills/
│   └── skill-name/
│       └── SKILL.md    # Skill definition
├── commands/           # Optional slash commands
└── README.md
```

## Manual Installation

```bash
# Clone the repo
git clone https://github.com/maxtechera/claude-plugins

# Copy to your project
cp -r claude-plugins/plugins/dev-essentials .claude/plugins/

# Or global install
cp -r claude-plugins/plugins/dev-essentials ~/.claude/plugins/
```

## Workshop

Part of Max's Claude Code workshop. [Join the community](https://skool.com/nodo)

---

Built by [Max Techera](https://maxtechera.dev)
