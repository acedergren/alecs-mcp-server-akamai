#!/bin/bash
# Root cause fixes: proper file descriptor handling, no nested pipes, explicit buffering

set -euo pipefail

AUDIT_DIR="audit-results"
mkdir -p "$AUDIT_DIR"

echo "=== Akamai MCP Function Audit ==="
echo ""

# Fix 1: Process files into arrays first, avoid nested pipes
echo "[1/10] Building file list..."
mapfile -t TS_FILES < <(find src/tools -name "*.ts" -type f)
echo "Found ${#TS_FILES[@]} TypeScript files"

# Fix 2: Extract functions with proper line buffering
echo "[2/10] Extracting exported functions..."
> "$AUDIT_DIR/functions-raw.txt"

for file in "${TS_FILES[@]}"; do
    # Use awk for reliable line processing
    awk '/^export async function/ || /^export function/ || /^export const.*=.*async/ || /^export const.*=.*function/ {
        if (match($0, /function ([a-zA-Z0-9_]+)/, arr)) {
            print FILENAME ":" NR ":" arr[1]
        } else if (match($0, /const ([a-zA-Z0-9_]+)/, arr)) {
            print FILENAME ":" NR ":" arr[1]
        }
    }' "$file" >> "$AUDIT_DIR/functions-raw.txt"
done

total_functions=$(wc -l < "$AUDIT_DIR/functions-raw.txt")
echo "Extracted $total_functions functions"

# Fix 3: Extract API calls without nested reads
echo "[3/10] Mapping functions to API endpoints..."
echo "file,function,endpoint,method" > "$AUDIT_DIR/function-api-map.csv"

# Process each function with controlled scope
while IFS=: read -r file line_num func_name; do
    # Extract function body (50 lines max)
    sed -n "${line_num},$((line_num + 50))p" "$file" > "$AUDIT_DIR/temp_func.txt"
    
    # Find API calls in function body
    if grep -q "client\.request" "$AUDIT_DIR/temp_func.txt"; then
        # Extract path and method
        path=$(grep -o "path:[[:space:]]*['\"\`][^'\"\`]*['\"\`]" "$AUDIT_DIR/temp_func.txt" | head -1 | sed -E "s/path:[[:space:]]*['\"\`]([^'\"\`]*)['\"\`]/\1/")
        method=$(grep -o "method:[[:space:]]*['\"\`][A-Z]*['\"\`]" "$AUDIT_DIR/temp_func.txt" | head -1 | sed -E "s/method:[[:space:]]*['\"\`]([A-Z]*)['\"\`]/\1/")
        
        if [ -n "$path" ]; then
            [ -z "$method" ] && method="GET"
            echo "$file,$func_name,$path,$method" >> "$AUDIT_DIR/function-api-map.csv"
        fi
    fi
done < "$AUDIT_DIR/functions-raw.txt"

rm -f "$AUDIT_DIR/temp_func.txt"

# Fix 4: Known Akamai endpoints
cat > "$AUDIT_DIR/akamai-endpoints.txt" << 'EOF'
/papi/v1/properties
/papi/v1/groups
/papi/v1/contracts
/papi/v1/products
/papi/v1/cpcodes
/papi/v1/edgehostnames
/papi/v1/catalog/behaviors
/config-dns/v2/zones
/config-dns/v2/changelists
/cps/v2/enrollments
/network-list/v2/network-lists
/ccu/v3/invalidate
/ccu/v3/delete
EOF

# Fix 5: Find orphaned functions
echo "[4/10] Finding orphaned functions..."
awk -F: '{print $3}' "$AUDIT_DIR/functions-raw.txt" | sort -u > "$AUDIT_DIR/all-functions.txt"
awk -F, 'NR>1 {print $2}' "$AUDIT_DIR/function-api-map.csv" | sort -u > "$AUDIT_DIR/functions-with-apis.txt"
comm -23 "$AUDIT_DIR/all-functions.txt" "$AUDIT_DIR/functions-with-apis.txt" > "$AUDIT_DIR/orphaned-functions.txt"

# Fix 6: Validate endpoints
echo "[5/10] Validating API endpoints..."
echo "endpoint,valid" > "$AUDIT_DIR/endpoint-validation.csv"

awk -F, 'NR>1 {print $3}' "$AUDIT_DIR/function-api-map.csv" | sort -u | while read -r endpoint; do
    valid="false"
    while IFS= read -r pattern; do
        if [[ "$endpoint" == *"$pattern"* ]]; then
            valid="true"
            break
        fi
    done < "$AUDIT_DIR/akamai-endpoints.txt"
    echo "$endpoint,$valid" >> "$AUDIT_DIR/endpoint-validation.csv"
done

# Fix 7: Find suspicious patterns
echo "[6/10] Detecting suspicious patterns..."
> "$AUDIT_DIR/suspicious-patterns.txt"

for file in "${TS_FILES[@]}"; do
    grep -Hn "TODO\|FIXME\|HACK\|deprecated\|fake\|mock\|not.*implemented" "$file" 2>/dev/null >> "$AUDIT_DIR/suspicious-patterns.txt" || true
done

# Generate summary
orphaned_count=$(wc -l < "$AUDIT_DIR/orphaned-functions.txt")
invalid_count=$(grep -c ",false$" "$AUDIT_DIR/endpoint-validation.csv" || echo 0)
suspicious_count=$(wc -l < "$AUDIT_DIR/suspicious-patterns.txt")

cat > "$AUDIT_DIR/AUDIT_SUMMARY.md" << EOF
# Function Audit Results

## Metrics
- Total Functions: $total_functions
- Orphaned Functions: $orphaned_count
- Invalid Endpoints: $invalid_count
- Suspicious Patterns: $suspicious_count

## Deletion Candidates

### Orphaned Functions (no API calls)
$(cat "$AUDIT_DIR/orphaned-functions.txt")

### Invalid API Endpoints
$(grep ",false$" "$AUDIT_DIR/endpoint-validation.csv" | cut -d, -f1)

### Files with Issues
$(cut -d: -f1 "$AUDIT_DIR/suspicious-patterns.txt" | sort -u)
EOF

echo ""
echo "Audit complete. Results in $AUDIT_DIR/AUDIT_SUMMARY.md"
