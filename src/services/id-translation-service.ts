/**
 * ID TRANSLATION SERVICE
 * 
 * ARCHITECTURAL PURPOSE:
 * Provides centralized translation of cryptic Akamai IDs (property IDs, contract IDs, etc.)
 * into human-readable names. Implements caching to minimize API calls and improve performance.
 * 
 * KEY FEATURES:
 * 1. Translates property IDs to property names
 * 2. Translates contract IDs to contract names
 * 3. Translates group IDs to group names
 * 4. Translates CP codes to CP code names
 * 5. Implements LRU cache with TTL
 * 6. Batch translation support
 * 7. Fallback to ID if translation fails
 * 
 * INTEGRATION:
 * This service is integrated into BaseTool.execute to automatically translate
 * IDs in API responses before returning to the user.
 */

import { createLogger } from '../utils/pino-logger';
import type { Logger } from 'pino';
import { AkamaiError, AkamaiErrorTypes } from '../core/errors/error-handler';

/**
 * Generic Akamai client interface for ID translation
 */
interface AkamaiClientInterface {
  request<T = unknown>(options: {
    path: string;
    method?: string;
    params?: Record<string, string>;
    queryParams?: Record<string, string>;
  }): Promise<T>;
}

/**
 * Translation cache entry
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Translation mapping for an ID
 */
export interface Translation {
  id: string;
  name: string;
  type: 'property' | 'contract' | 'group' | 'cpcode' | 'product' | 'network_list' | 'certificate';
  metadata?: Record<string, unknown>;
}

/**
 * Options for translation
 */
export interface TranslationOptions {
  /** Skip cache and force fresh lookup */
  skipCache?: boolean;
  /** Include additional metadata in translation */
  includeMetadata?: boolean;
  /** Custom TTL for this translation (ms) */
  ttl?: number;
}

/**
 * ID Translation Service
 */
export class IdTranslationService {
  private logger: Logger;
  private cache: Map<string, CacheEntry<Translation>>;
  private readonly defaultTTL = 3600000; // 1 hour
  private readonly maxCacheSize = 10000;
  private client?: AkamaiClientInterface;

  constructor() {
    this.logger = createLogger('id-translation-service');
    this.cache = new Map();
  }

  /**
   * Set the Akamai client for API calls
   */
  setClient(client: AkamaiClientInterface): void {
    this.client = client;
  }

  /**
   * Translate a single ID
   */
  async translate(
    id: string, 
    type: Translation['type'], 
    options: TranslationOptions = {}
  ): Promise<Translation> {
    const cacheKey = `${type}:${id}`;
    
    // Check cache first
    if (!options.skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Perform translation based on type
      const translation = await this.performTranslation(id, type, options);
      
      // Cache the result
      this.addToCache(cacheKey, translation, options.ttl || this.defaultTTL);
      
      return translation;
    } catch (error) {
      this.logger.warn({ id, type, error }, 'Failed to translate ID, using fallback');
      
      // Return fallback translation
      return {
        id,
        name: id, // Use ID as name if translation fails
        type,
      };
    }
  }

  /**
   * Translate multiple IDs in batch
   */
  async translateBatch(
    items: Array<{ id: string; type: Translation['type'] }>,
    options: TranslationOptions = {}
  ): Promise<Map<string, Translation>> {
    const results = new Map<string, Translation>();
    const toFetch: typeof items = [];

    // Check cache for each item
    for (const item of items) {
      const cacheKey = `${item.type}:${item.id}`;
      
      if (!options.skipCache) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          results.set(item.id, cached);
          continue;
        }
      }
      
      toFetch.push(item);
    }

    // Batch fetch remaining items by type
    const byType = this.groupByType(toFetch);
    
    for (const [type, ids] of byType.entries()) {
      try {
        const translations = await this.performBatchTranslation(ids, type, options);
        
        for (const translation of translations) {
          results.set(translation.id, translation);
          
          // Cache each result
          const cacheKey = `${type}:${translation.id}`;
          this.addToCache(cacheKey, translation, options.ttl || this.defaultTTL);
        }
      } catch (error) {
        this.logger.warn({ type, ids, error }, 'Failed to batch translate IDs');
        
        // Add fallback translations for failed items
        for (const id of ids) {
          results.set(id, { id, name: id, type });
        }
      }
    }

    return results;
  }

  /**
   * Translate IDs in an object recursively
   */
  async translateInObject(
    obj: any,
    mappings: Array<{
      path: string;
      type: Translation['type'];
    }>,
    options: TranslationOptions = {}
  ): Promise<any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Clone the object to avoid mutations
    const result = Array.isArray(obj) ? [...obj] : { ...obj };

    // Collect all IDs to translate
    const toTranslate: Array<{ id: string; type: Translation['type']; path: string }> = [];

    for (const mapping of mappings) {
      const ids = this.extractIdsFromPath(result, mapping.path);
      for (const id of ids) {
        toTranslate.push({ id, type: mapping.type, path: mapping.path });
      }
    }

    // Batch translate all IDs
    const items = toTranslate.map(t => ({ id: t.id, type: t.type }));
    const translations = await this.translateBatch(items, options);

    // Apply translations back to object
    for (const { id, path } of toTranslate) {
      const translation = translations.get(id);
      if (translation && translation.name !== id) {
        this.applyTranslationToPath(result, path, id, translation.name);
      }
    }

    return result;
  }

  /**
   * Clear the translation cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses for this
      entries: entries.sort((a, b) => b.age - a.age),
    };
  }

  /**
   * Perform actual translation based on type
   */
  private async performTranslation(
    id: string,
    type: Translation['type'],
    options: TranslationOptions
  ): Promise<Translation> {
    if (!this.client) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.CONFIGURATION_ERROR,
        title: 'Configuration Error',
        detail: 'Akamai client not set in ID translation service',
        status: 500,
      });
    }

    switch (type) {
      case 'property':
        return this.translateProperty(id, options);
      
      case 'contract':
        return this.translateContract(id, options);
      
      case 'group':
        return this.translateGroup(id, options);
      
      case 'cpcode':
        return this.translateCpCode(id, options);
      
      case 'product':
        return this.translateProduct(id, options);
      
      case 'network_list':
        return this.translateNetworkList(id, options);
      
      case 'certificate':
        return this.translateCertificate(id, options);
      
      default:
        throw new AkamaiError({
          type: AkamaiErrorTypes.INVALID_PARAMETERS,
          title: 'Invalid Translation Type',
          detail: `Unknown translation type: ${type}`,
          status: 400,
        });
    }
  }

  /**
   * Translate property ID to name
   */
  private async translateProperty(id: string, options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: `/papi/v1/properties/${id}`,
      });

      const property = response.properties?.items?.[0] || response.property;
      
      return {
        id,
        name: property?.propertyName || id,
        type: 'property',
        ...(options.includeMetadata && {
          metadata: {
            contractId: property?.contractId,
            groupId: property?.groupId,
            latestVersion: property?.latestVersion,
          },
        }),
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate property ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'Property Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Translate contract ID to name
   */
  private async translateContract(id: string, _options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: '/papi/v1/contracts',
      });

      const contract = response.contracts?.items?.find((c: any) => c.contractId === id);
      
      return {
        id,
        name: contract?.contractTypeName || id,
        type: 'contract',
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate contract ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'Contract Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Translate group ID to name
   */
  private async translateGroup(id: string, options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: '/papi/v1/groups',
      });

      const group = response.groups?.items?.find((g: any) => g.groupId === id);
      
      return {
        id,
        name: group?.groupName || id,
        type: 'group',
        ...(options.includeMetadata && {
          metadata: {
            parentGroupId: group?.parentGroupId,
            contractIds: group?.contractIds,
          },
        }),
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate group ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'Group Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Translate CP code to name
   */
  private async translateCpCode(id: string, options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: `/papi/v1/cpcodes/${id}`,
      });

      const cpcode = response.cpcode;
      
      return {
        id,
        name: cpcode?.cpcodeName || id,
        type: 'cpcode',
        ...(options.includeMetadata && {
          metadata: {
            productIds: cpcode?.productIds,
            createdDate: cpcode?.createdDate,
          },
        }),
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate CP code ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'CP Code Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Translate product ID to name
   */
  private async translateProduct(id: string, _options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: '/papi/v1/products',
        queryParams: { contractId: 'all' },
      });

      const product = response.products?.items?.find((p: any) => p.productId === id);
      
      return {
        id,
        name: product?.productName || id,
        type: 'product',
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate product ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'Product Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Translate network list ID to name
   */
  private async translateNetworkList(id: string, options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: `/network-list/v2/network-lists/${id}`,
      });

      return {
        id,
        name: response.name || id,
        type: 'network_list',
        ...(options.includeMetadata && {
          metadata: {
            type: response.type,
            elementCount: response.elementCount,
            syncPoint: response.syncPoint,
          },
        }),
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate network list ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'Network List Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Translate certificate enrollment ID to name
   */
  private async translateCertificate(id: string, options: TranslationOptions): Promise<Translation> {
    try {
      const response = await this.client!.request({
        method: 'GET',
        path: `/cps/v2/enrollments/${id}`,
      });

      const cert = response.enrollment || response;
      const cn = cert.csr?.cn || cert.certificateChain?.[0]?.certificate?.subject?.cn;
      
      return {
        id,
        name: cn || `Certificate ${id}`,
        type: 'certificate',
        ...(options.includeMetadata && {
          metadata: {
            status: cert.status,
            certificateType: cert.certificateType,
            validationType: cert.validationType,
          },
        }),
      };
    } catch (error) {
      throw new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'Translation Failed',
        detail: `Failed to translate certificate ${id}`,
        status: 500,
        errors: [{
          type: 'translation_error',
          title: 'Certificate Translation Error',
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Perform batch translation for a specific type
   */
  private async performBatchTranslation(
    ids: string[],
    type: Translation['type'],
    options: TranslationOptions
  ): Promise<Translation[]> {
    // Most Akamai APIs don't support true batch fetching,
    // so we'll fetch lists and filter
    switch (type) {
      case 'property':
      case 'contract':
      case 'group':
      case 'product':
        return this.batchTranslateFromList(ids, type, options);
      
      default:
        // For types without list endpoints, fall back to individual calls
        const results = await Promise.all(
          ids.map(id => this.performTranslation(id, type, options).catch(() => ({
            id,
            name: id,
            type,
          })))
        );
        return results;
    }
  }

  /**
   * Batch translate by fetching a list and filtering
   */
  private async batchTranslateFromList(
    ids: string[],
    type: Translation['type'],
    _options: TranslationOptions
  ): Promise<Translation[]> {
    const idSet = new Set(ids);
    const results: Translation[] = [];

    try {
      let items: any[] = [];
      
      switch (type) {
        case 'property': {
          const response = await this.client!.request({
            method: 'GET',
            path: '/papi/v1/properties',
          });
          items = response.properties?.items || [];
          break;
        }
        
        case 'contract': {
          const response = await this.client!.request({
            method: 'GET',
            path: '/papi/v1/contracts',
          });
          items = response.contracts?.items || [];
          break;
        }
        
        case 'group': {
          const response = await this.client!.request({
            method: 'GET',
            path: '/papi/v1/groups',
          });
          items = response.groups?.items || [];
          break;
        }
        
        case 'product': {
          const response = await this.client!.request({
            method: 'GET',
            path: '/papi/v1/products',
            queryParams: { contractId: 'all' },
          });
          items = response.products?.items || [];
          break;
        }
      }

      // Extract translations from list
      for (const item of items) {
        let id: string;
        let name: string;
        
        switch (type) {
          case 'property':
            id = item.propertyId;
            name = item.propertyName;
            break;
          case 'contract':
            id = item.contractId;
            name = item.contractTypeName;
            break;
          case 'group':
            id = item.groupId;
            name = item.groupName;
            break;
          case 'product':
            id = item.productId;
            name = item.productName;
            break;
          default:
            continue;
        }
        
        if (idSet.has(id)) {
          results.push({ id, name: name || id, type });
          idSet.delete(id);
        }
      }

      // Add fallbacks for any IDs not found
      for (const id of idSet) {
        results.push({ id, name: id, type });
      }

      return results;
    } catch (error) {
      // On error, return all IDs as fallbacks
      return ids.map(id => ({ id, name: id, type }));
    }
  }

  /**
   * Group items by type for batch processing
   */
  private groupByType(
    items: Array<{ id: string; type: Translation['type'] }>
  ): Map<Translation['type'], string[]> {
    const groups = new Map<Translation['type'], string[]>();
    
    for (const item of items) {
      const ids = groups.get(item.type) || [];
      ids.push(item.id);
      groups.set(item.type, ids);
    }
    
    return groups;
  }

  /**
   * Get entry from cache if valid
   */
  private getFromCache(key: string): Translation | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > entry.ttl) {
      // Entry expired
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Add entry to cache with LRU eviction
   */
  private addToCache(key: string, value: Translation, ttl: number): void {
    // Implement simple LRU by removing oldest entries when at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Extract IDs from object path
   */
  private extractIdsFromPath(obj: any, path: string): string[] {
    const ids: string[] = [];
    const parts = path.split('.');
    
    const traverse = (current: any, depth: number): void => {
      if (depth >= parts.length) {
        if (typeof current === 'string') {
          ids.push(current);
        }
        return;
      }
      
      const part = parts[depth];
      
      if (part === '*' && Array.isArray(current)) {
        // Wildcard for array elements
        for (const item of current) {
          traverse(item, depth + 1);
        }
      } else if (part === '**') {
        // Recursive wildcard
        this.traverseRecursive(current, parts.slice(depth + 1), ids);
      } else if (current && typeof current === 'object') {
        traverse(current[part], depth + 1);
      }
    };
    
    traverse(obj, 0);
    return ids;
  }

  /**
   * Recursively traverse object for IDs
   */
  private traverseRecursive(obj: any, remainingPath: string[], ids: string[]): void {
    if (remainingPath.length === 0) {
      if (typeof obj === 'string') {
        ids.push(obj);
      }
      return;
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.traverseRecursive(item, remainingPath, ids);
      }
    } else if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key === remainingPath[0] || remainingPath[0] === '*') {
          this.traverseRecursive(obj[key], remainingPath.slice(1), ids);
        } else {
          this.traverseRecursive(obj[key], remainingPath, ids);
        }
      }
    }
  }

  /**
   * Apply translation to object path
   */
  private applyTranslationToPath(
    obj: any,
    path: string,
    oldValue: string,
    newValue: string
  ): void {
    const parts = path.split('.');
    
    const traverse = (current: any, depth: number): boolean => {
      if (depth >= parts.length - 1) {
        const lastPart = parts[depth];
        if (current && typeof current === 'object' && lastPart in current) {
          if (current[lastPart] === oldValue) {
            // Add translated name as a new field
            const fieldName = lastPart.replace(/Id$/, 'Name');
            if (fieldName !== lastPart) {
              current[fieldName] = newValue;
            }
            return true;
          }
        }
        return false;
      }
      
      const part = parts[depth];
      
      if (part === '*' && Array.isArray(current)) {
        let found = false;
        for (const item of current) {
          if (traverse(item, depth + 1)) {
            found = true;
          }
        }
        return found;
      } else if (current && typeof current === 'object' && part in current) {
        return traverse(current[part], depth + 1);
      }
      
      return false;
    };
    
    traverse(obj, 0);
  }
}

// Export singleton instance
export const idTranslationService = new IdTranslationService();