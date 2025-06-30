/**
 * AKAMAI HOSTNAME ROUTER
 * 
 * CODE KAI PRINCIPLES:
 * Key: Hostname is the base unit - understand relationships between hostnames, properties, and CP codes
 * Approach: Centralized hostname-based routing and relationship mapping
 * Implementation: LRU cache system with hostname as the primary routing key
 * 
 * CORE FEATURES:
 * - Hostname → Property/CP Code context mapping
 * - CP Code → Hostnames relationship resolution  
 * - Property → Hostnames association tracking
 * - Cross-service routing for DNS, AppSec, Reporting, Purging
 * - Performance-optimized with intelligent caching
 * - Thread-safe singleton pattern
 */

import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';
import { AkamaiClient } from '../akamai-client';

const logger = createLogger('hostname-router');

// HOSTNAME ROUTING DATA STRUCTURES

interface AkamaiAPIResponse {
  [key: string]: any;
}

interface PropertiesAPIResponse extends AkamaiAPIResponse {
  properties?: {
    items?: Array<{
      propertyId: string;
      propertyName: string;
      latestVersion: number;
      contractId?: string;
      groupId?: string;
      assetId?: string;
    }>;
  };
}

interface HostnamesAPIResponse extends AkamaiAPIResponse {
  hostnames?: {
    items?: Array<{
      cnameFrom: string;
      cnameTo: string;
      certStatus?: string;
      cnameTo_hostname?: string;
    }>;
  };
}

interface RulesAPIResponse extends AkamaiAPIResponse {
  rules?: {
    name?: string;
    behaviors?: Array<{
      name: string;
      options?: {
        value?: { id?: number | string };
        id?: number | string;
      };
    }>;
    children?: any[];
  };
}

interface CPCodesAPIResponse extends AkamaiAPIResponse {
  cpcodes?: {
    items?: Array<{
      cpcodeId: string;
      cpcodeName: string;
      contractIds?: string[];
      groupIds?: string[];
    }>;
  };
}

export interface HostnameContext {
  hostname: string;
  propertyId: string;
  propertyName: string;
  cpcodeId?: string;
  cpcodeName?: string;
  contractId?: string;
  groupId?: string;
  edgeHostname: string;
  network: 'STAGING' | 'PRODUCTION' | 'BOTH';
  isPrimary: boolean;
  lastUpdated: string;
}

export interface PropertyContext {
  propertyId: string;
  propertyName: string;
  contractId?: string;
  groupId?: string;
  assetId?: string;
  hostnames?: string[];
  cpcodeIds?: string[];
}

export interface CPCodeContext {
  cpcodeId: string;
  cpcodeName: string;
  hostnames: string[];
  primaryHostname?: string;
  propertyIds: string[];
  contractId?: string;
  groupId?: string;
}

export interface HostnameRoute {
  hostname: string;
  propertyContext: PropertyContext;
  cpcodeContext?: CPCodeContext;
  relatedHostnames: string[];
}

export class AkamaiHostnameRouter {
  private static instance: AkamaiHostnameRouter;
  
  // HOSTNAME-CENTRIC ROUTING CACHE ARCHITECTURE
  private hostnameContextCache: LRUCache<string, HostnameContext>;
  private propertyContextCache: LRUCache<string, PropertyContext>;
  private cpcodeContextCache: LRUCache<string, CPCodeContext>;
  
  // ROUTING LOOKUP CACHES - Fast cross-service routing
  private hostnameToPropertyCache: LRUCache<string, string>;
  private hostnameToZoneCache: LRUCache<string, string>;
  private cpcodeToHostnamesCache: LRUCache<string, string[]>;
  private propertyToHostnamesCache: LRUCache<string, string[]>;
  
  private pendingRequests: Map<string, Promise<any>>;
  
  private constructor() {
    const cacheOptions = {
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    };
    
    this.hostnameContextCache = new LRUCache<string, HostnameContext>(cacheOptions);
    this.propertyContextCache = new LRUCache<string, PropertyContext>(cacheOptions);
    this.cpcodeContextCache = new LRUCache<string, CPCodeContext>(cacheOptions);
    
    this.hostnameToPropertyCache = new LRUCache<string, string>(cacheOptions);
    this.hostnameToZoneCache = new LRUCache<string, string>(cacheOptions);
    this.cpcodeToHostnamesCache = new LRUCache<string, string[]>(cacheOptions);
    this.propertyToHostnamesCache = new LRUCache<string, string[]>(cacheOptions);
    
    this.pendingRequests = new Map();
    
    logger.info('Akamai Hostname Router initialized for cross-service routing');
  }
  
  static getInstance(): AkamaiHostnameRouter {
    if (!AkamaiHostnameRouter.instance) {
      AkamaiHostnameRouter.instance = new AkamaiHostnameRouter();
    }
    return AkamaiHostnameRouter.instance;
  }
  
  /**
   * Get complete routing context for a hostname
   */
  async getHostnameRoute(hostname: string, client: AkamaiClient): Promise<HostnameRoute | null> {
    const context = await this.getHostnameContext(hostname, client);
    if (!context) {
      return null;
    }

    const propertyContext = await this.getPropertyContext(context.propertyId, client);
    const cpcodeContext = context.cpcodeId ? 
      await this.getCPCodeContext(context.cpcodeId, client) || undefined : undefined;

    const relatedHostnames = propertyContext?.hostnames || [];

    return {
      hostname,
      propertyContext: propertyContext!,
      cpcodeContext,
      relatedHostnames,
    };
  }

  /**
   * Get full context for a hostname
   */
  async getHostnameContext(hostname: string, client: AkamaiClient): Promise<HostnameContext | null> {
    const cached = this.hostnameContextCache.get(hostname);
    if (cached) {
      return cached;
    }

    const pending = this.pendingRequests.get(`hostname:${hostname}`);
    if (pending) {
      return await pending;
    }

    const fetchPromise = this.fetchHostnameContext(hostname, client);
    this.pendingRequests.set(`hostname:${hostname}`, fetchPromise);

    try {
      const context = await fetchPromise;
      if (context) {
        this.hostnameContextCache.set(hostname, context);
        this.hostnameToPropertyCache.set(hostname, context.propertyId);
        return context;
      }
    } finally {
      this.pendingRequests.delete(`hostname:${hostname}`);
    }

    return null;
  }

  /**
   * Get hostnames for a CP Code (critical for Reporting, Purging)
   */
  async getHostnamesForCPCode(cpcodeId: string, client: AkamaiClient): Promise<string[]> {
    const cached = this.cpcodeToHostnamesCache.get(cpcodeId);
    if (cached) {
      return cached;
    }

    const context = await this.getCPCodeContext(cpcodeId, client);
    return context?.hostnames || [];
  }

  /**
   * Get hostnames for a Property (critical for DNS, AppSec)
   */
  async getHostnamesForProperty(propertyId: string, client: AkamaiClient): Promise<string[]> {
    const cached = this.propertyToHostnamesCache.get(propertyId);
    if (cached) {
      return cached;
    }

    const context = await this.getPropertyContext(propertyId, client);
    return context?.hostnames || [];
  }

  /**
   * Get property ID for a hostname
   */
  async getPropertyForHostname(hostname: string, client: AkamaiClient): Promise<string | null> {
    const cached = this.hostnameToPropertyCache.get(hostname);
    if (cached) {
      return cached;
    }

    const context = await this.getHostnameContext(hostname, client);
    return context?.propertyId || null;
  }

  /**
   * Get CP Code for a hostname
   */
  async getCPCodeForHostname(hostname: string, client: AkamaiClient): Promise<string | null> {
    const context = await this.getHostnameContext(hostname, client);
    return context?.cpcodeId || null;
  }

  /**
   * Get property context with hostnames
   */
  async getPropertyContext(propertyId: string, client: AkamaiClient): Promise<PropertyContext | null> {
    const cached = this.propertyContextCache.get(propertyId);
    if (cached) {
      return cached;
    }

    const pending = this.pendingRequests.get(`property:${propertyId}`);
    if (pending) {
      return await pending;
    }

    const fetchPromise = this.fetchPropertyContext(propertyId, client);
    this.pendingRequests.set(`property:${propertyId}`, fetchPromise);

    try {
      const context = await fetchPromise;
      if (context) {
        this.propertyContextCache.set(propertyId, context);
        if (context.hostnames) {
          this.propertyToHostnamesCache.set(propertyId, context.hostnames);
        }
        return context;
      }
    } finally {
      this.pendingRequests.delete(`property:${propertyId}`);
    }

    return null;
  }

  /**
   * Get CP Code context with hostname mappings
   */
  async getCPCodeContext(cpcodeId: string, client: AkamaiClient): Promise<CPCodeContext | null> {
    const cached = this.cpcodeContextCache.get(cpcodeId);
    if (cached) {
      return cached;
    }

    const pending = this.pendingRequests.get(`cpcode:${cpcodeId}`);
    if (pending) {
      return await pending;
    }

    const fetchPromise = this.fetchCPCodeContext(cpcodeId, client);
    this.pendingRequests.set(`cpcode:${cpcodeId}`, fetchPromise);

    try {
      const context = await fetchPromise;
      if (context) {
        this.cpcodeContextCache.set(cpcodeId, context);
        this.cpcodeToHostnamesCache.set(cpcodeId, context.hostnames);
        return context;
      }
    } finally {
      this.pendingRequests.delete(`cpcode:${cpcodeId}`);
    }

    return null;
  }

  // PRIVATE FETCH METHODS

  private async fetchHostnameContext(hostname: string, client: AkamaiClient): Promise<HostnameContext | null> {
    try {
      // Find property that contains this hostname
      const propertiesResponse = await client.request({ path: '/papi/v1/properties' }) as PropertiesAPIResponse;
      const properties = propertiesResponse.properties?.items || [];

      for (const property of properties) {
        try {
          const hostnamesResponse = await client.request({
            path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`
          }) as HostnamesAPIResponse;
          
          const hostnames = hostnamesResponse.hostnames?.items || [];
          
          for (const hostnameEntry of hostnames) {
            if (hostnameEntry.cnameFrom === hostname) {
              // Found the property! Now get CP Code from rules
              const cpcodeId = await this.extractCPCodeFromProperty(
                property.propertyId, 
                property.latestVersion, 
                client
              );

              return {
                hostname,
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                cpcodeId,
                cpcodeName: cpcodeId ? await this.getCPCodeName(cpcodeId, client) : undefined,
                contractId: property.contractId,
                groupId: property.groupId,
                edgeHostname: hostnameEntry.cnameTo,
                network: 'BOTH', // TODO: Determine actual network
                isPrimary: true, // TODO: Determine if primary
                lastUpdated: new Date().toISOString(),
              };
            }
          }
        } catch (error) {
          logger.debug(`Error checking property ${property.propertyId} for hostname ${hostname}:`, error);
          continue;
        }
      }
    } catch (error) {
      logger.error(`Error fetching hostname context for ${hostname}:`, error);
    }

    return null;
  }

  private async fetchPropertyContext(propertyId: string, client: AkamaiClient): Promise<PropertyContext | null> {
    try {
      const propertiesResponse = await client.request({ path: '/papi/v1/properties' }) as PropertiesAPIResponse;
      const properties = propertiesResponse.properties?.items || [];
      
      const property = properties.find(p => p.propertyId === propertyId);
      if (!property) {
        return null;
      }

      // Get hostnames for this property
      const hostnamesResponse = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${property.latestVersion}/hostnames`
      }) as HostnamesAPIResponse;
      
      const hostnames = hostnamesResponse.hostnames?.items?.map(h => h.cnameFrom) || [];

      // Get CP Codes from rules
      const cpcodeIds = await this.extractCPCodesFromProperty(propertyId, property.latestVersion, client);

      return {
        propertyId,
        propertyName: property.propertyName,
        contractId: property.contractId,
        groupId: property.groupId,
        assetId: property.assetId,
        hostnames,
        cpcodeIds,
      };
    } catch (error) {
      logger.error(`Error fetching property context for ${propertyId}:`, error);
      return null;
    }
  }

  private async fetchCPCodeContext(cpcodeId: string, client: AkamaiClient): Promise<CPCodeContext | null> {
    try {
      // Get CP Code details
      const cpcodesResponse = await client.request({ path: '/papi/v1/cpcodes' }) as CPCodesAPIResponse;
      const cpcodes = cpcodesResponse.cpcodes?.items || [];
      
      const cpcode = cpcodes.find(c => c.cpcodeId === cpcodeId);
      if (!cpcode) {
        return null;
      }

      // Find all properties using this CP Code
      const propertyIds: string[] = [];
      const hostnames: string[] = [];

      const propertiesResponse = await client.request({ path: '/papi/v1/properties' }) as PropertiesAPIResponse;
      const properties = propertiesResponse.properties?.items || [];

      for (const property of properties) {
        const propertyCPCodes = await this.extractCPCodesFromProperty(
          property.propertyId, 
          property.latestVersion, 
          client
        );
        
        if (propertyCPCodes.includes(cpcodeId)) {
          propertyIds.push(property.propertyId);
          
          // Get hostnames for this property
          const hostnamesResponse = await client.request({
            path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`
          }) as HostnamesAPIResponse;
          
          const propertyHostnames = hostnamesResponse.hostnames?.items?.map(h => h.cnameFrom) || [];
          hostnames.push(...propertyHostnames);
        }
      }

      return {
        cpcodeId,
        cpcodeName: cpcode.cpcodeName,
        hostnames: [...new Set(hostnames)], // Remove duplicates
        primaryHostname: hostnames[0], // First hostname as primary
        propertyIds,
        contractId: cpcode.contractIds?.[0],
        groupId: cpcode.groupIds?.[0],
      };
    } catch (error) {
      logger.error(`Error fetching CP Code context for ${cpcodeId}:`, error);
      return null;
    }
  }

  private async extractCPCodeFromProperty(propertyId: string, version: number, client: AkamaiClient): Promise<string | undefined> {
    try {
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`
      }) as RulesAPIResponse;

      return this.extractCPCodeFromRules(rulesResponse.rules);
    } catch (error) {
      logger.debug(`Error extracting CP Code from property ${propertyId}:`, error);
      return undefined;
    }
  }

  private async extractCPCodesFromProperty(propertyId: string, version: number, client: AkamaiClient): Promise<string[]> {
    try {
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`
      }) as RulesAPIResponse;

      return this.extractAllCPCodesFromRules(rulesResponse.rules);
    } catch (error) {
      logger.debug(`Error extracting CP Codes from property ${propertyId}:`, error);
      return [];
    }
  }

  private extractCPCodeFromRules(rules: any): string | undefined {
    if (!rules) return undefined;

    const searchRules = (rule: any): string | undefined => {
      if (rule.behaviors) {
        for (const behavior of rule.behaviors) {
          if (behavior.name === 'cpCode' && behavior.options?.value?.id) {
            const cpCodeId = behavior.options.value.id.toString();
            return cpCodeId.startsWith('cpc_') ? cpCodeId : `cpc_${cpCodeId}`;
          }
        }
      }

      if (rule.children) {
        for (const child of rule.children) {
          const result = searchRules(child);
          if (result) return result;
        }
      }

      return undefined;
    };

    return searchRules(rules);
  }

  private extractAllCPCodesFromRules(rules: any): string[] {
    const cpcodes: string[] = [];
    
    if (!rules) return cpcodes;

    const searchRules = (rule: any): void => {
      if (rule.behaviors) {
        for (const behavior of rule.behaviors) {
          if (behavior.name === 'cpCode' && behavior.options?.value?.id) {
            const cpCodeId = behavior.options.value.id.toString();
            const formattedId = cpCodeId.startsWith('cpc_') ? cpCodeId : `cpc_${cpCodeId}`;
            if (!cpcodes.includes(formattedId)) {
              cpcodes.push(formattedId);
            }
          }
        }
      }

      if (rule.children) {
        for (const child of rule.children) {
          searchRules(child);
        }
      }
    };

    searchRules(rules);
    return cpcodes;
  }

  private async getCPCodeName(cpcodeId: string, client: AkamaiClient): Promise<string | undefined> {
    try {
      const cpcodesResponse = await client.request({ path: '/papi/v1/cpcodes' }) as CPCodesAPIResponse;
      const cpcodes = cpcodesResponse.cpcodes?.items || [];
      
      const cpcode = cpcodes.find(c => c.cpcodeId === cpcodeId);
      return cpcode?.cpcodeName;
    } catch (error) {
      logger.debug(`Error getting CP Code name for ${cpcodeId}:`, error);
      return undefined;
    }
  }

  // CACHE MANAGEMENT

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.hostnameContextCache.clear();
    this.propertyContextCache.clear();
    this.cpcodeContextCache.clear();
    this.hostnameToPropertyCache.clear();
    this.hostnameToZoneCache.clear();
    this.cpcodeToHostnamesCache.clear();
    this.propertyToHostnamesCache.clear();
    
    logger.info('All hostname router caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      hostnameContext: this.hostnameContextCache.size,
      propertyContext: this.propertyContextCache.size,
      cpcodeContext: this.cpcodeContextCache.size,
      hostnameToProperty: this.hostnameToPropertyCache.size,
      cpcodeToHostnames: this.cpcodeToHostnamesCache.size,
      propertyToHostnames: this.propertyToHostnamesCache.size,
    };
  }
}