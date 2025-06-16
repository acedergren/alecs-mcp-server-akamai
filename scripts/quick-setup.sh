#!/bin/bash

# Quick GitHub Branch Protection Setup
# Run this script to activate branch protection via API

echo "🛡️  GitHub Branch Protection Quick Setup"
echo "========================================"

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not found"
    echo ""
    echo "To get a GitHub token:"
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Give it a name like 'Branch Protection Setup'"
    echo "4. Select 'repo' scope (full control of private repositories)"
    echo "5. Click 'Generate token'"
    echo "6. Copy the token and run:"
    echo ""
    echo "   export GITHUB_TOKEN='your_token_here'"
    echo ""
    echo "Then run this script again:"
    echo "   ./scripts/quick-setup.sh"
    echo ""
    exit 1
fi

echo "✅ GitHub token found"
echo "🚀 Activating branch protection..."
echo ""

# Run the Node.js setup script
node scripts/setup-branch-protection.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Branch protection is now active."
    echo ""
    echo "Test it works:"
    echo "  echo 'test' > test.txt"
    echo "  git add test.txt"
    echo "  git commit -m 'test direct push'"
    echo "  git push origin main  # Should be BLOCKED"
    echo ""
else
    echo ""
    echo "❌ Setup failed. Check the error messages above."
    echo ""
    echo "Manual setup alternative:"
    echo "https://github.com/acedergren/alecs-mcp-server-akamai/settings/branches"
    echo ""
    exit 1
fi