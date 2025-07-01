/**
 * AKAMAI ID TRANSLATOR
 * 
 * CODE KAI PRINCIPLES:
 * Key: Simple ID-to-name translation for human-readable display
 * Approach: Focused translation service without complex routing logic
 * Implementation: LRU cache with basic API lookups for display names
 * 
 * CORE FEATURES:
 * - Property ID → Property Name translation (prp_123 → "My Site")
 * - Group ID → Group Name translation (grp_123 → "My Group")
 * - Contract ID → Contract Name translation (ctr_123 → "My Contract")
 * - CP Code ID → CP Code Name translation (cpc_123 → "My CP Code")
 * - Performance-optimized with simple caching
 * - Thread-safe singleton pattern
 */

import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';
import { AkamaiClient } from '../akamai-client';

const logger = createLogger('id-translator');

// SIMPLE TRANSLATION DATA STRUCTURES

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

interface GroupsAPIResponse extends AkamaiAPIResponse {
  groups?: {
    items?: Array<{
      groupId: string;
      groupName: string;
      contractIds?: string[];
      parentGroupId?: string;
    }>;
  };
}

interface ContractsAPIResponse extends AkamaiAPIResponse {
  contracts?: {
    items?: Array<{
      contractId: string;
      contractTypeName: string;
    }>;
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

export interface TranslationResult {
  id: string;
  name: string;
  displayName: string; // "Name (id_123456)"
}

type AkamaiIdType = 'property' | 'cpcode' | 'group' | 'contract' | 'unknown';

export class AkamaiIdTranslator {
  private static instance: AkamaiIdTranslator;
  
  // SIMPLE ID-TO-NAME CACHES
  private propertyCache: LRUCache<string, string>;   // propertyId → propertyName
  private groupCache: LRUCache<string, string>;      // groupId → groupName  
  private contractCache: LRUCache<string, string>;   // contractId → contractName
  private cpcodeCache: LRUCache<string, string>;     // cpcodeId → cpcodeName
  
  private pendingRequests: Map<string, Promise<any>>;
  
  private constructor() {
    const cacheOptions = {
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    };
    
    this.propertyCache = new LRUCache<string, string>(cacheOptions);
    this.groupCache = new LRUCache<string, string>(cacheOptions);
    this.contractCache = new LRUCache<string, string>(cacheOptions);
    this.cpcodeCache = new LRUCache<string, string>(cacheOptions);
    
    this.pendingRequests = new Map();
    
    logger.info('Akamai ID Translator initialized for simple ID-to-name translations');
  }
  
  static getInstance(): AkamaiIdTranslator {
    if (!AkamaiIdTranslator.instance) {
      AkamaiIdTranslator.instance = new AkamaiIdTranslator();
    }
    return AkamaiIdTranslator.instance;
  }
  
  /**
   * Translate any Akamai ID to human-readable name
   */
  async translateId(id: string, client: AkamaiClient): Promise<TranslationResult> {
    const idType = this.detectIdType(id);
    
    switch (idType) {
      case 'property':
        return this.translateProperty(id, client);
      case 'cpcode':
        return this.translateCPCode(id, client);
      case 'group':
        return this.translateGroup(id, client);
      case 'contract':
        return this.translateContract(id, client);
      default:
        return this.fallbackResult(id);
    }
  }

  /**
   * Translate Property ID to name
   */
  async translateProperty(propertyId: string, client: AkamaiClient): Promise<TranslationResult> {
    const cached = this.propertyCache.get(propertyId);
    if (cached) {
      return this.formatResult(propertyId, cached);
    }

    const pending = this.pendingRequests.get(`property:${propertyId}`);
    if (pending) {
      const name = await pending;
      return name ? this.formatResult(propertyId, name) : this.fallbackResult(propertyId);
    }

    const fetchPromise = this.fetchPropertyName(propertyId, client);
    this.pendingRequests.set(`property:${propertyId}`, fetchPromise);

    try {
      const name = await fetchPromise;
      if (name) {
        this.propertyCache.set(propertyId, name);
        return this.formatResult(propertyId, name);
      }
    } finally {
      this.pendingRequests.delete(`property:${propertyId}`);
    }

    return this.fallbackResult(propertyId);
  }

  /**
   * Translate CP Code ID to name
   */
  async translateCPCode(cpcodeId: string, client: AkamaiClient): Promise<TranslationResult> {
    const cached = this.cpcodeCache.get(cpcodeId);
    if (cached) {
      return this.formatResult(cpcodeId, cached);
    }

    const pending = this.pendingRequests.get(`cpcode:${cpcodeId}`);
    if (pending) {
      const name = await pending;
      return name ? this.formatResult(cpcodeId, name) : this.fallbackResult(cpcodeId);
    }

    const fetchPromise = this.fetchCPCodeName(cpcodeId, client);
    this.pendingRequests.set(`cpcode:${cpcodeId}`, fetchPromise);

    try {
      const name = await fetchPromise;
      if (name) {
        this.cpcodeCache.set(cpcodeId, name);
        return this.formatResult(cpcodeId, name);
      }
    } finally {
      this.pendingRequests.delete(`cpcode:${cpcodeId}`);
    }

    return this.fallbackResult(cpcodeId);
  }

  /**
   * Translate Group ID to name
   */
  async translateGroup(groupId: string, client: AkamaiClient): Promise<TranslationResult> {
    const cached = this.groupCache.get(groupId);
    if (cached) {
      return this.formatResult(groupId, cached);
    }

    const pending = this.pendingRequests.get(`group:${groupId}`);
    if (pending) {
      const name = await pending;
      return name ? this.formatResult(groupId, name) : this.fallbackResult(groupId);
    }

    const fetchPromise = this.fetchGroupName(groupId, client);
    this.pendingRequests.set(`group:${groupId}`, fetchPromise);

    try {
      const name = await fetchPromise;
      if (name) {
        this.groupCache.set(groupId, name);
        return this.formatResult(groupId, name);
      }
    } finally {
      this.pendingRequests.delete(`group:${groupId}`);
    }

    return this.fallbackResult(groupId);
  }

  /**
   * Translate Contract ID to name
   */
  async translateContract(contractId: string, client: AkamaiClient): Promise<TranslationResult> {
    const cached = this.contractCache.get(contractId);
    if (cached) {
      return this.formatResult(contractId, cached);
    }

    const pending = this.pendingRequests.get(`contract:${contractId}`);
    if (pending) {
      const name = await pending;
      return name ? this.formatResult(contractId, name) : this.fallbackResult(contractId);
    }

    const fetchPromise = this.fetchContractName(contractId, client);
    this.pendingRequests.set(`contract:${contractId}`, fetchPromise);

    try {
      const name = await fetchPromise;
      if (name) {
        this.contractCache.set(contractId, name);
        return this.formatResult(contractId, name);
      }
    } finally {
      this.pendingRequests.delete(`contract:${contractId}`);
    }

    return this.fallbackResult(contractId);
  }

  // PRIVATE HELPER METHODS

  private detectIdType(id: string): AkamaiIdType {
    if (id.startsWith('prp_')) return 'property';
    if (id.startsWith('cpc_') || /^\d{6,}$/.test(id)) return 'cpcode';
    if (id.startsWith('grp_')) return 'group';
    if (id.startsWith('ctr_')) return 'contract';
    return 'unknown';
  }

  private formatResult(id: string, name: string): TranslationResult {
    return {
      id,
      name,
      displayName: `${name} (${id})`,
    };
  }

  private fallbackResult(id: string): TranslationResult {
    return {
      id,
      name: id,
      displayName: id,
    };
  }

  // API FETCH METHODS

  private async fetchPropertyName(propertyId: string, client: AkamaiClient): Promise<string | null> {
    try {
      const response = await client.request({ path: '/papi/v1/properties' }) as PropertiesAPIResponse;
      const properties = response.properties?.items || [];
      
      const property = properties.find(p => p.propertyId === propertyId);
      return property?.propertyName || null;
    } catch (error) {
      logger.debug(`Error fetching property name for ${propertyId}:`, error);
      return null;
    }
  }

  private async fetchCPCodeName(cpcodeId: string, client: AkamaiClient): Promise<string | null> {
    try {
      const response = await client.request({ path: '/papi/v1/cpcodes' }) as CPCodesAPIResponse;
      const cpcodes = response.cpcodes?.items || [];
      
      // Handle both cpc_123 and 123 formats
      const normalizedId = cpcodeId.startsWith('cpc_') ? cpcodeId : `cpc_${cpcodeId}`;
      const numericId = cpcodeId.replace('cpc_', '');
      
      const cpcode = cpcodes.find(c => 
        c.cpcodeId === normalizedId || 
        c.cpcodeId === cpcodeId ||
        c.cpcodeId === numericId
      );
      
      return cpcode?.cpcodeName || null;
    } catch (error) {
      logger.debug(`Error fetching CP code name for ${cpcodeId}:`, error);
      return null;
    }
  }

  private async fetchGroupName(groupId: string, client: AkamaiClient): Promise<string | null> {
    try {
      const response = await client.request({ path: '/papi/v1/groups' }) as GroupsAPIResponse;
      const groups = response.groups?.items || [];
      
      const group = groups.find(g => g.groupId === groupId);
      return group?.groupName || null;
    } catch (error) {
      logger.debug(`Error fetching group name for ${groupId}:`, error);
      return null;
    }
  }

  private async fetchContractName(contractId: string, client: AkamaiClient): Promise<string | null> {
    try {
      const response = await client.request({ path: '/papi/v1/contracts' }) as ContractsAPIResponse;
      const contracts = response.contracts?.items || [];
      
      const contract = contracts.find(c => c.contractId === contractId);
      return contract?.contractTypeName || null;
    } catch (error) {
      logger.debug(`Error fetching contract name for ${contractId}:`, error);
      return null;
    }
  }

  // CACHE MANAGEMENT

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.propertyCache.clear();
    this.groupCache.clear();
    this.contractCache.clear();
    this.cpcodeCache.clear();
    
    logger.info('All ID translator caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      properties: this.propertyCache.size,
      groups: this.groupCache.size,
      contracts: this.contractCache.size,
      cpcodes: this.cpcodeCache.size,
    };
  }
}