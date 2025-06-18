# Deletion Candidates - June 18, 2025

## Summary
This document lists all files and directories identified as candidates for deletion during the project cleanup.

## Deletion Table

| File/Directory | Type | Reason | Delete Command |
|----------------|------|---------|----------------|
| **Backup Files** | | | |
| `src/tools/security/appsec-advanced-tools.ts.bak` | Backup | Old backup file, source exists | `rm src/tools/security/appsec-advanced-tools.ts.bak` |
| `src/tools/security/security-management-tools.ts.bak` | Backup | Old backup file, source exists | `rm src/tools/security/security-management-tools.ts.bak` |
| `src/tools/security/appsec-tools.ts.bak` | Backup | Old backup file, source exists | `rm src/tools/security/appsec-tools.ts.bak` |
| `src/index.ts.backup` | Backup | Old backup file, source exists | `rm src/index.ts.backup` |
| `src/tools/property-tools.ts.backup` | Backup | Old backup file, source exists | `rm src/tools/property-tools.ts.backup` |
| **Empty Directories** | | | |
| `tests/integration/reporting/` | Empty Dir | No content, structure reorganized | `rmdir tests/integration/reporting` |
| `tests/integration/certs/` | Empty Dir | No content, structure reorganized | `rmdir tests/integration/certs` |
| `tests/integration/dns/` | Empty Dir | No content, structure reorganized | `rmdir tests/integration/dns` |
| `tests/integration/property/` | Empty Dir | No content, structure reorganized | `rmdir tests/integration/property` |
| `tests/reports/` | Empty Dir | Reports moved to docs | `rmdir tests/reports` |
| **Duplicate Test Files** | | | |
| `tests/mcp/mcp-server-initialization-fixed.test.ts` | Duplicate | Same as mcp-server-initialization.test.ts | `rm tests/mcp/mcp-server-initialization-fixed.test.ts` |
| `jest.setup.js` | Duplicate | Replaced by jest.setup.ts | `rm jest.setup.js` |
| `jest.setup.afterEnv.ts` | Duplicate | Consolidated into jest.setup.ts | `rm jest.setup.afterEnv.ts` |
| **Test Scripts in Examples** | | | |
| `examples/scripts/test-api-connection.ts` | Test Script | Ad-hoc test, not a demo | `rm examples/scripts/test-api-connection.ts` |
| `examples/scripts/test-code-solutionsedge.ts` | Test Script | Specific test case, not example | `rm examples/scripts/test-code-solutionsedge.ts` |
| `examples/scripts/test-complete-onboarding.ts` | Test Script | Should be in tests/ if needed | `rm examples/scripts/test-complete-onboarding.ts` |
| `examples/scripts/test-get-property-live.ts` | Test Script | Live test, not example | `rm examples/scripts/test-get-property-live.ts` |
| `examples/scripts/test-mcp-onboarding.ts` | Test Script | Should be proper test | `rm examples/scripts/test-mcp-onboarding.ts` |
| `examples/scripts/test-onboarding-direct.ts` | Test Script | Direct test, not example | `rm examples/scripts/test-onboarding-direct.ts` |
| `examples/scripts/test-property-onboarding.ts` | Test Script | Duplicate of demos | `rm examples/scripts/test-property-onboarding.ts` |
| `examples/scripts/test-real-onboarding.ts` | Test Script | Ad-hoc test | `rm examples/scripts/test-real-onboarding.ts` |
| `examples/scripts/test-simple-onboarding.ts` | Test Script | Duplicate functionality | `rm examples/scripts/test-simple-onboarding.ts` |
| `examples/demos/test-mcp-protocol.js` | Test Script | Should be in tests/mcp | `rm examples/demos/test-mcp-protocol.js` |
| `examples/demos/test-property-server-mcp.js` | Test Script | Should be in tests/mcp | `rm examples/demos/test-property-server-mcp.js` |
| **Old Test Files** | | | |
| `tests/test-dns-functions.ts` | Old Test | Ad-hoc test, not suite | `rm tests/test-dns-functions.ts` |
| `tests/test-papi-workflow.ts` | Old Test | Ad-hoc test, not suite | `rm tests/test-papi-workflow.ts` |
| **Generated Files** | | | |
| `dist/` | Generated | Build output, gitignored | `rm -rf dist/` |
| `.tsbuildinfo` | Generated | TypeScript build cache | `rm .tsbuildinfo` |
| `tsconfig.tsbuildinfo` | Generated | TypeScript build cache | `rm tsconfig.tsbuildinfo` |
| **Old Test Utilities** | | | |
| `tests/utils/continuous-monitor.js` | Old Util | JS file, should be TS | `rm tests/utils/continuous-monitor.js` |
| `tests/utils/debug-test.js` | Old Util | JS file, old utility | `rm tests/utils/debug-test.js` |
| `tests/utils/detailed-debug.js` | Old Util | JS file, old utility | `rm tests/utils/detailed-debug.js` |
| `tests/utils/experience-metrics.js` | Old Util | JS file, old utility | `rm tests/utils/experience-metrics.js` |
| `tests/utils/feedback-processor.js` | Old Util | JS file, old utility | `rm tests/utils/feedback-processor.js` |
| `tests/utils/journey-analyzer.js` | Old Util | JS file, old utility | `rm tests/utils/journey-analyzer.js` |
| `tests/utils/optimization-engine.js` | Old Util | JS file, old utility | `rm tests/utils/optimization-engine.js` |
| `tests/utils/quality-gates.js` | Old Util | JS file, old utility | `rm tests/utils/quality-gates.js` |
| `tests/utils/report-generator.js` | Old Util | JS file, old utility | `rm tests/utils/report-generator.js` |
| `tests/utils/test-executor.js` | Old Util | JS file, old utility | `rm tests/utils/test-executor.js` |
| `tests/utils/troubleshooting.js` | Old Util | JS file, old utility | `rm tests/utils/troubleshooting.js` |
| **Old Integration Tests** | | | |
| `tests/integration/test-connection.js` | Old Test | JS file in TS project | `rm tests/integration/test-connection.js` |
| `tests/integration/test-correct-contract.js` | Old Test | JS file in TS project | `rm tests/integration/test-correct-contract.js` |
| `tests/integration/test-cpcodes.js` | Old Test | JS file in TS project | `rm tests/integration/test-cpcodes.js` |
| `tests/integration/test-edge-hostname.js` | Old Test | JS file in TS project | `rm tests/integration/test-edge-hostname.js` |
| `tests/integration/test-fixed-request.js` | Old Test | JS file in TS project | `rm tests/integration/test-fixed-request.js` |
| `tests/integration/test-papi-format.js` | Old Test | JS file in TS project | `rm tests/integration/test-papi-format.js` |
| `tests/integration/test-secure-onboarding.js` | Old Test | JS file in TS project | `rm tests/integration/test-secure-onboarding.js` |
| `tests/integration/test-simple-secure.js` | Old Test | JS file in TS project | `rm tests/integration/test-simple-secure.js` |
| **Miscellaneous** | | | |
| `tests/mcp/mcp-health-check.js` | Old Util | JS file, not a test | `rm tests/mcp/mcp-health-check.js` |
| `src/testing/` | Test Utils | Should be in tests/ | `rm -rf src/testing/` |
| `tsconfig.test.json` | Duplicate | Using main tsconfig | `rm tsconfig.test.json` |
| `tests/run-all-tests.ts` | Old Runner | Using npm test | `rm tests/run-all-tests.ts` |
| `tests/run-comprehensive-validation.js` | Old Runner | JS file, old runner | `rm tests/run-comprehensive-validation.js` |
| `tests/run-customer-experience-tests.js` | Old Runner | JS file, old runner | `rm tests/run-customer-experience-tests.js` |
| `examples/scripts/send-mcp-command.sh` | Shell Script | MCP test utility | `rm examples/scripts/send-mcp-command.sh` |
| `examples/scripts/check-property-exists.ts` | Test Script | Should be a test | `rm examples/scripts/check-property-exists.ts` |
| `tools/` | Unknown Dir | Check contents first | `# Check before deleting` |
| `build/` | Unknown Dir | Check contents first | `# Check before deleting` |
| `.debug/` | Debug Dir | Debug artifacts | `rm -rf .debug/` |
| `.claude/` | Claude Dir | Local claude settings | `# Keep - local settings` |
| `tests/analysis/` | Empty Dir | Moved to docs | `rmdir tests/analysis` |

## Batch Delete Commands

### Delete all backup files:
```bash
find . -name "*.bak" -o -name "*.backup" | xargs rm -f
```

### Delete all empty directories:
```bash
find tests -type d -empty -delete
```

### Delete all old JS test files:
```bash
find tests -name "*.js" -type f -delete
```

### Delete all test scripts from examples:
```bash
rm -f examples/scripts/test-*.ts
rm -f examples/demos/test-*.js
```

### Complete cleanup (after review):
```bash
# Run all deletions
bash docs/project-management/cleanup-script.sh
```

## Total Files/Directories: 68

## Space Saved: ~50MB (including dist/ directory)