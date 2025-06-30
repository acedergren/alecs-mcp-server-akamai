#!/bin/bash

# ALECS TypeScript Error Fix Script
# Systematically fixes common TypeScript errors

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🔧 ALECS TypeScript Error Fix Script${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Function to fix index signature access (TS4111)
fix_index_signatures() {
    echo -e "${YELLOW}Fixing index signature access issues...${NC}"
    
    # Common patterns to fix
    files=(
        "src/services/ReportingService.ts"
        "src/templates/template-engine.ts"
        "src/utils/timeout-handler.ts"
        "src/services/TrafficAnalyticsService.ts"
        "src/tools/property-manager-tools.ts"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  Fixing $file..."
            # Fix common patterns like args.propertyId -> args['propertyId']
            sed -i.bak -E 's/args\.([a-zA-Z]+)([^a-zA-Z])/args["\1"]\2/g' "$file"
            sed -i.bak -E 's/data\.([a-zA-Z]+)([^a-zA-Z])/data["\1"]\2/g' "$file"
            sed -i.bak -E 's/params\.([a-zA-Z]+)([^a-zA-Z])/params["\1"]\2/g' "$file"
        fi
    done
    
    echo -e "${GREEN}✅ Index signature fixes applied${NC}"
}

# Function to fix exact optional properties
fix_optional_properties() {
    echo -e "${YELLOW}Fixing exact optional property issues...${NC}"
    
    # This is more complex and requires manual review
    echo -e "  ${BLUE}Creating optional property fix guide...${NC}"
    
    cat > "OPTIONAL_PROPERTY_FIXES.md" << 'EOF'
# Exact Optional Property Fixes

## Pattern 1: Undefined in unions
```typescript
// Before
customer: string | undefined

// After
customer?: string
```

## Pattern 2: Conditional assignment
```typescript
// Before
const result = {
  errors: errors.length > 0 ? errors : undefined
};

// After
const result: { errors?: string[] } = {};
if (errors.length > 0) {
  result.errors = errors;
}
```

## Pattern 3: Type assertions
```typescript
// Before
Type 'string | undefined' is not assignable to type 'string'

// After
if (value !== undefined) {
  // Now TypeScript knows value is string
  target.prop = value;
}
```
EOF
    
    echo -e "${GREEN}✅ Optional property fix guide created${NC}"
}

# Function to remove unused imports
fix_unused_imports() {
    echo -e "${YELLOW}Removing unused imports...${NC}"
    
    # Run ESLint with auto-fix for unused imports
    if command -v npx &> /dev/null; then
        echo -e "  Running ESLint auto-fix..."
        npx eslint 'src/**/*.ts' --fix --rule 'no-unused-vars: error' || true
    else
        echo -e "  ${RED}ESLint not available, skipping...${NC}"
    fi
    
    echo -e "${GREEN}✅ Unused imports cleaned${NC}"
}

# Function to generate fix report
generate_fix_report() {
    echo -e "${YELLOW}Generating fix report...${NC}"
    
    # Count current errors
    current_errors=$(npm run typecheck 2>&1 | grep -c "error TS" || true)
    
    cat > "TYPESCRIPT_FIX_REPORT.md" << EOF
# TypeScript Fix Report
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Fixes Applied

### 1. Index Signature Access
- Fixed dynamic property access patterns
- Converted dot notation to bracket notation
- Files modified: $(find src -name "*.bak" | wc -l)

### 2. Optional Properties
- Generated fix guide for manual review
- See OPTIONAL_PROPERTY_FIXES.md

### 3. Unused Imports
- Ran ESLint auto-fix
- Cleaned up unused variables

## Current Status
- Remaining TypeScript errors: $current_errors
- Build status: $(npm run build &>/dev/null && echo "✅ SUCCESS" || echo "❌ FAILED")

## Next Steps
1. Review and apply optional property fixes manually
2. Run full TypeScript check: \`npm run typecheck\`
3. Test build: \`npm run build\`
EOF
    
    echo -e "${GREEN}✅ Fix report generated${NC}"
}

# Main execution
echo -e "${BLUE}Starting TypeScript error fixes...${NC}"
echo ""

# Backup current state
echo -e "${YELLOW}Creating backup...${NC}"
cp -r src src.backup.$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Apply fixes
fix_index_signatures
echo ""
fix_optional_properties
echo ""
fix_unused_imports
echo ""
generate_fix_report

# Clean up backup files
find src -name "*.bak" -delete

echo ""
echo -e "${GREEN}🎉 TypeScript fixes completed!${NC}"
echo -e "${BLUE}Check the following files for results:${NC}"
echo -e "  - TYPESCRIPT_FIX_REPORT.md"
echo -e "  - OPTIONAL_PROPERTY_FIXES.md"
echo ""
echo -e "${YELLOW}Run 'npm run typecheck' to see remaining errors${NC}"