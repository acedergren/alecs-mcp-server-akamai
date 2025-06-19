/**
 * Test OAuth Resource Server Implementation
 * Run with: npx tsx __tests__/manual/test-oauth-resource-server.ts
 */

import { OAuthResourceServer, ResourceUri } from '@/services/oauth-resource-server';
import { ResourceIndicatorValidator } from '@/utils/oauth-resource-indicators';
import {
  type OAuthResourceType,
  type OAuthAccessTokenClaims,
  type OAuthResourceAccessContext,
  OAuthResourceType as ResourceType,
  BASE_OAUTH_SCOPES,
} from '@/types/oauth';

async function testOAuthResourceServer() {
  console.log('🔐 Testing OAuth Resource Server Implementation\n');

  // Initialize Resource Server
  const resourceServer = new OAuthResourceServer({
    baseUrl: 'https://api.akamai.mcp.local',
    authServerUrl: 'https://auth.akamai.com',
    resourceIdentifier: 'akamai-mcp-api',
  });

  // Test 1: Authorization Server Discovery
  console.log('1️⃣ Testing Authorization Server Discovery');
  const authMetadata = resourceServer.getAuthorizationServerMetadata();
  console.log('Authorization Server Metadata:');
  console.log(JSON.stringify(authMetadata, null, 2));
  console.log();

  // Test 2: Resource Server Discovery
  console.log('2️⃣ Testing Resource Server Discovery');
  const resourceMetadata = resourceServer.getResourceServerMetadata();
  console.log('Resource Server Metadata:');
  console.log(JSON.stringify(resourceMetadata, null, 2));
  console.log();

  // Test 3: Resource URI Creation and Parsing
  console.log('3️⃣ Testing Resource URI Creation and Parsing');
  const propertyUri = new ResourceUri(
    ResourceType.PROPERTY,
    'acc_123456',
    'prp_789012',
    'versions/3',
  );
  console.log('Created URI:', propertyUri.toString());
  
  const parsedUri = ResourceUri.parse(propertyUri.toString());
  console.log('Parsed URI:', {
    scheme: parsedUri.scheme,
    resourceType: parsedUri.resourceType,
    accountId: parsedUri.accountId,
    resourceId: parsedUri.resourceId,
    subPath: parsedUri.subPath,
  });
  console.log();

  // Test 4: Protected Resource Registration
  console.log('4️⃣ Testing Protected Resource Registration');
  
  // Create sample property resource
  const propertyResource = resourceServer.createPropertyResource(
    {
      propertyId: 'prp_789012',
      propertyName: 'www.example.com',
      contractId: 'ctr_123',
      groupId: 'grp_456',
      productId: 'prd_Web_Accel',
      latestVersion: 3,
      productionVersion: 2,
      stagingVersion: 3,
      hostnames: ['www.example.com', 'api.example.com'],
      createdDate: '2024-01-01T00:00:00Z',
      modifiedDate: '2024-01-15T12:00:00Z',
    },
    'acc_123456',
  );
  console.log('Registered Property Resource:');
  console.log(JSON.stringify(propertyResource, null, 2));
  console.log();

  // Create sample DNS zone resource
  const dnsResource = resourceServer.createDnsZoneResource(
    {
      zone: 'example.com',
      type: 'PRIMARY',
      contractId: 'ctr_123',
      comment: 'Primary DNS zone for example.com',
      signAndServe: true,
      activationState: 'ACTIVE',
      lastModifiedDate: '2024-01-10T10:00:00Z',
      versionId: 'v123',
    },
    'acc_123456',
  );
  console.log('Registered DNS Zone Resource:');
  console.log(JSON.stringify(dnsResource, null, 2));
  console.log();

  // Test 5: Resource Indicator Validation
  console.log('5️⃣ Testing Resource Indicator Validation');
  const validator = new ResourceIndicatorValidator({
    allowedResourceTypes: Object.values(ResourceType),
    maxResourcesPerRequest: 10,
    allowWildcards: false,
  });

  const validIndicator = {
    resource: [
      'akamai://property/acc_123456/prp_789012',
      'akamai://dns_zone/acc_123456/example.com',
    ],
    resource_type: ResourceType.PROPERTY as OAuthResourceType,
    scope: 'property:read dns:read',
  };

  const validation = validator.validate(validIndicator);
  console.log('Validation Result:', {
    valid: validation.valid,
    resourceCount: validation.resources?.length,
    errors: validation.errors,
    warnings: validation.warnings,
  });
  console.log();

  // Test 6: Resource Indicator Validation
  console.log('6️⃣ Testing Resource Indicators (RFC 8707)');
  const indicatorValidation = resourceServer.validateResourceIndicators(
    {
      resource: ['akamai://property/acc_123456/prp_789012'],
      scope: 'property:read property:write',
    },
    ['property:read', 'property:write'],
  );
  console.log('Resource Indicator Validation:', indicatorValidation);
  console.log();

  // Test 7: Token Introspection
  console.log('7️⃣ Testing Token Introspection');
  const introspection = await resourceServer.introspectToken('mock-access-token');
  console.log('Token Introspection Response:');
  console.log(JSON.stringify(introspection, null, 2));
  console.log();

  // Test 8: Resource Access Authorization
  console.log('8️⃣ Testing Resource Access Authorization');
  
  const mockToken: OAuthAccessTokenClaims = {
    iss: 'https://auth.akamai.com',
    sub: 'client_123',
    aud: ['akamai-mcp-api'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    scope: 'property:read property:write dns:read',
    client_id: 'client_123',
    akamai: {
      account_id: 'acc_123456',
      contract_ids: ['ctr_123'],
      group_ids: ['grp_456'],
    },
  };

  const accessContext: OAuthResourceAccessContext = {
    token: mockToken,
    resource: propertyResource,
    operation: 'read',
    method: 'GET',
    path: '/properties/prp_789012',
  };

  const authDecision = await resourceServer.authorizeResourceAccess(accessContext);
  console.log('Authorization Decision:', {
    allowed: authDecision.allowed,
    reason: authDecision.reason,
    audit: authDecision.audit,
  });
  console.log();

  // Test 9: Insufficient Scope Authorization
  console.log('9️⃣ Testing Insufficient Scope Authorization');
  
  const limitedToken: OAuthAccessTokenClaims = {
    ...mockToken,
    scope: 'dns:read', // Missing property:read
  };

  const limitedContext: OAuthResourceAccessContext = {
    token: limitedToken,
    resource: propertyResource,
    operation: 'read',
    method: 'GET',
    path: '/properties/prp_789012',
  };

  const deniedDecision = await resourceServer.authorizeResourceAccess(limitedContext);
  console.log('Authorization Decision (Insufficient Scope):', {
    allowed: deniedDecision.allowed,
    reason: deniedDecision.reason,
    missingScopes: deniedDecision.missingScopes,
  });
  console.log();

  // Test 10: Resource Discovery
  console.log('🔟 Testing Resource Discovery');
  const discovery = resourceServer.generateResourceDiscovery();
  console.log('Resource Discovery Document:');
  console.log(JSON.stringify(discovery, null, 2));
  console.log();

  // Test 11: List Resources with Filters
  console.log('1️⃣1️⃣ Testing List Resources with Filters');
  
  // List all property resources
  const propertyResources = resourceServer.listResources({
    type: ResourceType.PROPERTY,
  });
  console.log(`Found ${propertyResources.length} property resources`);
  
  // List resources for specific owner
  const ownerResources = resourceServer.listResources({
    owner: 'acc_123456',
  });
  console.log(`Found ${ownerResources.length} resources for account acc_123456`);
  console.log();

  // Test 12: Resource-Specific Scopes
  console.log('1️⃣2️⃣ Testing Resource-Specific Scopes');
  const resourceScopes = validator.generateResourceScopes(validation.resources || []);
  console.log('Generated Resource-Specific Scopes:');
  resourceScopes.forEach(scope => console.log(`  - ${scope}`));
  console.log();

  console.log('✅ All OAuth Resource Server tests completed!');
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testOAuthResourceServer()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}