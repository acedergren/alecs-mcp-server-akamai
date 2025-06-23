#!/bin/bash

# Start the WebSocket server and show summary

echo "Starting ALECS WebSocket MCP Server..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Start the WebSocket server
pm2 start ecosystem.config.js --only mcp-akamai-websocket

# Wait for server to start
echo "Waiting for server to initialize..."
sleep 3

# Check if server started successfully
if pm2 status | grep -q "mcp-akamai-websocket.*online"; then
    # Show the summary
    node scripts/show-connection-summary.js
else
    echo "❌ Failed to start WebSocket server. Check logs with: pm2 logs mcp-akamai-websocket"
    exit 1
fi