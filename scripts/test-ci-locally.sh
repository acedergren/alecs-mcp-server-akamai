#!/bin/bash
# Local CI/CD Dry-Run Test Script

set -e

echo "🧪 Starting local CI/CD dry-run..."
echo ""

# Test 1: Pre-flight checks
echo "1️⃣ Pre-flight Checks"
echo "===================="
for df in Dockerfile Dockerfile.modular Dockerfile.websocket Dockerfile.sse; do
  if [ -f "$df" ]; then
    echo "✅ $df exists"
  else
    echo "❌ $df missing"
    exit 1
  fi
done

echo "✅ Validating package.json..."
node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo "✅ package.json is valid"
echo ""

# Test 2: Dependencies and Build
echo "2️⃣ Dependencies & Build"
echo "======================="
echo "Installing dependencies..."
npm ci --prefer-offline --no-audit
echo "✅ Dependencies installed"

echo "Building project..."
npm run build
echo "✅ Build successful"
echo ""

# Test 3: Tests
echo "3️⃣ Running Tests"
echo "================"
npm test
echo "✅ Tests passed"
echo ""

# Test 4: Docker builds
echo "4️⃣ Docker Builds (dry-run)"
echo "=========================="
for df in Dockerfile Dockerfile.modular Dockerfile.websocket Dockerfile.sse; do
  echo "Building $df..."
  docker build -f $df -t test-${df}:latest . --quiet
  echo "✅ $df built successfully"
done
echo ""

# Test 5: Tool validation
echo "5️⃣ Tool Validation"
echo "=================="
npx tsx scripts/validate-alecs-tools.ts
echo ""

echo "✅ All dry-run tests passed!"
echo ""
echo "📊 Summary:"
echo "- Pre-flight checks: ✅"
echo "- Dependencies: ✅"
echo "- Build: ✅"
echo "- Tests: ✅"
echo "- Docker builds: ✅"
echo "- Tool validation: ✅"
echo ""
echo "🚀 Ready for production deployment!"