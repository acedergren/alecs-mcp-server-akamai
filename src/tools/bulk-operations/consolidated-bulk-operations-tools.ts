/**
 * Consolidated Bulk Operations Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides comprehensive bulk operations for properties, activations, and rules
 * - Includes intelligent validation and progress tracking
 * - Implements error handling and recovery strategies
 * - Supports large-scale enterprise operations
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  PropertyIdSchema,
  type MCPToolResponse
} from '../common';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('bulk-operations');

/**
 * Bulk Operation Schemas
 */
const BulkActivationSchema = CustomerSchema.extend({
  activations: z.array(z.object({
    propertyId: PropertyIdSchema,
    propertyVersion: z.number().int().positive(),
    network: z.enum(['STAGING', 'PRODUCTION']),
    note: z.string().optional(),
    acknowledgeAllWarnings: z.boolean().default(false),
    fastPush: z.boolean().default(true),
    ignoreHttpErrors: z.boolean().default(false)
  })).min(1).max(500),
  notificationEmails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().default(false)
});

const BulkCloneSchema = CustomerSchema.extend({
  sourcePropertyId: PropertyIdSchema,
  cloneConfigs: z.array(z.object({
    propertyName: z.string().min(1).max(85),
    contractId: z.string(),
    groupId: z.string(),
    productId: z.string().optional()
  })).min(1).max(100),
  cloneFromVersion: z.number().int().positive().optional()
});

const BulkHostnameSchema = CustomerSchema.extend({
  operations: z.array(z.object({
    propertyId: PropertyIdSchema,
    propertyVersion: z.number().int().positive(),
    action: z.enum(['add', 'remove']),
    hostnames: z.array(z.string()).min(1)
  })).min(1).max(100),
  validateOnly: z.boolean().default(false)
});

const BulkRulesUpdateSchema = CustomerSchema.extend({
  updates: z.array(z.object({
    propertyId: PropertyIdSchema,
    propertyVersion: z.number().int().positive(),
    patches: z.array(z.object({
      op: z.enum(['add', 'remove', 'replace', 'copy', 'move', 'test']),
      path: z.string(),
      value: z.any().optional(),
      from: z.string().optional()
    })).min(1)
  })).min(1).max(50)
});

const BulkOperationStatusSchema = CustomerSchema.extend({
  operationId: z.string(),
  operationType: z.enum(['activation', 'clone', 'hostname', 'rules'])
});

/**
 * Consolidated bulk operations tools implementation
 */
export class ConsolidatedBulkOperationsTools extends BaseTool {
  protected readonly domain = 'bulk-operations';

  /**
   * Bulk activate properties
   */
  async bulkActivateProperties(args: z.infer<typeof BulkActivationSchema>): Promise<MCPToolResponse> {
    const params = BulkActivationSchema.parse(args);

    return this.executeStandardOperation(
      'bulk-activate-properties',
      params,
      async (client) => {
        // Validate all properties before activation
        const validationResults = await this.validateActivations(params.activations, client);
        if (validationResults.hasErrors && !params.acknowledgeWarnings) {
          return {
            error: 'Validation failed',
            validationErrors: validationResults.errors,
            warnings: validationResults.warnings,
            recommendation: 'Review validation errors or set acknowledgeWarnings=true to proceed'
          };
        }

        // Create bulk activation
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/bulk/activations',
            method: 'POST',
            schema: z.object({
              bulkActivationId: z.string(),
              submissionTime: z.string(),
              estimatedCompletionTime: z.string(),
              activationsSubmitted: z.number()
            }),
            body: {
              acknowledgeAllWarnings: params.acknowledgeWarnings,
              defaultActivationSettings: {
                acknowledgeAllWarnings: params.acknowledgeWarnings,
                fastPush: true,
                ignoreHttpErrors: false
              },
              activations: params.activations.map(activation => ({
                propertyId: activation.propertyId,
                propertyVersion: activation.propertyVersion,
                network: activation.network,
                note: activation.note || `Bulk activation via ALECS MCP - ${new Date().toISOString()}`,
                acknowledgeAllWarnings: activation.acknowledgeAllWarnings || params.acknowledgeWarnings,
                fastPush: activation.fastPush,
                ignoreHttpErrors: activation.ignoreHttpErrors
              })),
              notificationEmails: params.notificationEmails || []
            }
          }
        );

        // Store operation metadata for tracking
        await this.storeOperationMetadata({
          operationId: response.bulkActivationId,
          operationType: 'activation',
          totalItems: params.activations.length,
          startTime: response.submissionTime,
          estimatedEndTime: response.estimatedCompletionTime
        });

        return {
          bulkActivationId: response.bulkActivationId,
          propertiesCount: params.activations.length,
          submissionTime: response.submissionTime,
          estimatedCompletionTime: response.estimatedCompletionTime,
          status: 'SUBMITTED',
          trackingUrl: `/papi/v1/bulk/activations/${response.bulkActivationId}`,
          message: `✅ Bulk activation started for ${params.activations.length} properties`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Bulk clone properties
   */
  async bulkCloneProperties(args: z.infer<typeof BulkCloneSchema>): Promise<MCPToolResponse> {
    const params = BulkCloneSchema.parse(args);

    return this.executeStandardOperation(
      'bulk-clone-properties',
      params,
      async (client) => {
        // Get source property details
        const sourceProperty = await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${params.sourcePropertyId}`,
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(z.object({
                  propertyId: z.string(),
                  propertyName: z.string(),
                  latestVersion: z.number(),
                  productId: z.string()
                }))
              })
            })
          }
        );

        const source = sourceProperty.properties.items[0];
        if (!source) {
          throw new Error(`Source property ${params.sourcePropertyId} not found`);
        }

        const cloneVersion = params.cloneFromVersion || source.latestVersion;
        const cloneResults = [];

        // Clone properties sequentially to avoid rate limits
        for (const cloneConfig of params.cloneConfigs) {
          try {
            const cloneResponse = await this.makeTypedRequest(
              client,
              {
                path: `/papi/v1/properties/${params.sourcePropertyId}/versions/${cloneVersion}/clone`,
                method: 'POST',
                schema: z.object({
                  propertyLink: z.string()
                }),
                body: {
                  propertyName: cloneConfig.propertyName,
                  contractId: cloneConfig.contractId,
                  groupId: cloneConfig.groupId,
                  productId: cloneConfig.productId || source.productId
                },
                queryParams: {
                  contractId: cloneConfig.contractId,
                  groupId: cloneConfig.groupId
                }
              }
            );

            const newPropertyId = cloneResponse.propertyLink.split('/').pop() || '';
            cloneResults.push({
              propertyName: cloneConfig.propertyName,
              propertyId: newPropertyId,
              status: 'SUCCESS',
              propertyLink: cloneResponse.propertyLink
            });
          } catch (error: any) {
            cloneResults.push({
              propertyName: cloneConfig.propertyName,
              status: 'FAILED',
              error: error.message
            });
          }
        }

        const successCount = cloneResults.filter(r => r.status === 'SUCCESS').length;
        const failedCount = cloneResults.filter(r => r.status === 'FAILED').length;

        return {
          sourcePropertyId: params.sourcePropertyId,
          sourcePropertyName: source.propertyName,
          cloneVersion,
          totalRequested: params.cloneConfigs.length,
          successCount,
          failedCount,
          cloneResults,
          message: `✅ Cloned ${successCount} properties successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Bulk manage hostnames
   */
  async bulkManageHostnames(args: z.infer<typeof BulkHostnameSchema>): Promise<MCPToolResponse> {
    const params = BulkHostnameSchema.parse(args);

    return this.executeStandardOperation(
      'bulk-manage-hostnames',
      params,
      async (client) => {
        const results = [];

        for (const operation of params.operations) {
          try {
            // Get current hostnames
            const currentHostnames = await this.makeTypedRequest(
              client,
              {
                path: `/papi/v1/properties/${operation.propertyId}/versions/${operation.propertyVersion}/hostnames`,
                method: 'GET',
                schema: z.object({
                  hostnames: z.object({
                    items: z.array(z.object({
                      cnameFrom: z.string(),
                      cnameTo: z.string().nullable(),
                      cnameType: z.string()
                    }))
                  })
                })
              }
            );

            let updatedHostnames = [...currentHostnames.hostnames.items];

            if (operation.action === 'add') {
              // Add new hostnames
              const newHostnames = operation.hostnames.map(hostname => ({
                cnameFrom: hostname,
                cnameTo: null,
                cnameType: 'EDGE_HOSTNAME'
              }));
              updatedHostnames.push(...newHostnames);
            } else {
              // Remove hostnames
              updatedHostnames = updatedHostnames.filter(h => 
                !operation.hostnames.includes(h.cnameFrom)
              );
            }

            if (!params.validateOnly) {
              // Update hostnames
              await this.makeTypedRequest(
                client,
                {
                  path: `/papi/v1/properties/${operation.propertyId}/versions/${operation.propertyVersion}/hostnames`,
                  method: 'PUT',
                  schema: z.any(),
                  body: {
                    hostnames: updatedHostnames
                  }
                }
              );
            }

            results.push({
              propertyId: operation.propertyId,
              propertyVersion: operation.propertyVersion,
              action: operation.action,
              hostnamesAffected: operation.hostnames.length,
              status: 'SUCCESS',
              validateOnly: params.validateOnly,
              currentCount: currentHostnames.hostnames.items.length,
              newCount: updatedHostnames.length
            });
          } catch (error: any) {
            results.push({
              propertyId: operation.propertyId,
              propertyVersion: operation.propertyVersion,
              action: operation.action,
              status: 'FAILED',
              error: error.message
            });
          }
        }

        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        const failedCount = results.filter(r => r.status === 'FAILED').length;

        return {
          totalOperations: params.operations.length,
          successCount,
          failedCount,
          validateOnly: params.validateOnly,
          results,
          summary: {
            hostnamesAdded: results
              .filter(r => r.status === 'SUCCESS' && r.action === 'add')
              .reduce((sum, r) => sum + (r.hostnamesAffected || 0), 0),
            hostnamesRemoved: results
              .filter(r => r.status === 'SUCCESS' && r.action === 'remove')
              .reduce((sum, r) => sum + (r.hostnamesAffected || 0), 0)
          },
          message: params.validateOnly 
            ? `✅ Validated ${successCount} hostname operations`
            : `✅ Completed ${successCount} hostname operations${failedCount > 0 ? `, ${failedCount} failed` : ''}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Bulk update property rules
   */
  async bulkUpdatePropertyRules(args: z.infer<typeof BulkRulesUpdateSchema>): Promise<MCPToolResponse> {
    const params = BulkRulesUpdateSchema.parse(args);

    return this.executeStandardOperation(
      'bulk-update-property-rules',
      params,
      async (client) => {
        // Create bulk rules patch request
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/bulk/rules-patch-requests',
            method: 'POST',
            schema: z.object({
              bulkPatchId: z.string(),
              submissionTime: z.string(),
              patchesSubmitted: z.number()
            }),
            body: {
              rulePatches: params.updates
            }
          }
        );

        // Store operation metadata
        await this.storeOperationMetadata({
          operationId: response.bulkPatchId,
          operationType: 'rules',
          totalItems: params.updates.length,
          startTime: response.submissionTime
        });

        return {
          bulkPatchId: response.bulkPatchId,
          propertiesCount: params.updates.length,
          totalPatches: params.updates.reduce((sum, update) => sum + update.patches.length, 0),
          submissionTime: response.submissionTime,
          status: 'SUBMITTED',
          trackingUrl: `/papi/v1/bulk/rules-patch-requests/${response.bulkPatchId}`,
          message: `✅ Bulk rules update started for ${params.updates.length} properties`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(args: z.infer<typeof BulkOperationStatusSchema>): Promise<MCPToolResponse> {
    const params = BulkOperationStatusSchema.parse(args);

    return this.executeStandardOperation(
      'get-bulk-operation-status',
      params,
      async (client) => {
        let path: string;
        let schema: any;

        switch (params.operationType) {
          case 'activation':
            path = `/papi/v1/bulk/activations/${params.operationId}`;
            schema = z.object({
              bulkActivationId: z.string(),
              status: z.string(),
              submissionTime: z.string(),
              estimatedCompletionTime: z.string().optional(),
              actualCompletionTime: z.string().optional(),
              activations: z.array(z.object({
                propertyId: z.string(),
                propertyVersion: z.number(),
                network: z.string(),
                status: z.string(),
                activationId: z.string().optional(),
                submissionTime: z.string(),
                completionTime: z.string().optional(),
                errorMessage: z.string().optional()
              })).optional()
            });
            break;

          case 'rules':
            path = `/papi/v1/bulk/rules-patch-requests/${params.operationId}`;
            schema = z.object({
              bulkPatchId: z.string(),
              status: z.string(),
              submissionTime: z.string(),
              completionTime: z.string().optional(),
              patches: z.array(z.object({
                propertyId: z.string(),
                propertyVersion: z.number(),
                status: z.string(),
                errorMessage: z.string().optional()
              })).optional()
            });
            break;

          default:
            throw new Error(`Unsupported operation type: ${params.operationType}`);
        }

        const response = await this.makeTypedRequest(client, {
          path,
          method: 'GET',
          schema
        });

        // Calculate progress
        let progress = {
          total: 0,
          completed: 0,
          failed: 0,
          inProgress: 0,
          completionPercentage: 0
        };

        const typedResponse = response as any;
        if (params.operationType === 'activation' && typedResponse.activations) {
          progress.total = typedResponse.activations.length;
          progress.completed = typedResponse.activations.filter((a: any) => a.status === 'ACTIVATED').length;
          progress.failed = typedResponse.activations.filter((a: any) => a.status === 'FAILED').length;
          progress.inProgress = progress.total - progress.completed - progress.failed;
          progress.completionPercentage = progress.total > 0 
            ? Math.round((progress.completed / progress.total) * 100) 
            : 0;
        }

        return {
          operationId: params.operationId,
          operationType: params.operationType,
          status: typedResponse.status,
          submissionTime: typedResponse.submissionTime,
          completionTime: typedResponse.actualCompletionTime || typedResponse.completionTime,
          estimatedCompletionTime: typedResponse.estimatedCompletionTime,
          progress,
          details: response,
          message: `Operation ${params.operationId} is ${typedResponse.status}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `bulk:${p.operationType}:${p.operationId}`,
        cacheTtl: 30
      }
    );
  }

  /**
   * Helper methods
   */
  private async validateActivations(activations: any[], client: any): Promise<any> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const activation of activations) {
      // Basic validation
      if (!activation.propertyId || !activation.propertyVersion) {
        errors.push(`Invalid activation: propertyId and propertyVersion required`);
      }

      if (activation.network === 'PRODUCTION' && !activation.acknowledgeAllWarnings) {
        warnings.push(`Production activation for ${activation.propertyId} should acknowledge warnings`);
      }

      // Check if property version exists
      try {
        await this.makeTypedRequest(
          client,
          {
            path: `/papi/v1/properties/${activation.propertyId}/versions/${activation.propertyVersion}`,
            method: 'GET',
            schema: z.any()
          }
        );
      } catch (error) {
        errors.push(`Property ${activation.propertyId} version ${activation.propertyVersion} not found`);
      }
    }

    return {
      hasErrors: errors.length > 0,
      errors,
      warnings
    };
  }

  private async storeOperationMetadata(metadata: any): Promise<void> {
    // In a real implementation, this would store metadata for tracking
    // For now, we'll just log it
    logger.info('Storing bulk operation metadata:', metadata);
  }
}

// Export singleton instance
export const consolidatedBulkOperationsTools = new ConsolidatedBulkOperationsTools();