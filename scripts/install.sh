#!/bin/bash
set -e

# ALECS MCP Server - Installation Script
# This script sets up everything needed to run ALECS from a fresh clone

echo "==============================================="
echo "  ALECS MCP Server for Akamai - Installation"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "ℹ $1"; }

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm -v) detected"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Setup Akamai credentials
setup_credentials() {
    print_info "Setting up Akamai credentials..."
    
    if [ ! -f ~/.edgerc ]; then
        if [ -f .edgerc.example ]; then
            print_warning "No ~/.edgerc file found"
            echo ""
            echo "To use ALECS with Akamai, you need to set up credentials:"
            echo "1. Copy the example file: cp .edgerc.example ~/.edgerc"
            echo "2. Edit ~/.edgerc with your Akamai credentials"
            echo ""
            read -p "Would you like to copy the example file now? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp .edgerc.example ~/.edgerc
                print_success "Created ~/.edgerc - Please edit it with your credentials"
            fi
        else
            print_warning "No .edgerc.example found - creating one..."
            cat > .edgerc.example << 'EOF'
; Akamai EdgeGrid Authentication File
; Copy this file to ~/.edgerc and update with your credentials
; Get credentials from: https://control.akamai.com/apps/identity-management/

[default]
client_secret = your-client-secret-here
host = your-host.luna.akamaiapis.net
access_token = your-access-token-here
client_token = your-client-token-here

; Optional: Multiple sections for different environments
[staging]
client_secret = staging-client-secret
host = staging-host.luna.akamaiapis.net
access_token = staging-access-token
client_token = staging-client-token

[production]
client_secret = production-client-secret
host = production-host.luna.akamaiapis.net
access_token = production-access-token
client_token = production-client-token
EOF
            print_success "Created .edgerc.example"
        fi
    else
        print_success "Akamai credentials found at ~/.edgerc"
    fi
}

# Setup environment variables
setup_environment() {
    print_info "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        cat > .env.example << 'EOF'
# ALECS Environment Configuration
# Copy this file to .env and update as needed

# Server Configuration
NODE_ENV=production
ALECS_LOG_LEVEL=info

# WebSocket Server (optional)
ALECS_WS_PORT=8082
ALECS_WS_HOST=0.0.0.0
ALECS_WS_PATH=/mcp

# Authentication (for WebSocket)
TOKEN_MASTER_KEY=your-secret-key-here

# Optional: Customer context for multi-tenant setups
# ALECS_DEFAULT_CUSTOMER=customer1
# ALECS_DEFAULT_SECTION=default

# Optional: Observability
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# OTEL_SERVICE_NAME=alecs-mcp-server
EOF
        
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please update .env with your configuration if needed"
    else
        print_success "Environment configuration found"
    fi
}

# Build the project
build_project() {
    print_info "Building TypeScript project..."
    
    if npm run build; then
        print_success "Project built successfully"
    else
        print_warning "Build failed - checking for common issues..."
        print_info "Attempting to build with --noEmit for type checking only..."
        npm run typecheck || true
    fi
}

# Setup for different installation methods
setup_installation_method() {
    echo ""
    echo "How would you like to run ALECS?"
    echo "1) Direct Node.js (recommended for development)"
    echo "2) Docker (recommended for production)"
    echo "3) PM2 (for background service)"
    echo "4) Claude Desktop integration"
    echo ""
    read -p "Choose an option (1-4): " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            setup_nodejs
            ;;
        2)
            setup_docker
            ;;
        3)
            setup_pm2
            ;;
        4)
            setup_claude_desktop
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
}

# Setup for direct Node.js
setup_nodejs() {
    print_info "Setting up for direct Node.js execution..."
    
    cat > start.sh << 'EOF'
#!/bin/bash
# Start ALECS MCP Server

echo "Starting ALECS MCP Server..."
echo ""
echo "Available modes:"
echo "1) Standard MCP server (stdio)"
echo "2) WebSocket server"
echo "3) SSE server"
echo ""
read -p "Choose mode (1-3): " -n 1 -r
echo ""

case $REPLY in
    1)
        MCP_TRANSPORT=stdio node dist/index.js
        ;;
    2)
        MCP_TRANSPORT=websocket node dist/index.js
        ;;
    3)
        MCP_TRANSPORT=sse node dist/index.js
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac
EOF
    
    chmod +x start.sh
    print_success "Created start.sh script"
    echo ""
    echo "To start ALECS, run: ./start.sh"
}

# Setup for Docker
setup_docker() {
    print_info "Setting up for Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        return
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_warning "docker-compose not found, trying docker compose..."
        if ! docker compose version &> /dev/null; then
            print_error "Docker Compose is not installed"
            return
        fi
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    
    print_success "Docker setup ready"
    echo ""
    echo "To start with Docker:"
    echo "  $DOCKER_COMPOSE up -d"
    echo ""
    echo "To stop:"
    echo "  $DOCKER_COMPOSE down"
}

# Setup for PM2
setup_pm2() {
    print_info "Setting up PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 not installed. Installing globally..."
        npm install -g pm2
    fi
    
    print_success "PM2 setup complete"
    echo ""
    echo "To start with PM2:"
    echo "  pm2 start ecosystem.config.js"
    echo ""
    echo "To view logs:"
    echo "  pm2 logs"
    echo ""
    echo "To stop:"
    echo "  pm2 stop all"
}

# Setup for Claude Desktop
setup_claude_desktop() {
    print_info "Setting up Claude Desktop integration..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CONFIG_DIR="$HOME/Library/Application Support/Claude"
    else
        CONFIG_DIR="$HOME/.config/claude"
    fi
    
    mkdir -p "$CONFIG_DIR"
    
    # Create config file
    cat > claude_desktop_config.json << EOF
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "node",
      "args": [
        "$PWD/dist/index-full.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "ALECS_LOG_LEVEL": "info"
      }
    }
  }
}
EOF
    
    print_success "Created claude_desktop_config.json"
    echo ""
    echo "To complete Claude Desktop setup:"
    echo "1. Copy the configuration:"
    echo "   cp claude_desktop_config.json \"$CONFIG_DIR/\""
    echo "2. Restart Claude Desktop"
    echo ""
    print_warning "Make sure to build the project first: npm run build"
}

# Main installation flow
main() {
    check_prerequisites
    install_dependencies
    setup_credentials
    setup_environment
    build_project
    setup_installation_method
    
    echo ""
    print_success "Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. Update ~/.edgerc with your Akamai credentials"
    echo "2. Review .env file for any custom configuration"
    echo "3. Run ALECS using your chosen method"
    echo ""
    echo "For more help, visit: https://github.com/acedergren/alecs-mcp-server-akamai"
}

# Run main function
main