/**
 * Consolidated Include Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides comprehensive include management for property configurations
 * - Includes are reusable configuration snippets in Akamai Property Manager
 * - Implements all missing include functionality
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  PropertyIdSchema,
  type MCPToolResponse
} from '../common';

/**
 * Include Schemas
 */
const IncludeIdSchema = z.string().regex(/^inc_\d+$/).describe('Include ID (e.g., inc_12345)');

const CreateIncludeSchema = CustomerSchema.extend({
  includeName: z.string().min(1).max(200).describe('Name for the new include'),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).default('MICROSERVICES'),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional().default('prd_Web_App_Accel'),
  ruleFormat: z.string().optional().describe('Rule format version')
});

const ListIncludesSchema = CustomerSchema.extend({
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).optional()
});

const GetIncludeSchema = CustomerSchema.extend({
  includeId: IncludeIdSchema,
  version: z.number().int().positive().optional()
});

const UpdateIncludeSchema = CustomerSchema.extend({
  includeId: IncludeIdSchema,
  version: z.number().int().positive(),
  rules: z.any().describe('Rule tree for the include')
});

const CreateIncludeVersionSchema = CustomerSchema.extend({
  includeId: IncludeIdSchema,
  createFromVersion: z.number().int().positive().optional()
});

const ActivateIncludeSchema = CustomerSchema.extend({
  includeId: IncludeIdSchema,
  version: z.number().int().positive(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  notes: z.string().optional(),
  notifyEmails: z.array(z.string().email()).optional()
});

/**
 * Consolidated include tools implementation
 */
export class ConsolidatedIncludeTools extends BaseTool {
  protected readonly domain = 'include';

  /**
   * List includes
   */
  async listIncludes(args: z.infer<typeof ListIncludesSchema>): Promise<MCPToolResponse> {
    const params = ListIncludesSchema.parse(args);

    return this.executeStandardOperation(
      'list-includes',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/includes',
            method: 'GET',
            schema: z.object({
              includes: z.object({
                items: z.array(z.object({
                  includeId: z.string(),
                  includeName: z.string(),
                  includeType: z.string(),
                  latestVersion: z.number(),
                  stagingVersion: z.number().nullable(),
                  productionVersion: z.number().nullable(),
                  contractId: z.string(),
                  groupId: z.string()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId }),
              ...(params.includeType && { includeType: params.includeType })
            }
          }
        );

        return {
          includes: response.includes.items,
          count: response.includes.items.length,
          message: `Found ${response.includes.items.length} includes`
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'includes:list',
        cacheTtl: 300
      }
    );
  }

  /**
   * Create a new include
   */
  async createInclude(args: z.infer<typeof CreateIncludeSchema>): Promise<MCPToolResponse> {
    const params = CreateIncludeSchema.parse(args);

    return this.executeStandardOperation(
      'create-include',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/includes',
            method: 'POST',
            schema: z.object({
              includeLink: z.string()
            }),
            body: {
              includeName: params.includeName,
              includeType: params.includeType,
              productId: params.productId,
              ruleFormat: params.ruleFormat
            },
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            }
          }
        );

        const includeId = response.includeLink.split('/').pop() || '';

        return {
          includeId,
          includeLink: response.includeLink,
          includeName: params.includeName,
          includeType: params.includeType,
          message: `✅ Created include ${params.includeName} (${includeId})`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Get include details
   */
  async getInclude(args: z.infer<typeof GetIncludeSchema>): Promise<MCPToolResponse> {
    const params = GetIncludeSchema.parse(args);

    return this.executeStandardOperation(
      'get-include',
      params,
      async (client) => {
        // First get include metadata
        const includeResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}`,
            method: 'GET',
            schema: z.object({
              includes: z.object({
                items: z.array(z.object({
                  includeId: z.string(),
                  includeName: z.string(),
                  includeType: z.string(),
                  latestVersion: z.number(),
                  stagingVersion: z.number().nullable(),
                  productionVersion: z.number().nullable(),
                  contractId: z.string(),
                  groupId: z.string()
                }))
              })
            })
          }
        );

        const include = includeResponse.includes.items[0];
        if (!include) {
          throw new Error(`Include ${params.includeId} not found`);
        }

        // If version requested, get version details
        if (params.version) {
          const versionResponse = await this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/includes/${params.includeId}/versions/${params.version}`,
              method: 'GET',
              schema: z.object({
                versions: z.object({
                  items: z.array(z.object({
                    includeVersion: z.number(),
                    updatedByUser: z.string(),
                    updatedDate: z.string(),
                    productionStatus: z.string().nullable(),
                    stagingStatus: z.string().nullable(),
                    etag: z.string(),
                    note: z.string().nullable()
                  }))
                })
              }),
              queryParams: {
                contractId: include.contractId,
                groupId: include.groupId
              }
            }
          );

          return {
            ...include,
            versionDetails: versionResponse.versions.items[0]
          };
        }

        return include;
      },
      {
        customer: params.customer,
        cacheKey: (p) => `include:${p.includeId}:${p.version || 'latest'}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Update include rules
   */
  async updateInclude(args: z.infer<typeof UpdateIncludeSchema>): Promise<MCPToolResponse> {
    const params = UpdateIncludeSchema.parse(args);

    return this.executeStandardOperation(
      'update-include',
      params,
      async (client) => {
        // Get include details for contract/group
        const includeDetails = await this.getInclude({
          includeId: params.includeId,
          customer: params.customer
        });

        const include = includeDetails as any;

        // Update rules
        await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/versions/${params.version}/rules`,
            method: 'PUT',
            schema: z.object({
              rules: z.any()
            }),
            body: {
              rules: params.rules
            },
            queryParams: {
              contractId: include.contractId,
              groupId: include.groupId
            }
          }
        );

        // Invalidate cache
        await this.invalidateCache([
          `include:${params.includeId}:${params.version}`
        ]);

        return {
          includeId: params.includeId,
          version: params.version,
          status: 'updated',
          message: `✅ Updated rules for include ${params.includeId} version ${params.version}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Create new include version
   */
  async createIncludeVersion(args: z.infer<typeof CreateIncludeVersionSchema>): Promise<MCPToolResponse> {
    const params = CreateIncludeVersionSchema.parse(args);

    return this.executeStandardOperation(
      'create-include-version',
      params,
      async (client) => {
        // Get include details
        const includeDetails = await this.getInclude({
          includeId: params.includeId,
          customer: params.customer
        });

        const include = includeDetails as any;

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/versions`,
            method: 'POST',
            schema: z.object({
              versionLink: z.string()
            }),
            body: {
              createFromVersion: params.createFromVersion || include.latestVersion
            },
            queryParams: {
              contractId: include.contractId,
              groupId: include.groupId
            }
          }
        );

        const newVersion = parseInt(response.versionLink.split('/').pop() || '0');

        return {
          includeId: params.includeId,
          newVersion,
          versionLink: response.versionLink,
          message: `✅ Created new version ${newVersion} for include ${params.includeId}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Activate include version
   */
  async activateInclude(args: z.infer<typeof ActivateIncludeSchema>): Promise<MCPToolResponse> {
    const params = ActivateIncludeSchema.parse(args);

    return this.executeStandardOperation(
      'activate-include',
      params,
      async (client) => {
        // Get include details
        const includeDetails = await this.getInclude({
          includeId: params.includeId,
          customer: params.customer
        });

        const include = includeDetails as any;

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/activations`,
            method: 'POST',
            schema: z.object({
              activationLink: z.string()
            }),
            body: {
              includeVersion: params.version,
              network: params.network,
              note: params.notes || `Activating include version ${params.version} to ${params.network}`,
              notifyEmails: params.notifyEmails || []
            },
            queryParams: {
              contractId: include.contractId,
              groupId: include.groupId
            }
          }
        );

        const activationId = response.activationLink.split('/').pop();

        return {
          includeId: params.includeId,
          version: params.version,
          network: params.network,
          activationId,
          activationLink: response.activationLink,
          message: `✅ Activated include ${params.includeId} version ${params.version} to ${params.network}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * List include activations
   */
  async listIncludeActivations(args: {
    includeId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: IncludeIdSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-include-activations',
      params,
      async (client) => {
        // Get include details
        const includeDetails = await this.getInclude({
          includeId: params.includeId,
          customer: params.customer
        });

        const include = includeDetails as any;

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/activations`,
            method: 'GET',
            schema: z.object({
              activations: z.object({
                items: z.array(z.object({
                  activationId: z.string(),
                  includeId: z.string(),
                  includeVersion: z.number(),
                  network: z.string(),
                  status: z.string(),
                  submitDate: z.string(),
                  updateDate: z.string(),
                  note: z.string().nullable()
                }))
              })
            }),
            queryParams: {
              contractId: include.contractId,
              groupId: include.groupId
            }
          }
        );

        return {
          includeId: params.includeId,
          activations: response.activations.items,
          count: response.activations.items.length,
          message: `Found ${response.activations.items.length} activations for include ${params.includeId}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `include:${p.includeId}:activations`,
        cacheTtl: 60
      }
    );
  }

  /**
   * Get include activation status
   */
  async getIncludeActivationStatus(args: {
    includeId: string;
    activationId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: IncludeIdSchema,
      activationId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-include-activation-status',
      params,
      async (client) => {
        // Get include details
        const includeDetails = await this.getInclude({
          includeId: params.includeId,
          customer: params.customer
        });

        const include = includeDetails as any;

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/activations/${params.activationId}`,
            method: 'GET',
            schema: z.object({
              activations: z.object({
                items: z.array(z.object({
                  activationId: z.string(),
                  includeId: z.string(),
                  includeVersion: z.number(),
                  network: z.string(),
                  status: z.string(),
                  submitDate: z.string(),
                  updateDate: z.string(),
                  note: z.string().nullable()
                }))
              })
            }),
            queryParams: {
              contractId: include.contractId,
              groupId: include.groupId
            }
          }
        );

        const activation = response.activations.items[0];
        if (!activation) {
          throw new Error(`Activation ${params.activationId} not found`);
        }

        return activation;
      },
      {
        customer: params.customer,
        cacheKey: (p) => `include:${p.includeId}:activation:${p.activationId}`,
        cacheTtl: 30
      }
    );
  }
}

// Export singleton instance
export const consolidatedIncludeTools = new ConsolidatedIncludeTools();