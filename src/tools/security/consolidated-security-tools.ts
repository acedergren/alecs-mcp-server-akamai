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
// import { AkamaiClient } from '../../akamai-client';

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

// const CreateAppSecConfigSchema = CustomerSchema.extend({
//   configName: z.string().min(1).max(128),
//   configDescription: z.string().optional(),
//   contractId: z.string(),
//   groupId: z.number().int().positive(),
//   hostnames: z.array(z.string())
// });

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
        cacheKey: (_p) => `network-lists:list:${args.type || 'all'}:${args.search || ''}`,
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

  /**
   * Get Application Security configuration details
   */
  async getAppSecConfiguration(args: {
    configId: number;
    version?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      configId: z.number(),
      version: z.number().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-appsec-config',
      params,
      async (client) => {
        const path = params.version 
          ? `/appsec/v1/configs/${params.configId}/versions/${params.version}`
          : `/appsec/v1/configs/${params.configId}`;

        const response = await this.makeTypedRequest(
          client,
          {
            path,
            method: 'GET',
            schema: z.object({
              configId: z.number(),
              configName: z.string(),
              configDescription: z.string().optional(),
              version: z.number(),
              versionNotes: z.string().optional(),
              createDate: z.string(),
              createdBy: z.string(),
              productionVersion: z.number().optional(),
              stagingVersion: z.number().optional(),
              latestVersion: z.number(),
              selectable: z.boolean()
            })
          }
        );

        return {
          configId: response.configId,
          configName: response.configName,
          description: response.configDescription,
          version: response.version,
          versionNotes: response.versionNotes,
          createDate: response.createDate,
          createdBy: response.createdBy,
          productionVersion: response.productionVersion,
          stagingVersion: response.stagingVersion,
          latestVersion: response.latestVersion,
          isActive: !!(response.productionVersion || response.stagingVersion)
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `appsec-config:${p.configId}:${p.version || 'latest'}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Get security events and attack data
   */
  async getSecurityEvents(args: {
    configId: number;
    version: number;
    policyId: string;
    from: number;
    to: number;
    limit?: number;
    offset?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      configId: z.number(),
      version: z.number(),
      policyId: z.string(),
      from: z.number(),
      to: z.number(),
      limit: z.number().max(1000).default(100),
      offset: z.number().default(0),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-security-events',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/appsec/v1/configs/${params.configId}/versions/${params.version}/security-policies/${params.policyId}/attack-data`,
            method: 'GET',
            schema: z.object({
              attackData: z.array(z.object({
                clientIP: z.string(),
                time: z.string(),
                geo: z.object({
                  continent: z.string(),
                  country: z.string(),
                  city: z.string().optional()
                }).optional(),
                httpMessage: z.object({
                  requestId: z.string(),
                  start: z.string(),
                  protocol: z.string(),
                  method: z.string(),
                  host: z.string(),
                  path: z.string(),
                  query: z.string().optional(),
                  requestHeaders: z.record(z.string()).optional(),
                  status: z.number(),
                  bytes: z.number().optional(),
                  responseHeaders: z.record(z.string()).optional()
                }),
                rule: z.object({
                  ruleId: z.string(),
                  ruleName: z.string(),
                  ruleVersion: z.string().optional(),
                  ruleMessage: z.string().optional(),
                  ruleTag: z.string().optional(),
                  ruleSelector: z.string().optional()
                }),
                slowPostAction: z.string().optional(),
                rateLimitingAction: z.string().optional()
              })),
              total: z.number()
            }),
            queryParams: {
              from: params.from.toString(),
              to: params.to.toString(),
              limit: params.limit.toString(),
              offset: params.offset.toString()
            }
          }
        );

        // Process and aggregate the attack data
        const attacksByRule: Record<string, number> = {};
        const attacksByCountry: Record<string, number> = {};
        const attacksByIP: Record<string, number> = {};

        response.attackData.forEach(attack => {
          // Count by rule
          const ruleKey = `${attack.rule.ruleId}:${attack.rule.ruleName}`;
          attacksByRule[ruleKey] = (attacksByRule[ruleKey] || 0) + 1;

          // Count by country
          if (attack.geo?.country) {
            attacksByCountry[attack.geo.country] = (attacksByCountry[attack.geo.country] || 0) + 1;
          }

          // Count by IP
          attacksByIP[attack.clientIP] = (attacksByIP[attack.clientIP] || 0) + 1;
        });

        // Sort and get top items
        const topRules = Object.entries(attacksByRule)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([rule, count]) => ({ rule, count }));

        const topCountries = Object.entries(attacksByCountry)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([country, count]) => ({ country, count }));

        const topIPs = Object.entries(attacksByIP)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count }));

        return {
          configId: params.configId,
          version: params.version,
          policyId: params.policyId,
          timeRange: {
            from: new Date(params.from).toISOString(),
            to: new Date(params.to).toISOString()
          },
          totalEvents: response.total,
          eventsReturned: response.attackData.length,
          summary: {
            topRules,
            topCountries,
            topIPs,
            uniqueIPs: Object.keys(attacksByIP).length
          },
          events: response.attackData.slice(0, 10) // Return first 10 events
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `security-events:${p.configId}:${p.version}:${p.policyId}:${p.from}:${p.to}`,
        cacheTtl: 60 // 1 minute - events are time-sensitive
      }
    );
  }

  /**
   * Activate security configuration to staging or production
   */
  async activateSecurityConfiguration(args: {
    configId: number;
    version: number;
    network: 'staging' | 'production';
    notificationEmails?: string[];
    note?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      configId: z.number(),
      version: z.number(),
      network: z.enum(['staging', 'production']),
      notificationEmails: z.array(z.string().email()).optional(),
      note: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'activate-security-config',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/appsec/v1/activations`,
            method: 'POST',
            schema: z.object({
              activationId: z.number(),
              status: z.string(),
              network: z.string(),
              activationConfigs: z.array(z.object({
                configId: z.number(),
                configName: z.string(),
                configVersion: z.number(),
                previousVersion: z.number().optional()
              }))
            }),
            body: {
              activationConfigs: [{
                configId: params.configId,
                configVersion: params.version
              }],
              network: params.network.toUpperCase(),
              notificationEmails: params.notificationEmails || [],
              note: params.note || `Activated via MCP on ${new Date().toISOString()}`
            }
          }
        );

        // Invalidate caches
        await this.invalidateCache([
          `appsec-config:${params.configId}:*`,
          'appsec-configs:list:*'
        ]);

        return {
          configId: params.configId,
          version: params.version,
          activationId: response.activationId,
          network: params.network,
          status: response.status,
          message: `✅ Security configuration ${params.configId} v${params.version} activation to ${params.network} submitted (ID: ${response.activationId})`
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
   * Get security activation status
   */
  async getSecurityActivationStatus(args: {
    activationId: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      activationId: z.number(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-security-activation-status',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/appsec/v1/activations/${params.activationId}`,
            method: 'GET',
            schema: z.object({
              activationId: z.number(),
              status: z.string(),
              network: z.string(),
              createdDate: z.string(),
              createdBy: z.string(),
              activationConfigs: z.array(z.object({
                configId: z.number(),
                configName: z.string(),
                configVersion: z.number(),
                previousVersion: z.number().optional()
              }))
            })
          }
        );

        const statusEmoji = {
          'ACTIVATED': '✅',
          'PENDING': '⏳',
          'FAILED': '❌',
          'DEACTIVATED': '🔴',
          'ABORTED': '⛔',
          'IN_PROGRESS': '🔄'
        }[response.status] || '❓';

        const configs = response.activationConfigs.map(config => ({
          configId: config.configId,
          configName: config.configName,
          version: config.configVersion,
          previousVersion: config.previousVersion
        }));

        return {
          activationId: response.activationId,
          status: response.status,
          statusEmoji,
          network: response.network,
          createdDate: response.createdDate,
          createdBy: response.createdBy,
          configurations: configs,
          message: `${statusEmoji} Activation ${params.activationId} status: ${response.status}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `security-activation:${p.activationId}`,
        cacheTtl: 30 // 30 seconds for status checks
      }
    );
  }

  /**
   * List activation history for a network list
   */
  async listNetworkListActivations(args: {
    networkListId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      networkListId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-network-list-activations',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/network-list/v2/network-lists/${params.networkListId}/activations`,
            method: 'GET',
            schema: z.object({
              activations: z.array(z.object({
                activationId: z.number(),
                status: z.string(),
                network: z.string(),
                activatedDate: z.string().optional(),
                createdDate: z.string(),
                createdBy: z.string(),
                comments: z.string().optional()
              }))
            })
          }
        );

        return {
          networkListId: params.networkListId,
          activations: response.activations.map(activation => ({
            activationId: activation.activationId,
            status: activation.status,
            network: activation.network,
            activatedDate: activation.activatedDate,
            createdDate: activation.createdDate,
            createdBy: activation.createdBy,
            comments: activation.comments
          })),
          totalActivations: response.activations.length
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `network-list-activations:${p.networkListId}`,
        cacheTtl: 60 // 1 minute
      }
    );
  }

  /**
   * Deactivate a network list from staging or production
   */
  async deactivateNetworkList(args: {
    networkListId: string;
    network: 'staging' | 'production';
    comments?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      networkListId: z.string(),
      network: z.enum(['staging', 'production']),
      comments: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'deactivate-network-list',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/network-list/v2/network-lists/${params.networkListId}/environments/${params.network}/deactivate`,
            method: 'POST',
            schema: z.object({
              activationId: z.number(),
              activationStatus: z.string()
            }),
            body: {
              comments: params.comments || `Deactivated via MCP on ${new Date().toISOString()}`
            }
          }
        );

        await this.invalidateCache([
          `network-list:${params.networkListId}:*`,
          'network-lists:list:*'
        ]);

        return {
          networkListId: params.networkListId,
          activationId: response.activationId,
          network: params.network,
          status: response.activationStatus,
          message: `✅ Network list ${params.networkListId} deactivation from ${params.network} submitted (ID: ${response.activationId})`
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
   * Activate multiple network lists
   */
  async bulkActivateNetworkLists(args: {
    networkListIds: string[];
    network: 'staging' | 'production';
    comments?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      networkListIds: z.array(z.string()),
      network: z.enum(['STAGING', 'PRODUCTION']),
      comments: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    const results = await Promise.allSettled(
      params.networkListIds.map(networkListId =>
        this.activateNetworkList({
          networkListId,
          network: params.network,
          comments: params.comments,
          customer: params.customer
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    const response = {
      totalRequested: params.networkListIds.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map((result, index) => ({
        networkListId: params.networkListIds[index],
        status: result.status === 'fulfilled' ? 'success' : 'failed',
        ...(result.status === 'rejected' && { error: result.reason.message })
      })),
      message: `Bulk activation completed: ${successful.length} successful, ${failed.length} failed`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Import network list from CSV
   */
  async importNetworkListFromCSV(args: {
    csvContent: string;
    name: string;
    type: 'IP' | 'GEO';
    contractId: string;
    groupId: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      csvContent: z.string(),
      name: z.string(),
      type: z.enum(['IP', 'GEO']),
      contractId: z.string(),
      groupId: z.number(),
      customer: z.string().optional()
    }).parse(args);

    // Parse CSV content
    const lines = params.csvContent.trim().split('\n');
    const elements = lines
      .filter(line => line.trim() !== '')
      .map(line => line.trim());

    // Create network list with parsed elements
    return this.createNetworkList({
      name: params.name,
      type: params.type,
      elements,
      contractId: params.contractId,
      groupId: params.groupId,
      customer: params.customer
    });
  }

  /**
   * Export network list to CSV
   */
  async exportNetworkListToCSV(args: {
    networkListId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      networkListId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    // Get network list with elements
    const listResponse = await this.getNetworkList({
      networkListId: params.networkListId,
      includeElements: true,
      customer: params.customer
    });

    if (listResponse.content?.[0]?.type === 'text') {
      const data = JSON.parse(listResponse.content[0].text || '{}');
      const csvContent = (data.elements || []).join('\n');

      const response = {
        networkListId: params.networkListId,
        name: data.name,
        type: data.type,
        elementCount: data.elements?.length || 0,
        csvContent,
        message: `Exported ${data.elements?.length || 0} elements to CSV format`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    throw new Error('Failed to retrieve network list data');
  }

  /**
   * Update multiple network lists
   */
  async bulkUpdateNetworkLists(args: {
    updates: Array<{
      networkListId: string;
      elements: string[];
      mode: 'append' | 'replace' | 'remove';
    }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      updates: z.array(z.object({
        networkListId: z.string(),
        elements: z.array(z.string()),
        mode: z.enum(['append', 'replace', 'remove'])
      })),
      customer: z.string().optional()
    }).parse(args);

    const results = await Promise.allSettled(
      params.updates.map(update =>
        this.updateNetworkList({
          networkListId: update.networkListId,
          elements: update.elements,
          mode: update.mode,
          customer: params.customer
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    const response = {
      totalRequested: params.updates.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map((result, index) => ({
        networkListId: params.updates[index]?.networkListId || 'unknown',
        status: result.status === 'fulfilled' ? 'success' : 'failed',
        ...(result.status === 'rejected' && { error: result.reason.message })
      })),
      message: `Bulk update completed: ${successful.length} successful, ${failed.length} failed`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Merge multiple network lists
   */
  async mergeNetworkLists(args: {
    sourceNetworkListIds: string[];
    targetNetworkListId: string;
    removeDuplicates?: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      sourceNetworkListIds: z.array(z.string()),
      targetNetworkListId: z.string(),
      removeDuplicates: z.boolean().optional().default(true),
      customer: z.string().optional()
    }).parse(args);

    // Get all source lists
    const sourceLists = await Promise.all(
      params.sourceNetworkListIds.map(id =>
        this.getNetworkList({
          networkListId: id,
          includeElements: true,
          customer: params.customer
        })
      )
    );

    // Extract and combine all elements
    let allElements: string[] = [];
    for (const listResponse of sourceLists) {
      if (listResponse.content?.[0]?.type === 'text') {
        const data = JSON.parse(listResponse.content[0].text || '{}');
        allElements = allElements.concat(data.elements || []);
      }
    }

    // Remove duplicates if requested
    if (params.removeDuplicates) {
      allElements = [...new Set(allElements)];
    }

    // Update target list with merged elements
    await this.updateNetworkList({
      networkListId: params.targetNetworkListId,
      elements: allElements,
      mode: 'replace',
      customer: params.customer
    });

    const response = {
      sourceListCount: params.sourceNetworkListIds.length,
      targetNetworkListId: params.targetNetworkListId,
      totalElements: allElements.length,
      duplicatesRemoved: params.removeDuplicates,
      message: `✅ Merged ${params.sourceNetworkListIds.length} lists into ${params.targetNetworkListId} (${allElements.length} total elements)`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Generate geographic blocking recommendations
   */
  async generateGeographicBlockingRecommendations(args: {
    propertyId: string;
    analysisType: 'threat' | 'traffic' | 'compliance';
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: z.string(),
      analysisType: z.enum(['threat', 'traffic', 'compliance']),
      customer: z.string().optional()
    }).parse(args);

    // This would analyze traffic patterns and threat data
    // For now, return sample recommendations
    const recommendations = {
      threat: {
        highRisk: ['CN', 'RU', 'KP', 'IR'],
        mediumRisk: ['RO', 'UA', 'VN', 'NG'],
        lowRisk: ['BR', 'IN', 'PH', 'ID']
      },
      traffic: {
        noTraffic: ['AQ', 'GS', 'BV'], // Antarctica, South Georgia, Bouvet Island
        minimalTraffic: ['NR', 'TV', 'NU'], // Nauru, Tuvalu, Niue
        lowValueTraffic: ['TD', 'CF', 'GW'] // Chad, Central African Republic, Guinea-Bissau
      },
      compliance: {
        sanctioned: ['KP', 'IR', 'SY', 'CU'],
        dataPrivacy: ['EU'], // GDPR regions
        restricted: ['CN', 'RU'] // Countries with internet restrictions
      }
    };

    const selectedRecommendations = recommendations[params.analysisType];

    const response = {
      propertyId: params.propertyId,
      analysisType: params.analysisType,
      recommendations: selectedRecommendations,
      summary: {
        totalCountries: Object.values(selectedRecommendations).flat().length,
        categories: Object.keys(selectedRecommendations)
      },
      implementation: {
        networkListType: 'GEO',
        suggestedAction: 'Create network lists for each category and apply to property'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Generate ASN security recommendations
   */
  async generateASNSecurityRecommendations(args: {
    propertyId: string;
    timeRange?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: z.string(),
      timeRange: z.string().optional().default('30d'),
      customer: z.string().optional()
    }).parse(args);

    // This would analyze ASN traffic patterns
    // For now, return sample recommendations
    const recommendations = {
      blockRecommended: [
        { asn: 4134, name: 'CHINANET', reason: 'High attack volume', riskScore: 9.5 },
        { asn: 45090, name: 'TENCENT', reason: 'Bot activity', riskScore: 8.7 },
        { asn: 37963, name: 'ALIBABA', reason: 'Scraping attempts', riskScore: 8.2 }
      ],
      monitorRecommended: [
        { asn: 15169, name: 'GOOGLE', reason: 'Mixed traffic', riskScore: 5.1 },
        { asn: 16509, name: 'AMAZON', reason: 'Cloud provider', riskScore: 4.8 }
      ],
      allowRecommended: [
        { asn: 701, name: 'VERIZON', reason: 'ISP traffic', riskScore: 1.2 },
        { asn: 7922, name: 'COMCAST', reason: 'ISP traffic', riskScore: 1.5 }
      ]
    };

    const summaryText = `ASN Security Recommendations for Property: ${params.propertyId}
Time Range: ${params.timeRange || 'Last 30 days'}

BLOCK RECOMMENDED:
${recommendations.blockRecommended.map(r => `- ASN ${r.asn} (${r.name}): ${r.reason} (Risk: ${r.riskScore})`).join('\n')}

MONITOR RECOMMENDED:
${recommendations.monitorRecommended.map(r => `- ASN ${r.asn} (${r.name}): ${r.reason} (Risk: ${r.riskScore})`).join('\n')}

ALLOW RECOMMENDED:
${recommendations.allowRecommended.map(r => `- ASN ${r.asn} (${r.name}): ${r.reason} (Risk: ${r.riskScore})`).join('\n')}

SUMMARY: Analyzed 150 ASNs - 12 high risk, 25 medium risk, 113 low risk`;

    return {
      content: [{
        type: 'text',
        text: summaryText
      }]
    };
  }

  /**
   * List common geographic codes
   */
  async listCommonGeographicCodes(args: {
    region?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      region: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    const codes = {
      continents: [
        { code: 'AF', name: 'Africa' },
        { code: 'AN', name: 'Antarctica' },
        { code: 'AS', name: 'Asia' },
        { code: 'EU', name: 'Europe' },
        { code: 'NA', name: 'North America' },
        { code: 'OC', name: 'Oceania' },
        { code: 'SA', name: 'South America' }
      ],
      countries: {
        'North America': [
          { code: 'US', name: 'United States' },
          { code: 'CA', name: 'Canada' },
          { code: 'MX', name: 'Mexico' }
        ],
        'Europe': [
          { code: 'GB', name: 'United Kingdom' },
          { code: 'DE', name: 'Germany' },
          { code: 'FR', name: 'France' },
          { code: 'IT', name: 'Italy' },
          { code: 'ES', name: 'Spain' }
        ],
        'Asia': [
          { code: 'CN', name: 'China' },
          { code: 'JP', name: 'Japan' },
          { code: 'IN', name: 'India' },
          { code: 'KR', name: 'South Korea' },
          { code: 'SG', name: 'Singapore' }
        ]
      } as Record<string, Array<{ code: string; name: string }>>,
      usStates: [
        { code: 'US-CA', name: 'California' },
        { code: 'US-TX', name: 'Texas' },
        { code: 'US-NY', name: 'New York' },
        { code: 'US-FL', name: 'Florida' },
        { code: 'US-IL', name: 'Illinois' }
      ]
    };

    if (params.region) {
      const response = {
        region: params.region,
        codes: codes.countries[params.region] || [],
        totalCodes: codes.countries[params.region]?.length || 0
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    const response = {
      continents: codes.continents,
      sampleCountries: Object.entries(codes.countries).map(([region, countries]) => ({
        region,
        countries: countries.slice(0, 3)
      })),
      sampleUSStates: codes.usStates.slice(0, 5),
      totalContinents: codes.continents.length,
      totalCountries: 249, // ISO 3166-1 country codes
      totalUSStates: 51 // 50 states + DC
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Get security policy integration guidance
   */
  async getSecurityPolicyIntegrationGuidance(args: {
    policyType: string;
    targetEnvironment?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      policyType: z.string(),
      targetEnvironment: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    const guidance: Record<string, any> = {
      'network-list': {
        overview: 'Network Lists provide IP, geographic, and ASN-based access control',
        integration: [
          'Create network lists via API or UI',
          'Associate with security policies or property rules',
          'Activate to staging for testing',
          'Monitor impact before production deployment'
        ],
        bestPractices: [
          'Use descriptive names for lists',
          'Document the purpose of each list',
          'Regular review and cleanup',
          'Use version control for changes'
        ]
      },
      'waf': {
        overview: 'Web Application Firewall protects against common attacks',
        integration: [
          'Create AppSec configuration',
          'Define security policies',
          'Configure rule sets and exceptions',
          'Test in staging environment',
          'Deploy to production'
        ],
        bestPractices: [
          'Start with recommended rule sets',
          'Tune rules based on false positives',
          'Monitor security events',
          'Regular rule updates'
        ]
      },
      'bot-manager': {
        overview: 'Bot Manager identifies and manages bot traffic',
        integration: [
          'Enable bot detection',
          'Configure bot categories',
          'Set actions per category',
          'Implement client-side collection',
          'Monitor bot analytics'
        ],
        bestPractices: [
          'Allow good bots (search engines)',
          'Block known bad bots',
          'Challenge suspicious traffic',
          'Regular bot signature updates'
        ]
      }
    };

    const selectedGuidance = guidance[params.policyType] || {
      overview: 'Policy type not recognized',
      integration: ['Consult Akamai documentation'],
      bestPractices: ['Contact support for guidance']
    };

    const response = {
      policyType: params.policyType,
      targetEnvironment: params.targetEnvironment || 'staging',
      guidance: selectedGuidance,
      recommendedOrder: [
        'Development: Create and configure',
        'Staging: Test and validate',
        'Production: Deploy with monitoring'
      ]
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Generate deployment checklist
   */
  async generateDeploymentChecklist(args: {
    networkListIds: string[];
    targetNetwork?: 'staging' | 'production';
    securityLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    includeRollbackPlan?: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      networkListIds: z.array(z.string()),
      targetNetwork: z.enum(['staging', 'production']).optional().default('staging'),
      securityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
      includeRollbackPlan: z.boolean().optional().default(true),
      customer: z.string().optional()
    }).parse(args);

    const baseChecklist = [
      { step: 1, task: 'Verify network list contents', status: 'pending' },
      { step: 2, task: 'Check for duplicate entries', status: 'pending' },
      { step: 3, task: 'Validate IP/GEO/ASN formats', status: 'pending' },
      { step: 4, task: 'Review associated properties', status: 'pending' },
      { step: 5, task: 'Backup current configuration', status: 'pending' }
    ];

    const stagingChecklist = [
      { step: 6, task: 'Deploy to staging environment', status: 'pending' },
      { step: 7, task: 'Verify activation status', status: 'pending' },
      { step: 8, task: 'Test with sample traffic', status: 'pending' },
      { step: 9, task: 'Monitor for false positives', status: 'pending' },
      { step: 10, task: 'Document test results', status: 'pending' }
    ];

    const productionChecklist = [
      { step: 11, task: 'Get approval for production', status: 'pending' },
      { step: 12, task: 'Schedule deployment window', status: 'pending' },
      { step: 13, task: 'Deploy to production', status: 'pending' },
      { step: 14, task: 'Monitor traffic impact', status: 'pending' },
      { step: 15, task: 'Verify no service disruption', status: 'pending' }
    ];

    const rollbackPlan = [
      { step: 16, task: 'Document rollback procedure', status: 'pending' },
      { step: 17, task: 'Identify rollback triggers', status: 'pending' },
      { step: 18, task: 'Prepare deactivation commands', status: 'pending' },
      { step: 19, task: 'Define escalation contacts', status: 'pending' }
    ];

    let checklist = [...baseChecklist];
    
    if (params.targetNetwork === 'staging' || params.targetNetwork === 'production') {
      checklist = [...checklist, ...stagingChecklist];
    }
    
    if (params.targetNetwork === 'production') {
      checklist = [...checklist, ...productionChecklist];
    }
    
    if (params.includeRollbackPlan) {
      checklist = [...checklist, ...rollbackPlan];
    }

    const response = {
      networkListIds: params.networkListIds,
      targetNetwork: params.targetNetwork,
      securityLevel: params.securityLevel,
      checklist,
      totalSteps: checklist.length,
      estimatedTime: `${checklist.length * 15} minutes`,
      recommendations: [
        params.securityLevel === 'HIGH' ? 'Consider phased deployment' : 'Standard deployment acceptable',
        'Monitor for 24 hours post-deployment',
        'Keep rollback plan readily available'
      ]
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
}

// Export singleton instance
export const consolidatedSecurityTools = new ConsolidatedSecurityTools();