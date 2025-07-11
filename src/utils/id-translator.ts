/**
 * AKAMAI ID TRANSLATOR - Human-Readable Names for All Akamai IDs
 * 
 * CODE KAI PRINCIPLES:
 * Key: Translate cryptic Akamai IDs across all services to human-readable names
 * Approach: Multi-cache system for all ID types with intelligent pattern detection
 * Implementation: LRU caches, automatic lookup, graceful fallback handling
 * 
 * FEATURES:
 * - Property ID translation (prp_123 → "My Site (prp_123)")
 * - Group ID translation (grp_456 → "Production Group (grp_456)")
 * - Contract ID translation (ctr_789 → "Main Contract (ctr_789)")
 * - CP Code translation (cpc_12345 → "Static Assets (cpc_12345)")
 * - Edge Hostname translation (ehn_12345 → "www.example.com.edgesuite.net (ehn_12345)")
 * - Network List translation (12345_BLOCKLIST → "Geographic Blocklist (12345_BLOCKLIST)")
 * - EdgeWorker translation (12345 → "Image Optimization Worker (12345)")
 * - Certificate Enrollment translation (12345 → "www.example.com (12345)")
 * - GTM Datacenter translation (3131 → "US East - Washington, DC (3131)")
 * - LRU cache for performance (avoid repeated API calls)
 * - Batch translation support with rate limiting
 * - Context-aware numeric ID detection
 * - Thread-safe singleton pattern
 */

import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';
import { AkamaiClient } from '../akamai-client';
import { 
  isPapiPropertyDetailsResponse,
  isPapiGroupsResponse,
  isPapiContractsResponse
} from '../types/api-responses/papi-properties';
import { z } from 'zod';

const logger = createLogger('id-translator');

// Existing interfaces
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

// New interfaces for additional ID types
interface CPCodeInfo {
  cpcodeId: string;
  cpcodeName: string;
  description?: string;
  productIds?: string[];
}

interface EdgeHostnameInfo {
  edgeHostnameId: string;
  edgeHostnameDomain: string;
  domainPrefix?: string;
  domainSuffix?: string;
}

interface NetworkListInfo {
  networkListId: string;
  name: string;
  type?: string;
  description?: string;
}

interface EdgeWorkerInfo {
  edgeWorkerId: number;
  name: string;
  description?: string;
  groupId?: string;
}

interface EnrollmentInfo {
  enrollmentId: number;
  cn: string; // Common Name
  sans?: string[];
  status?: string;
}

interface DatacenterInfo {
  datacenterId: number;
  nickname: string;
  city?: string;
  country?: string;
  continent?: string;
}

interface TranslationResult {
  id: string;
  name: string;
  displayName: string; // "Name (id_123456)"
}

type AkamaiIdType = 'property' | 'group' | 'contract' | 'cpcode' | 'edgehostname' | 
                   'networklist' | 'edgeworker' | 'enrollment' | 'datacenter' | 'unknown';

// Context hints for numeric ID disambiguation
export interface TranslationContext {
  domain?: string; // Which API domain we're in
  endpoint?: string; // Which endpoint returned this ID
  fieldName?: string; // The JSON field name containing the ID
}

export class AkamaiIdTranslator {
  private static instance: AkamaiIdTranslator;
  
  // Existing caches
  private propertyCache: LRUCache<string, PropertyInfo>;
  private groupCache: LRUCache<string, GroupInfo>;
  private contractCache: LRUCache<string, ContractInfo>;
  
  // New caches
  private cpCodeCache: LRUCache<string, CPCodeInfo>;
  private edgeHostnameCache: LRUCache<string, EdgeHostnameInfo>;
  private networkListCache: LRUCache<string, NetworkListInfo>;
  private edgeWorkerCache: LRUCache<number, EdgeWorkerInfo>;
  private enrollmentCache: LRUCache<number, EnrollmentInfo>;
  private datacenterCache: LRUCache<number, DatacenterInfo>;
  
  private pendingRequests: Map<string, Promise<any>>;
  
  private constructor() {
    const cacheOptions = {
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    };
    
    // Initialize existing caches
    this.propertyCache = new LRUCache<string, PropertyInfo>(cacheOptions);
    this.groupCache = new LRUCache<string, GroupInfo>(cacheOptions);
    this.contractCache = new LRUCache<string, ContractInfo>(cacheOptions);
    
    // Initialize new caches
    this.cpCodeCache = new LRUCache<string, CPCodeInfo>(cacheOptions);
    this.edgeHostnameCache = new LRUCache<string, EdgeHostnameInfo>(cacheOptions);
    this.networkListCache = new LRUCache<string, NetworkListInfo>(cacheOptions);
    this.edgeWorkerCache = new LRUCache<number, EdgeWorkerInfo>(cacheOptions);
    this.enrollmentCache = new LRUCache<number, EnrollmentInfo>(cacheOptions);
    this.datacenterCache = new LRUCache<number, DatacenterInfo>(cacheOptions);
    
    this.pendingRequests = new Map();
    
    logger.info('AkamaiIdTranslator initialized with comprehensive multi-cache system');
  }
  
  static getInstance(): AkamaiIdTranslator {
    if (!AkamaiIdTranslator.instance) {
      AkamaiIdTranslator.instance = new AkamaiIdTranslator();
    }
    return AkamaiIdTranslator.instance;
  }
  
  /**
   * Detect ID type based on pattern and context
   */
  private detectIdType(id: string, context?: TranslationContext): AkamaiIdType {
    // String pattern matching
    if (id.startsWith('prp_')) return 'property';
    if (id.startsWith('grp_')) return 'group';
    if (id.startsWith('ctr_')) return 'contract';
    if (id.startsWith('cpc_')) return 'cpcode';
    if (id.startsWith('ehn_')) return 'edgehostname';
    
    // Network list patterns (can be numeric or string with underscore)
    if (/^\d+_[A-Z_]+$/.test(id) || /^[A-Z0-9_]+LIST$/.test(id)) {
      return 'networklist';
    }
    
    // Context-aware numeric ID detection
    if (/^\d+$/.test(id)) {
      const numericId = parseInt(id, 10);
      
      // Use context to determine type
      if (context?.domain === 'edgeworkers' || context?.fieldName === 'edgeWorkerId') {
        return 'edgeworker';
      }
      if (context?.domain === 'cps' || context?.fieldName === 'enrollmentId') {
        return 'enrollment';
      }
      if (context?.domain === 'gtm' || context?.fieldName === 'datacenterId') {
        return 'datacenter';
      }
      if (context?.endpoint?.includes('network-list')) {
        return 'networklist';
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Universal translator for Akamai IDs with context support
   */
  async translateId(
    id: string,
    client: AkamaiClient,
    context?: TranslationContext
  ): Promise<TranslationResult> {
    const idType = this.detectIdType(id, context);
    
    switch (idType) {
      case 'property':
        return this.translateProperty(id, client);
      case 'group':
        return this.translateGroup(id, client);
      case 'contract':
        return this.translateContract(id, client);
      case 'cpcode':
        return this.translateCPCode(id, client);
      case 'edgehostname':
        return this.translateEdgeHostname(id, client);
      case 'networklist':
        return this.translateNetworkList(id, client);
      case 'edgeworker':
        return this.translateEdgeWorker(parseInt(id, 10), client);
      case 'enrollment':
        return this.translateEnrollment(parseInt(id, 10), client);
      case 'datacenter':
        return this.translateDatacenter(parseInt(id, 10), client);
      default:
        // Return original ID if type unknown
        return {
          id,
          name: id,
          displayName: id
        };
    }
  }
  
  /**
   * Translate property ID to name
   */
  async translateProperty(
    propertyId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.propertyCache.get(propertyId);
      if (cached) {
        return {
          id: propertyId,
          name: cached.propertyName,
          displayName: `${cached.propertyName} (${propertyId})`
        };
      }
      
      const info = await this.fetchPropertyInfo(propertyId, client);
      if (info) {
        return {
          id: propertyId,
          name: info.propertyName,
          displayName: `${info.propertyName} (${propertyId})`
        };
      }
    } catch (error) {
      logger.error({ error, propertyId }, 'Failed to translate property ID');
    }
    
    return {
      id: propertyId,
      name: propertyId,
      displayName: propertyId
    };
  }
  
  /**
   * Translate group ID to name
   */
  async translateGroup(
    groupId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.groupCache.get(groupId);
      if (cached) {
        return {
          id: groupId,
          name: cached.groupName,
          displayName: `${cached.groupName} (${groupId})`
        };
      }
      
      const info = await this.fetchGroupInfo(groupId, client);
      if (info) {
        return {
          id: groupId,
          name: info.groupName,
          displayName: `${info.groupName} (${groupId})`
        };
      }
    } catch (error) {
      logger.error({ error, groupId }, 'Failed to translate group ID');
    }
    
    return {
      id: groupId,
      name: groupId,
      displayName: groupId
    };
  }
  
  /**
   * Translate contract ID to name
   */
  async translateContract(
    contractId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.contractCache.get(contractId);
      if (cached) {
        return {
          id: contractId,
          name: cached.contractTypeName,
          displayName: `${cached.contractTypeName} (${contractId})`
        };
      }
      
      const info = await this.fetchContractInfo(contractId, client);
      if (info) {
        return {
          id: contractId,
          name: info.contractTypeName,
          displayName: `${info.contractTypeName} (${contractId})`
        };
      }
    } catch (error) {
      logger.error({ error, contractId }, 'Failed to translate contract ID');
    }
    
    return {
      id: contractId,
      name: contractId,
      displayName: contractId
    };
  }
  
  /**
   * Translate CP Code to name
   */
  async translateCPCode(
    cpcodeId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.cpCodeCache.get(cpcodeId);
      if (cached) {
        const name = cached.description || cached.cpcodeName;
        return {
          id: cpcodeId,
          name,
          displayName: `${name} (${cpcodeId})`
        };
      }
      
      const info = await this.fetchCPCodeInfo(cpcodeId, client);
      if (info) {
        const name = info.description || info.cpcodeName;
        return {
          id: cpcodeId,
          name,
          displayName: `${name} (${cpcodeId})`
        };
      }
    } catch (error) {
      logger.error({ error, cpcodeId }, 'Failed to translate CP Code');
    }
    
    return {
      id: cpcodeId,
      name: cpcodeId,
      displayName: cpcodeId
    };
  }
  
  /**
   * Translate Edge Hostname to full domain
   */
  async translateEdgeHostname(
    edgeHostnameId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.edgeHostnameCache.get(edgeHostnameId);
      if (cached) {
        return {
          id: edgeHostnameId,
          name: cached.edgeHostnameDomain,
          displayName: `${cached.edgeHostnameDomain} (${edgeHostnameId})`
        };
      }
      
      const info = await this.fetchEdgeHostnameInfo(edgeHostnameId, client);
      if (info) {
        return {
          id: edgeHostnameId,
          name: info.edgeHostnameDomain,
          displayName: `${info.edgeHostnameDomain} (${edgeHostnameId})`
        };
      }
    } catch (error) {
      logger.error({ error, edgeHostnameId }, 'Failed to translate Edge Hostname');
    }
    
    return {
      id: edgeHostnameId,
      name: edgeHostnameId,
      displayName: edgeHostnameId
    };
  }
  
  /**
   * Translate Network List ID to name
   */
  async translateNetworkList(
    networkListId: string,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.networkListCache.get(networkListId);
      if (cached) {
        return {
          id: networkListId,
          name: cached.name,
          displayName: `${cached.name} (${networkListId})`
        };
      }
      
      const info = await this.fetchNetworkListInfo(networkListId, client);
      if (info) {
        return {
          id: networkListId,
          name: info.name,
          displayName: `${info.name} (${networkListId})`
        };
      }
    } catch (error) {
      logger.error({ error, networkListId }, 'Failed to translate Network List');
    }
    
    return {
      id: networkListId,
      name: networkListId,
      displayName: networkListId
    };
  }
  
  /**
   * Translate EdgeWorker ID to name
   */
  async translateEdgeWorker(
    edgeWorkerId: number,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.edgeWorkerCache.get(edgeWorkerId);
      if (cached) {
        return {
          id: edgeWorkerId.toString(),
          name: cached.name,
          displayName: `${cached.name} (${edgeWorkerId})`
        };
      }
      
      const info = await this.fetchEdgeWorkerInfo(edgeWorkerId, client);
      if (info) {
        return {
          id: edgeWorkerId.toString(),
          name: info.name,
          displayName: `${info.name} (${edgeWorkerId})`
        };
      }
    } catch (error) {
      logger.error({ error, edgeWorkerId }, 'Failed to translate EdgeWorker ID');
    }
    
    return {
      id: edgeWorkerId.toString(),
      name: edgeWorkerId.toString(),
      displayName: edgeWorkerId.toString()
    };
  }
  
  /**
   * Translate Certificate Enrollment ID to CN
   */
  async translateEnrollment(
    enrollmentId: number,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.enrollmentCache.get(enrollmentId);
      if (cached) {
        return {
          id: enrollmentId.toString(),
          name: cached.cn,
          displayName: `${cached.cn} (${enrollmentId})`
        };
      }
      
      const info = await this.fetchEnrollmentInfo(enrollmentId, client);
      if (info) {
        return {
          id: enrollmentId.toString(),
          name: info.cn,
          displayName: `${info.cn} (${enrollmentId})`
        };
      }
    } catch (error) {
      logger.error({ error, enrollmentId }, 'Failed to translate Enrollment ID');
    }
    
    return {
      id: enrollmentId.toString(),
      name: enrollmentId.toString(),
      displayName: enrollmentId.toString()
    };
  }
  
  /**
   * Translate GTM Datacenter ID to location
   */
  async translateDatacenter(
    datacenterId: number,
    client: AkamaiClient
  ): Promise<TranslationResult> {
    try {
      const cached = this.datacenterCache.get(datacenterId);
      if (cached) {
        const location = cached.city && cached.country 
          ? `${cached.nickname} - ${cached.city}, ${cached.country}`
          : cached.nickname;
        return {
          id: datacenterId.toString(),
          name: location,
          displayName: `${location} (${datacenterId})`
        };
      }
      
      const info = await this.fetchDatacenterInfo(datacenterId, client);
      if (info) {
        const location = info.city && info.country 
          ? `${info.nickname} - ${info.city}, ${info.country}`
          : info.nickname;
        return {
          id: datacenterId.toString(),
          name: location,
          displayName: `${location} (${datacenterId})`
        };
      }
    } catch (error) {
      logger.error({ error, datacenterId }, 'Failed to translate Datacenter ID');
    }
    
    return {
      id: datacenterId.toString(),
      name: datacenterId.toString(),
      displayName: datacenterId.toString()
    };
  }
  
  /**
   * Batch translate multiple IDs
   */
  async batchTranslate(
    ids: Array<{ id: string; context?: TranslationContext }>,
    client: AkamaiClient,
    options: { maxConcurrency?: number } = {}
  ): Promise<Map<string, TranslationResult>> {
    const { maxConcurrency = 10 } = options;
    const results = new Map<string, TranslationResult>();
    
    // Process in batches
    for (let i = 0; i < ids.length; i += maxConcurrency) {
      const batch = ids.slice(i, i + maxConcurrency);
      const promises = batch.map(({ id, context }) => 
        this.translateId(id, client, context)
          .then(result => results.set(id, result))
          .catch(error => {
            logger.error({ error, id }, 'Failed to translate ID in batch');
            results.set(id, { id, name: id, displayName: id });
          })
      );
      
      await Promise.all(promises);
    }
    
    return results;
  }
  
  /**
   * Enrich object with translated IDs
   */
  async enrichWithAkamaiIds(
    data: any,
    client: AkamaiClient,
    options: {
      maxDepth?: number;
      includeFields?: string[];
      excludeFields?: string[];
      context?: TranslationContext;
    } = {}
  ): Promise<any> {
    const { maxDepth = 5, includeFields, excludeFields, context } = options;
    
    if (!data || typeof data !== 'object' || maxDepth <= 0) {
      return data;
    }
    
    const enriched = Array.isArray(data) ? [...data] : { ...data };
    
    const processField = async (obj: any, field: string, value: any) => {
      // Skip if field is excluded
      if (excludeFields?.includes(field)) return;
      
      // Only process included fields if specified
      if (includeFields && !includeFields.includes(field)) return;
      
      // Check if this looks like an Akamai ID
      if (typeof value === 'string' || typeof value === 'number') {
        const stringValue = value.toString();
        const fieldContext = { ...context, fieldName: field };
        const idType = this.detectIdType(stringValue, fieldContext);
        
        if (idType !== 'unknown') {
          const translated = await this.translateId(stringValue, client, fieldContext);
          if (translated.name !== stringValue) {
            obj[`${field}_displayName`] = translated.displayName;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        obj[field] = await this.enrichWithAkamaiIds(
          value,
          client,
          { ...options, maxDepth: maxDepth - 1 }
        );
      }
    };
    
    if (Array.isArray(enriched)) {
      for (let i = 0; i < enriched.length; i++) {
        enriched[i] = await this.enrichWithAkamaiIds(
          enriched[i],
          client,
          { ...options, maxDepth: maxDepth - 1 }
        );
      }
    } else {
      const promises = Object.entries(enriched).map(([field, value]) =>
        processField(enriched, field, value)
      );
      await Promise.all(promises);
    }
    
    return enriched;
  }
  
  // Existing fetch methods
  private async fetchPropertyInfo(
    propertyId: string,
    client: AkamaiClient
  ): Promise<PropertyInfo | null> {
    const cacheKey = `property:${propertyId}`;
    
    // Check if we already have a pending request
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending as Promise<PropertyInfo | null>;
    }
    
    const request = this._fetchPropertyInfo(propertyId, client);
    this.pendingRequests.set(cacheKey, request);
    
    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async _fetchPropertyInfo(
    propertyId: string,
    client: AkamaiClient
  ): Promise<PropertyInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${propertyId}`,
        headers: {
          'PAPI-Use-Prefixes': 'true'
        }
      });
      
      if (isPapiPropertyDetailsResponse(response)) {
        const property = response.properties.items[0];
        if (property) {
          const info: PropertyInfo = {
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            contractId: property.contractId,
            groupId: property.groupId,
            assetId: property.assetId
          };
          this.propertyCache.set(propertyId, info);
          return info;
        }
      }
    } catch (error) {
      logger.error({ error, propertyId }, 'Failed to fetch property info');
    }
    
    return null;
  }
  
  private async fetchGroupInfo(
    groupId: string,
    client: AkamaiClient
  ): Promise<GroupInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: '/papi/v1/groups',
        headers: {
          'PAPI-Use-Prefixes': 'true'
        }
      });
      
      if (isPapiGroupsResponse(response)) {
        const group = this.findGroupById(response.groups.items, groupId);
        if (group) {
          const info: GroupInfo = {
            groupId: group.groupId,
            groupName: group.groupName,
            contractIds: group.contractIds,
            parentGroupId: group.parentGroupId
          };
          this.groupCache.set(groupId, info);
          return info;
        }
      }
    } catch (error) {
      logger.error({ error, groupId }, 'Failed to fetch group info');
    }
    
    return null;
  }
  
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
  
  private async fetchContractInfo(
    contractId: string,
    client: AkamaiClient
  ): Promise<ContractInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: '/papi/v1/contracts',
        headers: {
          'PAPI-Use-Prefixes': 'true'
        }
      });
      
      if (isPapiContractsResponse(response)) {
        const contract = response.contracts.items.find(c => c.contractId === contractId);
        if (contract) {
          const info: ContractInfo = {
            contractId: contract.contractId,
            contractTypeName: contract.contractTypeName
          };
          this.contractCache.set(contractId, info);
          return info;
        }
      }
    } catch (error) {
      logger.error({ error, contractId }, 'Failed to fetch contract info');
    }
    
    return null;
  }
  
  // New fetch methods for additional ID types
  private async fetchCPCodeInfo(
    cpcodeId: string,
    client: AkamaiClient
  ): Promise<CPCodeInfo | null> {
    try {
      // Extract numeric ID from cpc_12345 format
      const numericId = cpcodeId.replace('cpc_', '');
      
      const response = await client.request({
        method: 'GET',
        path: `/cprg/v1/cpcodes/${numericId}`,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response && response.cpcode) {
        const info: CPCodeInfo = {
          cpcodeId,
          cpcodeName: response.cpcode.cpcodeName || response.cpcode.name,
          description: response.cpcode.description,
          productIds: response.cpcode.productIds
        };
        this.cpCodeCache.set(cpcodeId, info);
        return info;
      }
    } catch (error) {
      logger.error({ error, cpcodeId }, 'Failed to fetch CP Code info');
    }
    
    return null;
  }
  
  private async fetchEdgeHostnameInfo(
    edgeHostnameId: string,
    client: AkamaiClient
  ): Promise<EdgeHostnameInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: '/hapi/v1/edge-hostnames',
        queryParams: {
          includeDetails: 'true'
        }
      });
      
      if (response && response.edgeHostnames) {
        const hostname = response.edgeHostnames.find((h: any) => 
          h.edgeHostnameId === edgeHostnameId
        );
        
        if (hostname) {
          const info: EdgeHostnameInfo = {
            edgeHostnameId,
            edgeHostnameDomain: hostname.edgeHostnameDomain || 
              `${hostname.domainPrefix}.${hostname.domainSuffix}`,
            domainPrefix: hostname.domainPrefix,
            domainSuffix: hostname.domainSuffix
          };
          this.edgeHostnameCache.set(edgeHostnameId, info);
          return info;
        }
      }
    } catch (error) {
      logger.error({ error, edgeHostnameId }, 'Failed to fetch Edge Hostname info');
    }
    
    return null;
  }
  
  private async fetchNetworkListInfo(
    networkListId: string,
    client: AkamaiClient
  ): Promise<NetworkListInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: `/network-list/v2/network-lists/${networkListId}`,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response) {
        const info: NetworkListInfo = {
          networkListId,
          name: response.name,
          type: response.type,
          description: response.description
        };
        this.networkListCache.set(networkListId, info);
        return info;
      }
    } catch (error) {
      logger.error({ error, networkListId }, 'Failed to fetch Network List info');
    }
    
    return null;
  }
  
  private async fetchEdgeWorkerInfo(
    edgeWorkerId: number,
    client: AkamaiClient
  ): Promise<EdgeWorkerInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: `/edgeworkers/v1/ids/${edgeWorkerId}`,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response) {
        const info: EdgeWorkerInfo = {
          edgeWorkerId,
          name: response.name,
          description: response.description,
          groupId: response.groupId
        };
        this.edgeWorkerCache.set(edgeWorkerId, info);
        return info;
      }
    } catch (error) {
      logger.error({ error, edgeWorkerId }, 'Failed to fetch EdgeWorker info');
    }
    
    return null;
  }
  
  private async fetchEnrollmentInfo(
    enrollmentId: number,
    client: AkamaiClient
  ): Promise<EnrollmentInfo | null> {
    try {
      const response = await client.request({
        method: 'GET',
        path: `/cps/v2/enrollments/${enrollmentId}`,
        headers: {
          'Accept': 'application/vnd.akamai.cps.enrollment.v11+json'
        }
      });
      
      if (response && response.csr) {
        const info: EnrollmentInfo = {
          enrollmentId,
          cn: response.csr.cn,
          sans: response.csr.sans,
          status: response.status
        };
        this.enrollmentCache.set(enrollmentId, info);
        return info;
      }
    } catch (error) {
      logger.error({ error, enrollmentId }, 'Failed to fetch Enrollment info');
    }
    
    return null;
  }
  
  private async fetchDatacenterInfo(
    datacenterId: number,
    client: AkamaiClient
  ): Promise<DatacenterInfo | null> {
    try {
      // GTM datacenters are usually part of domain responses
      // This is a simplified example - real implementation would need domain context
      logger.warn({ datacenterId }, 'Datacenter translation requires GTM domain context');
      
      // For now, return null to use fallback
      return null;
    } catch (error) {
      logger.error({ error, datacenterId }, 'Failed to fetch Datacenter info');
    }
    
    return null;
  }
  
  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.propertyCache.clear();
    this.groupCache.clear();
    this.contractCache.clear();
    this.cpCodeCache.clear();
    this.edgeHostnameCache.clear();
    this.networkListCache.clear();
    this.edgeWorkerCache.clear();
    this.enrollmentCache.clear();
    this.datacenterCache.clear();
    logger.info('All ID translation caches cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, { size: number; calculatedSize: number }> {
    return {
      properties: {
        size: this.propertyCache.size,
        calculatedSize: this.propertyCache.calculatedSize
      },
      groups: {
        size: this.groupCache.size,
        calculatedSize: this.groupCache.calculatedSize
      },
      contracts: {
        size: this.contractCache.size,
        calculatedSize: this.contractCache.calculatedSize
      },
      cpCodes: {
        size: this.cpCodeCache.size,
        calculatedSize: this.cpCodeCache.calculatedSize
      },
      edgeHostnames: {
        size: this.edgeHostnameCache.size,
        calculatedSize: this.edgeHostnameCache.calculatedSize
      },
      networkLists: {
        size: this.networkListCache.size,
        calculatedSize: this.networkListCache.calculatedSize
      },
      edgeWorkers: {
        size: this.edgeWorkerCache.size,
        calculatedSize: this.edgeWorkerCache.calculatedSize
      },
      enrollments: {
        size: this.enrollmentCache.size,
        calculatedSize: this.enrollmentCache.calculatedSize
      },
      datacenters: {
        size: this.datacenterCache.size,
        calculatedSize: this.datacenterCache.calculatedSize
      }
    };
  }
}

// Export singleton instance
export const idTranslator = AkamaiIdTranslator.getInstance();