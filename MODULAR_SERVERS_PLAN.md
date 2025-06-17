# ALECS Modular Servers Implementation Plan

## Overview
If the Essential Server test proves that 180 tools is too many for Claude Desktop, we'll split the server into focused modules.

## Planned Modules

### 1. alecs-property (Property Manager & Certificates)
**Tools Count**: ~40
- Property management (create, list, get, update, delete)
- Version management 
- Activation tools
- Rule management
- Certificate enrollment and management
- Hostname management

### 2. alecs-dns (DNS Management) 
**Tools Count**: ~20
- Zone management (create, list, get, update, delete)
- Record management (all record types)
- Bulk operations
- Zone validation

### 3. alecs-reporting (Analytics & Reporting)
**Tools Count**: ~25
- Traffic reports
- Performance analytics
- Error reports
- Cache statistics
- Billing reports
- Log delivery

### 4. alecs-security (Security & Protection)
**Tools Count**: ~95
- WAF configuration
- DDoS protection
- Bot management
- Rate limiting
- Network lists
- Security policies
- Threat intelligence

## Implementation Strategy

### File Structure
```
src/
├── servers/
│   ├── property-server.ts
│   ├── dns-server.ts
│   ├── reporting-server.ts
│   └── security-server.ts
├── shared/
│   ├── akamai-client.ts
│   └── auth.ts
└── tools/
    └── [existing tool modules]
```

### Configuration
Each module will have its own entry in Claude Desktop config:
```json
{
  "mcpServers": {
    "alecs-property": { ... },
    "alecs-dns": { ... },
    "alecs-reporting": { ... },
    "alecs-security": { ... }
  }
}
```

### Benefits
1. **Performance**: Smaller memory footprint per server
2. **Stability**: Isolated failures don't affect other modules
3. **Flexibility**: Users can enable only what they need
4. **Maintenance**: Easier to debug and update individual modules

### Next Steps
1. Test Essential Server with Claude Desktop
2. If successful but full server fails, implement modular approach
3. Create individual server files
4. Update setup script to support module selection
5. Document module-specific usage