# High Priority Tasks - Detailed Implementation Plan

## Task 1: Remove All Emojis from Production Code
**Status**: 123 files contain emojis
**Estimated Time**: 2-3 hours
**Impact**: Professional codebase, reduced file sizes, better compatibility

### Emoji Distribution Analysis
Based on analysis, the most affected files are:
- `property-manager-tools.ts` (39 occurrences)
- `property-manager-advanced-tools.ts` (36 occurrences)
- Tool files generally have the most emojis
- Common emojis: 🎉 ✅ ❌ ⚡ 🔧 🚀 📊 🎯 ⚠️ 💡

### Implementation Strategy

#### Step 1: Create Emoji Removal Script (30 minutes)
```javascript
// scripts/remove-emojis.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const EMOJI_PATTERNS = {
  '🎉': '[SUCCESS]',
  '✅': '[DONE]',
  '❌': '[ERROR]',
  '⚡': '[FAST]',
  '🔧': '[CONFIG]',
  '🚀': '[DEPLOY]',
  '📊': '[METRICS]',
  '🎯': '[TARGET]',
  '⚠️': '[WARNING]',
  '💡': '[INFO]',
  '🔍': '[SEARCH]',
  '📝': '[DOCS]',
  '🎨': '[STYLE]',
  '🐛': '[BUG]',
  '✨': '[FEATURE]',
  '🔥': '[HOT]',
  '💾': '[SAVE]',
  '📦': '[PACKAGE]',
  '🔒': '[SECURE]',
  '🌐': '[GLOBAL]'
};

function removeEmojisFromFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Create backup
  const backupPath = filePath + '.backup';
  fs.writeFileSync(backupPath, content);
  
  // Replace all emojis
  for (const [emoji, replacement] of Object.entries(EMOJI_PATTERNS)) {
    if (content.includes(emoji)) {
      content = content.replace(new RegExp(emoji, 'g'), replacement);
      modified = true;
    }
  }
  
  // Also remove any remaining unicode emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiRegex.test(content)) {
    content = content.replace(emojiRegex, '');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  // Remove backup if no changes
  fs.unlinkSync(backupPath);
  return false;
}

// Process all TypeScript files
const files = glob.sync('src/**/*.ts');
let modifiedCount = 0;

files.forEach(file => {
  if (removeEmojisFromFile(file)) {
    console.log(`Modified: ${file}`);
    modifiedCount++;
  }
});

console.log(`\nTotal files modified: ${modifiedCount}`);
console.log('Backups created with .backup extension');
```

#### Step 2: Execute Removal (1 hour)
```bash
# Run the removal script
node scripts/remove-emojis.js

# Verify no emojis remain
grep -r "[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]" src --include="*.ts" | wc -l

# Run tests to ensure nothing broke
npm test

# If all good, remove backups
find src -name "*.backup" -delete
```

#### Step 3: Update Logging and Messages (30 minutes)
- Review files with most changes
- Ensure replacement text makes sense in context
- Update any documentation that references emojis

### Validation Checklist
- [ ] All emojis removed from .ts files
- [ ] Replacement text is appropriate
- [ ] All tests pass
- [ ] No functionality broken
- [ ] Backups removed after verification

---

## Task 2: Consolidate Entry Points (8 → 2)
**Status**: 8 entry points exist
**Target**: 2 entry points (index.ts for minimal, index-full.ts for all features)
**Estimated Time**: 3-4 hours

### Current Entry Points Analysis
```
1. index.ts          - Main entry with aliases
2. index-full.ts     - Full feature set
3. index-minimal.ts  - Minimal version
4. index-http.ts     - HTTP transport
5. index-oauth.ts    - OAuth support
6. index-remote.ts   - Remote access
7. index-sse.ts      - Server-sent events
8. index-websocket.ts - WebSocket transport
```

### Consolidation Strategy

#### Step 1: Create Transport Configuration System (1 hour)
```typescript
// src/config/transport-config.ts
export interface TransportConfig {
  type: 'stdio' | 'http' | 'websocket' | 'sse';
  options?: {
    port?: number;
    host?: string;
    cors?: boolean;
    auth?: 'none' | 'oauth' | 'token';
  };
}

export function getTransportFromEnv(): TransportConfig {
  const transportType = process.env.MCP_TRANSPORT || 'stdio';
  
  switch (transportType) {
    case 'http':
      return {
        type: 'http',
        options: {
          port: parseInt(process.env.PORT || '3000'),
          cors: process.env.CORS_ENABLED === 'true',
          auth: process.env.AUTH_TYPE as any || 'none'
        }
      };
    case 'websocket':
      return {
        type: 'websocket',
        options: {
          port: parseInt(process.env.WS_PORT || '8080')
        }
      };
    case 'sse':
      return {
        type: 'sse',
        options: {
          port: parseInt(process.env.SSE_PORT || '3001')
        }
      };
    default:
      return { type: 'stdio' };
  }
}
```

#### Step 2: Refactor index.ts (Minimal Version) (1 hour)
```typescript
// src/index.ts - Minimal MCP server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createTransport } from './transport/factory';
import { setupMinimalTools } from './tools/minimal-set';
import { logger } from './utils/logger';

async function main() {
  try {
    // Create server with minimal tools
    const server = new Server({
      name: 'alecs-akamai-mcp',
      version: '1.0.0'
    });
    
    // Setup only essential tools
    await setupMinimalTools(server);
    
    // Create transport based on environment
    const transport = await createTransport();
    
    // Connect and start
    await server.connect(transport);
    logger.info('Minimal MCP server started');
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  process.exit(0);
});

main();
```

#### Step 3: Refactor index-full.ts (Full Version) (1 hour)
```typescript
// src/index-full.ts - Full-featured MCP server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createTransport } from './transport/factory';
import { setupAllTools } from './tools/all-tools-registry';
import { initializeCache } from './services/cache-factory';
import { setupSecurity } from './middleware/security';
import { logger } from './utils/logger';

async function main() {
  try {
    // Initialize cache
    await initializeCache();
    
    // Create server with all features
    const server = new Server({
      name: 'alecs-akamai-mcp-full',
      version: '1.0.0'
    });
    
    // Setup security middleware
    setupSecurity(server);
    
    // Register all tools
    await setupAllTools(server);
    
    // Create transport with full options
    const transport = await createTransport({
      enableAuth: true,
      enableMetrics: true
    });
    
    // Connect and start
    await server.connect(transport);
    logger.info('Full MCP server started with all features');
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
```

#### Step 4: Create Transport Factory (30 minutes)
```typescript
// src/transport/factory.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getTransportFromEnv } from '../config/transport-config';

export async function createTransport(options = {}) {
  const config = getTransportFromEnv();
  
  switch (config.type) {
    case 'http':
      const { HttpServerTransport } = await import('./http-transport');
      return new HttpServerTransport(config.options);
      
    case 'websocket':
      const { WebSocketTransport } = await import('./websocket-transport');
      return new WebSocketTransport(config.options);
      
    case 'sse':
      const { SSETransport } = await import('./sse-transport');
      return new SSETransport(config.options);
      
    case 'stdio':
    default:
      return new StdioServerTransport();
  }
}
```

#### Step 5: Update package.json Scripts (30 minutes)
```json
{
  "main": "dist/index.js",
  "bin": {
    "alecs-mcp": "./dist/index.js",
    "alecs-mcp-full": "./dist/index-full.js"
  },
  "scripts": {
    "start": "node dist/index.js",
    "start:full": "node dist/index-full.js"
  }
}
```

### Migration Path
1. Remove old entry point files
2. Update imports in tests
3. Update documentation
4. Test all transport modes with env vars

### Validation Checklist
- [ ] Only 2 entry points remain
- [ ] All transports work via env config
- [ ] No functionality lost
- [ ] Tests updated and passing
- [ ] Documentation updated

---

## Task 3: Reduce NPM Scripts (79 → ~20)
**Status**: 79 scripts across all categories
**Target**: ~20 essential scripts
**Estimated Time**: 2 hours

### Current Script Analysis
- **Build**: 7 scripts (can be reduced to 3)
- **Test**: 27 scripts (can be reduced to 5)
- **Dev**: 5 scripts (keep 3)
- **Deploy**: 2 scripts (keep 2)
- **Utils**: 38 scripts (reduce to 7)

### Target Script Structure

#### Essential Scripts Only (~20 total)
```json
{
  "scripts": {
    // === Build (3) ===
    "build": "tsc --project tsconfig.json",
    "build:watch": "tsc --watch --project tsconfig.json",
    "clean": "rm -rf dist .tsbuildinfo",
    
    // === Development (3) ===
    "dev": "tsx watch src/index.ts",
    "dev:full": "tsx watch src/index-full.ts",
    "dev:debug": "DEBUG=* tsx watch src/index.ts",
    
    // === Testing (5) ===
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest __tests__/e2e --runInBand",
    "test:types": "tsc --noEmit",
    
    // === Quality (3) ===
    "lint": "eslint src --fix",
    "format": "prettier --write 'src/**/*.{ts,json,md}'",
    "check": "npm run lint && npm run test:types && npm run test",
    
    // === Deployment (2) ===
    "start": "node dist/index.js",
    "start:full": "node dist/index-full.js",
    
    // === Utilities (4) ===
    "prepare": "npm run build",
    "security:check": "npm audit --production",
    "deps:check": "npx npm-check-updates",
    "docs:build": "typedoc src/index.ts"
  }
}
```

### Implementation Steps

#### Step 1: Create Script Migration Script (30 minutes)
```javascript
// scripts/migrate-npm-scripts.js
const fs = require('fs');
const package = require('../package.json');

// Define essential scripts
const essentialScripts = {
  // Build
  "build": "tsc --project tsconfig.json",
  "build:watch": "tsc --watch --project tsconfig.json",
  "clean": "rm -rf dist .tsbuildinfo",
  
  // Development
  "dev": "tsx watch src/index.ts",
  "dev:full": "tsx watch src/index-full.ts",
  "dev:debug": "DEBUG=* tsx watch src/index.ts",
  
  // Testing
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:e2e": "jest __tests__/e2e --runInBand",
  "test:types": "tsc --noEmit",
  
  // Quality
  "lint": "eslint src --fix",
  "format": "prettier --write 'src/**/*.{ts,json,md}'",
  "check": "npm run lint && npm run test:types && npm run test",
  
  // Deployment
  "start": "node dist/index.js",
  "start:full": "node dist/index-full.js",
  
  // Utilities
  "prepare": "npm run build",
  "security:check": "npm audit --production",
  "deps:check": "npx npm-check-updates",
  "docs:build": "typedoc src/index.ts"
};

// Backup current package.json
fs.writeFileSync('package.json.backup', JSON.stringify(package, null, 2));

// Update scripts
package.scripts = essentialScripts;

// Write new package.json
fs.writeFileSync('package.json', JSON.stringify(package, null, 2));

console.log('Scripts migrated successfully!');
console.log(`Reduced from ${Object.keys(require('../package.json.backup').scripts).length} to ${Object.keys(essentialScripts).length} scripts`);
```

#### Step 2: Create Composite Scripts (30 minutes)
For complex workflows, create composite scripts:

```json
{
  "scripts": {
    // Composite commands for common workflows
    "check": "npm run lint && npm run test:types && npm run test",
    "check:all": "npm run check && npm run test:e2e",
    "release": "npm run check:all && npm run build && npm run docs:build",
    "dev:test": "concurrently 'npm run dev' 'npm run test:watch'"
  }
}
```

#### Step 3: Document Removed Scripts (30 minutes)
Create a migration guide for users:

```markdown
# Script Migration Guide

## Removed Scripts and Their Replacements

### Build Scripts
- `build:dev` → Use `build` (same behavior)
- `build:strict` → Use `test:types` for type checking
- `build:check` → Use `test:types`

### Test Scripts  
- `test:property` → Use `test -- property-server.test.ts`
- `test:dns` → Use `test -- dns-server.test.ts`
- Individual test scripts → Use jest with file patterns

### Start Scripts
- `start:property` → Set `ENABLED_TOOLS=property` and use `start:full`
- `start:websocket` → Set `MCP_TRANSPORT=websocket` and use `start`

### Development
- Server-specific dev scripts → Use env variables with `dev:full`
```

#### Step 4: Update CI/CD (30 minutes)
Update any CI/CD pipelines that reference old scripts:

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - run: npm run check  # Replaces multiple script calls
      - run: npm run test:coverage
      - run: npm run test:e2e
```

### Validation Checklist
- [ ] Only ~20 scripts remain
- [ ] All essential workflows covered
- [ ] CI/CD updated
- [ ] Migration guide created
- [ ] No duplicate scripts

---

## Execution Timeline

### Day 1 Morning (4 hours)
1. **Remove Emojis** (2 hours)
   - Create and run removal script
   - Verify and test
   - Clean up backups

2. **Start Entry Point Consolidation** (2 hours)
   - Create transport configuration
   - Begin refactoring index.ts

### Day 1 Afternoon (4 hours)
1. **Complete Entry Points** (2 hours)
   - Finish index-full.ts
   - Create transport factory
   - Remove old entry files

2. **NPM Scripts Reduction** (2 hours)
   - Run migration script
   - Update documentation
   - Test all workflows

### Validation & Testing (1 hour)
- Run full test suite
- Verify all functionality
- Update any broken imports
- Commit changes

## Success Metrics
- ✅ 0 emojis in TypeScript files
- ✅ 2 entry points (down from 8)
- ✅ ~20 npm scripts (down from 79)
- ✅ All tests passing
- ✅ No functionality lost

## Risk Mitigation
1. **Create backups** before each major change
2. **Test incrementally** after each step
3. **Use feature branches** for each task
4. **Document all changes** for team awareness
5. **Have rollback plan** ready

## Next Steps After Completion
1. Create demo version (index-demo.ts)
2. Create ARCHITECTURE.md
3. Add inline documentation
4. Build test infrastructure