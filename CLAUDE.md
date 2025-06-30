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

## Development Checklist

- verify all changes works with the latest MCP spec from 2025-06-18 and Akamai APIs

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