#!/usr/bin/env python3

import re
import os

def fix_file_syntax_errors(file_path):
    """Fix common syntax errors in TypeScript files."""
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix JSON.stringify syntax errors
    content = re.sub(r'JSON\.stringify\(([^)]+),\s*$', r'JSON.stringify(\1),', content, flags=re.MULTILINE)
    
    # Fix object literal returns in arrow functions - missing closing parentheses
    content = re.sub(r'(\s+[a-zA-Z_][a-zA-Z0-9_]*:\s*\([^)]*\)\s*=>\s*\{[^}]*\}),\s*$', r'\1),', content, flags=re.MULTILINE)
    
    # Fix missing closing parentheses in function definitions
    content = re.sub(r'(\s+[a-zA-Z_][a-zA-Z0-9_]*:\s*\([^)]*\)\s*=>\s*\([^)]*\{[^}]*\}),\s*$', r'\1)),', content, flags=re.MULTILINE)
    
    # Fix broken logger statements
    content = re.sub(r'logger\._error(["\'])\s*,\s*\{\s*_error\.message\s*\}', r'logger.error(`Error: ${_error.message}`)', content)
    
    # Fix missing commas in object literals
    content = re.sub(r'(\w+:\s*[^,}\n]+)\s*\n\s*(\w+:)', r'\1,\n    \2', content)
    
    # Fix broken catch blocks
    content = re.sub(r'catch\s*\(\s*error\s*\)', r'catch (_error)', content)
    
    # Fix malformed arrow function returns
    content = re.sub(r'(\w+:\s*\([^)]*\)\s*=>\s*\([^}]*)\},\s*$', r'\1}),', content, flags=re.MULTILINE)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed syntax errors in {file_path}")
        return True
    else:
        print(f"No syntax errors found in {file_path}")
        return False

def main():
    files_to_fix = [
        'src/testing/test-utils.ts',
        'src/tools/analysis/cx-impact-analyzer.ts',
        'src/tools/analysis/fix-strategy.ts',
        'src/tools/analysis/intelligent-bug-analyzer-broken.ts',
        'src/utils/response-parsing.ts'
    ]
    
    fixed_count = 0
    for file_path in files_to_fix:
        if fix_file_syntax_errors(file_path):
            fixed_count += 1
    
    print(f"\nFixed syntax errors in {fixed_count} files")

if __name__ == "__main__":
    main()