# Development Setup Guide

Complete guide for setting up your development environment to contribute to ALECS MCP Server.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Code Setup](#code-setup)
- [Development Workflow](#development-workflow)
- [Testing Setup](#testing-setup)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

## Prerequisites

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   # Check version
   node --version
   
   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **Git**
   ```bash
   # Check version
   git --version
   ```

3. **TypeScript**
   ```bash
   # Install globally (optional)
   npm install -g typescript
   ```

4. **Code Editor**
   - VS Code (recommended)
   - WebStorm
   - Any editor with TypeScript support

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-tslint-plugin",
    "streetsidesoftware.code-spell-checker",
    "eamodio.gitlens",
    "github.copilot",
    "orta.vscode-jest"
  ]
}
```

## Environment Setup

### 1. Fork and Clone Repository

```bash
# Fork on GitHub first, then:
git clone https://github.com/YOUR-USERNAME/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Add upstream remote
git remote add upstream https://github.com/original-org/alecs-mcp-server-akamai.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Install development dependencies
npm install --save-dev @types/jest jest ts-jest
```

### 3. Configure Akamai Credentials

Create `~/.edgerc` for testing:

```ini
[testing]
client_secret = test-secret-xxxxx
host = test-host.luna.akamaiapis.net
access_token = test-access-token
client_token = test-client-token

[development]
client_secret = dev-secret-xxxxx
host = dev-host.luna.akamaiapis.net
access_token = dev-access-token
client_token = dev-client-token
```

### 4. Environment Configuration

Create `.env.development`:

```bash
# Development settings
NODE_ENV=development
LOG_LEVEL=debug
AKAMAI_EDGERC_PATH=~/.edgerc
AKAMAI_DEFAULT_SECTION=development

# Test settings
TEST_TIMEOUT=30000
TEST_CUSTOMER=testing

# Debug settings
DEBUG=alecs:*
```

## Code Setup

### Project Structure

```
alecs-mcp-server-akamai/
├── src/
│   ├── index.ts           # Main entry point
│   ├── tools/             # Tool implementations
│   │   ├── property-tools.ts
│   │   ├── dns-tools.ts
│   │   └── ...
│   ├── lib/               # Core libraries
│   │   ├── akamai-client.ts
│   │   └── auth.ts
│   ├── templates/         # Property templates
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── fixtures/          # Test data
├── docs/                  # Documentation
├── scripts/               # Build/utility scripts
└── package.json
```

### TypeScript Configuration

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### ESLint Configuration

`.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': 'warn'
  }
};
```

### Prettier Configuration

`.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## Development Workflow

### 1. Build Commands

```bash
# Clean build
npm run clean && npm run build

# Watch mode
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### 2. Running Locally

```bash
# Start development server
npm run dev

# Start with debug logging
DEBUG=* npm run dev

# Start with specific customer
AKAMAI_DEFAULT_SECTION=customer1 npm run dev
```

### 3. Testing with Claude Desktop

Update Claude Desktop config to point to local build:

```json
{
  "mcpServers": {
    "alecs-dev": {
      "command": "node",
      "args": [
        "/path/to/your/alecs-mcp-server-akamai/dist/index.js"
      ],
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 4. Making Changes

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following style guide
   - Add/update tests
   - Update documentation

3. **Test Changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing Setup

### Unit Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- property-tools.test.ts

# Run with coverage
npm test -- --coverage
```

### Integration Testing

```bash
# Run integration tests
npm run test:integration

# Test specific customer
TEST_CUSTOMER=customer1 npm run test:integration
```

### Test Structure

```typescript
// Example test file
describe('PropertyTools', () => {
  let client: AkamaiClient;
  
  beforeEach(() => {
    client = new AkamaiClient({
      edgercPath: '~/.edgerc',
      section: 'testing'
    });
  });
  
  describe('listProperties', () => {
    it('should return property list', async () => {
      const result = await listProperties({}, client);
      expect(result).toHaveProperty('properties');
    });
  });
});
```

## Debugging

### VS Code Launch Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/index.js",
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logging

```typescript
import debug from 'debug';

const log = debug('alecs:property-tools');

export async function listProperties(args: any, client: AkamaiClient) {
  log('Listing properties with args:', args);
  
  try {
    const response = await client.request({
      method: 'GET',
      path: '/papi/v1/properties'
    });
    
    log('Received %d properties', response.properties.items.length);
    return response;
  } catch (error) {
    log('Error listing properties:', error);
    throw error;
  }
}
```

### Network Debugging

```bash
# Enable HTTP debugging
NODE_DEBUG=http npm run dev

# Use proxy for inspection
HTTP_PROXY=http://localhost:8888 npm run dev
```

## Common Issues

### Issue: TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build

# Check TypeScript version
npx tsc --version
```

### Issue: Module Not Found

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Authentication Failures

```bash
# Test credentials
node scripts/test-auth.js

# Check .edgerc permissions
ls -la ~/.edgerc
chmod 600 ~/.edgerc
```

### Issue: Test Failures

```bash
# Run single test
npm test -- --testNamePattern="specific test"

# Update snapshots
npm test -- -u

# Clear test cache
jest --clearCache
```

## Development Best Practices

### Code Style

1. **Naming Conventions**
   - Use camelCase for variables and functions
   - Use PascalCase for types and classes
   - Use UPPER_SNAKE_CASE for constants

2. **File Organization**
   - One tool per file
   - Group related utilities
   - Keep files under 300 lines

3. **Error Handling**
   - Always provide context in errors
   - Use custom error classes
   - Log errors appropriately

### Git Workflow

1. **Commit Messages**
   ```
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   test: add tests
   refactor: improve code structure
   ```

2. **Branch Naming**
   ```
   feature/add-dns-import
   fix/property-activation-error
   docs/update-readme
   ```

### Documentation

1. **Code Comments**
   ```typescript
   /**
    * Lists all properties for the specified customer
    * @param args - Tool arguments including optional filters
    * @param client - Authenticated Akamai client
    * @returns Promise<PropertyList> - List of properties
    */
   ```

2. **README Updates**
   - Update when adding features
   - Include examples
   - Document breaking changes

## Next Steps

1. Review [Code Structure](./Code-Structure.md)
2. Learn [How to Add Tools](./Adding-New-Tools.md)
3. Read [Testing Guide](./Testing-Guide.md)
4. Check [Contribution Guidelines](./Contribution-Guidelines.md)

---

*Happy coding! If you have questions, please open an issue or join our Discord.*

*Last Updated: January 2025*