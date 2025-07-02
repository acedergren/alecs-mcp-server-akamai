---
name: "MCP UX: Tool Naming"
about: Standardize verbose tool names to short action-oriented format
title: "Rename verbose tools to follow action-resource pattern"
labels: enhancement, breaking-change, ux
assignees: ''

---

## Description
Complete the tool naming standardization to use short, action-oriented names that are easier for LLMs to remember and use.

## Requirements
- [ ] Audit all 198 tools for verbose names
- [ ] Create mapping of old names to new names
- [ ] Implement aliases for backward compatibility
- [ ] Update all internal references

## Naming Patterns
Current → New:
- `get-property-version-rule-tree` → `property.get-rules`
- `bulk-search-properties-by-hostnames` → `property.bulk-search`
- `list-property-version-hostnames` → `property.list-hostnames`
- `get-network-list-activation-status` → `network-list.get-activation`
- `generate-security-recommendations` → `security.suggest`
- `get-certificate-enrollment-details` → `certificate.get-details`

## Guidelines
- Use `resource.action` pattern
- Max 25 characters per tool name
- Common actions: list, get, create, update, delete, search, activate
- Avoid redundant words (e.g., "property" in "list-property-versions")

## Migration Strategy
1. **v1.8.0**: Add new names as aliases (both work)
2. **v1.9.0**: Mark old names as deprecated 
3. **v2.0.0**: Remove old names

## Implementation Checklist
- [ ] Create tool name mapping document
- [ ] Implement alias system in tool registry
- [ ] Update tool loading to support aliases
- [ ] Add deprecation warnings for old names
- [ ] Update all documentation
- [ ] Update tests to use new names

## Acceptance Criteria
- [ ] All tools follow consistent naming pattern
- [ ] No tool name exceeds 25 characters
- [ ] Backward compatibility maintained via aliases
- [ ] Migration guide created for users