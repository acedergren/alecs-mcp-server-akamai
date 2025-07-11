/**
 * ID TRANSLATION SERVICE
 * 
 * ARCHITECTURAL PURPOSE:
 * Provides a centralized service for translating Akamai's cryptic IDs
 * (like ctr_V-44KRACO, grp_123456, prp_789012) into human-readable names.
 * This dramatically improves code readability and user experience.
 * 
 * KEY FEATURES:
 * 1. Automatic ID detection and translation
 * 2. Caching for performance optimization
 * 3. Batch translation support
 * 4. Fallback to ID when name unavailable
 * 5. Support for all major Akamai resource types
 * 
 * SUPPORTED RESOURCE TYPES:
 * - Contracts (ctr_*) -> Contract names
 * - Groups (grp_*) -> Group names
 * - Properties (prp_*) -> Property names
 * - CP Codes (cpc_*) -> CP Code names
 * - Certificates (enrollment_*) -> Certificate common names
 * - DNS Zones -> Zone names
 * - Network Lists -> List names
 */

import { createLogger } from '../utils/pino-logger';
import { CacheService } from '../utils/cache-service';
import { EdgeGridClient } from '../utils/edgegrid-client';
import type { Logger } from 'pino';

/**
 * Resource types that can be translated
 */
export enum ResourceType {
  CONTRACT = 'contract',
  GROUP = 'group',
  PROPERTY = 'property',
  CPCODE = 'cpcode',
  CERTIFICATE = 'certificate',
  DNS_ZONE = 'dns_zone',
  NETWORK_LIST = 'network_list',
}

/**
 * Translation result for a single ID
 */
export interface TranslationResult {
  id: string;
  name: string;
  type: ResourceType;
  metadata?: Record<string, unknown>;
}

/**
 * Batch translation request
 */
export interface BatchTranslationRequest {
  ids: string[];
  type?: ResourceType;
  customer?: string;
}

/**
 * ID patterns for automatic detection
 */
const ID_PATTERNS: Record<ResourceType, RegExp> = {
  [ResourceType.CONTRACT]: /^ctr_[A-Z0-9-]+$/i,
  [ResourceType.GROUP]: /^grp_\d+$/,
  [ResourceType.PROPERTY]: /^prp_\d+$/,
  [ResourceType.CPCODE]: /^cpc_\d+$/,
  [ResourceType.CERTIFICATE]: /^enrollment_\d+$/,
  [ResourceType.DNS_ZONE]: /^[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|io|co|uk|de|fr|jp|cn|au|ca|br|in|mx|nl|es|it|ru|kr|sg|hk|tw|ar|pl|se|no|fi|dk|be|ch|at|ie|nz|za|ae|sa|eg|tr|il|my|th|vn|id|ph|pk|bd|ng|ke|et|tz|ug|zm|zw|mz|mg|ao|cm|ci|gh|ma|ne|bf|ml|sn|tg|bj|tn|ly|sd|ss|er|dj|so|rw|bi|km|sc|mu|sz|ls|bw|na|za|mw|zm|zw)$/,
  [ResourceType.NETWORK_LIST]: /^[a-zA-Z0-9_-]+_LIST$/,
};

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  ttl: 3600000, // 1 hour
  maxSize: 10000, // Maximum number of translations to cache
  keyPrefix: 'id-translation',
};

/**
 * ID Translation Service
 */
export class IDTranslationService {
  private logger: Logger;
  private cache: CacheService;
  private client: EdgeGridClient;
  
  constructor(client: EdgeGridClient) {
    this.logger = createLogger('id-translation-service');
    this.cache = new CacheService();
    this.client = client;
  }

  /**
   * Translate a single ID to its human-readable name
   */
  async translateId(id: string, type?: ResourceType, customer?: string): Promise<TranslationResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(id, customer);
    const cached = await this.cache.get<TranslationResult>(cacheKey);
    if (cached) {
      this.logger.debug({ id, type, cached }, 'Translation found in cache');
      return cached;
    }

    // Detect resource type if not provided
    const resourceType = type || this.detectResourceType(id);
    if (!resourceType) {
      this.logger.warn({ id }, 'Unable to detect resource type');
      return { id, name: id, type: ResourceType.PROPERTY };
    }

    // Fetch translation based on type
    try {
      const result = await this.fetchTranslation(id, resourceType, customer);
      
      // Cache the result
      await this.cache.set(cacheKey, result, CACHE_CONFIG.ttl);
      
      return result;
    } catch (error) {
      this.logger.error({ error, id, type: resourceType }, 'Failed to translate ID');
      // Return ID as fallback
      return { id, name: id, type: resourceType };
    }
  }

  /**
   * Translate multiple IDs in batch
   */
  async translateBatch(request: BatchTranslationRequest): Promise<Record<string, TranslationResult>> {
    const results: Record<string, TranslationResult> = {};
    
    // Group IDs by detected type for efficient fetching
    const groupedIds = this.groupIdsByType(request.ids, request.type);
    
    // Process each group
    for (const [type, ids] of Object.entries(groupedIds)) {
      const resourceType = type as ResourceType;
      
      // Check cache for each ID
      const uncachedIds: string[] = [];
      for (const id of ids) {
        const cacheKey = this.getCacheKey(id, request.customer);
        const cached = await this.cache.get<TranslationResult>(cacheKey);
        if (cached) {
          results[id] = cached;
        } else {
          uncachedIds.push(id);
        }
      }
      
      // Fetch uncached translations
      if (uncachedIds.length > 0) {
        try {
          const batchResults = await this.fetchBatchTranslations(
            uncachedIds,
            resourceType,
            request.customer
          );
          
          // Cache and store results
          for (const result of batchResults) {
            const cacheKey = this.getCacheKey(result.id, request.customer);
            await this.cache.set(cacheKey, result, CACHE_CONFIG.ttl);
            results[result.id] = result;
          }
        } catch (error) {
          this.logger.error({ error, type: resourceType, ids: uncachedIds }, 'Batch translation failed');
          // Add fallback results for failed IDs
          for (const id of uncachedIds) {
            results[id] = { id, name: id, type: resourceType };
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Translate IDs in an object recursively
   */
  async translateObject<T extends Record<string, any>>(
    obj: T,
    customer?: string
  ): Promise<T> {
    // Find all IDs in the object
    const ids = this.extractIdsFromObject(obj);
    
    if (ids.length === 0) {
      return obj;
    }
    
    // Translate all IDs
    const translations = await this.translateBatch({ ids, customer });
    
    // Create a copy of the object with translated names
    return this.applyTranslations(obj, translations);
  }

  /**
   * Clear translation cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.logger.info('Translation cache cleared');
  }

  /**
   * Detect resource type from ID format
   */
  private detectResourceType(id: string): ResourceType | null {
    for (const [type, pattern] of Object.entries(ID_PATTERNS)) {
      if (pattern.test(id)) {
        return type as ResourceType;
      }
    }
    return null;
  }

  /**
   * Group IDs by their detected type
   */
  private groupIdsByType(ids: string[], defaultType?: ResourceType): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    
    for (const id of ids) {
      const type = defaultType || this.detectResourceType(id);
      if (type) {
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(id);
      }
    }
    
    return grouped;
  }

  /**
   * Get cache key for an ID
   */
  private getCacheKey(id: string, customer?: string): string {
    return `${CACHE_CONFIG.keyPrefix}:${customer || 'default'}:${id}`;
  }

  /**
   * Fetch translation for a single ID
   */
  private async fetchTranslation(
    id: string,
    type: ResourceType,
    customer?: string
  ): Promise<TranslationResult> {
    switch (type) {
      case ResourceType.CONTRACT:
        return this.fetchContractName(id, customer);
      
      case ResourceType.GROUP:
        return this.fetchGroupName(id, customer);
      
      case ResourceType.PROPERTY:
        return this.fetchPropertyName(id, customer);
      
      case ResourceType.CPCODE:
        return this.fetchCPCodeName(id, customer);
      
      case ResourceType.CERTIFICATE:
        return this.fetchCertificateName(id, customer);
      
      case ResourceType.DNS_ZONE:
        return { id, name: id, type }; // DNS zones use their name as ID
      
      case ResourceType.NETWORK_LIST:
        return this.fetchNetworkListName(id, customer);
      
      default:
        return { id, name: id, type };
    }
  }

  /**
   * Fetch batch translations for multiple IDs of the same type
   */
  private async fetchBatchTranslations(
    ids: string[],
    type: ResourceType,
    customer?: string
  ): Promise<TranslationResult[]> {
    switch (type) {
      case ResourceType.CONTRACT:
        return this.fetchContractNames(ids, customer);
      
      case ResourceType.GROUP:
        return this.fetchGroupNames(ids, customer);
      
      case ResourceType.PROPERTY:
        return this.fetchPropertyNames(ids, customer);
      
      case ResourceType.CPCODE:
        return this.fetchCPCodeNames(ids, customer);
      
      case ResourceType.CERTIFICATE:
        return this.fetchCertificateNames(ids, customer);
      
      case ResourceType.DNS_ZONE:
        return ids.map(id => ({ id, name: id, type }));
      
      case ResourceType.NETWORK_LIST:
        return this.fetchNetworkListNames(ids, customer);
      
      default:
        return ids.map(id => ({ id, name: id, type }));
    }
  }

  /**
   * Fetch contract name
   */
  private async fetchContractName(contractId: string, customer?: string): Promise<TranslationResult> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: '/papi/v1/contracts',
        headers: {
          'PAPI-Use-Prefixes': 'false',
        },
      }, customer);
      
      const contracts = response.data?.contracts || [];
      const contract = contracts.find((c: any) => c.contractId === contractId);
      
      return {
        id: contractId,
        name: contract?.contractTypeName || contractId,
        type: ResourceType.CONTRACT,
        metadata: contract ? {
          contractTypeName: contract.contractTypeName,
        } : undefined,
      };
    } catch (error) {
      this.logger.error({ error, contractId }, 'Failed to fetch contract name');
      return { id: contractId, name: contractId, type: ResourceType.CONTRACT };
    }
  }

  /**
   * Fetch multiple contract names
   */
  private async fetchContractNames(contractIds: string[], customer?: string): Promise<TranslationResult[]> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: '/papi/v1/contracts',
        headers: {
          'PAPI-Use-Prefixes': 'false',
        },
      }, customer);
      
      const contracts = response.data?.contracts || [];
      const contractMap = new Map(contracts.map((c: any) => [c.contractId, c]));
      
      return contractIds.map(id => {
        const contract = contractMap.get(id);
        return {
          id,
          name: contract?.contractTypeName || id,
          type: ResourceType.CONTRACT,
          metadata: contract ? {
            contractTypeName: contract.contractTypeName,
          } : undefined,
        };
      });
    } catch (error) {
      this.logger.error({ error, contractIds }, 'Failed to fetch contract names');
      return contractIds.map(id => ({ id, name: id, type: ResourceType.CONTRACT }));
    }
  }

  /**
   * Fetch group name
   */
  private async fetchGroupName(groupId: string, customer?: string): Promise<TranslationResult> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: '/papi/v1/groups',
        headers: {
          'PAPI-Use-Prefixes': 'false',
        },
      }, customer);
      
      const groups = response.data?.groups?.items || [];
      const group = this.findGroupById(groups, groupId);
      
      return {
        id: groupId,
        name: group?.groupName || groupId,
        type: ResourceType.GROUP,
        metadata: group ? {
          parentGroupId: group.parentGroupId,
          contractIds: group.contractIds,
        } : undefined,
      };
    } catch (error) {
      this.logger.error({ error, groupId }, 'Failed to fetch group name');
      return { id: groupId, name: groupId, type: ResourceType.GROUP };
    }
  }

  /**
   * Fetch multiple group names
   */
  private async fetchGroupNames(groupIds: string[], customer?: string): Promise<TranslationResult[]> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: '/papi/v1/groups',
        headers: {
          'PAPI-Use-Prefixes': 'false',
        },
      }, customer);
      
      const groups = response.data?.groups?.items || [];
      const groupMap = this.buildGroupMap(groups);
      
      return groupIds.map(id => {
        const group = groupMap.get(id);
        return {
          id,
          name: group?.groupName || id,
          type: ResourceType.GROUP,
          metadata: group ? {
            parentGroupId: group.parentGroupId,
            contractIds: group.contractIds,
          } : undefined,
        };
      });
    } catch (error) {
      this.logger.error({ error, groupIds }, 'Failed to fetch group names');
      return groupIds.map(id => ({ id, name: id, type: ResourceType.GROUP }));
    }
  }

  /**
   * Find group by ID in nested structure
   */
  private findGroupById(groups: any[], groupId: string): any {
    for (const group of groups) {
      if (group.groupId === groupId) {
        return group;
      }
      if (group.groups?.items) {
        const found = this.findGroupById(group.groups.items, groupId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Build a flat map of all groups
   */
  private buildGroupMap(groups: any[]): Map<string, any> {
    const map = new Map<string, any>();
    
    const addToMap = (items: any[]) => {
      for (const group of items) {
        map.set(group.groupId, group);
        if (group.groups?.items) {
          addToMap(group.groups.items);
        }
      }
    };
    
    addToMap(groups);
    return map;
  }

  /**
   * Fetch property name
   */
  private async fetchPropertyName(propertyId: string, customer?: string): Promise<TranslationResult> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: `/papi/v1/properties/${propertyId}`,
        headers: {
          'PAPI-Use-Prefixes': 'false',
        },
      }, customer);
      
      const property = response.data?.properties?.items?.[0];
      
      return {
        id: propertyId,
        name: property?.propertyName || propertyId,
        type: ResourceType.PROPERTY,
        metadata: property ? {
          contractId: property.contractId,
          groupId: property.groupId,
          latestVersion: property.latestVersion,
          productionVersion: property.productionVersion,
          stagingVersion: property.stagingVersion,
        } : undefined,
      };
    } catch (error) {
      this.logger.error({ error, propertyId }, 'Failed to fetch property name');
      return { id: propertyId, name: propertyId, type: ResourceType.PROPERTY };
    }
  }

  /**
   * Fetch multiple property names
   */
  private async fetchPropertyNames(propertyIds: string[], customer?: string): Promise<TranslationResult[]> {
    // For properties, we need to make individual requests
    // TODO: Optimize with batch endpoint if available
    const results = await Promise.all(
      propertyIds.map(id => this.fetchPropertyName(id, customer))
    );
    return results;
  }

  /**
   * Fetch CP Code name
   */
  private async fetchCPCodeName(cpCodeId: string, customer?: string): Promise<TranslationResult> {
    try {
      // Extract numeric ID from cpc_123456 format
      const numericId = cpCodeId.replace('cpc_', '');
      
      const response = await this.client.request({
        method: 'GET',
        path: `/papi/v1/cpcodes/${numericId}`,
        headers: {
          'PAPI-Use-Prefixes': 'false',
        },
      }, customer);
      
      const cpCode = response.data?.cpcodes?.items?.[0];
      
      return {
        id: cpCodeId,
        name: cpCode?.cpcodeName || cpCodeId,
        type: ResourceType.CPCODE,
        metadata: cpCode ? {
          productIds: cpCode.productIds,
          contractId: cpCode.contractId,
          groupId: cpCode.groupId,
        } : undefined,
      };
    } catch (error) {
      this.logger.error({ error, cpCodeId }, 'Failed to fetch CP Code name');
      return { id: cpCodeId, name: cpCodeId, type: ResourceType.CPCODE };
    }
  }

  /**
   * Fetch multiple CP Code names
   */
  private async fetchCPCodeNames(cpCodeIds: string[], customer?: string): Promise<TranslationResult[]> {
    // For CP Codes, we need to make individual requests
    // TODO: Optimize with batch endpoint if available
    const results = await Promise.all(
      cpCodeIds.map(id => this.fetchCPCodeName(id, customer))
    );
    return results;
  }

  /**
   * Fetch certificate name
   */
  private async fetchCertificateName(enrollmentId: string, customer?: string): Promise<TranslationResult> {
    try {
      // Extract numeric ID from enrollment_123456 format
      const numericId = enrollmentId.replace('enrollment_', '');
      
      const response = await this.client.request({
        method: 'GET',
        path: `/cps/v2/enrollments/${numericId}`,
      }, customer);
      
      const enrollment = response.data;
      const commonName = enrollment?.csr?.cn || enrollment?.certificateChain?.[0]?.cn;
      
      return {
        id: enrollmentId,
        name: commonName || enrollmentId,
        type: ResourceType.CERTIFICATE,
        metadata: enrollment ? {
          cn: commonName,
          sans: enrollment.csr?.sans || [],
          certificateType: enrollment.certificateType,
          validationType: enrollment.validationType,
        } : undefined,
      };
    } catch (error) {
      this.logger.error({ error, enrollmentId }, 'Failed to fetch certificate name');
      return { id: enrollmentId, name: enrollmentId, type: ResourceType.CERTIFICATE };
    }
  }

  /**
   * Fetch multiple certificate names
   */
  private async fetchCertificateNames(enrollmentIds: string[], customer?: string): Promise<TranslationResult[]> {
    // For certificates, we need to make individual requests
    const results = await Promise.all(
      enrollmentIds.map(id => this.fetchCertificateName(id, customer))
    );
    return results;
  }

  /**
   * Fetch network list name
   */
  private async fetchNetworkListName(listId: string, customer?: string): Promise<TranslationResult> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: `/network-list/v2/network-lists/${listId}`,
      }, customer);
      
      const list = response.data;
      
      return {
        id: listId,
        name: list?.name || listId,
        type: ResourceType.NETWORK_LIST,
        metadata: list ? {
          type: list.type,
          elementCount: list.elementCount,
          syncPoint: list.syncPoint,
        } : undefined,
      };
    } catch (error) {
      this.logger.error({ error, listId }, 'Failed to fetch network list name');
      return { id: listId, name: listId, type: ResourceType.NETWORK_LIST };
    }
  }

  /**
   * Fetch multiple network list names
   */
  private async fetchNetworkListNames(listIds: string[], customer?: string): Promise<TranslationResult[]> {
    // For network lists, we need to make individual requests
    const results = await Promise.all(
      listIds.map(id => this.fetchNetworkListName(id, customer))
    );
    return results;
  }

  /**
   * Extract all IDs from an object recursively
   */
  private extractIdsFromObject(obj: any, ids: Set<string> = new Set()): string[] {
    if (!obj || typeof obj !== 'object') {
      return Array.from(ids);
    }
    
    // Check if current value is an ID
    if (typeof obj === 'string' && this.detectResourceType(obj)) {
      ids.add(obj);
    }
    
    // Recursively check all properties
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractIdsFromObject(item, ids);
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        // Check if key name suggests it contains an ID
        if (this.isIdField(key) && typeof value === 'string') {
          const type = this.detectResourceType(value);
          if (type) {
            ids.add(value);
          }
        }
        // Recursively check value
        this.extractIdsFromObject(value, ids);
      }
    }
    
    return Array.from(ids);
  }

  /**
   * Check if a field name suggests it contains an ID
   */
  private isIdField(fieldName: string): boolean {
    const idFieldPatterns = [
      /^.*Id$/i,
      /^.*_id$/i,
      /^id$/i,
      /^contractId$/i,
      /^groupId$/i,
      /^propertyId$/i,
      /^cpCodeId$/i,
      /^enrollmentId$/i,
      /^networkListId$/i,
      /^parentGroupId$/i,
    ];
    
    return idFieldPatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * Apply translations to an object
   */
  private applyTranslations<T extends Record<string, any>>(
    obj: T,
    translations: Record<string, TranslationResult>
  ): T {
    // Deep clone the object
    const result = JSON.parse(JSON.stringify(obj));
    
    // Apply translations recursively
    const apply = (target: any): any => {
      if (!target || typeof target !== 'object') {
        return target;
      }
      
      if (Array.isArray(target)) {
        return target.map(item => apply(item));
      }
      
      for (const [key, value] of Object.entries(target)) {
        if (typeof value === 'string' && translations[value]) {
          // Add translated name as a new field
          const translation = translations[value];
          target[`${key}_name`] = translation.name;
          
          // Add metadata if available
          if (translation.metadata) {
            target[`${key}_metadata`] = translation.metadata;
          }
        } else if (typeof value === 'object') {
          target[key] = apply(value);
        }
      }
      
      return target;
    };
    
    return apply(result);
  }
}

/**
 * Create a singleton instance
 */
let translationService: IDTranslationService | null = null;

/**
 * Get or create the translation service instance
 */
export function getTranslationService(client: EdgeGridClient): IDTranslationService {
  if (!translationService) {
    translationService = new IDTranslationService(client);
  }
  return translationService;
}

/**
 * Helper function to translate IDs in any object
 */
export async function translateIds<T extends Record<string, any>>(
  obj: T,
  client: EdgeGridClient,
  customer?: string
): Promise<T> {
  const service = getTranslationService(client);
  return service.translateObject(obj, customer);
}