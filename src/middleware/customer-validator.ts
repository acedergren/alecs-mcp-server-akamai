/**
 * Customer Validation Middleware
 * Ensures proper customer isolation and access control
 */

import { CustomerConfigManager } from '../services/customer-config-manager';
import { UnauthorizedError, ForbiddenError } from '../core/errors/error-handler';

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
      throw new UnauthorizedError(`Invalid customer: ${customer}`);
    }
    
    // Check if user has access to customer
    if (!this.hasAccessToCustomer(context, customer)) {
      throw new ForbiddenError(`Access denied to customer: ${customer}`);
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
      return config.account_switch_key === context.accountSwitchKey;
    }
    
    return true;
  }
  
  /**
   * Create a validation wrapper for tool handlers
   */
  static createValidationWrapper(validator: CustomerValidator) {
    return function validateCustomerTool<T extends (...args: unknown[]) => any>(
      handler: T
    ): T {
      return (async (...args: Parameters<T>) => {
        const [client, params] = args;
        
        // Extract customer from params
        const customer = (params as any)?.customer || 'default';
        
        // Validate customer access
        await validator.validateCustomerAccess(customer, {
          customer: (client as any).config?.customer,
          accountSwitchKey: (client as any).config?.accountSwitchKey,
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
export function getCustomerValidator(): CustomerValidator {
  if (!validatorInstance) {
    const configManager = CustomerConfigManager.getInstance();
    validatorInstance = new CustomerValidator(configManager);
  }
  return validatorInstance;
}