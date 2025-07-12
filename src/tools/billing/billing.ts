/**
 * Billing Domain Tools
 * 
 * Complete implementation of Akamai Billing API v1 tools
 * Now using the enhanced AkamaiOperation pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Generated on 2025-07-09T22:49:33.647Z using ALECSCore CLI
 * Enhanced on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { BillingEndpoints, BillingToolSchemas, BillingResponseSchemas, BillingSchemas, formatBytes, formatCurrency } from './api';
import type { z } from 'zod';

/**
 * Format product usage response
 */
function formatProductUsage(
  response: z.infer<typeof BillingResponseSchemas.ProductUsageResponse>, 
  args: z.infer<typeof BillingToolSchemas.usageByProduct>
): string {
  const products = response.products || [];
  const totalValue = products.reduce((sum: number, p) => sum + (p.value || 0), 0);

  let text = `📊 **Product Usage Report**\n`;
  text += `Contract: ${args.contractId}\n`;
  text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;

  if (products.length > 0) {
    text += `**Products** (${products.length} total):\n`;
    products.forEach((product, index: number) => {
      const percentage = totalValue > 0 ? ((product.value / totalValue) * 100).toFixed(1) : '0';
      text += `${index + 1}. **${product.productName}** (${product.productId})\n`;
      text += `   • Usage: ${formatBytes(product.value)} (${percentage}% of total)\n`;
      if (product.percentage) {
        text += `   • API Percentage: ${product.percentage}%\n`;
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
 * Get usage by product
 */
async function usageByProduct(args: z.infer<typeof BillingToolSchemas.usageByProduct>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_usage_by_product',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByProduct(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth || '',
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    {
      format: 'text',
      formatter: (data: z.infer<typeof BillingResponseSchemas.ProductUsageResponse>) => formatProductUsage(data, args),
      cacheKey: (p) => `usage:product:${p.contractId}:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600 // 1 hour
    }
  );
}

/**
 * Get usage by contract
 */
async function usageByContract(args: z.infer<typeof BillingToolSchemas.usageByContract>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_usage_by_contract',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByContract(),
        queryParams: {
          fromMonth: args.fromMonth || '',
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        const contracts = (response as { contracts: any }).contracts || [];
        
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
      cacheKey: (p) => `usage:contract:all:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600
    }
  );
}

/**
 * Get usage by reporting group
 */
async function usageByReportingGroup(args: z.infer<typeof BillingToolSchemas.usageByReportingGroup>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_usage_by_reporting_group',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByReportingGroup(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth || '',
          toMonth: args.toMonth || args.fromMonth
        }
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        const groups = (response as { reportingGroups: any }).reportingGroups || [];
        
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
      cacheKey: (p) => `usage:group:${p.contractId}:${p.fromMonth}:${p.toMonth || p.fromMonth}`,
      cacheTtl: 3600
    }
  );
}

/**
 * Get usage by CP code
 */
async function usageByCpCode(args: z.infer<typeof BillingToolSchemas.usageByCpCode>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_usage_by_cpcode',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.usageByCpCode(args.contractId, args.reportingGroupId),
        queryParams: {
          fromMonth: args.fromMonth || '',
          toMonth: args.toMonth || args.fromMonth,
          ...(args.limit && { limit: args.limit.toString() }),
          ...(args.offset && { offset: args.offset.toString() })
        }
      });
    },
    {
      format: 'text',
      formatter: (response: z.infer<typeof BillingResponseSchemas.CpCodeUsageResponse>) => {
        const cpCodes = response.cpcodes || [];
        const totalValue = cpCodes.reduce((sum: number, cp) => sum + (cp.value || 0), 0);
        
        let text = `📊 **CP Code Usage Report**\n`;
        text += `Contract: ${args.contractId}\n`;
        text += `Reporting Group: ${args.reportingGroupId}\n`;
        text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;
        
        if (cpCodes.length > 0) {
          text += `**CP Codes** (${cpCodes.length} total):\n`;
          
          // Sort by usage descending
          const sortedCodes = [...cpCodes].sort((a, b) => (b.value || 0) - (a.value || 0));
          
          // Show top 10
          const topCodes = sortedCodes.slice(0, 10);
          topCodes.forEach((cp, index: number) => {
            const percentage = totalValue > 0 ? ((cp.value / totalValue) * 100).toFixed(1) : '0';
            text += `${index + 1}. **${cp.cpcodeName || `CP ${cp.cpcode}`}** (${cp.cpcode})\n`;
            text += `   • Usage: ${formatBytes(cp.value)} (${percentage}% of total)\n`;
            text += `   • Product: ${cp.productName || 'N/A'}\n`;
            text += `\n`;
          });
          
          if (cpCodes.length > 10) {
            text += `_... and ${cpCodes.length - 10} more CP codes_\n\n`;
          }
          
          text += `**Total Usage**: ${formatBytes(totalValue)}\n`;
          
          if ((response as any).nextOffset) {
            text += `\n_More results available. Use offset: ${(response as any).nextOffset} to see next page._\n`;
          }
        } else {
          text += '⚠️ No CP code usage data found for the specified period.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `usage:cpcode:${p.contractId}:${p.reportingGroupId}:${p.fromMonth}:${p.offset || 0}`,
      cacheTtl: 1800, // 30 minutes
      progress: true,
      progressMessage: 'Fetching CP code usage data...'
    }
  );
}

/**
 * List invoices
 */
async function listInvoices(args: z.infer<typeof BillingToolSchemas.listInvoices>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_list_invoices',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.fromMonth) queryParams.fromMonth = args.fromMonth;
      if (args.toMonth) queryParams.toMonth = args.toMonth;
      if (args.status) queryParams.status = args.status;
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        method: 'GET',
        path: BillingEndpoints.invoices(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (response: z.infer<typeof BillingResponseSchemas.InvoiceListResponse>) => {
        const invoices = response.invoices || [];
        
        let text = `💳 **Invoice List**\n\n`;
        
        if (invoices.length > 0) {
          text += `**Invoices** (${invoices.length} total):\n`;
          invoices.forEach((invoice, index: number) => {
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
          
          if ((response as any).nextOffset) {
            text += `_More invoices available. Use offset: ${(response as any).nextOffset} to see next page._\n`;
          }
        } else {
          text += '⚠️ No invoices found for the specified criteria.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `invoices:${p.fromMonth || 'all'}:${p.toMonth || 'all'}:${p.status || 'all'}:${p.offset || 0}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get invoice details
 */
async function getInvoice(args: z.infer<typeof BillingToolSchemas.getInvoice>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_get_invoice',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.invoice(args.invoiceId),
        queryParams: args.includeDetails ? { includeDetails: 'true' } : {}
      });
    },
    {
      format: 'text',
      formatter: (invoice: z.infer<typeof BillingSchemas.Invoice>) => {
        let text = `💳 **Invoice Details**\n\n`;
        
        text += `**Invoice ID:** ${invoice.invoiceId}\n`;
        text += `**Date:** ${invoice.invoiceDate}\n`;
        text += `**Amount:** ${formatCurrency(invoice.amount, invoice.currency)}\n`;
        text += `**Status:** ${invoice.status}\n`;
        
        if (invoice.dueDate) {
          text += `**Due Date:** ${invoice.dueDate}\n`;
        }
        
        if (invoice.paidDate) {
          text += `**Paid Date:** ${invoice.paidDate}\n`;
        }
        
        if (invoice.contractId) {
          text += `**Contract:** ${invoice.contractId}\n`;
        }
        
        // Line items
        if (invoice.lineItems && invoice.lineItems.length > 0) {
          text += `\n**Line Items:**\n`;
          invoice.lineItems.forEach((item, index: number) => {
            text += `${index + 1}. ${item.description}\n`;
            text += `   • Amount: ${formatCurrency(item.amount, item.currency)}\n`;
            if (item.period) {
              text += `   • Period: ${item.period}\n`;
            }
            if (item.usage) {
              text += `   • Usage: ${formatBytes(item.usage)}\n`;
            }
            text += `\n`;
          });
        }
        
        // Payment information
        if ((invoice as any).paymentMethod) {
          text += `\n**Payment Method:** ${(invoice as any).paymentMethod}\n`;
        }
        
        return text;
      },
      cacheKey: (p) => `invoice:${p.invoiceId}:${p.includeDetails ? 'detailed' : 'summary'}`,
      cacheTtl: 3600 // 1 hour - invoices don't change often
    }
  );
}

/**
 * Get cost estimates
 */
async function getEstimates(args: z.infer<typeof BillingToolSchemas.getEstimates>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_get_estimates',
    args,
    async (client) => {
      const queryParams: any = {};
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.month) queryParams.month = args.month;
      
      return client.request({
        method: 'GET',
        path: BillingEndpoints.estimates(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        const estimates = (response as { estimates: any }).estimates || [];
        
        let text = `💰 **Cost Estimates**\n\n`;
        
        if (args.month) {
          text += `**Month:** ${args.month}\n\n`;
        } else {
          text += `**Month:** Current month\n\n`;
        }
        
        if (estimates.length > 0) {
          text += `**Estimates:**\n`;
          estimates.forEach((estimate: any, index: number) => {
            text += `${index + 1}. **${estimate.contractId}**\n`;
            text += `   • Estimated Cost: ${formatCurrency(estimate.estimatedAmount, estimate.currency)}\n`;
            text += `   • Usage to Date: ${formatCurrency(estimate.usageToDate, estimate.currency)}\n`;
            text += `   • Projected Total: ${formatCurrency(estimate.projectedTotal, estimate.currency)}\n`;
            
            if (estimate.percentageChange) {
              text += `   • Change from Last Month: ${estimate.percentageChange}%\n`;
            }
            
            // Top products
            if (estimate.topProducts && estimate.topProducts.length > 0) {
              text += `   • Top Products:\n`;
              estimate.topProducts.slice(0, 3).forEach((product: any) => {
                text += `     - ${product.productName}: ${formatCurrency(product.amount, estimate.currency)}\n`;
              });
            }
            
            text += `\n`;
          });
        } else {
          text += '⚠️ No cost estimates available.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `estimates:${p.contractId || 'all'}:${p.month || 'current'}`,
      cacheTtl: 1800 // 30 minutes
    }
  );
}

/**
 * List cost centers
 */
async function listCostCenters(args: z.infer<typeof BillingToolSchemas.listCostCenters>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_list_cost_centers',
    args,
    async (client) => {
      const queryParams: any = {};
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        method: 'GET',
        path: BillingEndpoints.costCenters(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        const costCenters = (response as { costCenters: any }).costCenters || [];
        
        let text = `🏢 **Cost Centers**\n\n`;
        
        if (costCenters.length > 0) {
          text += `**Cost Centers** (${costCenters.length} total):\n`;
          costCenters.forEach((center: any, index: number) => {
            text += `${index + 1}. **${center.name}** (${center.id})\n`;
            text += `   • Description: ${center.description || 'N/A'}\n`;
            text += `   • Contracts: ${center.contractCount || 0}\n`;
            
            if (center.budget) {
              text += `   • Budget: ${formatCurrency(center.budget, center.currency)}\n`;
              text += `   • Used: ${formatCurrency(center.used || 0, center.currency)} (${center.percentageUsed || 0}%)\n`;
            }
            
            text += `\n`;
          });
          
          if ((response as any).nextOffset) {
            text += `_More cost centers available. Use offset: ${(response as any).nextOffset} to see next page._\n`;
          }
        } else {
          text += '⚠️ No cost centers configured.\n';
        }
        
        return text;
      },
      cacheKey: (p) => `costcenters:${p.offset || 0}`,
      cacheTtl: 3600 // 1 hour
    }
  );
}

/**
 * Get notification preferences
 */
async function getNotificationPreferences(args: z.infer<typeof BillingToolSchemas.getNotificationPreferences>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_get_notification_preferences',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: BillingEndpoints.notificationPreferences()
      });
    },
    {
      format: 'text',
      formatter: (prefs: z.infer<typeof BillingSchemas.NotificationPreferences>) => {
        let text = `🔔 **Billing Notification Preferences**\n\n`;
        
        text += `**Email Notifications:** ${prefs.emailNotifications ? '✅ Enabled' : '❌ Disabled'}\n`;
        
        if (prefs.notificationEmail) {
          text += `**Notification Email:** ${prefs.notificationEmail}\n`;
        }
        
        text += `\n**Alert Types:**\n`;
        text += `• Invoice Available: ${prefs.invoiceAlerts ? '✅' : '❌'}\n`;
        text += `• Payment Due: ${prefs.paymentDueAlerts ? '✅' : '❌'}\n`;
        text += `• Payment Received: ${prefs.paymentReceivedAlerts ? '✅' : '❌'}\n`;
        text += `• Threshold Alerts: ${prefs.thresholdAlerts ? '✅' : '❌'}\n`;
        
        if (prefs.thresholdAlerts && prefs.thresholdSettings) {
          text += `\n**Threshold Settings:**\n`;
          text += `• Amount: ${formatCurrency(prefs.thresholdSettings.amount, prefs.thresholdSettings.currency)}\n`;
          text += `• Type: ${prefs.thresholdSettings.type}\n`;
        }
        
        text += `\n**Reports:**\n`;
        text += `• Monthly Reports: ${prefs.monthlyReports ? '✅' : '❌'}\n`;
        
        if (prefs.monthlyReports && prefs.reportSettings) {
          text += `• Report Day: ${prefs.reportSettings.dayOfMonth}\n`;
          if (prefs.reportSettings.includeDetails) {
            text += `• Include detailed breakdown: ✅\n`;
          }
        }
        
        return text;
      },
      cacheKey: 'notifications:preferences',
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Update notification preferences
 */
async function updateNotificationPreferences(args: z.infer<typeof BillingToolSchemas.updateNotificationPreferences>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'billing',
    'billing_update_notification_preferences',
    args,
    async (client) => {
      const body: any = {};
      
      if (args.emailNotifications !== undefined) {
        body.emailNotifications = args.emailNotifications;
      }
      if (args.thresholdAlerts !== undefined) {
        body.thresholdAlerts = args.thresholdAlerts;
      }
      if (args.monthlyReports !== undefined) {
        body.monthlyReports = args.monthlyReports;
      }
      if (args.notificationEmail) {
        body.notificationEmail = args.notificationEmail;
      }
      
      return client.request({
        method: 'PUT',
        path: BillingEndpoints.notificationPreferences(),
        body
      });
    },
    {
      format: 'text',
      formatter: () => {
        let text = `✅ **Notification Preferences Updated**\n\n`;
        
        if (args.emailNotifications !== undefined) {
          text += `• Email Notifications: ${args.emailNotifications ? 'Enabled' : 'Disabled'}\n`;
        }
        if (args.thresholdAlerts !== undefined) {
          text += `• Threshold Alerts: ${args.thresholdAlerts ? 'Enabled' : 'Disabled'}\n`;
        }
        if (args.monthlyReports !== undefined) {
          text += `• Monthly Reports: ${args.monthlyReports ? 'Enabled' : 'Disabled'}\n`;
        }
        if (args.notificationEmail) {
          text += `• Notification Email: ${args.notificationEmail}\n`;
        }
        
        text += `\n💡 Changes will take effect immediately.`;
        
        return text;
      }
    }
  );
}

/**
 * Billing Tools Class - for backward compatibility
 */
export class BillingTools {
  async usageByProduct(args: any): Promise<MCPToolResponse> {
    return usageByProduct(args);
  }
  
  async usageByContract(args: any): Promise<MCPToolResponse> {
    return usageByContract(args);
  }
  
  async usageByReportingGroup(args: any): Promise<MCPToolResponse> {
    return usageByReportingGroup(args);
  }
  
  async usageByCpCode(args: any): Promise<MCPToolResponse> {
    return usageByCpCode(args);
  }
  
  async listInvoices(args: any): Promise<MCPToolResponse> {
    return listInvoices(args);
  }
  
  async getInvoice(args: any): Promise<MCPToolResponse> {
    return getInvoice(args);
  }
  
  async getEstimates(args: any): Promise<MCPToolResponse> {
    return getEstimates(args);
  }
  
  async listCostCenters(args: any): Promise<MCPToolResponse> {
    return listCostCenters(args);
  }
  
  async getNotificationPreferences(args: any): Promise<MCPToolResponse> {
    return getNotificationPreferences(args);
  }
  
  async updateNotificationPreferences(args: any): Promise<MCPToolResponse> {
    return updateNotificationPreferences(args);
  }
}

/**
 * Export instance for backward compatibility
 */
export const billingTools = new BillingTools();

/**
 * Export individual functions for direct use
 */
export {
  usageByProduct,
  usageByContract,
  usageByReportingGroup,
  usageByCpCode,
  listInvoices,
  getInvoice,
  getEstimates,
  listCostCenters,
  getNotificationPreferences,
  updateNotificationPreferences
};