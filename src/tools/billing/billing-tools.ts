/**
 * Billing Domain Tools
 * 
 * Complete implementation of Akamai Billing API v1 tools
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Production-grade billing operations
 * Approach: Type-safe implementation with comprehensive error handling
 * Implementation: Full API coverage with formatted output
 * 
 * Generated on 2025-07-09T22:49:33.647Z using ALECSCore CLI
 */

import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiClient } from '../../akamai-client';
import { createLogger } from '../../utils/pino-logger';
import { ToolErrorHandler } from '../../utils/error-handler';
import { BillingEndpoints, BillingToolSchemas, formatBytes, formatCurrency, calculatePercentageChange } from './billing-api-implementation';
import type { z } from 'zod';

interface BillingResponse {
  products?: any[];
  contracts?: any[];
  reportingGroups?: any[];
  cpCodes?: any[];
  invoices?: any[];
  estimates?: any[];
  costCenters?: any[];
  nextOffset?: number;
  invoiceId?: string;
  invoiceDate?: string;
  amount?: number;
  currency?: string;
  status?: string;
  dueDate?: string;
  paidDate?: string;
  contractId?: string;
  lineItems?: any[];
  paymentMethod?: string;
  emailNotifications?: boolean;
  thresholdAlerts?: boolean;
  monthlyReports?: boolean;
  notificationEmail?: string;
  thresholdSettings?: any;
  reportSettings?: any;
}

const logger = createLogger('billing-tools');

/**
 * Billing Tools - Complete implementation
 * 
 * Provides all billing operations through a single class
 * following ALECSCore domain patterns
 */
export class BillingTools {
  private client: AkamaiClient;
  private errorHandler: ToolErrorHandler;

  constructor(customer: string = 'default') {
    this.client = new AkamaiClient(customer);
    this.errorHandler = new ToolErrorHandler({
      tool: 'billing',
      operation: 'billing-operation',
      customer
    });
  }

  /**
   * Get usage by product
   */
  async usageByProduct(args: z.infer<typeof BillingToolSchemas.usageByProduct>): Promise<MCPToolResponse> {
    try {
      logger.info({ contractId: args.contractId, fromMonth: args.fromMonth }, 'Getting usage by product');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.usageByProduct(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });

      const products = (response as any).products || [];
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

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get usage by contract
   */
  async usageByContract(args: z.infer<typeof BillingToolSchemas.usageByContract>): Promise<MCPToolResponse> {
    
    try {
      logger.info({ fromMonth: args.fromMonth }, 'Getting usage by contract');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.usageByContract(),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });

      const contracts = (response as any).contracts || [];

      let text = `📊 **Contract Usage Report**\n`;
      text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;

      if (contracts.length > 0) {
        text += `**Contracts** (${contracts.length} total):\n`;
        contracts.forEach((contract: any, index: number) => {
          text += `${index + 1}. **${contract.contractId}** - ${contract.contractTypeName}\n`;
          text += `   • Usage: ${formatBytes(contract.value)}\n`;
          text += `   • Status: ${contract.status || 'Active'}\n`;
          text += `\n`;
        });
      } else {
        text += '⚠️ No contract usage data found for the specified period.\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get usage by reporting group
   */
  async usageByReportingGroup(args: z.infer<typeof BillingToolSchemas.usageByReportingGroup>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ contractId: args.contractId }, 'Getting usage by reporting group');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.usageByReportingGroup(args.contractId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth
        }
      });

      

      const groups = (response as BillingResponse).reportingGroups || [];

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

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get usage by CP code
   */
  async usageByCpCode(args: z.infer<typeof BillingToolSchemas.usageByCpCode>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ contractId: args.contractId, reportingGroupId: args.reportingGroupId }, 'Getting usage by CP code');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.usageByCpCode(args.contractId, args.reportingGroupId),
        queryParams: {
          fromMonth: args.fromMonth,
          toMonth: args.toMonth || args.fromMonth,
          ...(args.limit !== undefined && { limit: args.limit.toString() }),
          ...(args.offset !== undefined && { offset: args.offset.toString() })
        }
      });

      

      const cpCodes = (response as BillingResponse).cpCodes || [];
      const totalValue = cpCodes.reduce((sum: number, cp: any) => sum + (cp.value || 0), 0);

      let text = `📊 **CP Code Usage Report**\n`;
      text += `Contract: ${args.contractId}\n`;
      text += `Reporting Group: ${args.reportingGroupId}\n`;
      text += `Period: ${args.fromMonth}${args.toMonth && args.toMonth !== args.fromMonth ? ` to ${args.toMonth}` : ''}\n\n`;

      if (cpCodes.length > 0) {
        text += `**CP Codes** (${cpCodes.length} total):\n`;
        cpCodes.forEach((cpCode: any, index: number) => {
          const percentage = totalValue > 0 ? ((cpCode.value / totalValue) * 100).toFixed(1) : '0';
          text += `${index + 1}. **CP ${cpCode.cpcode}** - ${cpCode.cpcodeName}\n`;
          text += `   • Product: ${cpCode.productName} (${cpCode.productId})\n`;
          text += `   • Usage: ${formatBytes(cpCode.value)} (${percentage}% of total)\n`;
          text += `\n`;
        });

        text += `**Total Usage**: ${formatBytes(totalValue)}\n`;
        
        if ((response as BillingResponse).nextOffset) {
          text += `\n💡 More results available. Use offset ${(response as BillingResponse).nextOffset} to see next page.\n`;
        }
      } else {
        text += '⚠️ No CP code usage data found for the specified period.\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List invoices
   */
  async listInvoices(args: z.infer<typeof BillingToolSchemas.listInvoices>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ args }, 'Listing invoices');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.invoices(),
        queryParams: {
          ...(args.fromMonth && { fromMonth: args.fromMonth }),
          ...(args.toMonth && { toMonth: args.toMonth }),
          ...(args.status && { status: args.status }),
          ...(args.contractId && { contractId: args.contractId }),
          ...(args.limit !== undefined && { limit: args.limit.toString() }),
          ...(args.offset !== undefined && { offset: args.offset.toString() })
        }
      });

      

      const invoices = (response as BillingResponse).invoices || [];
      const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

      let text = `💰 **Invoices**\n`;
      if (args.fromMonth || args.toMonth) {
        text += `Period: ${args.fromMonth || 'All'} to ${args.toMonth || 'Current'}\n`;
      }
      if (args.status) {
        text += `Status: ${args.status}\n`;
      }
      text += `\n`;

      if (invoices.length > 0) {
        text += `**Found ${invoices.length} invoices** (Total: ${formatCurrency(totalAmount)})\n\n`;
        
        invoices.forEach((invoice: any, index: number) => {
          const statusIcon = invoice.status === 'paid' ? '✅' : invoice.status === 'overdue' ? '🔴' : '⏳';
          text += `${index + 1}. ${statusIcon} **Invoice ${invoice.invoiceId}**\n`;
          text += `   • Date: ${invoice.invoiceDate}\n`;
          text += `   • Amount: ${formatCurrency(invoice.amount, invoice.currency)}\n`;
          text += `   • Status: ${invoice.status}\n`;
          if (invoice.dueDate) {
            text += `   • Due Date: ${invoice.dueDate}\n`;
          }
          if (invoice.contractId) {
            text += `   • Contract: ${invoice.contractId}\n`;
          }
          text += `\n`;
        });

        if ((response as BillingResponse).nextOffset) {
          text += `💡 More invoices available. Use offset ${(response as BillingResponse).nextOffset} to see next page.\n`;
        }
      } else {
        text += '⚠️ No invoices found for the specified criteria.\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get invoice details
   */
  async getInvoice(args: z.infer<typeof BillingToolSchemas.getInvoice>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ invoiceId: args.invoiceId }, 'Getting invoice details');
      
      const path = args.includeDetails 
        ? BillingEndpoints.invoiceDetails(args.invoiceId)
        : BillingEndpoints.invoice(args.invoiceId);
      
      const response = await this.client.request({
        method: 'GET',
        path
      });

      

      const invoice = response as BillingResponse;

      let text = `💰 **Invoice Details**\n\n`;
      text += `**Invoice ID**: ${invoice.invoiceId}\n`;
      text += `**Date**: ${invoice.invoiceDate}\n`;
      text += `**Amount**: ${formatCurrency(invoice.amount || 0, invoice.currency || 'USD')}\n`;
      text += `**Status**: ${invoice.status}\n`;
      
      if (invoice.dueDate) {
        text += `**Due Date**: ${invoice.dueDate}\n`;
      }
      
      if (invoice.paidDate) {
        text += `**Paid Date**: ${invoice.paidDate}\n`;
      }
      
      if (invoice.contractId) {
        text += `**Contract**: ${invoice.contractId}\n`;
      }

      // Line items if included
      if (invoice.lineItems && invoice.lineItems.length > 0) {
        text += `\n**Line Items**:\n`;
        invoice.lineItems.forEach((item: any, index: number) => {
          text += `${index + 1}. ${item.description}\n`;
          text += `   • Product: ${item.productName}\n`;
          text += `   • Amount: ${formatCurrency(item.amount, invoice.currency)}\n`;
          text += `   • Usage: ${item.usage ? formatBytes(item.usage) : 'N/A'}\n`;
          text += `\n`;
        });
      }

      // Payment information
      if (invoice.paymentMethod) {
        text += `\n**Payment Method**: ${invoice.paymentMethod}\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get cost estimates
   */
  async getEstimates(args: z.infer<typeof BillingToolSchemas.getEstimates>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ args }, 'Getting cost estimates');
      
      const path = args.contractId 
        ? BillingEndpoints.estimate(args.contractId)
        : BillingEndpoints.estimates();
      
      const response = await this.client.request({
        method: 'GET',
        path,
        queryParams: args.month ? { month: args.month } : undefined
      });

      

      const estimates = Array.isArray(response) ? response : (response as BillingResponse).estimates || [response];

      let text = `💸 **Cost Estimates**\n`;
      if (args.month) {
        text += `Month: ${args.month}\n`;
      }
      text += `\n`;

      if (estimates.length > 0) {
        estimates.forEach((estimate: any, index: number) => {
          text += `${index + 1}. **${estimate.month || 'Current Month'}**\n`;
          text += `   • Estimated Amount: ${formatCurrency(estimate.estimatedAmount, estimate.currency)}\n`;
          if (estimate.contractId) {
            text += `   • Contract: ${estimate.contractId}\n`;
          }
          if (estimate.confidence) {
            text += `   • Confidence: ${estimate.confidence}%\n`;
          }
          if (estimate.lastUpdated) {
            text += `   • Last Updated: ${estimate.lastUpdated}\n`;
          }
          
          // Breakdown if available
          if (estimate.breakdown) {
            text += `   • Breakdown:\n`;
            Object.entries(estimate.breakdown).forEach(([product, amount]) => {
              text += `     - ${product}: ${formatCurrency(amount as number, estimate.currency)}\n`;
            });
          }
          
          text += `\n`;
        });
      } else {
        text += '⚠️ No cost estimates available.\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List cost centers
   */
  async listCostCenters(args: z.infer<typeof BillingToolSchemas.listCostCenters>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ args }, 'Listing cost centers');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.costCenters(),
        queryParams: {
          ...(args.limit !== undefined && { limit: args.limit.toString() }),
          ...(args.offset !== undefined && { offset: args.offset.toString() })
        }
      });

      

      const costCenters = (response as BillingResponse).costCenters || [];

      let text = `🏢 **Cost Centers**\n\n`;

      if (costCenters.length > 0) {
        text += `**Found ${costCenters.length} cost centers**\n\n`;
        
        costCenters.forEach((center: any, index: number) => {
          text += `${index + 1}. **${center.name}** (${center.costCenterId})\n`;
          if (center.description) {
            text += `   • Description: ${center.description}\n`;
          }
          text += `   • Contracts: ${center.contractCount || 0}\n`;
          if (center.monthlyBudget) {
            text += `   • Monthly Budget: ${formatCurrency(center.monthlyBudget, center.currency)}\n`;
          }
          if (center.currentSpend) {
            text += `   • Current Spend: ${formatCurrency(center.currentSpend, center.currency)}\n`;
          }
          text += `\n`;
        });

        if ((response as BillingResponse).nextOffset) {
          text += `💡 More cost centers available. Use offset ${(response as BillingResponse).nextOffset} to see next page.\n`;
        }
      } else {
        text += '⚠️ No cost centers configured.\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(_args: z.infer<typeof BillingToolSchemas.getNotificationPreferences>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info('Getting notification preferences');
      
      const response = await this.client.request({
        method: 'GET',
        path: BillingEndpoints.notificationPreferences()
      });

      

      const prefs = response as BillingResponse;

      let text = `🔔 **Billing Notification Preferences**\n\n`;
      
      text += `**Email Notifications**: ${prefs.emailNotifications ? '✅ Enabled' : '❌ Disabled'}\n`;
      text += `**Threshold Alerts**: ${prefs.thresholdAlerts ? '✅ Enabled' : '❌ Disabled'}\n`;
      text += `**Monthly Reports**: ${prefs.monthlyReports ? '✅ Enabled' : '❌ Disabled'}\n`;
      
      if (prefs.notificationEmail) {
        text += `**Notification Email**: ${prefs.notificationEmail}\n`;
      }
      
      if (prefs.thresholdSettings) {
        text += `\n**Threshold Settings**:\n`;
        if (prefs.thresholdSettings.amount) {
          text += `• Alert when spending exceeds: ${formatCurrency(prefs.thresholdSettings.amount, prefs.thresholdSettings.currency)}\n`;
        }
        if (prefs.thresholdSettings.percentage) {
          text += `• Alert when usage increases by: ${prefs.thresholdSettings.percentage}%\n`;
        }
      }
      
      if (prefs.reportSettings) {
        text += `\n**Report Settings**:\n`;
        text += `• Frequency: ${prefs.reportSettings.frequency || 'Monthly'}\n`;
        text += `• Format: ${prefs.reportSettings.format || 'PDF'}\n`;
        if (prefs.reportSettings.includeDetails) {
          text += `• Include detailed breakdown: ✅\n`;
        }
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(args: z.infer<typeof BillingToolSchemas.updateNotificationPreferences>): Promise<MCPToolResponse> {
    
    
    try {
      logger.info({ args }, 'Updating notification preferences');
      
      const updates: any = {};
      if (args.emailNotifications !== undefined) updates.emailNotifications = args.emailNotifications;
      if (args.thresholdAlerts !== undefined) updates.thresholdAlerts = args.thresholdAlerts;
      if (args.monthlyReports !== undefined) updates.monthlyReports = args.monthlyReports;
      if (args.notificationEmail) updates.notificationEmail = args.notificationEmail;
      
      await this.client.request({
        method: 'PUT',
        path: BillingEndpoints.notificationPreferences(),
        body: updates
      });

      

      let text = `✅ **Notification Preferences Updated**\n\n`;
      
      if (args.emailNotifications !== undefined) {
        text += `• Email Notifications: ${args.emailNotifications ? '✅ Enabled' : '❌ Disabled'}\n`;
      }
      if (args.thresholdAlerts !== undefined) {
        text += `• Threshold Alerts: ${args.thresholdAlerts ? '✅ Enabled' : '❌ Disabled'}\n`;
      }
      if (args.monthlyReports !== undefined) {
        text += `• Monthly Reports: ${args.monthlyReports ? '✅ Enabled' : '❌ Disabled'}\n`;
      }
      if (args.notificationEmail) {
        text += `• Notification Email: ${args.notificationEmail}\n`;
      }
      
      text += `\n💡 Changes will take effect immediately.`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async usageByProductOperation(args: any): Promise<MCPToolResponse> {
    return this.usageByProduct(args);
  }
}

/**
 * Create billing tools instance
 */
export const billingTools = new BillingTools();