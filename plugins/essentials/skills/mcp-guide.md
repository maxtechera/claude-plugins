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

**src/index.ts** (Complete Example):

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Type definitions
interface WeatherResponse {
  temperature: number;
  conditions: string;
  humidity: number;
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
  };
}

interface AlertsResponse {
  features: AlertFeature[];
}

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-mcp/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

// Helper function for API requests
async function makeRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("API request failed:", error);  // stderr is safe
    return null;
  }
}

// Register tools
server.registerTool(
  "get_weather",
  {
    description: "Get current weather for a location",
    inputSchema: {
      latitude: z.number().min(-90).max(90).describe("Latitude"),
      longitude: z.number().min(-180).max(180).describe("Longitude"),
    },
  },
  async ({ latitude, longitude }) => {
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const data = await makeRequest<any>(pointsUrl);

    if (!data?.properties?.forecast) {
      return {
        content: [{ type: "text", text: "Failed to get forecast" }],
      };
    }

    const forecast = await makeRequest<any>(data.properties.forecast);
    const period = forecast?.properties?.periods?.[0];

    return {
      content: [
        {
          type: "text",
          text: period
            ? `${period.name}: ${period.temperature}°${period.temperatureUnit}, ${period.shortForecast}`
            : "No forecast available",
        },
      ],
    };
  }
);

server.registerTool(
  "get_alerts",
  {
    description: "Get weather alerts for a US state",
    inputSchema: {
      state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
    },
  },
  async ({ state }) => {
    const url = `${NWS_API_BASE}/alerts?area=${state.toUpperCase()}`;
    const data = await makeRequest<AlertsResponse>(url);

    if (!data?.features?.length) {
      return {
        content: [{ type: "text", text: `No active alerts for ${state}` }],
      };
    }

    const alerts = data.features
      .map((f) => `${f.properties.event}: ${f.properties.areaDesc}`)
      .join("\n");

    return {
      content: [{ type: "text", text: `Alerts for ${state}:\n${alerts}` }],
    };
  }
);

// CRITICAL: Use stderr for logging, not stdout
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
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

**weather.py** (Complete Example):

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Initialize server
mcp = FastMCP("weather")

NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-mcp/1.0"


async def make_request(url: str) -> dict[str, Any] | None:
    """Make API request with proper error handling."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/geo+json"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            # Use logging, not print (print goes to stdout!)
            import logging
            logging.error(f"Request failed: {e}")
            return None


@mcp.tool()
async def get_weather(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    data = await make_request(points_url)

    if not data:
        return "Unable to fetch weather data."

    forecast_url = data.get("properties", {}).get("forecast")
    if not forecast_url:
        return "Unable to get forecast URL."

    forecast = await make_request(forecast_url)
    periods = forecast.get("properties", {}).get("periods", []) if forecast else []

    if not periods:
        return "No forecast available."

    p = periods[0]
    return f"{p.get('name')}: {p.get('temperature')}°{p.get('temperatureUnit')}, {p.get('shortForecast')}"


@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state.upper()}"
    data = await make_request(url)

    if not data or "features" not in data:
        return "Unable to fetch alerts."

    if not data["features"]:
        return f"No active alerts for {state}."

    alerts = [
        f"{f['properties'].get('event', 'Unknown')}: {f['properties'].get('areaDesc', 'Unknown area')}"
        for f in data["features"]
    ]
    return f"Alerts for {state}:\n" + "\n".join(alerts)


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

## Tool Permissions

Control MCP tool access in `settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__myserver__read_data",
      "mcp__myserver__list_*"
    ],
    "deny": [
      "mcp__myserver__delete_*"
    ]
  }
}
```

---

## Tool Search (Many MCP Tools)

When MCP tools exceed 10% of context window, use Tool Search:

```bash
# Enable tool search mode
export MCP_TOOL_SEARCH_ENABLED=true
claude
```

Claude will search for relevant tools instead of loading all tool descriptions.

---

## Best Practices

### Performance

- Use Tool Search when many MCP tools (>10% context)
- Set timeouts: `export MCP_TIMEOUT=10000`
- Paginate large responses
- Cache expensive API calls
- Use `reset-project-choices` after config changes

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

## Debugging MCP Servers

### Check Server Logs

```bash
# For Claude Desktop (macOS)
tail -f ~/Library/Logs/Claude/mcp*.log

# For Claude Code, check server stderr
claude mcp get myserver  # Shows config
```

### Test Server Manually

```bash
# Test stdio server directly
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node /path/to/server.js

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node /path/to/server.js
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Server not running | Check command path |
| `ETIMEDOUT` | Server too slow | Increase `MCP_TIMEOUT` |
| `Malformed JSON` | stdout pollution | Use stderr for logs |
| `Tool not found` | Stale cache | Run `claude mcp reset-project-choices` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not connecting | Check `claude mcp list`, verify URL/command |
| Tools not appearing | Run `/mcp` to check status, restart Claude |
| Permission errors | Check environment variables with `env` |
| Timeout errors | Set `MCP_TIMEOUT` higher (milliseconds) |
| Output too large | Set `MAX_MCP_OUTPUT_TOKENS` |
| Config not loading | Run `claude mcp reset-project-choices` |

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
