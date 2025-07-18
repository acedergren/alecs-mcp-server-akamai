#!/bin/bash
# Quick setup script for SonarQube token

echo "🔐 SonarQube Token Setup"
echo "========================"
echo ""
echo "To set your SONAR_TOKEN permanently, add this line to your shell profile:"
echo ""
echo "For zsh (default on macOS):"
echo "  echo 'export SONAR_TOKEN=\"your-token-here\"' >> ~/.zshrc"
echo ""
echo "For bash:"
echo "  echo 'export SONAR_TOKEN=\"your-token-here\"' >> ~/.bash_profile"
echo ""
echo "Then reload your shell:"
echo "  source ~/.zshrc  # or ~/.bash_profile"
echo ""
echo "Or for this session only:"
echo "  export SONAR_TOKEN=\"your-token-here\""
echo ""
echo "To test if it's working:"
echo "  ./scripts/sonarqube-docker.sh pull"
echo ""
echo "Get your token from:"
echo "  - SonarCloud: https://sonarcloud.io/account/security"
echo "  - SonarQube: Your instance URL -> My Account -> Security -> Generate Token"