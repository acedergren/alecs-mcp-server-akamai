#!/bin/bash

# ALECS Deployment Hooks - KISS principle

set -e

echo "🚀 ALECS Deploy"

# Update docs
npx tsx scripts/update-docs.ts

# Validate tools
npx tsx scripts/validate-alecs-tools.ts

# Cleanup
rm -f alecs-validation-report.json alecs-test-report.json

echo "✅ Deploy complete!"