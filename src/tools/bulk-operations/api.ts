/**
 * Bulk Operations API Implementation
 * 
 * Provides endpoints, schemas, and formatters for bulk operations tools
 * following the standard API pattern established for other domains.
 */

import { z } from 'zod';
import { CustomerSchema, PropertyIdSchema } from '../common';

/**
 * Bulk Operations API Endpoints
 */
export const BulkOperationsEndpoints = {
  // Bulk activations
  bulkActivations: () => '/papi/v1/bulk/activations',
  getBulkActivation: (bulkActivationId: string) => `/papi/v1/bulk/activations/${bulkActivationId}`,
  
  // Bulk rules patches
  bulkRulesPatches: () => '/papi/v1/bulk/rules-patch-requests',
  getBulkRulesPatch: (bulkPatchId: string) => `/papi/v1/bulk/rules-patch-requests/${bulkPatchId}`,
  
  // Property operations for cloning
  cloneProperty: (propertyId: string, version: number) => `/papi/v1/properties/${propertyId}/versions/${version}/clone`,
  getProperty: (propertyId: string) => `/papi/v1/properties/${propertyId}`,
  getPropertyHostnames: (propertyId: string, version: number) => `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`,
  updatePropertyHostnames: (propertyId: string, version: number) => `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`
};

/**
 * Bulk Operations Tool Schemas
 */
export const BulkOperationsToolSchemas = {
  bulkActivate: CustomerSchema.extend({
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
  }),

  bulkClone: CustomerSchema.extend({
    sourcePropertyId: PropertyIdSchema,
    cloneConfigs: z.array(z.object({
      propertyName: z.string().min(1).max(85),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string().optional()
    })).min(1).max(100),
    cloneFromVersion: z.number().int().positive().optional()
  }),

  bulkHostnames: CustomerSchema.extend({
    operations: z.array(z.object({
      propertyId: PropertyIdSchema,
      propertyVersion: z.number().int().positive(),
      action: z.enum(['add', 'remove']),
      hostnames: z.array(z.string()).min(1)
    })).min(1).max(100),
    validateOnly: z.boolean().default(false)
  }),

  bulkRulesUpdate: CustomerSchema.extend({
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
  }),

  bulkOperationStatus: CustomerSchema.extend({
    operationId: z.string(),
    operationType: z.enum(['activation', 'clone', 'hostname', 'rules'])
  })
};

/**
 * Response Formatters
 */
export function formatBulkActivationResponse(data: any): string {
  let text = `🚀 **Bulk Activation Started**\n\n`;
  text += `**Bulk Activation ID:** ${data.bulkActivationId}\n`;
  text += `**Properties Count:** ${data.propertiesCount}\n`;
  text += `**Submission Time:** ${data.submissionTime}\n`;
  text += `**Estimated Completion:** ${data.estimatedCompletionTime}\n`;
  text += `**Status:** ${data.status}\n\n`;
  text += `🔗 **Tracking URL:** ${data.trackingUrl}\n\n`;
  text += `🎯 **Next Steps:**\n`;
  text += `1. Monitor progress: \`bulk_operation_status\`\n`;
  text += `2. Check individual activation status\n`;
  
  return text;
}

export function formatBulkCloneResponse(data: any): string {
  let text = `📋 **Bulk Clone Operation Complete**\n\n`;
  text += `**Source Property:** ${data.sourcePropertyName} (${data.sourcePropertyId})\n`;
  text += `**Clone Version:** ${data.cloneVersion}\n`;
  text += `**Total Requested:** ${data.totalRequested}\n`;
  text += `**Successful:** ${data.successCount}\n`;
  text += `**Failed:** ${data.failedCount}\n\n`;
  
  if (data.cloneResults?.length > 0) {
    text += `**Results:**\n`;
    data.cloneResults.forEach((result: any) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      text += `${status} ${result.propertyName}`;
      if (result.propertyId) {
        text += ` (${result.propertyId})`;
      }
      if (result.error) {
        text += ` - ${result.error}`;
      }
      text += '\n';
    });
  }
  
  return text;
}

export function formatBulkHostnamesResponse(data: any): string {
  let text = `🌐 **Bulk Hostnames Operation Complete**\n\n`;
  text += `**Total Operations:** ${data.totalOperations}\n`;
  text += `**Successful:** ${data.successCount}\n`;
  text += `**Failed:** ${data.failedCount}\n`;
  text += `**Validate Only:** ${data.validateOnly ? 'Yes' : 'No'}\n\n`;
  
  if (data.summary) {
    text += `**Summary:**\n`;
    text += `• Hostnames Added: ${data.summary.hostnamesAdded}\n`;
    text += `• Hostnames Removed: ${data.summary.hostnamesRemoved}\n\n`;
  }
  
  if (data.results?.length > 0) {
    text += `**Operation Results:**\n`;
    data.results.slice(0, 10).forEach((result: any) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      text += `${status} ${result.propertyId} v${result.propertyVersion} - ${result.action}`;
      if (result.hostnamesAffected) {
        text += ` (${result.hostnamesAffected} hostnames)`;
      }
      if (result.error) {
        text += ` - ${result.error}`;
      }
      text += '\n';
    });
    
    if (data.results.length > 10) {
      text += `_... and ${data.results.length - 10} more operations_\n`;
    }
  }
  
  return text;
}

export function formatBulkRulesUpdateResponse(data: any): string {
  let text = `📝 **Bulk Rules Update Started**\n\n`;
  text += `**Bulk Patch ID:** ${data.bulkPatchId}\n`;
  text += `**Properties Count:** ${data.propertiesCount}\n`;
  text += `**Total Patches:** ${data.totalPatches}\n`;
  text += `**Submission Time:** ${data.submissionTime}\n`;
  text += `**Status:** ${data.status}\n\n`;
  text += `🔗 **Tracking URL:** ${data.trackingUrl}\n\n`;
  text += `🎯 **Next Steps:**\n`;
  text += `1. Monitor progress: \`bulk_operation_status\`\n`;
  text += `2. Validate rules updates\n`;
  
  return text;
}

export function formatBulkOperationStatus(data: any): string {
  let text = `📊 **Bulk Operation Status**\n\n`;
  text += `**Operation ID:** ${data.operationId}\n`;
  text += `**Type:** ${data.operationType}\n`;
  text += `**Status:** ${data.status}\n`;
  text += `**Submission Time:** ${data.submissionTime}\n`;
  
  if (data.completionTime) {
    text += `**Completion Time:** ${data.completionTime}\n`;
  } else if (data.estimatedCompletionTime) {
    text += `**Estimated Completion:** ${data.estimatedCompletionTime}\n`;
  }
  
  if (data.progress) {
    text += `\n**Progress:**\n`;
    text += `• Total: ${data.progress.total}\n`;
    text += `• Completed: ${data.progress.completed}\n`;
    text += `• Failed: ${data.progress.failed}\n`;
    text += `• In Progress: ${data.progress.inProgress}\n`;
    text += `• Completion: ${data.progress.completionPercentage}%\n`;
  }
  
  return text;
}