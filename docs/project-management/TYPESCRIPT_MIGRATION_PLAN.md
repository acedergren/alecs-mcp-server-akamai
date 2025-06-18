# TypeScript Strict Mode Migration Plan

## Current Status (January 2025)

The TypeScript refactor is ~90-95% complete. To enable immediate development and builds, we've temporarily relaxed TypeScript's strict mode settings. This document outlines the plan to progressively re-enable strict type checking.

## Configuration Setup

### Development Configuration (`tsconfig.json`)
- **Purpose**: Permissive settings for immediate development
- **Strict Mode**: Disabled
- **Use**: Default for `npm run build` and `npm run dev`

### Production Configuration (`tsconfig.build.json`)
- **Purpose**: Strict type checking for production builds
- **Strict Mode**: Fully enabled
- **Use**: `npm run build:strict` and `npm run typecheck`

## Scripts

- `npm run build` - Development build (permissive)
- `npm run build:strict` - Production build (strict)
- `npm run typecheck` - Validate with strict types
- `npm run typecheck:dev` - Check with permissive types
- `npm run typecheck:watch` - Watch mode with permissive types

## Issues to Fix (356 TypeScript errors in strict mode)

### Priority 1: Critical Type Safety Issues
1. **Unknown type in catch blocks** (~50 errors)
   - Files: All agent files, various tools
   - Fix: Add proper error type guards

2. **Optional property handling** (~40 errors)
   - Files: Progress tracking, API responses
   - Fix: Handle undefined explicitly

3. **Index signature access** (~30 errors)
   - Files: Configuration readers, dynamic property access
   - Fix: Use bracket notation or type assertions

### Priority 2: Code Quality Issues
1. **Unused variables and parameters** (~100 errors)
   - Files: Throughout codebase
   - Fix: Remove or prefix with underscore

2. **Implicit any types** (~80 errors)
   - Files: Agent files, legacy tools
   - Fix: Add explicit types

3. **Null/undefined checks** (~56 errors)
   - Files: API response handlers
   - Fix: Add null checks and type guards

## Migration Timeline

### Phase 1: Immediate (Done)
- ✅ Relaxed TypeScript settings for development
- ✅ Created strict configuration for validation
- ✅ Updated build scripts

### Phase 2: Week 1-2
- Fix critical type safety issues in core modules
- Add type guards for error handling
- Update agent files to handle unknown types

### Phase 3: Week 3-4
- Fix optional property types
- Add null/undefined checks
- Remove unused variables

### Phase 4: Week 5-6
- Fix remaining type issues
- Re-enable strict mode by default
- Update CI/CD to use strict builds

## Files Requiring Attention

### High Priority (Core functionality)
- `src/agents/cdn-provisioning.agent.ts` - 40+ errors
- `src/agents/cps-certificate.agent.ts` - 30+ errors
- `src/agents/dns-migration.agent.ts` - 25+ errors
- `src/index.ts` - Main server file
- `src/services/BaseAkamaiClient.ts` - Base client

### Medium Priority (Tools)
- `src/tools/property-*.ts` - Property management tools
- `src/tools/dns-*.ts` - DNS tools
- `src/tools/certificate-*.ts` - Certificate tools

### Low Priority (Utilities)
- `src/utils/*.ts` - Utility functions
- `src/tools/analysis/*.js` - Convert remaining JS files

## How to Contribute

1. Pick a file from the priority list
2. Run `npm run typecheck:strict 2>&1 | grep "filename"` to see errors
3. Fix type issues incrementally
4. Test with `npm run typecheck:dev` first
5. Validate with `npm run typecheck:strict`
6. Submit PR with fixes

## Success Criteria

- All TypeScript errors resolved in strict mode
- No use of `any` type without explicit justification
- All catch blocks properly typed
- No unused variables or parameters
- Full type coverage for public APIs

## Commands for Validation

```bash
# Check current error count
npm run typecheck 2>&1 | grep -c "error TS"

# Check specific file
npm run typecheck 2>&1 | grep "filename.ts"

# Build with permissive settings
npm run build

# Attempt strict build
npm run build:strict
```

## Notes

- The permissive settings are TEMPORARY
- New code should aim to be strict-mode compatible
- Regular progress checks every week
- Goal: Full strict mode by end of Q1 2025