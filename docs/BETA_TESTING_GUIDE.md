# ALECS v2.0 Beta Testing Guide

## Overview

ALECS v2.0 is a major architectural overhaul with significant breaking changes. This guide will help
you test the beta release and provide feedback.

## Breaking Changes Summary

### 1. Tool Consolidation

- **Before**: 180+ individual tools
- **After**: 25 consolidated, business-focused tools
- **Migration**: Use the dev server (`alecs-dev`) if you need access to all 180+ tools

### 2. Server Architecture

- **Removed**: `index-essential.ts`, `index-minimal.ts`, `index-full.ts`, `index-oauth.ts`
- **New**: Single `index.ts` (25 tools) + `index-dev.ts` (all tools)
- **Impact**: Update your configurations to use the new entry points

### 3. Default Tool Set

- **Main Server**: 25 business-focused tools only
- **Dev Server**: All 180+ tools for development/migration
- **Selection**: Choose based on your needs

## Installation Options

### NPM Beta Installation

```bash
# Install the beta globally
npm install -g alecs-mcp-server-akamai@beta

# Or install a specific beta version
npm install -g alecs-mcp-server-akamai@2.0.0-beta.1

# Verify installation
alecs --version
```

### Docker Beta Installation

```bash
# Pull the beta image
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:beta

# Or specific beta version
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:2.0.0-beta.1

# Run in local mode (25 tools)
docker run -it ghcr.io/acedergren/alecs-mcp-server-akamai:beta

# Run in remote mode
docker run -it -e ALECS_MODE=remote -p 8082:8082 -p 8083:8083 \
  ghcr.io/acedergren/alecs-mcp-server-akamai:beta

# Run dev server (all 180+ tools)
docker run -it ghcr.io/acedergren/alecs-mcp-server-akamai:dev-beta
```

## Testing Scenarios

### 1. Basic Functionality Test

```bash
# Test main server startup
npm start

# Expected: Should show 25 tools with visual banner
# Look for: Tool categories, configuration info
```

### 2. Tool Consolidation Test

Compare tool availability:

```bash
# Main server (25 tools)
npm start

# Dev server (180+ tools)
npm run start:dev
```

### 3. Property Cache Test

Enable Valkey/Redis for testing cache functionality:

```bash
# Start Redis/Valkey
docker run -d -p 6379:6379 redis:alpine

# Run with cache enabled
VALKEY_HOST=localhost npm start

# Test property operations
# Should see "Property cache preloader initialized" in logs
```

### 4. Customer Override Test

Test the new configurable customer section override:

```bash
# Default (override disabled)
npm start

# With override enabled
ALECS_ENABLE_CUSTOMER_OVERRIDE=true npm start

# Should see "Customer Override Enabled" in startup banner
```

### 5. Remote Mode Test

```bash
# Start in remote mode
npm run start:remote

# Or with Docker
docker run -e ALECS_MODE=remote -p 8082:8082 -p 8083:8083 \
  ghcr.io/acedergren/alecs-mcp-server-akamai:beta

# Test WebSocket connection
wscat -c ws://localhost:8082/mcp/websocket

# Test SSE connection
curl http://localhost:8083/mcp/sse
```

### 6. Migration Test

If you have existing v1.x workflows:

1. **Identify Tool Usage**: List all tools your workflows use
2. **Check Availability**: Verify if tools exist in the 25 consolidated tools
3. **Update Tool Names**: Some tools may have new names
4. **Use Dev Server**: If tools are missing, use `alecs-dev` server

## Performance Testing

### Memory Usage

```bash
# Check memory usage - main server (25 tools)
/usr/bin/time -v npm start

# Compare with dev server (180+ tools)
/usr/bin/time -v npm run start:dev
```

### Startup Time

```bash
# Time the startup
time npm start
```

### Property Lookup Performance

Test with and without cache to see the improvement:

```bash
# Without cache
npm start

# With cache
VALKEY_HOST=localhost npm start
```

## Feedback Collection

### What to Report

1. **Functionality Issues**

   - Tools not working as expected
   - Missing functionality from v1.x
   - Error messages or crashes

2. **Performance Metrics**

   - Startup time comparison
   - Memory usage
   - Response time for operations

3. **Migration Challenges**

   - Tools that need to be in main server
   - Naming inconsistencies
   - Documentation gaps

4. **Feature Feedback**
   - Property cache effectiveness
   - Customer override usefulness
   - Tool discovery improvements

### How to Report

Create issues with the `beta-testing` label:

```markdown
**Version**: 2.0.0-beta.1 **Server Type**: main/dev **Issue Type**:
bug/performance/migration/feature

**Description**: [Describe the issue or feedback]

**Steps to Reproduce**:

1. [First step]
2. [Second step]

**Expected**: [What should happen] **Actual**: [What actually happened]

**Environment**:

- OS: [e.g., macOS 14.0]
- Node: [e.g., 20.11.0]
- Installation: npm/docker
```

## Rollback Plan

If you encounter critical issues:

```bash
# Rollback to v1.5.0 (stable)
npm install -g alecs-mcp-server-akamai@1.5.0

# Or with Docker
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:1.5.0
```

## Beta Timeline

- **Beta 1**: Initial release for testing
- **Beta 2**: Based on feedback (1 week later)
- **RC 1**: Release candidate (2 weeks)
- **Stable**: Final v2.0.0 release (3-4 weeks)

## Questions?

- GitHub Issues: https://github.com/acedergren/alecs-mcp-server-akamai/issues
- Discussions: https://github.com/acedergren/alecs-mcp-server-akamai/discussions

Thank you for helping test ALECS v2.0! 🚀
