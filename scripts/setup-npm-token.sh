#!/bin/bash

# Setup NPM Token for Publishing
# This script helps configure npm authentication for publishing

echo "🔐 NPM Token Setup for ALECS Publishing"
echo "======================================="
echo ""
echo "This script will help you configure npm authentication for publishing."
echo ""
echo "Prerequisites:"
echo "1. npm account at https://www.npmjs.com"
echo "2. Authentication token from npm (generate at https://www.npmjs.com/settings/YOUR_USERNAME/tokens)"
echo ""

# Check if already configured
if npm whoami >/dev/null 2>&1; then
    CURRENT_USER=$(npm whoami)
    echo "✅ Currently authenticated as: $CURRENT_USER"
    echo ""
    read -p "Do you want to reconfigure? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping current configuration."
        exit 0
    fi
fi

# Prompt for token
echo ""
echo "Please enter your npm authentication token:"
echo "(Generate one at: https://www.npmjs.com/settings/YOUR_USERNAME/tokens)"
echo ""
read -s -p "Token: " NPM_TOKEN
echo ""

if [ -z "$NPM_TOKEN" ]; then
    echo "❌ Error: Token cannot be empty"
    exit 1
fi

# Configure npm
echo ""
echo "Configuring npm..."

# Set the auth token
npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"

# Verify authentication
echo ""
echo "Verifying authentication..."
if npm whoami >/dev/null 2>&1; then
    USER=$(npm whoami)
    echo "✅ Successfully authenticated as: $USER"
    echo ""
    echo "You can now publish packages using:"
    echo "  npm publish"
    echo ""
    echo "For GitHub Actions, add this token as a secret:"
    echo "  Repository Settings → Secrets → Actions → New repository secret"
    echo "  Name: NPM_TOKEN"
    echo "  Value: [your token]"
else
    echo "❌ Authentication failed. Please check your token and try again."
    exit 1
fi