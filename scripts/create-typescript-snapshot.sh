#!/bin/bash

# Create TypeScript state snapshot before fixes
# This allows us to compare behavior before and after

set -e

SNAPSHOT_DIR="typescript-snapshot-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"

echo "📸 Creating TypeScript snapshot..."

# 1. Capture current error state
echo "  Capturing error state..."
npm run typecheck 2>&1 > "$SNAPSHOT_DIR/typescript-errors.txt" || true

# 2. Count errors by type
echo "  Analyzing error patterns..."
grep "error TS" "$SNAPSHOT_DIR/typescript-errors.txt" | awk '{print $3}' | sort | uniq -c | sort -nr > "$SNAPSHOT_DIR/error-counts.txt"

# 3. List all TypeScript files
echo "  Listing TypeScript files..."
find src -name "*.ts" -o -name "*.tsx" | sort > "$SNAPSHOT_DIR/typescript-files.txt"

# 4. Capture tsconfig state
echo "  Saving TypeScript configuration..."
cp tsconfig*.json "$SNAPSHOT_DIR/"

# 5. Generate type declaration files (if possible)
echo "  Attempting to generate declarations..."
npx tsc --declaration --emitDeclarationOnly --outDir "$SNAPSHOT_DIR/types" 2>&1 > "$SNAPSHOT_DIR/declaration-errors.txt" || true

# 6. Save current git state
echo "  Recording git state..."
git log --oneline -10 > "$SNAPSHOT_DIR/git-log.txt"
git status --short > "$SNAPSHOT_DIR/git-status.txt"

# 7. Create summary
echo "  Creating summary..."
cat > "$SNAPSHOT_DIR/README.md" << EOF
# TypeScript Snapshot

Created: $(date)
Branch: $(git branch --show-current)
Commit: $(git rev-parse --short HEAD)

## Error Summary
Total Errors: $(grep -c "error TS" "$SNAPSHOT_DIR/typescript-errors.txt" || echo "0")

## Top Error Types
$(head -10 "$SNAPSHOT_DIR/error-counts.txt")

## File Count
Total TypeScript files: $(wc -l < "$SNAPSHOT_DIR/typescript-files.txt")

## Purpose
This snapshot captures the TypeScript state before continuing fixes.
Use this to verify no regression in type safety after changes.
EOF

echo "✅ Snapshot created in: $SNAPSHOT_DIR"
echo ""
echo "Next steps:"
echo "1. Review $SNAPSHOT_DIR/README.md"
echo "2. Keep this directory for rollback reference"
echo "3. Continue with TypeScript fixes"