# Claude Code Plugins

Simple, focused plugins for Claude Code.

## Plugins

| Plugin | Description | Skills | Commands |
|--------|-------------|--------|----------|
| `dev-essentials` | Code review, debugging, git, React | `react-performance`, `debugging` | `/review`, `/commit`, `/push`, `/pr`, `/test`, `/implement`, `/explore` |
| `feature-dev` | 7-phase feature development | - | `/feature-dev` |
| `code-review` | Multi-agent PR review | - | `/code-review` |
| `skill-creator` | Create new skills | `skill-creator` | - |
| `hormozi` | $100M frameworks for offers, leads, pricing | `value-equation`, `hormozi-offers`, `hormozi-leads`, `hormozi-money-models` | - |
| `content-creator` | Viral content, copywriting, brand voice | `viral-hooks`, `viral-patterns`, `natural-writing`, `lead-magnet-copywriting`, `brand-voice`, `content-multiplication` | `/find-topic` |
| `youtube` | Video scripting | `scripting`, `youtube-scripting` | - |
| `mailerlite` | Email marketing, automations, API | `mailerlite-mastery` | - |

## Installation

```bash
# Add the marketplace (once)
/plugin marketplace add maxtechera/claude-plugins

# Install plugins by name
/plugin install dev-essentials@max-techera-plugins
/plugin install feature-dev@max-techera-plugins
/plugin install code-review@max-techera-plugins
/plugin install skill-creator@max-techera-plugins
/plugin install hormozi@max-techera-plugins
/plugin install content-creator@max-techera-plugins
/plugin install youtube@max-techera-plugins
```

## Usage Examples

### Dev Essentials
```
"Review this component for performance issues"
"Help me debug this error: [paste error]"
"/review src/components/MyComponent.tsx"
```

### Feature Dev
```
/feature-dev Add user authentication with OAuth
/feature-dev Implement search functionality
/feature-dev  # Interactive mode
```

### Code Review
```
/code-review           # Review current PR
/code-review 123       # Review PR #123
/code-review <url>     # Review by URL
```

### Skill Creator
```
"Help me create a skill for API responses"
"Build a skill for our deployment process"
```

### Hormozi
```
"Score my offer using the value equation"
"Make this offer more valuable"
"Apply $100M Leads framework to my lead gen"
"Create a Grand Slam Offer for [product]"
```

### Content Creator
```
"Write a hook for my video about [topic]"
"Score this hook using STEPPS"
"Rewrite this to sound more natural (less AI)"
"Create a landing page for my lead magnet"
"Multiply this content into 15 pieces"
```

### YouTube
```
"Write a script for a video about [topic]"
"Structure my video using the hook-intro-body-close format"
```

## Manual Installation

```bash
git clone https://github.com/maxtechera/claude-plugins
cp -r claude-plugins/plugins/dev-essentials .claude/plugins/
```

## Workshop

Part of Max's Claude Code workshop. [Join the community](https://skool.com/nodo)

---

Built by [Max Techera](https://maxtechera.dev)
