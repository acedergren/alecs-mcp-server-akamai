/**
 * Property Cache Preloader Service
 * Pre-populates Valkey cache with property name-to-ID mappings at server startup
 * This dramatically speeds up property lookups by name
 */

import { AkamaiClient } from '../akamai-client';
import { ValkeyCache, CacheTTL } from './valkey-cache-service';
import { logger } from '../utils/logger';

interface PropertyMapping {
  propertyId: string;
  propertyName: string;
  contractId: string;
  groupId: string;
  productId?: string;
  latestVersion?: number;
  productionStatus?: string;
  stagingStatus?: string;
}

interface PreloadStats {
  totalProperties: number;
  totalGroups: number;
  totalContracts: number;
  duration: number;
  errors: number;
}

export class PropertyCachePreloader {
  private cache: ValkeyCache;
  private client: AkamaiClient;
  private isPreloading = false;
  
  // Cache keys
  private readonly PROPERTY_NAME_TO_ID_PREFIX = 'property:name:';
  private readonly PROPERTY_ID_TO_DETAILS_PREFIX = 'property:id:';
  private readonly ALL_PROPERTIES_KEY = 'properties:all';
  private readonly PRELOAD_STATUS_KEY = 'preload:status';
  private readonly PRELOAD_TIMESTAMP_KEY = 'preload:timestamp';
  
  constructor(cache: ValkeyCache, client: AkamaiClient) {
    this.cache = cache;
    this.client = client;
  }
  
  /**
   * Pre-populate cache with all properties
   * This runs at server startup and can be triggered manually
   */
  async preloadProperties(options: {
    force?: boolean;
    maxGroups?: number;
    maxPropertiesPerGroup?: number;
  } = {}): Promise<PreloadStats> {
    const startTime = Date.now();
    const stats: PreloadStats = {
      totalProperties: 0,
      totalGroups: 0,
      totalContracts: 0,
      duration: 0,
      errors: 0,
    };
    
    try {
      // Check if already preloading
      if (this.isPreloading) {
        logger.info('Property cache preload already in progress');
        return stats;
      }
      
      this.isPreloading = true;
      await this.cache.set(this.PRELOAD_STATUS_KEY, 'in_progress', 300); // 5 min TTL
      
      // Check if we need to preload (unless forced)
      if (!options.force) {
        const lastPreload = await this.cache.get(this.PRELOAD_TIMESTAMP_KEY);
        if (lastPreload) {
          const age = Date.now() - parseInt(lastPreload);
          const ONE_HOUR = 60 * 60 * 1000;
          
          if (age < ONE_HOUR) {
            logger.info('Property cache was preloaded recently, skipping', {
              ageMinutes: Math.round(age / 60000),
            });
            this.isPreloading = false;
            return stats;
          }
        }
      }
      
      logger.info('Starting property cache preload...');
      
      // Get all groups
      const groupsResponse = await this.client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });
      
      if (!groupsResponse.groups?.items?.length) {
        logger.warn('No groups found during preload');
        return stats;
      }
      
      const groups = groupsResponse.groups.items;
      const maxGroups = options.maxGroups || groups.length;
      const maxPropertiesPerGroup = options.maxPropertiesPerGroup || 1000;
      const allProperties: PropertyMapping[] = [];
      const contractSet = new Set<string>();
      
      // Process each group
      for (let i = 0; i < Math.min(groups.length, maxGroups); i++) {
        const group = groups[i];
        
        if (!group.contractIds?.length) {
          continue;
        }
        
        stats.totalGroups++;
        
        // Process each contract in the group
        for (const contractId of group.contractIds) {
          contractSet.add(contractId);
          
          try {
            const propertiesResponse = await this.client.request({
              path: '/papi/v1/properties',
              method: 'GET',
              queryParams: {
                contractId,
                groupId: group.groupId,
                limit: maxPropertiesPerGroup,
              },
            });
            
            const properties = propertiesResponse.properties?.items || [];
            
            // Process each property
            for (const property of properties) {
              const mapping: PropertyMapping = {
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                contractId: property.contractId,
                groupId: property.groupId,
                productId: property.productId,
                latestVersion: property.latestVersion,
                productionStatus: property.productionStatus,
                stagingStatus: property.stagingStatus,
              };
              
              allProperties.push(mapping);
              
              // Cache property name to ID mapping
              const nameKey = this.PROPERTY_NAME_TO_ID_PREFIX + property.propertyName.toLowerCase();
              await this.cache.set(nameKey, property.propertyId, CacheTTL.PROPERTY_DETAILS);
              
              // Cache property details
              const detailsKey = this.PROPERTY_ID_TO_DETAILS_PREFIX + property.propertyId;
              await this.cache.set(detailsKey, JSON.stringify(mapping), CacheTTL.PROPERTY_DETAILS);
              
              stats.totalProperties++;
            }
            
            // Log progress
            if (stats.totalProperties % 100 === 0) {
              logger.info('Property cache preload progress', {
                properties: stats.totalProperties,
                groups: stats.totalGroups,
              });
            }
            
          } catch (error) {
            logger.error('Failed to load properties for contract', {
              contractId,
              groupId: group.groupId,
              error: error instanceof Error ? error.message : String(error),
            });
            stats.errors++;
          }
        }
      }
      
      stats.totalContracts = contractSet.size;
      
      // Cache all properties list
      await this.cache.set(
        this.ALL_PROPERTIES_KEY,
        JSON.stringify(allProperties),
        CacheTTL.PROPERTIES_LIST
      );
      
      // Update preload metadata
      await this.cache.set(this.PRELOAD_TIMESTAMP_KEY, Date.now().toString(), 86400); // 24h TTL
      await this.cache.set(this.PRELOAD_STATUS_KEY, 'completed', 3600); // 1h TTL
      
      stats.duration = Date.now() - startTime;
      
      logger.info('Property cache preload completed', {
        ...stats,
        durationSeconds: Math.round(stats.duration / 1000),
      });
      
      return stats;
      
    } catch (error) {
      logger.error('Property cache preload failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      stats.errors++;
      throw error;
    } finally {
      this.isPreloading = false;
      await this.cache.set(this.PRELOAD_STATUS_KEY, 'idle', 3600);
    }
  }
  
  /**
   * Quick lookup of property ID by name
   * Uses cache first, falls back to API if not found
   */
  async getPropertyIdByName(propertyName: string): Promise<string | null> {
    const nameKey = this.PROPERTY_NAME_TO_ID_PREFIX + propertyName.toLowerCase();
    
    // Check cache first
    const cached = await this.cache.get(nameKey);
    if (cached) {
      logger.debug('Property ID found in cache', { propertyName, propertyId: cached });
      return cached;
    }
    
    // Not in cache - this means either:
    // 1. Cache expired
    // 2. Property was created after last preload
    // 3. Property doesn't exist
    
    logger.debug('Property ID not in cache, searching...', { propertyName });
    
    // Do a limited search (1 group, 50 properties)
    try {
      const groupsResponse = await this.client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });
      
      const groups = groupsResponse.groups?.items || [];
      
      for (const group of groups.slice(0, 1)) { // Only check first group
        if (!group.contractIds?.length) {continue;}
        
        const propertiesResponse = await this.client.request({
          path: '/papi/v1/properties',
          method: 'GET',
          queryParams: {
            contractId: group.contractIds[0],
            groupId: group.groupId,
            limit: 50,
          },
        });
        
        const properties = propertiesResponse.properties?.items || [];
        const found = properties.find(
          p => p.propertyName.toLowerCase() === propertyName.toLowerCase()
        );
        
        if (found) {
          // Cache it for next time
          await this.cache.set(nameKey, found.propertyId, CacheTTL.PROPERTY_DETAILS);
          return found.propertyId;
        }
      }
    } catch (error) {
      logger.error('Failed to search for property by name', {
        propertyName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    return null;
  }
  
  /**
   * Get cached property details by ID
   */
  async getPropertyDetails(propertyId: string): Promise<PropertyMapping | null> {
    const detailsKey = this.PROPERTY_ID_TO_DETAILS_PREFIX + propertyId;
    
    const cached = await this.cache.get(detailsKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        logger.error('Failed to parse cached property details', { propertyId, error });
      }
    }
    
    return null;
  }
  
  /**
   * Get all cached properties
   */
  async getAllProperties(): Promise<PropertyMapping[]> {
    const cached = await this.cache.get(this.ALL_PROPERTIES_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        logger.error('Failed to parse cached properties list', { error });
      }
    }
    
    return [];
  }
  
  /**
   * Invalidate property cache entries
   */
  async invalidateProperty(propertyId: string, propertyName?: string): Promise<void> {
    const keys = [this.PROPERTY_ID_TO_DETAILS_PREFIX + propertyId];
    
    if (propertyName) {
      keys.push(this.PROPERTY_NAME_TO_ID_PREFIX + propertyName.toLowerCase());
    }
    
    await Promise.all(keys.map(key => this.cache.del(key)));
    
    // Also invalidate the all properties list
    await this.cache.del(this.ALL_PROPERTIES_KEY);
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    lastPreload: Date | null;
    totalCachedProperties: number;
    cacheStatus: string;
  }> {
    const timestamp = await this.cache.get(this.PRELOAD_TIMESTAMP_KEY);
    const status = await this.cache.get(this.PRELOAD_STATUS_KEY) || 'unknown';
    const allProps = await this.getAllProperties();
    
    return {
      lastPreload: timestamp ? new Date(parseInt(timestamp)) : null,
      totalCachedProperties: allProps.length,
      cacheStatus: status,
    };
  }
}

/**
 * Factory function to create and initialize the preloader
 */
export async function createPropertyPreloader(
  cache: ValkeyCache,
  client: AkamaiClient,
  autoPreload = true
): Promise<PropertyCachePreloader> {
  const preloader = new PropertyCachePreloader(cache, client);
  
  if (autoPreload) {
    // Start preload in background (don't await)
    preloader.preloadProperties().catch(error => {
      logger.error('Background property preload failed', { error });
    });
  }
  
  return preloader;
}