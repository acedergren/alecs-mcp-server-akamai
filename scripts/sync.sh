#!/bin/bash

# Quick sync script for Akamai MCP
# Adds all changes, commits with timestamp, and pushes

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Quick Sync for Akamai MCP${NC}"

# Generate commit message with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
DEFAULT_MSG="Update: $TIMESTAMP"

# Check for custom message
if [ -n "$1" ]; then
    MSG="$1"
else
    MSG="$DEFAULT_MSG"
fi

# Add all changes
git add -A

# Commit
git commit -m "$MSG

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push
echo -e "${YELLOW}🚀 Pushing to remote...${NC}"
git push origin main

echo -e "${GREEN}✅ Sync complete!${NC}"