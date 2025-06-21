# ALECS Agents

This directory contains intelligent agents that automate various tasks for the ALECS MCP Server.

## Available Agents

### 1. Cleanup Agent

Maintains a clean project directory by organizing files and removing temporary artifacts.

**Usage:**

```bash
npm run cleanup:dry    # Preview changes
npm run cleanup:interactive  # With confirmation
```

### 2. CDN Provisioning Agent

Automates the creation and configuration of Akamai CDN properties.

### 3. CPS Certificate Agent

Manages SSL certificate provisioning and deployment.

### 4. DNS Migration Agent

Automates DNS zone and record migration between providers.

## All Agent Files

- `cleanup-agent.ts` - Project cleanup and organization
- `cdn-provisioning.agent.ts` - CDN property provisioning automation
- `cps-certificate.agent.ts` - SSL certificate management
- `dns-migration.agent.ts` - DNS zone migration automation

## Documentation

- [Cleanup Agent](../../docs/cleanup-agent.md) - Project cleanup guide
- [AGENTS.md](../../AGENTS.md) - Comprehensive agent documentation

## Testing

```bash
# All agent tests
npm test -- agents

# Specific agent
npm test -- cleanup
```
