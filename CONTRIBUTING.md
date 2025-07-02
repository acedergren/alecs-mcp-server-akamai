# Contributing to ALECS MCP Server

Thank you for your interest in contributing to ALECS MCP Server for Akamai!

## License and Contribution Requirements

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** with additional terms. By contributing to this project, you agree to:

### 1. License Agreement
- All contributions must be licensed under AGPL-3.0
- You retain copyright to your contributions
- You grant the project maintainers the right to use your contributions

### 2. Mandatory Contribution Back
As per our license terms, **any modifications or improvements to this software must be offered back to the original project through pull requests within 30 days of deployment in a production environment**.

### 3. Attribution
Any production use must display "Powered by ALECS MCP Server" with a link to https://github.com/acedergren/alecs-mcp-server-akamai

## How to Contribute

### 1. Fork the Repository
- Fork the project on GitHub
- Clone your fork locally
- Add the upstream repository as a remote

```bash
git clone https://github.com/YOUR-USERNAME/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
git remote add upstream https://github.com/acedergren/alecs-mcp-server-akamai.git
```

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes
- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Follow CODE KAI principles (see CLAUDE.md)

### 4. Test Your Changes
```bash
npm test
npm run typecheck
npm run lint
```

### 5. Submit a Pull Request
- Push your branch to your fork
- Create a pull request against the main repository
- Provide a clear description of your changes
- Reference any related issues

## Code Standards

### TypeScript
- No `any` types - use proper typing
- Follow strict TypeScript settings
- Document complex functions with JSDoc

### Error Handling
- Use centralized error handling
- Provide meaningful error messages
- No cryptic error codes

### Documentation
- Update relevant documentation
- Add code comments for complex logic
- Follow DOCUMENTATION_ARCHITECTURE_PLAN.md

### Testing
- Write tests for new features
- Maintain test coverage above 85%
- Test edge cases and error conditions

## Pull Request Guidelines

1. **Title**: Use conventional commit format (e.g., `feat: add new DNS validation`)
2. **Description**: Clearly explain what and why
3. **Testing**: Describe how you tested the changes
4. **Breaking Changes**: Clearly mark any breaking changes
5. **License**: Confirm you agree to license your contribution under AGPL-3.0

## Questions?

If you have questions about contributing, please:
1. Check existing issues and discussions
2. Create a new discussion for general questions
3. Create an issue for bugs or feature requests

## Legal Notice

By submitting a pull request, you agree that:
1. Your contribution is licensed under AGPL-3.0
2. You have the right to license your contribution
3. Your contribution doesn't violate any third-party rights
4. You understand that your contribution may be redistributed under AGPL-3.0

Thank you for helping make ALECS MCP Server better!