/**
 * Consolidated Security Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates network lists and AppSec tools
 * - Provides type-safe security API interactions
 * - Implements proper multi-tenant isolation
 * - Eliminates 'unknown' type errors through schemas
 * 
 * This module handles Network Lists (IP/Geo/ASN), WAF policies,
 * and security configuration management.
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  ListRequestSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * Security-specific schemas
 */
const NetworkListTypeSchema = z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']);

const NetworkEnvironmentSchema = z.enum(['STAGING', 'PRODUCTION']);

const CreateNetworkListSchema = CustomerSchema.extend({
  name: z.string().min(1).max(128),
  type: NetworkListTypeSchema,
  description: z.string().optional(),
  elements: z.array(z.string()).optional().default([]),
  contractId: z.string(),
  groupId: z.number().int().positive()
});

const UpdateNetworkListSchema = CustomerSchema.extend({
  networkListId: z.string(),
  elements: z.array(z.string()),
  mode: z.enum(['append', 'replace', 'remove']).default('replace'),
  description: z.string().optional()
});

const ActivateNetworkListSchema = CustomerSchema.extend({
  networkListId: z.string(),
  network: NetworkEnvironmentSchema,
  comments: z.string().optional(),
  notificationRecipients: z.array(z.string().email()).optional()
});

const GetNetworkListSchema = CustomerSchema.extend({
  networkListId: z.string(),
  includeElements: z.boolean().optional().default(false)
});

const CreateAppSecConfigSchema = CustomerSchema.extend({
  configName: z.string().min(1).max(128),
  configDescription: z.string().optional(),
  contractId: z.string(),
  groupId: z.number().int().positive(),
  hostnames: z.array(z.string())
});

const CreateWAFPolicySchema = CustomerSchema.extend({
  configId: z.number().int().positive(),
  version: z.number().int().positive(),
  policyName: z.string(),
  policyMode: z.enum(['ASE_AUTO', 'ASE_MANUAL', 'KRS']),
  paranoidLevel: z.number().int().min(1).max(4).optional()
});

/**
 * Security response schemas
 */
const NetworkListSchema = z.object({
  networkListId: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  elementCount: z.number(),
  readOnly: z.boolean(),
  activationStatus: z.string().optional(),
  syncPoint: z.number().optional()
});

const NetworkListElementsSchema = NetworkListSchema.extend({
  elements: z.array(z.string())
});

const ActivationStatusSchema = z.object({
  activationId: z.number(),
  status: z.string(),
  network: z.string(),
  createdDate: z.string(),
  createdBy: z.string()
});

const AppSecConfigSchema = z.object({
  configId: z.number(),
  configName: z.string(),
  configDescription: z.string().optional(),
  productionVersion: z.number().optional(),
  stagingVersion: z.number().optional(),
  latestVersion: z.number()
});

/**
 * Consolidated security tools implementation
 */
export class ConsolidatedSecurityTools extends BaseTool {
  protected readonly domain = 'security';

  /**
   * List all network lists
   */
  async listNetworkLists(args: z.infer<typeof ListRequestSchema> & {
    type?: string;
    search?: string;
    includeElements?: boolean;
  }): Promise<MCPToolResponse> {
    const params = ListRequestSchema.parse(args);

    return this.executeStandardOperation(
      'list-network-lists',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/network-list/v2/network-lists',
            method: 'GET',
            schema: z.object({
              networkLists: z.array(NetworkListSchema)
            }),
            queryParams: {
              ...(args.type && { listType: args.type }),
              ...(args.search && { search: args.search }),
              ...(args.includeElements && { includeElements: 'true' }),
              ...(params.limit && { limit: params.limit.toString() }),
              ...(params.offset && { offset: params.offset.toString() })
            }
          }
        );

        return {
          networkLists: response.networkLists.map(list => ({
            networkListId: list.networkListId,
            name: list.name,
            type: list.type,
            description: list.description,
            elementCount: list.elementCount,
            readOnly: list.readOnly,
            activationStatus: list.activationStatus,
            lastModified: list.syncPoint ? new Date(list.syncPoint).toISOString() : undefined
          })),
          totalCount: response.networkLists.length
        };
      },
      {
        customer: params.customer,
        format: params.format,
        cacheKey: (p) => `network-lists:list:${args.type || 'all'}:${args.search || ''}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Get network list details
   */
  async getNetworkList(args: z.infer<typeof GetNetworkListSchema>): Promise<MCPToolResponse> {
    const params = GetNetworkListSchema.parse(args);

    return this.executeStandardOperation(
      'get-network-list',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/network-list/v2/network-lists/${params.networkListId}`,
            method: 'GET',
            schema: params.includeElements ? NetworkListElementsSchema : NetworkListSchema,
            queryParams: {
              ...(params.includeElements && { includeElements: 'true' })
            }
          }
        );

        const result: any = {
          networkListId: response.networkListId,
          name: response.name,
          type: response.type,
          description: response.description,
          elementCount: response.elementCount,
          readOnly: response.readOnly,
          activationStatus: response.activationStatus
        };

        if (params.includeElements && 'elements' in response) {
          result.elements = response.elements;
        }

        return result;
      },
      {
        customer: params.customer,
        cacheKey: (p) => `network-list:${p.networkListId}:${p.includeElements ? 'full' : 'info'}`,
        cacheTtl: 600 // 10 minutes
      }
    );
  }

  /**
   * Create a new network list
   */
  async createNetworkList(args: z.infer<typeof CreateNetworkListSchema>): Promise<MCPToolResponse> {
    const params = CreateNetworkListSchema.parse(args);

    return this.executeStandardOperation(
      'create-network-list',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/network-list/v2/network-lists',
            method: 'POST',
            schema: z.object({
              networkListId: z.string(),
              activationStatus: z.string().optional()
            }),
            body: {
              name: params.name,
              type: params.type,
              description: params.description,
              list: params.elements || []
            },
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId.toString()
            }
          }
        );

        // Invalidate list cache
        await this.invalidateCache(['network-lists:list:*']);

        return {
          networkListId: response.networkListId,
          name: params.name,
          type: params.type,
          elementCount: params.elements?.length || 0,
          message: `✅ Created ${params.type} network list "${params.name}" with ID ${response.networkListId}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Update network list elements
   */
  async updateNetworkList(args: z.infer<typeof UpdateNetworkListSchema>): Promise<MCPToolResponse> {
    const params = UpdateNetworkListSchema.parse(args);

    return this.executeStandardOperation(
      'update-network-list',
      params,
      async (client) => {
        // Get current list if mode is append/remove
        let currentElements: string[] = [];
        if (params.mode !== 'replace') {
          const currentList = await this.getNetworkList({
            networkListId: params.networkListId,
            includeElements: true,
            customer: params.customer
          });

          if (currentList.content?.[0]?.type === 'text') {
            const data = JSON.parse(currentList.content[0].text || '{}');
            currentElements = data.elements || [];
          }
        }

        // Calculate final elements based on mode
        let finalElements: string[];
        if (params.mode === 'append') {
          finalElements = [...new Set([...currentElements, ...params.elements])];
        } else if (params.mode === 'remove') {
          const toRemove = new Set(params.elements);
          finalElements = currentElements.filter(el => !toRemove.has(el));
        } else {
          finalElements = params.elements;
        }

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/network-list/v2/network-lists/${params.networkListId}`,
            method: 'PUT',
            schema: z.object({
              networkListId: z.string(),
              syncPoint: z.number()
            }),
            body: {
              list: finalElements,
              ...(params.description && { description: params.description })
            }
          }
        );

        // Invalidate caches
        await this.invalidateCache([
          `network-list:${params.networkListId}:*`,
          'network-lists:list:*'
        ]);

        const changeCount = params.mode === 'append' 
          ? params.elements.length
          : params.mode === 'remove'
          ? params.elements.length
          : finalElements.length;

        return {
          networkListId: response.networkListId,
          mode: params.mode,
          changeCount,
          totalElements: finalElements.length,
          message: `✅ Updated network list ${params.networkListId}: ${params.mode} ${changeCount} elements (total: ${finalElements.length})`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Activate network list to staging or production
   */
  async activateNetworkList(args: z.infer<typeof ActivateNetworkListSchema>): Promise<MCPToolResponse> {
    const params = ActivateNetworkListSchema.parse(args);

    return this.executeStandardOperation(
      'activate-network-list',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/network-list/v2/network-lists/${params.networkListId}/environments/${params.network}/activate`,
            method: 'POST',
            schema: z.object({
              activationId: z.number(),
              activationStatus: z.string(),
              syncPoint: z.number()
            }),
            body: {
              comments: params.comments || `Activated via MCP on ${new Date().toISOString()}`,
              notificationRecipients: params.notificationRecipients || []
            }
          }
        );

        // Invalidate network list cache
        await this.invalidateCache([
          `network-list:${params.networkListId}:*`,
          'network-lists:list:*'
        ]);

        return {
          networkListId: params.networkListId,
          activationId: response.activationId,
          network: params.network,
          status: response.activationStatus,
          message: `✅ Network list ${params.networkListId} activation to ${params.network} submitted (ID: ${response.activationId})`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Get network list activation status
   */
  async getNetworkListActivationStatus(args: {
    networkListId: string;
    activationId: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      networkListId: z.string(),
      activationId: z.number(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-activation-status',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/network-list/v2/network-lists/${params.networkListId}/activations/${params.activationId}`,
            method: 'GET',
            schema: ActivationStatusSchema
          }
        );

        const statusEmoji = {
          'ACTIVATED': '✅',
          'PENDING': '⏳',
          'FAILED': '❌',
          'DEACTIVATED': '🔴',
          'ABORTED': '⛔'
        }[response.status] || '❓';

        return {
          networkListId: params.networkListId,
          activationId: response.activationId,
          status: response.status,
          statusEmoji,
          network: response.network,
          createdDate: response.createdDate,
          createdBy: response.createdBy,
          message: `${statusEmoji} Activation ${params.activationId} status: ${response.status}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `activation:${p.networkListId}:${p.activationId}`,
        cacheTtl: 30 // 30 seconds for status checks
      }
    );
  }

  /**
   * Validate geographic codes
   */
  async validateGeographicCodes(args: {
    codes: string[];
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      codes: z.array(z.string()),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'validate-geo-codes',
      params,
      async (_client) => {
        // Validate against known country/continent codes
        const validCountryCodes = new Set([
          'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'IN', 'BR', 'MX',
          'AU', 'NZ', 'KR', 'SG', 'HK', 'TW', 'TH', 'MY', 'ID', 'PH', 'VN'
        ]);

        const validContinentCodes = new Set([
          'AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'
        ]);

        const validUSStates = new Set([
          'US-AL', 'US-AK', 'US-AZ', 'US-AR', 'US-CA', 'US-CO', 'US-CT', 'US-DE',
          'US-FL', 'US-GA', 'US-HI', 'US-ID', 'US-IL', 'US-IN', 'US-IA', 'US-KS',
          'US-KY', 'US-LA', 'US-ME', 'US-MD', 'US-MA', 'US-MI', 'US-MN', 'US-MS',
          'US-MO', 'US-MT', 'US-NE', 'US-NV', 'US-NH', 'US-NJ', 'US-NM', 'US-NY',
          'US-NC', 'US-ND', 'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI', 'US-SC',
          'US-SD', 'US-TN', 'US-TX', 'US-UT', 'US-VT', 'US-VA', 'US-WA', 'US-WV',
          'US-WI', 'US-WY', 'US-DC'
        ]);

        const results = params.codes.map(code => {
          const upperCode = code.toUpperCase();
          let valid = false;
          let type = 'unknown';

          if (validCountryCodes.has(upperCode)) {
            valid = true;
            type = 'country';
          } else if (validContinentCodes.has(upperCode)) {
            valid = true;
            type = 'continent';
          } else if (validUSStates.has(upperCode)) {
            valid = true;
            type = 'us-state';
          }

          return {
            code,
            valid,
            type,
            normalized: upperCode
          };
        });

        const invalid = results.filter(r => !r.valid);
        const valid = results.filter(r => r.valid);

        return {
          totalCodes: params.codes.length,
          validCodes: valid.length,
          invalidCodes: invalid.length,
          results,
          summary: {
            countries: valid.filter(r => r.type === 'country').length,
            continents: valid.filter(r => r.type === 'continent').length,
            usStates: valid.filter(r => r.type === 'us-state').length
          },
          message: invalid.length > 0
            ? `⚠️ ${invalid.length} invalid codes: ${invalid.map(r => r.code).join(', ')}`
            : `✅ All ${params.codes.length} geographic codes are valid`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Get ASN (Autonomous System Number) information
   */
  async getASNInformation(args: {
    asns: number[];
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      asns: z.array(z.number()),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-asn-info',
      params,
      async (_client) => {
        // Simulated ASN lookup (in production, this would query an ASN database)
        const asnInfo: Record<number, any> = {
          15169: { name: 'Google LLC', country: 'US', type: 'Content' },
          16509: { name: 'Amazon.com, Inc.', country: 'US', type: 'Cloud' },
          8075: { name: 'Microsoft Corporation', country: 'US', type: 'Cloud' },
          13335: { name: 'Cloudflare, Inc.', country: 'US', type: 'CDN' },
          20940: { name: 'Akamai International B.V.', country: 'NL', type: 'CDN' },
          32934: { name: 'Facebook, Inc.', country: 'US', type: 'Content' },
          16550: { name: 'Tiggee LLC', country: 'US', type: 'Hosting' },
          701: { name: 'Verizon Business', country: 'US', type: 'ISP' },
          7922: { name: 'Comcast Cable', country: 'US', type: 'ISP' }
        };

        const results = params.asns.map(asn => {
          const info = asnInfo[asn];
          return {
            asn,
            found: !!info,
            ...(info || { name: 'Unknown', country: 'Unknown', type: 'Unknown' })
          };
        });

        return {
          asns: results,
          totalQueried: params.asns.length,
          found: results.filter(r => r.found).length,
          notFound: results.filter(r => !r.found).length,
          byType: {
            CDN: results.filter(r => r.type === 'CDN').length,
            Cloud: results.filter(r => r.type === 'Cloud').length,
            Content: results.filter(r => r.type === 'Content').length,
            ISP: results.filter(r => r.type === 'ISP').length,
            Hosting: results.filter(r => r.type === 'Hosting').length
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `asn-info:${params.asns.sort().join(',')}`,
        cacheTtl: 3600 // 1 hour - ASN info doesn't change often
      }
    );
  }

  /**
   * List Application Security configurations
   */
  async listAppSecConfigurations(args: {
    contractId?: string;
    groupId?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: z.string().optional(),
      groupId: z.number().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-appsec-configs',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/appsec/v1/configs',
            method: 'GET',
            schema: z.object({
              configurations: z.array(AppSecConfigSchema)
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId.toString() })
            }
          }
        );

        return {
          configurations: response.configurations.map(config => ({
            configId: config.configId,
            configName: config.configName,
            description: config.configDescription,
            latestVersion: config.latestVersion,
            productionVersion: config.productionVersion,
            stagingVersion: config.stagingVersion,
            hasActiveVersion: !!(config.productionVersion || config.stagingVersion)
          })),
          totalCount: response.configurations.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `appsec-configs:list:${params.contractId || 'all'}:${params.groupId || 'all'}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Create a new WAF policy
   */
  async createWAFPolicy(args: z.infer<typeof CreateWAFPolicySchema>): Promise<MCPToolResponse> {
    const params = CreateWAFPolicySchema.parse(args);

    return this.executeStandardOperation(
      'create-waf-policy',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/appsec/v1/configs/${params.configId}/versions/${params.version}/security-policies`,
            method: 'POST',
            schema: z.object({
              policyId: z.string(),
              policyName: z.string()
            }),
            body: {
              policyName: params.policyName,
              policyPrefix: params.policyName.substring(0, 4).toUpperCase(),
              defaultSettings: true,
              mode: params.policyMode,
              ...(params.paranoidLevel && { paranoidLevel: params.paranoidLevel })
            }
          }
        );

        // Invalidate config cache
        await this.invalidateCache([
          `appsec-config:${params.configId}:*`,
          'appsec-configs:list:*'
        ]);

        return {
          configId: params.configId,
          version: params.version,
          policyId: response.policyId,
          policyName: response.policyName,
          mode: params.policyMode,
          message: `✅ Created ${params.policyMode} WAF policy "${params.policyName}" with ID ${response.policyId}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }
}

// Export singleton instance
export const consolidatedSecurityTools = new ConsolidatedSecurityTools();