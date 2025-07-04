#!/bin/bash

# Setup script for SonarCloud GitHub Actions integration
# This script helps configure the necessary secrets and settings

echo "🚀 SonarCloud GitHub Actions Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo "📋 Prerequisites:"
echo "1. SonarCloud account linked to GitHub"
echo "2. Project created in SonarCloud"
echo "3. SONAR_TOKEN generated from SonarCloud"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "Repository: ${GREEN}$REPO${NC}"
echo ""

# Check for existing secrets
echo "🔍 Checking existing secrets..."
EXISTING_SECRETS=$(gh secret list)

# Check if SONAR_TOKEN exists
if echo "$EXISTING_SECRETS" | grep -q "SONAR_TOKEN"; then
    echo -e "${YELLOW}⚠️  SONAR_TOKEN already exists${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_TOKEN
else
    echo -e "${RED}❌ SONAR_TOKEN not found${NC}"
    UPDATE_TOKEN="y"
fi

if [[ "$UPDATE_TOKEN" == "y" ]]; then
    echo ""
    echo "📝 Please enter your SonarCloud token"
    echo "   (Get it from: https://sonarcloud.io/account/security)"
    read -s -p "SONAR_TOKEN: " SONAR_TOKEN
    echo ""
    
    if [[ -z "$SONAR_TOKEN" ]]; then
        echo -e "${RED}❌ Token cannot be empty${NC}"
        exit 1
    fi
    
    # Set the secret
    echo "$SONAR_TOKEN" | gh secret set SONAR_TOKEN
    echo -e "${GREEN}✅ SONAR_TOKEN secret created/updated${NC}"
fi

# Create branch protection rules
echo ""
echo "🛡️  Setting up branch protection rules..."
read -p "Do you want to set up branch protection for 'main'? (y/n): " SETUP_PROTECTION

if [[ "$SETUP_PROTECTION" == "y" ]]; then
    # This requires GitHub API v3 as gh doesn't support branch protection yet
    echo "Creating branch protection rule..."
    
    OWNER=$(echo $REPO | cut -d'/' -f1)
    REPO_NAME=$(echo $REPO | cut -d'/' -f2)
    
    curl -X PUT \
        -H "Authorization: token $(gh auth token)" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$OWNER/$REPO_NAME/branches/main/protection" \
        -d '{
            "required_status_checks": {
                "strict": true,
                "contexts": ["SonarCloud Analysis", "Quality Gate Enforcement"]
            },
            "enforce_admins": false,
            "required_pull_request_reviews": {
                "required_approving_review_count": 1,
                "dismiss_stale_reviews": true
            },
            "restrictions": null
        }' > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Branch protection rules created${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not create branch protection rules automatically${NC}"
        echo "   Please set them up manually in GitHub settings"
    fi
fi

# Create .github/dependabot.yml for security updates
echo ""
echo "🤖 Setting up Dependabot..."
cat > .github/dependabot.yml << 'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "acedergren"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore"
      include: "scope"
  
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "github-actions"
      - "automated"
EOF

echo -e "${GREEN}✅ Dependabot configuration created${NC}"

# Update package.json scripts
echo ""
echo "📝 Updating package.json scripts..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add coverage script if not exists
if (!pkg.scripts['test:coverage']) {
  pkg.scripts['test:coverage'] = 'jest --coverage --coverageReporters=lcov';
}

// Add lint:fix script if not exists
if (!pkg.scripts['lint:fix']) {
  pkg.scripts['lint:fix'] = 'eslint . --ext .ts --fix';
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
console.log('✅ package.json scripts updated');
"

# Create sonar-project.properties if not exists
if [ ! -f "sonar-project.properties" ]; then
    echo ""
    echo "📝 Creating sonar-project.properties..."
    cat > sonar-project.properties << 'EOF'
# SonarCloud Project Configuration
sonar.projectKey=acedergren_alecs-mcp-server-akamai
sonar.organization=acedergren

# Project metadata
sonar.projectName=ALECS MCP Server for Akamai
sonar.projectVersion=1.0
sonar.description=Akamai CDN integration for Claude Desktop via Model Context Protocol

# Source configuration
sonar.sources=src
sonar.exclusions=**/*.test.ts,**/*.spec.ts,**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/*.d.ts
sonar.tests=src/__tests__
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts

# Language configuration
sonar.language=ts
sonar.javascript.file.suffixes=.js,.jsx
sonar.typescript.file.suffixes=.ts,.tsx

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts,**/test/**,**/__tests__/**,**/*.mock.ts,**/examples/**

# Quality profiles
sonar.qualitygate.wait=true

# TypeScript configuration
sonar.typescript.tsconfigPath=tsconfig.json

# Encoding
sonar.sourceEncoding=UTF-8
EOF
    echo -e "${GREEN}✅ sonar-project.properties created${NC}"
fi

# Summary
echo ""
echo "📊 Setup Summary"
echo "================"
echo ""
echo -e "${GREEN}✅ GitHub Actions workflows created:${NC}"
echo "   - .github/workflows/sonarcloud.yml (main analysis)"
echo "   - .github/workflows/quality-gate.yml (PR checks)"
echo "   - .github/workflows/scheduled-analysis.yml (weekly deep analysis)"
echo ""
echo -e "${GREEN}✅ Configuration files:${NC}"
echo "   - sonar-project.properties"
echo "   - .github/dependabot.yml"
echo ""
echo "🚀 Next Steps:"
echo "1. Commit and push these changes"
echo "2. Create a pull request to test the workflows"
echo "3. Monitor the Actions tab for workflow runs"
echo "4. Check SonarCloud dashboard for results"
echo ""
echo "📖 Documentation:"
echo "- SonarCloud: https://sonarcloud.io/project/overview?id=acedergren_alecs-mcp-server-akamai"
echo "- GitHub Actions: https://github.com/$REPO/actions"
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"