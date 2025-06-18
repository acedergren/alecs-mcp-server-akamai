#!/bin/bash

# Path validation script for ALECS MCP Server
# Detects hardcoded absolute paths in the codebase
# Suitable for pre-commit hooks and CI/CD pipelines

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Exit codes
EXIT_SUCCESS=0
EXIT_FAILURE=1

# Counter for issues found
ISSUES_FOUND=0

# Function to check if a path should be ignored
should_ignore_path() {
    local path="$1"
    
    # Ignore system paths
    if [[ "$path" =~ ^/(usr|bin|etc|var|opt|sys|proc|dev)/ ]]; then
        return 0
    fi
    
    # Ignore URLs that look like paths
    if [[ "$path" =~ ^https?:// ]]; then
        return 0
    fi
    
    # Ignore example placeholders
    if [[ "$path" =~ \<.*\> ]]; then
        return 0
    fi
    
    # Ignore common documentation placeholders
    if [[ "$path" =~ ^/path/to/ ]]; then
        return 0
    fi
    
    return 1
}

# Function to check a single file
check_file() {
    local file="$1"
    local file_has_issues=0
    
    # Skip binary files
    if file --mime "$file" | grep -q "charset=binary"; then
        return
    fi
    
    # Patterns to search for
    local patterns=(
        "/home/[^/[:space:]]+"
        "/Users/[^/[:space:]]+"
        "[^/]*/alecs-mcp-server-akamai"
    )
    
    for pattern in "${patterns[@]}"; do
        # Use grep to find matches with line numbers
        while IFS=: read -r line_num line_content; do
            # Extract the matched path
            if [[ "$line_content" =~ ($pattern) ]]; then
                local matched_path="${BASH_REMATCH[1]}"
                
                # Check if this path should be ignored
                if ! should_ignore_path "$matched_path"; then
                    if [ $file_has_issues -eq 0 ]; then
                        echo -e "\n${RED}❌ File: $file${NC}"
                        file_has_issues=1
                        ((ISSUES_FOUND++))
                    fi
                    echo -e "   Line $line_num: ${YELLOW}$matched_path${NC}"
                    echo "   Context: $(echo "$line_content" | sed 's/^[[:space:]]*//' | cut -c1-80)..."
                fi
            fi
        done < <(grep -nE "$pattern" "$file" 2>/dev/null || true)
    done
    
    # Special check for absolute paths starting with /
    while IFS=: read -r line_num line_content; do
        # Look for paths that start with / and contain project-specific terms
        if [[ "$line_content" =~ (/[a-zA-Z]+/[^/]*alecs[^/[:space:]]*) ]]; then
            local matched_path="${BASH_REMATCH[1]}"
            
            if ! should_ignore_path "$matched_path"; then
                if [ $file_has_issues -eq 0 ]; then
                    echo -e "\n${RED}❌ File: $file${NC}"
                    file_has_issues=1
                    ((ISSUES_FOUND++))
                fi
                echo -e "   Line $line_num: ${YELLOW}$matched_path${NC}"
                echo "   Context: $(echo "$line_content" | sed 's/^[[:space:]]*//' | cut -c1-80)..."
            fi
        fi
    done < <(grep -nE "^[^#]*/" "$file" 2>/dev/null | grep -i "alecs" || true)
}

# Main execution
echo "🔍 Checking for hardcoded paths in the codebase..."
echo "================================================"

# Define file extensions to check
extensions=("ts" "js" "md" "sh" "json")

# Build find command to exclude directories
exclude_dirs=(
    "node_modules"
    "dist"
    ".git"
    "coverage"
    ".next"
    "build"
    ".cache"
    "tmp"
    ".tsbuildinfo"
)

# Build exclude arguments for find
exclude_args=""
for dir in "${exclude_dirs[@]}"; do
    exclude_args="$exclude_args -path ./$dir -prune -o"
done

# Find and check files
for ext in "${extensions[@]}"; do
    while IFS= read -r file; do
        check_file "$file"
    done < <(eval "find . $exclude_args -name '*.$ext' -type f -print" 2>/dev/null)
done

# Summary
echo ""
echo "================================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No hardcoded paths found!${NC}"
    echo "The codebase is portable and ready for distribution."
    exit $EXIT_SUCCESS
else
    echo -e "${RED}❌ Found $ISSUES_FOUND file(s) with hardcoded paths!${NC}"
    echo ""
    echo "To fix these issues:"
    echo "1. Replace user-specific paths with placeholders:"
    echo "   - Use ~/  or <USER_HOME>/ instead of /home/username/"
    echo "   - Use <PROJECT_ROOT>/ for project paths"
    echo "2. Use relative paths where possible"
    echo "3. For scripts, detect paths dynamically"
    echo ""
    echo "For documentation files, add this note at the beginning:"
    echo "> **Note**: This guide uses path placeholders:"
    echo "> - <USER_HOME> or ~/ - Your home directory"
    echo "> - <PROJECT_ROOT> - The directory where you cloned this repository"
    exit $EXIT_FAILURE
fi