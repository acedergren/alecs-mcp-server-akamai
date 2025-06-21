/**
 * Bulk Operations and Multi-Property Management Tools
 * Enterprise-grade bulk operations with progress tracking, rollback, and coordination
 */

import { ErrorTranslator } from '@utils/errors';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Bulk operation types
export interface BulkOperation {
  id: string;
  type: 'clone' | 'activate' | 'update-rules' | 'add-hostnames' | 'update-certificates';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  properties: BulkPropertyOperation[];
  metadata: {
    customer?: string;
    notes?: string;
    rollbackEnabled: boolean;
    parallelExecution: boolean;
    maxConcurrency: number;
  };
}

export interface BulkPropertyOperation {
  propertyId: string;
  propertyName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  rollbackData?: any;
}

export interface BulkCloneOptions {
  sourcePropertyId: string;
  targetNames: string[];
  contractId: string;
  groupId: string;
  productId?: string;
  ruleFormat?: string;
  cloneHostnames?: boolean;
  activateImmediately?: boolean;
  network?: 'STAGING' | 'PRODUCTION';
}

export interface BulkActivationOptions {
  propertyIds: string[];
  network: 'STAGING' | 'PRODUCTION';
  note?: string;
  notifyEmails?: string[];
  acknowledgeAllWarnings?: boolean;
  waitForCompletion?: boolean;
  maxWaitTime?: number;
}

export interface BulkRuleUpdateOptions {
  propertyIds: string[];
  rulePatches: Array<{
    op: 'add' | 'remove' | 'replace' | 'copy' | 'move';
    path: string;
    value?: any;
    from?: string;
  }>;
  createNewVersion?: boolean;
  validateChanges?: boolean;
  note?: string;
}

export interface BulkHostnameOptions {
  operations: Array<{
    propertyId: string;
    action: 'add' | 'remove';
    hostnames: Array<{
      hostname: string;
      edgeHostname?: string;
    }>;
  }>;
  createNewVersion?: boolean;
  validateDNS?: boolean;
  note?: string;
}

// Operation tracker for progress monitoring
class BulkOperationTracker {
  private operations: Map<string, BulkOperation> = new Map();

  createOperation(type: BulkOperation['type'], totalItems: number, metadata: any): string {
    const id = `bulk-${type}-${Date.now()}`;
    const operation: BulkOperation = {
      id,
      type,
      status: 'pending',
      startTime: new Date(),
      totalItems,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      properties: [],
      metadata,
    };
    this.operations.set(id, operation);
    return id;
  }

  updateOperation(id: string, updates: Partial<BulkOperation>): void {
    const operation = this.operations.get(id);
    if (operation) {
      Object.assign(operation, updates);
    }
  }

  getOperation(id: string): BulkOperation | undefined {
    return this.operations.get(id);
  }

  addPropertyOperation(operationId: string, property: BulkPropertyOperation): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.properties.push(property);
    }
  }

  updatePropertyStatus(
    operationId: string,
    propertyId: string,
    status: BulkPropertyOperation['status'],
    result?: any,
    error?: string,
  ): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      const property = operation.properties.find((p) => p.propertyId === propertyId);
      if (property) {
        property.status = status;
        property.endTime = new Date();
        if (result) {
          property.result = result;
        }
        if (_error) {
          property.error = error;
        }

        // Update counters
        operation.processedItems++;
        if (status === 'completed') {
          operation.successfulItems++;
        }
        if (status === 'failed') {
          operation.failedItems++;
        }
      }
    }
  }
}

const operationTracker = new BulkOperationTracker();

/**
 * Clone a property to multiple new properties
 */
export async function bulkCloneProperties(
  client: AkamaiClient,
  args: BulkCloneOptions,
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const operationId = operationTracker.createOperation('clone', args.targetNames.length, {
      sourcePropertyId: args.sourcePropertyId,
      rollbackEnabled: false,
      parallelExecution: true,
      maxConcurrency: 5,
    });

    operationTracker.updateOperation(operationId, { status: 'in-progress' });

    // Get source property details
    const sourceResponse = await client.request({
      path: `/papi/v1/properties/${args.sourcePropertyId}`,
      method: 'GET',
    });

    const sourceProperty = sourceResponse.properties?.items?.[0];
    if (!sourceProperty) {
      throw new Error('Source property not found');
    }

    // Get source property rules
    const rulesResponse = await client.request({
      path: `/papi/v1/properties/${args.sourcePropertyId}/versions/${sourceProperty.latestVersion}/rules`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
      },
    });

    // Get source property hostnames if needed
    let sourceHostnames = [];
    if (args.cloneHostnames) {
      const hostnamesResponse = await client.request({
        path: `/papi/v1/properties/${args.sourcePropertyId}/versions/${sourceProperty.latestVersion}/hostnames`,
        method: 'GET',
      });
      sourceHostnames = hostnamesResponse.hostnames?.items || [];
    }

    // Clone to each target
    const clonePromises = args.targetNames.map(async (targetName) => {
      const propertyOp: BulkPropertyOperation = {
        propertyId: '',
        propertyName: targetName,
        status: 'in-progress',
        startTime: new Date(),
      };

      operationTracker.addPropertyOperation(operationId, propertyOp);

      try {
        // Create new property
        const createResponse = await client.request({
          path: '/papi/v1/properties',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          queryParams: {
            contractId: args.contractId,
            groupId: args.groupId,
          },
          body: {
            productId: args.productId || sourceProperty.productId,
            propertyName: targetName,
            ruleFormat: args.ruleFormat || sourceProperty.ruleFormat,
          },
        });

        const newPropertyId = createResponse.propertyLink.split('/').pop();
        propertyOp.propertyId = newPropertyId;

        // Update rules
        await client.request({
          path: `/papi/v1/properties/${newPropertyId}/versions/1/rules`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/vnd.akamai.papirules.v2024-02-12+json',
          },
          queryParams: {
            contractId: args.contractId,
            groupId: args.groupId,
          },
          body: rulesResponse,
        });

        // Clone hostnames if requested
        if (args.cloneHostnames && sourceHostnames.length > 0) {
          // This would need custom hostname mapping logic
          // For now, we'll skip hostname cloning in bulk
        }

        // Activate if requested
        if (args.activateImmediately) {
          const activationResponse = await client.request({
            path: `/papi/v1/properties/${newPropertyId}/activations`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              propertyVersion: 1,
              network: args.network || 'STAGING',
              note: `Bulk clone from ${sourceProperty.propertyName}`,
              notifyEmails: [],
            },
          });

          propertyOp.result = {
            propertyId: newPropertyId,
            activationId: activationResponse.activationLink?.split('/').pop(),
          };
        } else {
          propertyOp.result = { propertyId: newPropertyId };
        }

        operationTracker.updatePropertyStatus(
          operationId,
          newPropertyId,
          'completed',
          propertyOp.result,
        );
      } catch (_error) {
        operationTracker.updatePropertyStatus(
          operationId,
          propertyOp.propertyId || 'unknown',
          'failed',
          null,
          (error as Error).message,
        );
      }
    });

    // Execute with concurrency control
    const concurrencyLimit = 5;
    for (let i = 0; i < clonePromises.length; i += concurrencyLimit) {
      const batch = clonePromises.slice(i, i + concurrencyLimit);
      await Promise.allSettled(batch);
    }

    operationTracker.updateOperation(operationId, {
      status: 'completed',
      endTime: new Date(),
    });

    const operation = operationTracker.getOperation(operationId)!;

    // Format response
    let responseText = '# Bulk Clone Operation Results\n\n';
    responseText += `**Operation ID:** ${operationId}\n`;
    responseText += `**Source Property:** ${sourceProperty.propertyName} (${args.sourcePropertyId})\n`;
    responseText += `**Total Clones:** ${operation.totalItems}\n`;
    responseText += `**Successful:** ${operation.successfulItems}\n`;
    responseText += `**Failed:** ${operation.failedItems}\n\n`;

    if (operation.successfulItems > 0) {
      responseText += `## ✅ Successfully Cloned (${operation.successfulItems})\n`;
      operation.properties
        .filter((p) => p.status === 'completed')
        .forEach((p) => {
          responseText += `- **${p.propertyName}** (${p.result?.propertyId})\n`;
          if (p.result?.activationId) {
            responseText += `  Activation started: ${p.result.activationId}\n`;
          }
        });
    }

    if (operation.failedItems > 0) {
      responseText += `\n## ❌ Failed Clones (${operation.failedItems})\n`;
      operation.properties
        .filter((p) => p.status === 'failed')
        .forEach((p) => {
          responseText += `- **${p.propertyName}**\n`;
          responseText += `  Error: ${p.error}\n`;
        });
    }

    responseText += '\n## Operation Summary\n';
    responseText += `- **Duration:** ${Math.round((operation.endTime!.getTime() - operation.startTime.getTime()) / 1000)} seconds\n`;
    responseText += `- **Average time per clone:** ${Math.round((operation.endTime!.getTime() - operation.startTime.getTime()) / operation.processedItems)} ms\n`;

    responseText += '\n## Next Steps\n';
    if (operation.successfulItems > 0) {
      responseText += '1. Configure hostnames for cloned properties\n';
      responseText += '2. Update origin settings as needed\n';
      responseText += '3. Test and activate properties\n';
    }
    if (operation.failedItems > 0) {
      responseText += '1. Review failed clones for errors\n';
      responseText += '2. Fix permission or validation issues\n';
      responseText += '3. Retry failed operations individually\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    operationTracker.updateOperation(operationTracker.createOperation('clone', 0, {}), {
      status: 'failed',
      endTime: new Date(),
    });

    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'bulk clone properties',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Bulk activate multiple properties
 */
export async function bulkActivateProperties(
  client: AkamaiClient,
  args: BulkActivationOptions,
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const operationId = operationTracker.createOperation('activate', args.propertyIds.length, {
      network: args.network,
      rollbackEnabled: false,
      parallelExecution: true,
      maxConcurrency: 10,
    });

    operationTracker.updateOperation(operationId, { status: 'in-progress' });

    // Process each property
    const activationPromises = args.propertyIds.map(async (propertyId) => {
      const propertyOp: BulkPropertyOperation = {
        propertyId,
        propertyName: 'Unknown',
        status: 'in-progress',
        startTime: new Date(),
      };

      operationTracker.addPropertyOperation(operationId, propertyOp);

      try {
        // Get property details
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
        });

        const property = propertyResponse.properties?.items?.[0];
        if (!property) {
          throw new Error('Property not found');
        }

        propertyOp.propertyName = property.propertyName;

        // Check if already activated
        await client.request({
          path: `/papi/v1/properties/${propertyId}/activations`,
          method: 'GET',
        });

        const activeVersion =
          args.network === 'PRODUCTION' ? property.productionVersion : property.stagingVersion;

        if (activeVersion === property.latestVersion) {
          operationTracker.updatePropertyStatus(operationId, propertyId, 'skipped', {
            message: `Already activated on ${args.network}`,
            version: activeVersion,
          });
          return;
        }

        // Create activation
        const activationResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}/activations`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            propertyVersion: property.latestVersion,
            network: args.network,
            note: args.note || `Bulk activation - ${new Date().toISOString()}`,
            notifyEmails: args.notifyEmails || [],
            acknowledgeAllWarnings: args.acknowledgeAllWarnings || false,
          },
        });

        const activationId = activationResponse.activationLink?.split('/').pop();

        // Wait for completion if requested
        if (args.waitForCompletion) {
          const maxWait = args.maxWaitTime || 300000; // 5 minutes default
          const startWait = Date.now();
          let status = 'PENDING';

          while (status === 'PENDING' && Date.now() - startWait < maxWait) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

            const statusResponse = await client.request({
              path: `/papi/v1/properties/${propertyId}/activations/${activationId}`,
              method: 'GET',
            });

            status = statusResponse.activations?.items?.[0]?.status;
          }

          propertyOp.result = {
            activationId,
            status,
            version: property.latestVersion,
          };

          if (status === 'ACTIVE') {
            operationTracker.updatePropertyStatus(
              operationId,
              propertyId,
              'completed',
              propertyOp.result,
            );
          } else {
            operationTracker.updatePropertyStatus(
              operationId,
              propertyId,
              'failed',
              propertyOp.result,
              `Activation status: ${status}`,
            );
          }
        } else {
          propertyOp.result = {
            activationId,
            version: property.latestVersion,
          };
          operationTracker.updatePropertyStatus(
            operationId,
            propertyId,
            'completed',
            propertyOp.result,
          );
        }
      } catch (_error) {
        operationTracker.updatePropertyStatus(
          operationId,
          propertyId,
          'failed',
          null,
          (error as Error).message,
        );
      }
    });

    // Execute with concurrency control
    const concurrencyLimit = 10;
    for (let i = 0; i < activationPromises.length; i += concurrencyLimit) {
      await Promise.allSettled(activationPromises.slice(i, i + concurrencyLimit));
    }

    operationTracker.updateOperation(operationId, {
      status: 'completed',
      endTime: new Date(),
    });

    const operation = operationTracker.getOperation(operationId)!;

    // Format response
    let responseText = '# Bulk Activation Results\n\n';
    responseText += `**Operation ID:** ${operationId}\n`;
    responseText += `**Network:** ${args.network}\n`;
    responseText += `**Total Properties:** ${operation.totalItems}\n`;
    responseText += `**Successful:** ${operation.successfulItems}\n`;
    responseText += `**Failed:** ${operation.failedItems}\n`;
    responseText += `**Skipped:** ${operation.properties.filter((p) => p.status === 'skipped').length}\n\n`;

    if (operation.successfulItems > 0) {
      responseText += `## ✅ Successfully Activated (${operation.successfulItems})\n`;
      operation.properties
        .filter((p) => p.status === 'completed')
        .forEach((p) => {
          responseText += `- **${p.propertyName}** (${p.propertyId})\n`;
          responseText += `  Version: ${p.result?.version}, Activation: ${p.result?.activationId}\n`;
          if (p.result?.status) {
            responseText += `  Status: ${p.result.status}\n`;
          }
        });
    }

    const skipped = operation.properties.filter((p) => p.status === 'skipped');
    if (skipped.length > 0) {
      responseText += `\n## ⏭️ Skipped (${skipped.length})\n`;
      skipped.forEach((p) => {
        responseText += `- **${p.propertyName}** (${p.propertyId})\n`;
        responseText += `  ${p.result?.message}\n`;
      });
    }

    if (operation.failedItems > 0) {
      responseText += `\n## ❌ Failed Activations (${operation.failedItems})\n`;
      operation.properties
        .filter((p) => p.status === 'failed')
        .forEach((p) => {
          responseText += `- **${p.propertyName}** (${p.propertyId})\n`;
          responseText += `  Error: ${p.error}\n`;
        });
    }

    responseText += '\n## Operation Summary\n';
    responseText += `- **Duration:** ${Math.round((operation.endTime!.getTime() - operation.startTime.getTime()) / 1000)} seconds\n`;
    responseText += `- **Average time per property:** ${Math.round((operation.endTime!.getTime() - operation.startTime.getTime()) / operation.processedItems)} ms\n`;

    responseText += '\n## Next Steps\n';
    if (operation.successfulItems > 0) {
      responseText += '1. Monitor activation progress in Control Center\n';
      responseText += '2. Test activated properties\n';
      responseText += '3. Monitor performance metrics\n';
    }
    if (operation.failedItems > 0) {
      responseText += '1. Review validation errors for failed properties\n';
      responseText += '2. Fix any issues and retry activation\n';
      responseText += '3. Consider activating to staging first\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'bulk activate properties',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Bulk update property rules
 */
export async function bulkUpdatePropertyRules(
  client: AkamaiClient,
  args: BulkRuleUpdateOptions,
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const operationId = operationTracker.createOperation('update-rules', args.propertyIds.length, {
      patchCount: args.rulePatches.length,
      rollbackEnabled: true,
      parallelExecution: false, // Sequential for safety
      maxConcurrency: 1,
    });

    operationTracker.updateOperation(operationId, { status: 'in-progress' });

    // Process each property sequentially
    for (const propertyId of args.propertyIds) {
      const propertyOp: BulkPropertyOperation = {
        propertyId,
        propertyName: 'Unknown',
        status: 'in-progress',
        startTime: new Date(),
      };

      operationTracker.addPropertyOperation(operationId, propertyOp);

      try {
        // Get property details
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
        });

        const property = propertyResponse.properties?.items?.[0];
        if (!property) {
          throw new Error('Property not found');
        }

        propertyOp.propertyName = property.propertyName;

        let version = property.latestVersion;

        // Create new version if requested
        if (args.createNewVersion) {
          const versionResponse = await client.request({
            path: `/papi/v1/properties/${propertyId}/versions`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId,
            },
            body: {
              createFromVersion: version,
              createFromVersionEtag: property.etag,
            },
          });

          version = parseInt(versionResponse.versionLink.split('/').pop());
        }

        // Get current rules
        const rulesResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
          method: 'GET',
          headers: {
            Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
          },
        });

        // Store original rules for rollback
        propertyOp.rollbackData = {
          originalRules: JSON.parse(JSON.stringify(rulesResponse.rules)),
          version,
        };

        // Apply patches
        let rules = rulesResponse.rules;
        for (const patch of args.rulePatches) {
          rules = applyJsonPatch(rules, patch);
        }

        // Validate if requested
        if (args.validateChanges) {
          // This would call a validation endpoint
          // For now, we'll do basic validation
          if (!rules.name || !rules.behaviors) {
            throw new Error('Invalid rule structure after patches');
          }
        }

        // Update rules
        await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/vnd.akamai.papirules.v2024-02-12+json',
          },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId,
          },
          body: { rules },
        });

        // Add version notes if provided
        if (args.note) {
          await client.request({
            path: `/papi/v1/properties/${propertyId}/versions/${version}/version-notes`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              note: args.note,
            },
          });
        }

        propertyOp.result = {
          version,
          patchesApplied: args.rulePatches.length,
        };

        operationTracker.updatePropertyStatus(
          operationId,
          propertyId,
          'completed',
          propertyOp.result,
        );
      } catch (_error) {
        operationTracker.updatePropertyStatus(
          operationId,
          propertyId,
          'failed',
          null,
          (error as Error).message,
        );

        // Attempt rollback if we have rollback data
        if (propertyOp.rollbackData) {
          try {
            await client.request({
              path: `/papi/v1/properties/${propertyId}/versions/${propertyOp.rollbackData.version}/rules`,
              method: 'PUT',
              headers: {
                'Content-Type': 'application/vnd.akamai.papirules.v2024-02-12+json',
              },
              body: { rules: propertyOp.rollbackData.originalRules },
            });
            propertyOp._error += ' (Rolled back successfully)';
          } catch (_rollbackError) {
            propertyOp._error += ' (Rollback failed: ' + (rollbackError as Error).message + ')';
          }
        }
      }
    }

    operationTracker.updateOperation(operationId, {
      status: 'completed',
      endTime: new Date(),
    });

    const operation = operationTracker.getOperation(operationId)!;

    // Format response
    let responseText = '# Bulk Rule Update Results\n\n';
    responseText += `**Operation ID:** ${operationId}\n`;
    responseText += `**Total Properties:** ${operation.totalItems}\n`;
    responseText += `**Patches Applied:** ${args.rulePatches.length}\n`;
    responseText += `**Successful:** ${operation.successfulItems}\n`;
    responseText += `**Failed:** ${operation.failedItems}\n\n`;

    // Show patch summary
    responseText += '## Patches Applied\n';
    args.rulePatches.forEach((patch, idx) => {
      responseText += `${idx + 1}. **${patch.op}** ${patch.path}\n`;
      if (patch.value && patch.op !== 'remove') {
        responseText += `   Value: ${JSON.stringify(patch.value, null, 2).split('\n').join('\n   ')}\n`;
      }
    });
    responseText += '\n';

    if (operation.successfulItems > 0) {
      responseText += `## ✅ Successfully Updated (${operation.successfulItems})\n`;
      operation.properties
        .filter((p) => p.status === 'completed')
        .forEach((p) => {
          responseText += `- **${p.propertyName}** (${p.propertyId})\n`;
          responseText += `  Version: ${p.result?.version}\n`;
        });
    }

    if (operation.failedItems > 0) {
      responseText += `\n## ❌ Failed Updates (${operation.failedItems})\n`;
      operation.properties
        .filter((p) => p.status === 'failed')
        .forEach((p) => {
          responseText += `- **${p.propertyName}** (${p.propertyId})\n`;
          responseText += `  Error: ${p.error}\n`;
        });
    }

    responseText += '\n## Next Steps\n';
    responseText += '1. Review the updated rules in each property\n';
    responseText += '2. Test changes in staging environment\n';
    responseText += '3. Activate properties when ready\n';
    if (operation.failedItems > 0) {
      responseText += '4. Investigate failed updates and retry if needed\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'bulk update property rules',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Bulk manage hostnames across properties
 */
export async function bulkManageHostnames(
  client: AkamaiClient,
  args: BulkHostnameOptions,
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const totalOperations = args.operations.reduce((sum, op) => sum + op.hostnames.length, 0);
    const operationId = operationTracker.createOperation('add-hostnames', totalOperations, {
      rollbackEnabled: true,
      parallelExecution: false,
      maxConcurrency: 1,
    });

    operationTracker.updateOperation(operationId, { status: 'in-progress' });

    const results: Array<{
      propertyId: string;
      propertyName: string;
      hostname: string;
      action: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process each operation
    for (const operation of args.operations) {
      try {
        // Get property details
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${operation.propertyId}`,
          method: 'GET',
        });

        const property = propertyResponse.properties?.items?.[0];
        if (!property) {
          operation.hostnames.forEach((h: any) => {
            results.push({
              propertyId: operation.propertyId,
              propertyName: 'Unknown',
              hostname: h.hostname,
              action: operation.action,
              success: false,
              error: 'Property not found',
            });
          });
          continue;
        }

        let version = property.latestVersion;

        // Create new version if requested
        if (args.createNewVersion) {
          const versionResponse = await client.request({
            path: `/papi/v1/properties/${operation.propertyId}/versions`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId,
            },
            body: {
              createFromVersion: version,
              createFromVersionEtag: property.etag,
            },
          });

          version = parseInt(versionResponse.versionLink.split('/').pop());
        }

        // Get current hostnames
        const hostnamesResponse = await client.request({
          path: `/papi/v1/properties/${operation.propertyId}/versions/${version}/hostnames`,
          method: 'GET',
        });

        let hostnames = hostnamesResponse.hostnames?.items || [];

        // Process each hostname operation
        for (const hostnameOp of operation.hostnames) {
          try {
            if (operation.action === 'add') {
              // Check if hostname already exists
              if (hostnames.some((h: any) => h.cnameFrom === hostnameOp.hostname)) {
                results.push({
                  propertyId: operation.propertyId,
                  propertyName: property.propertyName,
                  hostname: hostnameOp.hostname,
                  action: 'add',
                  success: false,
                  error: 'Hostname already exists',
                });
                continue;
              }

              // Validate DNS if requested
              if (args.validateDNS) {
                // This would perform actual DNS validation
                // For now, we'll do basic validation
                if (!isValidHostname(hostnameOp.hostname)) {
                  results.push({
                    propertyId: operation.propertyId,
                    propertyName: property.propertyName,
                    hostname: hostnameOp.hostname,
                    action: 'add',
                    success: false,
                    error: 'Invalid hostname format',
                  });
                  continue;
                }
              }

              hostnames.push({
                cnameType: 'EDGE_HOSTNAME',
                cnameFrom: hostnameOp.hostname,
                cnameTo: hostnameOp.edgeHostname || `${hostnameOp.hostname}.edgekey.net`,
              });
            } else if (operation.action === 'remove') {
              hostnames = hostnames.filter((h: any) => h.cnameFrom !== hostnameOp.hostname);
            }

            results.push({
              propertyId: operation.propertyId,
              propertyName: property.propertyName,
              hostname: hostnameOp.hostname,
              action: operation.action,
              success: true,
            });
          } catch (_error) {
            results.push({
              propertyId: operation.propertyId,
              propertyName: property.propertyName,
              hostname: hostnameOp.hostname,
              action: operation.action,
              success: false,
              error: (error as Error).message,
            });
          }
        }

        // Update hostnames
        await client.request({
          path: `/papi/v1/properties/${operation.propertyId}/versions/${version}/hostnames`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId,
          },
          body: { hostnames },
        });

        // Add version notes if provided
        if (args.note) {
          await client.request({
            path: `/papi/v1/properties/${operation.propertyId}/versions/${version}/version-notes`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              note: args.note,
            },
          });
        }
      } catch (_error) {
        operation.hostnames.forEach((h: any) => {
          results.push({
            propertyId: operation.propertyId,
            propertyName: 'Unknown',
            hostname: h.hostname,
            action: operation.action,
            success: false,
            error: (error as Error).message,
          });
        });
      }
    }

    operationTracker.updateOperation(operationId, {
      status: 'completed',
      endTime: new Date(),
    });

    // Format response
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    let responseText = '# Bulk Hostname Management Results\n\n';
    responseText += `**Operation ID:** ${operationId}\n`;
    responseText += `**Total Operations:** ${results.length}\n`;
    responseText += `**Successful:** ${successCount}\n`;
    responseText += `**Failed:** ${failCount}\n\n`;

    // Group by property
    const byProperty = new Map<string, typeof results>();
    results.forEach((r) => {
      const key = r.propertyId;
      if (!byProperty.has(key)) {
        byProperty.set(key, []);
      }
      byProperty.get(key)!.push(r);
    });

    responseText += '## Results by Property\n';
    byProperty.forEach((propResults, propertyId) => {
      const propName = propResults[0]?.propertyName || 'Unknown';
      const propSuccess = propResults.filter((r) => r.success).length;
      const propFail = propResults.filter((r) => !r.success).length;

      responseText += `\n### ${propName} (${propertyId})\n`;
      responseText += `Success: ${propSuccess}, Failed: ${propFail}\n\n`;

      if (propSuccess > 0) {
        responseText += '**✅ Successful:**\n';
        propResults
          .filter((r) => r.success)
          .forEach((r) => {
            responseText += `- ${r.action === 'add' ? 'Added' : 'Removed'}: ${r.hostname}\n`;
          });
      }

      if (propFail > 0) {
        responseText += '\n**❌ Failed:**\n';
        propResults
          .filter((r) => !r.success)
          .forEach((r) => {
            responseText += `- ${r.hostname}: ${r.error}\n`;
          });
      }
    });

    responseText += '\n## Next Steps\n';
    responseText += '1. Update DNS records for added hostnames\n';
    responseText += '2. Configure SSL certificates as needed\n';
    responseText += '3. Test hostname resolution\n';
    responseText += '4. Activate properties when ready\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'bulk manage hostnames',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Get bulk operation status
 */
export async function getBulkOperationStatus(
  _client: AkamaiClient,
  args: {
    operationId: string;
    detailed?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const operation = operationTracker.getOperation(args.operationId);

    if (!operation) {
      return {
        content: [
          {
            type: 'text',
            text: `Operation ${args.operationId} not found. Operations are kept in memory and may be lost after server restart.`,
          },
        ],
      };
    }

    let responseText = '# Bulk Operation Status\n\n';
    responseText += `**Operation ID:** ${operation.id}\n`;
    responseText += `**Type:** ${operation.type}\n`;
    responseText += `**Status:** ${operation.status}\n`;
    responseText += `**Start Time:** ${operation.startTime.toISOString()}\n`;
    if (operation.endTime) {
      responseText += `**End Time:** ${operation.endTime.toISOString()}\n`;
      responseText += `**Duration:** ${Math.round((operation.endTime.getTime() - operation.startTime.getTime()) / 1000)} seconds\n`;
    }
    responseText += '\n**Progress:**\n';
    responseText += `- Total Items: ${operation.totalItems}\n`;
    responseText += `- Processed: ${operation.processedItems}\n`;
    responseText += `- Successful: ${operation.successfulItems}\n`;
    responseText += `- Failed: ${operation.failedItems}\n`;

    if (operation.processedItems > 0) {
      const successRate = ((operation.successfulItems / operation.processedItems) * 100).toFixed(1);
      responseText += `- Success Rate: ${successRate}%\n`;
    }

    if (args.detailed && operation.properties.length > 0) {
      responseText += '\n## Detailed Property Status\n';

      const byStatus = new Map<string, typeof operation.properties>();
      operation.properties.forEach((p) => {
        if (!byStatus.has(p.status)) {
          byStatus.set(p.status, []);
        }
        byStatus.get(p.status)!.push(p);
      });

      byStatus.forEach((props, status) => {
        responseText += `\n### ${status.toUpperCase()} (${props.length})\n`;
        props.forEach((p) => {
          responseText += `- **${p.propertyName}** (${p.propertyId})\n`;
          if (p.error) {
            responseText += `  Error: ${p.error}\n`;
          }
          if (p.result) {
            responseText += `  Result: ${JSON.stringify(p.result)}\n`;
          }
        });
      });
    }

    if (operation.status === 'in-progress') {
      const elapsed = Date.now() - operation.startTime.getTime();
      const avgTime = elapsed / Math.max(operation.processedItems, 1);
      const remaining = operation.totalItems - operation.processedItems;
      const eta = new Date(Date.now() + avgTime * remaining);

      responseText += '\n## Estimated Completion\n';
      responseText += `- Remaining Items: ${remaining}\n`;
      responseText += `- Average Time per Item: ${Math.round(avgTime)} ms\n`;
      responseText += `- Estimated Completion: ${eta.toISOString()}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving operation status: ${(error as Error).message}`,
        },
      ],
    };
  }
}

// Helper functions
function applyJsonPatch(obj: any, patch: any): any {
  // Simple JSON patch implementation
  const cloned = JSON.parse(JSON.stringify(obj));

  const getValueAtPath = (obj: any, path: string): any => {
    const parts = path.split('/').filter((p) => p);
    let current = obj;
    for (const part of parts) {
      if (part && part.includes('[') && part.includes(']')) {
        const bracketIndex = part.indexOf('[');
        const key = part.substring(0, bracketIndex);
        const indexStr = part.substring(bracketIndex + 1, part.indexOf(']'));
        const index = parseInt(indexStr);
        current = current[key]?.[index];
      } else if (part) {
        current = current[part];
      }
      if (current === undefined) {
        return undefined;
      }
    }
    return current;
  };

  const setValueAtPath = (obj: any, path: string, value: any): void => {
    const parts = path.split('/').filter((p) => p);
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part && part.includes('[') && part.includes(']')) {
        const bracketIndex = part.indexOf('[');
        const key = part.substring(0, bracketIndex);
        const indexStr = part.substring(bracketIndex + 1, part.indexOf(']'));
        const index = parseInt(indexStr);
        if (!current[key]) {
          current[key] = [];
        }
        if (!current[key][index]) {
          current[key][index] = {};
        }
        current = current[key][index];
      } else if (part) {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.includes('[') && lastPart.includes(']')) {
      const bracketIndex = lastPart.indexOf('[');
      const key = lastPart.substring(0, bracketIndex);
      const indexStr = lastPart.substring(bracketIndex + 1, lastPart.indexOf(']'));
      const index = parseInt(indexStr);
      if (!current[key]) {
        current[key] = [];
      }
      current[key][index] = value;
    } else if (lastPart) {
      current[lastPart] = value;
    }
  };

  switch (patch.op) {
    case 'add':
      setValueAtPath(cloned, patch.path, patch.value);
      break;
    case 'remove': {
      const pathParts = patch.path.split('/').filter((p: string) => p);
      const parent = getValueAtPath(cloned, pathParts.slice(0, -1).join('/'));
      if (parent && pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
          delete parent[lastPart];
        }
      }
      break;
    }
    case 'replace':
      setValueAtPath(cloned, patch.path, patch.value);
      break;
    case 'copy': {
      const copyValue = getValueAtPath(cloned, patch.from);
      setValueAtPath(cloned, patch.path, copyValue);
      break;
    }
    case 'move': {
      const moveValue = getValueAtPath(cloned, patch.from);
      setValueAtPath(cloned, patch.path, moveValue);
      // Remove from original location
      const fromParts = patch.from.split('/').filter((p: string) => p);
      const fromParent = getValueAtPath(cloned, fromParts.slice(0, -1).join('/'));
      if (fromParent && fromParts.length > 0) {
        const lastFromPart = fromParts[fromParts.length - 1];
        if (lastFromPart) {
          delete fromParent[lastFromPart];
        }
      }
      break;
    }
  }

  return cloned;
}

function isValidHostname(hostname: string): boolean {
  // Basic hostname validation
  const hostnameRegex = /^(?!-)([a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,}$/;
  return hostnameRegex.test(hostname);
}
