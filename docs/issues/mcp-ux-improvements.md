# MCP UX Improvement Issues for v1.8.0

These issues should be created on GitHub to track the implementation of best-in-class MCP UX improvements.

---

## Issue #1: Add Help and Describe Meta-Tools

**Title**: Add help system for tool discovery and usage examples

**Labels**: `enhancement`, `ux`, `priority:high`

**Description**:
Implement a comprehensive help system that allows LLMs and users to discover tools and understand their usage without external documentation.

**Requirements**:
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

**Implementation Notes**:
- Use existing tool registry to generate help dynamically
- Include parameter validation rules in help output
- Cache help responses for performance

**Acceptance Criteria**:
- LLMs can discover appropriate tools without prior knowledge
- Help includes working examples that can be copy-pasted
- Search returns relevant results for common use cases

---

## Issue #2: Add Sample Payloads to All Tool Descriptions

**Title**: Enhance all tool descriptions with inline examples

**Labels**: `enhancement`, `documentation`, `good-first-issue`

**Description**:
Update all 198 tool descriptions to include sample request payloads, making it easier for LLMs to understand parameter formats without trial and error.

**Requirements**:
- [ ] Audit all tool descriptions
- [ ] Add example JSON payloads to each description
- [ ] Include both minimal (required fields) and complete examples
- [ ] Ensure examples use realistic values

**Example Format**:
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

**Acceptance Criteria**:
- Every tool has at least one example in its description
- Examples are valid and would actually work
- Complex tools have multiple examples showing different use cases

---

## Issue #3: Standardize Tool Names to Short Action-Oriented Format

**Title**: Rename verbose tools to follow action-resource pattern

**Labels**: `enhancement`, `breaking-change`, `ux`

**Description**:
Complete the tool naming standardization to use short, action-oriented names that are easier for LLMs to remember and use.

**Requirements**:
- [ ] Audit all 198 tools for verbose names
- [ ] Create mapping of old names to new names
- [ ] Implement aliases for backward compatibility
- [ ] Update all internal references

**Naming Patterns**:
- `get-property-version-rule-tree` → `property.get-rules`
- `bulk-search-properties-by-hostnames` → `property.bulk-search`
- `list-property-version-hostnames` → `property.list-hostnames`
- `get-network-list-activation-status` → `network-list.get-activation`

**Migration Strategy**:
1. Add new names as aliases first
2. Update documentation to use new names
3. Deprecate old names in next major version

**Acceptance Criteria**:
- All tools follow consistent `resource.action` pattern
- No tool name exceeds 25 characters
- Backward compatibility maintained via aliases

---

## Issue #4: Implement Consistent Pagination Across All List Operations

**Title**: Add standardized pagination to prevent token limit issues

**Labels**: `enhancement`, `performance`, `priority:high`

**Description**:
Implement consistent pagination across all list/search operations to handle large result sets without exceeding MCP's 25,000 token response limit.

**Requirements**:
- [ ] Add standard pagination parameters to all list operations:
  - `pageSize` (default: 20, max: 100)
  - `pageToken` (for cursor-based pagination)
- [ ] Return standard pagination metadata:
  - `nextPageToken` (null if no more pages)
  - `totalCount` (if available from API)
  - `hasMore` boolean
- [ ] Update bulk operations to use pagination internally
- [ ] Add streaming support for very large operations

**Example Response**:
```json
{
  "items": [...],
  "pagination": {
    "pageSize": 20,
    "nextPageToken": "eyJvZmZzZXQiOjIwfQ==",
    "totalCount": 156,
    "hasMore": true
  }
}
```

**Affected Tools** (partial list):
- All `list-*` tools
- All `search-*` tools
- All `get-all-*` tools
- Reporting tools with large datasets

**Acceptance Criteria**:
- No single response exceeds 20,000 tokens
- Pagination works consistently across all tools
- Clear documentation on how to fetch all pages

---

## Issue #5: Create Tool Search and Discovery Meta-Tools

**Title**: Add meta-tools for finding the right tool for the job

**Labels**: `enhancement`, `ux`, `ai-friendly`

**Description**:
Implement meta-tools that help LLMs discover appropriate tools based on intent, keywords, or use cases.

**Requirements**:
- [ ] Create `meta.search` - Search tools by keyword
  - Full-text search across names, descriptions, and categories
  - Return relevance scores
- [ ] Create `meta.suggest` - Get tool suggestions for use case
  - Input: Natural language intent (e.g., "I want to purge content")
  - Output: Ranked list of relevant tools with explanations
- [ ] Create `meta.workflow` - Get common tool sequences
  - Input: Goal (e.g., "deploy new website")
  - Output: Ordered list of tools to use
- [ ] Create `meta.categories` - List all tool categories
  - Hierarchical category structure
  - Tool count per category

**Implementation Notes**:
- Use embeddings for semantic search
- Include common aliases and synonyms
- Learn from usage patterns over time

**Acceptance Criteria**:
- LLMs can find tools using natural language
- Suggestions are accurate and helpful
- Workflows cover 80% of common use cases

---

## Issue #6: Add Undo/Rollback Tools for Destructive Operations

**Title**: Implement rollback capabilities for critical operations

**Labels**: `enhancement`, `safety`, `priority:critical`

**Description**:
Add undo/rollback tools for all destructive or state-changing operations to improve safety and user confidence.

**Requirements**:
- [ ] `property.rollback` - Revert property to previous version
  - Automatically create new version with previous rules
  - Optional: rollback to specific version
- [ ] `dns.rollback` - Undo recent DNS changes
  - Revert to previous zone version
  - Support partial rollback of specific records
- [ ] `activation.cancel` - Cancel in-progress activations
  - Works for both property and DNS activations
  - Provide clear status after cancellation
- [ ] `network-list.restore` - Restore previous network list state
  - Include IP addresses and geographic codes
- [ ] `certificate.rollback` - Revert certificate deployment
  - Only for Enhanced TLS deployments

**Safety Features**:
- Rollback creates audit trail
- Confirm rollback with summary of changes
- Time limit for rollback (e.g., 24 hours)
- Some operations may not be reversible (clearly documented)

**Acceptance Criteria**:
- All major state changes can be rolled back
- Rollback operations are atomic
- Clear feedback on what was rolled back

---

## Issue #7: Set Up Continuous Testing with Real MCP Clients

**Title**: Implement automated testing against Claude Desktop and other MCP clients

**Labels**: `testing`, `ci/cd`, `quality`

**Description**:
Create comprehensive test suite that validates ALECS works correctly with real MCP clients, catching edge cases and compatibility issues.

**Requirements**:
- [ ] Claude Desktop integration tests
  - Test all transport types (stdio, websocket, sse)
  - Validate JSON-RPC compliance
  - Check token limit handling
- [ ] Cursor compatibility tests
  - Ensure tool names work with Cursor's UI
  - Test auto-completion features
- [ ] Response size validation
  - Automated checks for 25k token limit
  - Test pagination edge cases
- [ ] LLM prompt testing
  - Test tools with various prompt styles
  - Validate error messages are LLM-friendly
- [ ] Performance benchmarks
  - Response time targets
  - Memory usage limits

**Test Infrastructure**:
- GitHub Actions workflow for continuous testing
- Mock MCP client for unit tests
- Real client testing in staging environment

**Acceptance Criteria**:
- 95%+ compatibility with major MCP clients
- All tools tested with token limits
- Performance regressions caught automatically

---

## Implementation Roadmap

### Phase 1 (Week 1-2): Foundation
- Issue #1: Help system
- Issue #2: Sample payloads
- Issue #7: Testing framework

### Phase 2 (Week 3-4): Core UX
- Issue #3: Tool naming
- Issue #4: Pagination
- Issue #5: Search meta-tools

### Phase 3 (Week 5): Safety
- Issue #6: Rollback tools

### Success Metrics
- Tool discovery time reduced by 75%
- Failed tool calls reduced by 50%
- User satisfaction score > 4.5/5
- LLM success rate > 90% on first attempt

### Breaking Changes
- Tool renames will be aliased in 1.8.0
- Old names deprecated in 1.9.0
- Removed in 2.0.0

These improvements will make ALECS the gold standard for MCP server UX!