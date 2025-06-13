# Akamai MCP Server

An MCP (Model Context Protocol) server that enables AI assistants to interact with Akamai's CDN and edge services APIs. This server provides comprehensive tools for managing Akamai properties, configurations, and services through natural language interactions.

## Features

### 🚀 Multi-Customer Support
- Seamless switching between multiple Akamai accounts
- Account-specific configurations via `.edgerc` sections
- Automatic account key detection and application

### 🔍 Intelligent Search
- Property lookup by name or ID
- Group search with filtering capabilities
- Automatic contract selection when not specified

### 📊 Comprehensive Property Management
- List and search properties across contracts
- Detailed property information including versions and activation status
- Property configuration and rule management

### 🔐 Secure Authentication
- EdgeGrid authentication protocol support
- Secure credential management via `.edgerc`
- Account switching via `account_key` field

## Installation

```bash
npm install akamai-mcp-server
```

## Configuration

### 1. Set up your `.edgerc` file

Create a `~/.edgerc` file with your Akamai credentials:

```ini
[default]
client_secret = your_client_secret
host = your_host.luna.akamaiapis.net
access_token = your_access_token
client_token = your_client_token

[production]
client_secret = prod_client_secret
host = prod_host.luna.akamaiapis.net
access_token = prod_access_token
client_token = prod_client_token
account_key = 1-ABCDEF
```

### 2. Configure Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "akamai-mcp": {
      "command": "npx",
      "args": ["akamai-mcp-server"],
      "env": {}
    }
  }
}
```

## Usage Examples

### List Properties
```
"List all my Akamai properties"
"Show properties in contract ctr_1-ABCDEF"
```

### Search for Properties
```
"Find property example.com"
"Get details for property prp_12345"
```

### Group Management
```
"List all Akamai groups"
"Search for groups containing 'production'"
"Find group ID for 'Web Properties'"
```

### Multi-Customer Operations
```
"List properties using customer production"
"Switch to staging account and show properties"
```

## Available Tools

- `list_properties` - List CDN properties with filtering options
- `get_property` - Get detailed property information by name or ID
- `list_groups` - List account groups with search capability
- `create_property` - Create new CDN properties (coming soon)

## Development

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- Akamai account with API credentials

### Setup
```bash
# Clone the repository
git clone https://github.com/acedergren/Akamai-MCP.git
cd Akamai-MCP

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Architecture

The server follows a modular architecture:

```
src/
├── index.ts           # MCP server setup and request handling
├── akamai-client.ts   # EdgeGrid authentication and API client
├── types.ts           # TypeScript type definitions
└── tools/
    └── property-tools.ts  # Property management implementations
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- [Documentation](https://github.com/acedergren/Akamai-MCP/wiki)
- [Issues](https://github.com/acedergren/Akamai-MCP/issues)
- [Discussions](https://github.com/acedergren/Akamai-MCP/discussions)