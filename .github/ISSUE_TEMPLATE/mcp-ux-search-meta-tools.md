---
name: "MCP UX: Search Meta-Tools"
about: Create tool search and discovery meta-tools
title: "Add meta-tools for finding the right tool for the job"
labels: enhancement, ux, ai-friendly
assignees: ''

---

## Description
Implement meta-tools that help LLMs discover appropriate tools based on intent, keywords, or use cases.

## Requirements
- [ ] Create `meta.search` - Search tools by keyword
- [ ] Create `meta.suggest` - Get tool suggestions for use case
- [ ] Create `meta.workflow` - Get common tool sequences
- [ ] Create `meta.categories` - List all tool categories

## Tool Specifications

### meta.search
```typescript
// Search tools by keyword
await meta.search({ 
  query: "certificate",
  category: "security"  // optional filter
})

// Returns:
{
  "results": [
    {
      "tool": "certificate.create",
      "score": 0.95,
      "description": "Create a new DV certificate",
      "category": "certificates"
    },
    // ...
  ]
}
```

### meta.suggest
```typescript
// Get suggestions based on intent
await meta.suggest({ 
  intent: "I want to speed up my website"
})

// Returns:
{
  "suggestions": [
    {
      "tool": "property.get-rules",
      "reason": "View current caching rules",
      "relevance": "high"
    },
    {
      "tool": "reporting.get-performance",
      "reason": "Analyze current performance metrics",
      "relevance": "high"
    }
  ]
}
```

### meta.workflow
```typescript
// Get tool sequence for common tasks
await meta.workflow({ 
  goal: "deploy new website"
})

// Returns:
{
  "workflow": {
    "name": "Deploy New Website",
    "steps": [
      {
        "order": 1,
        "tool": "property.create",
        "description": "Create property configuration"
      },
      {
        "order": 2,
        "tool": "dns.create-zone",
        "description": "Set up DNS zone"
      },
      // ...
    ]
  }
}
```

## Implementation Notes
- Build search index from tool descriptions and parameters
- Include common misspellings and aliases
- Use fuzzy matching for typo tolerance
- Learn from usage patterns (which tools are used together)

## Search Index Features
- Full-text search across names and descriptions
- Category filtering
- Synonym support (e.g., "purge" → "invalidate", "clear cache")
- Common abbreviations (e.g., "cert" → "certificate")

## Acceptance Criteria
- [ ] Search finds relevant tools with 90%+ accuracy
- [ ] Suggestions match user intent
- [ ] Workflows cover top 20 use cases
- [ ] Response time <100ms for all meta-tools