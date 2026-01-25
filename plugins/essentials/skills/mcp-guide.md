# MCP Servers Guide

Complete reference for configuring and creating MCP (Model Context Protocol) servers in Claude Code.

---

## What Are MCP Servers?

MCP servers extend Claude Code with external tools and integrations. They can connect to databases, APIs, browsers, and more.

---

## Configuration Scopes

| Scope | Storage | Use Case |
|-------|---------|----------|
| **Local** (default) | `~/.claude.json` | Current project only |
| **Project** | `.mcp.json` | Team-shared, git-tracked |
| **User** | `~/.claude.json` | All projects |

---

## Configuration Format

**.mcp.json** (project-level):

```json
{
  "mcpServers": {
    "server-name": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    },
    "local-server": {
      "type": "stdio",
      "command": "/path/to/server",
      "args": ["--arg1", "value1"],
      "env": {
        "API_KEY": "${API_KEY}",
        "CONFIG": "${CONFIG:-default_value}"
      }
    }
  }
}
```

---

## Transport Types

| Transport | Best For | Setup |
|-----------|----------|-------|
| **HTTP** | Remote APIs, cloud services | Low |
| **SSE** | Real-time streaming (deprecated) | Medium |
| **Stdio** | Local tools, databases | Medium-High |

---

## CLI Commands

### Adding Servers

```bash
# HTTP transport
claude mcp add --transport http myserver https://api.example.com/mcp

# With authentication
claude mcp add --transport http myserver --header "Authorization: Bearer token" https://api.example.com/mcp

# Stdio transport (local)
claude mcp add --transport stdio myserver -- npx -y @org/mcp-server

# With environment variables
claude mcp add --transport stdio myserver --env API_KEY=yourkey -- npx -y @org/mcp-server

# Specify scope
claude mcp add --transport http myserver --scope project https://api.example.com/mcp
```

### Managing Servers

```bash
# List all servers
claude mcp list

# Get server details
claude mcp get myserver

# Remove server
claude mcp remove myserver

# Check status (in Claude Code)
/mcp

# Import from Claude Desktop
claude mcp add-from-claude-desktop

# Add from JSON
claude mcp add-json weather '{"type":"http","url":"https://api.weather.com/mcp"}'
```

---

## Environment Variables

Use `${VAR}` or `${VAR:-default}` for expansion:

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

---

## Creating Custom MCP Servers

### TypeScript Server

**Project setup**:

```bash
mkdir weather-server && cd weather-server
npm init -y
npm install @modelcontextprotocol/sdk zod@3
npm install -D @types/node typescript
mkdir src && touch src/index.ts
```

**package.json**:

```json
{
  "type": "module",
  "bin": { "weather": "./build/index.js" },
  "scripts": { "build": "tsc && chmod 755 build/index.js" }
}
```

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

**src/index.ts**:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

// Register a tool
server.registerTool(
  "get_weather",
  {
    description: "Get weather for a city",
    inputSchema: {
      city: z.string().describe("City name"),
    },
  },
  async ({ city }) => {
    // Fetch weather data...
    return {
      content: [
        {
          type: "text",
          text: `Weather for ${city}: 72°F, Sunny`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running");  // Use stderr!
}

main().catch(console.error);
```

**Build and add**:

```bash
npm run build
claude mcp add --transport stdio weather -- node /ABSOLUTE/PATH/build/index.js
```

### Python Server

**Project setup**:

```bash
mkdir weather-server && cd weather-server
uv init weather
uv venv && source .venv/bin/activate
uv add "mcp[cli]" httpx
touch weather.py
```

**weather.py**:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")

@mcp.tool()
async def get_weather(city: str) -> str:
    """Get weather for a city.

    Args:
        city: City name
    """
    # Fetch weather data...
    return f"Weather for {city}: 72°F, Sunny"

def main():
    mcp.run(transport="stdio")

if __name__ == "__main__":
    main()
```

**Add to Claude Code**:

```bash
claude mcp add --transport stdio weather -- uv --directory /ABSOLUTE/PATH run weather.py
```

---

## Critical: Logging for Stdio Servers

**NEVER write to stdout** - it corrupts JSON-RPC:

```python
# BAD
print("Processing request")

# GOOD
import logging
logging.info("Processing request")
```

```typescript
// BAD
console.log("Server started");

// GOOD
console.error("Server started");
```

---

## MCP in Plugins

Plugins can bundle MCP servers:

**.claude-plugin/plugin.json**:

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "database": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_URL": "${DB_URL}"
      }
    }
  }
}
```

---

## Using MCP Resources & Prompts

### Reference Resources

```
> Analyze @github:issue://123
> Compare @postgres:schema://users with @docs:file://user-model
```

### MCP Prompts as Commands

```bash
# Discover prompts
/

# Execute
/mcp__github__list_prs
/mcp__github__pr_review 456
```

---

## Best Practices

### Performance

- Use Tool Search when many MCP tools (>10% context)
- Set timeouts: `export MCP_TIMEOUT=10000`
- Paginate large responses
- Cache expensive API calls

### Security

- Use environment variables for secrets
- Never commit API keys to `.mcp.json`
- Use `--header` for auth tokens
- Be careful with servers fetching untrusted content

### Organization

- Project scope (`.mcp.json`) for team servers
- User scope for personal tools
- Clear naming: `database-prod`, `slack-dev`

---

## Common MCP Servers

| Server | Purpose |
|--------|---------|
| `playwright` | Browser automation |
| `postgres` | PostgreSQL database |
| `filesystem` | File system access |
| `github` | GitHub API |
| `slack` | Slack integration |
| `google-drive` | Google Drive access |

---

## Quick Start

```bash
# Add a public MCP server
claude mcp add --transport http weather https://mcp.weather-api.com

# Or add a local stdio server
claude mcp add --transport stdio mydb -- npx -y @example/postgres-mcp

# Verify
claude mcp list

# Use in Claude Code
/mcp  # Check status
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not connecting | Check `claude mcp list`, verify URL/command |
| Tools not appearing | Run `/mcp` to check status |
| Permission errors | Check environment variables |
| Timeout errors | Set `MCP_TIMEOUT` higher |
| Output too large | Set `MAX_MCP_OUTPUT_TOKENS` |

---

## Output Limits

```bash
# Increase MCP output token limit
export MAX_MCP_OUTPUT_TOKENS=50000
claude

# Or in settings
{
  "env": {
    "MAX_MCP_OUTPUT_TOKENS": "50000"
  }
}
```
