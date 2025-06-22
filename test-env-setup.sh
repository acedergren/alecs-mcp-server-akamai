#!/bin/bash

# Test Environment Setup for ALECS MCP Server
# These are test/demo values - replace with real values for production

# Required Akamai EdgeGrid Authentication
export AKAMAI_CLIENT_SECRET="test-client-secret-for-e2e-testing"
export AKAMAI_HOST="test-host.purge.akamaiapis.net"
export AKAMAI_ACCESS_TOKEN="test-access-token-for-e2e"
export AKAMAI_CLIENT_TOKEN="test-client-token-for-e2e"
export AKAMAI_ACCOUNT_KEY="test-account-key"

# Optional: Set test environment
export NODE_ENV="test"

# Optional: Enable verbose test output
export VERBOSE_TESTS="false"

# Optional: Capture server logs during tests
export CAPTURE_LOGS="false"

echo "✅ Test environment variables set!"
echo ""
echo "To use these variables in your current shell:"
echo "  source test-env-setup.sh"
echo ""
echo "To run E2E tests:"
echo "  npm run test:e2e:full"
echo ""
echo "⚠️  Note: These are test values. For real Akamai API access, use your actual credentials."