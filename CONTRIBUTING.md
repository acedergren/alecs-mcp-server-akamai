# Contributing to Akamai MCP Server

Thanks for your interest in making Akamai infrastructure management easier for everyone. This project exists because managing CDN configurations shouldn't require a computer science degree.

## Quick Start

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai

# Complete setup (includes dependency checks)
make setup

# Start development
make dev
```

## How to Contribute

### Areas Where We Need Help

**High Priority**:
• **Testing Real-World Scenarios**: Run the tools against your actual Akamai configurations and report what breaks
• **API Coverage**: Implement missing Akamai APIs (FastPurge, Application Security, Reporting)  
• **Error Handling**: Improve error messages and recovery for failed operations
• **Documentation**: Write examples showing common workflows and troubleshooting guides

**Medium Priority**:
• **Performance**: Optimize API call patterns and implement intelligent caching
• **Security**: Enhance credential management and audit logging
• **Multi-Customer UX**: Improve the customer switching experience
• **Integration**: Add support for more MCP clients and deployment scenarios

**Good First Issues**:
• Add validation for DNS record types and values
• Implement property configuration templates for common patterns  
• Create utility functions for batch operations
• Write integration tests for specific Akamai APIs
• Improve TypeScript type definitions for API responses

### What We're Looking For

**Code Contributions**: TypeScript implementations of Akamai APIs, test coverage, performance improvements, and bug fixes.

**Real-World Testing**: Use the tools with your actual Akamai accounts and configurations. Report issues with specific error messages and steps to reproduce.

**Documentation**: Examples, tutorials, troubleshooting guides, and API reference improvements. Documentation that helps people solve real problems.

**User Experience**: Suggestions for better workflows, more intuitive tool names, clearer error messages, and smoother multi-customer management.

## Development Workflow

### Prerequisites

• Node.js 20+ and npm
• Access to an Akamai account with API credentials
• `.edgerc` file configured with your credentials

Check prerequisites: `make check-deps`

### Setting Up Your Environment

1. **Complete Setup**:
   ```bash
   make setup
   ```

2. **Configure Akamai Credentials**:
   Set up your `.edgerc` file with multiple customer sections:
   ```ini
   [default]
   client_secret = your_client_secret
   host = akaa-xxxxxx.luna.akamaiapis.net
   access_token = your_access_token
   client_token = your_client_token
   
   [customer1]
   client_secret = customer1_secret
   host = akaa-yyyyyy.luna.akamaiapis.net
   access_token = customer1_token
   client_token = customer1_token
   account_switch_key = customer1_switch_key
   ```

3. **Start Development**:
   ```bash
   make dev
   ```

### Development Commands

```bash
# Quick development cycle
make dev              # Start with hot reload
make dev-check        # Run all checks quickly
make test-watch       # Run tests in watch mode

# Quality checks
make lint             # Check code style
make typecheck        # TypeScript validation
make test             # Run full test suite
make validate         # Run all checks

# Debugging
make debug            # Run with Node.js debugger
make inspect          # Run with Chrome DevTools
make trace            # Run with trace warnings
```

### Code Standards

**Keep It Simple**: This is a solo developer project. Complex solutions should be the exception, not the rule.

**TypeScript First**: Strong typing helps catch errors early. Add types for all Akamai API responses.

**Test What Matters**: Focus tests on API integration, multi-customer scenarios, and error handling. Don't test every getter and setter.

**Error Messages**: Make them helpful. "Invalid DNS record" isn't helpful. "DNS record type 'XYZ' is not supported. Valid types: A, AAAA, CNAME, MX" is helpful.

**Multi-Customer Aware**: Every tool should accept a `customer` parameter and handle customer context switching gracefully.

## Project Architecture

### Core Components

**MCP Tools** (`src/tools/`): Each Akamai service has its own tool module:
• `property-tools.ts` - CDN property management
• `dns-tools.ts` - Edge DNS operations  
• `certificate-tools.ts` - SSL/TLS certificate management
• `purge-tools.ts` - Content invalidation
• `security-tools.ts` - WAF and security policies

**Customer Management** (`src/customer/`): Handles multi-tenant credential switching and validation.

**Akamai Client** (`src/akamai-client.ts`): EdgeGrid authentication and API communication wrapper.

### Adding New Tools

1. **Create the Tool Module**:
   ```bash
   make new-tool NAME=my-feature
   ```

2. **Implement the Tool**:
   ```typescript
   export const myFeatureTools = [
     {
       name: 'service.action',
       description: 'What this tool does',
       inputSchema: {
         type: 'object',
         properties: {
           customer: { type: 'string', description: 'Customer name' },
           // ... other parameters
         },
         required: ['customer']
       }
     }
   ];
   ```

3. **Register in Main Index**: Add your tools to `src/index.ts`

4. **Add Tests**: Create `src/tools/__tests__/my-feature-tools.test.ts`

### API Integration Pattern

1. **Research First**: Check Akamai's OpenAPI specs on GitHub for accurate endpoint details
2. **Type the Response**: Create TypeScript interfaces for all API responses  
3. **Handle Errors**: Implement proper error handling and user-friendly messages
4. **Support Multi-Customer**: Always accept and handle customer parameters
5. **Test Integration**: Write tests that verify actual API communication

## Testing Guidelines

### Running Tests

```bash
make test              # Full test suite
make test-watch        # Watch mode for development
make test-coverage     # Generate coverage report
make test-single FILE=path/to/test.ts  # Run specific test
```

### What to Test

**Critical Paths**:
• Multi-customer credential switching
• API authentication and error handling
• Core workflows (property deployment, DNS updates, certificate enrollment)

**Integration Tests**:
• Real API calls against Akamai's staging environment
• Error handling for rate limits and API failures
• Customer context isolation

**Unit Tests**:
• Input validation
• Response parsing
• Configuration handling

### Test Structure

```typescript
describe('DNS Tools', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should list zones for specified customer', async () => {
    // Test implementation
  });

  it('should handle API errors gracefully', async () => {
    // Error handling test
  });
});
```

## Submitting Changes

### Before You Submit

1. **Run All Checks**: `make validate`
2. **Test Multi-Customer**: Verify your changes work with multiple customer configurations
3. **Update Documentation**: Add examples and update API references as needed
4. **Write Good Commit Messages**: Explain what and why, not just what

### Pull Request Process

1. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
2. **Make Your Changes**: Follow our coding standards and test thoroughly
3. **Update Documentation**: Add examples and update relevant docs
4. **Submit PR**: Include description of what you're solving and how you tested it

### PR Requirements

• All tests pass (`make validate`)
• New functionality includes tests  
• Breaking changes are documented
• Multi-customer functionality is preserved
• Error handling is improved, not degraded

## Getting Help

### Common Issues

**Authentication Problems**: Check your `.edgerc` configuration and account permissions. The `make validate-edgerc` command helps diagnose issues.

**Multi-Customer Context**: Every tool should accept a `customer` parameter. If you're getting "access denied" errors, verify the customer name matches your `.edgerc` sections.

**API Rate Limits**: Akamai APIs have rate limits. Implement exponential backoff and don't make unnecessary API calls during development.

**TypeScript Errors**: Run `make typecheck` to see detailed error messages. Most TypeScript issues are related to missing API response types.

### Getting Support

• **GitHub Issues**: For bugs, feature requests, and general questions
• **GitHub Discussions**: For architecture questions and community discussion
• **Code Review**: Submit draft PRs early if you want feedback on approach

### Resources

• [Akamai API Documentation](https://techdocs.akamai.com/)
• [EdgeGrid Authentication](https://techdocs.akamai.com/developer/docs/authenticate-with-edgegrid)
• [Model Context Protocol](https://modelcontextprotocol.io/)

## Code of Conduct

**Be Direct**: Skip the pleasantries. Focus on the problem and the solution.

**Be Helpful**: Share specific examples, error messages, and code snippets. Vague descriptions don't help anyone.

**Be Patient**: This is a solo developer project. Response times may vary, but every contribution is valued.

**Be Practical**: Solutions should solve real problems, not theoretical ones. If you can't explain why someone would use a feature, maybe it doesn't belong.

---

Ready to make Akamai management easier for everyone? Pick an issue, read the code, and start building. The best contributions come from people who've felt the pain of complex infrastructure management and want to fix it.

**Questions?** Open a GitHub Discussion. **Found a bug?** Create an issue with reproduction steps. **Want to add a feature?** Start with a discussion about the use case.

Let's build something that makes developers' lives better. 🚀
