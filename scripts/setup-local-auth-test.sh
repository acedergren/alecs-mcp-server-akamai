#!/bin/bash

# Setup Local Authentication Testing with 1Password
# This script helps developers test authentication locally using 1Password CLI

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
EDGERC_PATH="$HOME/.edgerc"
BACKUP_PATH="$HOME/.edgerc.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🔧 ALECS MCP Server - Local Authentication Setup${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    echo -e "${RED}❌ 1Password CLI not found${NC}"
    echo -e "${YELLOW}Please install 1Password CLI:${NC}"
    echo "  macOS: brew install 1password-cli"
    echo "  Other: https://developer.1password.com/docs/cli/get-started/"
    exit 1
fi

echo -e "${GREEN}✅ 1Password CLI found${NC}"

# Check if signed in to 1Password
if ! op account get > /dev/null 2>&1; then
    echo -e "${YELLOW}🔐 Not signed in to 1Password${NC}"
    echo "Please sign in first:"
    echo "  op signin"
    exit 1
fi

echo -e "${GREEN}✅ Signed in to 1Password${NC}"

# Backup existing .edgerc if it exists
if [[ -f "$EDGERC_PATH" ]]; then
    echo -e "${YELLOW}📋 Backing up existing .edgerc to $BACKUP_PATH${NC}"
    cp "$EDGERC_PATH" "$BACKUP_PATH"
fi

# Function to safely retrieve credential from 1Password
get_credential() {
    local path="$1"
    local description="$2"
    
    echo -e "${BLUE}🔑 Retrieving $description...${NC}"
    
    if credential=$(op read "$path" 2>/dev/null); then
        echo -e "${GREEN}✅ Retrieved $description${NC}"
        echo "$credential"
    else
        echo -e "${RED}❌ Failed to retrieve $description from $path${NC}"
        echo -e "${YELLOW}💡 Make sure the item exists in 1Password with the correct field name${NC}"
        return 1
    fi
}

# Retrieve credentials from 1Password
echo -e "${BLUE}📥 Retrieving Akamai credentials for environment: $ENVIRONMENT${NC}"

CLIENT_TOKEN=$(get_credential "op://akamai-credentials/$ENVIRONMENT/client_token" "client token")
CLIENT_SECRET=$(get_credential "op://akamai-credentials/$ENVIRONMENT/client_secret" "client secret")
ACCESS_TOKEN=$(get_credential "op://akamai-credentials/$ENVIRONMENT/access_token" "access token")
HOST=$(get_credential "op://akamai-credentials/$ENVIRONMENT/host" "host")

# Account switch key is optional
if ACCOUNT_SWITCH_KEY=$(op read "op://akamai-credentials/$ENVIRONMENT/account_switch_key" 2>/dev/null); then
    echo -e "${GREEN}✅ Retrieved account switch key${NC}"
    HAS_ACCOUNT_SWITCH_KEY=true
else
    echo -e "${YELLOW}⚠️  No account switch key found (optional)${NC}"
    HAS_ACCOUNT_SWITCH_KEY=false
fi

# Create .edgerc file
echo -e "${BLUE}📝 Creating .edgerc file...${NC}"

cat > "$EDGERC_PATH" << EOF
[default]
client_token = $CLIENT_TOKEN
client_secret = $CLIENT_SECRET
access_token = $ACCESS_TOKEN
host = $HOST
$(if [[ "$HAS_ACCOUNT_SWITCH_KEY" == "true" ]]; then echo "account-switch-key = $ACCOUNT_SWITCH_KEY"; fi)

[$ENVIRONMENT]
client_token = $CLIENT_TOKEN
client_secret = $CLIENT_SECRET
access_token = $ACCESS_TOKEN
host = $HOST
$(if [[ "$HAS_ACCOUNT_SWITCH_KEY" == "true" ]]; then echo "account-switch-key = $ACCOUNT_SWITCH_KEY"; fi)
EOF

# Set secure permissions
chmod 600 "$EDGERC_PATH"

echo -e "${GREEN}✅ Created .edgerc file with secure permissions${NC}"

# Retrieve OAuth credentials if available (optional)
echo -e "${BLUE}📥 Checking for OAuth credentials...${NC}"

if OAUTH_CLIENT_ID=$(op read "op://oauth-credentials/$ENVIRONMENT/client_id" 2>/dev/null); then
    OAUTH_CLIENT_SECRET=$(get_credential "op://oauth-credentials/$ENVIRONMENT/client_secret" "OAuth client secret")
    OAUTH_INTROSPECTION_ENDPOINT=$(get_credential "op://oauth-credentials/$ENVIRONMENT/introspection_endpoint" "OAuth introspection endpoint")
    
    echo -e "${GREEN}✅ OAuth credentials retrieved${NC}"
    echo -e "${YELLOW}💡 Set these environment variables for OAuth testing:${NC}"
    echo "export OAUTH_ENABLED=true"
    echo "export OAUTH_CLIENT_ID=\"$OAUTH_CLIENT_ID\""
    echo "export OAUTH_CLIENT_SECRET=\"$OAUTH_CLIENT_SECRET\""
    echo "export OAUTH_INTROSPECTION_ENDPOINT=\"$OAUTH_INTROSPECTION_ENDPOINT\""
else
    echo -e "${YELLOW}⚠️  No OAuth credentials found (optional)${NC}"
fi

# Validate .edgerc file
echo -e "${BLUE}🔍 Validating .edgerc file...${NC}"

if [[ -f "$EDGERC_PATH" ]]; then
    lines=$(wc -l < "$EDGERC_PATH")
    echo -e "${GREEN}✅ .edgerc file created with $lines lines${NC}"
    
    # Check for required fields
    for field in "client_token" "client_secret" "access_token" "host"; do
        if grep -q "$field" "$EDGERC_PATH"; then
            echo -e "${GREEN}✅ $field present${NC}"
        else
            echo -e "${RED}❌ $field missing${NC}"
        fi
    done
else
    echo -e "${RED}❌ .edgerc file not created${NC}"
    exit 1
fi

# Test authentication
echo -e "${BLUE}🧪 Testing authentication...${NC}"

if command -v npm &> /dev/null && [[ -f "package.json" ]]; then
    echo -e "${BLUE}Running authentication test...${NC}"
    
    # Build the project first
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Build successful${NC}"
        
        # Run the authentication test
        if npm test -- __tests__/integration/basic-auth-and-contracts.test.ts --silent; then
            echo -e "${GREEN}🎉 Authentication test passed!${NC}"
        else
            echo -e "${YELLOW}⚠️  Authentication test failed - check your credentials${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Build failed - unable to run authentication test${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npm not found or not in project directory - skipping automated test${NC}"
fi

# Summary
echo -e "${BLUE}📋 Summary${NC}"
echo -e "${BLUE}========${NC}"
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e ".edgerc file: ${GREEN}$EDGERC_PATH${NC}"
if [[ -f "$BACKUP_PATH" ]]; then
    echo -e "Backup: ${YELLOW}$BACKUP_PATH${NC}"
fi
echo -e "OAuth: $(if [[ -n "${OAUTH_CLIENT_ID:-}" ]]; then echo -e "${GREEN}Available${NC}"; else echo -e "${YELLOW}Not configured${NC}"; fi)"

echo -e "${BLUE}💡 Next steps:${NC}"
echo "1. Run: npm run build"
echo "2. Run: npm test -- __tests__/integration/basic-auth-and-contracts.test.ts"
echo "3. Test your MCP tools with: npm run dev"

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 To clean up and restore backup:${NC}"
    if [[ -f "$BACKUP_PATH" ]]; then
        echo "  mv '$BACKUP_PATH' '$EDGERC_PATH'"
    else
        echo "  rm '$EDGERC_PATH'"
    fi
}

echo -e "${YELLOW}⚠️  Remember to secure your credentials and avoid committing .edgerc to git${NC}"

# Register cleanup function to run on script exit
trap cleanup EXIT