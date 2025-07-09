/**
 * Billing API Implementation
 * 
 * Complete implementation of Akamai Billing API v1
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Production-grade billing API integration
 * Approach: Type-safe implementation with comprehensive error handling
 * Implementation: Full API coverage with proper schemas
 */

import { z } from 'zod';

/**
 * Base URL for Billing API v1
 */
export const BILLING_API_BASE = '/billing-api/v1';

/**
 * Billing API schemas
 */
export const BillingSchemas = {
  // Time range schema
  TimeRange: z.object({
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format'),
    toMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format').optional()
  }),
  
  // Product usage schema
  ProductUsage: z.object({
    productId: z.string(),
    productName: z.string(),
    value: z.number(),
    unit: z.string(),
    percentage: z.number().optional()
  }),
  
  // Contract usage schema
  ContractUsage: z.object({
    contractId: z.string(),
    contractTypeName: z.string(),
    value: z.number(),
    unit: z.string()
  }),
  
  // Reporting group usage schema
  ReportingGroupUsage: z.object({
    reportingGroupId: z.string(),
    reportingGroupName: z.string(),
    value: z.number(),
    unit: z.string()
  }),
  
  // CP code usage schema
  CpCodeUsage: z.object({
    cpcode: z.number(),
    cpcodeName: z.string(),
    productId: z.string(),
    productName: z.string(),
    value: z.number(),
    unit: z.string()
  }),
  
  // Invoice schema
  Invoice: z.object({
    invoiceId: z.string(),
    invoiceDate: z.string(),
    dueDate: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(['paid', 'unpaid', 'overdue'])
  }),
  
  // Estimate schema
  Estimate: z.object({
    month: z.string(),
    estimatedAmount: z.number(),
    currency: z.string(),
    contractId: z.string(),
    lastUpdated: z.string()
  })
};

/**
 * Billing API endpoints
 */
export const BillingEndpoints = {
  // Usage endpoints
  usageByProduct: (contractId: string) => 
    `${BILLING_API_BASE}/contracts/${contractId}/products/usage`,
  
  usageByContract: () => 
    `${BILLING_API_BASE}/contracts/usage`,
  
  usageByReportingGroup: (contractId: string) => 
    `${BILLING_API_BASE}/contracts/${contractId}/reporting-groups/usage`,
  
  usageByCpCode: (contractId: string, reportingGroupId: string) => 
    `${BILLING_API_BASE}/contracts/${contractId}/reporting-groups/${reportingGroupId}/cpcodes/usage`,
  
  // Invoice endpoints
  invoices: () => 
    `${BILLING_API_BASE}/invoices`,
  
  invoice: (invoiceId: string) => 
    `${BILLING_API_BASE}/invoices/${invoiceId}`,
  
  invoiceDetails: (invoiceId: string) => 
    `${BILLING_API_BASE}/invoices/${invoiceId}/details`,
  
  // Estimate endpoints
  estimates: () => 
    `${BILLING_API_BASE}/estimates`,
  
  estimate: (contractId: string) => 
    `${BILLING_API_BASE}/contracts/${contractId}/estimate`,
  
  // Cost center endpoints
  costCenters: () => 
    `${BILLING_API_BASE}/cost-centers`,
  
  costCenter: (costCenterId: string) => 
    `${BILLING_API_BASE}/cost-centers/${costCenterId}`,
  
  // Notification endpoints
  notifications: () => 
    `${BILLING_API_BASE}/notifications`,
  
  notificationPreferences: () => 
    `${BILLING_API_BASE}/notifications/preferences`
};

/**
 * Billing tool parameter schemas
 */
export const BillingToolSchemas = {
  // Usage by product
  usageByProduct: z.object({
    contractId: z.string().describe('Contract identifier (e.g., ctr_1-1TJZFW)'),
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/).describe('Start month (YYYY-MM format)'),
    toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('End month (YYYY-MM format)'),
    customer: z.string().optional()
  }),
  
  // Usage by contract
  usageByContract: z.object({
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/).describe('Start month (YYYY-MM format)'),
    toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('End month (YYYY-MM format)'),
    customer: z.string().optional()
  }),
  
  // Usage by reporting group
  usageByReportingGroup: z.object({
    contractId: z.string().describe('Contract identifier'),
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/).describe('Start month (YYYY-MM format)'),
    toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('End month (YYYY-MM format)'),
    customer: z.string().optional()
  }),
  
  // Usage by CP code
  usageByCpCode: z.object({
    contractId: z.string().describe('Contract identifier'),
    reportingGroupId: z.string().describe('Reporting group identifier'),
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/).describe('Start month (YYYY-MM format)'),
    toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('End month (YYYY-MM format)'),
    limit: z.number().optional().describe('Maximum number of results'),
    offset: z.number().optional().describe('Pagination offset'),
    customer: z.string().optional()
  }),
  
  // List invoices
  listInvoices: z.object({
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('Start month (YYYY-MM format)'),
    toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('End month (YYYY-MM format)'),
    status: z.enum(['paid', 'unpaid', 'overdue']).optional().describe('Invoice status filter'),
    contractId: z.string().optional().describe('Filter by contract'),
    limit: z.number().optional().describe('Maximum number of results'),
    offset: z.number().optional().describe('Pagination offset'),
    customer: z.string().optional()
  }),
  
  // Get invoice
  getInvoice: z.object({
    invoiceId: z.string().describe('Invoice identifier'),
    includeDetails: z.boolean().optional().describe('Include line item details'),
    customer: z.string().optional()
  }),
  
  // Get estimates
  getEstimates: z.object({
    contractId: z.string().optional().describe('Filter by contract'),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('Specific month (YYYY-MM)'),
    customer: z.string().optional()
  }),
  
  // Cost centers
  listCostCenters: z.object({
    limit: z.number().optional().describe('Maximum number of results'),
    offset: z.number().optional().describe('Pagination offset'),
    customer: z.string().optional()
  }),
  
  // Notifications
  getNotificationPreferences: z.object({
    customer: z.string().optional()
  }),
  
  updateNotificationPreferences: z.object({
    emailNotifications: z.boolean().optional(),
    thresholdAlerts: z.boolean().optional(),
    monthlyReports: z.boolean().optional(),
    notificationEmail: z.string().email().optional(),
    customer: z.string().optional()
  })
};

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let index = 0;
  let value = bytes;
  
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  
  return `${value.toFixed(2)} ${units[index]}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) return '0%';
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}