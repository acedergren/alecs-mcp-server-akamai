#!/bin/bash

# Pre-release checklist script
# Run this before creating a release to ensure everything is ready

echo "🚀 ALECS Pre-Release Checklist"
echo "============================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# Track overall status
CHECKS_PASSED=0
CHECKS_FAILED=0

echo "1. Checking build..."
npm run build > /dev/null 2>&1
if check_status $? "Build successful"; then
    ((CHECKS_PASSED++))
else
    ((CHECKS_FAILED++))
fi

echo ""
echo "2. Running tests..."
npm test > /dev/null 2>&1
if check_status $? "All tests passing"; then
    ((CHECKS_PASSED++))
else
    ((CHECKS_FAILED++))
fi

echo ""
echo "3. Checking TypeScript..."
npx tsc --noEmit > /dev/null 2>&1
if check_status $? "TypeScript compilation clean"; then
    ((CHECKS_PASSED++))
else
    ((CHECKS_FAILED++))
fi

echo ""
echo "4. Checking for uncommitted changes..."
if [ -z "$(git status --porcelain)" ]; then
    check_status 0 "Working directory clean"
    ((CHECKS_PASSED++))
else
    check_status 1 "Uncommitted changes found"
    ((CHECKS_FAILED++))
    git status --short
fi

echo ""
echo "5. Checking package.json version..."
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}ℹ${NC}  Current version: $CURRENT_VERSION"

echo ""
echo "6. Checking NPM authentication..."
if [ -n "$NPM_TOKEN" ] || npm whoami > /dev/null 2>&1; then
    check_status 0 "NPM authentication configured"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  NPM authentication not configured (optional)"
fi

echo ""
echo "7. Checking Docker..."
if command -v docker > /dev/null 2>&1; then
    check_status 0 "Docker available"
    ((CHECKS_PASSED++))
    
    # Try to build minimal Docker image
    echo "   Testing Docker build..."
    docker build -f build/docker/Dockerfile.minimal -t test-build . > /dev/null 2>&1
    if check_status $? "   Docker build successful"; then
        docker rmi test-build > /dev/null 2>&1
    fi
else
    echo -e "${YELLOW}⚠${NC}  Docker not available (optional for local release)"
fi

echo ""
echo "8. Checking GitHub secrets..."
echo -e "${YELLOW}ℹ${NC}  Ensure these secrets are configured in GitHub:"
echo "   - NPM_TOKEN (for NPM publishing)"
echo "   - GITHUB_TOKEN (automatically provided)"

echo ""
echo "9. Checking CHANGELOG..."
if [ -f "CHANGELOG.md" ]; then
    LAST_ENTRY=$(grep -m 1 "^## \[" CHANGELOG.md || echo "No version entries found")
    echo -e "${YELLOW}ℹ${NC}  Last CHANGELOG entry: $LAST_ENTRY"
    echo -e "${YELLOW}ℹ${NC}  Make sure to update CHANGELOG.md for the new version"
else
    echo -e "${YELLOW}⚠${NC}  CHANGELOG.md not found"
fi

echo ""
echo "============================="
echo "Summary:"
echo -e "${GREEN}✓${NC} Checks passed: $CHECKS_PASSED"
if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}✗${NC} Checks failed: $CHECKS_FAILED"
    echo ""
    echo -e "${RED}❌ Not ready for release. Please fix the issues above.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ Ready for release!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update version: npm version minor -m 'chore: release v%s'"
    echo "2. Push changes: git push && git push --tags"
    echo "3. Create GitHub release from tag"
    echo "   - Use tag: v$CURRENT_VERSION"
    echo "   - Title: v1.7.0 - Intelligent DNS Operations"
    echo "   - Generate release notes from commits"
fi