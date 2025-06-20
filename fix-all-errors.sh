#!/bin/bash

echo "Fixing all remaining error references..."

# Fix error references in all TypeScript files
find src -name "*.ts" -type f | while read file; do
    # Fix catch blocks
    sed -i 's/} catch (error)/} catch (_error)/g' "$file"
    sed -i 's/} catch (err)/} catch (_err)/g' "$file"
    
    # Fix error references inside code
    sed -i 's/throw error;/throw _error;/g' "$file"
    sed -i 's/throw error/throw _error/g' "$file"
    sed -i 's/console.error(error)/console.error(_error)/g' "$file"
    sed -i 's/console.log(error)/console.log(_error)/g' "$file"
    sed -i 's/logger.error.*{error/logger.error", { _error/g' "$file"
    
    # Fix error in string templates - needs more complex regex
    perl -i -pe 's/\$\{error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*String\(error\)\}/\${_error instanceof Error ? _error.message : String(_error)}/g' "$file"
    perl -i -pe 's/\berror\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*String\(error\)/_error instanceof Error ? _error.message : String(_error)/g' "$file"
    
    # Fix standalone error references (being careful not to break valid code)
    perl -i -pe 's/([^_a-zA-Z])error\./$1_error./g' "$file"
    perl -i -pe 's/([^_a-zA-Z])error\s+instanceof/$1_error instanceof/g' "$file"
    perl -i -pe 's/String\(error\)/String(_error)/g' "$file"
    perl -i -pe 's/\(error\)/(_error)/g' "$file"
    
    # Fix specific patterns in reporting-tools.ts
    if [[ "$file" == *"reporting-tools.ts"* ]]; then
        sed -i 's/logger.error/logger._error/g' "$file"
        sed -i 's/error:/\_error:/g' "$file"
    fi
done

echo "All error references fixed!"