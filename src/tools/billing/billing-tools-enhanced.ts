/**
 * Billing Domain Tools - Enhanced CLI Pattern
 * 
 * This is the new standard implementation showing how ALL tools should be built.
 * Features:
 * - Dynamic customer support (no singleton lock)
 * - Built-in caching with TTL
 * - Automatic hint integration
 * - Progress tracking for long operations
 * - Enhanced error messages
 * - Type safety throughout
 * 
 * Generated on 2025-01-11 using Enhanced ALECSCore CLI
 */

import { z } from 'zod';
import { EnhancedTool, createTool } from '../common/enhanced-tool-base';
import { BillingEndpoints, BillingToolSchemas, formatBytes, formatCurrency, calculatePercentageChange } from './billing-api-implementation';
import type { MCPToolResponse } from '../../types/mcp-protocol';

// Create enhanced tool instance for billing domain
const billingTool = new EnhancedTool('billing');

/**
 * Format product usage response
 */
function formatProductUsage(response: any, args: any): string {
  const products = response.products || [];
  const totalValue = products.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  let text = `📊 **Product Usage Report**\n`;
  text += `Contract: ${args.contractId}\n`;
  text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;

  if (products.length > 0) {
    text += `**Products** (${products.length} total):\n`;
    products.forEach((product: any, index: number) => {
      const percentage = totalValue > 0 ? ((product.value / totalValue) * 100).toFixed(1) : '0';
      text += `${index + 1}. **${product.productName}** (${product.productId})\n`;
      text += `   • Usage: ${formatBytes(product.value)} (${percentage}% of total)\n`;
      if (product.previousValue) {
        text += `   • Change: ${calculatePercentageChange(product.value, product.previousValue)}\n`;
      }
      text += `\n`;
    });
    text += `**Total Usage**: ${formatBytes(totalValue)}\n`;
  } else {
    text += '⚠️ No product usage data found for the specified period.\n';
  }
  
  return text;
}

/**
 * Get usage by product - Enhanced implementation
 */
export async function usageByProduct(args: z.infer<typeof BillingToolSchemas.usageByProduct>): Promise<MCPToolResponse> {
  return billingTool.execute(
    'billing_usage_by_product',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByProduct(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    {
      format: 'text',
      formatter: (data) => formatProductUsage(data, args),
      cacheKey: (p) => `billing:usage:product:${p.contractId}:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600, // 1 hour cache
      operation: 'usage-by-product'
    }
  );
}

/**
 * Get usage by contract - Enhanced implementation
 */
export async function usageByContract(args: z.infer<typeof BillingToolSchemas.usageByContract>): Promise<MCPToolResponse> {
  return billingTool.execute(
    'billing_usage_by_contract',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByContract(),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const contracts = response.contracts || [];
        
        let text = `📊 **Contract Usage Report**\n`;
        text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;
        
        if (contracts.length > 0) {
          text += `**Contracts** (${contracts.length} total):\n`;
          contracts.forEach((contract: any, index: number) => {
            text += `${index + 1}. **${contract.contractTypeName}** (${contract.contractId})\n`;
            text += `   • Usage: ${formatBytes(contract.value)}\n`;
            text += `   • Status: ${contract.status || 'Active'}\n`;
            text += `\n`;
          });
        } else {
          text += '⚠️ No contract usage data found for the specified period.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `billing:usage:contract:all:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600
    }
  );
}

/**
 * Get usage by reporting group - Enhanced implementation
 */
export async function usageByReportingGroup(args: z.infer<typeof BillingToolSchemas.usageByReportingGroup>): Promise<MCPToolResponse> {
  return billingTool.execute(
    'billing_usage_by_reporting_group',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByReportingGroup(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const groups = response.reportingGroups || [];
        
        let text = `📊 **Reporting Group Usage Report**\n`;
        text += `Contract: ${args.contractId}\n`;
        text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;
        
        if (groups.length > 0) {
          text += `**Reporting Groups** (${groups.length} total):\n`;
          groups.forEach((group: any, index: number) => {
            text += `${index + 1}. **${group.reportingGroupName}** (${group.reportingGroupId})\n`;
            text += `   • Usage: ${formatBytes(group.value)}\n`;
            text += `   • CP Codes: ${group.cpCodeCount || 'N/A'}\n`;
            text += `\n`;
          });
        } else {
          text += '⚠️ No reporting group usage data found for the specified period.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `billing:usage:group:${p.contractId}:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600
    }
  );
}

/**
 * Get usage by CP code - Enhanced implementation with progress
 */
export async function usageByCpCode(args: z.infer<typeof BillingToolSchemas.usageByCpCode>): Promise<MCPToolResponse> {
  return billingTool.execute(
    'billing_usage_by_cpcode',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByCpCode(args.contractId, args.reportingGroupId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth,
          limit: args.limit,
          offset: args.offset
        }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const cpCodes = response.cpCodes || [];
        const totalValue = cpCodes.reduce((sum: number, cp: any) => sum + (cp.value || 0), 0);
        
        let text = `📊 **CP Code Usage Report**\n`;
        text += `Contract: ${args.contractId}\n`;
        text += `Reporting Group: ${args.reportingGroupId}\n`;
        text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;
        
        if (cpCodes.length > 0) {
          text += `**CP Codes** (${cpCodes.length} total):\n`;
          
          // Sort by usage descending
          const sortedCodes = [...cpCodes].sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
          
          // Show top 10
          const topCodes = sortedCodes.slice(0, 10);
          topCodes.forEach((cp: any, index: number) => {
            const percentage = totalValue > 0 ? ((cp.value / totalValue) * 100).toFixed(1) : '0';
            text += `${index + 1}. **${cp.cpCodeName || `CP ${cp.cpCodeId}`}** (${cp.cpCodeId})\n`;
            text += `   • Usage: ${formatBytes(cp.value)} (${percentage}% of total)\n`;
            text += `   • Product: ${cp.productName || 'N/A'}\n`;
            text += `\n`;
          });
          
          if (cpCodes.length > 10) {
            text += `_... and ${cpCodes.length - 10} more CP codes_\n\n`;
          }
          
          text += `**Total Usage**: ${formatBytes(totalValue)}\n`;
          
          if (response.nextOffset) {
            text += `\n_More results available. Use offset: ${response.nextOffset} to see next page._\n`;
          }
        } else {
          text += '⚠️ No CP code usage data found for the specified period.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `billing:usage:cpcode:${p.contractId}:${p.reportingGroupId}:${p.fromMonth}:${p.offset || 0}`,
      cacheTtl: 1800, // 30 minutes
      progress: cpCodes.length > 100,
      progressMessage: 'Fetching CP code usage data...'
    }
  );
}

/**
 * List invoices - Enhanced implementation
 */
export async function listInvoices(args: z.infer<typeof BillingToolSchemas.listInvoices>): Promise<MCPToolResponse> {
  return billingTool.execute(
    'billing_list_invoices',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.startDate) queryParams.startDate = args.startDate;
      if (args.endDate) queryParams.endDate = args.endDate;
      if (args.status) queryParams.status = args.status;
      if (args.currency) queryParams.currency = args.currency;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        method: 'GET',
        path: BillingEndpoints.listInvoices(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const invoices = response.invoices || [];
        
        let text = `💳 **Invoice List**\n\n`;
        
        if (invoices.length > 0) {
          text += `**Invoices** (${invoices.length} total):\n`;
          invoices.forEach((invoice: any, index: number) => {
            text += `${index + 1}. **Invoice ${invoice.invoiceId}**\n`;
            text += `   • Date: ${invoice.invoiceDate}\n`;
            text += `   • Amount: ${formatCurrency(invoice.amount, invoice.currency)}\n`;
            text += `   • Status: ${invoice.status}\n`;
            
            if (invoice.dueDate) {
              text += `   • Due: ${invoice.dueDate}\n`;
            }
            
            if (invoice.paidDate) {
              text += `   • Paid: ${invoice.paidDate}\n`;
            }
            
            text += `\n`;
          });
          
          if (response.nextOffset) {
            text += `_More invoices available. Use offset: ${response.nextOffset} to see next page._\n`;
          }
        } else {
          text += '⚠️ No invoices found for the specified criteria.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `billing:invoices:${p.startDate || 'all'}:${p.endDate || 'all'}:${p.status || 'all'}:${p.offset || 0}`,
      cacheTtl: 300 // 5 minutes - invoices change less frequently
    }
  );
}

/**
 * Export all enhanced billing tools as a collection
 */
export const enhancedBillingTools = {
  usageByProduct,
  usageByContract,
  usageByReportingGroup,
  usageByCpCode,
  listInvoices,
  // Add other billing tools here as they're enhanced
};

/**
 * Create tool definitions for registration
 */
export const billingToolDefinitions = [
  createTool({
    domain: 'billing',
    name: 'billing_usage_by_product',
    description: 'Get monthly usage data by product for a contract',
    inputSchema: BillingToolSchemas.usageByProduct,
    execute: async (client, args) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByProduct(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    options: {
      format: 'text',
      formatter: formatProductUsage,
      cacheKey: (p: any) => `billing:usage:product:${p.contractId}:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600
    }
  }),
  // Add more tool definitions here
];