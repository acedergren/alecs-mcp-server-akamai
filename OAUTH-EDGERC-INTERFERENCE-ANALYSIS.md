# OAuth Implementation Interference with EdgeRC Authentication Analysis

## Executive Summary

After analyzing the codebase, I've identified several areas where the OAuth implementation interferes with EdgeRC authentication for Akamai API calls. The main issues stem from conflicting authentication flows, credential management overlap, and potential runtime conflicts.

## Key Findings

### 1. **Multiple Authentication Paradigms Conflict**

#### EdgeGrid Authentication (Original)
- **Location**: `src/auth/EdgeGridAuth.ts`, `src/akamai-client.ts`
- **Method**: Uses `.edgerc` file credentials loaded via `CustomerConfigManager`
- **Flow**: Direct credential-based authentication with Akamai APIs
- **Customer Selection**: Based on section names in `.edgerc` file

#### OAuth Authentication (New)
- **Location**: `src/auth/oauth/`, `src/services/CustomerContextManager.ts`
- **Method**: Token-based authentication with OAuth 2.1 flows
- **Flow**: OAuth token validation → Customer context switching → Credential decryption
- **Customer Selection**: Based on OAuth subject mapping and context switching

### 2. **Credential Management Interference**

#### Issue 1: Dual Credential Storage
```typescript
// EdgeGridAuth.ts - Direct .edgerc usage
this.credentials = CustomerConfigManager.getInstance().getSection(customer);

// CustomerContextManager.ts - Encrypted credential storage
const credentials = await this.credentialManager.decryptCredentials(
  latestCredential!.id,
  session.profile.sub,
);
```

**Problem**: Two separate systems trying to manage the same EdgeGrid credentials:
- `CustomerConfigManager` reads from `.edgerc` directly
- `SecureCredentialManager` stores encrypted credentials in memory/database

#### Issue 2: EdgeGrid Client Caching Conflict
```typescript
// CustomerContextManager.ts
private edgeGridClients: Map<string, EdgeGridAuth> = new Map();

// EdgeGridAuth.ts
private static instances: Map<string, EdgeGridAuth> = new Map();
```

**Problem**: Both classes maintain separate caches of EdgeGrid clients, potentially leading to:
- Duplicate client instances
- Inconsistent authentication states
- Memory leaks

### 3. **Runtime Conflicts**

#### Issue 1: Customer Context Confusion
The OAuth implementation introduces a new concept of "customer context" that conflicts with the simple section-based approach:

```typescript
// OAuth approach - complex context switching
async switchCustomer(request: CustomerSwitchRequest): Promise<CustomerContext> {
  // Complex authorization checks
  // Session management
  // Cache invalidation
}

// EdgeRC approach - simple section selection
new AkamaiClient('customer-section-name')
```

#### Issue 2: Initialization Order Problems
1. `CustomerConfigManager` is a singleton initialized on first use
2. `SecureCredentialManager` is also a singleton but requires a master key
3. `CustomerContextManager` tries to use both but may initialize in wrong order

### 4. **Specific Interference Points**

#### A. In `CustomerContextManager.getEdgeGridClient()`
```typescript
// Line 189-204: Tries to get credentials from SecureCredentialManager
const credentialList = this.credentialManager.listCustomerCredentials(customerId);

// Line 206-212: Creates EdgeGridAuth instance
const client = EdgeGridAuth.getInstance({
  customer: customerId,
  validateOnInit: true,
});
```

**Problem**: This bypasses the normal `.edgerc` flow and tries to use encrypted credentials that may not exist.

#### B. In `AkamaiClient` vs `EdgeGridAuth`
- `AkamaiClient` uses the official `akamai-edgegrid` SDK
- `EdgeGridAuth` reimplements the authentication logic
- Both are used in different parts of the codebase

### 5. **Configuration Conflicts**

#### Environment Variables
```bash
# EdgeRC approach
EDGERC_PATH=/path/to/.edgerc

# OAuth approach
CREDENTIAL_MASTER_KEY=encryption-key
OAUTH_ENABLED=true
```

**Problem**: When OAuth is enabled, it's unclear which authentication method takes precedence.

## Impact Assessment

### 1. **Breaking Changes**
- Existing EdgeRC-based authentication may fail when OAuth is enabled
- Customer switching logic is fundamentally different
- Credential rotation affects EdgeRC file validity

### 2. **Performance Issues**
- Double caching of EdgeGrid clients
- Additional encryption/decryption overhead
- Complex authorization checks for every API call

### 3. **Security Concerns**
- Credentials stored in two places (filesystem + encrypted storage)
- Potential credential leakage if both systems aren't synchronized
- Master key management adds complexity

## Recommendations

### Immediate Fixes

1. **Separate the Authentication Flows**
   ```typescript
   // Add authentication mode configuration
   enum AuthMode {
     EDGERC = 'edgerc',
     OAUTH = 'oauth'
   }
   
   // Use single mode per instance
   const authMode = process.env.AUTH_MODE || AuthMode.EDGERC;
   ```

2. **Unify EdgeGrid Client Creation**
   - Remove `EdgeGridAuth` class entirely
   - Use only `AkamaiClient` with the official SDK
   - Add OAuth token injection to `AkamaiClient` if needed

3. **Fix Customer Context Manager**
   ```typescript
   async getEdgeGridClient(request: CustomerCredentialRequest): Promise<AkamaiClient> {
     // Check auth mode
     if (this.authMode === AuthMode.EDGERC) {
       return new AkamaiClient(customerId);
     }
     
     // Only use encrypted credentials in OAuth mode
     // ...existing OAuth logic...
   }
   ```

### Long-term Solutions

1. **Create Authentication Abstraction**
   ```typescript
   interface IAuthProvider {
     authenticate(request: Request): Promise<AuthContext>;
     getCredentials(customer: string): Promise<EdgeGridCredentials>;
   }
   
   class EdgeRCAuthProvider implements IAuthProvider { }
   class OAuthAuthProvider implements IAuthProvider { }
   ```

2. **Unified Configuration Management**
   - Single source of truth for customer configurations
   - Clear separation between authentication and API credentials
   - Consistent caching strategy

3. **Gradual Migration Path**
   - Support both auth methods during transition
   - Clear documentation on which to use when
   - Migration tools for existing customers

## Conclusion

The OAuth implementation significantly interferes with EdgeRC authentication due to:
1. Conflicting credential management systems
2. Duplicate client caching mechanisms
3. Incompatible customer context models
4. Unclear precedence when both are configured

These issues need to be addressed before the OAuth implementation can be safely used in production alongside existing EdgeRC authentication.