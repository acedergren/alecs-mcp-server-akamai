#!/bin/bash

echo "Fixing logger.error calls in service files..."

# Fix broken logger.error syntax patterns
find src/services -name "*.ts" -type f | while read file; do
    # Fix patterns like: logger.error", { _error.message}`);
    sed -i 's/logger\.error", { _error\.message}`);/logger.error(`Error: ${_error.message}`);/g' "$file"
    
    # Fix patterns like: logger.error", { _error.message, 
    sed -i 's/logger\.error", { _error\.message,/logger.error(`Error: ${_error.message}`,/g' "$file"
    
    # Fix patterns where logger.error has broken quotes
    perl -i -pe 's/logger\.error\", \{ _error/logger.error("Error", { error: _error/g' "$file"
    
    # Fix patterns with backticks that got mangled
    perl -i -pe 's/logger\.error\`([^`]+)\`\);/logger.error(`$1`);/g' "$file"
done

echo "Checking for remaining syntax errors..."
find src/services -name "*.ts" -exec grep -H "logger\.error.*\", {" {} \; || echo "No broken patterns found"

echo "Done!"