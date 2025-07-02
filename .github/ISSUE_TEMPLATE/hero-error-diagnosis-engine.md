---
name: "Hero Feature: Error Diagnosis Engine"
about: Core engine for parsing and understanding Akamai errors
title: "Build error diagnosis engine for Akamai error parsing"
labels: hero-feature, enhancement, backend, priority:critical
assignees: ''

---

## Description
Build the core engine that can parse, understand, and categorize Akamai's complex error responses across all services (Property Manager, DNS, CPS, etc.).

## Requirements

### Error Parser
- [ ] Parse nested Akamai error structures
  ```json
  {
    "type": "https://problems.luna.akamaiapis.net/property-manager/v1/...",
    "title": "Forbidden",
    "status": 403,
    "detail": "You do not have permission to access this resource",
    "instance": "/property-manager/v1/properties",
    "errors": [{
      "type": "insufficient_permissions",
      "title": "Insufficient permissions",
      "detail": "Contract ctr_C-0NTRACT requires write access"
    }]
  }
  ```

### Error Pattern Database
- [ ] Create comprehensive error pattern library
  ```typescript
  interface ErrorPattern {
    id: string;
    service: 'property' | 'dns' | 'cps' | 'network-lists' | 'appsec';
    httpStatus: number;
    errorType: string;
    titlePattern: RegExp;
    detailPattern?: RegExp;
    category: 'permission' | 'validation' | 'conflict' | 'rate-limit' | 'not-found';
  }
  ```

### Pattern Matching Engine
- [ ] Implement fuzzy matching for error variations
- [ ] Handle multi-language error messages
- [ ] Support partial matches with confidence scores

### Context Enrichment
- [ ] Extract operation context (tool, parameters, customer)
- [ ] Identify related resources (contract, group, property)
- [ ] Track error frequency and patterns

## Implementation

### Core Classes
```typescript
// Error parser
export class AkamaiErrorParser {
  parse(error: any): ParsedError {
    // Handle different error formats
    if (this.isAkamaiProblemJson(error)) {
      return this.parseProblemJson(error);
    }
    if (this.isLegacyError(error)) {
      return this.parseLegacyError(error);
    }
    return this.parseGenericError(error);
  }
}

// Pattern matcher
export class ErrorPatternMatcher {
  private patterns: Map<string, ErrorPattern>;
  
  match(error: ParsedError): ErrorMatch[] {
    const matches = [];
    for (const [id, pattern] of this.patterns) {
      const score = this.calculateMatchScore(error, pattern);
      if (score > 0.7) {
        matches.push({ pattern, score, id });
      }
    }
    return matches.sort((a, b) => b.score - a.score);
  }
}
```

### Error Categories

#### Permission Errors (403/401)
- Missing API permissions
- Wrong contract/group access
- Account switching required
- Expired credentials

#### Validation Errors (400)
- Invalid property names
- Malformed rule JSON
- Missing required fields
- Domain validation failures

#### Conflict Errors (409)
- Duplicate resources
- Activation conflicts
- Concurrent modifications

#### Rate Limiting (429)
- API rate limits
- Activation queue limits

## Testing Requirements
- [ ] Unit tests for each error pattern
- [ ] Integration tests with real Akamai errors
- [ ] Performance tests (parse 1000 errors/second)
- [ ] Accuracy tests (95%+ correct categorization)

## Acceptance Criteria
- [ ] Correctly parses 95%+ of Akamai errors
- [ ] Identifies error category with high confidence
- [ ] Extracts all relevant context information
- [ ] Performance: <10ms per error parse
- [ ] Handles malformed/incomplete errors gracefully

## Dependencies
- Error pattern research (collect real-world examples)
- Service-specific error documentation
- Multi-language support considerations