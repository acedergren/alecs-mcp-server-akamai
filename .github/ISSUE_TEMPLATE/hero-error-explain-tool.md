---
name: "Hero Feature: Error Explain Tool"
about: User-facing tool for error diagnosis
title: "Create error.explain tool for users"
labels: hero-feature, enhancement, tools, priority:critical
assignees: ''

---

## Description
Create the user-facing `error.explain` tool that integrates all error diagnosis components into a seamless experience for Cursor/Claude users.

## Requirements

### Tool Interface
```typescript
{
  name: 'error.explain',
  description: `Diagnose and fix Akamai errors with AI-powered analysis

Example:
{
  "error": "403 Forbidden",
  "context": {
    "operation": "property.create",
    "parameters": {
      "contractId": "ctr_C-0NTRACT",
      "groupId": "grp_12345"
    }
  }
}

Or simply paste the error:
{
  "error": {
    "type": "https://problems.luna.akamaiapis.net/...",
    "title": "Forbidden",
    "status": 403
  }
}`,
  inputSchema: {
    type: 'object',
    properties: {
      error: {
        oneOf: [
          { type: 'string', description: 'Error message' },
          { type: 'object', description: 'Error object' }
        ]
      },
      context: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          parameters: { type: 'object' },
          customer: { type: 'string' }
        }
      },
      options: {
        type: 'object',
        properties: {
          autoFix: { type: 'boolean', default: false },
          detailed: { type: 'boolean', default: true },
          language: { type: 'string', default: 'en' }
        }
      }
    },
    required: ['error']
  }
}
```

### Response Format
```typescript
interface ExplainResponse {
  // Quick summary for impatient users
  summary: {
    problem: string;      // "You don't have access to this contract"
    solution: string;     // "Use a different contract or switch accounts"
    fixAvailable: boolean;
  };
  
  // Detailed diagnosis
  diagnosis: {
    errorType: string;
    service: string;
    rootCause: string;
    confidence: number;
    technicalDetails?: any;
  };
  
  // Actionable solutions
  solutions: Array<{
    title: string;
    description: string;
    steps: Array<{
      order: number;
      action: string;
      command?: string;
      explanation?: string;
    }>;
    estimatedTime: string;
    successRate: number;
  }>;
  
  // Auto-fix option
  autoFix?: {
    available: boolean;
    description: string;
    preview: any;
    command: string;
    risks: string[];
  };
  
  // Learning prompt
  learn?: {
    explanation: string;
    prevention: string;
    relatedDocs: string[];
  };
}
```

## Implementation

### Tool Handler
```typescript
export async function explainError(
  client: AkamaiClient,
  args: ErrorExplainArgs
): Promise<MCPToolResponse> {
  try {
    // 1. Parse the error
    const parser = new AkamaiErrorParser();
    const parsed = parser.parse(args.error);
    
    // 2. Enrich with context
    const context = await enrichContext(args.context, client);
    
    // 3. Diagnose the error
    const diagnosis = await diagnosisEngine.diagnose(parsed, context);
    
    // 4. Generate solutions
    const solutions = await solutionGenerator.generate(diagnosis, context);
    
    // 5. Check for auto-fix
    let autoFix = null;
    if (args.options?.autoFix) {
      autoFix = await autoFixEngine.generateFix(diagnosis, context);
    }
    
    // 6. Format response
    return formatResponse(diagnosis, solutions, autoFix);
    
  } catch (error) {
    // Even error handling errors get explained!
    return explainErrorHandlingError(error);
  }
}
```

### Integration Points
- [ ] Error diagnosis engine
- [ ] Solution generator
- [ ] Auto-fix engine
- [ ] Pattern library
- [ ] Context enrichment

### User Experience Features

#### Smart Error Detection
```typescript
// Automatically detect errors in recent operations
await error.explain({ recent: true })

// Returns:
"I noticed your last operation failed with a 403 error. Here's what happened..."
```

#### Conversational Explanations
```typescript
// Adjust explanation style
await error.explain({ 
  error: "...",
  options: { style: "beginner" }
})

// Returns:
"It looks like you're trying to create a property, but Akamai is saying 
you don't have permission. Think of it like trying to create a file in 
a folder you don't own..."
```

#### Batch Error Analysis
```typescript
// Analyze multiple errors for patterns
await error.explain({ 
  errors: [error1, error2, error3] 
})

// Returns:
"I see a pattern - all these errors are related to contract permissions.
Here's a single fix that should resolve all of them..."
```

## Testing Requirements
- [ ] End-to-end error flow tests
- [ ] Response format validation
- [ ] Performance tests (<500ms response)
- [ ] User experience testing
- [ ] Multi-language support tests

## Acceptance Criteria
- [ ] Handles 95%+ of Akamai errors
- [ ] Provides actionable solutions
- [ ] Auto-fix available for common errors
- [ ] Clear, helpful explanations
- [ ] Fast response times
- [ ] Graceful handling of unknown errors

## Example Usage

### Simple Permission Error
```typescript
await error.explain({
  error: "403 Forbidden: Cannot create property"
})

// Response:
{
  summary: {
    problem: "You don't have permission to create properties in this contract",
    solution: "Switch to a contract where you have write access",
    fixAvailable: true
  },
  solutions: [{
    title: "Use an accessible contract",
    steps: [
      {
        action: "First, let's see which contracts you can use",
        command: "property.list-contracts"
      },
      {
        action: "Now retry with a contract from that list",
        command: "property.create({ ...params, contractId: 'ctr_ACCESSIBLE' })"
      }
    ],
    estimatedTime: "30 seconds",
    successRate: 0.95
  }],
  autoFix: {
    available: true,
    description: "I can automatically retry with contract ctr_XYZ",
    command: "error.auto-fix({ fixId: 'contract-switch-xyz' })"
  }
}
```

### Complex Validation Error
```typescript
await error.explain({
  error: {
    type: "validation-failed",
    errors: [
      { field: "rules", message: "Invalid JSON" },
      { field: "hostname", message: "Already exists" }
    ]
  }
})

// Response explains each issue and how to fix it
```

## Dependencies
- All other hero feature components
- MCP tool framework
- Response formatting utilities
- Internationalization support