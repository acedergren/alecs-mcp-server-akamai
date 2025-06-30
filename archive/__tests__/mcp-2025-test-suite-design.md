# MCP 2025-06-18 Test Suite Design

## Overview

This document outlines the comprehensive test suite design for MCP 2025-06-18 protocol compliance, addressing all identified gaps and ensuring 100% coverage of the specification requirements.

## Test Suite Architecture

### 1. Test Categories

```
__tests__/
├── mcp-2025/
│   ├── protocol-compliance/     # Core protocol tests
│   ├── transport/              # Transport-specific tests
│   ├── oauth/                  # OAuth 2.0 tests
│   ├── error-handling/         # Error standards tests
│   ├── integration/            # Integration tests
│   └── performance/            # Performance tests
├── fixtures/
│   ├── mcp-2025/              # MCP protocol fixtures
│   ├── oauth/                 # OAuth fixtures
│   └── akamai/                # Akamai API fixtures
├── mocks/
│   ├── servers/               # Mock server implementations
│   ├── transports/            # Transport mocks
│   └── oauth/                 # OAuth mocks
└── helpers/
    ├── mcp-2025/              # MCP test helpers
    └── validators/            # Response validators
```

### 2. Mock Server Architecture

#### Base Mock Server
```typescript
interface MockServerConfig {
  transport: 'stdio' | 'http';
  oauth?: OAuthConfig;
  protocolVersion: '2025-06-18';
  capabilities: ServerCapabilities;
}

class BaseMockServer {
  // Core MCP protocol implementation
  // Configurable for different test scenarios
}
```

#### Transport-Specific Servers
- **StdioMockServer**: STDIO transport testing
- **HttpMockServer**: HTTP transport with OAuth
- **HybridMockServer**: Multi-transport testing

### 3. Test Coverage Matrix

| Component | Test Types | Priority | Coverage Target |
|-----------|------------|----------|-----------------|
| Protocol Compliance | Unit, Integration | High | 100% |
| STDIO Transport | Unit, Integration | High | 100% |
| HTTP Transport | Unit, Integration | High | 100% |
| OAuth 2.0 | Unit, Integration, Security | High | 100% |
| Error Handling | Unit, Edge Cases | High | 100% |
| Request ID Tracking | Unit, Concurrency | High | 100% |
| Metadata Validation | Unit | High | 100% |
| Tool Naming | Unit | Medium | 100% |
| Response Format | Unit | High | 100% |
| Large Payloads | Performance | Medium | 95% |
| Akamai Integration | Integration | Medium | 90% |

## Detailed Test Specifications

### 1. Protocol Compliance Tests

#### 1.1 Core Protocol Tests
```typescript
describe('MCP 2025-06-18 Protocol Compliance', () => {
  describe('Protocol Version', () => {
    test('server announces correct protocol version');
    test('client validates protocol version compatibility');
    test('version negotiation handles mismatches');
  });

  describe('Message Format', () => {
    test('validates JSON-RPC 2.0 structure');
    test('enforces required fields');
    test('handles batch requests correctly');
  });

  describe('Request ID Management', () => {
    test('generates unique request IDs');
    test('tracks IDs to prevent reuse');
    test('handles concurrent requests');
    test('cleans up old IDs periodically');
  });
});
```

#### 1.2 Tool Registration Tests
```typescript
describe('Tool Registration', () => {
  test('validates snake_case naming convention');
  test('validates JSON Schema format');
  test('rejects invalid tool definitions');
  test('handles tool name conflicts');
  test('supports backward compatibility');
});
```

### 2. Transport-Specific Tests

#### 2.1 STDIO Transport Tests
```typescript
describe('STDIO Transport', () => {
  describe('Message Framing', () => {
    test('handles newline-delimited JSON');
    test('buffers partial messages');
    test('handles malformed JSON gracefully');
  });

  describe('Stream Management', () => {
    test('manages stdin/stdout correctly');
    test('handles stream errors');
    test('implements backpressure');
  });

  describe('Security', () => {
    test('validates no OAuth required for STDIO');
    test('implements process isolation');
  });
});
```

#### 2.2 HTTP Transport Tests
```typescript
describe('HTTP Transport', () => {
  describe('HTTP/2 Support', () => {
    test('negotiates HTTP/2 when available');
    test('falls back to HTTP/1.1');
    test('handles multiplexing');
  });

  describe('Request/Response', () => {
    test('validates Content-Type headers');
    test('handles chunked encoding');
    test('implements proper CORS');
  });

  describe('WebSocket Upgrade', () => {
    test('supports WebSocket upgrade');
    test('maintains message ordering');
    test('handles connection drops');
  });
});
```

### 3. OAuth 2.0 Tests

#### 3.1 Resource Server Tests
```typescript
describe('OAuth 2.0 Resource Server', () => {
  describe('Protected Resource Metadata', () => {
    test('exposes /.well-known/oauth-protected-resource');
    test('returns correct metadata format');
    test('includes all required fields');
  });

  describe('Token Validation', () => {
    test('validates bearer tokens');
    test('checks token expiration');
    test('validates token scopes');
    test('handles token introspection');
  });

  describe('Resource Indicators (RFC 8707)', () => {
    test('validates resource indicators in token');
    test('rejects tokens for wrong resource');
    test('handles multiple resource indicators');
  });
});
```

#### 3.2 Client OAuth Tests
```typescript
describe('OAuth 2.0 Client', () => {
  describe('Token Acquisition', () => {
    test('requests tokens with resource indicators');
    test('handles token refresh');
    test('caches tokens appropriately');
  });

  describe('Authorization Flow', () => {
    test('implements client credentials flow');
    test('includes required parameters');
    test('handles authorization errors');
  });
});
```

### 4. Error Handling Tests

#### 4.1 MCP Error Standards
```typescript
describe('MCP Error Standards', () => {
  describe('Error Codes', () => {
    test('uses standard MCP error codes');
    test('includes helpful error messages');
    test('preserves error context');
  });

  describe('Error Response Format', () => {
    test('follows JSON-RPC 2.0 error format');
    test('includes error data when appropriate');
    test('maintains request ID in errors');
  });

  describe('Error Recovery', () => {
    test('handles transient errors gracefully');
    test('implements exponential backoff');
    test('provides actionable error messages');
  });
});
```

### 5. Integration Tests

#### 5.1 Full Protocol Flow
```typescript
describe('End-to-End Protocol Flow', () => {
  test('complete tool discovery and execution');
  test('multi-tool workflow execution');
  test('error recovery in workflows');
  test('concurrent request handling');
});
```

#### 5.2 Akamai API Integration
```typescript
describe('Akamai API Integration', () => {
  test('property management workflows');
  test('DNS configuration workflows');
  test('security configuration workflows');
  test('bulk operations handling');
});
```

## Mock Data and Fixtures

### 1. Protocol Fixtures
```typescript
// fixtures/mcp-2025/protocol.ts
export const protocolFixtures = {
  validRequest: {
    jsonrpc: '2.0',
    id: 'mcp-1234567890-1',
    method: 'tools/call',
    params: {
      name: 'list_properties',
      arguments: { customer: 'test' }
    }
  },
  validResponse: {
    jsonrpc: '2.0',
    id: 'mcp-1234567890-1',
    result: {
      content: [{ type: 'text', text: 'Success' }]
    }
  },
  errorResponse: {
    jsonrpc: '2.0',
    id: 'mcp-1234567890-1',
    error: {
      code: -32602,
      message: 'Invalid params',
      data: { field: 'name', reason: 'Required field missing' }
    }
  }
};
```

### 2. OAuth Fixtures
```typescript
// fixtures/oauth/tokens.ts
export const oauthFixtures = {
  validToken: {
    access_token: 'valid-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'mcp:read mcp:write',
    resource: ['https://api.example.com/mcp']
  },
  protectedResourceMetadata: {
    authorization_server: 'https://auth.example.com',
    resource: 'https://api.example.com/mcp',
    scopes_supported: ['mcp:read', 'mcp:write'],
    bearer_methods_supported: ['header', 'body', 'query']
  }
};
```

## Test Implementation Plan

### Phase 1: Foundation (Week 1)
1. Create test directory structure
2. Implement base mock servers
3. Create core fixtures and helpers
4. Set up test utilities and validators

### Phase 2: Protocol Tests (Week 2)
1. Implement protocol compliance tests
2. Add request ID tracking tests
3. Create metadata validation tests
4. Test error handling standards

### Phase 3: Transport Tests (Week 3)
1. Implement STDIO transport tests
2. Create HTTP transport tests
3. Add WebSocket tests
4. Test transport switching

### Phase 4: OAuth Tests (Week 4)
1. Implement resource server tests
2. Create client OAuth tests
3. Add security validation tests
4. Test token management

### Phase 5: Integration (Week 5)
1. Create end-to-end workflows
2. Add Akamai API integration tests
3. Implement performance tests
4. Create stress tests

### Phase 6: Coverage & Polish (Week 6)
1. Achieve 100% coverage targets
2. Add edge case tests
3. Create test documentation
4. Performance optimization

## Success Criteria

1. **Coverage**: 100% code coverage for all MCP protocol components
2. **Compliance**: All tests pass against MCP 2025-06-18 specification
3. **Performance**: Tests complete within 5 minutes
4. **Reliability**: No flaky tests, consistent results
5. **Documentation**: Complete test documentation and examples

## Maintenance Strategy

1. **Continuous Validation**: Run tests on every commit
2. **Specification Updates**: Monitor MCP spec changes
3. **Performance Monitoring**: Track test execution times
4. **Coverage Reports**: Generate weekly coverage reports
5. **Test Health**: Regular test suite health checks