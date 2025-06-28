# Glob Dependency Analysis

## Executive Summary

The `glob` package can be **REMOVED** or marked as **OPTIONAL**. It's only used in two utility scripts that appear to be one-time migration tools, not part of the main application runtime.

## Current Usage Analysis

### 1. **Where Glob is Used**
- `scripts/remove-emojis.js` - One-time script for Snow Leopard v1.6.0 emoji removal
- `scripts/remove-module-aliases.js` - One-time script to remove module aliases

### 2. **Where Glob is NOT Used**
- ❌ Not used in any production source code (`src/`)
- ❌ Not used in any test files
- ❌ Not used in build processes
- ❌ Not imported by any TypeScript files

### 3. **Script Analysis**

#### remove-emojis.js
```javascript
const files = glob.sync('src/**/*.ts', { 
  ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'] 
});
```
- Purpose: Remove emojis from TypeScript files
- Status: Likely already completed for v1.6.0
- Frequency: One-time migration

#### remove-module-aliases.js
```javascript
const files = glob.sync('src/**/*.ts', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});
```
- Purpose: Replace module aliases with relative imports
- Status: Likely already completed
- Frequency: One-time migration

## Native Node.js Alternatives

### Option 1: Node.js 20.1+ Native Glob (Not Available)
```javascript
// Requires Node.js 20.1+
import { glob } from 'node:fs/promises';
const files = await glob('src/**/*.ts');
```
- ❌ Project supports Node.js >=18.0.0
- ❌ Native glob requires >=20.1.0

### Option 2: Recursive fs Operations (Node.js 18+)
```javascript
import { readdir } from 'fs/promises';
import { join } from 'path';

async function findFiles(dir, pattern) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findFiles(fullPath, pattern));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}
```

### Option 3: Simple Script Rewrite
```javascript
// For the specific use case in scripts
const { execSync } = require('child_process');
const files = execSync('find src -name "*.ts" -not -path "*/node_modules/*"')
  .toString()
  .trim()
  .split('\n');
```

## Recommendations

### 1. **Immediate Action: Move to Optional Dependencies**
```json
{
  "optionalDependencies": {
    "glob": "^11.0.3"
  }
}
```
- Scripts will work if glob is available
- Production builds won't require it

### 2. **Short Term: Rewrite Scripts Without Glob**
```javascript
// Example rewrite for remove-emojis.js
const { readdirSync, statSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

function findTsFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory() && !entry.includes('node_modules')) {
      findTsFiles(fullPath, files);
    } else if (entry.endsWith('.ts') && !entry.includes('.test.') && !entry.includes('.spec.')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findTsFiles('src');
```

### 3. **Long Term: Archive or Remove Scripts**
- These appear to be completed migrations
- Consider moving to a `scripts/migrations/completed/` directory
- Or remove entirely if no longer needed

## Impact Analysis

### If Removed:
- ✅ One less dependency to maintain
- ✅ Smaller node_modules (glob + dependencies ~2MB)
- ✅ No impact on production code
- ⚠️  Migration scripts would need updates if used again

### If Kept:
- ✅ Migration scripts continue to work
- ❌ Unnecessary dependency for production
- ❌ Security updates needed for unused code

## Decision Matrix

| Factor | Remove | Keep | Move to Optional |
|--------|--------|------|------------------|
| Production Impact | ✅ None | ✅ None | ✅ None |
| Script Functionality | ❌ Breaks | ✅ Works | ✅ Works if installed |
| Maintenance Burden | ✅ None | ❌ Yes | ✅ Minimal |
| Security Surface | ✅ Reduced | ❌ Increased | ✅ Reduced |

## Final Recommendation

**Move glob to optionalDependencies** with a plan to:
1. Archive the migration scripts
2. Remove glob entirely in next major version
3. Document that these scripts are historical artifacts

## Alternative for Future Scripts

For any future scripts needing file globbing:
1. Use Node.js 20.1+ native glob when minimum version is updated
2. Use simple recursive fs operations for basic needs
3. Use find command via child_process for complex patterns
4. Consider if the script is really needed in the repository

## Commands to Execute

```bash
# Option 1: Remove completely (if scripts are no longer needed)
npm uninstall glob

# Option 2: Move to optional (recommended)
npm uninstall glob
npm install --save-optional glob

# Option 3: Keep but document
echo "# Migration Scripts (Historical)" > scripts/MIGRATION_SCRIPTS.md
echo "These scripts were used for one-time migrations and are kept for reference only." >> scripts/MIGRATION_SCRIPTS.md
```