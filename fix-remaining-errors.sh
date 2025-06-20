#!/bin/bash

echo "Fixing remaining TypeScript errors..."

# Fix error references in utils/errors.ts
echo "Fixing src/utils/errors.ts..."
sed -i 's/if (error\./if (_error./g' src/utils/errors.ts
sed -i 's/\.push(error\./\.push(_error./g' src/utils/errors.ts
sed -i 's/= error\./= _error./g' src/utils/errors.ts
sed -i 's/(error)/(\_error)/g' src/utils/errors.ts
sed -i 's/ error\./ _error./g' src/utils/errors.ts

# Fix request references in oauth-resource-indicators.ts
echo "Fixing src/utils/oauth-resource-indicators.ts..."
sed -i 's/request\./\_request./g' src/utils/oauth-resource-indicators.ts
sed -i 's/ request\./ _request./g' src/utils/oauth-resource-indicators.ts
sed -i 's/{request}/{\_request}/g' src/utils/oauth-resource-indicators.ts

# Fix options references in progress.ts
echo "Fixing src/utils/progress.ts..."
sed -i 's/options\./\_options./g' src/utils/progress.ts
sed -i 's/ options\./ _options./g' src/utils/progress.ts

# Fix consecutiveFailures typo in resilience-manager.ts
echo "Fixing src/utils/resilience-manager.ts..."
sed -i 's/consecutiveFailu_res/consecutiveFailures/g' src/utils/resilience-manager.ts

# Fix catch blocks in all files
echo "Fixing catch blocks..."
find src -name "*.ts" -type f -exec perl -i -pe 's/catch\s*\(\s*error\s*\)/catch (_error)/g' {} \;
find src -name "*.ts" -type f -exec perl -i -pe 's/catch\s*\(\s*err\s*\)/catch (_err)/g' {} \;

# Fix remaining error references inside catch blocks
echo "Fixing error references inside catch blocks..."
find src -name "*.ts" -type f | while read file; do
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Process the file line by line
    in_catch=0
    while IFS= read -r line; do
        # Check if we're entering a catch block
        if echo "$line" | grep -q "catch\s*(\s*_error\s*)"; then
            in_catch=1
            echo "$line" >> "$temp_file"
            continue
        elif echo "$line" | grep -q "catch\s*(\s*_err\s*)"; then
            in_catch=1
            echo "$line" >> "$temp_file"
            continue
        fi
        
        # Check if we're exiting the catch block (simple heuristic)
        if [ $in_catch -eq 1 ] && echo "$line" | grep -q "^\s*}\s*$"; then
            in_catch=0
        fi
        
        # Replace error references inside catch blocks
        if [ $in_catch -eq 1 ]; then
            # Replace standalone 'error' with '_error'
            line=$(echo "$line" | sed -E 's/([^_a-zA-Z])error([^a-zA-Z])/\1_error\2/g')
            line=$(echo "$line" | sed -E 's/^error([^a-zA-Z])/_error\1/g')
            line=$(echo "$line" | sed -E 's/([^_a-zA-Z])error$/_error/g')
        fi
        
        echo "$line" >> "$temp_file"
    done < "$file"
    
    # Replace the original file
    mv "$temp_file" "$file"
done

# Fix specific files mentioned in CI logs
echo "Fixing specific error patterns..."

# Fix mcp-2025-migration.ts
sed -i 's/console\.error(error)/console.error(_error)/g' src/utils/mcp-2025-migration.ts
sed -i 's/\.log(error)/\.log(_error)/g' src/utils/mcp-2025-migration.ts

# Fix performance-monitor.ts
sed -i 's/{request}/{_request}/g' src/utils/performance-monitor.ts
sed -i 's/request,/_request,/g' src/utils/performance-monitor.ts

# Fix parameter-validation.ts - ensure proper typing for catch parameter
sed -i 's/catch (err)/catch (_err: any)/g' src/utils/parameter-validation.ts

# Fix tool-error-handling.ts
sed -i 's/(error, context)/(\_error, _context)/g' src/utils/tool-error-handling.ts

echo "Fixes applied. Running type check..."
npm run typecheck