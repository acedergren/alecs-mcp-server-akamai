#!/bin/bash

# Archive old test files to clean up the test directory
# Keeps only smoke/, critical/, and README.md

echo "🧹 Archiving old test files..."

# Create archive directory for tests
mkdir -p archive/__tests__

# Find all test files NOT in smoke/ or critical/ directories
find __tests__ -type f -name "*.test.ts" -o -name "*.test.js" | \
  grep -v "__tests__/smoke/" | \
  grep -v "__tests__/critical/" | \
  while read -r file; do
    # Get the directory structure
    dir=$(dirname "$file")
    dir_archive="archive/$dir"
    
    # Create the archive directory structure
    mkdir -p "$dir_archive"
    
    # Move the file
    echo "Moving $file -> archive/$file"
    git mv "$file" "archive/$file" 2>/dev/null || mv "$file" "archive/$file"
  done

# Move any remaining non-test files (except README.md)
find __tests__ -type f ! -name "README.md" | \
  grep -v "__tests__/smoke/" | \
  grep -v "__tests__/critical/" | \
  while read -r file; do
    dir=$(dirname "$file")
    dir_archive="archive/$dir"
    mkdir -p "$dir_archive"
    echo "Moving $file -> archive/$file"
    git mv "$file" "archive/$file" 2>/dev/null || mv "$file" "archive/$file"
  done

# Move empty directories
find __tests__ -type d -empty -delete

echo "✅ Old tests archived!"
echo ""
echo "Remaining test structure:"
find __tests__ -type f | sort