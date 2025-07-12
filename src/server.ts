/**
 * ALECS MCP Server - Dynamic Discovery Implementation
 * 
 * This replaces the static registry.ts approach with dynamic tool discovery
 * Following FILE_NAMING_CONSOLIDATION_PLAN.md principles
 * 
 * CODE KAI PRINCIPLES:
 * Key: Single unified server with dynamic tool discovery
 * Approach: Auto-discover domains, register tools dynamically, zero maintenance
 * Implementation: Replaces 8 *-alecscore.ts servers with one modular server
 * 
 * MAJOR RELEASE BREAKING CHANGES:
 * - Replaces static registry.ts with dynamic discovery
 * - Consolidates multiple servers into one configurable server
 * - Eliminates hardcoded tool counts
 * - Supports microservices via configuration
 */

import { ALECSCore, type ALECSConfig } from './core/server/alecs-core';

/**
 * Create default server configuration for ALECS MCP Server
 * 
 * Provides sensible defaults for ALECS MCP Server with dynamic discovery enabled.
 * This configuration supports all Akamai customer tiers and automatically discovers
 * available tools based on the codebase structure.
 * 
 * @returns Complete ALECSConfig with production-ready defaults
 * 
 * @example
 * ```typescript
 * // Use default configuration
 * const server = new ALECSCore(getDefaultServerConfig());
 * 
 * // Customize configuration
 * const config = getDefaultServerConfig();
 * config.enableMonitoring = false;
 * config.dynamicDiscovery.customerTier = 'enterprise';
 * const server = new ALECSCore(config);
 * ```
 * 
 * @see {@link ALECSConfig} for complete configuration options
 */
export function getDefaultServerConfig(): ALECSConfig {
  return {
    name: 'alecs-mcp-server',
    version: '2.0.0',
    description: 'ALECS - A Launchpad for Edge & Cloud Services - MCP Server with Dynamic Discovery',
    
    // Enable dynamic discovery by default
    dynamicDiscovery: {
      enabled: true,
      includePatterns: [], // Include all domains by default
      excludePatterns: [], // No exclusions by default
      customerTier: 'all' as const,
      enableCaching: true,
      enableHotReload: process.env['NODE_ENV'] === 'development',
    },
    
    // Performance settings
    enableMonitoring: true,
    monitoringInterval: 60000, // 1 minute
    cacheSize: 2000,
    defaultTtl: 300, // 5 minutes
    maxSockets: 20,
    
    // Transport auto-detection
    transport: (process.env['MCP_TRANSPORT'] as any) || 'stdio',
    port: parseInt(process.env['MCP_PORT'] || '8080'),
  };
}

/**
 * Domain-Specific Server Configurations
 * These replace the individual *-alecscore.ts servers
 */
export class PropertyServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-property',
      description: 'Property Manager and Hostname Management',
      dynamicDiscovery: {
        enabled: true,
        includePatterns: ['property', 'hostname', 'rule-tree', 'edge-hostname'],
        customerTier: 'all'
      }
    });
  }
}

export class DNSServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-dns',
      description: 'DNS Zone and Record Management',
      dynamicDiscovery: {
        enabled: true,
        includePatterns: ['dns'],
        customerTier: 'all'
      }
    });
  }
}

export class SecurityServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-security',
      description: 'Security, WAF, and Network Lists',
      dynamicDiscovery: {
        enabled: true,
        includePatterns: ['security', 'siem'],
        customerTier: 'all'
      }
    });
  }
}

export class CertificateServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-certificates',
      description: 'SSL/TLS Certificate Management',
      dynamicDiscovery: {
        enabled: true,
        includePatterns: ['certificate'],
        customerTier: 'all'
      }
    });
  }
}

export class EnterpriseServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-enterprise',
      description: 'Full Enterprise Feature Set',
      dynamicDiscovery: {
        enabled: true,
        includePatterns: [], // All domains
        excludePatterns: [], // No exclusions
        customerTier: 'enterprise'
      }
    });
  }
}

export class BasicServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-basic',
      description: 'Basic Feature Set (No Billing/Contracts)',
      dynamicDiscovery: {
        enabled: true,
        includePatterns: ['property', 'dns', 'security', 'certificate'],
        excludePatterns: ['billing', 'contract'],
        customerTier: 'basic'
      }
    });
  }
}

/**
 * Development Server with Hot Reload
 */
export class DevelopmentServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-dev',
      description: 'Development Server with Hot Reload',
      dynamicDiscovery: {
        enabled: true,
        enableHotReload: true,
        enableCaching: false, // Disable caching in dev
        customerTier: 'all'
      },
      enableMonitoring: true
    });
  }
}

/**
 * Main server factory function for creating specialized ALECS MCP Servers
 * 
 * Creates different server configurations optimized for specific Akamai domains
 * or customer tiers. This replaces the complex server selection logic and provides
 * a clean factory pattern for server instantiation.
 * 
 * @param type - Server type to create. Supported values:
 *   - 'default': Full-featured server with all domains
 *   - 'property': Property Manager and hostname tools only
 *   - 'dns': DNS zone and record management only
 *   - 'security': Security, WAF, and network lists only
 *   - 'certificates'/'certs': SSL/TLS certificate management only
 *   - 'enterprise': Full enterprise feature set
 *   - 'basic': Basic features (excludes billing/contracts)
 *   - 'development'/'dev': Development server with hot reload
 * 
 * @returns Configured ALECSCore server instance
 * 
 * @example
 * ```typescript
 * // Create default server with all features
 * const server = createServer();
 * 
 * // Create domain-specific servers
 * const dnsServer = createServer('dns');
 * const propertyServer = createServer('property');
 * 
 * // Create tier-specific servers
 * const enterpriseServer = createServer('enterprise');
 * const devServer = createServer('development');
 * ```
 * 
 * @see {@link ALECSCore} for server implementation details
 */
export function createServer(type: string = 'default'): ALECSCore {
  switch (type.toLowerCase()) {
    case 'property':
      return new PropertyServer();
    case 'dns':
      return new DNSServer();
    case 'security':
      return new SecurityServer();
    case 'certificates':
    case 'certs':
      return new CertificateServer();
    case 'enterprise':
      return new EnterpriseServer();
    case 'basic':
      return new BasicServer();
    case 'development':
    case 'dev':
      return new DevelopmentServer();
    case 'default':
    default:
      return new ALECSCore(getDefaultServerConfig());
  }
}

/**
 * CLI Support Function
 * Returns dynamic tool count for display
 */
export async function getServerStats(server: ALECSCore) {
  const discoveryResults = await server.getDiscoveryResults();
  
  return {
    totalTools: server.getTotalToolCount(),
    staticTools: discoveryResults.staticTools || 0,
    discoveredTools: discoveryResults.discoveredTools || 0,
    domains: discoveryResults.discovery?.domains || [],
    toolsByDomain: discoveryResults.discovery?.toolsByDomain || {},
    discoveryTime: discoveryResults.discovery?.discoveryTime || 0,
    cached: discoveryResults.discovery?.cached || false,
    errors: discoveryResults.discovery?.errors || []
  };
}

// Export main server class
export default ALECSCore;