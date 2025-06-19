# ALECS MCP Server - Codebase Reorganization Plan

## Executive Summary
This plan reorganizes the ALECS MCP Server codebase according to GitHub best practices for TypeScript projects, improving maintainability and discoverability.

## Current Issues
1. **Scattered documentation**: MD files in root directory and various locations
2. **Inconsistent test structure**: Tests in `src/__tests__`, `test/`, and `tests/` directories
3. **Root directory clutter**: 40+ files in root, many should be in subdirectories
4. **Duplicate/outdated files**: Multiple similar documents with overlapping content

## Proposed Structure

```
alecs-mcp-server-akamai/
├── .github/                    # GitHub-specific files
│   ├── workflows/             # CI/CD workflows
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── docs/                       # All documentation
│   ├── api/                   # API reference documentation
│   ├── architecture/          # Architecture and design docs
│   ├── guides/                # User and developer guides
│   ├── operations/            # Operational guides (DNS, CDN, etc.)
│   └── planning/              # Project planning documents
├── src/                        # Source code (unchanged)
├── tests/                      # All tests (consolidated)
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   └── fixtures/              # Test fixtures and mocks
├── scripts/                    # Build and utility scripts
├── examples/                   # Example configurations
├── .vscode/                    # VS Code settings
├── CHANGELOG.md               # Keep in root (standard)
├── README.md                  # Keep in root (standard)
├── LICENSE                    # Keep in root (standard)
├── package.json               # Keep in root (required)
└── [config files]             # TypeScript, ESLint, Jest configs

```

## Detailed Migration Plan

### 1. Documentation Reorganization

#### Move to `docs/api/`:
- `docs/API-Reference-Guide.md`
- `docs/complete-function-reference.md`
- `docs/papi-coverage-analysis.md`
- `docs/papi-endpoints-inventory.md`
- `docs/reporting-api.md`

#### Move to `docs/architecture/`:
- `docs/multi-customer-architecture.md`
- `docs/Architecture-Overview.md` (from wiki)
- `MODULAR_SERVERS_PLAN.md`
- `docs/IMPLEMENTATION-STATUS.md`

#### Move to `docs/guides/`:
- `CLAUDE_CODE-SETUP.md` → `docs/guides/claude-code-setup.md`
- `CLAUDE_DESKTOP_SETUP.md` → `docs/guides/claude-desktop-setup.md`
- `quick-start.md` → `docs/guides/quick-start.md`
- `docs/Configuration-Guide.md`
- `docs/docker-guide.md`
- `docs/llm-compatibility-guide.md`

#### Move to `docs/operations/`:
- All operation guides (DNS, FastPurge, Property Manager, etc.)
- `docs/cdn-provisioning-guide.md`
- `docs/dns-migration-guide.md`
- `docs/secure-property-onboarding-guide.md`

#### Move to `docs/planning/`:
- `MISSION.md`
- `PERFORMANCE_AUDIT_REPORT.md`
- `VALKEY_OPTIMIZATION_PLAN.md`
- `CACHE_OPPORTUNITY_ANALYSIS.md`
- Various analysis documents

### 2. Test Consolidation

#### Merge all test directories into `tests/`:
1. Move `src/__tests__/*` → `tests/unit/`
2. Move `test/*` → `tests/`
3. Keep existing `tests/` structure
4. Organize by type:
   - `tests/unit/` - Unit tests for individual functions/classes
   - `tests/integration/` - Integration tests
   - `tests/e2e/` - End-to-end workflow tests
   - `tests/modular/` - Modular server tests

### 3. Root Directory Cleanup

#### Move to `examples/`:
- `claude_desktop_config_*.json` files
- `.edgerc` (create `.edgerc.example`)

#### Files to Consider for Deletion:
- `CLAUDE copy.md` (duplicate)
- `check-solutionsedge-property.js` (appears to be a one-off script)
- `list-tools.js` (one-off script)
- `GET_PROPERTY_FIX_SUMMARY.md` (specific fix documentation)
- `PRODUCT_MAPPING_UPDATE_SUMMARY.md` (completed task)
- `MCP_AKAMAI_COMPATIBILITY_VERIFICATION.md` (completed verification)
- `CHANGELOG_TEMPLATE.md` (not needed with proper CHANGELOG)
- Duplicate tsconfig files (`.tsbuildinfo`, `tsconfig.tsbuildinfo`)

#### Keep in Root:
- `README.md` - Main project documentation
- `CHANGELOG.md` - Version history
- `LICENSE` - License file
- `package.json`, `package-lock.json` - NPM files
- `tsconfig.json`, `tsconfig.build.json` - TypeScript configs
- `jest.config.ts` - Jest configuration
- `.eslintrc.json` - ESLint config
- `.gitignore`, `.dockerignore` - Ignore files
- `THIRD-PARTY-NOTICES.md` - Legal notices
- `DEPENDENCIES.md` - Dependency documentation
- `VERSIONING.md` - Versioning strategy

### 4. Special Considerations

#### Claude-specific files:
- Keep `CLAUDE.md` in root (project instructions)
- Move other Claude docs to `docs/guides/claude/`

#### Wiki content:
- Integrate `docs/wiki/` content into main docs structure
- Remove wiki directory after migration

## Implementation Order

1. **Phase 1**: Create new directory structure
2. **Phase 2**: Move documentation files
3. **Phase 3**: Consolidate tests
4. **Phase 4**: Clean up root directory
5. **Phase 5**: Update all internal references/imports
6. **Phase 6**: Delete deprecated files

## Benefits

1. **Improved discoverability**: Clear organization makes finding docs easier
2. **Reduced clutter**: Clean root directory focuses on essential files
3. **Standard structure**: Follows GitHub/TypeScript project conventions
4. **Better testing**: Consolidated test directory with clear organization
5. **Easier onboarding**: New developers can navigate more easily

## Files Recommended for Deletion

### High confidence (outdated/completed):
- `GET_PROPERTY_FIX_SUMMARY.md`
- `PRODUCT_MAPPING_UPDATE_SUMMARY.md`
- `MCP_AKAMAI_COMPATIBILITY_VERIFICATION.md`
- `CHANGELOG_TEMPLATE.md`
- `CLAUDE copy.md`
- `check-solutionsedge-property.js`
- `list-tools.js`

### Medium confidence (verify first):
- `.tsbuildinfo` (build artifact)
- `tsconfig.tsbuildinfo` (duplicate)
- Old test result files in `tests/reports/`

### Low confidence (review content):
- Some docs in `docs/` that may be outdated
- `MISSION.md` (might be historical)

## Task 2: Hardcoded Path Fixes

### Identified Hardcoded Paths

#### In Configuration Examples:
All `claude_desktop_config_*.json` files contain hardcoded paths:
- `/Users/acedergr/Projects/alecs-mcp-server-akamai/`
- `/Users/acedergr/.edgerc`

**Solution**: Convert these to templates with placeholders:
```json
{
  "args": ["<PROJECT_ROOT>/dist/index.js"],
  "cwd": "<PROJECT_ROOT>",
  "env": {
    "AKAMAI_EDGERC_PATH": "<HOME>/.edgerc"
  }
}
```

#### In Source Code:
The codebase properly uses dynamic paths:
- `src/cli.ts`: Uses `os.homedir()` for .edgerc path ✓
- Tests use environment variables ✓

### Recommended Actions:

1. **Rename example configs** to `.example`:
   - `claude_desktop_config_example.json` → `claude_desktop_config.example.json`
   - Replace hardcoded paths with placeholders

2. **Create setup script** to generate configs:
   ```bash
   scripts/setup-claude-desktop.sh
   ```
   This script will:
   - Copy `.example` files
   - Replace placeholders with actual paths
   - Create personalized configs

3. **Add to .gitignore**:
   - `claude_desktop_config.json` (personalized)
   - Any non-example config files

## Next Steps

1. Review and approve this plan
2. Fix hardcoded paths in config files
3. Create the new directory structure
4. Begin file migration in phases
5. Update imports and references
6. Clean up and delete approved files