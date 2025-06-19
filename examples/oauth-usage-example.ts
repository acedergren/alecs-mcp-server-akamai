/**
 * OAuth 2.1 Usage Example
 * Demonstrates how to use the OAuth 2.1 protected MCP server
 */

import {
  OAuth21ComplianceManager,
  TokenValidator,
  type PKCEParameters,
  type OAuth21AuthorizationRequest,
  type OAuth21TokenRequest,
  GrantType,
  CodeChallengeMethod,
} from '../src/auth';
import { CacheService } from '../src/services/cache-service';
import { logger } from '../src/utils/logger';

/**
 * Example: OAuth 2.1 Authorization Code Flow with PKCE
 */
async function performAuthorizationCodeFlow() {
  console.log('=== OAuth 2.1 Authorization Code Flow with PKCE ===\n');

  // Initialize services
  const cache = new CacheService({ defaultTTL: 300 });
  const oauth = new OAuth21ComplianceManager(
    {
      trustedAuthServers: ['https://auth.akamai.com'],
      enableAntiPhishing: true,
    },
    cache,
  );

  try {
    // Step 1: Generate PKCE parameters
    console.log('1. Generating PKCE parameters...');
    const pkce = oauth.generatePKCEParameters();
    console.log('   Code Challenge Method:', pkce.codeChallengeMethod);
    console.log('   Code Challenge:', pkce.codeChallenge);
    console.log('   Code Verifier Length:', pkce.codeVerifier.length);

    // Step 2: Generate state for CSRF protection
    console.log('\n2. Generating state for CSRF protection...');
    const state = oauth.generateState();
    console.log('   State:', state);

    // Store state with session data
    await oauth.storeState(state, {
      originalUrl: 'https://example.com/callback',
      timestamp: Date.now(),
    });

    // Step 3: Build authorization URL
    console.log('\n3. Building authorization URL...');
    const authRequest: OAuth21AuthorizationRequest = {
      responseType: 'code',
      clientId: 'my-mcp-client',
      redirectUri: 'https://example.com/callback',
      scope: 'property:read property:write dns:read dns:write',
      state,
      codeChallenge: pkce.codeChallenge,
      codeChallengeMethod: pkce.codeChallengeMethod,
    };

    const authUrl = oauth.buildAuthorizationUrl(
      'https://auth.akamai.com/oauth/authorize',
      authRequest,
    );
    console.log('   Authorization URL:', authUrl);

    // Step 4: User authorizes and we receive callback
    console.log('\n4. Simulating authorization callback...');
    const authorizationCode = 'mock-authorization-code';
    const returnedState = state;

    // Validate state
    const stateData = await oauth.validateState(returnedState);
    if (!stateData) {
      throw new Error('Invalid state - possible CSRF attack');
    }
    console.log('   State validated successfully');

    // Step 5: Exchange authorization code for tokens
    console.log('\n5. Exchanging authorization code for tokens...');
    console.log('   Using code verifier:', pkce.codeVerifier);
    
    // In a real scenario, you would make an HTTP request to the token endpoint
    // For this example, we'll simulate the response
    const tokenResponse = {
      accessToken: 'mock-access-token',
      tokenType: 'Bearer' as const,
      expiresIn: 3600,
      refreshToken: 'mock-refresh-token',
      scope: 'property:read property:write dns:read dns:write',
    };

    console.log('   Access Token obtained');
    console.log('   Token Type:', tokenResponse.tokenType);
    console.log('   Expires In:', tokenResponse.expiresIn, 'seconds');
    console.log('   Scopes:', tokenResponse.scope);

  } catch (error) {
    console.error('Authorization flow failed:', error);
  }
}

/**
 * Example: Token Validation
 */
async function performTokenValidation() {
  console.log('\n=== Token Validation Example ===\n');

  // Initialize token validator
  const cache = new CacheService({ defaultTTL: 300 });
  const validator = new TokenValidator(
    {
      introspectionEndpoint: 'https://auth.akamai.com/oauth/introspect',
      jwksUri: 'https://auth.akamai.com/.well-known/jwks.json',
      clientId: 'my-mcp-client',
      clientSecret: 'my-client-secret',
      requiredClaims: ['sub', 'iss', 'exp'],
    },
    cache,
  );

  try {
    // Example 1: Validate JWT access token
    console.log('1. Validating JWT access token...');
    const jwtToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xIn0...'; // Mock JWT
    
    const jwtResult = await validator.validateAccessToken(jwtToken, ['property:read']);
    console.log('   Valid:', jwtResult.valid);
    console.log('   Active:', jwtResult.active);
    
    if (jwtResult.valid && jwtResult.claims) {
      console.log('   Subject:', jwtResult.claims.sub);
      console.log('   Issuer:', jwtResult.claims.iss);
      console.log('   Scopes:', jwtResult.claims.scope);
    }

    // Example 2: Validate opaque token via introspection
    console.log('\n2. Validating opaque token via introspection...');
    const opaqueToken = 'opaque-access-token-12345';
    
    const introspectionResult = await validator.validateAccessToken(opaqueToken);
    console.log('   Valid:', introspectionResult.valid);
    console.log('   Active:', introspectionResult.active);

    // Example 3: Check token binding
    console.log('\n3. Checking token binding...');
    const tokenWithBinding = 'token-with-cnf-claim';
    const clientCertThumbprint = 'SHA256:abcd1234...';
    
    const bindingValid = await validator.validateTokenBinding(
      tokenWithBinding,
      'x5t#S256',
      clientCertThumbprint,
    );
    console.log('   Token binding valid:', bindingValid);

  } catch (error) {
    console.error('Token validation failed:', error);
  }
}

/**
 * Example: Making authenticated MCP calls
 */
async function makeAuthenticatedMcpCall() {
  console.log('\n=== Authenticated MCP Call Example ===\n');

  const accessToken = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xIn0...';

  // Example MCP request with OAuth token
  const mcpRequest = {
    method: 'tools/call',
    params: {
      name: 'list-properties',
      arguments: {
        customer: 'production',
        contractId: 'C-123456',
      },
    },
    // Include auth header in metadata
    _meta: {
      headers: {
        'Authorization': accessToken,
        'DPoP': 'eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IlJTMjU2In0...', // DPoP proof
      },
    },
  };

  console.log('Making authenticated MCP call:');
  console.log('  Tool:', mcpRequest.params.name);
  console.log('  Authorization:', mcpRequest._meta.headers.Authorization.substring(0, 20) + '...');
  console.log('  DPoP proof included:', !!mcpRequest._meta.headers.DPoP);

  // The server will validate the token and check required scopes
  console.log('\nServer will perform:');
  console.log('  1. Token validation (JWT or introspection)');
  console.log('  2. Scope verification (property:read required)');
  console.log('  3. Token binding validation (DPoP)');
  console.log('  4. Rate limiting checks');
}

/**
 * Example: Anti-phishing checks
 */
async function demonstrateAntiPhishing() {
  console.log('\n=== Anti-Phishing Protection Example ===\n');

  const oauth = new OAuth21ComplianceManager({
    enableAntiPhishing: true,
  });

  // Test various redirect URIs
  const testCases = [
    { uri: 'https://myapp.com/callback', clientId: 'client-123' },
    { uri: 'http://192.168.1.1/callback', clientId: 'client-456' },
    { uri: 'https://myapp.tk/callback', clientId: 'client-789' },
    { uri: 'https://myаpp.com/callback', clientId: 'client-abc' }, // Cyrillic 'а'
    { uri: 'https://my--app.com/callback', clientId: 'client-def' },
  ];

  for (const testCase of testCases) {
    console.log(`Checking: ${testCase.uri}`);
    const warnings = oauth.checkPhishingIndicators(testCase.uri, testCase.clientId);
    
    if (warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      warnings.forEach(warning => console.log(`     - ${warning}`));
    } else {
      console.log('  ✓ No phishing indicators detected');
    }
    console.log();
  }
}

/**
 * Example: Server metadata validation
 */
async function validateAuthorizationServer() {
  console.log('\n=== Authorization Server Validation Example ===\n');

  const oauth = new OAuth21ComplianceManager({
    trustedAuthServers: ['https://auth.akamai.com', 'https://auth.example.com'],
  });

  const servers = [
    'https://auth.akamai.com',
    'https://untrusted.example.com',
  ];

  for (const server of servers) {
    console.log(`Validating: ${server}`);
    
    try {
      const isValid = await oauth.validateAuthorizationServer(server);
      
      if (isValid) {
        console.log('  ✓ Server is trusted and supports OAuth 2.1');
      } else {
        console.log('  ✗ Server validation failed');
      }
    } catch (error) {
      console.log('  ✗ Error:', error instanceof Error ? error.message : error);
    }
    console.log();
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('OAuth 2.1 MCP Server Examples\n');
  console.log('This demonstrates the OAuth 2.1 security features implemented in ALECS MCP Server\n');

  try {
    // Run authorization code flow example
    await performAuthorizationCodeFlow();

    // Run token validation example
    await performTokenValidation();

    // Show authenticated MCP call
    await makeAuthenticatedMcpCall();

    // Demonstrate anti-phishing
    await demonstrateAntiPhishing();

    // Validate authorization servers
    await validateAuthorizationServer();

    console.log('\n=== Configuration Example ===\n');
    console.log('To enable OAuth 2.1 in your MCP server, set these environment variables:\n');
    console.log('export OAUTH_ENABLED=true');
    console.log('export OAUTH_INTROSPECTION_ENDPOINT=https://auth.akamai.com/oauth/introspect');
    console.log('export OAUTH_JWKS_URI=https://auth.akamai.com/.well-known/jwks.json');
    console.log('export OAUTH_CLIENT_ID=your-client-id');
    console.log('export OAUTH_CLIENT_SECRET=your-client-secret');
    console.log('export OAUTH_TRUSTED_SERVERS=https://auth.akamai.com,https://auth.example.com');

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  performAuthorizationCodeFlow,
  performTokenValidation,
  makeAuthenticatedMcpCall,
  demonstrateAntiPhishing,
  validateAuthorizationServer,
};