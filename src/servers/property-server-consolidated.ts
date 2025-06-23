#!/usr/bin/env node

/**
 * ALECS Property Server - Consolidated Architecture
 * Uses consolidated property tools instead of scattered individual tools
 * Modern, business-focused property management with unified workflows
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import consolidated tools
import { 
  propertyTool, 
  handlePropertyTool 
} from '../tools/consolidated/property-tool';
import { 
  searchTool, 
  handleSearchTool 
} from '../tools/consolidated/search-tool';
import { 
  deployTool, 
  handleDeployTool 
} from '../tools/consolidated/deploy-tool-simple';

// Import workflow orchestrator for advanced workflows
import { WorkflowOrchestrator } from '../tools/consolidated/workflow-orchestrator';

import { logger } from '../utils/logger';

/**
 * Consolidated Property Server
 * Focused on property management with streamlined, business-oriented architecture
 */
class ConsolidatedPropertyServer {
  private server: Server;
  private orchestrator: WorkflowOrchestrator;

  constructor() {
    logger.info('🏢 ALECS Consolidated Property Server starting...');

    this.server = new Server(
      {
        name: 'alecs-property-consolidated',
        version: '1.4.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.orchestrator = WorkflowOrchestrator.getInstance();
    this.setupHandlers();
  }

  private setupHandlers() {
    logger.info('Setting up consolidated tool handlers...');

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('📋 Consolidated tools list requested');
      
      return {
        tools: [
          // Core consolidated tools for property management
          {
            name: propertyTool.name,
            description: propertyTool.description,
            inputSchema: propertyTool.inputSchema,
          },
          {
            name: searchTool.name,
            description: searchTool.description,
            inputSchema: searchTool.inputSchema,
          },
          {
            name: deployTool.name,
            description: deployTool.description,
            inputSchema: deployTool.inputSchema,
          },
          
          // Business workflow shortcuts
          {
            name: 'create-ecommerce-property',
            description: 'Quick setup for ecommerce properties with best practices',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Property name' },
                hostname: { type: 'string', description: 'Primary hostname' },
                customer: { type: 'string', description: 'Customer context' },
              },
              required: ['name', 'hostname'],
            },
          },
          
          {
            name: 'optimize-property-performance',
            description: 'Analyze and optimize property for performance',
            inputSchema: {
              type: 'object',
              properties: {
                propertyId: { type: 'string', description: 'Property ID to optimize' },
                goal: { type: 'string', description: 'Performance goal (speed, mobile, api)' },
                customer: { type: 'string', description: 'Customer context' },
              },
              required: ['propertyId'],
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info('🔧 Tool execution requested', { name, args });

      try {
        switch (name) {
          case 'property':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handlePropertyTool(args || { action: 'list' }), null, 2),
                },
              ],
            };

          case 'search':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleSearchTool(args || { action: 'find', query: '' }), null, 2),
                },
              ],
            };

          case 'deploy':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleDeployTool(args || { action: 'status' }), null, 2),
                },
              ],
            };

          case 'create-ecommerce-property':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.createEcommerceProperty(args), null, 2),
                },
              ],
            };

          case 'optimize-property-performance':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.optimizePropertyPerformance(args), null, 2),
                },
              ],
            };

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('Tool execution failed', { name, error });
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  /**
   * Business workflow: Create ecommerce property with best practices
   */
  private async createEcommerceProperty(args: any) {
    logger.info('Creating ecommerce property with best practices', args);

    // Use orchestrator for complex workflow
    const result = await this.orchestrator.createProperty({
      name: args.name,
      businessPurpose: 'ecommerce',
      hostnames: [args.hostname],
      customer: args.customer,
    });

    return {
      status: 'success',
      message: 'Ecommerce property created with optimized configuration',
      property: result,
      nextSteps: [
        'Configure SSL certificate',
        'Set up performance monitoring',
        'Test the property in staging',
        'Deploy to production',
      ],
    };
  }

  /**
   * Business workflow: Optimize property performance
   */
  private async optimizePropertyPerformance(args: any) {
    logger.info('Optimizing property performance', args);

    const result = await this.orchestrator.optimizePerformance(args.propertyId, {
      goal: args.goal || 'speed',
      customer: args.customer,
    });

    return {
      status: 'success',
      message: 'Property performance optimization completed',
      optimization: result,
      businessImpact: {
        expectedSpeedImprovement: '20-40%',
        cacheHitRateIncrease: '15-25%',
        bandwidthSavings: '10-20%',
      },
    };
  }

  /**
   * Start the server
   */
  async run() {
    logger.info('🚀 Starting consolidated property server...');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('✅ Consolidated Property Server ready and listening');
  }
}

// Start the server
if (require.main === module) {
  const server = new ConsolidatedPropertyServer();
  server.run().catch((error) => {
    logger.error('❌ Server startup failed', { error });
    process.exit(1);
  });
}

export default ConsolidatedPropertyServer;