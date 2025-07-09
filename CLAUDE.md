## Core Principles

- Always adhere to ethical guidelines and principles of responsible AI
- Always adhere to folder strcture best practices when creating new files and folders. Keep the CWD clean from clutter. Single use scripts and .md files should be removed or archived after they serve their purpose
- KISS principle always applies
- Iterate on existing files instead of creating new ones. If identifying an issue with a specific file (e.g., transport.ts), improve the existing file rather than creating a new file like enhanced-transport.ts
- We are creating our own Snow Lepoard version. No shortcuts, hard work, perfect software, no bugs
- Always follow the principles of DOCUMENTATION_ARCHITECTURE_PLAN.md and CODE_ANNOTATION.md when creating new functionality or updating existing. It is forbidden to not document and annotate code and architecture
- Make sure to annote code changes to make it understandable for humans
- Available contracts and products will always be read-only for users
- Contents of a contract and the existence of a contract is solely managed by Akamai
- No Emojis in error messages!
- .archive is the default folder for archiving things that is not needed anymore and should not be pushed to git
- No emoji in code
- Always use the correct response types! Sloppy code breaks apps! We have the correct types in the openapi spec in docs/api
- All scripts that is not needed to build should go in scripts/ folder. Scripts folder should not be in build

## Akamai API Access and Permissions

### Domain Characteristics
- Akamai's Domain (Read-Only via API):
  - Contract existence
  - Which products are on which contracts
  - Commercial agreements

- User's Domain (Full CRUD via API):
  - Properties
  - Configurations
  - Rules
  - Hostnames
  - Activations
  - Everything else you create USING the products

### Error Handling for Property Creation
- When encountering a 403 error while trying to create a property (e.g., with ctr_V-44KRACO), it is NOT because:
  - ❌ "You don't have permission to write to the contract" (contracts are read-only by design)
  - ❌ "You need to pay for access" (you already have commercial access if you can list it)

- The error IS likely due to:
  - ✅ Your API client doesn't have permission to create properties in that context
  - ✅ The contract might belong to a different account that needs account switching
  - ✅ Your API credentials might have limited scope

- This understanding is crucial for presenting accurate and helpful error messages to users

## SonarCloud Quality Gate Compliance

### Critical Rules - Quality Gate Failures

#### Type Safety (Critical Priority)
- **FORBIDDEN**: `any` type usage - use `unknown` with proper type guards
- **FORBIDDEN**: Type assertions (`as`) without runtime validation  
- **REQUIRED**: Explicit interfaces for all API responses using Zod schemas
- **REQUIRED**: Runtime validation for all external inputs

#### Code Complexity (Critical Priority)
- **LIMIT**: Functions to 50 lines maximum (cyclomatic complexity ≤10)
- **LIMIT**: Files to 500 lines maximum
- **LIMIT**: Parameters to 5 per function (use parameter objects)
- **LIMIT**: Nesting depth to 3 levels maximum

#### Security (Critical Priority) 
- **FORBIDDEN**: Hardcoded secrets, URLs, or configuration values
- **REQUIRED**: Input validation with Zod schemas for all user data
- **REQUIRED**: Parameterized API requests (no string concatenation)
- **REQUIRED**: Proper error context without exposing internals

#### Testing (Quality Gate Requirement)
- **REQUIRED**: 80%+ code coverage minimum
- **REQUIRED**: Unit tests for all error paths and edge cases
- **REQUIRED**: Integration tests for critical workflows
- **REQUIRED**: Proper cleanup in test teardown (prevent worker hangs)

### Code Organization Principles

#### Single Responsibility
- **FORBIDDEN**: Consolidating multiple tools into mega-files
- **REQUIRED**: Each file serves one clear purpose  
- **REQUIRED**: Extraction of reusable logic into utility modules
- **REQUIRED**: Clear separation of concerns

#### Error Handling Standards
- **REQUIRED**: Typed error classes implementing RFC 7807 Problem Details
- **REQUIRED**: Specific error handling (no generic `catch(error: any)`)
- **REQUIRED**: Error recovery strategies and graceful degradation
- **FORBIDDEN**: Silent error swallowing

#### Constants and Configuration
- **REQUIRED**: Named constants for all magic numbers/strings
- **REQUIRED**: Environment variable configuration
- **REQUIRED**: Type-safe configuration validation
- **FORBIDDEN**: Inline literals for timeouts, limits, URLs

### Documentation Standards

#### Code Documentation
- **REQUIRED**: JSDoc for all public APIs and complex logic
- **REQUIRED**: Clear comments explaining business logic decisions
- **REQUIRED**: Code annotations following CODE_ANNOTATION.md
- **FORBIDDEN**: TODO/FIXME comments without tickets

#### Architecture Documentation  
- **REQUIRED**: Update DOCUMENTATION_ARCHITECTURE_PLAN.md for new features
- **REQUIRED**: Sequence diagrams for complex workflows
- **REQUIRED**: API documentation with examples

### Performance and Maintainability

#### Resource Management
- **REQUIRED**: Proper cleanup of timers, intervals, and resources
- **REQUIRED**: Memory-efficient caching with size limits
- **REQUIRED**: Graceful handling of resource exhaustion
- **FORBIDDEN**: Resource leaks that hang test workers

#### Code Quality
- **REQUIRED**: DRY principle - extract common patterns
- **REQUIRED**: Consistent naming conventions (snake_case for MCP tools)
- **REQUIRED**: Immutable data patterns where possible
- **FORBIDDEN**: Deep object mutations

### MCP Tool Naming Standards
- **REQUIRED**: Use snake_case for all MCP tool names (e.g., `property_list`, `dns_zone_create`)
- **FORBIDDEN**: Dot notation in tool names (legacy `property.list` format deprecated)
- **ALIGNMENT**: Follow MCP ecosystem standards used by Cursor IDE and Claude Desktop
- **COMPATIBILITY**: Ensures proper tool discovery and auto-completion in MCP clients

## Development Checklist

- **Pre-commit**: Run TypeScript compiler (0 errors required)
- **Pre-commit**: Run ESLint (0 violations required) 
- **Pre-commit**: Run tests with coverage check (80%+ required)
- **Pre-commit**: Validate all changes work with latest MCP spec from 2025-06-18
- **Quality Gate**: SonarCloud analysis must pass before merge

## Code Readability and Maintenance

- Translate cryptic IDs into human-readable names to improve code comprehension and maintainability
- Absolutely! You're right - we should translate those cryptic IDs into the human-readable names.

## Multi-Customer Architecture and Configuration Management

- Implement a robust CustomerConfigManager to enable secure, multi-tenant reporting across different Akamai customer accounts
- Support multiple authentication models:
  1. Local .edgerc file with multiple customer sections
  2. Future potential for remote API key-based authentication
- Develop a flexible configuration validation system that:
  - Validates customer existence before processing requests
  - Supports account switching for cross-account operations
  - Provides graceful error handling for invalid customer configurations
- Enable reporting tools to dynamically select and validate customer contexts
- Support both individual and aggregated multi-customer reporting patterns
- Prepare for scalable architecture that can grow from single-customer to enterprise multi-tenant deployments

## Claude Desktop Interaction Principles

### What Works Best for Claude Desktop:

- Raw Data + Structure > Pre-formatted Summaries
- Claude excels at processing structured data - It can analyze complete JSON responses and extract exactly what's relevant to the user's specific question
- Context flexibility - If a user asks "list my properties" vs "show me everything about property X", Claude can present the same data differently based on intent
- No information loss - Claude can spot patterns, make comparisons, and provide insights that pre-written summaries might miss
- Dynamic presentation - Claude can reformat data tables, highlight different aspects, or focus on specific fields based on the user's needs