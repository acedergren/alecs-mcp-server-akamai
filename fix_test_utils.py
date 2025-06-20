#\!/usr/bin/env python3
import re

# Read the file
with open('src/testing/test-utils.ts', 'r') as f:
    content = f.read()

# Find patterns where we have arrow functions returning object literals
# that end with "},\n" instead of "}),\n"
# This specifically targets the pattern:
# 'function-name': (args) => ({
#   content: [
#     ...
#   ],
# },  <-- should be }),

# Pattern: Look for arrow function patterns that return object literals
# and need to be closed properly
lines = content.split('\n')
fixed_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Check if this line contains an arrow function returning an object literal
    if re.match(r"^\s*'[^']+'\s*:\s*\([^)]*\)\s*=>\s*\(\{", line):
        # This is the start of an arrow function returning an object literal
        # Find the matching closing
        fixed_lines.append(line)
        i += 1
        bracket_count = 1
        paren_count = 1  # We're inside the parentheses of the object literal
        
        while i < len(lines) and (bracket_count > 0 or paren_count > 0):
            current_line = lines[i]
            
            # Count brackets and parentheses
            bracket_count += current_line.count('{') - current_line.count('}')
            
            # Special handling for the closing pattern
            if bracket_count == 0 and current_line.strip() == '},':
                # This should be }),
                fixed_lines.append(current_line.replace('},', '}),'))
                i += 1
                break
            else:
                fixed_lines.append(current_line)
                i += 1
    else:
        fixed_lines.append(line)
        i += 1

# Write the fixed content back
with open('src/testing/test-utils.ts', 'w') as f:
    f.write('\n'.join(fixed_lines))

print("Fixed test-utils.ts")
