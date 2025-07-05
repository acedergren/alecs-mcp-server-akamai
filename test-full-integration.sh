#!/bin/bash
# Comprehensive integration test for ALECS MCP Server hooks and SonarQube

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}🚀 ALECS MCP Server - Full Integration Test${NC}"
echo -e "${MAGENTA}===========================================${NC}\n"

# Test environment variables
echo -e "${BLUE}📋 Environment Check${NC}"
echo -e "${BLUE}-------------------${NC}"

# Check SONAR_TOKEN in different ways
echo -e "\n${YELLOW}1. Checking SONAR_TOKEN availability...${NC}"

# Method 1: Direct check
if [ ! -z "$SONAR_TOKEN" ]; then
    echo -e "${GREEN}✅ Method 1 (Direct): Token is set (${#SONAR_TOKEN} chars)${NC}"
else
    echo -e "${RED}❌ Method 1 (Direct): Token not found${NC}"
fi

# Method 2: Environment printenv
if printenv SONAR_TOKEN &> /dev/null; then
    TOKEN_LEN=$(printenv SONAR_TOKEN | wc -c)
    echo -e "${GREEN}✅ Method 2 (printenv): Token found ($TOKEN_LEN chars)${NC}"
else
    echo -e "${RED}❌ Method 2 (printenv): Token not in environment${NC}"
fi

# Method 3: Check if exported
if env | grep -q "^SONAR_TOKEN="; then
    echo -e "${GREEN}✅ Method 3 (env): Token is exported${NC}"
else
    echo -e "${RED}❌ Method 3 (env): Token not exported${NC}"
fi

# Check SONAR_HOST_URL
echo -e "\n${YELLOW}2. Checking SONAR_HOST_URL...${NC}"
if [ ! -z "$SONAR_HOST_URL" ]; then
    echo -e "${GREEN}✅ SONAR_HOST_URL is set: $SONAR_HOST_URL${NC}"
else
    echo -e "${YELLOW}⚠️  SONAR_HOST_URL not set (will use default)${NC}"
fi

# Test Docker availability
echo -e "\n${BLUE}🐳 Docker Check${NC}"
echo -e "${BLUE}---------------${NC}"

echo -e "\n${YELLOW}3. Checking Docker daemon...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker daemon is running${NC}"
    echo -e "   Version: $(docker --version)"
    
    # Check if sonar scanner image exists
    echo -e "\n${YELLOW}4. Checking SonarQube scanner image...${NC}"
    if docker images | grep -q "sonarsource/sonar-scanner-cli"; then
        echo -e "${GREEN}✅ Scanner image already downloaded${NC}"
    else
        echo -e "${YELLOW}ℹ️  Scanner image not found locally (will download on first use)${NC}"
    fi
else
    echo -e "${RED}❌ Docker daemon not running${NC}"
    echo -e "   Please start Docker Desktop"
fi

# Test hooks installation
echo -e "\n${BLUE}🪝 Hooks Check${NC}"
echo -e "${BLUE}--------------${NC}"

echo -e "\n${YELLOW}5. Checking Claude hooks installation...${NC}"
if [ -f ~/.claude/settings.json ]; then
    echo -e "${GREEN}✅ Hooks configuration installed${NC}"
    
    # Check if it's our enhanced version
    if grep -q "NO ANY TYPE FOR API RESPONSES" ~/.claude/settings.json; then
        echo -e "${GREEN}✅ Enhanced hooks with type safety active${NC}"
    else
        echo -e "${YELLOW}⚠️  Basic hooks installed (not enhanced version)${NC}"
    fi
else
    echo -e "${RED}❌ Hooks not installed${NC}"
fi

# Test project setup
echo -e "\n${BLUE}📦 Project Check${NC}"
echo -e "${BLUE}----------------${NC}"

echo -e "\n${YELLOW}6. Checking project dependencies...${NC}"
if [ -f package.json ]; then
    if [ -d node_modules ]; then
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Dependencies not installed - run: npm install${NC}"
    fi
fi

echo -e "\n${YELLOW}7. Checking TypeScript setup...${NC}"
if [ -f tsconfig.json ]; then
    echo -e "${GREEN}✅ TypeScript configured${NC}"
    if command -v npx &> /dev/null && npx tsc --version &> /dev/null; then
        echo -e "   Version: $(npx tsc --version)"
    fi
fi

# Test SonarQube configuration
echo -e "\n${BLUE}🔍 SonarQube Check${NC}"
echo -e "${BLUE}------------------${NC}"

echo -e "\n${YELLOW}8. Checking SonarQube project configuration...${NC}"
if [ -f sonar-project.properties ]; then
    echo -e "${GREEN}✅ sonar-project.properties found${NC}"
    
    # Extract project key
    PROJECT_KEY=$(grep "^sonar.projectKey=" sonar-project.properties | cut -d'=' -f2)
    if [ ! -z "$PROJECT_KEY" ]; then
        echo -e "   Project: $PROJECT_KEY"
    fi
fi

# Test SonarQube Docker script
echo -e "\n${YELLOW}9. Checking SonarQube Docker script...${NC}"
if [ -f scripts/sonarqube-docker.sh ]; then
    echo -e "${GREEN}✅ SonarQube Docker script available${NC}"
    
    # Make it executable if not already
    chmod +x scripts/sonarqube-docker.sh
fi

# Summary and recommendations
echo -e "\n${MAGENTA}📊 Summary${NC}"
echo -e "${MAGENTA}----------${NC}\n"

READY=true

# Token status
if [ ! -z "$SONAR_TOKEN" ]; then
    echo -e "${GREEN}✅ SonarQube token configured${NC}"
else
    echo -e "${RED}❌ SonarQube token missing${NC}"
    READY=false
fi

# Docker status
if docker info &> /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker ready${NC}"
else
    echo -e "${RED}❌ Docker not running${NC}"
    READY=false
fi

# Hooks status
if [ -f ~/.claude/settings.json ] && grep -q "NO ANY TYPE FOR API RESPONSES" ~/.claude/settings.json; then
    echo -e "${GREEN}✅ Enhanced hooks active${NC}"
else
    echo -e "${YELLOW}⚠️  Enhanced hooks not fully configured${NC}"
fi

# Final recommendation
echo -e "\n${MAGENTA}🎯 Next Steps${NC}"
echo -e "${MAGENTA}-------------${NC}\n"

if [ "$READY" = true ] && [ ! -z "$SONAR_TOKEN" ]; then
    echo -e "${GREEN}🎉 Everything is configured! You can now:${NC}"
    echo ""
    echo "1. Run a quick SonarQube scan:"
    echo -e "   ${BLUE}./scripts/sonarqube-docker.sh quick${NC}"
    echo ""
    echo "2. Run a full SonarQube scan:"
    echo -e "   ${BLUE}./scripts/sonarqube-docker.sh${NC}"
    echo ""
    echo "3. Test the pre-commit hook:"
    echo -e "   ${BLUE}git add . && git commit -m \"test: verify hooks\"${NC}"
    echo ""
    echo "Your code changes will now be automatically:"
    echo "  • Formatted and linted"
    echo "  • Type-checked (no 'any' in API responses)"
    echo "  • Tested (related tests only)"
    echo "  • Scanned by SonarQube on commit"
else
    if [ -z "$SONAR_TOKEN" ]; then
        echo -e "${YELLOW}To enable SonarQube scanning:${NC}"
        echo ""
        echo "1. Get your token from:"
        echo "   - SonarCloud: https://sonarcloud.io/account/security"
        echo "   - SonarQube: Your instance -> My Account -> Security"
        echo ""
        echo "2. Set it in your current shell:"
        echo -e "   ${BLUE}export SONAR_TOKEN='your-token-here'${NC}"
        echo ""
        echo "3. To make it permanent, add to ~/.zshrc:"
        echo -e "   ${BLUE}echo 'export SONAR_TOKEN=\"your-token-here\"' >> ~/.zshrc${NC}"
        echo -e "   ${BLUE}source ~/.zshrc${NC}"
    fi
    
    if ! docker info &> /dev/null 2>&1; then
        echo ""
        echo -e "${YELLOW}To enable Docker-based scanning:${NC}"
        echo "   Please start Docker Desktop"
    fi
fi

echo ""
echo -e "${MAGENTA}Run this test again after making changes:${NC}"
echo -e "  ${BLUE}./test-full-integration.sh${NC}"
echo ""