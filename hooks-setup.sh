#!/bin/bash
# ALECS MCP Server - Claude Hooks Setup Script
# This script sets up Claude hooks for the project

set -e

echo "🚀 Setting up Claude hooks for ALECS MCP Server..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Claude settings directory exists
CLAUDE_DIR="$HOME/.claude"
if [ ! -d "$CLAUDE_DIR" ]; then
    echo -e "${YELLOW}Creating Claude settings directory...${NC}"
    mkdir -p "$CLAUDE_DIR"
fi

# Backup existing settings if they exist
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
    echo -e "${YELLOW}Backing up existing settings...${NC}"
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Check if claude-hooks.json exists in the project
HOOKS_FILE="$(dirname "$0")/claude-hooks.json"
if [ ! -f "$HOOKS_FILE" ]; then
    echo -e "${RED}Error: claude-hooks.json not found in project directory${NC}"
    exit 1
fi

# Create or update settings.json
echo -e "${GREEN}Installing hooks configuration...${NC}"

# If settings.json exists, we need to merge hooks
if [ -f "$SETTINGS_FILE" ]; then
    # Use jq to merge if available, otherwise manual merge
    if command -v jq &> /dev/null; then
        echo "Using jq to merge settings..."
        # Extract hooks from our config
        jq '.hooks' "$HOOKS_FILE" > /tmp/alecs-hooks.json
        # Merge with existing settings
        jq '.hooks = $hooks' --slurpfile hooks /tmp/alecs-hooks.json "$SETTINGS_FILE" > /tmp/merged-settings.json
        mv /tmp/merged-settings.json "$SETTINGS_FILE"
        rm /tmp/alecs-hooks.json
    else
        echo -e "${YELLOW}jq not found. Creating new settings file with hooks...${NC}"
        cp "$HOOKS_FILE" "$SETTINGS_FILE"
    fi
else
    # No existing settings, just copy our hooks config
    cp "$HOOKS_FILE" "$SETTINGS_FILE"
fi

echo -e "${GREEN}✅ Hooks installed successfully!${NC}"
echo ""
echo "Installed hooks:"
echo "  - SonarQube integration for git commits and pushes"
echo "  - TypeScript compilation check on file edits"
echo "  - Documentation header enforcement for tools"
echo "  - Multi-customer parameter validation"
echo "  - API response validation checks"
echo "  - Security checks for credentials"
echo "  - Git operations warnings"
echo "  - Audit notifications"
echo "  - Cleanup reminders on stop"
echo ""
echo -e "${YELLOW}To activate: Restart Claude Code or reload settings${NC}"
echo ""
echo "Test the hooks by:"
echo "  1. Editing a TypeScript file with errors"
echo "  2. Creating a new tool without documentation"
echo "  3. Running a command with 'cat .edgerc'"
echo "  4. Making a git commit to trigger SonarQube analysis"
echo ""
echo -e "${YELLOW}SonarQube Setup:${NC}"
echo "  1. Install scanner: brew install sonar-scanner"
echo "  2. Set token: export SONAR_TOKEN=your-token"
echo "  3. Run: ./scripts/sonarqube-integration.sh"
echo ""
echo -e "${GREEN}Happy coding with enhanced safety and quality! 🛡️${NC}"