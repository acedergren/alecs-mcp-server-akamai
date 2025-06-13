# Akamai MCP Server - Quick Start Guide

## Immediate Actions (Start Tonight!)

### 1. Set Up Akamai Access (15 mins)
```bash
# Create .env file for credentials
AKAMAI_HOST=akaa-xxxx.luna.akamaiapis.net
AKAMAI_CLIENT_TOKEN=akab-xxxx
AKAMAI_CLIENT_SECRET=xxxx
AKAMAI_ACCESS_TOKEN=akab-xxxx
```

### 2. Create Project Structure (5 mins)
```bash
mkdir alecs-mcp-server-akamai && cd alecs-mcp-server-akamai
npm init -y
npm install typescript @types/node tsx dotenv
npm install @modelcontextprotocol/sdk
npm install axios crypto
```

### 3. MVP Development Plan

**Week 1-2: Research & Setup**
- Run the 3 research agents in parallel using Claude Code
- Set up basic TypeScript project
- Implement EdgeGrid authentication

**Week 3-5: Stage 1 (Property Manager MVP)**
- Focus ONLY on listing and reading properties first
- Add create/update once reading works
- Skip CPS initially if time-constrained

**Week 6: Fast Purge**
- Just URL purging to start
- Add CP code purging if time permits

**Week 7-8: Polish & Deploy**
- Dockerize
- Write quick docs
- Share with community

## Simplified Tech Stack

```typescript
// Keep it simple!
- TypeScript + Node.js
- MCP SDK
- No database (use in-memory for MVP)
- No Redis (add later if needed)
- Simple console logging
- Jest for basic tests
```

## First Code to Write Tonight

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { EdgeGridAuth } from './auth/edgegrid.js';
import { PropertyManagerService } from './services/property-manager.js';

const server = new Server({
  name: "alecs-mcp-server-akamai",
  version: "0.1.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Start with just one tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "property_list",
    description: "List Akamai properties",
    inputSchema: {
      type: "object",
      properties: {},
    },
  }],
}));

// Run it!
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Run Agents Now!

Copy these prompts to Claude Code and run them simultaneously:

**Agent 1**: Copy the "API Research & Documentation" prompt
**Agent 2**: Copy the "FastPurge & Security APIs" prompt  
**Agent 3**: Copy the "Reporting & Additional APIs" prompt

## Additional APIs for Day 0 (Add to MVP)

1. **Edge DNS** - Critical if customers manage DNS
2. **Network Lists** - For geo-blocking (very common)
3. **Diagnostic Tools** - For debugging (can wait)

## Skip for Now
- SIEM (complex, add in v2)
- DataStream (nice to have)
- Identity Management (use Control Center)
- Monitoring/KPIs (you're solo!)

## Success Criteria
✓ Can list CDN properties
✓ Can create a basic property
✓ Can purge a URL
✓ Works with Claude Desktop
✓ Takes < 1 hour to set up

## Get Help
- Akamai Developer Discord
- techdocs.akamai.com
- Claude Code for implementation

Start with the API research agents RIGHT NOW while this is fresh!