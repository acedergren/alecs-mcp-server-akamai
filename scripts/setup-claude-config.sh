#\!/bin/bash
# Setup Claude Desktop configuration

echo "🔧 Setting up Claude Desktop configuration..."

# Get project root and home directory
PROJECT_ROOT=$(pwd)
HOME_DIR=$HOME

# Check if example exists
if [ \! -f "examples/claude_desktop_config.example.json" ]; then
    echo "❌ Error: examples/claude_desktop_config.example.json not found"
    exit 1
fi

# Create personalized config
echo "Creating personalized configuration..."
sed "s|<PROJECT_ROOT>|$PROJECT_ROOT|g; s|<HOME>|$HOME_DIR|g" \
    examples/claude_desktop_config.example.json > claude_desktop_config.json

echo "✅ Configuration created: claude_desktop_config.json"
echo ""
echo "Next steps:"
echo "1. Copy this configuration to your Claude Desktop settings"
echo "2. Ensure you have a valid .edgerc file at $HOME_DIR/.edgerc"
echo "3. Build the project with: npm run build"
