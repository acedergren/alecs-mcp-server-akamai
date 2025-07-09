/**
 * Billing Domain Index
 * 
 * MCP-compliant tool definitions for billing operations
 * 
 * Generated on 2025-07-09T22:49:33.647Z using ALECSCore CLI
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import { billingTools as consolidatedBillingTools } from './billing-tools';
import { BillingToolSchemas } from './billing-api-implementation';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Billing Domain Tools
 * 
 * Complete billing API implementation following MCP patterns
 */
export const billingTools: Record<string, Tool> = {
  // Usage by Product
  'billing_usage_by_product': {
    name: 'billing_usage_by_product',
    description: 'Get monthly usage data by product for a contract',
    inputSchema: zodToJsonSchema(BillingToolSchemas.usageByProduct) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.usageByProduct(args)
  },

  // Usage by Contract
  'billing_usage_by_contract': {
    name: 'billing_usage_by_contract',
    description: 'Get monthly usage data for all contracts',
    inputSchema: zodToJsonSchema(BillingToolSchemas.usageByContract) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.usageByContract(args)
  },

  // Usage by Reporting Group
  'billing_usage_by_reporting_group': {
    name: 'billing_usage_by_reporting_group',
    description: 'Get monthly usage data by reporting group for a contract',
    inputSchema: zodToJsonSchema(BillingToolSchemas.usageByReportingGroup) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.usageByReportingGroup(args)
  },

  // Usage by CP Code
  'billing_usage_by_cpcode': {
    name: 'billing_usage_by_cpcode',
    description: 'Get monthly usage data by CP code for a reporting group',
    inputSchema: zodToJsonSchema(BillingToolSchemas.usageByCpCode) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.usageByCpCode(args)
  },

  // List Invoices
  'billing_list_invoices': {
    name: 'billing_list_invoices',
    description: 'List invoices with optional filtering',
    inputSchema: zodToJsonSchema(BillingToolSchemas.listInvoices) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.listInvoices(args)
  },

  // Get Invoice
  'billing_get_invoice': {
    name: 'billing_get_invoice',
    description: 'Get detailed invoice information',
    inputSchema: zodToJsonSchema(BillingToolSchemas.getInvoice) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.getInvoice(args)
  },

  // Get Cost Estimates
  'billing_get_estimates': {
    name: 'billing_get_estimates',
    description: 'Get cost estimates for current or specific month',
    inputSchema: zodToJsonSchema(BillingToolSchemas.getEstimates) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.getEstimates(args)
  },

  // List Cost Centers
  'billing_list_cost_centers': {
    name: 'billing_list_cost_centers',
    description: 'List all configured cost centers',
    inputSchema: zodToJsonSchema(BillingToolSchemas.listCostCenters) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.listCostCenters(args)
  },

  // Get Notification Preferences
  'billing_get_notification_preferences': {
    name: 'billing_get_notification_preferences',
    description: 'Get billing notification preferences',
    inputSchema: zodToJsonSchema(BillingToolSchemas.getNotificationPreferences) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.getNotificationPreferences(args)
  },

  // Update Notification Preferences
  'billing_update_notification_preferences': {
    name: 'billing_update_notification_preferences',
    description: 'Update billing notification preferences',
    inputSchema: zodToJsonSchema(BillingToolSchemas.updateNotificationPreferences) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedBillingTools.updateNotificationPreferences(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export { consolidatedBillingTools };

/**
 * Export for dynamic registration
 */
export default billingTools;