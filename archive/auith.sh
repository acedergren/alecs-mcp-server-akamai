#!/bin/bash
# Akamai MCP Server - Function Audit Preprocessing Script
# This script performs deep analysis of the codebase to identify functions for cleanup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output directories
AUDIT_DIR="audit-results"
mkdir -p "$AUDIT_DIR"

echo -e "${BLUE}=== Akamai MCP Function Audit Preprocessor ===${NC}"
echo "Generated: $(date)"
echo ""

# Step 1: Extract all exported functions
echo -e "${YELLOW}[1/10] Extracting exported functions...${NC}"
cat > "$AUDIT_DIR/functions-raw.txt" << 'EOF'
EOF

# Extract function signatures with file locations
find src/tools -name "*.ts" -type f | while read -r file; do
    echo "Processing: $file"
    
    # Extract exported async functions
    grep -n "^export async function" "$file" 2>/dev/null | while IFS=: read -r line_num function_line; do
        func_name=$(echo "$function_line" | sed 's/export async function //' | sed 's/(.*//')
        echo "${file}:${line_num}:${func_name}" >> "$AUDIT_DIR/functions-raw.txt"
    done
    
    # Extract exported const functions
    grep -n "^export const.*=.*async" "$file" 2>/dev/null | while IFS=: read -r line_num function_line; do
        func_name=$(echo "$function_line" | sed 's/export const //' | sed 's/ =.*//')
        echo "${file}:${line_num}:${func_name}" >> "$AUDIT_DIR/functions-raw.txt"
    done
done

# Step 2: Extract API endpoints called by each function
echo -e "${YELLOW}[2/10] Mapping functions to API endpoints...${NC}"
echo "file,function,endpoint,method" > "$AUDIT_DIR/function-api-map.csv"

while IFS=: read -r file line_num func_name; do
    # Find the function body (crude but effective for audit)
    # Extract ~50 lines after function declaration to catch API calls
    tail -n +$line_num "$file" | head -n 50 > "$AUDIT_DIR/temp_func_body.txt"
    
    # Look for client.request patterns
    grep -o "path:[[:space:]]*['\"\`][^'\"\`]*['\"\`]" "$AUDIT_DIR/temp_func_body.txt" 2>/dev/null | while read -r path_match; do
        endpoint=$(echo "$path_match" | sed "s/path:[[:space:]]*['\"\`]//" | sed "s/['\"\`]//")
        
        # Try to find the method
        method=$(grep -A2 -B2 "$path_match" "$AUDIT_DIR/temp_func_body.txt" | grep -o "method:[[:space:]]*['\"\`][A-Z]*['\"\`]" | sed "s/method:[[:space:]]*['\"\`]//" | sed "s/['\"\`]//" | head -1)
        [ -z "$method" ] && method="GET"
        
        echo "$file,$func_name,$endpoint,$method" >> "$AUDIT_DIR/function-api-map.csv"
    done
done < "$AUDIT_DIR/functions-raw.txt"

rm -f "$AUDIT_DIR/temp_func_body.txt"

# Step 3: Identify Akamai API patterns
echo -e "${YELLOW}[3/10] Identifying Akamai API patterns...${NC}"
cat > "$AUDIT_DIR/akamai-api-patterns.txt" << 'EOF'
# Known Akamai API Patterns
/papi/v1/properties
/papi/v1/groups
/papi/v1/contracts
/papi/v1/products
/papi/v1/cpcodes
/papi/v1/edgehostnames
/papi/v1/rule-formats
/papi/v1/catalog/behaviors
/papi/v1/catalog/criteria
/papi/v1/schemas
/config-dns/v2/zones
/config-dns/v2/changelists
/config-dns/v2/recordsets
/cps/v2/enrollments
/cps/v2/changes
/network-list/v2/network-lists
/ccu/v3/invalidate
/ccu/v3/delete
/reporting-api/v1/reports
/appsec/v1/configs
EOF

# Step 4: Find orphaned functions (no API calls)
echo -e "${YELLOW}[4/10] Finding orphaned functions...${NC}"
cut -d: -f3 "$AUDIT_DIR/functions-raw.txt" | sort -u > "$AUDIT_DIR/all-functions.txt"
cut -d, -f2 "$AUDIT_DIR/function-api-map.csv" | tail -n +2 | sort -u > "$AUDIT_DIR/functions-with-apis.txt"
comm -23 "$AUDIT_DIR/all-functions.txt" "$AUDIT_DIR/functions-with-apis.txt" > "$AUDIT_DIR/orphaned-functions.txt"

# Step 5: Find suspicious patterns
echo -e "${YELLOW}[5/10] Detecting suspicious patterns...${NC}"
echo "pattern,file,line,context" > "$AUDIT_DIR/suspicious-patterns.csv"

# Look for TODO, FIXME, HACK, deprecated, fake, mock
find src/tools -name "*.ts" | while read -r file; do
    grep -n -i "TODO\|FIXME\|HACK\|deprecated\|fake\|mock\|not.implemented\|placeholder" "$file" 2>/dev/null | while IFS=: read -r line_num context; do
        pattern=$(echo "$context" | grep -o -i "TODO\|FIXME\|HACK\|deprecated\|fake\|mock\|not.implemented\|placeholder" | head -1)
        echo "$pattern,$file,$line_num,\"$context\"" >> "$AUDIT_DIR/suspicious-patterns.csv"
    done
done

# Step 6: Analyze function complexity
echo -e "${YELLOW}[6/10] Analyzing function complexity...${NC}"
echo "file,function,lines,api_calls" > "$AUDIT_DIR/function-complexity.csv"

while IFS=: read -r file line_num func_name; do
    # Find function end (next function or end of file)
    next_func_line=$(tail -n +$((line_num + 1)) "$file" | grep -n "^export\|^async function\|^function" | head -1 | cut -d: -f1)
    
    if [ -z "$next_func_line" ]; then
        # Function goes to end of file
        func_lines=$(wc -l < "$file")
        func_lines=$((func_lines - line_num))
    else
        func_lines=$((next_func_line - 1))
    fi
    
    # Count API calls in this function
    api_calls=$(grep -c "client\.request" <(tail -n +$line_num "$file" | head -n $func_lines) 2>/dev/null || echo "0")
    
    echo "$file,$func_name,$func_lines,$api_calls" >> "$AUDIT_DIR/function-complexity.csv"
done < "$AUDIT_DIR/functions-raw.txt"

# Step 7: Check for duplicate/similar functions
echo -e "${YELLOW}[7/10] Finding duplicate/similar functions...${NC}"
echo "function1,function2,similarity_reason" > "$AUDIT_DIR/similar-functions.csv"

# Group by similar prefixes
cut -d: -f3 "$AUDIT_DIR/functions-raw.txt" | sort -u | while read -r func; do
    # Extract base name (remove common suffixes)
    base=$(echo "$func" | sed 's/\(list\|get\|create\|update\|delete\|search\)$//')
    
    # Find similar functions
    grep -E "^${base}(list|get|create|update|delete|search)?$" "$AUDIT_DIR/all-functions.txt" | grep -v "^${func}$" | while read -r similar; do
        echo "$func,$similar,similar_name" >> "$AUDIT_DIR/similar-functions.csv"
    done
done

# Step 8: Map to test coverage
echo -e "${YELLOW}[8/10] Checking test coverage...${NC}"
echo "function,has_test,test_file" > "$AUDIT_DIR/test-coverage.csv"

cut -d: -f3 "$AUDIT_DIR/functions-raw.txt" | sort -u | while read -r func; do
    test_files=$(find src/__tests__ tests -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | xargs grep -l "$func" 2>/dev/null || true)
    
    if [ -z "$test_files" ]; then
        echo "$func,false," >> "$AUDIT_DIR/test-coverage.csv"
    else
        echo "$test_files" | while read -r test_file; do
            echo "$func,true,$test_file" >> "$AUDIT_DIR/test-coverage.csv"
        done
    fi
done

# Step 9: Validate against known Akamai endpoints
echo -e "${YELLOW}[9/10] Validating against Akamai API patterns...${NC}"
echo "endpoint,valid,closest_match" > "$AUDIT_DIR/endpoint-validation.csv"

# Extract unique endpoints
cut -d, -f3 "$AUDIT_DIR/function-api-map.csv" | tail -n +2 | sort -u | while read -r endpoint; do
    # Check if endpoint matches known patterns
    valid="false"
    closest=""
    
    while read -r pattern; do
        if [[ "$endpoint" == *"$pattern"* ]]; then
            valid="true"
            closest="$pattern"
            break
        fi
    done < <(grep -v "^#" "$AUDIT_DIR/akamai-api-patterns.txt")
    
    echo "$endpoint,$valid,$closest" >> "$AUDIT_DIR/endpoint-validation.csv"
done

# Step 10: Generate summary report
echo -e "${YELLOW}[10/10] Generating summary report...${NC}"

cat > "$AUDIT_DIR/AUDIT_SUMMARY.md" << 'EOF'
# Akamai MCP Function Audit Summary

Generated: $(date)

## Overview Statistics
EOF

total_functions=$(wc -l < "$AUDIT_DIR/all-functions.txt")
orphaned_count=$(wc -l < "$AUDIT_DIR/orphaned-functions.txt")
suspicious_count=$(($(wc -l < "$AUDIT_DIR/suspicious-patterns.csv") - 1))
no_test_count=$(grep -c ",false," "$AUDIT_DIR/test-coverage.csv" || echo "0")
invalid_endpoints=$(grep -c ",false," "$AUDIT_DIR/endpoint-validation.csv" || echo "0")

cat >> "$AUDIT_DIR/AUDIT_SUMMARY.md" << EOF

- **Total Functions**: $total_functions
- **Orphaned Functions** (no API calls): $orphaned_count
- **Suspicious Patterns Found**: $suspicious_count
- **Functions Without Tests**: $no_test_count
- **Invalid API Endpoints**: $invalid_endpoints

## Critical Issues

### 1. Orphaned Functions (Potential Fakes)
EOF

if [ -s "$AUDIT_DIR/orphaned-functions.txt" ]; then
    echo '```' >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    cat "$AUDIT_DIR/orphaned-functions.txt" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    echo '```' >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
else
    echo "None found." >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
fi

cat >> "$AUDIT_DIR/AUDIT_SUMMARY.md" << 'EOF'

### 2. Invalid API Endpoints
EOF

if [ "$invalid_endpoints" -gt 0 ]; then
    echo '```' >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    grep ",false," "$AUDIT_DIR/endpoint-validation.csv" | cut -d, -f1 >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    echo '```' >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
else
    echo "All endpoints appear valid." >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
fi

cat >> "$AUDIT_DIR/AUDIT_SUMMARY.md" << 'EOF'

### 3. Suspicious Code Patterns
EOF

if [ "$suspicious_count" -gt 0 ]; then
    echo "" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    echo "| Pattern | Count |" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    echo "|---------|-------|" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    tail -n +2 "$AUDIT_DIR/suspicious-patterns.csv" | cut -d, -f1 | sort | uniq -c | while read -r count pattern; do
        echo "| $pattern | $count |" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
    done
else
    echo "No suspicious patterns found." >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
fi

# Generate deletion candidates
echo -e "\n## Recommended Deletions\n" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"

# Combine criteria for deletion
{
    # Orphaned functions
    cat "$AUDIT_DIR/orphaned-functions.txt" | while read -r func; do
        grep ":$func$" "$AUDIT_DIR/functions-raw.txt" | while IFS=: read -r file line func_name; do
            echo "DELETE:orphaned:$file:$func_name"
        done
    done
    
    # Functions with invalid endpoints
    grep ",false," "$AUDIT_DIR/endpoint-validation.csv" | cut -d, -f1 | while read -r endpoint; do
        grep ",$endpoint," "$AUDIT_DIR/function-api-map.csv" | cut -d, -f1,2 | while IFS=, read -r file func; do
            echo "DELETE:invalid_api:$file:$func"
        done
    done
    
    # Functions with suspicious patterns
    grep -i "fake\|mock\|deprecated" "$AUDIT_DIR/suspicious-patterns.csv" | cut -d, -f2 | sort -u | while read -r file; do
        grep "^$file:" "$AUDIT_DIR/functions-raw.txt" | while IFS=: read -r f line func; do
            echo "DELETE:suspicious:$file:$func"
        done
    done
} | sort -u > "$AUDIT_DIR/deletion-candidates.txt"

echo '```bash' >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
echo "# Functions recommended for deletion:" >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
cut -d: -f4 "$AUDIT_DIR/deletion-candidates.txt" | sort -u >> "$AUDIT_DIR/AUDIT_SUMMARY.md"
echo '```' >> "$AUDIT_DIR/AUDIT_SUMMARY.md"

# Final output
echo ""
echo -e "${GREEN}=== Audit Complete ===${NC}"
echo ""
echo "Results saved to: $AUDIT_DIR/"
echo ""
echo "Key files:"
echo "  - AUDIT_SUMMARY.md: Executive summary"
echo "  - function-api-map.csv: Function to API mapping"
echo "  - orphaned-functions.txt: Functions with no API calls"
echo "  - deletion-candidates.txt: Recommended deletions"
echo "  - test-coverage.csv: Test coverage analysis"
echo ""
echo -e "${YELLOW}Next step: Review $AUDIT_DIR/AUDIT_SUMMARY.md${NC}"
