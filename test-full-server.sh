#!/bin/bash

echo "Testing ALECS Full Server startup..."

# Create a test input to initialize the server
cat << 'EOF' | timeout 5s node /Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai/dist/index-full.js 2>&1
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{}}}
EOF

exit_code=$?

if [ $exit_code -eq 124 ]; then
    echo "Server started successfully (timed out waiting for input - expected behavior)"
    exit 0
elif [ $exit_code -eq 0 ]; then
    echo "Server processed initialize request"
    exit 0
else
    echo "Server failed to start with exit code: $exit_code"
    exit 1
fi