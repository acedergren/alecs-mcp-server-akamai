/**
 * Dynamic Tool Discovery System for ALECS MCP Server
 * 
 * CODE KAI PRINCIPLES:
 * Key: Auto-discover tools from filesystem without hardcoded registries
 * Approach: Scan domains, load tools dynamically, register with ALECSCore
 * Implementation: Type-safe, performant, follows naming consolidation plan
 * 
 * Features:
 * - Automatic tool discovery from src/tools/{domain}/
 * - Domain filtering for microservices
 * - Customer-tier tool filtering
 * - Performance caching and monitoring
 * - Zero-config tool registration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { z } from 'zod';
import type { ToolDefinition } from './server/alecs-core';
import { logger } from '../utils/logger';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { CACHE_TTL } from '../constants/index';

/**
 * Tool discovery configuration schema
 */
export const DiscoveryConfigSchema = z.object({
  // Path patterns to include
  includePatterns: z.array(z.string()).optional().default([]),
  
  // Path patterns to exclude  
  excludePatterns: z.array(z.string()).optional().default([]),
  
  // Customer tier filtering
  customerTier: z.enum(['basic', 'enterprise', 'all']).optional().default('all'),
  
  // Performance settings
  enableCaching: z.boolean().optional().default(true),
  cacheTimeout: z.number().optional().default(CACHE_TTL.DEFAULT),
  
  // Development settings
  enableHotReload: z.boolean().optional().default(false),
  scanInterval: z.number().optional().default(5000), // 5 seconds
});

export type DiscoveryConfig = z.infer<typeof DiscoveryConfigSchema>;

/**
 * Discovered domain metadata
 */
export interface DomainMetadata {
  name: string;
  description: string;
  toolCount: number;
  features: string[];
  version?: string;
  customerTiers?: string[];
  apiEndpoints?: string[];
}

/**
 * Discovery result for monitoring and debugging
 */
export interface DiscoveryResult {
  domains: string[];
  totalTools: number;
  toolsByDomain: Record<string, number>;
  discoveryTime: number;
  errors: string[];
  cached: boolean;
}

/**
 * Dynamic Tool Discovery Engine
 */
export class DynamicToolDiscovery {
  private cache = new Map<string, { tools: ToolDefinition[]; timestamp: number; metadata: DomainMetadata[] }>();
  private readonly toolsPath: string;
  private config: DiscoveryConfig;
  
  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = DiscoveryConfigSchema.parse(config);
    this.toolsPath = path.join(__dirname, '../tools');
    
    // Setup hot reload if enabled
    if (this.config.enableHotReload) {
      this.setupHotReload();
    }
  }
  
  /**
   * Discover all available tools based on configuration
   */
  async discoverTools(): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey();
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.config.cacheTimeout * 1000)) {
        logger.debug('Tool discovery cache hit', { 
          totalTools: cached.tools.length,
          domains: cached.metadata.map(m => m.name)
        });
        
        return {
          domains: cached.metadata.map(m => m.name),
          totalTools: cached.tools.length,
          toolsByDomain: this.getToolCountByDomain(cached.metadata),
          discoveryTime: Date.now() - startTime,
          errors: [],
          cached: true
        };
      }
    }
    
    // Perform fresh discovery
    const result = await this.performDiscovery();
    
    // Cache results
    if (this.config.enableCaching) {
      this.cache.set(cacheKey, {
        tools: result.tools,
        timestamp: Date.now(),
        metadata: result.metadata
      });
    }
    
    logger.info('Tool discovery completed', {
      totalTools: result.tools.length,
      domains: result.metadata.map(m => m.name),
      discoveryTime: Date.now() - startTime,
      cached: false
    });
    
    return {
      domains: result.metadata.map(m => m.name),
      totalTools: result.tools.length,
      toolsByDomain: this.getToolCountByDomain(result.metadata),
      discoveryTime: Date.now() - startTime,
      errors: result.errors,
      cached: false
    };
  }
  
  /**
   * Get discovered tools for ALECSCore registration
   */
  async getTools(): Promise<ToolDefinition[]> {
    const result = await this.performDiscovery();
    return result.tools;
  }
  
  /**
   * Get domain metadata for monitoring and display
   */
  async getDomainMetadata(): Promise<DomainMetadata[]> {
    const result = await this.performDiscovery();
    return result.metadata;
  }
  
  /**
   * Perform the actual discovery process
   */
  private async performDiscovery(): Promise<{ tools: ToolDefinition[]; metadata: DomainMetadata[]; errors: string[] }> {
    const tools: ToolDefinition[] = [];
    const metadata: DomainMetadata[] = [];
    const errors: string[] = [];
    
    try {
      // Scan for domain directories
      const domains = await this.scanDomains();
      
      // Process each domain
      for (const domain of domains) {
        try {
          const domainResult = await this.loadDomain(domain);
          
          if (domainResult) {
            tools.push(...domainResult.tools);
            metadata.push(domainResult.metadata);
          }
        } catch (error) {
          const errorMessage = `Failed to load domain ${domain}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMessage);
          logger.error('Domain loading failed', { domain, error: errorMessage });
        }
      }
      
    } catch (error) {
      const errorMessage = `Discovery scan failed: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMessage);
      logger.error('Tool discovery failed', { error: errorMessage });
    }
    
    return { tools, metadata, errors };
  }
  
  /**
   * Scan for available domain directories
   */
  private async scanDomains(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.toolsPath, { withFileTypes: true });
      const domains = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => name !== 'common') // Skip common utilities
        .filter(domain => this.shouldIncludeDomain(domain));
      
      logger.debug('Scanned domains', { domains, total: domains.length });
      return domains;
    } catch (error) {
      logger.error('Failed to scan domains directory', { path: this.toolsPath, error });
      return [];
    }
  }
  
  /**
   * Load tools and metadata from a specific domain
   */
  private async loadDomain(domain: string): Promise<{ tools: ToolDefinition[]; metadata: DomainMetadata } | null> {
    const domainPath = path.join(this.toolsPath, domain);
    const indexPath = path.join(domainPath, 'index.ts');
    
    try {
      // Check if domain has index.ts (following consolidation plan structure)
      await fs.access(indexPath);
      
      // Import domain module - use require for compatibility
      const modulePath = path.resolve(path.join(domainPath, 'index.js'));
      
      // Clear require cache for hot reload
      if (this.config.enableHotReload) {
        delete require.cache[modulePath];
      }
      
      const domainModule = require(modulePath);
      
      // Extract tools based on naming convention from consolidation plan
      const toolsKey = `${domain}Tools`;
      const metadataKey = `${domain}DomainMetadata`;
      
      if (!domainModule[toolsKey]) {
        logger.warn(`Domain ${domain} missing ${toolsKey} export`);
        return null;
      }
      
      const domainTools = domainModule[toolsKey];
      const domainMetadata: DomainMetadata = domainModule[metadataKey] || {
        name: domain,
        description: `${domain} management tools`,
        toolCount: 0,
        features: []
      };
      
      // Convert domain tools to ALECSCore format
      const tools = this.convertToToolDefinitions(domainTools, domain);
      
      // Update metadata with actual tool count
      domainMetadata.toolCount = tools.length;
      
      // Filter by customer tier if specified
      const filteredTools = this.filterToolsByCustomerTier(tools);
      
      logger.debug(`Loaded domain ${domain}`, { 
        tools: tools.length, 
        filtered: filteredTools.length,
        customerTier: this.config.customerTier 
      });
      
      return { tools: filteredTools, metadata: domainMetadata };
      
    } catch (error) {
      logger.warn(`Failed to load domain ${domain}`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
  
  /**
   * Convert domain tools object to ALECSCore ToolDefinition array
   */
  private convertToToolDefinitions(domainTools: Record<string, any>, domain: string): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    
    for (const [toolName, toolDef] of Object.entries(domainTools)) {
      try {
        tools.push({
          name: toolName,
          description: toolDef.description || `Execute ${toolName}`,
          schema: toolDef.inputSchema || z.any(),
          handler: async (args: any, context: any) => {
            return toolDef.handler(context.client, args);
          },
          options: {
            cache: { ttl: CACHE_TTL.DEFAULT },
            coalesce: true,
            format: 'text'
          }
        });
      } catch (error) {
        logger.error(`Failed to convert tool ${toolName} in domain ${domain}`, { error });
      }
    }
    
    return tools;
  }
  
  /**
   * Check if domain should be included based on patterns
   */
  private shouldIncludeDomain(domain: string): boolean {
    // Check include patterns
    if (this.config.includePatterns.length > 0) {
      const included = this.config.includePatterns.some(pattern => 
        this.matchesPattern(domain, pattern)
      );
      if (!included) return false;
    }
    
    // Check exclude patterns
    if (this.config.excludePatterns.length > 0) {
      const excluded = this.config.excludePatterns.some(pattern => 
        this.matchesPattern(domain, pattern)
      );
      if (excluded) return false;
    }
    
    return true;
  }
  
  /**
   * Simple pattern matching (supports wildcards)
   */
  private matchesPattern(text: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`).test(text);
  }
  
  /**
   * Filter tools based on customer tier
   */
  private filterToolsByCustomerTier(tools: ToolDefinition[]): ToolDefinition[] {
    if (this.config.customerTier === 'all') {
      return tools;
    }
    
    // For basic tier, exclude enterprise-only tools
    if (this.config.customerTier === 'basic') {
      return tools.filter(tool => 
        !tool.name.includes('billing') && 
        !tool.name.includes('contract') &&
        !tool.name.includes('enterprise')
      );
    }
    
    // Enterprise tier gets all tools
    return tools;
  }
  
  /**
   * Get cache key based on configuration
   */
  private getCacheKey(): string {
    return JSON.stringify({
      include: this.config.includePatterns,
      exclude: this.config.excludePatterns,
      tier: this.config.customerTier
    });
  }
  
  /**
   * Get tool count by domain for reporting
   */
  private getToolCountByDomain(metadata: DomainMetadata[]): Record<string, number> {
    return metadata.reduce((acc, domain) => {
      acc[domain.name] = domain.toolCount;
      return acc;
    }, {} as Record<string, number>);
  }
  
  /**
   * Setup file watching for hot reload
   */
  private setupHotReload(): void {
    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'development') {
      // Clear cache periodically during development
      setInterval(() => {
        logger.debug('Clearing discovery cache for hot reload');
        this.cache.clear();
      }, this.config.scanInterval);
    }
  }
  
  /**
   * Clear discovery cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Discovery cache cleared');
  }
  
  /**
   * Get discovery statistics for monitoring
   */
  getStats(): { cacheSize: number; cacheKeys: string[] } {
    return {
      cacheSize: this.cache.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}