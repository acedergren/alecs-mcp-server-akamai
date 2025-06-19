# Adding New Tools Guide

Learn how to extend ALECS by adding new tools to support additional Akamai APIs or custom functionality.

## Table of Contents
- [Overview](#overview)
- [Tool Architecture](#tool-architecture)
- [Step-by-Step Guide](#step-by-step-guide)
- [Code Examples](#code-examples)
- [Testing Your Tool](#testing-your-tool)
- [Documentation](#documentation)
- [Submission Process](#submission-process)

## Overview

ALECS tools follow a consistent pattern that makes it easy to add new functionality. Each tool:

- Has a unique name following the naming convention
- Validates inputs using Zod schemas
- Implements a handler function
- Returns formatted responses
- Includes comprehensive error handling

## Tool Architecture

### Tool Structure

```typescript
interface Tool {
  name: string;                      // Unique identifier
  description: string;               // What the tool does
  inputSchema: z.ZodSchema;         // Input validation
  handler: ToolHandler;             // Implementation
}

type ToolHandler = (
  args: any,
  client: AkamaiClient
) => Promise<ToolResponse>;
```

### File Organization

```
src/
├── tools/
│   ├── property-tools.ts          # Property management tools
│   ├── dns-tools.ts              # DNS tools
│   ├── your-new-tools.ts         # Your new tool file
│   └── index.ts                  # Tool exports
├── lib/
│   └── akamai-client.ts          # API client
└── index.ts                      # Tool registration
```

## Step-by-Step Guide

### Step 1: Plan Your Tool

1. **Identify the API**: Which Akamai API will you use?
2. **Define the operation**: What specific action?
3. **Design inputs/outputs**: What parameters and responses?
4. **Choose a name**: Follow the `service_action_object` pattern

Example planning:
```
API: Identity and Access Management
Operation: List API clients
Name: iam_list_api_clients
Inputs: { customer?: string }
Output: { clients: Array<ApiClient> }
```

### Step 2: Create Tool File

Create a new file in `src/tools/`:

```typescript
// src/tools/iam-tools.ts
import { z } from 'zod';
import { AkamaiClient } from '../lib/akamai-client';
import { formatError, formatSuccess } from '../utils/format';

// Define your input schema
const listApiClientsSchema = z.object({
  customer: z.string().optional().describe('Customer section from .edgerc')
});

// Define your handler
export async function listApiClients(
  args: z.infer<typeof listApiClientsSchema>,
  client: AkamaiClient
) {
  try {
    // Implementation here
    const response = await client.request({
      method: 'GET',
      path: '/identity-management/v2/api-clients'
    });
    
    return formatSuccess({
      clients: response.apiClients,
      count: response.apiClients.length
    });
  } catch (error) {
    return formatError(error, 'Failed to list API clients');
  }
}

// Export tool definition
export const iamTools = [
  {
    name: 'iam_list_api_clients',
    description: 'List all API clients for the account',
    inputSchema: listApiClientsSchema,
    handler: listApiClients
  }
];
```

### Step 3: Add API Support to Client

If the API isn't already supported, add it to the Akamai client:

```typescript
// src/lib/akamai-client.ts
class AkamaiClient {
  // Add new API base URL if needed
  private getApiBaseUrl(api: string): string {
    switch (api) {
      case 'iam':
        return 'https://{host}/identity-management/v2';
      // ... other APIs
    }
  }
  
  // Add typed methods if desired
  async listApiClients() {
    return this.request({
      method: 'GET',
      path: '/identity-management/v2/api-clients'
    });
  }
}
```

### Step 4: Register Your Tool

Add your tool to the main index:

```typescript
// src/index.ts
import { iamTools } from './tools/iam-tools';

// In the server initialization
for (const tool of [...propertyTools, ...dnsTools, ...iamTools]) {
  server.addTool(tool);
}
```

### Step 5: Add Types

Create TypeScript types for better type safety:

```typescript
// src/types/iam.ts
export interface ApiClient {
  clientId: string;
  clientName: string;
  clientDescription?: string;
  clientType: 'CLIENT_CREDENTIALS' | 'AUTHORIZATION_CODE';
  createdDate: string;
  createdBy: string;
  allowedApis: string[];
}

export interface ListApiClientsResponse {
  apiClients: ApiClient[];
}
```

## Code Examples

### Basic Tool Example

```typescript
// Simple tool with minimal parameters
const getAccountInfoSchema = z.object({
  customer: z.string().optional()
});

export async function getAccountInfo(
  args: z.infer<typeof getAccountInfoSchema>,
  client: AkamaiClient
) {
  const response = await client.request({
    method: 'GET',
    path: '/identity-management/v2/account'
  });
  
  return {
    accountId: response.accountId,
    accountName: response.accountName,
    contracts: response.contracts
  };
}
```

### Tool with Complex Parameters

```typescript
// Tool with multiple parameters and validation
const createApiClientSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientDescription: z.string().optional(),
  allowedApis: z.array(z.string()).min(1),
  groupIds: z.array(z.number()).optional(),
  clientCredentials: z.object({
    expiresIn: z.number().min(3600).max(31536000).default(7776000),
    grantTypes: z.array(z.enum(['client_credentials'])).default(['client_credentials'])
  }).optional(),
  customer: z.string().optional()
});

export async function createApiClient(
  args: z.infer<typeof createApiClientSchema>,
  client: AkamaiClient
) {
  // Validate business logic
  if (args.allowedApis.includes('*') && args.allowedApis.length > 1) {
    throw new Error('Cannot specify other APIs when using wildcard (*)');
  }
  
  const response = await client.request({
    method: 'POST',
    path: '/identity-management/v2/api-clients',
    body: {
      clientName: args.clientName,
      clientDescription: args.clientDescription,
      allowedApis: args.allowedApis,
      groupIds: args.groupIds,
      clientCredentials: args.clientCredentials
    }
  });
  
  return {
    clientId: response.clientId,
    clientSecret: response.clientSecret, // Only returned on creation
    message: 'API client created successfully. Save the client secret - it cannot be retrieved again.'
  };
}
```

### Tool with Progress Tracking

```typescript
// Tool that monitors long-running operations
export async function monitorBulkOperation(
  args: { operationId: string; customer?: string },
  client: AkamaiClient
) {
  const startTime = Date.now();
  const maxWaitTime = 300000; // 5 minutes
  
  while (Date.now() - startTime < maxWaitTime) {
    const response = await client.request({
      method: 'GET',
      path: `/bulk-operations/v1/operations/${args.operationId}`
    });
    
    if (response.status === 'COMPLETE') {
      return {
        status: 'complete',
        results: response.results,
        duration: Date.now() - startTime
      };
    }
    
    if (response.status === 'FAILED') {
      throw new Error(`Operation failed: ${response.error}`);
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Operation timed out after 5 minutes');
}
```

### Tool with File Handling

```typescript
// Tool that processes file content
const uploadZoneFileSchema = z.object({
  zoneFile: z.string().describe('Path to zone file or zone file content'),
  zoneName: z.string(),
  customer: z.string().optional()
});

export async function uploadZoneFile(
  args: z.infer<typeof uploadZoneFileSchema>,
  client: AkamaiClient
) {
  let content: string;
  
  // Check if input is file path or content
  if (args.zoneFile.includes('\n') || !args.zoneFile.includes('/')) {
    content = args.zoneFile;
  } else {
    // Read from file
    const fs = require('fs').promises;
    content = await fs.readFile(args.zoneFile, 'utf-8');
  }
  
  // Parse and validate zone file
  const records = parseZoneFile(content);
  
  // Upload records
  const response = await client.request({
    method: 'POST',
    path: `/dns/v2/zones/${args.zoneName}/records`,
    body: { records }
  });
  
  return {
    zone: args.zoneName,
    recordsCreated: response.records.length,
    message: 'Zone file uploaded successfully'
  };
}
```

## Testing Your Tool

### Unit Tests

Create a test file for your tool:

```typescript
// src/tools/__tests__/iam-tools.test.ts
import { listApiClients } from '../iam-tools';
import { AkamaiClient } from '../../lib/akamai-client';

jest.mock('../../lib/akamai-client');

describe('IAM Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
  });
  
  describe('listApiClients', () => {
    it('should list API clients successfully', async () => {
      const mockResponse = {
        apiClients: [
          {
            clientId: 'abc123',
            clientName: 'Test Client',
            clientType: 'CLIENT_CREDENTIALS'
          }
        ]
      };
      
      mockClient.request.mockResolvedValue(mockResponse);
      
      const result = await listApiClients({}, mockClient);
      
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/identity-management/v2/api-clients'
      });
      
      expect(result).toEqual({
        clients: mockResponse.apiClients,
        count: 1
      });
    });
    
    it('should handle errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));
      
      const result = await listApiClients({}, mockClient);
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Failed to list API clients');
    });
  });
});
```

### Integration Tests

Test with real API (using test credentials):

```typescript
// src/tools/__tests__/iam-tools.integration.test.ts
import { listApiClients } from '../iam-tools';
import { AkamaiClient } from '../../lib/akamai-client';

describe('IAM Tools Integration', () => {
  let client: AkamaiClient;
  
  beforeAll(() => {
    client = new AkamaiClient({
      edgercPath: process.env.EDGERC_PATH || '~/.edgerc',
      section: 'testing'
    });
  });
  
  it('should list real API clients', async () => {
    const result = await listApiClients({}, client);
    
    expect(result.clients).toBeDefined();
    expect(Array.isArray(result.clients)).toBe(true);
  });
});
```

### Manual Testing

Test with Claude Desktop:

1. Build your changes: `npm run build`
2. Restart Claude Desktop
3. Test your tool:
   ```
   List all API clients
   ```

## Documentation

### 1. Add to API Reference

Create documentation in `docs/wiki/api-reference/`:

```markdown
# IAM Tools API Reference

## iam_list_api_clients

Lists all API clients for the account.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| customer | string | No | Customer section from .edgerc |

### Response

```json
{
  "clients": [
    {
      "clientId": "abc123",
      "clientName": "Production API Client",
      "clientType": "CLIENT_CREDENTIALS",
      "createdDate": "2024-01-15T10:30:00Z",
      "allowedApis": ["papi", "dns"]
    }
  ],
  "count": 1
}
```

### Example

```
List all API clients for customer acme
```
```

### 2. Update Module Documentation

Add to relevant module guide:

```markdown
## Identity and Access Management

### Available Tools

- `iam_list_api_clients` - List API clients
- `iam_create_api_client` - Create new API client
- `iam_delete_api_client` - Delete API client
```

### 3. Add Examples

Include practical examples:

```markdown
### Managing API Clients

1. List existing clients:
   ```
   List all API clients
   ```

2. Create new client:
   ```
   Create API client "CI/CD Pipeline" with access to property and dns APIs
   ```
```

## Submission Process

### 1. Pre-Submission Checklist

- [ ] Code follows TypeScript best practices
- [ ] All inputs are validated with Zod
- [ ] Error handling is comprehensive
- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests pass (if applicable)
- [ ] Documentation is complete
- [ ] Linting passes: `npm run lint`
- [ ] Type checking passes: `npm run type-check`

### 2. Create Pull Request

1. Fork the repository
2. Create feature branch: `git checkout -b feature/add-iam-tools`
3. Commit changes with descriptive messages
4. Push to your fork
5. Create PR with:
   - Clear description of new tools
   - Link to relevant Akamai API docs
   - Example usage
   - Test results

### 3. PR Template

```markdown
## New Tools: IAM Management

### Description
Adds support for Identity and Access Management API to manage API clients.

### New Tools
- `iam_list_api_clients` - Lists all API clients
- `iam_create_api_client` - Creates new API client
- `iam_delete_api_client` - Deletes API client

### Testing
- [x] Unit tests (95% coverage)
- [x] Integration tests
- [x] Manual testing with Claude Desktop

### Documentation
- [x] API reference added
- [x] Module guide updated
- [x] Examples included

### Related
- Akamai API Docs: https://techdocs.akamai.com/iam/reference
- Fixes #123
```

## Best Practices

### 1. Input Validation

- Use Zod for schema validation
- Provide helpful error messages
- Set reasonable defaults
- Document all parameters

### 2. Error Handling

```typescript
try {
  const response = await client.request(options);
  return formatSuccess(response);
} catch (error) {
  // Provide context
  if (error.code === 'ENOTFOUND') {
    return formatError(error, 'Unable to reach Akamai API. Check your network connection.');
  }
  
  // Handle specific API errors
  if (error.status === 403) {
    return formatError(error, 'Permission denied. Check API credentials have required access.');
  }
  
  // Generic error with context
  return formatError(error, `Failed to ${operation}: ${error.message}`);
}
```

### 3. Response Formatting

- Return consistent structure
- Include helpful messages
- Format data for readability
- Add next steps when relevant

### 4. Performance

- Use pagination for large datasets
- Implement caching where appropriate
- Add progress indicators for long operations
- Batch operations when possible

## Common Patterns

### Pagination

```typescript
export async function listAllItems(args: any, client: AkamaiClient) {
  const items = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const response = await client.request({
      method: 'GET',
      path: `/api/v1/items?offset=${offset}&limit=${limit}`
    });
    
    items.push(...response.items);
    
    if (response.items.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  return { items, total: items.length };
}
```

### Caching

```typescript
const cache = new Map();

export async function getCachedData(args: any, client: AkamaiClient) {
  const cacheKey = `${args.type}-${args.id}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.data;
    }
  }
  
  const data = await client.request({
    method: 'GET',
    path: `/api/v1/data/${args.id}`
  });
  
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}
```

## Getting Help

- Review existing tools for examples
- Check Akamai API documentation
- Ask questions in GitHub Discussions
- Join our Discord for real-time help

---

*Thank you for contributing to ALECS! Your tools help make Akamai more accessible to everyone.*

*Last Updated: January 2025*