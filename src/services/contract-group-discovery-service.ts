/**
 * CONTRACT/GROUP AUTO-DISCOVERY SERVICE
 * 
 * CODE KAI ARCHITECTURE:
 * Automatically discovers available contracts and groups for customers,
 * caches results for performance, and provides helpful suggestions when
 * invalid IDs are used. This service dramatically improves UX by preventing
 * common 403/404 errors and guiding users to valid resources.
 * 
 * KEY FEATURES:
 * - Auto-discovers contracts and groups per customer
 * - Caches results with smart TTL management
 * - Provides helpful error messages with valid options
 * - Integrates seamlessly with error handling
 * - Supports multi-customer environments
 * 
 * IMPLEMENTATION:
 * - Uses Property Manager API for discovery
 * - Maintains per-customer caches
 * - Provides validation and suggestion methods
 * - Generates user-friendly error messages
 */

import { createLogger } from '../utils/pino-logger';
import { AkamaiClient } from '../akamai-client';
import { getCacheService, UnifiedCacheService } from './unified-cache-service';
import { z } from 'zod';

const logger = createLogger('contract-group-discovery');

/**
 * Contract information
 */
export interface Contract {
  contractId: string;
  contractTypeName?: string;
}

/**
 * Group information
 */
export interface Group {
  groupId: string;
  groupName?: string;
  parentGroupId?: string | null;
  contractIds?: string[];
}

/**
 * Discovery result for a customer
 */
export interface DiscoveryResult {
  contracts: Contract[];
  groups: Group[];
  lastUpdated: Date;
  customer: string;
}

/**
 * Validation result with suggestions
 */
export interface ValidationResult {
  isValid: boolean;
  suggestions?: {
    contracts?: Contract[];
    groups?: Group[];
    message: string;
  };
}

/**
 * Discovery service options
 */
export interface DiscoveryOptions {
  forceRefresh?: boolean;
  includeDetails?: boolean;
}

/**
 * Contract/Group Discovery Service
 */
export class ContractGroupDiscoveryService {
  private static instance: ContractGroupDiscoveryService;
  private cache: UnifiedCacheService | null = null;
  private discoveryInProgress = new Map<string, Promise<DiscoveryResult>>();
  
  // Cache TTLs
  private readonly CACHE_TTL = 3600; // 1 hour for discovered data
  private readonly ERROR_CACHE_TTL = 300; // 5 minutes for error states
  
  private constructor() {
    this.initializeCache();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ContractGroupDiscoveryService {
    if (!ContractGroupDiscoveryService.instance) {
      ContractGroupDiscoveryService.instance = new ContractGroupDiscoveryService();
    }
    return ContractGroupDiscoveryService.instance;
  }

  /**
   * Initialize cache service
   */
  private async initializeCache(): Promise<void> {
    try {
      this.cache = await getCacheService();
    } catch (error) {
      logger.warn('Cache initialization failed, continuing without cache:', error);
    }
  }

  /**
   * Discover contracts and groups for a customer
   */
  async discover(customer: string, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
    const cacheKey = `discovery:${customer}`;
    
    // Check if discovery is already in progress
    if (!options.forceRefresh && this.discoveryInProgress.has(cacheKey)) {
      return this.discoveryInProgress.get(cacheKey)!;
    }
    
    // Check cache if not forcing refresh
    if (!options.forceRefresh && this.cache) {
      const cached = await this.cache.get(cacheKey) as DiscoveryResult | undefined;
      if (cached) {
        logger.debug(`Using cached discovery for customer ${customer}`);
        return cached;
      }
    }
    
    // Start discovery
    const discoveryPromise = this.performDiscovery(customer, options);
    this.discoveryInProgress.set(cacheKey, discoveryPromise);
    
    try {
      const result = await discoveryPromise;
      
      // Cache the result
      if (this.cache) {
        await this.cache.set(cacheKey, result, this.CACHE_TTL);
      }
      
      return result;
    } finally {
      this.discoveryInProgress.delete(cacheKey);
    }
  }

  /**
   * Perform actual discovery
   */
  private async performDiscovery(customer: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    logger.info(`Discovering contracts and groups for customer: ${customer}`);
    
    try {
      const client = new AkamaiClient(customer);
      
      // Fetch contracts
      const contractsPromise = this.fetchContracts(client);
      
      // Fetch groups
      const groupsPromise = this.fetchGroups(client);
      
      // Wait for both
      const [contracts, groups] = await Promise.all([contractsPromise, groupsPromise]);
      
      const result: DiscoveryResult = {
        contracts,
        groups,
        lastUpdated: new Date(),
        customer
      };
      
      logger.info(`Discovered ${contracts.length} contracts and ${groups.length} groups for customer ${customer}`);
      
      return result;
    } catch (error) {
      logger.error(`Discovery failed for customer ${customer}:`, error);
      
      // Cache error state to prevent repeated failures
      if (this.cache) {
        const errorResult: DiscoveryResult = {
          contracts: [],
          groups: [],
          lastUpdated: new Date(),
          customer
        };
        await this.cache.set(`discovery:${customer}`, errorResult, this.ERROR_CACHE_TTL);
      }
      
      throw error;
    }
  }

  /**
   * Fetch contracts from API
   */
  private async fetchContracts(client: AkamaiClient): Promise<Contract[]> {
    try {
      const response = await client.request({
        path: '/papi/v1/contracts',
        method: 'GET'
      });
      
      const parsed = z.object({
        contracts: z.object({
          items: z.array(z.object({
            contractId: z.string(),
            contractTypeName: z.string().optional()
          }))
        })
      }).parse(response);
      
      return parsed.contracts.items.map(item => ({
        contractId: item.contractId,
        contractTypeName: item.contractTypeName
      }));
    } catch (error) {
      logger.warn('Failed to fetch contracts:', error);
      return [];
    }
  }

  /**
   * Fetch groups from API
   */
  private async fetchGroups(client: AkamaiClient): Promise<Group[]> {
    try {
      const response = await client.request({
        path: '/papi/v1/groups',
        method: 'GET'
      });
      
      const parsed = z.object({
        groups: z.object({
          items: z.array(z.object({
            groupId: z.string(),
            groupName: z.string().optional(),
            parentGroupId: z.string().nullable().optional(),
            contractIds: z.array(z.string()).optional()
          }))
        })
      }).parse(response);
      
      return parsed.groups.items.map(item => ({
        groupId: item.groupId,
        groupName: item.groupName,
        parentGroupId: item.parentGroupId,
        contractIds: item.contractIds
      }));
    } catch (error) {
      logger.warn('Failed to fetch groups:', error);
      return [];
    }
  }

  /**
   * Validate a contract ID and provide suggestions if invalid
   */
  async validateContract(contractId: string, customer: string): Promise<ValidationResult> {
    try {
      const discovery = await this.discover(customer);
      const isValid = discovery.contracts.some(c => c.contractId === contractId);
      
      if (isValid) {
        return { isValid: true };
      }
      
      // Provide suggestions
      const suggestions = this.findSimilarContracts(contractId, discovery.contracts);
      
      return {
        isValid: false,
        suggestions: {
          contracts: suggestions.length > 0 ? suggestions : discovery.contracts.slice(0, 5),
          message: this.generateContractSuggestionMessage(contractId, suggestions, discovery.contracts)
        }
      };
    } catch (error) {
      logger.error('Contract validation failed:', error);
      return { isValid: false };
    }
  }

  /**
   * Validate a group ID and provide suggestions if invalid
   */
  async validateGroup(groupId: string, customer: string, contractId?: string): Promise<ValidationResult> {
    try {
      const discovery = await this.discover(customer);
      let relevantGroups = discovery.groups;
      
      // Filter by contract if provided
      if (contractId) {
        relevantGroups = discovery.groups.filter(g => 
          g.contractIds?.includes(contractId) || !g.contractIds
        );
      }
      
      const isValid = relevantGroups.some(g => g.groupId === groupId);
      
      if (isValid) {
        return { isValid: true };
      }
      
      // Provide suggestions
      const suggestions = this.findSimilarGroups(groupId, relevantGroups);
      
      return {
        isValid: false,
        suggestions: {
          groups: suggestions.length > 0 ? suggestions : relevantGroups.slice(0, 5),
          message: this.generateGroupSuggestionMessage(groupId, suggestions, relevantGroups, contractId)
        }
      };
    } catch (error) {
      logger.error('Group validation failed:', error);
      return { isValid: false };
    }
  }

  /**
   * Find contracts with similar IDs
   */
  private findSimilarContracts(contractId: string, contracts: Contract[]): Contract[] {
    // Extract numeric part if present
    const numericPart = contractId.match(/\d+/)?.[0];
    
    if (numericPart) {
      // Find contracts with similar numeric parts
      return contracts.filter(c => c.contractId.includes(numericPart)).slice(0, 3);
    }
    
    // Return contracts that start with similar characters
    const prefix = contractId.substring(0, 5);
    return contracts.filter(c => c.contractId.startsWith(prefix)).slice(0, 3);
  }

  /**
   * Find groups with similar IDs
   */
  private findSimilarGroups(groupId: string, groups: Group[]): Group[] {
    // Extract numeric part if present
    const numericPart = groupId.match(/\d+/)?.[0];
    
    if (numericPart) {
      // Find groups with similar numeric parts
      return groups.filter(g => g.groupId.includes(numericPart)).slice(0, 3);
    }
    
    // Return groups that start with similar characters
    const prefix = groupId.substring(0, 5);
    return groups.filter(g => g.groupId.startsWith(prefix)).slice(0, 3);
  }

  /**
   * Generate helpful contract suggestion message
   */
  private generateContractSuggestionMessage(
    invalidId: string,
    similar: Contract[],
    all: Contract[]
  ): string {
    let message = `Contract '${invalidId}' not found. `;
    
    if (similar.length > 0) {
      message += `Did you mean one of these?\n`;
      similar.forEach(c => {
        message += `  • ${c.contractId}${c.contractTypeName ? ` (${c.contractTypeName})` : ''}\n`;
      });
    } else if (all.length > 0) {
      message += `Available contracts:\n`;
      all.slice(0, 5).forEach(c => {
        message += `  • ${c.contractId}${c.contractTypeName ? ` (${c.contractTypeName})` : ''}\n`;
      });
      if (all.length > 5) {
        message += `  ... and ${all.length - 5} more\n`;
      }
    } else {
      message += `No contracts found for this customer. Check your permissions or customer configuration.`;
    }
    
    message += `\nUse 'property_contract_list' to see all available contracts.`;
    
    return message;
  }

  /**
   * Generate helpful group suggestion message
   */
  private generateGroupSuggestionMessage(
    invalidId: string,
    similar: Group[],
    all: Group[],
    contractId?: string
  ): string {
    let message = `Group '${invalidId}' not found`;
    
    if (contractId) {
      message += ` for contract '${contractId}'`;
    }
    
    message += `. `;
    
    if (similar.length > 0) {
      message += `Did you mean one of these?\n`;
      similar.forEach(g => {
        message += `  • ${g.groupId}${g.groupName ? ` - ${g.groupName}` : ''}\n`;
      });
    } else if (all.length > 0) {
      message += `Available groups:\n`;
      all.slice(0, 5).forEach(g => {
        message += `  • ${g.groupId}${g.groupName ? ` - ${g.groupName}` : ''}\n`;
      });
      if (all.length > 5) {
        message += `  ... and ${all.length - 5} more\n`;
      }
    } else {
      message += `No groups found`;
      if (contractId) {
        message += ` for this contract`;
      }
      message += `. Check your permissions or try a different contract.`;
    }
    
    message += `\nUse 'property_group_list' to see all available groups.`;
    
    return message;
  }

  /**
   * Get discovery results for error enhancement
   */
  async getDiscoveryForError(customer: string): Promise<{
    contracts: string[];
    groups: string[];
  } | null> {
    try {
      const discovery = await this.discover(customer);
      return {
        contracts: discovery.contracts.slice(0, 5).map(c => 
          `${c.contractId}${c.contractTypeName ? ` (${c.contractTypeName})` : ''}`
        ),
        groups: discovery.groups.slice(0, 5).map(g => 
          `${g.groupId}${g.groupName ? ` - ${g.groupName}` : ''}`
        )
      };
    } catch (error) {
      logger.warn('Failed to get discovery for error enhancement:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific customer
   */
  async clearCache(customer: string): Promise<void> {
    if (this.cache) {
      await this.cache.delete(`discovery:${customer}`);
    }
  }

  /**
   * Clear all discovery caches
   */
  async clearAllCaches(): Promise<void> {
    if (this.cache) {
      await this.cache.invalidatePattern('discovery:*');
    }
  }

  /**
   * Get groups for a specific contract
   */
  async getGroupsForContract(contractId: string, customer: string): Promise<Group[]> {
    const discovery = await this.discover(customer);
    return discovery.groups.filter(g => 
      g.contractIds?.includes(contractId) || !g.contractIds
    );
  }

  /**
   * Check if account switching might be needed
   */
  async checkAccountSwitching(customer: string, error: any): Promise<string | null> {
    // If we get a 403 and discovery also fails, it might be an account switching issue
    if (error?.status === 403) {
      try {
        await this.discover(customer);
        return null; // Discovery worked, so it's not an account switching issue
      } catch (discoveryError: any) {
        if (discoveryError?.status === 403) {
          return `Account switching may be required. Ensure 'account-switch-key' is configured in the [${customer}] section of .edgerc`;
        }
      }
    }
    return null;
  }
}

// Export singleton instance
export const contractGroupDiscovery = ContractGroupDiscoveryService.getInstance();