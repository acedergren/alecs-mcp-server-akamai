# Migration Guide: ALECS v1.x to v2.0

## Overview

ALECS v2.0 introduces a major architectural change, consolidating from 180+ individual tools to 25
business-focused tools. This guide helps you migrate smoothly.

## Quick Decision Tree

```
Do you use specialized tools beyond basic property/DNS management?
├─ No → Use main server (25 tools) ✅
└─ Yes → Do you need all 180+ tools?
    ├─ Yes → Use dev server (alecs-dev) 🔧
    └─ No → Check if your tools are in the 25 consolidated tools
        ├─ Yes → Use main server ✅
        └─ No → Use dev server 🔧
```

## Breaking Changes

### 1. Server Architecture Changes

| v1.x                 | v2.0           | Migration Path           |
| -------------------- | -------------- | ------------------------ |
| `index-essential.ts` | `index.ts`     | Use main server          |
| `index-minimal.ts`   | `index.ts`     | Use main server          |
| `index-full.ts`      | `index-dev.ts` | Use dev server           |
| `index-oauth.ts`     | Removed        | OAuth integrated in main |

### 2. Tool Consolidation

The 180+ tools have been consolidated into 25 business-focused tools:

#### Property Management (3 tools)

- `property-search` - Search and list properties
- `property-operations` - Create, update, activate properties
- `property-analytics` - Performance and usage analytics

#### DNS Management (2 tools)

- `dns-zones` - Zone and record management
- `dns-operations` - Bulk operations and migrations

#### Certificate Management (1 tool)

- `certificate-lifecycle` - Complete cert management

#### Additional Categories

- Security, Performance, Analytics, etc.

### 3. Tool Name Changes

Common tool mappings:

| v1.x Tool           | v2.0 Tool             | Notes                  |
| ------------------- | --------------------- | ---------------------- |
| `list-properties`   | `property-search`     | Enhanced with search   |
| `get-property`      | `property-search`     | Unified interface      |
| `create-property`   | `property-operations` | Consolidated CRUD      |
| `activate-property` | `property-operations` | Same tool              |
| `list-zones`        | `dns-zones`           | Enhanced functionality |
| `create-record`     | `dns-zones`           | Unified DNS tool       |

## Migration Steps

### Step 1: Audit Your Current Usage

```bash
# List all tools you currently use
grep -r "tools/call" your-project/ | grep -o '"name": "[^"]*"' | sort -u

# Check if they exist in v2.0
npm start  # Then check the tool list
```

### Step 2: Update Your Configuration

#### Claude Desktop Configuration

**Before (v1.x):**

```json
{
  "mcpServers": {
    "alecs-full": {
      "command": "node",
      "args": ["dist/index-full.js"]
    }
  }
}
```

**After (v2.0):**

```json
{
  "mcpServers": {
    "alecs": {
      "command": "node",
      "args": ["dist/index.js"]
    },
    "alecs-dev": {
      "command": "node",
      "args": ["dist/index-dev.js"]
    }
  }
}
```

### Step 3: Update Tool Calls

#### Example: Property Management

**v1.x:**

```javascript
// Multiple tool calls
await callTool('list-properties', { groupId: 'grp_123' });
await callTool('get-property', { propertyId: 'prp_456' });
await callTool('get-property-version', { propertyId: 'prp_456', version: 1 });
```

**v2.0:**

```javascript
// Single consolidated tool
await callTool('property-search', {
  groupId: 'grp_123',
  propertyId: 'prp_456',
  includeVersions: true,
});
```

#### Example: DNS Management

**v1.x:**

```javascript
await callTool('list-zones', {});
await callTool('create-record', { zone: 'example.com', ... });
await callTool('update-record', { zone: 'example.com', ... });
```

**v2.0:**

```javascript
await callTool('dns-zones', {
  action: 'list' // or 'create-record', 'update-record'
  zone: 'example.com',
  ...
});
```

### Step 4: Enable New Features

#### Property Cache (Recommended)

```bash
# Install Redis/Valkey
docker run -d -p 6379:6379 redis:alpine

# Run with cache
VALKEY_HOST=localhost npm start
```

#### Customer Override (Optional)

```bash
# Enable if you need runtime section switching
ALECS_ENABLE_CUSTOMER_OVERRIDE=true npm start
```

## Docker Migration

### v1.x Docker Commands

```bash
# Full server
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:full-latest

# Essential server
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:essential-latest

# Minimal server
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:minimal-latest
```

### v2.0 Docker Commands

```bash
# Main server (25 tools) - Recommended
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:latest

# Dev server (180+ tools) - For compatibility
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:dev-latest

# Remote mode
docker run -e ALECS_MODE=remote -p 8082:8082 -p 8083:8083 \
  ghcr.io/acedergren/alecs-mcp-server-akamai:latest
```

## NPM Package Migration

```bash
# Uninstall v1.x
npm uninstall -g alecs-mcp-server-akamai

# Install v2.0
npm install -g alecs-mcp-server-akamai@2.0.0

# Or install both for transition
npm install -g alecs-mcp-server-akamai@latest  # v2.0
npm install -g alecs-mcp-server-akamai-v1@npm:alecs-mcp-server-akamai@1.5.0  # v1.x
```

## Gradual Migration Strategy

### Phase 1: Parallel Testing (Week 1-2)

- Run v1.x and v2.0 side by side
- Test critical workflows with v2.0
- Identify missing tools or issues

### Phase 2: Partial Migration (Week 3-4)

- Migrate non-critical workflows to v2.0
- Use dev server for tools not in main
- Monitor performance improvements

### Phase 3: Full Migration (Week 5-6)

- Switch all workflows to v2.0
- Optimize tool usage for consolidated tools
- Remove v1.x dependencies

## Troubleshooting

### Issue: Tool Not Found

```
Error: Tool not found: list-properties
```

**Solution**: Check tool name mapping above or use dev server

### Issue: Parameter Changes

```
Error: Invalid parameters for tool
```

**Solution**: Consolidated tools may have different parameters. Check tool description.

### Issue: Performance Regression

**Solution**: Enable property cache with Valkey/Redis

### Issue: Missing Functionality

**Solution**: Use dev server which has all 180+ tools

## Rollback Procedure

If you need to rollback to v1.x:

```bash
# NPM
npm install -g alecs-mcp-server-akamai@1.5.0

# Docker
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:1.5.0

# Update configurations back to v1.x structure
```

## Support

- **Issues**: https://github.com/acedergren/alecs-mcp-server-akamai/issues
- **Discussions**: https://github.com/acedergren/alecs-mcp-server-akamai/discussions
- **Migration Help**: Tag issues with `migration-v2`

## Benefits After Migration

1. **Faster Startup**: 80% reduction in startup time
2. **Lower Memory**: 60% less memory usage
3. **Better Discovery**: Tools organized by business function
4. **Enhanced Features**: Property cache, visual UI, better errors
5. **Simplified API**: Fewer tools to remember, more functionality per tool

Ready to migrate? Start with the beta: `npm install -g alecs-mcp-server-akamai@beta` 🚀
