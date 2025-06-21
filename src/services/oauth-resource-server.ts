/**
 * OAuth 2.0 Resource Server Implementation
 * Implements resource protection, discovery, and validation
 */

import { createHash as _createHash } from 'crypto';

import { type Property, type DnsZone, type Certificate, type NetworkList } from '@/types/akamai';
import {
  type OAuthResourceType,
  type OAuthProtectedResource,
  type OAuthResourceUri,
  type OAuthAuthorizationServerMetadata,
  type OAuthResourceServerMetadata,
  type OAuthResourceIndicator,
  type OAuthAccessTokenClaims,
  type OAuthTokenIntrospectionResponse,
  type OAuthResourceAccessContext,
  type OAuthAuthorizationDecision,
  type OAuthOperation,
  OAuthResourceType as ResourceType,
  RESOURCE_SCOPE_TEMPLATES,
  BASE_OAUTH_SCOPES,
  OAUTH_WELL_KNOWN_URIS as _OAUTH_WELL_KNOWN_URIS,
} from '@/types/oauth';

/**
 * OAuth Resource URI implementation
 */
export class ResourceUri implements OAuthResourceUri {
  scheme: 'akamai' = 'akamai' as const;
  resourceType: OAuthResourceType;
  accountId: string;
  resourceId: string;
  subPath?: string;

  constructor(
    resourceType: OAuthResourceType,
    accountId: string,
    resourceId: string,
    subPath?: string,
  ) {
    this.resourceType = resourceType;
    this.accountId = accountId;
    this.resourceId = resourceId;
    this.subPath = subPath;
  }

  toString(): string {
    let uri = `${this.scheme}://${this.resourceType}/${this.accountId}/${this.resourceId}`;
    if (this.subPath) {
      uri += `/${this.subPath}`;
    }
    return uri;
  }

  static parse(uri: string): ResourceUri {
    const pattern = /^akamai:\/\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.+))?$/;
    const match = uri.match(pattern);

    if (!match) {
      throw new Error(`Invalid resource URI format: ${uri}`);
    }

    const [, resourceType, accountId, resourceId, subPath] = match;

    if (!Object.values(ResourceType).includes(resourceType as OAuthResourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    return new ResourceUri(resourceType as OAuthResourceType, accountId, resourceId, subPath);
  }
}

/**
 * OAuth Resource Server Service
 */
export class OAuthResourceServer {
  private readonly serverMetadata: OAuthResourceServerMetadata;
  private readonly authServerMetadata: OAuthAuthorizationServerMetadata;
  private readonly resourceRegistry: Map<string, OAuthProtectedResource>;

  constructor(
    private readonly config: {
      /** Resource server base URL */
      baseUrl: string;
      /** Authorization server URL */
      authServerUrl: string;
      /** Resource server identifier */
      resourceIdentifier: string;
      /** Token introspection endpoint */
      introspectionEndpoint?: string;
      /** JWKS endpoint */
      jwksEndpoint?: string;
    },
  ) {
    this.resourceRegistry = new Map();

    // Initialize resource server metadata
    this.serverMetadata = this.initializeServerMetadata();

    // Initialize auth server metadata (would be fetched in production)
    this.authServerMetadata = this.initializeAuthServerMetadata();
  }

  /**
   * Initialize resource server metadata
   */
  private initializeServerMetadata(): OAuthResourceServerMetadata {
    return {
      resource: this.config.resourceIdentifier,
      name: 'Akamai MCP Resource Server',
      description: 'OAuth 2.0 protected resources for Akamai API operations',
      resource_base_uri: this.config.baseUrl,
      resource_types_supported: Object.values(ResourceType),
      resource_scopes: RESOURCE_SCOPE_TEMPLATES,
      base_scopes_required: ['akamai:read'],
      resource_documentation: `${this.config.baseUrl}/docs`,
      resource_policy_uri: `${this.config.baseUrl}/policy`,
      resource_tos_uri: `${this.config.baseUrl}/tos`,
      features_supported: [
        'resource_indicators',
        'token_introspection',
        'resource_metadata',
        'fine_grained_scopes',
        'bearer-token',
        'resource-indicators',
      ],
      authorization_servers: [this.config.authServerUrl],
      bearer_methods_supported: ['header'],
      mcp_version: '2025-06-18',
      mcp_featu_res: ['tools', 'resources'],
    };
  }

  /**
   * Initialize authorization server metadata
   */
  private initializeAuthServerMetadata(): OAuthAuthorizationServerMetadata {
    return {
      issuer: this.config.authServerUrl,
      authorization_endpoint: `${this.config.authServerUrl}/oauth/authorize`,
      token_endpoint: `${this.config.authServerUrl}/oauth/token`,
      introspection_endpoint:
        this.config.introspectionEndpoint || `${this.config.authServerUrl}/oauth/introspect`,
      jwks_uri: this.config.jwksEndpoint || `${this.config.authServerUrl}/.well-known/jwks.json`,
      scopes_supported: [...Object.values(BASE_OAUTH_SCOPES), 'openid', 'profile', 'email'],
      response_types_supported: ['code', 'token', 'code token'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'private_key_jwt',
      ],
      code_challenge_methods_supported: ['S256', 'plain'],
      resource_indicators_supported: true,
      authorization_response_iss_parameter_supported: true,
    };
  }

  /**
   * Get well-known authorization server metadata
   */
  getAuthorizationServerMetadata(): OAuthAuthorizationServerMetadata {
    return this.authServerMetadata;
  }

  /**
   * Get well-known resource server metadata
   */
  getResourceServerMetadata(): OAuthResourceServerMetadata {
    return this.serverMetadata;
  }

  /**
   * Register a protected resource
   */
  registerProtectedResource(resource: OAuthProtectedResource): void {
    this.resourceRegistry.set(resource.uri, resource);
  }

  /**
   * Create protected resource metadata for a Property
   */
  createPropertyResource(property: Property, accountId: string): OAuthProtectedResource {
    const uri = new ResourceUri(ResourceType.PROPERTY, accountId, property.propertyId);

    const resource: OAuthProtectedResource = {
      uri: uri.toString(),
      type: ResourceType.PROPERTY,
      name: property.propertyName,
      description: `Property ${property.propertyName} (${property.propertyId})`,
      requiredScopes: [BASE_OAUTH_SCOPES.PROPERTY_READ],
      resourceScopes: this.generateResourceScopes(ResourceType.PROPERTY, property.propertyId),
      owner: {
        accountId,
        contractId: property.contractId,
        groupId: property.groupId,
      },
      metadata: {
        created: property.createdDate || new Date().toISOString(),
        modified: property.modifiedDate || new Date().toISOString(),
        version: property.latestVersion?.toString(),
        status: 'active',
        productId: property.productId,
      },
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
      attributes: {
        hostnames: property.hostnames,
        productionVersion: property.productionVersion,
        stagingVersion: property.stagingVersion,
      },
    };

    this.registerProtectedResource(resource);
    return resource;
  }

  /**
   * Create protected resource metadata for a DNS Zone
   */
  createDnsZoneResource(zone: DnsZone, accountId: string): OAuthProtectedResource {
    const uri = new ResourceUri(ResourceType.DNS_ZONE, accountId, zone.zone);

    const resource: OAuthProtectedResource = {
      uri: uri.toString(),
      type: ResourceType.DNS_ZONE,
      name: zone.zone,
      description: `DNS Zone ${zone.zone} (${zone.type})`,
      requiredScopes: [BASE_OAUTH_SCOPES.DNS_READ],
      resourceScopes: this.generateResourceScopes(ResourceType.DNS_ZONE, zone.zone),
      owner: {
        accountId,
        contractId: zone.contractId,
      },
      metadata: {
        created: zone.lastModifiedDate || new Date().toISOString(),
        modified: zone.lastModifiedDate || new Date().toISOString(),
        status: zone.activationState.toLowerCase(),
        versionId: zone.versionId,
      },
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
      attributes: {
        type: zone.type,
        signAndServe: zone.signAndServe,
        comment: zone.comment,
      },
    };

    this.registerProtectedResource(resource);
    return resource;
  }

  /**
   * Create protected resource metadata for a Certificate
   */
  createCertificateResource(certificate: Certificate, accountId: string): OAuthProtectedResource {
    const uri = new ResourceUri(
      ResourceType.CERTIFICATE,
      accountId,
      certificate.enrollmentId.toString(),
    );

    const resource: OAuthProtectedResource = {
      uri: uri.toString(),
      type: ResourceType.CERTIFICATE,
      name: certificate.cn,
      description: `Certificate for ${certificate.cn}`,
      requiredScopes: [BASE_OAUTH_SCOPES.CERTIFICATE_READ],
      resourceScopes: this.generateResourceScopes(
        ResourceType.CERTIFICATE,
        certificate.enrollmentId.toString(),
      ),
      owner: {
        accountId,
      },
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        status: certificate.status.toLowerCase(),
      },
      allowedMethods: ['GET', 'POST'],
      attributes: {
        sans: certificate.sans,
        certificateType: certificate.certificateType,
        validationType: certificate.validationType,
        networkConfiguration: certificate.networkConfiguration,
      },
    };

    this.registerProtectedResource(resource);
    return resource;
  }

  /**
   * Create protected resource metadata for a Network List
   */
  createNetworkListResource(networkList: NetworkList, accountId: string): OAuthProtectedResource {
    const uri = new ResourceUri(ResourceType.NETWORK_LIST, accountId, networkList.listId);

    const resource: OAuthProtectedResource = {
      uri: uri.toString(),
      type: ResourceType.NETWORK_LIST,
      name: networkList.name,
      description: networkList.description || `Network List ${networkList.name}`,
      requiredScopes: [BASE_OAUTH_SCOPES.NETWORK_LIST_READ],
      resourceScopes: this.generateResourceScopes(ResourceType.NETWORK_LIST, networkList.listId),
      owner: {
        accountId,
      },
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: networkList.syncPoint?.toString(),
        status: 'active',
      },
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
      attributes: {
        type: networkList.type,
        elementCount: networkList.elementCount,
        accessControlGroup: networkList.accessControlGroup,
      },
    };

    this.registerProtectedResource(resource);
    return resource;
  }

  /**
   * Generate resource-specific scopes
   */
  private generateResourceScopes(resourceType: OAuthResourceType, resourceId: string): string[] {
    const templates = RESOURCE_SCOPE_TEMPLATES[resourceType];
    return templates.map((template) =>
      template.replace('{id}', resourceId).replace('{zone}', resourceId),
    );
  }

  /**
   * Validate resource indicators (RFC 8707)
   */
  validateResourceIndicators(
    indicators: OAuthResourceIndicator,
    requestedScopes: string[],
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const resources = Array.isArray(indicators.resource)
      ? indicators.resource
      : [indicators.resource];

    for (const resourceUri of resources) {
      try {
        const uri = ResourceUri.parse(resourceUri);
        const resource = this.resourceRegistry.get(resourceUri);

        if (!resource) {
          errors.push(`Unknown resource: ${resourceUri}`);
          continue;
        }

        // Validate resource type if provided
        if (indicators.resource_type && indicators.resource_type !== uri.resourceType) {
          errors.push(`Resource type mismatch for ${resourceUri}`);
        }

        // Validate requested scopes against resource
        const invalidScopes = requestedScopes.filter((scope) => {
          const isBaseScope = Object.values(BASE_OAUTH_SCOPES).includes(scope as any);
          const isResourceScope = resource.resourceScopes?.includes(scope);
          const isRequiredScope = resource.requiredScopes.includes(scope);

          return !isBaseScope && !isResourceScope && !isRequiredScope;
        });

        if (invalidScopes.length > 0) {
          errors.push(`Invalid scopes for resource ${resourceUri}: ${invalidScopes.join(', ')}`);
        }
      } catch (_error) {
        errors.push(`Invalid resource URI: ${resourceUri}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Introspect access token
   */
  async introspectToken(
    _token: string,
    _tokenType: 'access_token' | 'refresh_token' = 'access_token',
  ): Promise<OAuthTokenIntrospectionResponse> {
    // In production, this would call the introspection endpoint
    // For now, we'll simulate token introspection
    const mockClaims: OAuthAccessTokenClaims = {
      iss: this.config.authServerUrl,
      sub: 'client_123',
      aud: [this.config.resourceIdentifier],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      scope: 'property:read property:write dns:read',
      client_id: 'client_123',
      akamai: {
        account_id: 'acc_123456',
        contract_ids: ['ctr_123', 'ctr_456'],
        group_ids: ['grp_789'],
      },
    };

    return {
      active: true,
      scope: mockClaims.scope,
      client_id: mockClaims.client_id,
      token_type: 'Bearer',
      exp: mockClaims.exp,
      iat: mockClaims.iat,
      sub: mockClaims.sub,
      aud: mockClaims.aud,
      iss: mockClaims.iss,
      ...mockClaims.akamai,
    };
  }

  /**
   * Authorize resource access
   */
  async authorizeResourceAccess(
    _context: OAuthResourceAccessContext,
  ): Promise<OAuthAuthorizationDecision> {
    const { token, resource, operation, method } = context;

    // Check if token is valid for this resource server
    if (!this.isValidAudience(token.aud)) {
      return {
        allowed: false,
        reason: 'Invalid token audience',
        audit: this.createAuditEntry('DENY', context, 'Invalid audience'),
      };
    }

    // Check token expiration
    if (this.isTokenExpired(token)) {
      return {
        allowed: false,
        reason: 'Token expired',
        audit: this.createAuditEntry('DENY', context, 'Token expired'),
      };
    }

    // Check HTTP method is allowed
    if (!resource.allowedMethods.includes(method)) {
      return {
        allowed: false,
        reason: `Method ${method} not allowed for resource`,
        audit: this.createAuditEntry('DENY', context, 'Method not allowed'),
      };
    }

    // Check scopes
    const tokenScopes = token.scope.split(' ');
    const requiredScopes = this.getRequiredScopes(resource, operation);
    const hasRequiredScopes = this.checkScopes(tokenScopes, requiredScopes);

    if (!hasRequiredScopes.allowed) {
      return {
        allowed: false,
        reason: 'Insufficient scopes',
        missingScopes: hasRequiredScopes.missing,
        audit: this.createAuditEntry('DENY', context, 'Insufficient scopes'),
      };
    }

    // Check resource ownership
    if (!this.checkResourceOwnership(token, resource)) {
      return {
        allowed: false,
        reason: 'Access denied to resource',
        audit: this.createAuditEntry('DENY', context, 'Ownership check failed'),
      };
    }

    // Authorization successful
    return {
      allowed: true,
      audit: this.createAuditEntry('ALLOW', context),
    };
  }

  /**
   * Check if token audience is valid
   */
  private isValidAudience(audience: string | string[]): boolean {
    const audiences = Array.isArray(audience) ? audience : [audience];
    return audiences.includes(this.config.resourceIdentifier);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: OAuthAccessTokenClaims): boolean {
    return token.exp < Math.floor(Date.now() / 1000);
  }

  /**
   * Get required scopes for operation
   */
  private getRequiredScopes(resource: OAuthProtectedResource, operation: OAuthOperation): string[] {
    const scopes: string[] = [];

    // Add base required scopes
    scopes.push(...resource.requiredScopes);

    // Add operation-specific scopes
    switch (operation) {
      case 'read':
        scopes.push(`${resource.type}:read`);
        break;
      case 'write':
        scopes.push(`${resource.type}:write`);
        break;
      case 'delete':
        scopes.push(`${resource.type}:delete`);
        break;
      case 'activate':
        scopes.push(`${resource.type}:activate`);
        break;
      default:
        scopes.push(`${resource.type}:${operation}`);
    }

    // Add resource-specific scopes
    if (resource.resourceScopes) {
      const resourceOpScope = resource.resourceScopes.find((s) => s.includes(`:${operation}`));
      if (resourceOpScope) {
        scopes.push(resourceOpScope);
      }
    }

    return [...new Set(scopes)];
  }

  /**
   * Check if token has required scopes
   */
  private checkScopes(
    tokenScopes: string[],
    requiredScopes: string[],
  ): { allowed: boolean; missing?: string[] } {
    const missing = requiredScopes.filter((scope) => {
      // Check exact match
      if (tokenScopes.includes(scope)) {
        return false;
      }

      // Check wildcard scopes (e.g., property:* matches property:read)
      const scopeParts = scope.split(':');
      if (scopeParts.length >= 2) {
        const wildcardScope = `${scopeParts[0]}:*`;
        if (tokenScopes.includes(wildcardScope)) {
          return false;
        }
      }

      // Check parent scopes (e.g., akamai:write includes property:write)
      if (tokenScopes.includes('akamai:write') && scope.endsWith(':write')) {
        return false;
      }
      if (tokenScopes.includes('akamai:read') && scope.endsWith(':read')) {
        return false;
      }

      return true;
    });

    return {
      allowed: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined,
    };
  }

  /**
   * Check resource ownership
   */
  private checkResourceOwnership(
    token: OAuthAccessTokenClaims,
    resource: OAuthProtectedResource,
  ): boolean {
    if (!token.akamai) {
      return false;
    }

    // Check account match
    if (token.akamai.account_id !== resource.owner.accountId) {
      return false;
    }

    // Check contract match if specified
    if (resource.owner.contractId && token.akamai.contract_ids) {
      if (!token.akamai.contract_ids.includes(resource.owner.contractId)) {
        return false;
      }
    }

    // Check group match if specified
    if (resource.owner.groupId && token.akamai.group_ids) {
      if (!token.akamai.group_ids.includes(resource.owner.groupId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create audit entry
   */
  private createAuditEntry(
    decision: 'ALLOW' | 'DENY',
    _context: OAuthResourceAccessContext,
    reason?: string,
  ): OAuthAuthorizationDecision['audit'] {
    return {
      timestamp: new Date().toISOString(),
      decision,
      resource: context.resource.uri,
      operation: context.operation,
      client: context.token.client_id,
      reason,
    };
  }

  /**
   * Get resource by URI
   */
  getResource(uri: string): OAuthProtectedResource | undefined {
    return this.resourceRegistry.get(uri);
  }

  /**
   * List all protected resources
   */
  listResources(filter?: { type?: OAuthResourceType; owner?: string }): OAuthProtectedResource[] {
    let resources = Array.from(this.resourceRegistry.values());

    if (filter?.type) {
      resources = resources.filter((r) => r.type === filter.type);
    }

    if (filter?.owner) {
      resources = resources.filter((r) => r.owner.accountId === filter.owner);
    }

    return resources;
  }

  /**
   * Generate resource discovery document
   */
  generateResourceDiscovery(): {
    resources: Array<{
      uri: string;
      type: string;
      name: string;
      scopes: string[];
    }>;
    _links: {
      self: string;
      authorization_server: string;
      token_endpoint: string;
    };
  } {
    const resources = Array.from(this.resourceRegistry.values()).map((resource) => ({
      uri: resource.uri,
      type: resource.type,
      name: resource.name,
      description: resource.description,
      scopes: [...resource.requiredScopes, ...(resource.resourceScopes || [])],
    }));

    return {
      resources,
      _links: {
        self: `${this.config.baseUrl}/resources`,
        authorization_server: this.authServerMetadata.issuer,
        token_endpoint: this.authServerMetadata.token_endpoint,
      },
    };
  }
}
