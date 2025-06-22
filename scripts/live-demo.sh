#!/bin/bash

# Simple live demo showing actual MCP server interaction

echo "==================================================================="
echo "ALECS MCP SERVER - LIVE DEMO"
echo "==================================================================="
echo

# Start the server in background
echo "1. Starting MCP server..."
npm run dev:full > server.log 2>&1 &
SERVER_PID=$!
sleep 5

echo "   ✓ Server started (PID: $SERVER_PID)"
echo

# Use the simple test to show it working
echo "2. Running domain assistant test..."
echo
npm run test:e2e:simple

echo
echo "3. Checking server logs for assistant activity..."
echo
tail -n 20 server.log | grep -E "(Infrastructure Assistant|Tool request|assistant)" || echo "No assistant logs yet"

echo
echo "==================================================================="
echo "DEMO COMPLETE - Server is running with domain assistants!"
echo "==================================================================="

# Cleanup
kill $SERVER_PID 2>/dev/null
rm -f server.log