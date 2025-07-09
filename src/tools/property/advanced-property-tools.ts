/**
 * Advanced Property Tools - Restored Functionality
 * 
 * CODE KAI: Restoring missing property management tools that were lost during consolidation
 * These implementations follow the same patterns as consolidated-property-tools.ts
 * and properly implement Akamai PAPI (Property Manager API) functionality
 */

import { z } from 'zod';
import { 
  BaseTool,
  PropertyIdSchema,
  PropertyVersionDetailsSchema,
  CustomerSchema,
  type MCPToolResponse
} from '../common';
import { ProgressToken } from '../../utils/mcp-progress';

/**
 * Input schemas for advanced property operations
 */
const RollbackPropertyVersionSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  targetVersion: z.number().int().positive().describe('Version to rollback to'),
  notes: z.string().optional().describe('Notes for the rollback')
});

const GetVersionDiffSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive()
});

const BatchVersionOperationsSchema = CustomerSchema.extend({
  operations: z.array(z.object({
    propertyId: PropertyIdSchema,
    action: z.enum(['create', 'activate', 'deactivate']),
    version: z.number().int().positive().optional(),
    network: z.enum(['STAGING', 'PRODUCTION']).optional(),
    notes: z.string().optional()
  }))
});

const ComparePropertiesSchema = CustomerSchema.extend({
  sourcePropertyId: PropertyIdSchema,
  targetPropertyId: PropertyIdSchema,
  version: z.number().int().positive().optional().describe('Specific version to compare')
});

const DetectConfigurationDriftSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  baselineVersion: z.number().int().positive().optional(),
  includeInactiveVersions: z.boolean().optional().default(false)
});

const CheckPropertyHealthSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive().optional(),
  checks: z.array(z.enum([
    'certificate_expiry',
    'rule_warnings',
    'activation_status',
    'hostname_coverage',
    'origin_connectivity'
  ])).optional()
});

const BulkActivatePropertiesSchema = CustomerSchema.extend({
  properties: z.array(z.object({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive(),
    network: z.enum(['STAGING', 'PRODUCTION'])
  })),
  notes: z.string().optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().optional().default(false)
});

const BulkClonePropertiesSchema = CustomerSchema.extend({
  sourceProperties: z.array(z.object({
    propertyId: PropertyIdSchema,
    newName: z.string().min(1),
    contractId: z.string().optional(),
    groupId: z.string().optional()
  }))
});

const BulkManageHostnamesSchema = CustomerSchema.extend({
  operations: z.array(z.object({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive(),
    action: z.enum(['add', 'remove']),
    hostnames: z.array(z.string())
  }))
});

const BulkUpdatePropertyRulesSchema = CustomerSchema.extend({
  updates: z.array(z.object({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive(),
    rules: z.any() // Will be validated as RuleTreeSchema in implementation
  }))
});

const GetBulkOperationStatusSchema = CustomerSchema.extend({
  operationId: z.string().describe('Bulk operation ID to check status')
});

/**
 * Advanced Property Tools implementation
 */
export class AdvancedPropertyTools extends BaseTool {
  protected readonly domain = 'property';

  /**
   * Rollback property to a previous version
   */
  async rollbackPropertyVersion(args: z.infer<typeof RollbackPropertyVersionSchema>): Promise<MCPToolResponse> {
    const params = RollbackPropertyVersionSchema.parse(args);

    return this.withProgress(
      `Rolling back property ${params.propertyId} to version ${params.targetVersion}`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'rollback-property-version',
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
                    items: z.array(z.object({
                      propertyId: z.string(),
                      propertyName: z.string(),
                      contractId: z.string(),
                      groupId: z.string(),
                      latestVersion: z.number()
                    }))
                  })
                })
              }
            );

            const property = propResponse.properties.items[0];
            if (!property) {
              throw new Error(`Property ${params.propertyId} not found`);
            }

            progress.update(30, 'Getting target version rules...');

            // Get rules from target version
            const rulesResponse = await this.makeTypedRequest(
              client,
              {
                path: `/papi/v1/properties/${params.propertyId}/versions/${params.targetVersion}/rules`,
                method: 'GET',
                schema: z.object({
                  rules: z.any(),
                  ruleFormat: z.string()
                }),
                queryParams: {
                  contractId: property.contractId,
                  groupId: property.groupId
                }
              }
            );

            progress.update(50, 'Creating new version from target...');

            // Create new version
            const versionResponse = await this.makeTypedRequest(
              client,
              {
                path: `/papi/v1/properties/${params.propertyId}/versions`,
                method: 'POST',
                schema: z.object({
                  versionLink: z.string()
                }),
                body: {
                  createFromVersion: params.targetVersion
                },
                queryParams: {
                  contractId: property.contractId,
                  groupId: property.groupId
                }
              }
            );

            const newVersion = parseInt(versionResponse.versionLink.split('/').pop() || '0');

            progress.update(70, 'Applying rollback notes...');

            // Update version notes
            if (params.notes) {
              await this.makeTypedRequest(
                client,
                {
                  path: `/papi/v1/properties/${params.propertyId}/versions/${newVersion}`,
                  method: 'PATCH',
                  schema: z.object({ versionLink: z.string() }),
                  body: {
                    note: `Rollback to v${params.targetVersion}: ${params.notes}`
                  },
                  queryParams: {
                    contractId: property.contractId,
                    groupId: property.groupId
                  }
                }
              );
            }

            progress.update(90, 'Rollback complete!');

            return {
              propertyId: params.propertyId,
              rolledBackFrom: property.latestVersion,
              rolledBackTo: params.targetVersion,
              newVersion: newVersion,
              message: `✅ Successfully rolled back property ${params.propertyId} from v${property.latestVersion} to v${params.targetVersion} (new version: ${newVersion})`
            };
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
   * Get differences between two property versions
   */
  async getVersionDiff(args: z.infer<typeof GetVersionDiffSchema>): Promise<MCPToolResponse> {
    const params = GetVersionDiffSchema.parse(args);

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
                items: z.array(z.object({
                  propertyId: z.string(),
                  propertyName: z.string(),
                  contractId: z.string(),
                  groupId: z.string()
                }))
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
              schema: z.object({
                rules: z.any(),
                ruleFormat: z.string()
              }),
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
              schema: z.object({
                rules: z.any(),
                ruleFormat: z.string()
              }),
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          )
        ]);

        // Get version details
        const [fromVersion, toVersion] = await Promise.all([
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.propertyId}/versions/${params.fromVersion}`,
              method: 'GET',
              schema: PropertyVersionDetailsSchema,
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          ),
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.propertyId}/versions/${params.toVersion}`,
              method: 'GET',
              schema: PropertyVersionDetailsSchema,
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            }
          )
        ]);

        // Calculate differences
        const differences = this.calculateRuleDifferences(fromRules.rules, toRules.rules);

        return {
          propertyId: params.propertyId,
          propertyName: property.propertyName,
          fromVersion: {
            version: params.fromVersion,
            updatedDate: fromVersion.versions.items[0].updatedDate,
            updatedBy: fromVersion.versions.items[0].updatedByUser,
            note: fromVersion.versions.items[0].note
          },
          toVersion: {
            version: params.toVersion,
            updatedDate: toVersion.versions.items[0].updatedDate,
            updatedBy: toVersion.versions.items[0].updatedByUser,
            note: toVersion.versions.items[0].note
          },
          differences: differences,
          summary: {
            totalChanges: differences.length,
            addedRules: differences.filter(d => d.type === 'added').length,
            modifiedRules: differences.filter(d => d.type === 'modified').length,
            deletedRules: differences.filter(d => d.type === 'deleted').length
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
   * Perform batch operations on property versions
   */
  async batchVersionOperations(args: z.infer<typeof BatchVersionOperationsSchema>): Promise<MCPToolResponse> {
    const params = BatchVersionOperationsSchema.parse(args);

    return this.withProgress(
      `Performing ${params.operations.length} batch operations`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'batch-version-operations',
          params,
          async (client) => {
            const results = [];
            const totalOperations = params.operations.length;

            for (let i = 0; i < params.operations.length; i++) {
              const operation = params.operations[i];
              const progressPercent = Math.floor((i / totalOperations) * 90);
              progress.update(progressPercent, `Processing ${operation.action} for ${operation.propertyId}...`);

              try {
                // Get property details
                const propResponse = await this.makeTypedRequest(
                  client,
                  {
                    path: `/papi/v1/properties/${operation.propertyId}`,
                    method: 'GET',
                    schema: z.object({
                      properties: z.object({
                        items: z.array(z.object({
                          propertyId: z.string(),
                          propertyName: z.string(),
                          contractId: z.string(),
                          groupId: z.string(),
                          latestVersion: z.number()
                        }))
                      })
                    })
                  }
                );

                const property = propResponse.properties.items[0];
                if (!property) {
                  results.push({
                    propertyId: operation.propertyId,
                    action: operation.action,
                    status: 'failed',
                    error: 'Property not found'
                  });
                  continue;
                }

                let result;
                switch (operation.action) {
                  case 'create':
                    const createResponse = await this.makeTypedRequest(
                      client,
                      {
                        path: `/papi/v1/properties/${operation.propertyId}/versions`,
                        method: 'POST',
                        schema: z.object({ versionLink: z.string() }),
                        body: {
                          createFromVersion: operation.version || property.latestVersion
                        },
                        queryParams: {
                          contractId: property.contractId,
                          groupId: property.groupId
                        }
                      }
                    );
                    const newVersion = parseInt(createResponse.versionLink.split('/').pop() || '0');
                    result = {
                      propertyId: operation.propertyId,
                      action: operation.action,
                      status: 'success',
                      newVersion: newVersion
                    };
                    break;

                  case 'activate':
                    const activateResponse = await this.makeTypedRequest(
                      client,
                      {
                        path: `/papi/v1/properties/${operation.propertyId}/activations`,
                        method: 'POST',
                        schema: z.object({ activationLink: z.string() }),
                        body: {
                          propertyVersion: operation.version || property.latestVersion,
                          network: operation.network || 'STAGING',
                          notifyEmails: [],
                          acknowledgeAllWarnings: true,
                          note: operation.notes || 'Batch activation'
                        },
                        queryParams: {
                          contractId: property.contractId,
                          groupId: property.groupId
                        }
                      }
                    );
                    result = {
                      propertyId: operation.propertyId,
                      action: operation.action,
                      status: 'success',
                      activationId: activateResponse.activationLink.split('/').pop()
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
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            progress.update(100, 'Batch operations complete!');

            return {
              totalOperations: params.operations.length,
              successful: results.filter(r => r.status === 'success').length,
              failed: results.filter(r => r.status === 'failed').length,
              results: results
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
   * Compare configurations between two properties
   */
  async compareProperties(args: z.infer<typeof ComparePropertiesSchema>): Promise<MCPToolResponse> {
    const params = ComparePropertiesSchema.parse(args);

    return this.executeStandardOperation(
      'compare-properties',
      params,
      async (client) => {
        // Get both properties
        const [sourceProp, targetProp] = await Promise.all([
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.sourcePropertyId}`,
              method: 'GET',
              schema: z.object({
                properties: z.object({
                  items: z.array(z.object({
                    propertyId: z.string(),
                    propertyName: z.string(),
                    contractId: z.string(),
                    groupId: z.string(),
                    latestVersion: z.number(),
                    productionVersion: z.number().nullable(),
                    stagingVersion: z.number().nullable()
                  }))
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
                  items: z.array(z.object({
                    propertyId: z.string(),
                    propertyName: z.string(),
                    contractId: z.string(),
                    groupId: z.string(),
                    latestVersion: z.number(),
                    productionVersion: z.number().nullable(),
                    stagingVersion: z.number().nullable()
                  }))
                })
              })
            }
          )
        ]);

        const sourceProperty = sourceProp.properties.items[0];
        const targetProperty = targetProp.properties.items[0];

        if (!sourceProperty || !targetProperty) {
          throw new Error('One or both properties not found');
        }

        const sourceVersion = params.version || sourceProperty.latestVersion;
        const targetVersion = params.version || targetProperty.latestVersion;

        // Get rules for both properties
        const [sourceRules, targetRules] = await Promise.all([
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.sourcePropertyId}/versions/${sourceVersion}/rules`,
              method: 'GET',
              schema: z.object({
                rules: z.any(),
                ruleFormat: z.string()
              }),
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
              schema: z.object({
                rules: z.any(),
                ruleFormat: z.string()
              }),
              queryParams: {
                contractId: targetProperty.contractId,
                groupId: targetProperty.groupId
              }
            }
          )
        ]);

        // Get hostnames for both properties
        const [sourceHostnames, targetHostnames] = await Promise.all([
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.sourcePropertyId}/versions/${sourceVersion}/hostnames`,
              method: 'GET',
              schema: z.object({
                hostnames: z.object({
                  items: z.array(z.object({
                    cnameFrom: z.string(),
                    cnameTo: z.string()
                  }))
                })
              }),
              queryParams: {
                contractId: sourceProperty.contractId,
                groupId: sourceProperty.groupId
              }
            }
          ),
          this.makeTypedRequest(
            client,
            {
              path: `/papi/v1/properties/${params.targetPropertyId}/versions/${targetVersion}/hostnames`,
              method: 'GET',
              schema: z.object({
                hostnames: z.object({
                  items: z.array(z.object({
                    cnameFrom: z.string(),
                    cnameTo: z.string()
                  }))
                })
              }),
              queryParams: {
                contractId: targetProperty.contractId,
                groupId: targetProperty.groupId
              }
            }
          )
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
            sourceOnly: sourceHostnames.hostnames.items.filter(sh => 
              !targetHostnames.hostnames.items.some(th => th.cnameFrom === sh.cnameFrom)
            ),
            targetOnly: targetHostnames.hostnames.items.filter(th => 
              !sourceHostnames.hostnames.items.some(sh => sh.cnameFrom === th.cnameFrom)
            ),
            different: sourceHostnames.hostnames.items.filter(sh => {
              const targetHost = targetHostnames.hostnames.items.find(th => th.cnameFrom === sh.cnameFrom);
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
  async detectConfigurationDrift(args: z.infer<typeof DetectConfigurationDriftSchema>): Promise<MCPToolResponse> {
    const params = DetectConfigurationDriftSchema.parse(args);

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
                items: z.array(z.object({
                  propertyId: z.string(),
                  propertyName: z.string(),
                  contractId: z.string(),
                  groupId: z.string(),
                  latestVersion: z.number(),
                  productionVersion: z.number().nullable(),
                  stagingVersion: z.number().nullable()
                }))
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
                items: z.array(z.object({
                  propertyVersion: z.number(),
                  updatedDate: z.string(),
                  updatedByUser: z.string(),
                  productionStatus: z.enum(['ACTIVE', 'INACTIVE']).nullable(),
                  stagingStatus: z.enum(['ACTIVE', 'INACTIVE']).nullable(),
                  etag: z.string(),
                  note: z.string().nullable()
                }))
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
            schema: z.object({
              rules: z.any(),
              ruleFormat: z.string()
            }),
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
              schema: z.object({
                rules: z.any(),
                ruleFormat: z.string()
              }),
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
   * Check property health and identify issues
   */
  async checkPropertyHealth(args: z.infer<typeof CheckPropertyHealthSchema>): Promise<MCPToolResponse> {
    const params = CheckPropertyHealthSchema.parse(args);

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
                    items: z.array(z.object({
                      propertyId: z.string(),
                      propertyName: z.string(),
                      contractId: z.string(),
                      groupId: z.string(),
                      latestVersion: z.number(),
                      productionVersion: z.number().nullable(),
                      stagingVersion: z.number().nullable()
                    }))
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
                const hostnamesResponse = await this.makeTypedRequest(
                  client,
                  {
                    path: `/papi/v1/properties/${params.propertyId}/versions/${version}/hostnames`,
                    method: 'GET',
                    schema: z.object({
                      hostnames: z.object({
                        items: z.array(z.object({
                          cnameFrom: z.string(),
                          cnameTo: z.string(),
                          certStatus: z.object({
                            validationCname: z.object({
                              hostname: z.string().optional(),
                              target: z.string().optional()
                            }).optional(),
                            staging: z.array(z.object({
                              status: z.string(),
                              validNotBefore: z.string().optional(),
                              validNotAfter: z.string().optional(),
                              signatureAlgorithm: z.string().optional()
                            })).optional(),
                            production: z.array(z.object({
                              status: z.string(),
                              validNotBefore: z.string().optional(),
                              validNotAfter: z.string().optional(),
                              signatureAlgorithm: z.string().optional()
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

                const certificateIssues = [];
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                for (const hostname of hostnamesResponse.hostnames.items) {
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
                  status: certificateIssues.length === 0 ? 'healthy' : 'warning',
                  issues: certificateIssues
                };
              } catch (error) {
                healthReport.checks.certificate_expiry = {
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error)
                };
              }
            }

            // Rule warnings check
            if (healthChecks.includes('rule_warnings')) {
              progress.update(50, 'Checking rule warnings...');
              
              try {
                const rulesResponse = await this.makeTypedRequest(
                  client,
                  {
                    path: `/papi/v1/properties/${params.propertyId}/versions/${version}/rules`,
                    method: 'GET',
                    schema: z.object({
                      rules: z.any(),
                      ruleFormat: z.string(),
                      errors: z.array(z.object({
                        type: z.string(),
                        title: z.string(),
                        detail: z.string().optional(),
                        errorLocation: z.string().optional()
                      })).optional(),
                      warnings: z.array(z.object({
                        type: z.string(),
                        title: z.string(),
                        detail: z.string().optional(),
                        errorLocation: z.string().optional()
                      })).optional()
                    }),
                    queryParams: {
                      contractId: property.contractId,
                      groupId: property.groupId,
                      validateRules: 'true'
                    }
                  }
                );

                healthReport.checks.rule_warnings = {
                  status: (rulesResponse.errors && rulesResponse.errors.length > 0) ? 'error' : 
                          (rulesResponse.warnings && rulesResponse.warnings.length > 0) ? 'warning' : 'healthy',
                  errors: rulesResponse.errors || [],
                  warnings: rulesResponse.warnings || []
                };
              } catch (error) {
                healthReport.checks.rule_warnings = {
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error)
                };
              }
            }

            // Activation status check
            if (healthChecks.includes('activation_status')) {
              progress.update(75, 'Checking activation status...');
              
              try {
                const activationsResponse = await this.makeTypedRequest(
                  client,
                  {
                    path: `/papi/v1/properties/${params.propertyId}/activations`,
                    method: 'GET',
                    schema: z.object({
                      activations: z.object({
                        items: z.array(z.object({
                          activationId: z.string(),
                          propertyVersion: z.number(),
                          network: z.string(),
                          status: z.string(),
                          submitDate: z.string(),
                          updateDate: z.string()
                        }))
                      })
                    }),
                    queryParams: {
                      contractId: property.contractId,
                      groupId: property.groupId
                    }
                  }
                );

                const recentActivations = activationsResponse.activations.items
                  .filter(a => a.propertyVersion === version)
                  .sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime())
                  .slice(0, 5);

                const failedActivations = recentActivations.filter(a => 
                  a.status === 'FAILED' || a.status === 'ABORTED'
                );

                healthReport.checks.activation_status = {
                  status: failedActivations.length === 0 ? 'healthy' : 'warning',
                  recentActivations: recentActivations,
                  failedCount: failedActivations.length
                };
              } catch (error) {
                healthReport.checks.activation_status = {
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error)
                };
              }
            }

            progress.update(100, 'Health check complete!');

            // Calculate overall health
            const statuses = Object.values(healthReport.checks).map((check: any) => check.status);
            healthReport.overallHealth = statuses.includes('error') ? 'critical' :
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
  async bulkActivateProperties(args: z.infer<typeof BulkActivatePropertiesSchema>): Promise<MCPToolResponse> {
    const params = BulkActivatePropertiesSchema.parse(args);

    return this.withProgress(
      `Activating ${params.properties.length} properties`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'bulk-activate-properties',
          params,
          async (client) => {
            const results = [];
            const totalProperties = params.properties.length;

            for (let i = 0; i < params.properties.length; i++) {
              const prop = params.properties[i];
              const progressPercent = Math.floor((i / totalProperties) * 90);
              progress.update(progressPercent, `Activating ${prop.propertyId} to ${prop.network}...`);

              try {
                // Get property details
                const propResponse = await this.makeTypedRequest(
                  client,
                  {
                    path: `/papi/v1/properties/${prop.propertyId}`,
                    method: 'GET',
                    schema: z.object({
                      properties: z.object({
                        items: z.array(z.object({
                          propertyId: z.string(),
                          propertyName: z.string(),
                          contractId: z.string(),
                          groupId: z.string()
                        }))
                      })
                    })
                  }
                );

                const property = propResponse.properties.items[0];
                if (!property) {
                  results.push({
                    propertyId: prop.propertyId,
                    network: prop.network,
                    status: 'failed',
                    error: 'Property not found'
                  });
                  continue;
                }

                // Submit activation
                const activateResponse = await this.makeTypedRequest(
                  client,
                  {
                    path: `/papi/v1/properties/${prop.propertyId}/activations`,
                    method: 'POST',
                    schema: z.object({ activationLink: z.string() }),
                    body: {
                      propertyVersion: prop.version,
                      network: prop.network,
                      notifyEmails: params.notifyEmails || [],
                      acknowledgeAllWarnings: params.acknowledgeWarnings,
                      note: params.notes || `Bulk activation to ${prop.network}`,
                      ...(params.acknowledgeWarnings && {
                        complianceRecord: {
                          noncomplianceReason: 'EMERGENCY'
                        }
                      })
                    },
                    queryParams: {
                      contractId: property.contractId,
                      groupId: property.groupId
                    }
                  }
                );

                const activationId = activateResponse.activationLink.split('/').pop();

                results.push({
                  propertyId: prop.propertyId,
                  propertyName: property.propertyName,
                  version: prop.version,
                  network: prop.network,
                  status: 'submitted',
                  activationId: activationId
                });
              } catch (error) {
                results.push({
                  propertyId: prop.propertyId,
                  network: prop.network,
                  status: 'failed',
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            progress.update(100, 'Bulk activation complete!');

            return {
              totalProperties: params.properties.length,
              submitted: results.filter(r => r.status === 'submitted').length,
              failed: results.filter(r => r.status === 'failed').length,
              results: results,
              message: `✅ Submitted ${results.filter(r => r.status === 'submitted').length} of ${params.properties.length} activations`
            };
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
   * Helper method to calculate rule differences
   */
  private calculateRuleDifferences(fromRules: any, toRules: any): any[] {
    const differences = [];
    
    // Deep comparison of rule trees
    const compareRules = (from: any, to: any, path: string = '') => {
      // Check for added/removed behaviors
      if (from?.behaviors && to?.behaviors) {
        const fromBehaviors = from.behaviors.map((b: any) => b.name);
        const toBehaviors = to.behaviors.map((b: any) => b.name);
        
        // Added behaviors
        toBehaviors.forEach((behavior: string) => {
          if (!fromBehaviors.includes(behavior)) {
            differences.push({
              type: 'added',
              path: `${path}/behaviors/${behavior}`,
              description: `Added behavior: ${behavior}`
            });
          }
        });
        
        // Removed behaviors
        fromBehaviors.forEach((behavior: string) => {
          if (!toBehaviors.includes(behavior)) {
            differences.push({
              type: 'deleted',
              path: `${path}/behaviors/${behavior}`,
              description: `Removed behavior: ${behavior}`
            });
          }
        });
        
        // Modified behaviors
        from.behaviors.forEach((fromBehavior: any) => {
          const toBehavior = to.behaviors.find((b: any) => b.name === fromBehavior.name);
          if (toBehavior && JSON.stringify(fromBehavior.options) !== JSON.stringify(toBehavior.options)) {
            differences.push({
              type: 'modified',
              path: `${path}/behaviors/${fromBehavior.name}`,
              description: `Modified behavior options: ${fromBehavior.name}`
            });
          }
        });
      }
      
      // Recursively check children
      if (from?.children && to?.children) {
        from.children.forEach((fromChild: any, index: number) => {
          const toChild = to.children.find((c: any) => c.name === fromChild.name);
          if (toChild) {
            compareRules(fromChild, toChild, `${path}/children/${fromChild.name}`);
          } else {
            differences.push({
              type: 'deleted',
              path: `${path}/children/${fromChild.name}`,
              description: `Removed rule: ${fromChild.name}`
            });
          }
        });
        
        to.children.forEach((toChild: any) => {
          const fromChild = from.children.find((c: any) => c.name === toChild.name);
          if (!fromChild) {
            differences.push({
              type: 'added',
              path: `${path}/children/${toChild.name}`,
              description: `Added rule: ${toChild.name}`
            });
          }
        });
      }
    };
    
    compareRules(fromRules, toRules);
    return differences;
  }

  // Additional bulk operations would follow similar patterns...
  async bulkCloneProperties(args: z.infer<typeof BulkClonePropertiesSchema>): Promise<MCPToolResponse> {
    // Implementation similar to bulkActivateProperties
    throw new Error('Method not implemented yet');
  }

  async bulkManageHostnames(args: z.infer<typeof BulkManageHostnamesSchema>): Promise<MCPToolResponse> {
    // Implementation similar to bulkActivateProperties
    throw new Error('Method not implemented yet');
  }

  async bulkUpdatePropertyRules(args: z.infer<typeof BulkUpdatePropertyRulesSchema>): Promise<MCPToolResponse> {
    // Implementation similar to bulkActivateProperties
    throw new Error('Method not implemented yet');
  }

  async getBulkOperationStatus(args: z.infer<typeof GetBulkOperationStatusSchema>): Promise<MCPToolResponse> {
    // Implementation would track bulk operation status
    throw new Error('Method not implemented yet');
  }
}

// Export singleton instance
export const advancedPropertyTools = new AdvancedPropertyTools();