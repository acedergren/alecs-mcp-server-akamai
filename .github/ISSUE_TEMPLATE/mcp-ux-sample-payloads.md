---
name: "MCP UX: Sample Payloads"
about: Add example payloads to all tool descriptions
title: "Enhance all tool descriptions with inline examples"
labels: enhancement, documentation, good-first-issue
assignees: ''

---

## Description
Update all 198 tool descriptions to include sample request payloads, making it easier for LLMs to understand parameter formats without trial and error.

## Requirements
- [ ] Audit all tool descriptions
- [ ] Add example JSON payloads to each description
- [ ] Include both minimal (required fields) and complete examples
- [ ] Ensure examples use realistic values

## Format Template
```typescript
{
  name: 'property.create',
  description: `Create a new property configuration
  
Example (minimal):
{
  "propertyName": "www.example.com",
  "productId": "prd_SPM",
  "contractId": "ctr_C-0NTRACT",
  "groupId": "grp_12345"
}

Example (with options):
{
  "propertyName": "www.example.com",
  "productId": "prd_SPM",
  "contractId": "ctr_C-0NTRACT",
  "groupId": "grp_12345",
  "ruleFormat": "v2024-05-31",
  "copyFromProperty": "prp_123456",
  "customer": "production"
}`
}
```

## Tool Categories to Update
- [ ] Property tools (32 tools)
- [ ] DNS tools (24 tools)
- [ ] Certificate tools (22 tools)
- [ ] Network List tools (12 tools)
- [ ] Fast Purge tools (8 tools)
- [ ] App Security tools (45 tools)
- [ ] Reporting tools (25 tools)
- [ ] Other tools

## Acceptance Criteria
- [ ] Every tool has at least one example in its description
- [ ] Examples are valid and would actually work
- [ ] Complex tools have multiple examples showing different use cases
- [ ] Examples follow consistent formatting