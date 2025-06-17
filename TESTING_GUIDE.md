# ALECS MCP Server Testing Guide

## Problem
The full ALECS server with 180 tools is causing Claude Desktop to disconnect immediately.

## Testing Approach

### 1. Essential Server Test (15 tools)
First, test with a minimal set of 15 essential tools to see if the issue is related to the number of tools.

```bash
# Test locally first
./run-essential.sh

# Then update Claude Desktop config
cp claude_desktop_config_essential.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Restart Claude Desktop
```

### 2. If Essential Server Works
If the essential server connects successfully, we'll proceed with the modular approach:

- **alecs-property**: Property Manager and Certificates (~40 tools)
- **alecs-dns**: DNS management (~20 tools)
- **alecs-reporting**: Reporting and Analytics (~25 tools)
- **alecs-security**: Security tools (~95 tools)

### 3. Debug Output
The essential server includes verbose logging with timestamps:
- Server initialization
- Tool requests
- Error details
- Heartbeat every 30 seconds

Check console output with:
```bash
tail -f ~/Library/Logs/Claude/mcp-server-alecs-essential.log
```

## Tool Count Comparison
- **Full Server**: 180 tools
- **Essential Server**: 15 tools
- **Basic Test**: 1 tool

## Essential Tools Included
1. **Property Manager** (5): list-properties, get-property, create-property, activate-property, list-groups
2. **DNS** (5): list-zones, get-zone, create-zone, list-records, upsert-record
3. **Certificates** (2): create-dv-enrollment, check-dv-enrollment-status
4. **Fast Purge** (1): purge-by-url
5. **Reporting** (2): get-traffic-report, get-activation-status