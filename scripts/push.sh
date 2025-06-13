#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Akamai MCP Git Push Script${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo -e "${GREEN}📍 Current branch:${NC} $BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " MESSAGE
        git add -A
        git commit -m "$MESSAGE

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        echo -e "${RED}❌ Push cancelled - uncommitted changes${NC}"
        exit 1
    fi
fi

# Show recent commits
echo ""
echo -e "${GREEN}📜 Recent commits:${NC}"
git log --oneline -5
echo ""

# Confirm push
read -p "Push to origin/$BRANCH? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Push cancelled${NC}"
    exit 1
fi

# Push to remote
echo -e "${YELLOW}🚀 Pushing to origin/$BRANCH...${NC}"
if git push origin "$BRANCH"; then
    echo -e "${GREEN}✅ Successfully pushed to origin/$BRANCH${NC}"
    echo ""
    echo -e "${GREEN}📊 Repository status:${NC}"
    git log --oneline -1
    echo -e "Remote: $(git remote get-url origin)"
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi