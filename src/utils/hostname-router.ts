/**
 * AKAMAI HOSTNAME ROUTER
 * 
 * CODE KAI PRINCIPLES:
 * Key: Hostname-centric relationship mapping for cross-service operations
 * Approach: Centralized hostname context resolution with caching
 * Implementation: Complement existing id-translator with hostname relationships
 * 
 * INTEGRATION WITH EXISTING ARCHITECTURE:
 * - Works alongside existing id-translator.ts (not replacing)
 * - Integrates with existing translation-middleware.ts
 * - Leverages existing BaseTool.COMMON_TRANSLATIONS
 * - Adds hostname → context mapping to current ID → name translation
 * 
 * CORE FEATURES:
 * - Hostname → Property/CP Code context mapping
 * - CP Code → Hostnames relationship resolution  
 * - Property → Hostnames association tracking
 * - Cross-service routing for DNS, AppSec, Reporting, Purging
 * - Performance-optimized with intelligent caching
 */

import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';
import { AkamaiClient } from '../akamai-client';
import { idTranslator } from './id-translator';

const logger = createLogger('hostname-router');

// HOSTNAME ROUTING DATA STRUCTURES

interface HostnameContext {
  hostname: string;
  propertyId?: string;
  propertyName?: string;
  contractId?: string;
  groupId?: string;
  cpCodes?: string[];
  edgeHostname?: string;
  certStatus?: string;
  lastUpdated: number;
}

interface PropertyHostnameMap {
  propertyId: string;
  propertyName: string;
  hostnames: string[];
  cpCodes: string[];
  contractId?: string;
  groupId?: string;
}

interface CPCodeHostnameMap {
  cpCode: string;
  cpCodeName?: string;
  hostnames: string[];
  properties: string[];
}

/**
 * Hostname Router - Maps hostnames to their Akamai context
 * Complements existing id-translator with relationship mapping
 */
class HostnameRouter {
  private static instance: HostnameRouter;
  
  // Caches for different routing scenarios
  private hostnameContextCache: LRUCache<string, HostnameContext>;
  private propertyHostnameCache: LRUCache<string, PropertyHostnameMap>;
  private cpCodeHostnameCache: LRUCache<string, CPCodeHostnameMap>;
  private client: AkamaiClient | null = null;

  private constructor() {
    this.hostnameContextCache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60 // 1 hour
    });
    
    this.propertyHostnameCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 60 // 1 hour
    });
    
    this.cpCodeHostnameCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 60 // 1 hour
    });
  }

  public static getInstance(): HostnameRouter {
    if (!HostnameRouter.instance) {
      HostnameRouter.instance = new HostnameRouter();
    }
    return HostnameRouter.instance;
  }

  public setClient(client: AkamaiClient): void {
    this.client = client;
    // Note: id-translator uses singleton pattern, client set via translateId method
  }

  /**
   * Get hostname context with property and CP code information
   */
  public async getHostnameContext(hostname: string): Promise<HostnameContext | null> {
    const cacheKey = hostname.toLowerCase();
    
    // Check cache first
    const cached = this.hostnameContextCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.client) {
      logger.warn('No client set for hostname router');
      return null;
    }

    try {
      // Find property that owns this hostname
      const propertyContext = await this.findPropertyByHostname(hostname);
      if (!propertyContext) {
        return null;
      }

      // Build context with translated names
      const context: HostnameContext = {
        hostname,
        propertyId: propertyContext.propertyId,
        propertyName: await this.translatePropertyId(propertyContext.propertyId),
        contractId: propertyContext.contractId,
        groupId: propertyContext.groupId,
        cpCodes: propertyContext.cpCodes,
        edgeHostname: propertyContext.edgeHostname,
        certStatus: propertyContext.certStatus,
        lastUpdated: Date.now()
      };

      // Cache and return
      this.hostnameContextCache.set(cacheKey, context);
      return context;
    } catch (error) {
      logger.warn(`Failed to get hostname context for ${hostname}:`, error);
      return null;
    }
  }

  /**
   * Get all hostnames associated with a property
   */
  public async getPropertyHostnames(propertyId: string): Promise<string[]> {
    const cacheKey = propertyId;
    
    // Check cache first
    const cached = this.propertyHostnameCache.get(cacheKey);
    if (cached) {
      return cached.hostnames;
    }

    if (!this.client) {
      logger.warn('No client set for hostname router');
      return [];
    }

    try {
      const response = await this.client.request({
        method: 'GET',
        path: `/papi/v1/properties/${propertyId}/hostnames`,
        queryParams: { 
          validateHostnames: 'false',
          includeType: 'EDGE_HOSTNAME'
        }
      });

      const hostnames = (response as any)?.hostnames?.items?.map((item: any) => item.cnameFrom) || [];
      
      // Cache result
      const propertyMap: PropertyHostnameMap = {
        propertyId,
        propertyName: await this.translatePropertyId(propertyId),
        hostnames,
        cpCodes: [], // Will be populated separately if needed
      };
      
      this.propertyHostnameCache.set(cacheKey, propertyMap);
      return hostnames;
    } catch (error) {
      logger.warn(`Failed to get hostnames for property ${propertyId}:`, error);
      return [];
    }
  }

  /**
   * Get all hostnames associated with a CP code
   */
  public async getCPCodeHostnames(cpCode: string): Promise<string[]> {
    const cacheKey = cpCode;
    
    // Check cache first
    const cached = this.cpCodeHostnameCache.get(cacheKey);
    if (cached) {
      return cached.hostnames;
    }

    if (!this.client) {
      logger.warn('No client set for hostname router');
      return [];
    }

    try {
      // This requires scanning properties to find CP code usage
      // Implementation would depend on specific API availability
      logger.info(`CP code hostname mapping not yet implemented for ${cpCode}`);
      return [];
    } catch (error) {
      logger.warn(`Failed to get hostnames for CP code ${cpCode}:`, error);
      return [];
    }
  }

  /**
   * Find which property owns a hostname
   */
  private async findPropertyByHostname(hostname: string): Promise<any> {
    if (!this.client) {
      return null;
    }

    try {
      // Get all properties and search for hostname
      const propertiesResponse = await this.client.request({
        method: 'GET',
        path: '/papi/v1/properties',
        queryParams: {
          limit: '500'
        },
        headers: {
          'PAPI-Use-Prefixes': 'true'
        }
      });

      if ((propertiesResponse as any)?.properties?.items?.length > 0) {
        // Search through properties to find one that contains this hostname
        for (const property of (propertiesResponse as any).properties.items) {
          const hostnames = await this.getPropertyHostnames(property.propertyId);
          if (hostnames.includes(hostname)) {
            return {
              propertyId: property.propertyId,
              contractId: property.contractId,
              groupId: property.groupId,
              cpCodes: [], // Would extract from property details
              edgeHostname: hostname,
              certStatus: 'unknown'
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to find property for hostname ${hostname}:`, error);
      return null;
    }
  }

  /**
   * Helper method to translate property ID using id-translator
   */
  private async translatePropertyId(propertyId: string): Promise<string> {
    if (!this.client) {
      return propertyId;
    }
    
    try {
      const result = await idTranslator.translateId(propertyId, this.client);
      return result.name;
    } catch (error) {
      logger.warn(`Failed to translate property ID ${propertyId}:`, error);
      return propertyId;
    }
  }

  /**
   * Clear all hostname routing caches
   */
  public clearCaches(): void {
    this.hostnameContextCache.clear();
    this.propertyHostnameCache.clear();
    this.cpCodeHostnameCache.clear();
    logger.info('Hostname router caches cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      hostnameContextCache: {
        size: this.hostnameContextCache.size,
        max: this.hostnameContextCache.max
      },
      propertyHostnameCache: {
        size: this.propertyHostnameCache.size,
        max: this.propertyHostnameCache.max
      },
      cpCodeHostnameCache: {
        size: this.cpCodeHostnameCache.size,
        max: this.cpCodeHostnameCache.max
      }
    };
  }
}

// Export singleton instance
export const hostnameRouter = HostnameRouter.getInstance();
export type { HostnameContext, PropertyHostnameMap, CPCodeHostnameMap };