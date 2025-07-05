#!/bin/bash
# Test SONAR_TOKEN availability

echo "🔍 Testing SONAR_TOKEN..."
echo "========================"

if [ ! -z "$SONAR_TOKEN" ]; then
    echo "✅ SONAR_TOKEN is set!"
    echo "   Length: ${#SONAR_TOKEN} characters"
    echo "   Ready for SonarQube scanning"
    echo ""
    echo "Testing Docker scanner prerequisites..."
    ./scripts/sonarqube-docker.sh pull
else
    echo "❌ SONAR_TOKEN is not set in this shell"
    echo ""
    echo "To set it for this session:"
    echo "  export SONAR_TOKEN='your-token-here'"
    echo ""
    echo "To set it permanently, add to ~/.zshrc or ~/.bash_profile:"
    echo "  echo 'export SONAR_TOKEN=\"your-token-here\"' >> ~/.zshrc"
    echo "  source ~/.zshrc"
fi