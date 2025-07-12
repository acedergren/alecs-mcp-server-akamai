/**
 * Bulk Operations Domain Tools
 * 
 * Complete implementation of Akamai Bulk Operations API tools
 * Using the standard AkamaiOperation.execute pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Updated on 2025-07-12 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  BulkOperationsEndpoints, 
  BulkOperationsToolSchemas,
  formatBulkActivationResponse,
  formatBulkCloneResponse,
  formatBulkHostnamesResponse,
  formatBulkRulesUpdateResponse,
  formatBulkOperationStatus
} from './api';
import type { z } from 'zod';

/**
 * Bulk activate properties
 */
export async function bulkActivateProperties(args: z.infer<typeof BulkOperationsToolSchemas.bulkActivate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'bulk-operations',
    'bulk_activate_properties',
    args,
    async (client) => {
      // Validate all properties before activation
      const validationResults = await validateActivations(args.activations, client);
      if (validationResults.hasErrors && !args.acknowledgeWarnings) {
        return {
          error: 'Validation failed',
          validationErrors: validationResults.errors,
          warnings: validationResults.warnings,
          recommendation: 'Review validation errors or set acknowledgeWarnings=true to proceed'
        };
      }

      // Create bulk activation
      const response = await client.request({
        method: 'POST',
        path: BulkOperationsEndpoints.bulkActivations(),
        body: {
          acknowledgeAllWarnings: args.acknowledgeWarnings,
          defaultActivationSettings: {
            acknowledgeAllWarnings: args.acknowledgeWarnings,
            fastPush: true,
            ignoreHttpErrors: false
          },
          activations: args.activations.map(activation => ({
            propertyId: activation.propertyId,
            propertyVersion: activation.propertyVersion,
            network: activation.network,
            note: activation.note || `Bulk activation via ALECS MCP - ${new Date().toISOString()}`,
            acknowledgeAllWarnings: activation.acknowledgeAllWarnings || args.acknowledgeWarnings,
            fastPush: activation.fastPush,
            ignoreHttpErrors: activation.ignoreHttpErrors
          })),
          notificationEmails: args.notificationEmails || []
        }
      });

      return {
        bulkActivationId: (response as any).bulkActivationId,
        propertiesCount: args.activations.length,
        submissionTime: (response as any).submissionTime,
        estimatedCompletionTime: (response as any).estimatedCompletionTime,
        status: 'SUBMITTED',
        trackingUrl: `/papi/v1/bulk/activations/${(response as any).bulkActivationId}`
      };
    },
    {
      format: 'text',
      formatter: formatBulkActivationResponse
    }
  );
}

/**
 * Bulk clone properties
 */
export async function bulkCloneProperties(args: z.infer<typeof BulkOperationsToolSchemas.bulkClone>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'bulk-operations',
    'bulk_clone_properties',
    args,
    async (client) => {
      // Get source property details
      const sourceProperty = await client.request({
        method: 'GET',
        path: BulkOperationsEndpoints.getProperty(args.sourcePropertyId),
        queryParams: {
          contractId: args.sourcePropertyId.replace('prp_', 'ctr_')
        }
      });

      const source = (sourceProperty as any).properties?.items?.[0];
      if (!source) {
        throw new Error(`Source property ${args.sourcePropertyId} not found`);
      }

      const cloneVersion = args.cloneFromVersion || source.latestVersion;
      const cloneResults = [];

      // Clone properties sequentially to avoid rate limits
      for (const cloneConfig of args.cloneConfigs) {
        try {
          const cloneResponse = await client.request({
            method: 'POST',
            path: BulkOperationsEndpoints.cloneProperty(args.sourcePropertyId, cloneVersion),
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
          });

          const newPropertyId = (cloneResponse as any).propertyLink?.split('/').pop() || '';
          cloneResults.push({
            propertyName: cloneConfig.propertyName,
            propertyId: newPropertyId,
            status: 'SUCCESS',
            propertyLink: (cloneResponse as any).propertyLink
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
        sourcePropertyId: args.sourcePropertyId,
        sourcePropertyName: source.propertyName,
        cloneVersion,
        totalRequested: args.cloneConfigs.length,
        successCount,
        failedCount,
        cloneResults
      };
    },
    {
      format: 'text',
      formatter: formatBulkCloneResponse
    }
  );
}

/**
 * Bulk manage hostnames
 */
export async function bulkManageHostnames(args: z.infer<typeof BulkOperationsToolSchemas.bulkHostnames>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'bulk-operations',
    'bulk_manage_hostnames',
    args,
    async (client) => {
      const results = [];

      for (const operation of args.operations) {
        try {
          // Get current hostnames
          const currentHostnames = await client.request({
            method: 'GET',
            path: BulkOperationsEndpoints.getPropertyHostnames(operation.propertyId, operation.propertyVersion),
            queryParams: {
              contractId: operation.propertyId.replace('prp_', 'ctr_')
            }
          });

          let updatedHostnames = [...(currentHostnames as any).hostnames?.items || []];

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
            updatedHostnames = updatedHostnames.filter((h: any) => 
              !operation.hostnames.includes(h.cnameFrom)
            );
          }

          if (!args.validateOnly) {
            // Update hostnames
            await client.request({
              method: 'PUT',
              path: BulkOperationsEndpoints.updatePropertyHostnames(operation.propertyId, operation.propertyVersion),
              body: {
                hostnames: updatedHostnames
              },
              queryParams: {
                contractId: operation.propertyId.replace('prp_', 'ctr_')
              }
            });
          }

          results.push({
            propertyId: operation.propertyId,
            propertyVersion: operation.propertyVersion,
            action: operation.action,
            hostnamesAffected: operation.hostnames.length,
            status: 'SUCCESS',
            validateOnly: args.validateOnly,
            currentCount: (currentHostnames as any).hostnames?.items?.length || 0,
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
        totalOperations: args.operations.length,
        successCount,
        failedCount,
        validateOnly: args.validateOnly,
        results,
        summary: {
          hostnamesAdded: results
            .filter(r => r.status === 'SUCCESS' && r.action === 'add')
            .reduce((sum, r) => sum + (r.hostnamesAffected || 0), 0),
          hostnamesRemoved: results
            .filter(r => r.status === 'SUCCESS' && r.action === 'remove')
            .reduce((sum, r) => sum + (r.hostnamesAffected || 0), 0)
        }
      };
    },
    {
      format: 'text',
      formatter: formatBulkHostnamesResponse
    }
  );
}

/**
 * Bulk update property rules
 */
export async function bulkUpdatePropertyRules(args: z.infer<typeof BulkOperationsToolSchemas.bulkRulesUpdate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'bulk-operations',
    'bulk_update_property_rules',
    args,
    async (client) => {
      // Create bulk rules patch request
      const response = await client.request({
        method: 'POST',
        path: BulkOperationsEndpoints.bulkRulesPatches(),
        body: {
          rulePatches: args.updates
        }
      });

      return {
        bulkPatchId: (response as any).bulkPatchId,
        propertiesCount: args.updates.length,
        totalPatches: args.updates.reduce((sum, update) => sum + update.patches.length, 0),
        submissionTime: (response as any).submissionTime,
        status: 'SUBMITTED',
        trackingUrl: `/papi/v1/bulk/rules-patch-requests/${(response as any).bulkPatchId}`
      };
    },
    {
      format: 'text',
      formatter: formatBulkRulesUpdateResponse
    }
  );
}

/**
 * Get bulk operation status
 */
export async function getBulkOperationStatus(args: z.infer<typeof BulkOperationsToolSchemas.bulkOperationStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'bulk-operations',
    'get_bulk_operation_status',
    args,
    async (client) => {
      let path: string;

      switch (args.operationType) {
        case 'activation':
          path = BulkOperationsEndpoints.getBulkActivation(args.operationId);
          break;
        case 'rules':
          path = BulkOperationsEndpoints.getBulkRulesPatch(args.operationId);
          break;
        default:
          throw new Error(`Unsupported operation type: ${args.operationType}`);
      }

      const response = await client.request({
        method: 'GET',
        path
      });

      // Calculate progress
      const progress = {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0,
        completionPercentage: 0
      };

      const typedResponse = response as any;
      if (args.operationType === 'activation' && typedResponse.activations) {
        progress.total = typedResponse.activations.length;
        progress.completed = typedResponse.activations.filter((a: any) => a.status === 'ACTIVATED').length;
        progress.failed = typedResponse.activations.filter((a: any) => a.status === 'FAILED').length;
        progress.inProgress = progress.total - progress.completed - progress.failed;
        progress.completionPercentage = progress.total > 0 
          ? Math.round((progress.completed / progress.total) * 100) 
          : 0;
      }

      return {
        operationId: args.operationId,
        operationType: args.operationType,
        status: typedResponse.status,
        submissionTime: typedResponse.submissionTime,
        completionTime: typedResponse.actualCompletionTime || typedResponse.completionTime,
        estimatedCompletionTime: typedResponse.estimatedCompletionTime,
        progress,
        details: response
      };
    },
    {
      format: 'text',
      formatter: formatBulkOperationStatus,
      cacheKey: (p) => `bulk:${p.operationType}:${p.operationId}`,
      cacheTtl: 30
    }
  );
}

/**
 * Helper function to validate activations
 */
async function validateActivations(activations: any[], client: any): Promise<any> {
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
      await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${activation.propertyId}/versions/${activation.propertyVersion}`,
        queryParams: {
          contractId: activation.propertyId.replace('prp_', 'ctr_')
        }
      });
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