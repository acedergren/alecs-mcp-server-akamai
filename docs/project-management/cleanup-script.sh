#!/bin/bash
# Cleanup Script for ALECS MCP Server
# Generated: June 18, 2025

echo "Starting cleanup of ALECS MCP Server project..."

# Backup files
echo "Removing backup files..."
rm -f src/tools/security/appsec-advanced-tools.ts.bak
rm -f src/tools/security/security-management-tools.ts.bak
rm -f src/tools/security/appsec-tools.ts.bak
rm -f src/index.ts.backup
rm -f src/tools/property-tools.ts.backup

# Empty directories
echo "Removing empty directories..."
rmdir tests/integration/reporting 2>/dev/null
rmdir tests/integration/certs 2>/dev/null
rmdir tests/integration/dns 2>/dev/null
rmdir tests/integration/property 2>/dev/null
rmdir tests/reports 2>/dev/null
rmdir tests/analysis 2>/dev/null

# Duplicate test files
echo "Removing duplicate test files..."
rm -f tests/mcp/mcp-server-initialization-fixed.test.ts
rm -f jest.setup.js
rm -f jest.setup.afterEnv.ts

# Test scripts in examples
echo "Removing test scripts from examples..."
rm -f examples/scripts/test-api-connection.ts
rm -f examples/scripts/test-code-solutionsedge.ts
rm -f examples/scripts/test-complete-onboarding.ts
rm -f examples/scripts/test-get-property-live.ts
rm -f examples/scripts/test-mcp-onboarding.ts
rm -f examples/scripts/test-onboarding-direct.ts
rm -f examples/scripts/test-property-onboarding.ts
rm -f examples/scripts/test-real-onboarding.ts
rm -f examples/scripts/test-simple-onboarding.ts
rm -f examples/demos/test-mcp-protocol.js
rm -f examples/demos/test-property-server-mcp.js
rm -f examples/scripts/send-mcp-command.sh
rm -f examples/scripts/check-property-exists.ts

# Old test files
echo "Removing old test files..."
rm -f tests/test-dns-functions.ts
rm -f tests/test-papi-workflow.ts

# Generated files
echo "Removing generated files..."
rm -rf dist/
rm -f .tsbuildinfo
rm -f tsconfig.tsbuildinfo

# Old test utilities
echo "Removing old test utilities..."
rm -f tests/utils/continuous-monitor.js
rm -f tests/utils/debug-test.js
rm -f tests/utils/detailed-debug.js
rm -f tests/utils/experience-metrics.js
rm -f tests/utils/feedback-processor.js
rm -f tests/utils/journey-analyzer.js
rm -f tests/utils/optimization-engine.js
rm -f tests/utils/quality-gates.js
rm -f tests/utils/report-generator.js
rm -f tests/utils/test-executor.js
rm -f tests/utils/troubleshooting.js

# Old integration tests
echo "Removing old integration test files..."
rm -f tests/integration/test-connection.js
rm -f tests/integration/test-correct-contract.js
rm -f tests/integration/test-cpcodes.js
rm -f tests/integration/test-edge-hostname.js
rm -f tests/integration/test-fixed-request.js
rm -f tests/integration/test-papi-format.js
rm -f tests/integration/test-secure-onboarding.js
rm -f tests/integration/test-simple-secure.js

# Miscellaneous
echo "Removing miscellaneous files..."
rm -f tests/mcp/mcp-health-check.js
rm -rf src/testing/
rm -f tsconfig.test.json
rm -f tests/run-all-tests.ts
rm -f tests/run-comprehensive-validation.js
rm -f tests/run-customer-experience-tests.js
rm -rf .debug/

# Remove any remaining empty directories
echo "Final cleanup of empty directories..."
find tests -type d -empty -delete 2>/dev/null
find examples -type d -empty -delete 2>/dev/null

echo "Cleanup complete!"
echo ""
echo "Summary of cleanup:"
echo "- Removed backup files (.bak, .backup)"
echo "- Removed duplicate test files"
echo "- Cleaned up test scripts from examples"
echo "- Removed old JS test files"
echo "- Removed generated files and directories"
echo "- Consolidated test structure"
echo ""
echo "Note: The following were kept:"
echo "- .claude/ (local Claude settings)"
echo "- tools/ (contains improvement analysis tools)"
echo "- build/ (contains docker and make configurations)"