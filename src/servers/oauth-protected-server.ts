/**
 * OAuth-Protected MCP Server Example
 * Demonstrates integration of OAuth 2.0 Resource Server with MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express, { type Express } from 'express';

import { AkamaiClient } from '@/akamai-client';
import {
  OAuthMiddlewareFactory,
  type OAuthRequest,
} from '@/middleware/oauth-authorization';
import { CustomerConfigManager } from '@/services/customer-config-manager';
import { OAuthResourceServer } from '@/services/oauth-resource-server';
import {
  // type OAuthResourceType,
  OAuthResourceType as ResourceType,
  OAuthOperation,
  BASE_OAUTH_SCOPES,
  OAUTH_WELL_KNOWN_URIS,
} from '@/types/oauth';
// import { createPropertyServer } from '@/servers/property-server';
import { ResourceIndicatorValidator } from '@/utils/oauth-resource-indicators';

/**
 * OAuth-Protected MCP Server Configuration
 */
export interface OAuthProtectedServerConfig {
  /** Base URL for the server */
  baseUrl: string;
  /** Authorization server URL */
  authServerUrl: string;
  /** Resource server identifier */
  resourceIdentifier: string;
  /** Port for HTTP server */
  httpPort?: number;
  /** Enable introspection caching */
  enableCaching?: boolean;
}

/**
 * Create OAuth-protected MCP server
 */
export async function createOAuthProtectedMcpServer(
  config: OAuthProtectedServerConfig,
): Promise<{ mcpServer: Server; httpServer: Express }> {
  // Initialize services
  const configManager = new CustomerConfigManager();
  const apiClient = new AkamaiClient();

  // Create OAuth Resource Server
  const resourceServer = new OAuthResourceServer({
    baseUrl: config.baseUrl,
    authServerUrl: config.authServerUrl,
    resourceIdentifier: config.resourceIdentifier,
    introspectionEndpoint: `${config.authServerUrl}/oauth/introspect`,
    jwksEndpoint: `${config.authServerUrl}/.well-known/jwks.json`,
  });

  // Create OAuth middleware factory
  const oauthMiddleware = new OAuthMiddlewareFactory(resourceServer);

  // Create Resource Indicator Validator
  const resourceValidator = new ResourceIndicatorValidator({
    allowedResourceTypes: Object.values(ResourceType),
    maxResourcesPerRequest: 10,
    allowWildcards: false,
  });

  // Create MCP server with OAuth-aware tools
  // TODO: Replace with actual property server creation
  const mcpServer = new Server({
    name: 'oauth-protected-property-server',
    version: '1.0.0',
  });

  // Enhance MCP server with OAuth resource registration
  enhanceMcpServerWithOAuth(mcpServer, resourceServer, apiClient);

  // Create HTTP server for OAuth endpoints
  const httpServer = createOAuthHttpServer(
    resourceServer,
    oauthMiddleware,
    config.httpPort || 3000,
  );

  return { mcpServer, httpServer };
}

/**
 * Enhance MCP server with OAuth resource registration
 */
function enhanceMcpServerWithOAuth(
  mcpServer: Server,
  resourceServer: OAuthResourceServer,
  apiClient: AkamaiClient,
): void {
  // Note: MCP SDK doesn't expose a direct callTool method
  // Resource registration should be integrated within individual tool handlers
  // This is a placeholder for future implementation
}

/**
 * Register resources from tool results
 */
async function registerResourcesFromToolResult(
  toolName: string,
  args: any,
  result: any,
  resourceServer: OAuthResourceServer,
  apiClient: AkamaiClient,
): Promise<void> {
  // TODO: Get account ID from appropriate source
  const accountId = 'default-account';

  switch (toolName) {
    case 'list_properties':
      if (result.success && result.data?.properties) {
        for (const property of result.data.properties) {
          resourceServer.createPropertyResource(property, accountId);
        }
      }
      break;

    case 'get_property':
      if (result.success && result.data) {
        resourceServer.createPropertyResource(result.data, accountId);
      }
      break;

    case 'list_zones':
      if (result.success && result.data?.zones) {
        for (const zone of result.data.zones) {
          resourceServer.createDnsZoneResource(zone, accountId);
        }
      }
      break;

    case 'list_network_lists':
      if (result.success && result.data?.networkLists) {
        for (const list of result.data.networkLists) {
          resourceServer.createNetworkListResource(list, accountId);
        }
      }
      break;
  }
}

/**
 * Create HTTP server for OAuth endpoints
 */
function createOAuthHttpServer(
  resourceServer: OAuthResourceServer,
  oauthMiddleware: OAuthMiddlewareFactory,
  port: number,
): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use((req, res, next) => {
    // Attach resource server to request context
    (req as any).resourceServer = resourceServer;
    next();
  });

  // Discovery endpoints
  const discovery = oauthMiddleware.createDiscoveryEndpoints();

  app.get(OAUTH_WELL_KNOWN_URIS.AUTHORIZATION_SERVER, discovery.authServer);
  app.get(OAUTH_WELL_KNOWN_URIS.RESOURCE_SERVER, discovery.resourceServer);
  app.get('/resources', discovery.resources);

  // Protected API endpoints
  const apiRouter = express.Router();

  // Apply OAuth authentication to all API routes
  apiRouter.use(oauthMiddleware.authenticate());

  // Property endpoints
  apiRouter.get(
    '/properties',
    oauthMiddleware.requireScopes(BASE_OAUTH_SCOPES.PROPERTY_READ),
    async (_req: OAuthRequest, res) => {
      const resources = resourceServer.listResources({
        type: ResourceType.PROPERTY,
        owner: req.oauth?.token.akamai?.account_id,
      });
      res.json({ resources });
    },
  );

  apiRouter.get(
    '/properties/:propertyId',
    oauthMiddleware.authorizeResource(
      ResourceType.PROPERTY,
      OAuthOperation.READ,
      req => req.params.propertyId,
    ),
    async (_req: OAuthRequest, res) => {
      const resource = req.oauth?.resource;
      res.json({ resource });
    },
  );

  apiRouter.put(
    '/properties/:propertyId',
    oauthMiddleware.authorizeResource(
      ResourceType.PROPERTY,
      OAuthOperation.WRITE,
      req => req.params.propertyId,
    ),
    async (_req: OAuthRequest, res) => {
      // Update property logic here
      res.json({ success: true });
    },
  );

  apiRouter.post(
    '/properties/:propertyId/activate',
    oauthMiddleware.authorizeResource(
      ResourceType.PROPERTY,
      OAuthOperation.ACTIVATE,
      req => req.params.propertyId,
    ),
    async (_req: OAuthRequest, res) => {
      // Activation logic here
      res.json({ success: true });
    },
  );

  // DNS endpoints
  apiRouter.get(
    '/dns/zones',
    oauthMiddleware.requireScopes(BASE_OAUTH_SCOPES.DNS_READ),
    async (_req: OAuthRequest, res) => {
      const resources = resourceServer.listResources({
        type: ResourceType.DNS_ZONE,
        owner: req.oauth?.token.akamai?.account_id,
      });
      res.json({ resources });
    },
  );

  apiRouter.get(
    '/dns/zones/:zoneId',
    oauthMiddleware.authorizeResource(
      ResourceType.DNS_ZONE,
      OAuthOperation.READ,
      req => req.params.zoneId,
    ),
    async (_req: OAuthRequest, res) => {
      const resource = req.oauth?.resource;
      res.json({ resource });
    },
  );

  // Network List endpoints
  apiRouter.get(
    '/network-lists',
    oauthMiddleware.requireScopes(BASE_OAUTH_SCOPES.NETWORK_LIST_READ),
    async (_req: OAuthRequest, res) => {
      const resources = resourceServer.listResources({
        type: ResourceType.NETWORK_LIST,
        owner: req.oauth?.token.akamai?.account_id,
      });
      res.json({ resources });
    },
  );

  // Certificate endpoints
  apiRouter.get(
    '/certificates',
    oauthMiddleware.requireScopes(BASE_OAUTH_SCOPES.CERTIFICATE_READ),
    async (_req: OAuthRequest, res) => {
      const resources = resourceServer.listResources({
        type: ResourceType.CERTIFICATE,
        owner: req.oauth?.token.akamai?.account_id,
      });
      res.json({ resources });
    },
  );

  // Purge endpoints
  apiRouter.post(
    '/purge/url',
    oauthMiddleware.requireScopes(BASE_OAUTH_SCOPES.PURGE_EXECUTE),
    async (_req: OAuthRequest, res) => {
      // Purge logic here
      res.json({ success: true });
    },
  );

  // Mount API router
  app.use('/api/v1', apiRouter);

  // Error handling
  app.use((_err: any, _req: express.Request, _res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
      error: err.error || 'server_error',
      error_description: err.message || 'Internal server error',
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`OAuth Resource Server listening on port ${port}`);
    console.log('Discovery endpoints:');
    console.log(`  - ${OAUTH_WELL_KNOWN_URIS.AUTHORIZATION_SERVER}`);
    console.log(`  - ${OAUTH_WELL_KNOWN_URIS.RESOURCE_SERVER}`);
    console.log('  - /resources');
  });

  return app;
}

/**
 * Main entry point for OAuth-protected MCP server
 */
export async function main() {
  const config: OAuthProtectedServerConfig = {
    baseUrl: process.env.RESOURCE_SERVER_URL || 'https://api.akamai.mcp.local',
    authServerUrl: process.env.AUTH_SERVER_URL || 'https://auth.akamai.com',
    resourceIdentifier: process.env.RESOURCE_ID || 'akamai-mcp-api',
    httpPort: parseInt(process.env.HTTP_PORT || '3000', 10),
  };

  const { mcpServer, httpServer } = await createOAuthProtectedMcpServer(config);

  // Start MCP server on stdio transport
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  console.log('OAuth-protected MCP server started');
  console.log('MCP server running on stdio');
  console.log(`HTTP server running on port ${config.httpPort}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
