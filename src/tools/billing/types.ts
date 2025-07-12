
// Response type definitions for billing
export interface BillingUsageResponse {
  products?: Array<{
    productId: string;
    productName: string;
    value: number;
    unit: string;
  }>;
  contracts?: Array<{
    contractId: string;
    contractTypeName: string;
    value: number;
    unit: string;
  }>;
  reportingGroups?: Array<{
    reportingGroupId: string;
    reportingGroupName: string;
    value: number;
    unit: string;
  }>;
  cpcodes?: Array<{
    cpcode: number;
    cpcodeName: string;
    productId: string;
    productName: string;
    value: number;
    unit: string;
  }>;
}

export interface InvoiceResponse {
  invoices: Array<{
    invoiceId: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    currency: string;
    status: 'paid' | 'unpaid' | 'overdue';
  }>;
  totalCount: number;
}

export interface EstimateResponse {
  estimates: Array<{
    month: string;
    estimatedAmount: number;
    currency: string;
    contractId: string;
    contractTypeName: string;
  }>;
}

export interface CostCenterResponse {
  costCenters: Array<{
    id: string;
    name: string;
    description?: string;
    allocatedBudget?: number;
    currentSpend?: number;
    remainingBudget?: number;
  }>;
}

export interface NotificationPreferencesResponse {
  notifications: {
    enabledNotifications: string[];
    notificationEmail: string;
    dailyReports: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    thresholdAlerts: boolean;
    thresholds?: Array<{
      type: string;
      value: number;
      unit: string;
    }>;
  };
}
