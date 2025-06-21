#!/bin/bash

echo "Fixing specific TypeScript compilation errors..."

# First, let's fix the broken regex substitutions that caused syntax errors
find src -type f -name "*.ts" -exec sed -i 's/console\.error(error));/console.error(`[${analysisId}] Analysis failed:`, error);/g' {} \;

# Fix the parameter name conflicts more carefully
find src -type f -name "*.ts" -exec sed -i 's/}: string {$/}: string {/g' {} \;

# Fix missing variable declarations
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''options'\''/options/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''err'\''/error/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''res'\''/response/g' {} \;

# Fix method access issues
find src -type f -name "*.ts" -exec sed -i 's/client\.request(/client._request(/g' {} \;

# Clean up artifacts from the previous script
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name error/error/g' {} \;

# Fix the _error vs error parameter issues specifically
find src -type f -name "*.ts" -exec sed -i 's/catch (_error) {$/catch (error) {/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/throw _error;$/throw error;/g' {} \;

echo "Fixed specific TypeScript errors. Running typecheck..."
npm run typecheck