#!/bin/bash
# Path validation script - checks for hardcoded paths in the codebase
# This helps ensure portability and prevents environment-specific paths

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Patterns to check for hardcoded paths
PATTERNS=(
    "/home/[^/]*/"
    "/Users/[^/]*/"
    "C:\\\\Users"
    "D:\\\\Projects"
    "/var/www/"
    "/opt/app/"
)

# Files/directories to exclude from checking
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    "dist"
    "build"
    "coverage"
    ".next"
    "*.log"
    "*.md"
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
)

# Build exclude arguments for grep
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude-dir=$pattern --exclude=$pattern"
done

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: Not in a git repository${NC}"
    exit 0
fi

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|tsx|jsx|json|yml|yaml|sh)$' || true)

if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}✓ No relevant files to check${NC}"
    exit 0
fi

echo "🔍 Checking for hardcoded paths in staged files..."

FOUND_ISSUES=false
TOTAL_ISSUES=0

# Check each staged file
for file in $STAGED_FILES; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Skip if file is in excluded directory
    skip_file=false
    for exclude in "${EXCLUDE_PATTERNS[@]}"; do
        if [[ "$file" == *"$exclude"* ]]; then
            skip_file=true
            break
        fi
    done
    
    if [ "$skip_file" = true ]; then
        continue
    fi
    
    # Check for each pattern
    for pattern in "${PATTERNS[@]}"; do
        matches=$(grep -n "$pattern" "$file" 2>/dev/null || true)
        
        if [ ! -z "$matches" ]; then
            if [ "$FOUND_ISSUES" = false ]; then
                echo ""
                echo -e "${RED}❌ Found hardcoded paths:${NC}"
                FOUND_ISSUES=true
            fi
            
            echo -e "${YELLOW}File: $file${NC}"
            echo "$matches" | while IFS= read -r line; do
                echo "  $line"
                ((TOTAL_ISSUES++))
            done
            echo ""
        fi
    done
done

if [ "$FOUND_ISSUES" = true ]; then
    echo -e "${RED}⚠️  Found hardcoded paths in staged files!${NC}"
    echo ""
    echo "Suggestions to fix:"
    echo "  • Use environment variables: process.env.HOME or process.env.USERPROFILE"
    echo "  • Use relative paths: ./data or ../config"
    echo "  • Use config files to store environment-specific paths"
    echo "  • Use path.join() or path.resolve() for cross-platform compatibility"
    echo ""
    echo "To bypass this check (not recommended), use: git commit --no-verify"
    exit 1
else
    echo -e "${GREEN}✓ No hardcoded paths found${NC}"
    exit 0
fi