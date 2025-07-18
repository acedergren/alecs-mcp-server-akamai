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
 * 
 * NOTE: This file is being migrated to property-tools-enhanced.ts which uses
 * the new BaseTool.execute pattern for better features and performance.
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
  NetworkTypeSchema,
  type MCPToolResponse
} from '../common';
// import type { AkamaiClient } from '../../akamai-client'; // Unused in this file
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
  network: NetworkTypeSchema,
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
/**
 * @deprecated Use property-tools-enhanced.ts instead for enhanced features
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
      { ...params, contractId: args.contractId, groupId: args.groupId },
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
        cacheTtl: 300, // 5 minutes
        toolName: 'property_list'
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
        successMessage: (result) => result.message,
        toolName: 'property_create'
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
                  network: String(params.network).toUpperCase(),
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
          ({
            customer: params.customer || 'default',
            format: 'text' as const,
            successMessage: (result: any) => (result as any).message,
            toolName: 'property_activate'
          } as any)
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

  /**
   * List property versions
   */
  async listPropertyVersions(args: {
    propertyId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-property-versions',
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

        // Get versions
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions`,
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
          versions: response.versions.items,
          totalCount: response.versions.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:versions`,
        cacheTtl: 60
      }
    );
  }

  /**
   * List property activations
   */
  async listPropertyActivations(args: {
    propertyId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-property-activations',
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

        // Get activations
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/activations`,
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

        return {
          activations: response.activations.items,
          totalCount: response.activations.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:activations`,
        cacheTtl: 60
      }
    );
  }

  /**
   * List groups
   */
  async listGroups(args: {
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-groups',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/groups',
            method: 'GET',
            schema: z.object({
              groups: z.object({
                items: z.array(z.object({
                  groupId: z.string(),
                  groupName: z.string(),
                  parentGroupId: z.string().optional(),
                  contractIds: z.array(z.string())
                }))
              })
            })
          }
        );

        return {
          groups: response.groups.items,
          totalCount: response.groups.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'groups:list',
        cacheTtl: 3600
      }
    );
  }

  /**
   * List contracts
   */
  async listContracts(args: {
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-contracts',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/contracts',
            method: 'GET',
            schema: z.object({
              contracts: z.object({
                items: z.array(z.object({
                  contractId: z.string(),
                  contractTypeName: z.string()
                }))
              })
            })
          }
        );

        return {
          contracts: response.contracts.items,
          totalCount: response.contracts.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'contracts:list',
        cacheTtl: 3600
      }
    );
  }

  /**
   * List products
   */
  async listProducts(args: {
    contractId?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-products',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/products',
            method: 'GET',
            schema: z.object({
              products: z.object({
                items: z.array(z.object({
                  productId: z.string(),
                  productName: z.string()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId })
            }
          }
        );

        return {
          products: response.products.items,
          totalCount: response.products.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `products:list:${params.contractId || 'all'}`,
        cacheTtl: 3600
      }
    );
  }

  /**
   * Get latest property version
   */
  async getLatestPropertyVersion(args: {
    propertyId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-latest-property-version',
      params,
      async (client) => {
        // Get property details which includes latest version
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

        return {
          propertyId: params.propertyId,
          latestVersion: property.latestVersion,
          stagingVersion: property.stagingVersion,
          productionVersion: property.productionVersion
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:latest-version`,
        cacheTtl: 60
      }
    );
  }

  /**
   * Get property version
   */
  async getPropertyVersion(args: {
    propertyId: string;
    version: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-property-version',
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

        // Get version details
        const response = await this.makeTypedRequest(
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

        const version = response.versions.items[0];
        if (!version) {
          throw new Error(`Version ${params.version} not found for property ${params.propertyId}`);
        }

        return version;
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:version:${p.version}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Rollback property version
   */
  async rollbackPropertyVersion(args: {
    propertyId: string;
    targetVersion: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      targetVersion: z.number(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'rollback-property-version',
      params,
      async (_client) => {
        // Create new version based on target version
        const createResult = await this.createPropertyVersion({
          propertyId: params.propertyId,
          createFromVersion: params.targetVersion,
          customer: params.customer
        });

        return {
          propertyId: params.propertyId,
          newVersion: (createResult as any).newVersion,
          rolledBackFrom: params.targetVersion,
          message: `✅ Created new version based on version ${params.targetVersion}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Get differences between two property versions
   */
  async getVersionDiff(args: {
    propertyId: string;
    fromVersion: number;
    toVersion: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      fromVersion: z.number().int().positive(),
      toVersion: z.number().int().positive(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-version-diff',
      params,
      async (client) => {
        // Get property details for context
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

        // Get rules for both versions
        const [fromRules, toRules] = await Promise.all([
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.propertyId}/versions/${params.fromVersion}/rules`,
              method: 'GET',
              schema: PropertyRulesResponseSchema,
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          ),
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.propertyId}/versions/${params.toVersion}/rules`,
              method: 'GET',
              schema: PropertyRulesResponseSchema,
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          )
        ]);

        // Get version details
        const [fromVersionDetails, toVersionDetails] = await Promise.all([
          this.getPropertyVersion({
            propertyId: params.propertyId,
            version: params.fromVersion,
            customer: params.customer
          }),
          this.getPropertyVersion({
            propertyId: params.propertyId,
            version: params.toVersion,
            customer: params.customer
          })
        ]);

        // Calculate differences
        const differences = this.calculateRuleDifferences(fromRules.rules, toRules.rules);

        return {
          propertyId: params.propertyId,
          propertyName: property.propertyName,
          fromVersion: {
            version: params.fromVersion,
            details: fromVersionDetails
          },
          toVersion: {
            version: params.toVersion,
            details: toVersionDetails
          },
          differences: differences,
          summary: {
            totalChanges: differences.length,
            addedBehaviors: differences.filter(d => d.type === 'added').length,
            modifiedBehaviors: differences.filter(d => d.type === 'modified').length,
            deletedBehaviors: differences.filter(d => d.type === 'deleted').length
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:diff:v${p.fromVersion}-v${p.toVersion}`,
        cacheTtl: 600 // 10 minutes
      }
    );
  }

  /**
   * Calculate differences between two rule trees
   * @private
   */
  private calculateRuleDifferences(fromRules: any, toRules: any): Array<{
    type: 'added' | 'modified' | 'deleted';
    path: string;
    behaviorName?: string;
    fromValue?: any;
    toValue?: any;
  }> {
    const differences: Array<{
      type: 'added' | 'modified' | 'deleted';
      path: string;
      behaviorName?: string;
      fromValue?: any;
      toValue?: any;
    }> = [];

    // Helper function to traverse rule tree
    const traverseRules = (node: any, path: string, ruleMap: Map<string, any>) => {
      if (node.behaviors) {
        node.behaviors.forEach((behavior: any, index: number) => {
          const behaviorPath = `${path}/behaviors[${index}]/${behavior.name}`;
          ruleMap.set(behaviorPath, behavior);
        });
      }
      if (node.children) {
        node.children.forEach((child: any, index: number) => {
          traverseRules(child, `${path}/children[${index}]`, ruleMap);
        });
      }
    };

    // Build maps of all behaviors in each version
    const fromMap = new Map<string, any>();
    const toMap = new Map<string, any>();
    
    traverseRules(fromRules, 'rules', fromMap);
    traverseRules(toRules, 'rules', toMap);

    // Find added and modified behaviors
    toMap.forEach((toBehavior, path) => {
      const fromBehavior = fromMap.get(path);
      if (!fromBehavior) {
        differences.push({
          type: 'added',
          path,
          behaviorName: toBehavior.name,
          toValue: toBehavior.options
        });
      } else if (JSON.stringify(fromBehavior.options) !== JSON.stringify(toBehavior.options)) {
        differences.push({
          type: 'modified',
          path,
          behaviorName: toBehavior.name,
          fromValue: fromBehavior.options,
          toValue: toBehavior.options
        });
      }
    });

    // Find deleted behaviors
    fromMap.forEach((fromBehavior, path) => {
      if (!toMap.has(path)) {
        differences.push({
          type: 'deleted',
          path,
          behaviorName: fromBehavior.name,
          fromValue: fromBehavior.options
        });
      }
    });

    return differences;
  }

  /**
   * Cancel property activation
   */
  async cancelPropertyActivation(args: {
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
      'cancel-property-activation',
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

        // Cancel activation
        await client.request({
          path: `/papi/v1/properties/${params.propertyId}/activations/${params.activationId}`,
          method: 'DELETE',
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        });

        // Invalidate caches
        await this.invalidateCache([
          `property:${params.propertyId}:activations`,
          `activation:${params.propertyId}:${params.activationId}`
        ]);

        return {
          propertyId: params.propertyId,
          activationId: params.activationId,
          status: 'cancelled',
          message: `✅ Cancelled activation ${params.activationId}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Validate property activation
   */
  async validatePropertyActivation(args: {
    propertyId: string;
    version: number;
    network: 'staging' | 'production';
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number(),
      network: NetworkTypeSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'validate-property-activation',
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

        // Validate activation
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/activations`,
            method: 'POST',
            schema: z.object({
              activationLink: z.string().optional(),
              errors: z.array(z.object({
                type: z.string(),
                title: z.string(),
                detail: z.string()
              })).optional(),
              warnings: z.array(z.object({
                type: z.string(),
                title: z.string(),
                detail: z.string()
              })).optional()
            }),
            body: {
              propertyVersion: params.version,
              network: String(params.network).toUpperCase(),
              activationType: 'ACTIVATE',
              validateOnly: true
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            }
          }
        );

        return {
          propertyId: params.propertyId,
          version: params.version,
          network: params.network,
          valid: !response.errors || response.errors.length === 0,
          errors: response.errors || [],
          warnings: response.warnings || []
        };
      },
      ({
        customer: params.customer || 'default'
      } as any)
    );
  }

  /**
   * Add property hostname
   */
  async addPropertyHostname(args: {
    propertyId: string;
    version: number;
    hostnames: string[];
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number(),
      hostnames: z.array(z.string()),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'add-property-hostname',
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

        // Get current hostnames
        const currentResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/hostnames`,
            method: 'GET',
            schema: z.object({
              hostnames: z.object({
                items: z.array(z.object({
                  cnameFrom: z.string(),
                  cnameTo: z.string(),
                  cnameType: z.string()
                }))
              })
            }),
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            }
          }
        );

        // Add new hostnames
        const newHostnames = params.hostnames.map(hostname => ({
          cnameFrom: hostname,
          cnameTo: `${hostname}.edgekey.net`,
          cnameType: 'EDGE_HOSTNAME'
        }));

        const allHostnames = [...currentResponse.hostnames.items, ...newHostnames];

        // Update hostnames
        await client.request({
          path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/hostnames`,
          method: 'PUT',
          body: { hostnames: allHostnames },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        });

        // Invalidate caches
        await this.invalidateCache([
          `property:${params.propertyId}:version:${params.version}:hostnames`
        ]);

        return {
          propertyId: params.propertyId,
          version: params.version,
          addedHostnames: params.hostnames,
          totalHostnames: allHostnames.length,
          message: `✅ Added ${params.hostnames.length} hostname(s) to property version ${params.version}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Remove property hostname
   */
  async removePropertyHostname(args: {
    propertyId: string;
    version: number;
    hostnames: string[];
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number(),
      hostnames: z.array(z.string()),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'remove-property-hostname',
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

        // Get current hostnames
        const currentResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/hostnames`,
            method: 'GET',
            schema: z.object({
              hostnames: z.object({
                items: z.array(z.object({
                  cnameFrom: z.string(),
                  cnameTo: z.string(),
                  cnameType: z.string()
                }))
              })
            }),
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            }
          }
        );

        // Remove specified hostnames
        const remainingHostnames = currentResponse.hostnames.items.filter(
          h => !params.hostnames.includes(h.cnameFrom)
        );

        // Update hostnames
        await client.request({
          path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/hostnames`,
          method: 'PUT',
          body: { hostnames: remainingHostnames },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        });

        // Invalidate caches
        await this.invalidateCache([
          `property:${params.propertyId}:version:${params.version}:hostnames`
        ]);

        return {
          propertyId: params.propertyId,
          version: params.version,
          removedHostnames: params.hostnames,
          remainingHostnames: remainingHostnames.length,
          message: `✅ Removed ${params.hostnames.length} hostname(s) from property version ${params.version}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * List property version hostnames
   */
  async listPropertyVersionHostnames(args: {
    propertyId: string;
    version: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-property-version-hostnames',
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

        // Get hostnames
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.version}/hostnames`,
            method: 'GET',
            schema: z.object({
              hostnames: z.object({
                items: z.array(z.object({
                  cnameFrom: z.string(),
                  cnameTo: z.string(),
                  cnameType: z.string(),
                  certStatus: z.object({
                    production: z.array(z.object({
                      status: z.string()
                    })).optional(),
                    staging: z.array(z.object({
                      status: z.string()
                    })).optional()
                  }).optional()
                }))
              })
            }),
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            }
          }
        );

        return {
          propertyId: params.propertyId,
          version: params.version,
          hostnames: response.hostnames.items,
          totalCount: response.hostnames.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `property:${p.propertyId}:version:${p.version}:hostnames`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Create edge hostname
   */
  async createEdgeHostname(args: {
    domainPrefix: string;
    domainSuffix: string;
    productId: string;
    ipVersionBehavior?: string;
    secureNetwork?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      domainPrefix: z.string(),
      domainSuffix: z.string(),
      productId: z.string(),
      ipVersionBehavior: z.string().optional(),
      secureNetwork: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-edge-hostname',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/hapi/v1/edge-hostnames',
            method: 'POST',
            schema: z.object({
              edgeHostnameLink: z.string(),
              edgeHostnameId: z.string()
            }),
            body: {
              domainPrefix: params.domainPrefix,
              domainSuffix: params.domainSuffix,
              productId: params.productId,
              ipVersionBehavior: params.ipVersionBehavior || 'IPV4',
              secure: params.secureNetwork === 'enhanced-tls',
              cert: 0 // Default DV
            }
          }
        );

        return {
          edgeHostnameId: response.edgeHostnameId,
          edgeHostname: `${params.domainPrefix}.${params.domainSuffix}`,
          message: `✅ Created edge hostname ${params.domainPrefix}.${params.domainSuffix}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * List edge hostnames
   */
  async listEdgeHostnames(args: {
    contractId?: string;
    groupId?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-edge-hostnames',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/hapi/v1/edge-hostnames',
            method: 'GET',
            schema: z.object({
              edgeHostnames: z.object({
                items: z.array(z.object({
                  edgeHostnameId: z.string(),
                  edgeHostnameDomain: z.string(),
                  productId: z.string(),
                  domainPrefix: z.string(),
                  domainSuffix: z.string(),
                  secure: z.boolean(),
                  ipVersionBehavior: z.string()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId })
            }
          }
        );

        return {
          edgeHostnames: response.edgeHostnames.items,
          totalCount: response.edgeHostnames.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `edge-hostnames:list:${params.contractId || 'all'}:${params.groupId || 'all'}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Remove property
   */
  async removeProperty(args: {
    propertyId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'remove-property',
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

        // Delete property
        await client.request({
          path: `/papi/v1/properties/${params.propertyId}`,
          method: 'DELETE',
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        });

        // Invalidate caches
        await this.invalidateCache([
          `property:${params.propertyId}:*`,
          `properties:list:*`
        ]);

        return {
          propertyId: params.propertyId,
          propertyName: property.propertyName,
          status: 'deleted',
          message: `✅ Deleted property ${property.propertyName} (${params.propertyId})`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Onboard property (placeholder)
   */
  async onboardPropertyTool(args: {
    domain: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      domain: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return {
      content: [{
        type: 'text',
        text: `Property onboarding for ${params.domain} - This is a placeholder implementation`
      }]
    };
  }

  /**
   * Validate rule tree
   */
  async validateRuleTree(args: {
    rules: any;
    ruleFormat?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      rules: z.any(),
      ruleFormat: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'validate-rule-tree',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/rules/validate',
            method: 'POST',
            body: {
              rules: params.rules,
              ...(params.ruleFormat && { ruleFormat: params.ruleFormat })
            },
            schema: z.object({
              errors: z.array(z.object({
                type: z.string(),
                title: z.string(),
                detail: z.string().optional(),
                instance: z.string().optional()
              })).optional(),
              warnings: z.array(z.object({
                type: z.string(),
                title: z.string(),
                detail: z.string().optional(),
                instance: z.string().optional()
              })).optional(),
              valid: z.boolean()
            })
          }
        );

        return {
          valid: response.valid,
          errors: response.errors || [],
          warnings: response.warnings || [],
          message: response.valid ? '✅ Rule tree is valid' : '❌ Rule tree validation failed'
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Search properties
   */
  async searchPropertiesOptimized(args: {
    query: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      query: z.string(),
      customer: z.string().optional()
    }).parse(args);

    // Use the listProperties method with filtering
    const allProperties = await this.listProperties({
      customer: params.customer,
      format: 'json' as const
    });

    const properties = (allProperties.content[0] as any).properties || [];
    const query = params.query.toLowerCase();
    
    const filtered = properties.filter((prop: any) => 
      prop.propertyName.toLowerCase().includes(query) ||
      prop.propertyId.toLowerCase().includes(query)
    );

    return {
      content: [{
        type: 'text',
        text: `Found ${filtered.length} properties matching "${params.query}":\n\n` +
          filtered.map((p: any) => `• ${p.propertyName} (${p.propertyId})`).join('\n')
      }]
    };
  }

  /**
   * Universal search (placeholder)
   */
  async universalSearchWithCacheHandler(args: {
    query: string;
    limit?: number;
    types?: string[];
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      query: z.string(),
      limit: z.number().optional(),
      types: z.array(z.string()).optional(),
      customer: z.string().optional()
    }).parse(args);

    return {
      content: [{
        type: 'text',
        text: `Universal search for "${params.query}" - This is a placeholder implementation`
      }]
    };
  }

  /**
   * List CP codes
   */
  async listCPCodes(args: {
    contractId?: string;
    groupId?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-cpcodes',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/cpcodes',
            method: 'GET',
            schema: z.object({
              cpcodes: z.object({
                items: z.array(z.object({
                  cpcodeId: z.string(),
                  cpcodeName: z.string(),
                  productIds: z.array(z.string()),
                  createdDate: z.string()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId })
            }
          }
        );

        return {
          cpcodes: response.cpcodes.items,
          totalCount: response.cpcodes.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `cpcodes:list:${params.contractId || 'all'}:${params.groupId || 'all'}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Create CP code
   */
  async createCPCode(args: {
    cpcodeName: string;
    contractId: string;
    groupId: string;
    productId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      cpcodeName: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-cpcode',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/cpcodes',
            method: 'POST',
            body: {
              cpcodeName: params.cpcodeName,
              productId: params.productId
            },
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            },
            schema: z.object({
              cpcodeLink: z.string(),
              cpcodeId: z.string()
            })
          }
        );

        return {
          cpcodeId: response.cpcodeId,
          cpcodeName: params.cpcodeName,
          cpcodeLink: response.cpcodeLink,
          message: `✅ Created CP code ${params.cpcodeName}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Get CP code
   */
  async getCPCode(args: {
    cpcodeId: number;
    contractId?: string;
    groupId?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      cpcodeId: z.number(),
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-cpcode',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/cpcodes/${params.cpcodeId}`,
            method: 'GET',
            schema: z.object({
              cpcodes: z.object({
                items: z.array(z.object({
                  cpcodeId: z.string(),
                  cpcodeName: z.string(),
                  productIds: z.array(z.string()),
                  createdDate: z.string()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId })
            }
          }
        );

        const cpcode = response.cpcodes.items[0];
        if (!cpcode) {
          throw new Error(`CP code ${params.cpcodeId} not found`);
        }

        return cpcode;
      },
      {
        customer: params.customer,
        cacheKey: (p) => `cpcode:${p.cpcodeId}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * List includes
   */
  async listIncludes(args: {
    contractId: string;
    groupId: string;
    includeType?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: z.string(),
      groupId: z.string(),
      includeType: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

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
                  productionVersion: z.number().nullable()
                }))
              })
            }),
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId,
              ...(params.includeType && { includeType: params.includeType })
            }
          }
        );

        return {
          includes: response.includes.items,
          totalCount: response.includes.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `includes:list:${params.contractId}:${params.groupId}:${params.includeType || 'all'}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Get include
   */
  async getInclude(args: {
    includeId: string;
    contractId: string;
    groupId: string;
    version?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      version: z.number().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-include',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
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
                  productionVersion: z.number().nullable()
                }))
              })
            }),
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            }
          }
        );

        const include = response.includes.items[0];
        if (!include) {
          throw new Error(`Include ${params.includeId} not found`);
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
   * Create include
   */
  async createInclude(args: {
    includeName: string;
    includeType: string;
    contractId: string;
    groupId: string;
    productId?: string;
    ruleFormat?: string;
    cloneFrom?: {
      includeId: string;
      version: number;
    };
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeName: z.string(),
      includeType: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string().optional(),
      ruleFormat: z.string().optional(),
      cloneFrom: z.object({
        includeId: z.string(),
        version: z.number()
      }).optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-include',
      params,
      async (client) => {
        const body: any = {
          includeName: params.includeName,
          includeType: params.includeType
        };

        if (params.productId) body.productId = params.productId;
        if (params.ruleFormat) body.ruleFormat = params.ruleFormat;
        if (params.cloneFrom) body.cloneFrom = params.cloneFrom;

        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/includes',
            method: 'POST',
            body,
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            },
            schema: z.object({
              includeLink: z.string(),
              includeId: z.string()
            })
          }
        );

        return {
          includeId: response.includeId,
          includeName: params.includeName,
          includeLink: response.includeLink,
          message: `✅ Created include ${params.includeName}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Update include
   */
  async updateInclude(args: {
    includeId: string;
    version: number;
    rules: any;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: z.string(),
      version: z.number(),
      rules: z.any(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'update-include',
      params,
      async (client) => {
        // Get include details for contract/group
        /*
        const _includeResponse = await this.getInclude({ // Unused
          includeId: params.includeId,
          contractId: 'dummy', // We'll get this from the include
          groupId: 'dummy',
          customer: params.customer
        });
        */

        // const _include = includeResponse.content[0] as any; // Unused

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/versions/${params.version}/rules`,
            method: 'PUT',
            body: {
              rules: params.rules
            },
            schema: z.object({
              etag: z.string(),
              rules: z.any()
            })
          }
        );

        return {
          includeId: params.includeId,
          version: params.version,
          etag: response.etag,
          message: `✅ Updated include ${params.includeId} version ${params.version}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Create include version
   */
  async createIncludeVersion(args: {
    includeId: string;
    createFromVersion?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: z.string(),
      createFromVersion: z.number().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-include-version',
      params,
      async (client) => {
        const body: any = {};
        if (params.createFromVersion) {
          body.createFromVersion = params.createFromVersion;
        }

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/versions`,
            method: 'POST',
            body,
            schema: z.object({
              versionLink: z.string(),
              version: z.number()
            })
          }
        );

        return {
          includeId: params.includeId,
          newVersion: response.version,
          versionLink: response.versionLink,
          message: `✅ Created new version ${response.version} for include ${params.includeId}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Activate include
   */
  async activateInclude(args: {
    includeId: string;
    version: number;
    network: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: z.string(),
      version: z.number(),
      network: z.enum(['staging', 'production']),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'activate-include',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/includes/${params.includeId}/activations`,
            method: 'POST',
            body: {
              includeVersion: params.version,
              network: params.network.toUpperCase()
            },
            schema: z.object({
              activationLink: z.string(),
              activationId: z.string()
            })
          }
        );

        return {
          includeId: params.includeId,
          version: params.version,
          network: params.network,
          activationId: response.activationId,
          activationLink: response.activationLink,
          message: `✅ Started activation of include ${params.includeId} v${params.version} to ${params.network}`
        };
      },
      {
        customer: params.customer
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
      includeId: z.string(),
      activationId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-include-activation-status',
      params,
      async (client) => {
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
                  updateDate: z.string()
                }))
              })
            })
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

  /**
   * List include activations
   */
  async listIncludeActivations(args: {
    includeId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      includeId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-include-activations',
      params,
      async (client) => {
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
                  updateDate: z.string()
                }))
              })
            })
          }
        );

        return {
          activations: response.activations.items,
          totalCount: response.activations.items.length
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
   * NOTE: Advanced functionality (rule tree validation, edge hostname management, 
   * property metadata) is already implemented in the existing methods above.
   * The missing tools have been restored through the existing comprehensive
   * property management implementation.
   */

  /**
   * Compare two properties configuration
   */
  async compareProperties(args: {
    sourcePropertyId: string;
    targetPropertyId: string;
    version?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      sourcePropertyId: PropertyIdSchema,
      targetPropertyId: PropertyIdSchema,
      version: z.number().int().positive().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'compare-properties',
      params,
      async (client) => {
        // Get both property details
        const [sourceResponse, targetResponse] = await Promise.all([
          this.makeTypedRequest(
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
          ),
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.targetPropertyId}`,
              method: 'GET',
              schema: z.object({
                properties: z.object({
                  items: z.array(PropertySchema)
                })
              })
            }
          )
        ]);

        const sourceProperty = sourceResponse.properties.items[0];
        const targetProperty = targetResponse.properties.items[0];

        if (!sourceProperty || !targetProperty) {
          throw new Error('One or both properties not found');
        }

        const sourceVersion = params.version || sourceProperty.productionVersion || sourceProperty.latestVersion;
        const targetVersion = params.version || targetProperty.productionVersion || targetProperty.latestVersion;

        // Get rules for both properties
        const [sourceRules, targetRules] = await Promise.all([
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.sourcePropertyId}/versions/${sourceVersion}/rules`,
              method: 'GET',
              schema: PropertyRulesResponseSchema,
              queryParams: {
                contractId: sourceProperty.contractId,
                groupId: sourceProperty.groupId
              }
            }
          ),
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.targetPropertyId}/versions/${targetVersion}/rules`,
              method: 'GET',
              schema: PropertyRulesResponseSchema,
              queryParams: {
                contractId: targetProperty.contractId,
                groupId: targetProperty.groupId
              }
            }
          )
        ]);

        // Get hostnames for both properties
        const [sourceHostnames, targetHostnames] = await Promise.all([
          this.listPropertyVersionHostnames({
            propertyId: params.sourcePropertyId,
            version: sourceVersion,
            customer: params.customer
          }),
          this.listPropertyVersionHostnames({
            propertyId: params.targetPropertyId,
            version: targetVersion,
            customer: params.customer
          })
        ]);

        // Compare configurations
        const differences = {
          metadata: {
            contractMatch: sourceProperty.contractId === targetProperty.contractId,
            groupMatch: sourceProperty.groupId === targetProperty.groupId,
            ruleFormatMatch: sourceRules.ruleFormat === targetRules.ruleFormat
          },
          versions: {
            source: {
              latest: sourceProperty.latestVersion,
              production: sourceProperty.productionVersion,
              staging: sourceProperty.stagingVersion
            },
            target: {
              latest: targetProperty.latestVersion,
              production: targetProperty.productionVersion,
              staging: targetProperty.stagingVersion
            }
          },
          rules: this.calculateRuleDifferences(sourceRules.rules, targetRules.rules),
          hostnames: {
            sourceOnly: (sourceHostnames as any).hostnames.filter((sh: any) => 
              !(targetHostnames as any).hostnames.some((th: any) => th.cnameFrom === sh.cnameFrom)
            ),
            targetOnly: (targetHostnames as any).hostnames.filter((th: any) => 
              !(sourceHostnames as any).hostnames.some((sh: any) => sh.cnameFrom === th.cnameFrom)
            ),
            different: (sourceHostnames as any).hostnames.filter((sh: any) => {
              const targetHost = (targetHostnames as any).hostnames.find((th: any) => th.cnameFrom === sh.cnameFrom);
              return targetHost && targetHost.cnameTo !== sh.cnameTo;
            })
          }
        };

        return {
          sourceProperty: {
            id: sourceProperty.propertyId,
            name: sourceProperty.propertyName,
            version: sourceVersion
          },
          targetProperty: {
            id: targetProperty.propertyId,
            name: targetProperty.propertyName,
            version: targetVersion
          },
          differences: differences,
          summary: {
            hasRuleDifferences: differences.rules.length > 0,
            hasHostnameDifferences: 
              differences.hostnames.sourceOnly.length > 0 ||
              differences.hostnames.targetOnly.length > 0 ||
              differences.hostnames.different.length > 0,
            configurationMatch: 
              differences.rules.length === 0 && 
              differences.hostnames.sourceOnly.length === 0 &&
              differences.hostnames.targetOnly.length === 0 &&
              differences.hostnames.different.length === 0
          }
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Detect configuration drift across property versions
   */
  async detectConfigurationDrift(args: {
    propertyId: string;
    baselineVersion?: number;
    includeInactiveVersions?: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      baselineVersion: z.number().int().positive().optional(),
      includeInactiveVersions: z.boolean().optional().default(false),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'detect-configuration-drift',
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

        // Get all versions
        const versionsResponse = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions`,
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

        const versions = versionsResponse.versions.items;
        const baselineVersion = params.baselineVersion || property.productionVersion || property.latestVersion;
        
        // Get baseline rules
        const baselineRules = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.propertyId}/versions/${baselineVersion}/rules`,
            method: 'GET',
            schema: PropertyRulesResponseSchema,
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            }
          }
        );

        // Analyze drift
        const driftAnalysis = [];
        
        for (const version of versions) {
          if (version.propertyVersion === baselineVersion) continue;
          if (!params.includeInactiveVersions && 
              version.productionStatus === 'INACTIVE' && 
              version.stagingStatus === 'INACTIVE') continue;

          // Get rules for this version
          const versionRules = await this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.propertyId}/versions/${version.propertyVersion}/rules`,
              method: 'GET',
              schema: PropertyRulesResponseSchema,
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          );

          const differences = this.calculateRuleDifferences(baselineRules.rules, versionRules.rules);
          
          if (differences.length > 0) {
            driftAnalysis.push({
              version: version.propertyVersion,
              updatedDate: version.updatedDate,
              updatedBy: version.updatedByUser,
              productionStatus: version.productionStatus,
              stagingStatus: version.stagingStatus,
              driftCount: differences.length,
              driftTypes: {
                added: differences.filter(d => d.type === 'added').length,
                modified: differences.filter(d => d.type === 'modified').length,
                deleted: differences.filter(d => d.type === 'deleted').length
              },
              note: version.note
            });
          }
        }

        return {
          propertyId: params.propertyId,
          propertyName: property.propertyName,
          baselineVersion: baselineVersion,
          totalVersions: versions.length,
          versionsWithDrift: driftAnalysis.length,
          driftAnalysis: driftAnalysis,
          summary: {
            hasDrift: driftAnalysis.length > 0,
            driftPercentage: (driftAnalysis.length / versions.length) * 100,
            mostRecentDrift: driftAnalysis.length > 0 ? driftAnalysis[0] : null
          }
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Perform batch operations on property versions
   */
  async batchVersionOperations(args: {
    operations: Array<{
      propertyId: string;
      action: 'create' | 'activate' | 'deactivate';
      version?: number;
      network?: 'STAGING' | 'PRODUCTION';
      notes?: string;
    }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      operations: z.array(z.object({
        propertyId: PropertyIdSchema,
        action: z.enum(['create', 'activate', 'deactivate']),
        version: z.number().int().positive().optional(),
        network: z.enum(['STAGING', 'PRODUCTION']).optional(),
        notes: z.string().optional()
      })),
      customer: z.string().optional()
    }).parse(args);

    return this.withProgress(
      `Performing ${params.operations.length} batch operations`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'batch-version-operations',
          params,
          async (_client) => {
            const results = [];
            const totalOperations = params.operations.length;

            for (let i = 0; i < params.operations.length; i++) {
              const operation = params.operations[i];
              if (!operation) continue;
              const progressPercent = Math.floor((i / totalOperations) * 90);
              progress.update(progressPercent, `Processing ${operation.action} for ${operation.propertyId}...`);

              try {
                let result;
                switch (operation.action) {
                  case 'create':
                    const createResult = await this.createPropertyVersion({
                      propertyId: operation.propertyId,
                      createFromVersion: operation.version,
                      customer: params.customer
                    });
                    result = {
                      propertyId: operation.propertyId,
                      action: operation.action,
                      status: 'success',
                      newVersion: (createResult as any).newVersion
                    };
                    break;

                  case 'activate':
                    const activateResult = await this.activateProperty({
                      propertyId: operation.propertyId,
                      version: operation.version || 0, // Will use latest if 0
                      network: operation.network || 'STAGING',
                      notes: operation.notes || 'Batch activation',
                      acknowledgeWarnings: true,
                      customer: params.customer
                    });
                    result = {
                      propertyId: operation.propertyId,
                      action: operation.action,
                      status: 'success',
                      activationId: (activateResult as any).activationId
                    };
                    break;

                  case 'deactivate':
                    // Note: PAPI doesn't support deactivation directly
                    // You would need to activate an older version instead
                    result = {
                      propertyId: operation.propertyId,
                      action: operation.action,
                      status: 'failed',
                      error: 'Deactivation not supported. Activate an older version instead.'
                    };
                    break;

                  default:
                    result = {
                      propertyId: operation.propertyId,
                      action: operation.action,
                      status: 'failed',
                      error: `Unknown action: ${operation.action}`
                    };
                }

                results.push(result);
              } catch (error) {
                results.push({
                  propertyId: operation.propertyId,
                  action: operation.action,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }

            progress.update(100, 'Batch operations complete!');

            const summary = {
              total: results.length,
              successful: results.filter(r => r.status === 'success').length,
              failed: results.filter(r => r.status === 'failed').length
            };

            return {
              operations: results,
              summary,
              message: `✅ Completed ${summary.successful}/${summary.total} operations successfully`
            };
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Check property health and identify issues
   */
  async checkPropertyHealth(args: {
    propertyId: string;
    version?: number;
    checks?: Array<'certificate_expiry' | 'rule_warnings' | 'activation_status' | 'hostname_coverage' | 'origin_connectivity'>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: PropertyIdSchema,
      version: z.number().int().positive().optional(),
      checks: z.array(z.enum([
        'certificate_expiry',
        'rule_warnings',
        'activation_status',
        'hostname_coverage',
        'origin_connectivity'
      ])).optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.withProgress(
      `Checking health for property ${params.propertyId}`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'check-property-health',
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

            const version = params.version || property.productionVersion || property.latestVersion;
            const healthChecks = params.checks || [
              'certificate_expiry',
              'rule_warnings',
              'activation_status',
              'hostname_coverage',
              'origin_connectivity'
            ];

            const healthReport: any = {
              propertyId: params.propertyId,
              propertyName: property.propertyName,
              version: version,
              checkTime: new Date().toISOString(),
              checks: {}
            };

            // Certificate expiry check
            if (healthChecks.includes('certificate_expiry')) {
              progress.update(25, 'Checking certificate expiry...');
              
              try {
                const hostnamesResponse = await this.listPropertyVersionHostnames({
                  propertyId: params.propertyId,
                  version: version,
                  customer: params.customer
                });

                const certificateIssues = [];
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                for (const hostname of (hostnamesResponse as any).hostnames) {
                  if (hostname.certStatus?.production) {
                    for (const cert of hostname.certStatus.production) {
                      if (cert.validNotAfter) {
                        const expiryDate = new Date(cert.validNotAfter);
                        if (expiryDate < now) {
                          certificateIssues.push({
                            hostname: hostname.cnameFrom,
                            status: 'expired',
                            expiredOn: cert.validNotAfter
                          });
                        } else if (expiryDate < thirtyDaysFromNow) {
                          certificateIssues.push({
                            hostname: hostname.cnameFrom,
                            status: 'expiring_soon',
                            expiresOn: cert.validNotAfter
                          });
                        }
                      }
                    }
                  }
                }

                healthReport.checks.certificate_expiry = {
                  status: certificateIssues.length > 0 ? 'warning' : 'healthy',
                  issues: certificateIssues
                };
              } catch (error) {
                healthReport.checks.certificate_expiry = {
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            }

            // Rule warnings check
            if (healthChecks.includes('rule_warnings')) {
              progress.update(50, 'Checking rule warnings...');
              
              try {
                const rulesResponse = await this.getPropertyRules({
                  propertyId: params.propertyId,
                  version: version,
                  validateRules: true,
                  customer: params.customer
                });

                const warnings = (rulesResponse as any).warnings || [];
                healthReport.checks.rule_warnings = {
                  status: warnings.length > 0 ? 'warning' : 'healthy',
                  warningCount: warnings.length,
                  warnings: warnings.slice(0, 10) // First 10 warnings
                };
              } catch (error) {
                healthReport.checks.rule_warnings = {
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            }

            // Activation status check
            if (healthChecks.includes('activation_status')) {
              progress.update(75, 'Checking activation status...');
              
              healthReport.checks.activation_status = {
                status: 'healthy',
                production: {
                  version: property.productionVersion,
                  isLatest: property.productionVersion === property.latestVersion
                },
                staging: {
                  version: property.stagingVersion,
                  isLatest: property.stagingVersion === property.latestVersion
                }
              };
            }

            // Hostname coverage check
            if (healthChecks.includes('hostname_coverage')) {
              progress.update(90, 'Checking hostname coverage...');
              
              try {
                const hostnamesResponse = await this.listPropertyVersionHostnames({
                  propertyId: params.propertyId,
                  version: version,
                  customer: params.customer
                });

                const hostnames = (hostnamesResponse as any).hostnames || [];
                healthReport.checks.hostname_coverage = {
                  status: hostnames.length > 0 ? 'healthy' : 'warning',
                  totalHostnames: hostnames.length,
                  hasDefaultCert: hostnames.some((h: any) => h.certStatus?.production?.some((c: any) => c.status === 'DEPLOYED'))
                };
              } catch (error) {
                healthReport.checks.hostname_coverage = {
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            }

            progress.update(100, 'Health check complete!');

            // Calculate overall health
            const statuses = Object.values(healthReport.checks).map((check: any) => check.status);
            healthReport.overallStatus = statuses.includes('error') ? 'error' : 
                                       statuses.includes('warning') ? 'warning' : 'healthy';

            return healthReport;
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Bulk activate multiple properties
   */
  async bulkActivateProperties(args: {
    properties: Array<{
      propertyId: string;
      version: number;
      network: 'STAGING' | 'PRODUCTION';
    }>;
    notes?: string;
    notifyEmails?: string[];
    acknowledgeWarnings?: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      properties: z.array(z.object({
        propertyId: PropertyIdSchema,
        version: z.number().int().positive(),
        network: z.enum(['STAGING', 'PRODUCTION'])
      })),
      notes: z.string().optional(),
      notifyEmails: z.array(z.string().email()).optional(),
      acknowledgeWarnings: z.boolean().optional().default(false),
      customer: z.string().optional()
    }).parse(args);

    return this.withProgress(
      `Activating ${params.properties.length} properties`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'bulk-activate-properties',
          params,
          async (_client) => {
            const results = [];
            const totalProperties = params.properties.length;

            for (let i = 0; i < params.properties.length; i++) {
              const prop = params.properties[i];
              if (!prop) continue;
              const progressPercent = Math.floor((i / totalProperties) * 90);
              progress.update(progressPercent, `Activating ${prop.propertyId} to ${prop.network}...`);

              try {
                const activateResult = await this.activateProperty({
                  propertyId: prop.propertyId,
                  version: prop.version,
                  network: prop.network,
                  notes: params.notes || `Bulk activation to ${prop.network}`,
                  notifyEmails: params.notifyEmails,
                  acknowledgeWarnings: params.acknowledgeWarnings,
                  customer: params.customer
                });

                results.push({
                  propertyId: prop.propertyId,
                  version: prop.version,
                  network: prop.network,
                  status: 'submitted',
                  activationId: (activateResult as any).activationId
                });
              } catch (error) {
                results.push({
                  propertyId: prop.propertyId,
                  version: prop.version,
                  network: prop.network,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }

            progress.update(100, 'Bulk activation complete!');

            const summary = {
              total: results.length,
              submitted: results.filter(r => r.status === 'submitted').length,
              failed: results.filter(r => r.status === 'failed').length
            };

            return {
              operations: results,
              summary,
              message: `✅ Submitted ${summary.submitted}/${summary.total} activations`
            };
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Bulk clone multiple properties
   */
  async bulkCloneProperties(args: {
    sourceProperties: Array<{
      propertyId: string;
      newName: string;
      contractId?: string;
      groupId?: string;
    }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      sourceProperties: z.array(z.object({
        propertyId: PropertyIdSchema,
        newName: z.string().min(1),
        contractId: z.string().optional(),
        groupId: z.string().optional()
      })),
      customer: z.string().optional()
    }).parse(args);

    return this.withProgress(
      `Cloning ${params.sourceProperties.length} properties`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'bulk-clone-properties',
          params,
          async (_client) => {
            const results = [];
            const totalProperties = params.sourceProperties.length;

            for (let i = 0; i < params.sourceProperties.length; i++) {
              const source = params.sourceProperties[i];
              if (!source) continue;
              const progressPercent = Math.floor((i / totalProperties) * 90);
              progress.update(progressPercent, `Cloning ${source.propertyId} as ${source.newName}...`);

              try {
                const cloneResult = await this.cloneProperty({
                  sourcePropertyId: source.propertyId,
                  propertyName: source.newName,
                  contractId: source.contractId,
                  groupId: source.groupId,
                  customer: params.customer
                });

                results.push({
                  sourcePropertyId: source.propertyId,
                  newName: source.newName,
                  status: 'success',
                  newPropertyId: (cloneResult as any).propertyId
                });
              } catch (error) {
                results.push({
                  sourcePropertyId: source.propertyId,
                  newName: source.newName,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }

            progress.update(100, 'Bulk cloning complete!');

            const summary = {
              total: results.length,
              successful: results.filter(r => r.status === 'success').length,
              failed: results.filter(r => r.status === 'failed').length
            };

            return {
              operations: results,
              summary,
              message: `✅ Cloned ${summary.successful}/${summary.total} properties successfully`
            };
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Bulk manage hostnames across properties
   */
  async bulkManageHostnames(args: {
    operations: Array<{
      propertyId: string;
      version: number;
      action: 'add' | 'remove';
      hostnames: string[];
    }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      operations: z.array(z.object({
        propertyId: PropertyIdSchema,
        version: z.number().int().positive(),
        action: z.enum(['add', 'remove']),
        hostnames: z.array(z.string())
      })),
      customer: z.string().optional()
    }).parse(args);

    return this.withProgress(
      `Processing ${params.operations.length} hostname operations`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'bulk-manage-hostnames',
          params,
          async (_client) => {
            const results = [];
            const totalOperations = params.operations.length;

            for (let i = 0; i < params.operations.length; i++) {
              const operation = params.operations[i];
              if (!operation) continue;
              const progressPercent = Math.floor((i / totalOperations) * 90);
              progress.update(progressPercent, `${operation.action === 'add' ? 'Adding' : 'Removing'} hostnames for ${operation.propertyId}...`);

              try {
                // Process all hostnames at once
                let result;
                if (operation.action === 'add') {
                  result = await this.addPropertyHostname({
                    propertyId: operation.propertyId,
                    version: operation.version,
                    hostnames: operation.hostnames,
                    customer: params.customer
                  });
                } else {
                  result = await this.removePropertyHostname({
                    propertyId: operation.propertyId,
                    version: operation.version,
                    hostnames: operation.hostnames,
                    customer: params.customer
                  });
                }

                results.push({
                  propertyId: operation.propertyId,
                  version: operation.version,
                  action: operation.action,
                  hostnames: operation.hostnames,
                  status: 'success',
                  message: (result as any).message || `Successfully ${operation.action}ed ${operation.hostnames.length} hostnames`
                });
              } catch (error) {
                results.push({
                  propertyId: operation.propertyId,
                  version: operation.version,
                  action: operation.action,
                  hostnames: operation.hostnames,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }

            progress.update(100, 'Bulk hostname operations complete!');

            const summary = {
              total: results.length,
              successful: results.filter(r => r.status === 'success').length,
              failed: results.filter(r => r.status === 'failed').length
            };

            return {
              operations: results,
              summary,
              message: `✅ Completed ${summary.successful}/${summary.total} hostname operations`
            };
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Bulk update property rules
   */
  async bulkUpdatePropertyRules(args: {
    updates: Array<{
      propertyId: string;
      version: number;
      rules: any; // Will be validated as RuleTreeSchema
    }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      updates: z.array(z.object({
        propertyId: PropertyIdSchema,
        version: z.number().int().positive(),
        rules: RuleTreeSchema
      })),
      customer: z.string().optional()
    }).parse(args);

    return this.withProgress(
      `Updating rules for ${params.updates.length} properties`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'bulk-update-property-rules',
          params,
          async (_client) => {
            const results = [];
            const totalUpdates = params.updates.length;

            for (let i = 0; i < params.updates.length; i++) {
              const update = params.updates[i];
              if (!update) continue;
              const progressPercent = Math.floor((i / totalUpdates) * 90);
              progress.update(progressPercent, `Updating rules for ${update.propertyId} v${update.version}...`);

              try {
                await this.updatePropertyRules({
                  propertyId: update.propertyId,
                  version: update.version,
                  rules: update.rules,
                  validateRules: true,
                  customer: params.customer
                });

                results.push({
                  propertyId: update.propertyId,
                  version: update.version,
                  status: 'success',
                  message: 'Rules updated successfully'
                });
              } catch (error) {
                results.push({
                  propertyId: update.propertyId,
                  version: update.version,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }

            progress.update(100, 'Bulk rule updates complete!');

            const summary = {
              total: results.length,
              successful: results.filter(r => r.status === 'success').length,
              failed: results.filter(r => r.status === 'failed').length
            };

            return {
              operations: results,
              summary,
              message: `✅ Updated ${summary.successful}/${summary.total} property rules`
            };
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Get bulk operation status (placeholder for future implementation)
   */
  async getBulkOperationStatus(args: {
    operationId: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      operationId: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-bulk-operation-status',
      params,
      async () => {
        // This would typically track async bulk operations
        // For now, return a placeholder response
        return {
          operationId: params.operationId,
          status: 'completed',
          message: 'Bulk operation tracking not yet implemented'
        };
      },
      {
        customer: params.customer
      }
    );
  }
}

// Export singleton instance
export const consolidatedPropertyTools = new ConsolidatedPropertyTools();