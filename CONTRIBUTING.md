# Contributing to ALECS MCP Server for Akamai

First off, thank you for considering contributing to ALECS! It's people like you that make ALECS such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Security Vulnerabilities](#security-vulnerabilities)

## Code of Conduct

This project and everyone participating in it is governed by the [ALECS Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [security@alecs.io](mailto:security@alecs.io).

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/alecs-mcp-server-akamai.git
   cd alecs-mcp-server-akamai
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up your environment:
   ```bash
   cp .env.example .env
   # Configure your Akamai credentials
   ```
5. Run tests:
   ```bash
   npm test
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and expected**
- **Include logs and error messages**
- **Include your environment details**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- Issues labeled `good first issue`
- Issues labeled `help wanted`
- Issues labeled `documentation`

## Development Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our style guidelines

3. **Write or update tests** for your changes

4. **Run the test suite**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

5. **Update documentation** if needed

6. **Commit your changes** using our commit message conventions

7. **Push to your fork** and submit a pull request

## Style Guidelines

### TypeScript Style Guide

We follow strict TypeScript guidelines:

- Use TypeScript strict mode
- Always use explicit return types for functions
- Prefer interfaces over type aliases for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Code Formatting

- We use Prettier for code formatting
- Run `npm run format` before committing
- ESLint configuration is enforced via pre-commit hooks

### File Organization

```
src/
├── auth/           # Authentication modules
├── tools/          # MCP tool implementations
├── servers/        # Server implementations
├── middleware/     # Express/HTTP middleware
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── config/         # Configuration files
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### Examples

```
feat(tools): add bulk property activation tool

Add new MCP tool for activating multiple properties simultaneously.
Includes rate limiting and error recovery mechanisms.

Closes #123
```

```
fix(auth): resolve token rotation race condition

Ensure tokens are properly invalidated before creating new ones
during rotation process.
```

## Pull Requests

### Before Submitting

1. **Test your changes** thoroughly
2. **Update documentation** as needed
3. **Add tests** for new functionality
4. **Ensure CI passes** all checks
5. **Keep PR scope focused** - one feature/fix per PR

### PR Process

1. **Fill out the PR template** completely
2. **Link related issues** using keywords (Closes #123)
3. **Request reviews** from maintainers
4. **Address review feedback** promptly
5. **Keep PR updated** with main branch

### PR Title Format

Follow the same convention as commit messages:
```
feat(tools): add new property comparison tool
```

## Security Vulnerabilities

**DO NOT** create public issues for security vulnerabilities. Instead:

1. Email [security@alecs.io](mailto:security@alecs.io)
2. Include detailed steps to reproduce
3. Wait for acknowledgment before disclosure

See [SECURITY.md](SECURITY.md) for more details.

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/tools/__tests__/property-tools.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

- Place tests in `__tests__` directories
- Name test files with `.test.ts` extension
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

### Test Structure

```typescript
describe('ToolName', () => {
  describe('handler', () => {
    it('should successfully execute with valid parameters', async () => {
      // Arrange
      const params = { /* ... */ };
      
      // Act
      const result = await handler(params);
      
      // Assert
      expect(result).toMatchObject({
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('Success')
          })
        ])
      });
    });
    
    it('should handle errors gracefully', async () => {
      // Test error cases
    });
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Include parameter descriptions and examples
- Document return types and exceptions

### Wiki Documentation

When adding new features, update the [GitHub Wiki](https://github.com/acedergren/alecs-mcp-server-akamai/wiki):

- Add tool documentation to the Tools Reference
- Update API documentation
- Include usage examples
- Add troubleshooting guides

## Questions?

Feel free to:
- Open an issue for questions
- Join our discussions
- Reach out to maintainers

Thank you for contributing! 🎉