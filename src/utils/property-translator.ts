/**
 * AKAMAI ID TRANSLATOR - Human-Readable Names for IDs
 * 
 * CODE KAI PRINCIPLES:
 * Key: Translate cryptic Akamai IDs (property, group, contract) to human-readable names
 * Approach: Multi-cache system for properties, groups, and contracts
 * Implementation: LRU caches, automatic lookup, graceful fallback handling
 * 
 * FEATURES:
 * - Property ID to name translation (prp_123 → "My Site (prp_123)")
 * - Group ID to name translation (grp_456 → "Production Group (grp_456)")
 * - Contract ID to name translation (ctr_789 → "Main Contract (ctr_789)")
 * - LRU cache for performance (avoid repeated API calls)
 * - Batch translation support with rate limiting
 * - Graceful fallback when names unavailable
 * - Thread-safe singleton pattern
 */

import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';
import { AkamaiClient } from '../akamai-client';

const logger = createLogger('property-translator');

interface PropertyInfo {
  propertyId: string;
  propertyName: string;
  contractId?: string;
  groupId?: string;
  assetId?: string;
}

interface GroupInfo {
  groupId: string;
  groupName: string;
  contractIds?: string[];
  parentGroupId?: string;
}

interface ContractInfo {
  contractId: string;
  contractTypeName: string;
}

interface TranslationResult {
  id: string;
  name: string;
  displayName: string; // "Name (id_123456)"
}

type AkamaiIdType = 'property' | 'group' | 'contract';

export class AkamaiIdTranslator {
  private static instance: AkamaiIdTranslator;
  private propertyCache: LRUCache<string, PropertyInfo>;
  private groupCache: LRUCache<string, GroupInfo>;
  private contractCache: LRUCache<string, ContractInfo>;
  private pendingRequests: Map<string, Promise<PropertyInfo | GroupInfo | ContractInfo | null>>;
  
  private constructor() {
    const cacheOptions = {
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    };
    
    this.propertyCache = new LRUCache<string, PropertyInfo>(cacheOptions);
    this.groupCache = new LRUCache<string, GroupInfo>(cacheOptions);
    this.contractCache = new LRUCache<string, ContractInfo>(cacheOptions);
    this.pendingRequests = new Map();
    
    logger.info('AkamaiIdTranslator initialized with multi-cache system');
  }
  
  static getInstance(): AkamaiIdTranslator {
    if (!AkamaiIdTranslator.instance) {
      AkamaiIdTranslator.instance = new AkamaiIdTranslator();
    }
    return AkamaiIdTranslator.instance;
  }
  
  /**
   * Universal translator for Akamai IDs
   */
  async translateId(
    id: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    const idType = this.detectIdType(id);
    
    switch (idType) {
      case 'property':
        return this.translateProperty(id, client);
      case 'group':
        return this.translateGroup(id, client);
      case 'contract':
        return this.translateContract(id, client);
      default:
        return this.fallbackResult(id, 'property');
    }
  }
  
  /**
   * Translate a single property ID to its name
   */
  async translateProperty(
    propertyId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    // Check cache first
    const cached = this.propertyCache.get(propertyId);
    if (cached) {
      logger.debug({ propertyId }, 'Property found in cache');
      return this.formatPropertyResult(cached);
    }
    
    // Check if we're already fetching this property
    const pending = this.pendingRequests.get(propertyId);
    if (pending) {
      logger.debug({ propertyId }, 'Waiting for pending request');
      const info = await pending;
      return info && 'propertyName' in info ? this.formatPropertyResult(info as PropertyInfo) : this.fallbackResult(propertyId, 'property');
    }
    
    // Fetch property info
    const fetchPromise = this.fetchPropertyInfo(propertyId, client);
    this.pendingRequests.set(propertyId, fetchPromise);
    
    try {
      const info = await fetchPromise;
      if (info) {
        return this.formatPropertyResult(info as PropertyInfo);
      }
    } finally {
      this.pendingRequests.delete(propertyId);
    }
    
    return this.fallbackResult(propertyId, 'property');
  }
  
  /**
   * Translate a single group ID to its name
   */
  async translateGroup(
    groupId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    // Check cache first
    const cached = this.groupCache.get(groupId);
    if (cached) {
      logger.debug({ groupId }, 'Group found in cache');
      return this.formatGroupResult(cached);
    }
    
    // Check if we're already fetching this group
    const pending = this.pendingRequests.get(groupId);
    if (pending) {
      logger.debug({ groupId }, 'Waiting for pending request');
      const info = await pending;
      return info && 'groupName' in info ? this.formatGroupResult(info as GroupInfo) : this.fallbackResult(groupId, 'group');
    }
    
    // Fetch group info
    const fetchPromise = this.fetchGroupInfo(groupId, client);
    this.pendingRequests.set(groupId, fetchPromise);
    
    try {
      const info = await fetchPromise;
      if (info) {
        return this.formatGroupResult(info as GroupInfo);
      }
    } finally {
      this.pendingRequests.delete(groupId);
    }
    
    return this.fallbackResult(groupId, 'group');
  }
  
  /**
   * Translate a single contract ID to its name
   */
  async translateContract(
    contractId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    // Check cache first
    const cached = this.contractCache.get(contractId);
    if (cached) {
      logger.debug({ contractId }, 'Contract found in cache');
      return this.formatContractResult(cached);
    }
    
    // Check if we're already fetching this contract
    const pending = this.pendingRequests.get(contractId);
    if (pending) {
      logger.debug({ contractId }, 'Waiting for pending request');
      const info = await pending;
      return info && 'contractTypeName' in info ? this.formatContractResult(info as ContractInfo) : this.fallbackResult(contractId, 'contract');
    }
    
    // Fetch contract info
    const fetchPromise = this.fetchContractInfo(contractId, client);
    this.pendingRequests.set(contractId, fetchPromise);
    
    try {
      const info = await fetchPromise;
      if (info) {
        return this.formatContractResult(info as ContractInfo);
      }
    } finally {
      this.pendingRequests.delete(contractId);
    }
    
    return this.fallbackResult(contractId, 'contract');
  }
  
  /**
   * Detect the type of Akamai ID
   */
  private detectIdType(id: string): AkamaiIdType {
    if (id.startsWith('prp_')) return 'property';
    if (id.startsWith('grp_')) return 'group';
    if (id.startsWith('ctr_')) return 'contract';
    return 'property'; // Default fallback
  }
  
  /**
   * Translate multiple property IDs in batch
   */
  async translateProperties(
    propertyIds: string[],
    client: AkamaiClient
  ): Promise<Map<string, TranslationResult>> {
    const results = new Map<string, TranslationResult>();
    
    // Check cache for all properties first
    const toFetch: string[] = [];
    
    for (const propertyId of propertyIds) {
      const cached = this.propertyCache.get(propertyId);
      if (cached) {
        results.set(propertyId, this.formatPropertyResult(cached));
      } else {
        toFetch.push(propertyId);
      }
    }
    
    logger.info({ 
      total: propertyIds.length, 
      cached: results.size, 
      toFetch: toFetch.length 
    }, 'Batch translation status');
    
    // Fetch missing properties (with rate limiting)
    for (const propertyId of toFetch) {
      try {
        // Small delay to avoid rate limiting
        if (toFetch.indexOf(propertyId) > 0) {
          await this.delay(200); // 200ms between requests
        }
        
        const result = await this.translateProperty(propertyId, client);
        results.set(propertyId, result);
      } catch (error) {
        logger.warn({ propertyId, error }, 'Failed to translate property');
        results.set(propertyId, this.fallbackResult(propertyId, 'property'));
      }
    }
    
    return results;
  }
  
  /**
   * Enrich an object containing Akamai IDs with names
   */
  async enrichWithAkamaiIds<T extends Record<string, any>>(
    data: T,
    client: AkamaiClient,
    options: {
      propertyIdFields?: string[];
      groupIdFields?: string[];
      contractIdFields?: string[];
    } = {}
  ): Promise<T> {
    const enriched = { ...data } as any;
    const { propertyIdFields = ['propertyId'], groupIdFields = ['groupId'], contractIdFields = ['contractId'] } = options;
    
    // Enrich property IDs
    for (const field of propertyIdFields) {
      if (enriched[field] && typeof enriched[field] === 'string') {
        const propertyId = enriched[field];
        try {
          const translation = await this.translateProperty(propertyId, client);
          enriched[`${field}_name`] = translation.name;
          enriched[`${field}_display`] = translation.displayName;
        } catch (error) {
          logger.warn({ propertyId, field, error }, 'Failed to enrich property');
        }
      }
    }
    
    // Enrich group IDs
    for (const field of groupIdFields) {
      if (enriched[field] && typeof enriched[field] === 'string') {
        const groupId = enriched[field];
        try {
          const translation = await this.translateGroup(groupId, client);
          enriched[`${field}_name`] = translation.name;
          enriched[`${field}_display`] = translation.displayName;
        } catch (error) {
          logger.warn({ groupId, field, error }, 'Failed to enrich group');
        }
      }
    }
    
    // Enrich contract IDs
    for (const field of contractIdFields) {
      if (enriched[field] && typeof enriched[field] === 'string') {
        const contractId = enriched[field];
        try {
          const translation = await this.translateContract(contractId, client);
          enriched[`${field}_name`] = translation.name;
          enriched[`${field}_display`] = translation.displayName;
        } catch (error) {
          logger.warn({ contractId, field, error }, 'Failed to enrich contract');
        }
      }
    }
    
    return enriched as T;
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async enrichWithPropertyNames<T extends Record<string, any>>(
    data: T,
    client: AkamaiClient,
    propertyIdFields: string[] = ['propertyId']
  ): Promise<T> {
    return this.enrichWithAkamaiIds(data, client, { propertyIdFields });
  }
  
  /**
   * Pre-populate caches from lists of Akamai resources
   */
  populatePropertyCache(properties: PropertyInfo[]): void {
    let added = 0;
    for (const property of properties) {
      if (property.propertyId && property.propertyName) {
        this.propertyCache.set(property.propertyId, property);
        added++;
      }
    }
    
    logger.info({ added, total: properties.length }, 'Populated property cache');
  }
  
  populateGroupCache(groups: GroupInfo[]): void {
    let added = 0;
    for (const group of groups) {
      if (group.groupId && group.groupName) {
        this.groupCache.set(group.groupId, group);
        added++;
      }
    }
    
    logger.info({ added, total: groups.length }, 'Populated group cache');
  }
  
  populateContractCache(contracts: ContractInfo[]): void {
    let added = 0;
    for (const contract of contracts) {
      if (contract.contractId && contract.contractTypeName) {
        this.contractCache.set(contract.contractId, contract);
        added++;
      }
    }
    
    logger.info({ added, total: contracts.length }, 'Populated contract cache');
  }
  
  /**
   * Legacy method for backward compatibility
   */
  populateCache(properties: PropertyInfo[]): void {
    this.populatePropertyCache(properties);
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.propertyCache.clear();
    this.groupCache.clear();
    this.contractCache.clear();
    logger.info('All caches cleared');
  }
  
  clearPropertyCache(): void {
    this.propertyCache.clear();
    logger.info('Property cache cleared');
  }
  
  clearGroupCache(): void {
    this.groupCache.clear();
    logger.info('Group cache cleared');
  }
  
  clearContractCache(): void {
    this.contractCache.clear();
    logger.info('Contract cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    properties: { size: number; maxSize: number };
    groups: { size: number; maxSize: number };
    contracts: { size: number; maxSize: number };
    total: { size: number; maxSize: number };
  } {
    const properties = {
      size: this.propertyCache.size,
      maxSize: this.propertyCache.max
    };
    
    const groups = {
      size: this.groupCache.size,
      maxSize: this.groupCache.max
    };
    
    const contracts = {
      size: this.contractCache.size,
      maxSize: this.contractCache.max
    };
    
    const total = {
      size: properties.size + groups.size + contracts.size,
      maxSize: properties.maxSize + groups.maxSize + contracts.maxSize
    };
    
    return { properties, groups, contracts, total };
  }
  
  private async fetchPropertyInfo(
    propertyId: string,
    client: AkamaiClient
  ): Promise<PropertyInfo | null> {
    try {
      logger.debug({ propertyId }, 'Fetching property info from API');
      
      // Use the client to fetch property details
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'GET'
      });
      
      if ((response as any)?.properties?.items?.[0]) {
        const property = (response as any).properties.items[0];
        const info: PropertyInfo = {
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          contractId: property.contractId,
          groupId: property.groupId,
          assetId: property.assetId,
        };
        
        // Cache the result
        this.propertyCache.set(propertyId, info);
        logger.debug({ propertyId, propertyName: info.propertyName }, 'Property info cached');
        
        return info;
      }
    } catch (error) {
      // Log error but don't throw - we'll use fallback
      logger.error({ propertyId, error }, 'Failed to fetch property info');
    }
    
    return null;
  }
  
  private async fetchGroupInfo(
    groupId: string,
    client: AkamaiClient
  ): Promise<GroupInfo | null> {
    try {
      logger.debug({ groupId }, 'Fetching group info from API');
      
      // Use the client to fetch group details
      const response = await client.request({
        path: '/papi/v1/groups',
        method: 'GET'
      });
      
      if ((response as any)?.groups?.items) {
        const group = (response as any).groups.items.find((g: any) => g.groupId === groupId);
        if (group) {
          const info: GroupInfo = {
            groupId: group.groupId,
            groupName: group.groupName,
            contractIds: group.contractIds,
            parentGroupId: group.parentGroupId,
          };
          
          // Cache the result
          this.groupCache.set(groupId, info);
          logger.debug({ groupId, groupName: info.groupName }, 'Group info cached');
          
          return info;
        }
      }
    } catch (error) {
      // Log error but don't throw - we'll use fallback
      logger.error({ groupId, error }, 'Failed to fetch group info');
    }
    
    return null;
  }
  
  private async fetchContractInfo(
    contractId: string,
    client: AkamaiClient
  ): Promise<ContractInfo | null> {
    try {
      logger.debug({ contractId }, 'Fetching contract info from API');
      
      // Use the client to fetch contract details
      const response = await client.request({
        path: '/papi/v1/contracts',
        method: 'GET'
      });
      
      if ((response as any)?.contracts?.items) {
        const contract = (response as any).contracts.items.find((c: any) => c.contractId === contractId);
        if (contract) {
          const info: ContractInfo = {
            contractId: contract.contractId,
            contractTypeName: contract.contractTypeName || 'Contract',
          };
          
          // Cache the result
          this.contractCache.set(contractId, info);
          logger.debug({ contractId, contractTypeName: info.contractTypeName }, 'Contract info cached');
          
          return info;
        }
      }
    } catch (error) {
      // Log error but don't throw - we'll use fallback
      logger.error({ contractId, error }, 'Failed to fetch contract info');
    }
    
    return null;
  }
  
  private formatPropertyResult(info: PropertyInfo): TranslationResult {
    return {
      id: info.propertyId,
      name: info.propertyName,
      displayName: `${info.propertyName} (${info.propertyId})`,
    };
  }
  
  private formatGroupResult(info: GroupInfo): TranslationResult {
    return {
      id: info.groupId,
      name: info.groupName,
      displayName: `${info.groupName} (${info.groupId})`,
    };
  }
  
  private formatContractResult(info: ContractInfo): TranslationResult {
    return {
      id: info.contractId,
      name: info.contractTypeName,
      displayName: `${info.contractTypeName} (${info.contractId})`,
    };
  }
  
  private fallbackResult(id: string, _type: AkamaiIdType): TranslationResult {
    return {
      id,
      name: id, // Use ID as name when translation fails
      displayName: id,
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance getter with backward compatibility
export const getPropertyTranslator = () => AkamaiIdTranslator.getInstance();
export const getAkamaiIdTranslator = () => AkamaiIdTranslator.getInstance();

// Legacy class alias for backward compatibility
export const PropertyTranslator = AkamaiIdTranslator;

/**
 * Helper function to translate Akamai IDs in responses
 */
export async function translateAkamaiResponse<T extends Record<string, any>>(
  response: T,
  client: AkamaiClient,
  options: {
    propertyIdFields?: string[];
    groupIdFields?: string[];
    contractIdFields?: string[];
    arrayField?: string;
    batchTranslate?: boolean;
  } = {}
): Promise<T> {
  const translator = getAkamaiIdTranslator();
  const { 
    propertyIdFields = ['propertyId'],
    groupIdFields = ['groupId'],
    contractIdFields = ['contractId'],
    arrayField,
    batchTranslate = true 
  } = options;
  
  // Handle array responses
  if (arrayField && Array.isArray(response[arrayField])) {
    const items = response[arrayField];
    
    if (batchTranslate) {
      // Extract all property IDs for batch translation
      const propertyIds = items
        .map(item => propertyIdFields.map(field => item[field]))
        .flat()
        .filter(Boolean);
      
      const translations = await translator.translateProperties(
        Array.from(new Set(propertyIds)), // Remove duplicates
        client
      );
      
      // Apply translations to items
      (response as any)[arrayField] = items.map(item => {
        const enriched = { ...item };
        for (const field of propertyIdFields) {
          if (enriched[field]) {
            const translation = translations.get(enriched[field]);
            if (translation) {
              enriched[`${field}_name`] = translation.name;
              enriched[`${field}_display`] = translation.displayName;
            }
          }
        }
        return enriched;
      });
    } else {
      // Translate individually
      (response as any)[arrayField] = await Promise.all(
        items.map(item => translator.enrichWithAkamaiIds(item, client, { propertyIdFields, groupIdFields, contractIdFields }))
      );
    }
  } else {
    // Handle single object
    return translator.enrichWithAkamaiIds(response, client, { propertyIdFields, groupIdFields, contractIdFields });
  }
  
  return response;
}

/**
 * Legacy helper function for backward compatibility
 */
export async function translatePropertyResponse<T extends Record<string, any>>(
  response: T,
  client: AkamaiClient,
  options: {
    propertyIdFields?: string[];
    arrayField?: string;
    batchTranslate?: boolean;
  } = {}
): Promise<T> {
  return translateAkamaiResponse(response, client, {
    propertyIdFields: options.propertyIdFields,
    arrayField: options.arrayField,
    batchTranslate: options.batchTranslate,
  });
}