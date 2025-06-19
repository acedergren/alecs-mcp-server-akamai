#!/bin/bash

# MCP 2025-06-18 Dependency Update Script
# This script installs all required dependencies for MCP 2025 compliance

echo "🚀 Starting MCP 2025-06-18 dependency updates..."

# Phase 1: Critical Security Dependencies
echo ""
echo "📦 Phase 1: Installing critical OAuth 2.0 dependencies..."
npm install oauth2-server@^3.1.1 express-oauth-server@^2.0.0 node-jose@^2.2.0 openid-client@^5.7.1 @panva/oauth4webapi@^3.1.0

echo ""
echo "📦 Installing security middleware..."
npm install express-bearer-token@^3.0.0 express-rate-limit@^7.5.0 cors@^2.8.5 helmet@^8.0.0

echo ""
echo "📦 Installing audit logging infrastructure..."
npm install winston@^3.18.0 winston-transport-rotating-file@^5.1.3

# Phase 2: Protocol Compliance
echo ""
echo "📦 Phase 2: Installing schema conversion..."
npm install zod-to-json-schema@^3.23.5

echo ""
echo "📦 Installing request tracking..."
npm install node-cache@^5.1.2 uuid@^11.0.5 cls-hooked@^4.2.2

echo ""
echo "📦 Installing metadata validation..."
npm install ajv@^8.17.1

# Phase 3: Enhancements
echo ""
echo "📦 Phase 3: Installing JSON-RPC enhancements..."
npm install jayson@^4.1.3

# Update dev dependencies
echo ""
echo "📦 Updating dev dependencies..."
npm install --save-dev @types/ioredis@^5.0.0

# Update package.json for ESLint versions
echo ""
echo "📝 Updating package.json dev dependency versions..."
npm install --save-dev @typescript-eslint/eslint-plugin@^8.34.1 @typescript-eslint/parser@^8.34.1 eslint@^9.29.0 eslint-plugin-jest@^29.0.1

# Optional performance monitoring (commented out by default)
# echo ""
# echo "📦 Installing optional performance monitoring..."
# npm install prom-client@^16.0.0 @godaddy/terminus@^4.12.1

# Run validation
echo ""
echo "✅ Running validation checks..."
npm run typecheck || echo "⚠️  TypeScript errors found - please fix"
npm audit || echo "⚠️  Security vulnerabilities found - please review"

echo ""
echo "✨ Dependency update complete!"
echo ""
echo "Next steps:"
echo "1. Review and fix any TypeScript errors"
echo "2. Run 'npm test' to ensure all tests pass"
echo "3. Update OAuth implementation to use new dependencies"
echo "4. Run 'npm audit fix' if there are any vulnerabilities"