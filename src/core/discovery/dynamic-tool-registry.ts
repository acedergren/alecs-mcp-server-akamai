/**
 * Dynamic Tool Discovery System
 * 
 * Replaces static registry.ts with filesystem-based discovery
 * Maintains CLI generation benefits while eliminating hardcoded tool counts
 * 
 * KEY BENEFITS:
 * - Auto-discovery of available tools from filesystem
 * - No manual registry updates required
 * - CLI generation system continues to work
 * - Preserves ALECSCore performance patterns
 * - Eliminates tool count maintenance
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import type { ToolDefinition } from './types';

export interface DynamicRegistryConfig {
  toolsBasePath: string;
  enableCache?: boolean;
  cacheMaxAge?: number;
  excludePatterns?: string[];
  includePatterns?: string[];
}

export interface DomainInfo {
  name: string;
  path: string;
  toolCount: number;
  metadata?: any;
}

/**
 * Dynamic Tool Registry
 * 
 * Scans filesystem for tool modules and dynamically loads them
 * Works with existing CLI generation system
 */
export class DynamicToolRegistry {
  private toolsCache = new Map<string, ToolDefinition[]>();
  private domainCache = new Map<string, DomainInfo>();
  private lastScanTime = 0;
  private readonly config: Required<DynamicRegistryConfig>;

  constructor(config: DynamicRegistryConfig) {
    this.config = {
      enableCache: true,
      cacheMaxAge: 300000, // 5 minutes
      excludePatterns: ['__tests__', '*.test.ts', '*.spec.ts', 'node_modules'],
      includePatterns: ['**/index.ts'],
      ...config,
    };
  }

  /**
   * Get all available tool definitions by scanning filesystem
   * Replaces getAllToolDefinitions() from registry.ts
   */
  async getAllToolDefinitions(): Promise<ToolDefinition[]> {
    if (this.shouldUseCachedTools()) {
      return Array.from(this.toolsCache.values()).flat();
    }

    logger.info('Scanning filesystem for tool definitions...');
    
    const domains = await this.discoverDomains();
    const allTools: ToolDefinition[] = [];

    for (const domain of domains) {
      try {
        const domainTools = await this.loadDomainTools(domain);
        allTools.push(...domainTools);
        this.toolsCache.set(domain.name, domainTools);
      } catch (error) {
        logger.warn(`Failed to load tools from domain ${domain.name}:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
      }
    }

    this.lastScanTime = Date.now();
    
    logger.info(`Discovered ${allTools.length} tools across ${domains.length} domains`);
    return allTools;
  }

  /**
   * Discover all domains by scanning the tools directory
   */
  async discoverDomains(): Promise<DomainInfo[]> {
    if (this.shouldUseCachedDomains()) {
      return Array.from(this.domainCache.values());
    }

    const domains: DomainInfo[] = [];
    
    try {
      const entries = await fs.readdir(this.config.toolsBasePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (this.isExcluded(entry.name)) continue;

        const domainPath = join(this.config.toolsBasePath, entry.name);
        const indexPath = join(domainPath, 'index.ts');

        // Check if domain has index.ts (our standard pattern)
        try {
          await fs.access(indexPath);
          const domain: DomainInfo = {
            name: entry.name,
            path: domainPath,
            toolCount: 0, // Will be calculated when loading tools
          };

          // Try to extract metadata from index.ts
          try {
            const metadata = await this.extractDomainMetadata(indexPath);
            domain.metadata = metadata;
          } catch (error) {
            logger.debug(`No metadata found for domain ${entry.name}`);
          }

          domains.push(domain);
          this.domainCache.set(entry.name, domain);
        } catch (error) {
          logger.debug(`Skipping ${entry.name} - no index.ts found`);
        }
      }
    } catch (error) {
      logger.error('Failed to scan tools directory:', error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
    }

    return domains;
  }

  /**
   * Load tools from a specific domain
   * Works with CLI-generated tool structures
   */
  async loadDomainTools(domain: DomainInfo): Promise<ToolDefinition[]> {
    const indexPath = join(domain.path, 'index.ts');
    
    try {
      // Import the domain module dynamically
      const absolutePath = require.resolve(indexPath);
      
      // Clear require cache to get fresh data
      delete require.cache[absolutePath];
      
      const domainModule = await import(absolutePath);
      
      // Look for CLI-generated tool exports
      const tools = this.extractToolsFromModule(domainModule, domain.name);
      
      // Update domain tool count
      domain.toolCount = tools.length;
      
      logger.debug(`Loaded ${tools.length} tools from domain ${domain.name}`);
      return tools;
      
    } catch (error) {
      logger.error(`Failed to load tools from domain ${domain.name}:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
      return [];
    }
  }

  /**
   * Extract tools from CLI-generated domain module
   * Supports multiple export patterns from the CLI generator
   */
  private extractToolsFromModule(module: any, domainName: string): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    // Pattern 1: Named exports like 'propertyTools'
    const toolsExport = module[`${domainName}Tools`];
    if (toolsExport && typeof toolsExport === 'object') {
      tools.push(...this.convertToolsObjectToDefinitions(toolsExport, domainName));
    }

    // Pattern 2: Default export
    if (module.default && typeof module.default === 'object') {
      tools.push(...this.convertToolsObjectToDefinitions(module.default, domainName));
    }

    // Pattern 3: Individual function exports (from CLI tool generator)
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (typeof exportValue === 'function' && exportName.includes(domainName)) {
        // This is likely a CLI-generated tool function
        const toolDef = this.createToolDefinitionFromFunction(exportName, exportValue as Function, domainName);
        if (toolDef) {
          tools.push(toolDef);
        }
      }
    }

    return tools;
  }

  /**
   * Convert CLI-generated tools object to ToolDefinition array
   * Matches the pattern from the current CLI generator
   */
  private convertToolsObjectToDefinitions(toolsObject: Record<string, any>, domainName: string): ToolDefinition[] {
    return Object.entries(toolsObject).map(([name, tool]) => ({
      name,
      description: tool.description || `${name} operation`,
      schema: tool.inputSchema,
      handler: tool.handler,
      metadata: {
        domain: domainName,
        cacheable: true,
        cacheTtl: 300,
      }
    }));
  }

  /**
   * Create tool definition from individual function export
   */
  private createToolDefinitionFromFunction(name: string, func: Function, domainName: string): ToolDefinition | null {
    // Basic validation that this looks like a tool function
    if (func.length < 1) return null; // Should accept at least args parameter

    return {
      name,
      description: `${name} operation for ${domainName}`,
      schema: z.any(), // Would need to be enhanced with schema inference
      handler: func as any,
      metadata: {
        domain: domainName,
        cacheable: true,
      }
    };
  }

  /**
   * Extract domain metadata from index.ts if available
   * Looks for CLI-generated metadata exports
   */
  private async extractDomainMetadata(indexPath: string): Promise<any> {
    try {
      const module = await import(indexPath);
      
      // Look for CLI-generated metadata patterns
      const metadataExports = [
        `${dirname(indexPath).split('/').pop()}DomainMetadata`,
        'domainMetadata',
        'metadata'
      ];

      for (const exportName of metadataExports) {
        if (module[exportName]) {
          return module[exportName];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get tools by domain name
   */
  async getToolsByDomain(domainName: string): Promise<ToolDefinition[]> {
    const allTools = await this.getAllToolDefinitions();
    return allTools.filter(tool => 
      tool.metadata?.domain === domainName || 
      tool.name.startsWith(`${domainName}_`)
    );
  }

  /**
   * Get tool by name
   */
  async getToolByName(name: string): Promise<ToolDefinition | undefined> {
    const allTools = await this.getAllToolDefinitions();
    return allTools.find(tool => tool.name === name);
  }

  /**
   * Get domain information
   */
  async getDomainInfo(domainName: string): Promise<DomainInfo | undefined> {
    await this.discoverDomains(); // Ensure domains are loaded
    return this.domainCache.get(domainName);
  }

  /**
   * Get all discovered domains
   */
  async getAllDomains(): Promise<DomainInfo[]> {
    return this.discoverDomains();
  }

  /**
   * Force refresh of tool cache
   */
  async refresh(): Promise<void> {
    this.toolsCache.clear();
    this.domainCache.clear();
    this.lastScanTime = 0;
    await this.getAllToolDefinitions();
  }

  /**
   * Check if tool cache is still valid
   */
  private shouldUseCachedTools(): boolean {
    if (!this.config.enableCache) return false;
    if (this.toolsCache.size === 0) return false;
    return (Date.now() - this.lastScanTime) < this.config.cacheMaxAge;
  }

  /**
   * Check if domain cache is still valid
   */
  private shouldUseCachedDomains(): boolean {
    if (!this.config.enableCache) return false;
    if (this.domainCache.size === 0) return false;
    return (Date.now() - this.lastScanTime) < this.config.cacheMaxAge;
  }

  /**
   * Check if path should be excluded from scanning
   */
  private isExcluded(path: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path.includes(pattern);
    });
  }

  /**
   * Validate all discovered tools
   */
  async validateAllTools(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const allTools = await this.getAllToolDefinitions();
    const nameSet = new Set<string>();

    for (const tool of allTools) {
      // Check for required fields
      if (!tool.name) {
        errors.push('Tool missing name');
        continue;
      }
      
      if (!tool.description) {
        errors.push(`Tool '${tool.name}' missing description`);
      }
      
      if (!tool.handler) {
        errors.push(`Tool '${tool.name}' missing handler function`);
      }

      // Check for duplicate names
      if (nameSet.has(tool.name)) {
        errors.push(`Duplicate tool name: '${tool.name}'`);
      } else {
        nameSet.add(tool.name);
      }

      // Validate schema if present
      if (tool.schema) {
        try {
          tool.schema.parse({});
        } catch (e) {
          // Expected for required fields - just checking schema validity
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get tool statistics
   */
  async getStatistics(): Promise<{
    totalTools: number;
    totalDomains: number;
    toolsByDomain: Record<string, number>;
  }> {
    const allTools = await this.getAllToolDefinitions();
    const domains = await this.getAllDomains();
    
    const toolsByDomain: Record<string, number> = {};
    for (const domain of domains) {
      toolsByDomain[domain.name] = domain.toolCount;
    }

    return {
      totalTools: allTools.length,
      totalDomains: domains.length,
      toolsByDomain,
    };
  }
}

/**
 * Create dynamic registry instance
 */
export function createDynamicRegistry(config?: Partial<DynamicRegistryConfig>): DynamicToolRegistry {
  const defaultConfig: DynamicRegistryConfig = {
    toolsBasePath: join(process.cwd(), 'src', 'tools'),
    enableCache: true,
    cacheMaxAge: 300000, // 5 minutes
    excludePatterns: ['__tests__', '*.test.ts', '*.spec.ts', 'node_modules', 'common'],
    includePatterns: ['**/index.ts'],
    ...config,
  };

  return new DynamicToolRegistry(defaultConfig);
}