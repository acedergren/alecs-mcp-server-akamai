#!/bin/bash

# ALECS MCP Test Runner
# Runs all ALECS-specific tests

echo "🧪 Running ALECS MCP Tests..."
echo "=============================="
echo ""

# Run ALECS comprehensive tests
echo "📋 Running ALECS Comprehensive Tests..."
npm test -- src/__tests__/alecs-comprehensive.test.ts --passWithNoTests

# Run ALECS execution tests
echo ""
echo "🚀 Running ALECS Execution Tests..."
npm test -- src/__tests__/alecs-execution.test.ts --passWithNoTests

# Run validation script
echo ""
echo "✅ Running ALECS Validation..."
npx tsx scripts/validate-alecs-tools.ts

echo ""
echo "=============================="
echo "✅ ALECS Testing Complete!"
echo ""
echo "📄 Reports generated:"
echo "  - alecs-test-report.json"
echo "  - alecs-validation-report.json"