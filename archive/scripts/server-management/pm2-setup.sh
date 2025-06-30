#!/bin/bash

# PM2 Setup Script for MCP Akamai Server

echo "Setting up PM2 for MCP Akamai Server..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing globally..."
    npm install -g pm2
fi

# Build the project first
echo "Building project..."
npm run build

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing PM2 processes
echo "Stopping existing PM2 processes..."
pm2 stop all || true
pm2 delete all || true

# Start the services based on the argument
case "$1" in
    "full")
        echo "Starting full MCP server..."
        pm2 start ecosystem.config.js --only mcp-akamai-full
        ;;
    "essentials")
        echo "Starting essentials MCP server..."
        pm2 start ecosystem.config.js --only mcp-akamai-essentials
        ;;
    "modular")
        echo "Starting modular MCP servers..."
        pm2 start ecosystem.config.js --only "mcp-akamai-property,mcp-akamai-dns,mcp-akamai-security"
        ;;
    "all")
        echo "Starting all MCP servers..."
        pm2 start ecosystem.config.js
        ;;
    *)
        echo "Usage: $0 {full|essentials|modular|all}"
        echo "  full       - Start the full MCP server"
        echo "  essentials - Start the essentials MCP server"
        echo "  modular    - Start property, DNS, and security servers"
        echo "  all        - Start all servers"
        exit 1
        ;;
esac

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 startup script..."
pm2 startup systemd -u $USER --hp $HOME

# Show status
echo "PM2 Status:"
pm2 status

echo "Setup complete! Use 'pm2 logs' to view logs or 'pm2 monit' for monitoring."