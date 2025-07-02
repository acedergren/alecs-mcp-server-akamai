---
name: "MCP UX: Help System"
about: Add help and describe meta-tools for tool discovery
title: "Add help system for tool discovery and usage examples"
labels: enhancement, ux, priority:high
assignees: ''

---

## Description
Implement a comprehensive help system that allows LLMs and users to discover tools and understand their usage without external documentation.

## Requirements
- [ ] Create `help.tool` - Get detailed help for any specific tool
  - Input: tool name (e.g., "property.create")
  - Output: Description, parameters with types, example payloads, common errors
- [ ] Create `help.list` - List all available tools with categories
  - Optional filter by category (property, dns, security, etc.)
  - Include short descriptions for each tool
- [ ] Create `help.search` - Search tools by keyword or use case
  - Input: search query (e.g., "purge", "certificate", "dns record")
  - Output: Matching tools with relevance scores
- [ ] Create `help.examples` - Get example payloads for specific operations
  - Input: operation type (e.g., "create property", "activate staging")
  - Output: Complete example requests with explanations

## Implementation Notes
- Use existing tool registry to generate help dynamically
- Include parameter validation rules in help output
- Cache help responses for performance

## Acceptance Criteria
- [ ] LLMs can discover appropriate tools without prior knowledge
- [ ] Help includes working examples that can be copy-pasted
- [ ] Search returns relevant results for common use cases
- [ ] Performance: Help responses return in <100ms

## Example Usage
```typescript
// Get help for a specific tool
await help.tool({ tool: "property.create" })

// Response:
{
  "tool": "property.create",
  "description": "Create a new property configuration",
  "parameters": {
    "propertyName": { "type": "string", "required": true },
    "productId": { "type": "string", "required": true },
    // ...
  },
  "examples": [
    {
      "description": "Basic property creation",
      "request": { /* ... */ }
    }
  ]
}
```