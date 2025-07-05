/**
 * Customer Validation Middleware
 * Ensures proper customer isolation and access control
 */

import { CustomerConfigManager } from '../services/customer-config-manager';
import { UnauthorizedError, ForbiddenError } from '../errors/auth-errors';

export interface RequestContext {
  user?: string;
  customer?: string;
  accountSwitchKey?: string;
}

/**
 * Centralized customer validation middleware
 */
export class CustomerValidator {
  private configManager: CustomerConfigManager;
  
  constructor(configManager: CustomerConfigManager) {
    this.configManager = configManager;
  }
  
  /**
   * Validate customer access for a request
   */
  async validateCustomerAccess(customer: string, context: RequestContext): Promise<void> {
    // Check if customer exists
    if (!this.isValidCustomer(customer)) {
      throw new UnauthorizedError(`Invalid customer: ${customer}`, {
        type: 'INVALID_CUSTOMER',
        title: 'Invalid Customer',
        detail: `Customer '${customer}' does not exist`,
        status: 401,
      });
    }
    
    // Check if user has access to customer
    if (!this.hasAccessToCustomer(context, customer)) {
      throw new ForbiddenError(`Access denied to customer: ${customer}`, {
        type: 'CUSTOMER_ACCESS_DENIED',
        title: 'Customer Access Denied',
        detail: `You do not have access to customer '${customer}'`,
        status: 403,
      });
    }
  }
  
  /**
   * Check if customer exists in configuration
   */
  private isValidCustomer(customer: string): boolean {
    try {
      this.configManager.getConfig(customer);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if context has access to customer
   */
  private hasAccessToCustomer(context: RequestContext, customer: string): boolean {
    // If no customer context is set, allow access to default
    if (!context.customer && customer === 'default') {
      return true;
    }
    
    // Check if context customer matches requested customer
    if (context.customer && context.customer !== customer) {
      return false;
    }
    
    // Check account switch key if provided
    if (context.accountSwitchKey) {
      const config = this.configManager.getConfig(customer);
      return config.accountSwitchKey === context.accountSwitchKey;
    }
    
    return true;
  }
  
  /**
   * Create a validation wrapper for tool handlers
   */
  static createValidationWrapper(validator: CustomerValidator) {
    return function validateCustomerTool<T extends (...args: any[]) => any>(
      handler: T
    ): T {
      return (async (...args: Parameters<T>) => {
        const [client, params] = args;
        
        // Extract customer from params
        const customer = params?.customer || 'default';
        
        // Validate customer access
        await validator.validateCustomerAccess(customer, {
          customer: client.config?.customer,
          accountSwitchKey: client.config?.accountSwitchKey,
        });
        
        return handler(...args);
      }) as T;
    };
  }
}

/**
 * Singleton instance
 */
let validatorInstance: CustomerValidator | null = null;

/**
 * Get or create customer validator instance
 */
export function getCustomerValidator(configManager: CustomerConfigManager): CustomerValidator {
  if (!validatorInstance) {
    validatorInstance = new CustomerValidator(configManager);
  }
  return validatorInstance;
}