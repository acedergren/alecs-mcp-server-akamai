#!/usr/bin/env node

/**
 * ALECS - A Launchgrid for Edge & Cloud Services (Main Server)
 * 
 * Version 2.0 - Consolidated Tools Architecture
 * 
 * Features:
 * - 25 focused, business-oriented tools (down from 180+)
 * - Enhanced tool discovery with categories and metadata
 * - Pagination support for better performance
 * - User-friendly elicitation workflows
 * - Business-context driven interactions
 * - Local/Remote transport modes
 * 
 * Usage:
 * - Local Mode (STDIO): node dist/index.js
 * - Remote Mode (WebSocket + SSE): node dist/index.js --remote
 * - Environment: ALECS_MODE=remote node dist/index.js
 * 
 * Remote mode starts both WebSocket (port 8082) and SSE (port 8083) transports
 * MCP 2025 compliant with enhanced UX patterns
 */

// Register module aliases before any other imports
import 'module-alias/register';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  type ListToolsRequest,
  ListToolsRequestSchema,
  McpError,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z, type ZodSchema } from 'zod';

import { ConfigurationError, ConfigErrorType } from './types/config';
import { type BaseMcpParams, type McpToolResponse } from './types/mcp';
import { CustomerConfigManager } from './utils/customer-config';
import { logger } from './utils/logger';
import { generateAndDisplayToken, type ApiToken } from './utils/token-generator';
import { serverConfig } from './utils/server-config';

// Import Workflow Assistants (keep these - they're already well-designed)
import {
  getWorkflowAssistantTools,
  handleWorkflowAssistantRequest,
} from './tools/workflows';

// Import elicitation tools (keep these - they're user-friendly)
import {
  dnsElicitationTool,
  handleDNSElicitationTool,
  secureHostnameOnboardingTool,
  handleSecureHostnameOnboardingTool,
} from './tools/elicitation';

// Import existing consolidated tools
import {
  getConsolidatedTools,
  handleConsolidatedToolRequest,
} from './tools/consolidated';

// Tool categories for enhanced discovery
export enum ToolCategory {
  GETTING_STARTED = 'getting-started',
  PROPERTY_MANAGEMENT = 'property-management',
  DNS_MANAGEMENT = 'dns-management',
  CERTIFICATE_MANAGEMENT = 'certificate-management',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  COST_MANAGEMENT = 'cost-management',
  ANALYTICS = 'analytics',
  TROUBLESHOOTING = 'troubleshooting',
  WORKFLOWS = 'workflows',
}

// Complexity levels
export enum ToolComplexity {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// Utility to convert Zod schema to JSON Schema
function zodToJsonSchema(schema: ZodSchema): any {
  // Simplified conversion - in production, use @anatine/zod-openapi or similar
  return {
    type: 'object',
    properties: {},
    additionalProperties: true,
  };
}

/**
 * Enhanced Tool metadata with categories and business context
 */
interface ConsolidatedToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  complexity: ToolComplexity;
  estimatedTime: string;
  businessFocus: string;
  inputSchema: ZodSchema;
  handler: (params: unknown) => Promise<McpToolResponse>;
}

/**
 * Tool registry entry
 */
interface ToolRegistryEntry {
  metadata: ConsolidatedToolMetadata;
  handler: (params: unknown) => Promise<McpToolResponse>;
}

/**
 * Request context for logging and tracking
 */
interface RequestContext {
  requestId: string;
  toolName: string;
  category?: string;
  customer?: string;
  startTime: number;
}

/**
 * Consolidated tools registry - the new streamlined toolset
 */
const consolidatedToolsRegistry: ConsolidatedToolMetadata[] = [
  // === GETTING STARTED ===
  {
    name: 'website-onboarding',
    description: 'Complete guided setup for new websites with security best practices',
    category: ToolCategory.GETTING_STARTED,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '15-30 minutes',
    businessFocus: 'Launch new website with optimal performance and security',
    inputSchema: secureHostnameOnboardingTool.inputSchema as ZodSchema,
    handler: async (params) => handleSecureHostnameOnboardingTool(params),
  },

  {
    name: 'dns-management',
    description: 'User-friendly DNS record management with guided workflows',
    category: ToolCategory.DNS_MANAGEMENT,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '5-15 minutes',
    businessFocus: 'Manage DNS records safely and efficiently',
    inputSchema: dnsElicitationTool.inputSchema as ZodSchema,
    handler: async (params) => handleDNSElicitationTool(params),
  },

  // === WORKFLOW ASSISTANTS ===
  {
    name: 'infrastructure-assistant',
    description: 'AI assistant for property and infrastructure management decisions',
    category: ToolCategory.WORKFLOWS,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '10-30 minutes',
    businessFocus: 'Making infrastructure decisions based on business needs',
    inputSchema: z.object({
      intent: z.string().describe('What you want to accomplish'),
      context: z.any().optional().describe('Additional context or constraints'),
    }),
    handler: async (params) => handleWorkflowAssistantRequest('infrastructure', params),
  },

  {
    name: 'dns-assistant',
    description: 'AI assistant for DNS configuration and domain management',
    category: ToolCategory.WORKFLOWS,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '10-20 minutes',
    businessFocus: 'Making DNS changes safe and simple',
    inputSchema: z.object({
      intent: z.string().describe('DNS task you need help with'),
      domain: z.string().optional().describe('Domain name'),
      context: z.any().optional().describe('Additional context'),
    }),
    handler: async (params) => handleWorkflowAssistantRequest('dns', params),
  },

  {
    name: 'security-assistant',
    description: 'AI assistant for security and compliance management',
    category: ToolCategory.WORKFLOWS,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '15-45 minutes',
    businessFocus: 'Security that enables business, not blocks it',
    inputSchema: z.object({
      intent: z.string().describe('Security goal or concern'),
      scope: z.string().optional().describe('Applications or domains to protect'),
      context: z.any().optional().describe('Compliance requirements or constraints'),
    }),
    handler: async (params) => handleWorkflowAssistantRequest('security', params),
  },

  {
    name: 'performance-assistant',
    description: 'AI assistant for performance optimization and analytics',
    category: ToolCategory.WORKFLOWS,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '10-30 minutes',
    businessFocus: 'Turning metrics into business outcomes',
    inputSchema: z.object({
      intent: z.string().describe('Performance goal or issue'),
      properties: z.array(z.string()).optional().describe('Properties to analyze'),
      context: z.any().optional().describe('Business context or constraints'),
    }),
    handler: async (params) => handleWorkflowAssistantRequest('performance', params),
  },
];

// Add consolidated tools from existing implementation
const existingConsolidatedTools = getConsolidatedTools();
for (const tool of existingConsolidatedTools) {
  let category = ToolCategory.PROPERTY_MANAGEMENT;
  let complexity = ToolComplexity.INTERMEDIATE;
  
  // Categorize based on tool name
  if (tool.name.includes('dns')) category = ToolCategory.DNS_MANAGEMENT;
  if (tool.name.includes('certificate') || tool.name.includes('cert')) category = ToolCategory.CERTIFICATE_MANAGEMENT;
  if (tool.name.includes('security') || tool.name.includes('network-list')) category = ToolCategory.SECURITY;
  if (tool.name.includes('performance') || tool.name.includes('analytics')) category = ToolCategory.PERFORMANCE;
  if (tool.name.includes('search')) complexity = ToolComplexity.BEGINNER;
  if (tool.name.includes('advanced') || tool.name.includes('bulk')) complexity = ToolComplexity.ADVANCED;

  consolidatedToolsRegistry.push({
    name: tool.name,
    description: tool.description,
    category,
    complexity,
    estimatedTime: '5-15 minutes',
    businessFocus: 'Streamlined operations with consolidated interface',
    inputSchema: tool.inputSchema as ZodSchema,
    handler: async (params) => {
      const result = await handleConsolidatedToolRequest(tool.name, params);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  });
}

/**
 * ALECS Main Server - Consolidated Tools Architecture
 */
class ALECSServer {
  private server: Server;
  private toolRegistry = new Map<string, ToolRegistryEntry>();
  private configManager: CustomerConfigManager;

  constructor() {
    this.server = new Server(
      {
        name: 'alecs',
        version: '2.0.0',
        description: 'ALECS - A Launchgrid for Edge & Cloud Services (Consolidated)',
      },
      {
        capabilities: {
          tools: {
            listChanged: true, // Support dynamic tool updates
          },
        },
      },
    );

    this.configManager = new CustomerConfigManager();
    this.registerAllTools();
    this.setupHandlers();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create request context for logging
   */
  private createRequestContext(toolName: string, params: unknown): RequestContext {
    const customer = this.extractCustomer(params);
    const tool = this.toolRegistry.get(toolName);
    
    return {
      requestId: this.generateRequestId(),
      toolName,
      category: tool?.metadata.category,
      customer,
      startTime: Date.now(),
    };
  }

  /**
   * Extract customer from parameters
   */
  private extractCustomer(params: unknown): string | undefined {
    if (params && typeof params === 'object' && 'customer' in params) {
      return (params as BaseMcpParams).customer;
    }
    return undefined;
  }

  /**
   * Validate customer context
   */
  private validateCustomerContext(customer?: string): void {
    const customerName = customer || 'default';

    if (!this.configManager.hasSection(customerName)) {
      throw new ConfigurationError(
        ConfigErrorType.SECTION_NOT_FOUND,
        `Customer section '${customerName}' not found in configuration`,
        customerName,
      );
    }
  }

  /**
   * Register a consolidated tool with enhanced metadata
   */
  private registerTool(metadata: ConsolidatedToolMetadata): void {
    const enhancedHandler = async (params: unknown): Promise<McpToolResponse> => {
      return this.wrapToolHandler(metadata.name, params, metadata.handler);
    };

    this.toolRegistry.set(metadata.name, { 
      metadata, 
      handler: enhancedHandler 
    });

    // Suppress individual tool registration logs for cleaner startup
  }

  /**
   * Register all consolidated tools
   */
  private registerAllTools(): void {
    for (const toolMetadata of consolidatedToolsRegistry) {
      this.registerTool(toolMetadata);
    }

    // Suppress verbose startup logs - tools will be shown in banner
    logger.debug(`Registered ${this.toolRegistry.size} consolidated tools in ALECS server`);
  }

  /**
   * Wrap tool handler with common functionality
   */
  private async wrapToolHandler(
    toolName: string,
    params: unknown,
    handler: (params: unknown) => Promise<McpToolResponse>,
  ): Promise<McpToolResponse> {
    const context = this.createRequestContext(toolName, params);

    logger.info('Consolidated tool request', {
      ...context,
      params: typeof params === 'object' ? JSON.stringify(params) : String(params),
    });

    try {
      // Determine which customer section to use
      let customer: string;
      if (serverConfig.enableCustomerOverride) {
        // Allow customer override from params
        customer = this.extractCustomer(params) || serverConfig.getSessionCustomer();
      } else {
        // Always use session customer, ignore params
        customer = serverConfig.getSessionCustomer();
        
        // If customer was provided in params but override is disabled, strip it
        if (params && typeof params === 'object' && 'customer' in params) {
          // Create a copy without the customer field
          params = { ...params };
          delete (params as any).customer;
        }
      }
      
      this.validateCustomerContext(customer);

      // Execute tool handler
      const result = await handler(params);

      const duration = Date.now() - context.startTime;

      logger.info('Tool request completed', {
        ...context,
        duration,
        success: true,
      });

      return result;
    } catch (_error) {
      const duration = Date.now() - context.startTime;
      const errorMessage = this.formatError(_error);

      logger.error('Tool request failed', {
        ...context,
        duration,
        error: errorMessage,
      });

      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: ${errorMessage}\n\n🔧 **Need Help?**\n- Check tool documentation\n- Verify required parameters\n- Use 'alecs-dev' server for legacy tools\n- Contact support if issue persists`,
          },
        ],
      };
    }
  }

  /**
   * Format error for response
   */
  private formatError(_error: unknown): string {
    if (_error instanceof ConfigurationError) {
      return `Configuration error: ${_error.message}`;
    }

    if (_error instanceof z.ZodError) {
      return `Validation error: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    if (_error instanceof Error) {
      return _error.message;
    }

    return String(_error);
  }

  /**
   * Convert tool metadata to MCP tool format with enhanced information
   */
  private toolMetadataToMcpTool(metadata: ConsolidatedToolMetadata): Tool {
    return {
      name: metadata.name,
      description: `${metadata.description}\n\n` +
                  `📁 **Category:** ${metadata.category}\n` +
                  `⚡ **Complexity:** ${metadata.complexity}\n` +
                  `⏱️ **Estimated Time:** ${metadata.estimatedTime}\n` +
                  `🎯 **Business Focus:** ${metadata.businessFocus}`,
      inputSchema: zodToJsonSchema(metadata.inputSchema),
    };
  }

  /**
   * Setup MCP request handlers for a specific server instance
   */
  private setupHandlersForServer(server: Server): void {
    // Enhanced list tools handler with pagination and filtering
    server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
      logger.debug('List tools request received', { params: request.params });

      const { cursor, category, complexity } = (request.params as any) || {};
      
      let filteredTools = consolidatedToolsRegistry;

      // Filter by category if specified
      if (category && Object.values(ToolCategory).includes(category)) {
        filteredTools = filteredTools.filter(tool => tool.category === category);
      }

      // Filter by complexity if specified
      if (complexity && Object.values(ToolComplexity).includes(complexity)) {
        filteredTools = filteredTools.filter(tool => tool.complexity === complexity);
      }

      // Implement pagination
      const pageSize = 20;
      const startIndex = cursor ? parseInt(cursor) : 0;
      const endIndex = Math.min(startIndex + pageSize, filteredTools.length);
      
      const pageTools = filteredTools.slice(startIndex, endIndex);
      
      const tools: Tool[] = pageTools.map(tool => this.toolMetadataToMcpTool(tool));

      const hasMore = endIndex < filteredTools.length;
      const nextCursor = hasMore ? endIndex.toString() : undefined;

      logger.debug(`Returning ${tools.length} tools (page ${Math.floor(startIndex / pageSize) + 1})`, {
        total: filteredTools.length,
        hasMore,
        category,
        complexity,
      });

      const response: any = { tools };
      if (nextCursor) {
        response.nextCursor = nextCursor;
      }

      return response;
    });

    // Handle call tool request
    server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest): Promise<CallToolResult> => {
        const { name, arguments: args } = request.params;

        const entry = this.toolRegistry.get(name);

        if (!entry) {
          throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}\n\nAvailable tools: ${Array.from(this.toolRegistry.keys()).join(', ')}`);
        }

        try {
          // Validate parameters
          const validatedParams = entry.metadata.inputSchema.parse(args);

          // Execute handler
          const result = await entry.handler(validatedParams);

          return {
            content: result.content || [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (_error) {
          if (_error instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters for ${name}: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            );
          }

          throw new McpError(ErrorCode.InternalError, this.formatError(_error));
        }
      },
    );
  }

  /**
   * Setup MCP request handlers with enhanced tool discovery
   */
  private setupHandlers(): void {
    // Enhanced list tools handler with pagination and filtering
    this.server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
      logger.debug('List tools request received', { params: request.params });

      const { cursor, category, complexity } = (request.params as any) || {};
      
      let filteredTools = consolidatedToolsRegistry;

      // Filter by category if specified
      if (category && Object.values(ToolCategory).includes(category)) {
        filteredTools = filteredTools.filter(tool => tool.category === category);
      }

      // Filter by complexity if specified
      if (complexity && Object.values(ToolComplexity).includes(complexity)) {
        filteredTools = filteredTools.filter(tool => tool.complexity === complexity);
      }

      // Implement pagination
      const pageSize = 20;
      const startIndex = cursor ? parseInt(cursor) : 0;
      const endIndex = Math.min(startIndex + pageSize, filteredTools.length);
      
      const pageTools = filteredTools.slice(startIndex, endIndex);
      
      const tools: Tool[] = pageTools.map(tool => this.toolMetadataToMcpTool(tool));

      const hasMore = endIndex < filteredTools.length;
      const nextCursor = hasMore ? endIndex.toString() : undefined;

      logger.debug(`Returning ${tools.length} tools (page ${Math.floor(startIndex / pageSize) + 1})`, {
        total: filteredTools.length,
        hasMore,
        category,
        complexity,
      });

      const response: any = { tools };
      if (nextCursor) {
        response.nextCursor = nextCursor;
      }

      return response;
    });

    // Handle call tool request
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest): Promise<CallToolResult> => {
        const { name, arguments: args } = request.params;

        const entry = this.toolRegistry.get(name);

        if (!entry) {
          throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}\n\nAvailable tools: ${Array.from(this.toolRegistry.keys()).join(', ')}`);
        }

        try {
          // Validate parameters
          const validatedParams = entry.metadata.inputSchema.parse(args);

          // Execute handler
          const result = await entry.handler(validatedParams);

          return {
            content: result.content || [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (_error) {
          if (_error instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters for ${name}: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            );
          }

          throw new McpError(ErrorCode.InternalError, this.formatError(_error));
        }
      },
    );
  }

  /**
   * Start the server with local (stdio) transport
   */
  async runLocal(): Promise<void> {
    this.displayWelcomeBanner('local');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log server startup (debug level for cleaner output)
    logger.debug('ALECS server started successfully', {
      version: '2.0.0',
      architecture: 'consolidated',
      mode: 'local',
      transport: 'STDIO',
      toolCount: this.toolRegistry.size,
      features: ['enhanced-discovery', 'pagination', 'categories', 'business-context'],
    });

    this.displayLocalModeReady();
  }

  /**
   * Start the server with remote transports (WebSocket + SSE)
   */
  async runRemote(): Promise<void> {
    this.displayWelcomeBanner('remote');
    
    const activeTransports: string[] = [];
    
    // Auto-generate API token for remote access
    const apiToken = generateAndDisplayToken();
    
    // Store token for validation (in production, use secure storage)
    process.env.ALECS_API_TOKEN = apiToken.token;
    
    try {
      // Start WebSocket transport
      const { WebSocketServerTransport } = await import('./transport/websocket-transport.js');
      const wsTransport = new WebSocketServerTransport({
        port: parseInt(process.env.ALECS_WS_PORT || '8082', 10),
        host: process.env.ALECS_WS_HOST || '0.0.0.0',
        ssl: process.env.ALECS_SSL_CERT && process.env.ALECS_SSL_KEY ? {
          cert: process.env.ALECS_SSL_CERT,
          key: process.env.ALECS_SSL_KEY,
        } : undefined,
        path: process.env.ALECS_WS_PATH || '/mcp',
      });
      
      // Create separate server instance for WebSocket
      const wsServer = new Server(
        {
          name: 'alecs',
          version: '2.0.0',
          description: 'ALECS - A Launchgrid for Edge & Cloud Services (WebSocket)',
        },
        {
          capabilities: {
            tools: {
              listChanged: true,
            },
          },
        },
      );
      
      // Copy handlers to WebSocket server
      this.setupHandlersForServer(wsServer);
      await wsServer.connect(wsTransport);
      
      activeTransports.push(`WebSocket (${process.env.ALECS_WS_HOST || '0.0.0.0'}:${process.env.ALECS_WS_PORT || '8082'})`);
      
    } catch (error) {
      logger.warn('Failed to start WebSocket transport', { error: error instanceof Error ? error.message : String(error) });
    }

    try {
      // Start SSE transport
      const { SSEServerTransport } = await import('./transport/sse-transport.js');
      const sseTransport = new SSEServerTransport({
        port: parseInt(process.env.ALECS_SSE_PORT || '8083', 10),
        host: process.env.ALECS_SSE_HOST || '0.0.0.0',
        ssl: process.env.ALECS_SSL_CERT && process.env.ALECS_SSL_KEY ? {
          cert: process.env.ALECS_SSL_CERT,
          key: process.env.ALECS_SSL_KEY,
        } : undefined,
        path: process.env.ALECS_SSE_PATH || '/mcp',
      });
      
      // Create separate server instance for SSE
      const sseServer = new Server(
        {
          name: 'alecs',
          version: '2.0.0',
          description: 'ALECS - A Launchgrid for Edge & Cloud Services (SSE)',
        },
        {
          capabilities: {
            tools: {
              listChanged: true,
            },
          },
        },
      );
      
      // Copy handlers to SSE server
      this.setupHandlersForServer(sseServer);
      await sseServer.connect(sseTransport);
      
      activeTransports.push(`SSE (${process.env.ALECS_SSE_HOST || '0.0.0.0'}:${process.env.ALECS_SSE_PORT || '8083'})`);
      
    } catch (error) {
      logger.warn('Failed to start SSE transport', { error: error instanceof Error ? error.message : String(error) });
    }

    if (activeTransports.length === 0) {
      throw new Error('Failed to start any remote transports');
    }

    // Log server startup (debug level for cleaner output)
    logger.debug('ALECS server started successfully', {
      version: '2.0.0',
      architecture: 'consolidated',
      mode: 'remote',
      transports: activeTransports,
      toolCount: this.toolRegistry.size,
      features: ['enhanced-discovery', 'pagination', 'categories', 'business-context'],
      apiToken: {
        id: apiToken.id,
        createdAt: apiToken.createdAt,
      },
    });
    
    // Display connection information
    console.log('\n\u001b[32m✅ Remote Mode Ready!\u001b[0m');
    console.log('\u001b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m');
    
    // Get configuration info
    const configInfo = this.getConfigurationInfo();
    console.log(`\u001b[1m\u001b[34m🔑 Configuration:\u001b[0m ${configInfo}`);
    console.log();
    
    console.log('\u001b[1m\u001b[34m📡 Available Transports:\u001b[0m');
    activeTransports.forEach((transport, index) => {
      console.log(`   \u001b[32m${index + 1}.\u001b[0m ${transport}`);
    });
    
    console.log();
    console.log('\u001b[1m\u001b[34m📋 Connection Instructions:\u001b[0m');
    console.log('   \u001b[90m•\u001b[0m Use the API token displayed above for authentication');
    console.log('   \u001b[90m•\u001b[0m Connect via WebSocket or SSE transport');
    console.log('   \u001b[90m•\u001b[0m Both transports provide the same 25 consolidated tools');
    
    console.log();
    console.log('\u001b[33m⚠️  Keep the server running to maintain remote access\u001b[0m');
    console.log('\u001b[32m🌐 Ready for remote MCP connections!\u001b[0m\n');
    
    // Log startup summary for debugging
    const categoryCount = new Map<ToolCategory, number>();
    for (const tool of consolidatedToolsRegistry) {
      categoryCount.set(tool.category, (categoryCount.get(tool.category) || 0) + 1);
    }
    
    logger.debug('Server ready for connections', {
      totalTools: consolidatedToolsRegistry.length,
      categories: Object.fromEntries(categoryCount),
    });
  }

  /**
   * Get configuration information to display
   */
  private getConfigurationInfo(): string {
    try {
      const customers = this.configManager.listSections();
      
      if (customers.length === 1 && customers[0] === 'default') {
        return 'Using section \u001b[33m[default]\u001b[0m of your EdgeRC';
      } else if (customers.length === 1) {
        return `Using section \u001b[33m[${customers[0]}]\u001b[0m of your EdgeRC`;
      } else {
        return `Found \u001b[32m${customers.length}\u001b[0m EdgeRC sections: \u001b[33m${customers.join(', ')}\u001b[0m`;
      }
    } catch (error) {
      return '\u001b[31mEdgeRC configuration not found\u001b[0m';
    }
  }
  
  /**
   * Display welcome banner
   */
  private displayWelcomeBanner(mode: 'local' | 'remote'): void {
    const banner = `
\u001b[36m╔═══════════════════════════════════════════════════════════════╗\u001b[0m
\u001b[36m║\u001b[0m  \u001b[1m\u001b[32mALECS v2.0\u001b[0m - \u001b[33mA Launchgrid for Edge & Cloud Services\u001b[0m     \u001b[36m║\u001b[0m
\u001b[36m║\u001b[0m                                                               \u001b[36m║\u001b[0m
\u001b[36m║\u001b[0m  \u001b[1m\u001b[35m25 Consolidated Tools\u001b[0m \u001b[90m• Business-Focused Design\u001b[0m        \u001b[36m║\u001b[0m
\u001b[36m║\u001b[0m  \u001b[1m\u001b[34mMode:\u001b[0m ${mode === 'local' ? '\u001b[32mLocal (STDIO)\u001b[0m' : '\u001b[33mRemote (WebSocket + SSE)\u001b[0m'} \u001b[90m• MCP 2025 Compliant\u001b[0m         \u001b[36m║\u001b[0m
\u001b[36m╚═══════════════════════════════════════════════════════════════╝\u001b[0m\n`;
    
    console.log(banner);
  }
  
  /**
   * Display local mode ready message
   */
  private displayLocalModeReady(): void {
    const categoryCount = new Map<ToolCategory, number>();
    for (const tool of consolidatedToolsRegistry) {
      categoryCount.set(tool.category, (categoryCount.get(tool.category) || 0) + 1);
    }
    
    console.log('\u001b[32m✅ Local Mode Ready!\u001b[0m');
    console.log('\u001b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m');
    
    // Get configuration info
    const configInfo = this.getConfigurationInfo();
    console.log(`\u001b[1m\u001b[34m🔑 Configuration:\u001b[0m ${configInfo}`);
    
    // Show feature flags if any are non-default
    if (serverConfig.enableCustomerOverride) {
      console.log(`\u001b[1m\u001b[34m⚙️  Features:\u001b[0m \u001b[33mCustomer Override Enabled\u001b[0m`);
    }
    console.log();
    
    console.log('\u001b[1m\u001b[34m🔧 Tool Categories:\u001b[0m');
    
    const categories = Object.entries(Object.fromEntries(categoryCount))
      .map(([cat, count]) => `\u001b[33m${cat}\u001b[0m (\u001b[32m${count}\u001b[0m)`)
      .join(' \u001b[90m•\u001b[0m ');
    
    console.log(`   ${categories}`);
    console.log();
    console.log('\u001b[1m\u001b[34m📋 Usage:\u001b[0m');
    console.log('   \u001b[90m•\u001b[0m Configure Claude Desktop to use this server via STDIO');
    console.log('   \u001b[90m•\u001b[0m Server is ready to accept MCP protocol requests');
    console.log('   \u001b[90m•\u001b[0m Use \u001b[33mnpm run start:remote\u001b[0m for network access');
    console.log();
    console.log('\u001b[32m🚀 Ready for Claude Desktop integration!\u001b[0m\n');
    
    // Log server ready (debug level for cleaner output)
    logger.debug('Server ready for connections', {
      totalTools: consolidatedToolsRegistry.length,
      categories: Object.fromEntries(categoryCount),
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('ALECS server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('ALECS server terminated');
  process.exit(0);
});

/**
 * Main entry point - local vs remote mode
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let mode: 'local' | 'remote' = 'local';
  
  // Check for mode argument
  if (args.includes('--remote') || args.includes('-r')) {
    mode = 'remote';
  } else if (args.includes('--local') || args.includes('-l')) {
    mode = 'local';
  }
  
  // Check environment variable
  const envMode = process.env.ALECS_MODE?.toLowerCase();
  if (envMode === 'remote') {
    mode = 'remote';
  } else if (envMode === 'local') {
    mode = 'local';
  }
  
  try {
    const server = new ALECSServer();
    
    if (mode === 'remote') {
      await server.runRemote();
    } else {
      await server.runLocal();
    }
  } catch (error) {
    logger.error('Failed to start ALECS server', { 
      error: error instanceof Error ? error.message : String(error),
      mode 
    });
    process.exit(1);
  }
}

// Start the server if this is the main module
if (require.main === module) {
  main();
}

// Export for use as a module
export { ALECSServer };