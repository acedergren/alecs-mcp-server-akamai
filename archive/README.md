# Archived Build Variants

This directory contains archived build variants that were removed during the v2.0 consolidation.

## What's Archived

### Transport Variants (`src/transport-variants/`)

- `index-websocket.ts` - WebSocket-only server
- `index-sse.ts` - Server-Sent Events only server
- `index-remote.ts` - Combined remote access server
- `index-http.ts` - HTTP transport server
- `index-minimal.ts` - Minimal server variant
- `index-essential.ts` - Essential tools variant
- `index-oauth.ts` - OAuth-specific variant

### Modular Servers (`src/servers/`)

Individual server modules for specific functionality:

- `property-server.ts` - Property management tools
- `dns-server.ts` - DNS management tools
- `certs-server.ts` - Certificate management
- `security-server.ts` - Security tools (95 tools)
- `reporting-server.ts` - Analytics and reporting
- `performance-server.ts` - Performance optimization
- `network-lists-server.ts` - Network list management
- `appsec-server.ts` - Application security
- `fastpurge-server.ts` - Cache purging

## Current Active Builds

The v2.0 architecture maintains only two builds:

1. **Main v2.0 Server** (`src/index.ts`)

   - 25 consolidated business-focused tools
   - Default for production use
   - Run with: `npm start`

2. **Development/Full Server** (`src/index-dev.ts`)
   - 180+ individual tools from v1.x
   - For development and backwards compatibility
   - Run with: `npm run start:dev`

## Restoring Archived Files

If you need to restore any archived files, they can be found in this directory structure. Simply
copy them back to their original locations in the `src/` directory.

---

Archived on: $(date)
