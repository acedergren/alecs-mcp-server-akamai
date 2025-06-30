#\!/bin/bash

echo "function_name,endpoint,method,status"

# For each tools file
for file in src/tools/*.ts; do
  # Extract functions and their line numbers
  grep -n "export\s\+\(async\s\+\)\?function\|export\s\+const.*=" "$file" 2>/dev/null | while IFS=: read -r linenum content; do
    # Extract function name
    if echo "$content" | grep -q "export\s\+\(async\s\+\)\?function"; then
      funcname=$(echo "$content" | sed -E 's/.*export\s+(async\s+)?function\s+([a-zA-Z0-9_]+).*/\2/')
    elif echo "$content" | grep -q "export\s\+const.*="; then
      funcname=$(echo "$content" | sed -E 's/.*export\s+const\s+([a-zA-Z0-9_]+)\s*=.*/\1/')
    else
      continue
    fi
    
    # Look for client.request within the function (next 100 lines)
    endpoint_found=false
    tail -n +$linenum "$file" | head -n 100 | grep -E "client\.request|path:\s*[\`'\"]|method:\s*[\`'\"]" | while read -r api_line; do
      if echo "$api_line" | grep -q "path:"; then
        endpoint=$(echo "$api_line" | sed -E "s/.*path:\s*[\`'\"]([^'\"\`]+).*/\1/")
        method=$(tail -n +$linenum "$file" | head -n 100 | grep -A5 -B5 "path.*$endpoint" | grep "method:" | head -1 | sed -E "s/.*method:\s*[\`'\"]([^'\"\`]+).*/\1/")
        if [ \! -z "$endpoint" ]; then
          echo "$funcname,$endpoint,$method,FOUND"
          endpoint_found=true
          break
        fi
      fi
    done
    
    # If no endpoint found, mark as ORPHANED
    if [ "$endpoint_found" = false ]; then
      echo "$funcname,NONE,NONE,ORPHANED"
    fi
  done
done | sort -u
