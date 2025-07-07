/**
 * Base MCP Server Infrastructure
 * 
 * Consolidates common functionality across all ALECS MCP servers
 * Reduces ~1,500 lines of duplicate code
 * 
 * Features:
 * - Lifecycle management with proper cleanup
 * - Middleware pipeline for cross-cutting concerns
 * - Built-in monitoring and health checks
 * - Standardized error handling
 * - Performance tracking
 * - Resource management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AkamaiClient } from '../../akamai-client';
import { CustomerConfigManager } from '../../utils/customer-config';
import { ToolRegistry } from './registry/tool-registry';
import { Logger } from './utils/logging';
import { HealthMonitor } from './utils/monitoring';
import { ErrorHandler } from './utils/error-handler';
import { ResponseFormatter } from './utils/response-formatter';
import { safeExtractCustomer } from '../validation/customer';

export interface ServerConfig {
  name: string;
  version?: string;
  middleware?: Middleware[];
  monitoring?: MonitoringConfig;
  cache?: CacheConfig;
  rateLimit?: RateLimitConfig;
}

export interface MonitoringConfig {
  enabled?: boolean;
  interval?: number;
  includeMetrics?: string[];
}

export interface CacheConfig {
  enabled?: boolean;
  defaultTtl?: number;
  maxSize?: number;
}

export interface RateLimitConfig {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
}

export interface Middleware {
  name: string;
  before?: (request: any) => Promise<any>;
  after?: (response: any) => Promise<any>;
  error?: (error: any) => Promise<any>;
}

export interface ToolContext {
  client: AkamaiClient;
  customer?: string;
  logger: Logger;
  cache: Map<string, any>;
}

export abstract class BaseMCPServer {
  protected server: Server;
  protected client: AkamaiClient;
  protected configManager: CustomerConfigManager;
  protected toolRegistry: ToolRegistry;
  protected logger: Logger;
  protected healthMonitor: HealthMonitor;
  protected errorHandler: ErrorHandler;
  protected responseFormatter: ResponseFormatter;
  
  private config: ServerConfig;
  private middleware: Middleware[] = [];
  private intervals: NodeJS.Timer[] = [];
  private isShuttingDown = false;
  
  constructor(config: ServerConfig) {
    this.config = {
      version: '1.0.0',
      monitoring: { enabled: true, interval: 30000 },
      cache: { enabled: true, defaultTtl: 300, maxSize: 1000 },
      rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 },
      ...config,
    };
    
    // Initialize core components
    this.logger = new Logger(config.name);
    this.errorHandler = new ErrorHandler(this.logger);
    this.responseFormatter = new ResponseFormatter();
    this.toolRegistry = new ToolRegistry(this.logger);
    
    // Initialize server
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    
    // Initialize client and config
    this.client = new AkamaiClient();
    this.configManager = CustomerConfigManager.getInstance();
    
    // Setup middleware
    this.middleware = config.middleware || [];
    
    // Setup monitoring
    this.healthMonitor = new HealthMonitor(this.config.name, this.config.monitoring);
    
    // Setup handlers
    this.setupHandlers();
    this.setupProcessHandlers();
    
    // Register tools
    this.registerTools();
    
    this.logger.info('Server initialized', {
      toolCount: this.toolRegistry.size(),
      middleware: this.middleware.map(m => m.name),
    });
  }
  
  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // Handle list_tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Handling list_tools request');
      return {
        tools: this.toolRegistry.getToolDefinitions(),
      };
    });
    
    // Handle call_tool request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Apply before middleware
        let processedArgs = args;
        for (const mw of this.middleware) {
          if (mw.before) {
            processedArgs = await mw.before({ name, args: processedArgs });
          }
        }
        
        // Extract customer
        const customer = safeExtractCustomer(processedArgs as Record<string, unknown>);
        
        // Create context
        const context: ToolContext = {
          client: this.client,
          customer,
          logger: this.logger,
          cache: new Map(),
        };
        
        // Execute tool
        const startTime = Date.now();
        let result = await this.toolRegistry.execute(name, processedArgs, context);
        const duration = Date.now() - startTime;
        
        // Apply after middleware
        for (const mw of this.middleware) {
          if (mw.after) {
            result = await mw.after(result);
          }
        }
        
        // Track metrics
        this.healthMonitor.recordToolExecution(name, duration, true);
        
        return this.responseFormatter.formatSuccess(result, {
          tool: name,
          duration,
          version: this.config.version,
        });
        
      } catch (error) {
        // Apply error middleware
        let processedError = error;
        for (const mw of this.middleware) {
          if (mw.error) {
            processedError = await mw.error(processedError);
          }
        }
        
        // Track metrics
        this.healthMonitor.recordToolExecution(name, 0, false);
        
        // Handle error
        throw this.errorHandler.handle(processedError);
      }
    });
  }
  
  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Clear intervals
        for (const interval of this.intervals) {
          clearInterval(interval);
        }
        
        // Stop health monitor
        await this.healthMonitor.stop();
        
        // Close client connections
        await this.client.close?.();
        
        // Custom cleanup
        await this.cleanup();
        
        this.logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2'));
    
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }
  
  /**
   * Start the server
   */
  async start(): Promise<void> {
    this.logger.info('Starting server transport...');
    
    const transport = new StdioServerTransport();
    
    transport.onerror = (error: Error) => {
      this.logger.error('Transport error', {
        message: error.message,
        stack: error.stack,
      });
    };
    
    transport.onclose = () => {
      this.logger.info('Transport closed, shutting down...');
      process.exit(0);
    };
    
    await this.server.connect(transport);
    
    // Start monitoring
    if (this.config.monitoring?.enabled) {
      const monitorInterval = setInterval(() => {
        this.healthMonitor.recordHealth();
      }, this.config.monitoring.interval || 30000);
      this.intervals.push(monitorInterval);
    }
    
    this.logger.info('Server started successfully', {
      name: this.config.name,
      version: this.config.version,
      toolCount: this.toolRegistry.size(),
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
    });
  }
  
  /**
   * Abstract method for registering tools
   */
  protected abstract registerTools(): void;
  
  /**
   * Optional cleanup hook for subclasses
   */
  protected async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }
  
  /**
   * Helper to register a tool
   */
  protected registerTool(definition: {
    name: string;
    description: string;
    schema: z.ZodSchema;
    handler: (args: any, context: ToolContext) => Promise<any>;
    cache?: { key?: string; ttl?: number };
  }): void {
    this.toolRegistry.register(definition);
  }
  
  /**
   * Add middleware
   */
  protected addMiddleware(middleware: Middleware): void {
    this.middleware.push(middleware);
  }
}