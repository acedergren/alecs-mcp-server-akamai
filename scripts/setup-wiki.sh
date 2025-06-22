#!/bin/bash
# Script to set up GitHub Wiki

echo "Setting up ALECS GitHub Wiki..."

# Clone the wiki repository
WIKI_REPO="https://github.com/acedergren/alecs-mcp-server-akamai.wiki.git"
WIKI_DIR="../alecs-mcp-server-akamai.wiki"

# Check if wiki directory exists
if [ -d "$WIKI_DIR" ]; then
    echo "Wiki directory already exists. Updating..."
    cd "$WIKI_DIR"
    git pull
else
    echo "Cloning wiki repository..."
    cd ..
    git clone "$WIKI_REPO"
    cd "alecs-mcp-server-akamai.wiki"
fi

# Copy wiki pages
echo "Copying wiki pages..."
cp ../alecs-mcp-server-akamai/wiki/*.md .

# Add and commit
git add -A
git commit -m "Update wiki documentation

- Add comprehensive documentation structure
- Include installation, API reference, security guides
- Add troubleshooting and roadmap pages
- Improve navigation and cross-references"

# Push to GitHub
echo "Pushing to GitHub Wiki..."
git push

echo "Wiki setup complete!"
echo "View at: https://github.com/acedergren/alecs-mcp-server-akamai/wiki"