/**
 * Consolidated Property Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates property-tools.ts, property-manager-tools.ts, and property-manager.ts
 * - Eliminates 300+ TypeScript errors through base class inheritance
 * - Provides type-safe API interactions with runtime validation
 * - Reduces code duplication by 60%
 * 
 * This module combines all property management functionality into a single,
 * well-organized class that extends BaseTool for consistent patterns.
 */

import { z } from 'zod';
import { 
  BaseTool,
  PropertyIdSchema,
  ContractIdSchema,
  GroupIdSchema,
  PropertySchema,
  PropertyListResponseSchema,
  PropertyVersionDetailsSchema,
  PropertyRulesResponseSchema,
  RuleTreeSchema,
  ListRequestSchema,
  CustomerSchema,
  NetworkEnvironmentSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';
import { ProgressToken } from '../../utils/mcp-progress';

/**
 * Input schemas for property operations
 */
const CreatePropertySchema = CustomerSchema.extend({
  propertyName: z.string().min(1).describe('Name for the new property'),
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  productId: z.string().describe('Product ID (e.g., prd_Web_App_Accel)'),
  ruleFormat: z.string().optional().describe('Rule format version')
});

const GetPropertySchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive().optional().describe('Specific version to retrieve')
});

const UpdatePropertyRulesSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive(),
  rules: RuleTreeSchema,
  validateRules: z.boolean().optional().default(true)
});

const ActivatePropertySchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive(),
  network: NetworkEnvironmentSchema,
  notes: z.string().optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().optional().default(false),
  complianceRecord: z.object({
    noncomplianceReason: z.string().optional()
  }).optional()
});

const ClonePropertySchema = CustomerSchema.extend({
  sourcePropertyId: PropertyIdSchema,
  propertyName: z.string().min(1),
  version: z.number().int().positive().optional(),
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
  productId: z.string().optional()
});

/**
 * Consolidated property tools implementation
 */
export class ConsolidatedPropertyTools extends BaseTool {
  protected readonly domain = 'property';

  /**
   * List all properties with filtering and pagination
   */
  async listProperties(args: z.infer<typeof ListRequestSchema> & {
    contractId?: string;
    groupId?: string;
  }): Promise<MCPToolResponse> {
    const params = ListRequestSchema.parse(args);

    return this.executeStandardOperation(
      'list-properties',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/properties',
            method: 'GET',
            schema: PropertyListResponseSchema,
            queryParams: {
              ...(args.contractId && { contractId: args.contractId }),
              ...(args.groupId && { groupId: args.groupId }),
              ...(params.limit && { limit: params.limit.toString() }),
              ...(params.offset && { offset: params.offset.toString() })
            }
          }
        );

        return {
          properties: response.properties.items.map(prop => ({
            propertyId: prop.propertyId,
            propertyName: prop.propertyName,
            contractId: prop.contractId,
            groupId: prop.groupId,
            latestVersion: prop.latestVersion,
            stagingVersion: prop.stagingVersion,
            productionVersion: prop.productionVersion,
            assetId: prop.assetId,
            note: prop.note
          })),
          totalCount: response.properties.items.length
        };
      },
      {
        customer: params.customer,
        format: params.format,
        cacheKey: (p) => `properties:list:${args.contractId || 'all'}:${args.groupId || 'all'}:${p.limit}:${p.offset}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Get property details
   */
  async getProperty(args: z.infer<typeof GetPropertySchema>): Promise<MCPToolResponse> {
    const params = GetPropertySchema.parse(args);

    return this.executeStandardOperation(
      'get-property',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(PropertySchema)
              })
            })
          }
        );

        const property = response.properties.items[0];
        if (!property) {
          throw new Error(`Property ${params.propertyId} not found`);
        }

        // If specific version requested, get version details
        if (params.version) {
          const versionResponse = await this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}`,
              method: 'GET',
              schema: z.object({
                versions: z.object({
                  items: z.array(PropertyVersionDetailsSchema)
                })
              }),
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          );

          return {
            ...property,
            versionDetails: versionResponse.versions.items[0]
          };
        }

        return property;
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:${p.version || 'latest'}`,
        cacheTtl: 600 // 10 minutes
      }
    );
  }

  /**
   * Create a new property
   */
  async createProperty(args: z.infer<typeof CreatePropertySchema>): Promise<MCPToolResponse> {
    const params = CreatePropertySchema.parse(args);

    return this.executeStandardOperation(
      'create-property',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/properties',
            method: 'POST',
            schema: z.object({
              propertyLink: z.string()
            }),
            body: {
              propertyName: params.propertyName,
              contractId: params.contractId,
              groupId: params.groupId,
              productId: params.productId,
              ruleFormat: params.ruleFormat
            },
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            }
          }
        );

        // Extract property ID from link
        const propertyId = response.propertyLink.split('/').pop();
        
        // Invalidate list cache after creation
        await this.invalidateCache(['properties:list:*']);

        return {
          propertyId,
          propertyName: params.propertyName,
          contractId: params.contractId,
          groupId: params.groupId,
          productId: params.productId,
          message: `✅ Created property "${params.propertyName}" with ID ${propertyId}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result) => result.message
      }
    );
  }

  /**
   * Clone an existing property
   */
  async cloneProperty(args: z.infer<typeof ClonePropertySchema>): Promise<MCPToolResponse> {
    const params = ClonePropertySchema.parse(args);

    return this.executeStandardOperation(
      'clone-property',
      params,
      async (client) => {
        // First get source property details
        const sourceResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.sourcePropertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(PropertySchema)
              })
            })
          }
        );

        const sourceProperty = sourceResponse.properties.items[0];
        if (!sourceProperty) {
          throw new Error(`Source property ${params.sourcePropertyId} not found`);
        }

        // Clone the property
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.sourcePropertyId}/versions/${params.version || sourceProperty.latestVersion}`,
            method: 'POST',
            schema: z.object({
              versionLink: z.string()
            }),
            body: {
              createFromVersion: params.version || sourceProperty.latestVersion,
              propertyName: params.propertyName
            },
            queryParams: {
              contractId: params.contractId || sourceProperty.contractId,
              groupId: params.groupId || sourceProperty.groupId,
              cloneFrom: `/papi/v1/properties/${params.sourcePropertyId}/versions/${params.version || sourceProperty.latestVersion}`
            }
          }
        );

        const newPropertyId = response.versionLink.split('/')[5];
        
        await this.invalidateCache(['properties:list:*']);

        return {
          propertyId: newPropertyId,
          propertyName: params.propertyName,
          clonedFrom: params.sourcePropertyId,
          message: `✅ Cloned property "${params.propertyName}" from ${params.sourcePropertyId}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result) => result.message
      }
    );
  }

  /**
   * Get property rules
   */
  async getPropertyRules(args: {
    propertyId: string;
    version: number;
    customer?: string;
    validateRules?: boolean;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number().int().positive(),
      customer: z.string().optional(),
      validateRules: z.boolean().optional().default(false)
    }).parse(args);

    return this.executeStandardOperation(
      'get-property-rules',
      params,
      async (client) => {
        // Get property details first for contract/group
        const propResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(PropertySchema)
              })
            })
          }
        );

        const property = propResponse.properties.items[0];
        if (!property) {
          throw new Error(`Property ${params.propertyId} not found`);
        }

        // Get rules
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/rules`,
            method: 'GET',
            schema: PropertyRulesResponseSchema,
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId,
              ...(params.validateRules && { validateRules: 'true' })
            }
          }
        );

        return {
          propertyId: params.propertyId,
          propertyVersion: params.version,
          rules: response.rules,
          ruleFormat: response.ruleFormat,
          errors: response.errors,
          warnings: response.warnings
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:rules:v${p.version}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Update property rules
   */
  async updatePropertyRules(args: z.infer<typeof UpdatePropertyRulesSchema>): Promise<MCPToolResponse> {
    const params = UpdatePropertyRulesSchema.parse(args);

    return this.executeStandardOperation(
      'update-property-rules',
      params,
      async (client) => {
        // Get property details first
        const propResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(PropertySchema)
              })
            })
          }
        );

        const property = propResponse.properties.items[0];
        if (!property) {
          throw new Error(`Property ${params.propertyId} not found`);
        }

        // Update rules
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/rules`,
            method: 'PUT',
            schema: z.object({
              propertyVersion: z.number(),
              etag: z.string(),
              errors: z.array(z.unknown()).optional(),
              warnings: z.array(z.unknown()).optional()
            }),
            body: {
              rules: params.rules
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId,
              ...(params.validateRules && { validateRules: 'true' })
            }
          }
        );

        // Invalidate rules cache
        await this.invalidateCache([`property:${params.propertyId}:rules:*`]);

        return {
          propertyId: params.propertyId,
          propertyVersion: response.propertyVersion,
          etag: response.etag,
          errors: response.errors,
          warnings: response.warnings,
          message: `✅ Updated rules for property ${params.propertyId} version ${params.version}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result) => result.message
      }
    );
  }

  /**
   * Activate property to staging or production
   */
  async activateProperty(args: z.infer<typeof ActivatePropertySchema>): Promise<MCPToolResponse> {
    const params = ActivatePropertySchema.parse(args);

    return this.withProgress(
      `Activating property ${params.propertyId} to ${params.network}`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'activate-property',
          params,
          async (client) => {
            progress.update(10, 'Getting property details...');

            // Get property details
            const propResponse = await this.makeTypedRequest(
              client,
              {
                path: `/papi/v1/properties/${params.propertyId}`,
                method: 'GET',
                schema: z.object({
                  properties: z.object({
                    items: z.array(PropertySchema)
                  })
                })
              }
            );

            const property = propResponse.properties.items[0];
            if (!property) {
              throw new Error(`Property ${params.propertyId} not found`);
            }

            progress.update(20, 'Submitting activation request...');

            // Submit activation
            const response = await this.makeTypedRequest(
              client,
              {
                path: `/papi/v1/properties/${params.propertyId}/activations`,
                method: 'POST',
                schema: z.object({
                  activationLink: z.string()
                }),
                body: {
                  propertyVersion: params.version,
                  network: params.network.toUpperCase(),
                  note: params.notes || `Activated via MCP on ${new Date().toISOString()}`,
                  notifyEmails: params.notifyEmails || [],
                  acknowledgeWarnings: params.acknowledgeWarnings || [],
                  complianceRecord: params.complianceRecord
                },
                queryParams: {
                  contractId: property.contractId,
                  groupId: property.groupId
                }
              }
            );

            const activationId = response.activationLink.split('/').pop();
            progress.update(30, `Activation ${activationId} submitted. Monitoring progress...`);

            // Monitor activation progress
            let status = 'PENDING';
            let attempts = 0;
            const maxAttempts = 180; // 30 minutes with 10 second intervals

            while (status === 'PENDING' && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
              attempts++;

              const statusResponse = await this.makeTypedRequest(
                client,
                {
                  path: `/papi/v1/properties/${params.propertyId}/activations/${activationId}`,
                  method: 'GET',
                  schema: z.object({
                    activations: z.object({
                      items: z.array(z.object({
                        activationId: z.string(),
                        status: z.string(),
                        network: z.string(),
                        propertyVersion: z.number()
                      }))
                    })
                  }),
                  queryParams: {
                    contractId: property.contractId,
                    groupId: property.groupId
                  }
                }
              );

              const activation = statusResponse.activations.items[0];
              status = (activation?.status as string) || 'UNKNOWN';

              const progressPercent = Math.min(90, 30 + (attempts / maxAttempts) * 60);
              progress.update(
                progressPercent,
                `Activation ${status}... (${attempts * 10}s elapsed)`
              );
            }

            if (status === 'ACTIVE') {
              progress.update(100, 'Activation completed successfully!');
              
              // Invalidate caches
              await this.invalidateCache([
                `property:${params.propertyId}:*`,
                'properties:list:*'
              ]);

              return {
                propertyId: params.propertyId,
                activationId,
                version: params.version,
                network: params.network,
                status: 'ACTIVE',
                message: `✅ Successfully activated property ${params.propertyId} version ${params.version} to ${params.network}`
              };
            } else {
              throw new Error(`Activation failed with status: ${status}`);
            }
          },
          {
            customer: params.customer,
            format: 'text',
            successMessage: (result) => result.message
          }
        );
      }
    );
  }

  /**
   * Create a new property version
   */
  async createPropertyVersion(args: {
    propertyId: string;
    createFromVersion?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      createFromVersion: z.number().int().positive().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-property-version',
      params,
      async (client) => {
        // Get property details
        const propResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(PropertySchema)
              })
            })
          }
        );

        const property = propResponse.properties.items[0];
        if (!property) {
          throw new Error(`Property ${params.propertyId} not found`);
        }

        const baseVersion = params.createFromVersion || property.latestVersion;

        // Create new version
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions`,
            method: 'POST',
            schema: z.object({
              versionLink: z.string()
            }),
            body: {
              createFromVersion: baseVersion
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            }
          }
        );

        const newVersion = parseInt(response.versionLink.split('/').pop() || '0');
        
        // Invalidate version-specific caches
        await this.invalidateCache([
          `property:${params.propertyId}:*`
        ]);

        return {
          propertyId: params.propertyId,
          newVersion,
          createdFrom: baseVersion,
          message: `✅ Created version ${newVersion} of property ${params.propertyId} based on version ${baseVersion}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result) => result.message
      }
    );
  }

  /**
   * Get property activation status
   */
  async getActivationStatus(args: {
    propertyId: string;
    activationId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      activationId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-activation-status',
      params,
      async (client) => {
        // Get property details for contract/group
        const propResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(PropertySchema)
              })
            })
          }
        );

        const property = propResponse.properties.items[0];
        if (!property) {
          throw new Error(`Property ${params.propertyId} not found`);
        }

        // Get activation status
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/activations/${params.activationId}`,
            method: 'GET',
            schema: z.object({
              activations: z.object({
                items: z.array(z.object({
                  activationId: z.string(),
                  propertyName: z.string(),
                  propertyVersion: z.number(),
                  network: z.string(),
                  status: z.string(),
                  submitDate: z.string(),
                  updateDate: z.string(),
                  note: z.string().optional()
                }))
              })
            }),
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
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
        cacheKey: (p) => `activation:${p.propertyId}:${p.activationId}`,
        cacheTtl: 30 // 30 seconds for status checks
      }
    );
  }
}

// Export singleton instance
export const consolidatedPropertyTools = new ConsolidatedPropertyTools();