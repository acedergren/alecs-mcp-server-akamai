# Streamlined ALECS Architecture

## Overview

The ALECS MCP Server has been streamlined to reduce complexity while maintaining all functionality.

## Key Changes

### Before (Complex)
- 7 different index-* files for transports
- Interactive launcher with menu system  
- Module aliases throughout codebase
- 79 npm scripts
- Multiple entry points

### After (Streamlined)
- 2 main files: `index.ts` and `index-full.ts`
- Environment-driven configuration
- Direct imports (no aliases)
- 24 essential npm scripts
- Single entry point with smart routing

## Architecture

```
src/
├── index.ts              # Single entry point
├── index-full.ts         # Full server implementation
├── config/
│   └── transport-config.ts
├── utils/
│   └── transport-factory.ts
├── servers/              # Modular servers
│   ├── property-server.ts
│   ├── dns-server.ts
│   ├── certs-server.ts
│   ├── reporting-server.ts
│   └── security-server.ts
└── tools/               # Tool implementations
```

## Usage

### 1. Default (Claude Desktop)
```bash
npm start
```

### 2. Different Transports
```bash
MCP_TRANSPORT=http npm start
MCP_TRANSPORT=websocket npm start  
MCP_TRANSPORT=sse npm start
```

### 3. Individual Modules
```bash
npm start:property
npm start:dns
npm start:certs
npm start:reporting
npm start:security
```

## Benefits

1. **Simpler**: Reduced from 7 entry points to 1
2. **Cleaner**: No module aliases, direct imports
3. **Flexible**: Environment-driven configuration
4. **Maintainable**: Less code duplication
5. **Efficient**: 69% reduction in npm scripts

## Migration Guide

### Old Way
```bash
node dist/index-websocket.js
node dist/interactive-launcher.js
```

### New Way
```bash
MCP_TRANSPORT=websocket npm start
npm start  # Uses stdio by default
```

## Configuration

All configuration via environment variables:

```bash
# Transport
MCP_TRANSPORT=stdio|http|websocket|sse

# HTTP Options
HTTP_PORT=3000
HTTP_HOST=0.0.0.0
CORS_ENABLED=true

# WebSocket Options  
WS_PORT=8080
WS_HOST=0.0.0.0

# SSE Options
SSE_PORT=3001
SSE_HOST=0.0.0.0

# Authentication
AUTH_TYPE=none|oauth|token
TOKEN_MASTER_KEY=your-secret-key
```

## Next Steps

1. Add inline documentation to core files
2. Create user journey tests
3. Build performance testing framework
4. Bundle size optimization