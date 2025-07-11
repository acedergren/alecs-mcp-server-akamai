/**
 * Property API Implementation Details
 * 
 * Contains endpoints, schemas, and formatters for property tools
 */

import { z } from 'zod';
import { CustomerSchema, PropertyIdSchema, ContractIdSchema, GroupIdSchema } from '../common/validators';

/**
 * Property API Endpoints
 */
export const PropertyEndpoints = {
  listProperties: () => '/papi/v1/properties',
  getProperty: (propertyId: string) => `/papi/v1/properties/${propertyId}`,
  getPropertyVersion: (propertyId: string, version: number) => `/papi/v1/properties/${propertyId}/versions/${version}`,
  createProperty: () => '/papi/v1/properties',
  updatePropertyRules: (propertyId: string, version: number) => `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
  getPropertyRules: (propertyId: string, version: number) => `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
  activateProperty: (propertyId: string) => `/papi/v1/properties/${propertyId}/activations`,
  getActivation: (propertyId: string, activationId: string) => `/papi/v1/properties/${propertyId}/activations/${activationId}`,
  getPropertyVersions: (propertyId: string) => `/papi/v1/properties/${propertyId}/versions`,
  createPropertyVersion: (propertyId: string) => `/papi/v1/properties/${propertyId}/versions`,
  deleteProperty: (propertyId: string) => `/papi/v1/properties/${propertyId}`
};

/**
 * Property Tool Schemas
 */
export const PropertyToolSchemas = {
  list: CustomerSchema.extend({
    contractId: ContractIdSchema.optional(),
    groupId: GroupIdSchema.optional(),
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional()
  }),

  get: CustomerSchema.extend({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive().optional()
  }),

  create: CustomerSchema.extend({
    propertyName: z.string().min(1).max(255),
    contractId: ContractIdSchema,
    groupId: GroupIdSchema,
    productId: z.string(),
    ruleFormat: z.string().optional(),
    createCpCode: z.boolean().optional()
  }),

  updateRules: CustomerSchema.extend({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive(),
    rules: z.object({}).passthrough(), // Dynamic rule tree
    validateRules: z.boolean().optional().default(true)
  }),

  getRules: CustomerSchema.extend({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive(),
    format: z.enum(['json', 'text']).optional()
  }),

  activate: CustomerSchema.extend({
    propertyId: PropertyIdSchema,
    version: z.number().int().positive(),
    network: z.enum(['staging', 'production']),
    notes: z.string().optional(),
    notifyEmails: z.array(z.string().email()).optional(),
    acknowledgeWarnings: z.boolean().optional().default(false),
    complianceRecord: z.object({
      noncomplianceReason: z.string().optional()
    }).optional()
  }),

  clone: CustomerSchema.extend({
    sourcePropertyId: PropertyIdSchema,
    propertyName: z.string().min(1).max(255),
    version: z.number().int().positive().optional(),
    contractId: ContractIdSchema.optional(),
    groupId: GroupIdSchema.optional(),
    productId: z.string().optional()
  })
};

/**
 * Format property list response
 */
export function formatPropertyList(response: any): string {
  const properties = response.properties?.items || [];
  
  let text = `📦 **Property List**\n\n`;
  
  if (properties.length === 0) {
    text += '⚠️ No properties found.\n';
    return text;
  }
  
  text += `Found **${properties.length}** properties:\n\n`;
  
  properties.slice(0, 20).forEach((prop: any, index: number) => {
    text += `${index + 1}. **${prop.propertyName}**\n`;
    text += `   • ID: ${prop.propertyId}\n`;
    text += `   • Contract: ${prop.contractId}\n`;
    text += `   • Group: ${prop.groupId}\n`;
    text += `   • Product: ${prop.productId}\n`;
    text += `   • Latest Version: ${prop.latestVersion}\n`;
    text += `   • Production: ${prop.productionVersion || 'Not activated'}\n`;
    text += `   • Staging: ${prop.stagingVersion || 'Not activated'}\n`;
    text += `\n`;
  });
  
  if (properties.length > 20) {
    text += `_... and ${properties.length - 20} more properties_\n`;
  }
  
  return text;
}

/**
 * Format property details response
 */
export function formatPropertyDetails(response: any): string {
  const prop = response.properties?.items?.[0] || response.propertyVersion || response;
  
  let text = `📦 **Property Details**\n\n`;
  text += `**Name:** ${prop.propertyName}\n`;
  text += `**ID:** ${prop.propertyId}\n`;
  text += `**Contract:** ${prop.contractId}\n`;
  text += `**Group:** ${prop.groupId}\n`;
  text += `**Product:** ${prop.productId}\n`;
  
  if (prop.propertyVersion) {
    text += `\n**Version:** ${prop.propertyVersion}\n`;
    text += `**Rule Format:** ${prop.ruleFormat}\n`;
    text += `**Updated:** ${new Date(prop.updatedDate).toLocaleString()}\n`;
    text += `**Updated By:** ${prop.updatedByUser}\n`;
    
    if (prop.note) {
      text += `**Note:** ${prop.note}\n`;
    }
  } else {
    text += `\n**Latest Version:** ${prop.latestVersion}\n`;
    text += `**Production Version:** ${prop.productionVersion || 'Not activated'}\n`;
    text += `**Staging Version:** ${prop.stagingVersion || 'Not activated'}\n`;
  }
  
  if (prop.hostnames && prop.hostnames.length > 0) {
    text += `\n**Hostnames:**\n`;
    prop.hostnames.forEach((hostname: any) => {
      text += `• ${hostname.cnameFrom} → ${hostname.cnameTo}\n`;
    });
  }
  
  return text;
}

/**
 * Format activation status response
 */
export function formatActivationStatus(data: any): string {
  const emoji = data.status === 'active' ? '✅' : 
               data.status === 'failed' ? '❌' : '⏳';
  
  let text = `${emoji} **Property Activation**\n\n`;
  text += `**Property:** ${data.property}\n`;
  text += `**Version:** ${data.version}\n`;
  text += `**Network:** ${data.network.toUpperCase()}\n`;
  text += `**Activation ID:** ${data.activationId}\n`;
  text += `**Status:** ${data.status}\n`;
  
  if (data.status === 'active') {
    text += `\n✅ Activation completed successfully!`;
    
    if (data.network === 'staging') {
      text += `\n\n🎯 **Next Step:** Test your staging URL, then activate to production.`;
    }
  } else if (data.status === 'failed') {
    text += `\n❌ Activation failed. Check the activation details for errors.`;
  } else {
    text += `\n⏳ Activation is still in progress. Check status with activation ID.`;
  }
  
  return text;
}