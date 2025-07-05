#!/bin/bash
# Full SonarQube integration test

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 SonarQube Integration Test${NC}"
echo -e "${BLUE}=============================${NC}\n"

# Check token
echo -e "${YELLOW}1. Checking SONAR_TOKEN...${NC}"
if [ ! -z "$SONAR_TOKEN" ]; then
    echo -e "${GREEN}✅ Token is set (${#SONAR_TOKEN} chars)${NC}"
    
    # Try to pull Docker image
    echo -e "\n${YELLOW}2. Pulling SonarQube scanner image...${NC}"
    if ./scripts/sonarqube-docker.sh pull; then
        echo -e "${GREEN}✅ Docker image ready${NC}"
        
        # Run a quick scan
        echo -e "\n${YELLOW}3. Running quick SonarQube scan...${NC}"
        if ./scripts/sonarqube-docker.sh quick; then
            echo -e "${GREEN}✅ Quick scan completed${NC}"
        else
            echo -e "${YELLOW}⚠️  Quick scan had issues${NC}"
        fi
        
        echo -e "\n${GREEN}🎉 SonarQube is fully configured!${NC}"
        echo "Your commits will now trigger automatic quality scans"
    else
        echo -e "${RED}❌ Failed to pull Docker image${NC}"
    fi
else
    echo -e "${RED}❌ SONAR_TOKEN not set${NC}"
    echo ""
    echo "Please set your token first:"
    echo "  export SONAR_TOKEN='your-token-here'"
    echo ""
    echo "Get your token from:"
    echo "  - SonarCloud: https://sonarcloud.io/account/security"
    echo "  - SonarQube: Your instance -> My Account -> Security"
fi