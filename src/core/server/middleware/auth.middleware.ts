/**
 * Auth Middleware - Authentication and authorization for ALECSCore
 * 
 * Handles customer validation, permission checks, and multi-tenant support
 */

import { z } from 'zod';
import { CustomerConfigManager } from '../../../utils/customer-config';
import { logger } from '../../../utils/logger';
import { AkamaiError } from '../../../utils/errors';
import { validateCustomer, safeExtractCustomer } from '../../validation/customer';
import { Middleware } from '../base-mcp-server';

export interface AuthContext {
  customer: string;
  isValid: boolean;
  hasAccountSwitch: boolean;
  permissions?: string[];
}

export interface AuthConfig {
  requireCustomer?: boolean;
  defaultCustomer?: string;
  allowedCustomers?: string[];
  requireAccountSwitch?: boolean;
  validatePermissions?: boolean;
}

export class AuthMiddleware {
  private configManager: CustomerConfigManager;
  private authCache: Map<string, AuthContext> = new Map();
  
  constructor(private options: AuthConfig = {}) {
    this.configManager = CustomerConfigManager.getInstance();
  }
  
  /**
   * Validate customer authentication
   */
  async validateCustomer(customer?: string): Promise<AuthContext> {
    const customerName = customer || this.options.defaultCustomer || 'default';
    
    // Check cache
    const cached = this.authCache.get(customerName);
    if (cached) {
      return cached;
    }
    
    // Validate customer exists
    const validation = validateCustomer(customerName);
    if (!validation.valid) {
      if (this.options.requireCustomer) {
        throw new AkamaiError(
          `Customer '${customerName}' not found in .edgerc file: ${validation.error}`,
          401,
          'INVALID_CUSTOMER'
        );
      }
      
      // Use default if not required
      return this.createAuthContext('default', false);
    }
    
    // Check allowed customers
    if (this.options.allowedCustomers && !this.options.allowedCustomers.includes(customerName)) {
      throw new AkamaiError(
        `Customer '${customerName}' is not allowed for this operation`,
        403,
        'FORBIDDEN_CUSTOMER'
      );
    }
    
    // Get customer config
    const config = this.configManager.getCustomerConfig(customerName);
    
    // Check account switch requirement
    if (this.options.requireAccountSwitch && !config.account_switch_key) {
      throw new AkamaiError(
        `Customer '${customerName}' requires account_switch_key for this operation`,
        403,
        'ACCOUNT_SWITCH_REQUIRED'
      );
    }
    
    // Create auth context
    const authContext = this.createAuthContext(
      customerName,
      true,
      !!config.account_switch_key
    );
    
    // Cache for 5 minutes
    this.authCache.set(customerName, authContext);
    setTimeout(() => this.authCache.delete(customerName), 5 * 60 * 1000);
    
    logger.debug('Customer authenticated', {
      customer: customerName,
      hasAccountSwitch: authContext.hasAccountSwitch,
    });
    
    return authContext;
  }
  
  /**
   * Create auth context
   */
  private createAuthContext(
    customer: string,
    isValid: boolean,
    hasAccountSwitch = false
  ): AuthContext {
    return {
      customer,
      isValid,
      hasAccountSwitch,
      permissions: this.getCustomerPermissions(customer),
    };
  }
  
  /**
   * Get customer permissions (future extension point)
   */
  private getCustomerPermissions(customer: string): string[] {
    // Future: Load from config or external source
    return ['read', 'write', 'activate'];
  }
  
  /**
   * Check if customer has permission
   */
  hasPermission(authContext: AuthContext, permission: string): boolean {
    if (!this.options.validatePermissions) {
      return true;
    }
    
    return authContext.permissions?.includes(permission) || false;
  }
  
  /**
   * Create middleware function for tool handlers
   */
  createMiddleware() {
    return async (args: any, next: Function) => {
      try {
        // Extract customer
        const customer = safeExtractCustomer(args) || this.options.defaultCustomer;
        
        // Validate customer if required
        if (this.options.requireCustomer && !customer) {
          throw new Error('Customer parameter is required for this operation');
        }
        
        // Validate customer
        const authContext = await this.validateCustomer(customer);
        
        // Add auth context to args
        const enhancedArgs = {
          ...args,
          _auth: authContext,
        };
        
        // Call next handler
        return await next(enhancedArgs);
      } catch (error) {
        if (error instanceof AkamaiError) {
          throw error;
        }
        
        throw new AkamaiError(
          'Authentication failed',
          401,
          'AUTH_ERROR',
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    };
  }
  
  /**
   * Clear auth cache
   */
  clearCache(): void {
    this.authCache.clear();
  }
  
  /**
   * Get auth statistics
   */
  getStats(): { cacheSize: number; customers: string[] } {
    return {
      cacheSize: this.authCache.size,
      customers: Array.from(this.authCache.keys()),
    };
  }
}

// Legacy middleware function for backwards compatibility
export function authMiddleware(config: AuthConfig = {}): Middleware {
  const authMiddleware = new AuthMiddleware(config);
  
  return {
    name: 'auth',
    before: async (request) => {
      const { args } = request;
      
      try {
        // Extract and validate customer
        const customer = safeExtractCustomer(args as Record<string, unknown>) || config.defaultCustomer;
        
        if (config.requireCustomer && !customer) {
          throw new Error('Customer parameter is required for this operation');
        }
        
        const authContext = await authMiddleware.validateCustomer(customer);
        
        // Add validated customer back to args
        return {
          ...request,
          args: {
            ...args,
            customer: authContext.customer,
            _auth: authContext,
          },
        };
      } catch (error) {
        throw error;
      }
    },
  };
}