/**
 * Customer Validation Module
 * 
 * Consolidates customer validation from:
 * - tools/validation/customer-validation-wrapper.ts
 * - Multiple inline customer checks across tool files
 * 
 * Ensures consistent multi-tenant validation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Edge configuration structure
 */
interface EdgeConfig {
  [section: string]: {
    host?: string;
    client_token?: string;
    client_secret?: string;
    access_token?: string;
    account_key?: string;
  };
}

/**
 * Customer validation result
 */
export interface CustomerValidationResult {
  valid: boolean;
  customer: string;
  error?: string;
  hasAccountSwitch?: boolean;
}

/**
 * Load and parse .edgerc file
 */
function loadEdgeConfig(): EdgeConfig | null {
  const edgercPath = path.join(os.homedir(), '.edgerc');
  
  if (!fs.existsSync(edgercPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(edgercPath, 'utf8');
    const config: EdgeConfig = {};
    let currentSection: string | null = null;
    
    content.split('\n').forEach(line => {
      line = line.trim();
      
      // Section header
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1);
        config[currentSection] = {};
        return;
      }
      
      // Key-value pair
      if (currentSection && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && config[currentSection]) {
          (config[currentSection] as any)[key.trim()] = value;
        }
      }
    });
    
    return config;
  } catch (error) {
    console.error('Failed to load .edgerc:', error);
    return null;
  }
}

/**
 * Cache for edge config to avoid repeated file reads
 */
let configCache: { config: EdgeConfig | null; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get edge config with caching
 */
function getEdgeConfig(): EdgeConfig | null {
  const now = Date.now();
  
  if (configCache && (now - configCache.timestamp) < CACHE_TTL) {
    return configCache.config;
  }
  
  const config = loadEdgeConfig();
  configCache = { config, timestamp: now };
  return config;
}

/**
 * Validate customer exists in .edgerc
 */
export function validateCustomer(customer?: string): CustomerValidationResult {
  // Default to 'default' section if not specified
  const customerName = customer || 'default';
  
  const config = getEdgeConfig();
  
  if (!config) {
    return {
      valid: false,
      customer: customerName,
      error: 'No .edgerc file found in home directory',
    };
  }
  
  if (!config[customerName]) {
    const availableCustomers = Object.keys(config);
    return {
      valid: false,
      customer: customerName,
      error: `Customer section '${customerName}' not found in .edgerc. Available sections: ${availableCustomers.join(', ')}`,
    };
  }
  
  const section = config[customerName];
  
  // Validate required fields
  const requiredFields = ['host', 'client_token', 'client_secret', 'access_token'];
  const missingFields = requiredFields.filter(field => !(section as any)[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      customer: customerName,
      error: `Customer section '${customerName}' is missing required fields: ${missingFields.join(', ')}`,
    };
  }
  
  return {
    valid: true,
    customer: customerName,
    hasAccountSwitch: !!section.account_key,
  };
}

/**
 * List all available customers
 */
export function listAvailableCustomers(): string[] {
  const config = getEdgeConfig();
  return config ? Object.keys(config) : [];
}

/**
 * Get customer configuration
 */
export function getCustomerConfig(customer: string): EdgeConfig[string] | null {
  const config = getEdgeConfig();
  return config?.[customer] || null;
}

/**
 * Validate customer with detailed error info
 */
export function validateCustomerWithDetails(customer?: string): {
  valid: boolean;
  customer: string;
  error?: string;
  suggestion?: string;
  availableCustomers?: string[];
} {
  const result = validateCustomer(customer);
  
  if (!result.valid) {
    const availableCustomers = listAvailableCustomers();
    
    let suggestion = '';
    if (availableCustomers.length === 0) {
      suggestion = 'Please create a .edgerc file with your Akamai credentials.';
    } else if (!customer || customer === 'default') {
      suggestion = `Try specifying a customer parameter: ${availableCustomers[0]}`;
    } else {
      // Find similar customer names
      const similar = availableCustomers.filter(c => 
        c.toLowerCase().includes(customer.toLowerCase()) ||
        customer.toLowerCase().includes(c.toLowerCase())
      );
      
      if (similar.length > 0) {
        suggestion = `Did you mean: ${similar.join(' or ')}?`;
      } else {
        suggestion = `Available customers: ${availableCustomers.join(', ')}`;
      }
    }
    
    return {
      ...result,
      suggestion,
      availableCustomers,
    };
  }
  
  return result;
}

/**
 * Customer validation middleware for tools
 */
export function withCustomerValidation<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const [client, params] = args;
    const customer = params?.customer || client?.customer || 'default';
    
    const validation = validateCustomerWithDetails(customer);
    
    if (!validation.valid) {
      throw new Error(
        `Customer validation failed: ${validation.error}\n` +
        `${validation.suggestion}\n` +
        `Available customers: ${validation.availableCustomers?.join(', ') || 'none'}`
      );
    }
    
    // Update client customer if needed
    if (client && client.customer !== validation.customer) {
      client.customer = validation.customer;
    }
    
    return handler(...args);
  }) as T;
}

/**
 * Clear config cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache = null;
}

/**
 * Check if a customer has account switching enabled
 */
export function hasAccountSwitching(customer: string): boolean {
  const config = getCustomerConfig(customer);
  return !!config?.account_key;
}

/**
 * Safely extract customer parameter from MCP args
 * Validates type and existence in .edgerc
 */
export function safeExtractCustomer(args: Record<string, unknown>): string | undefined {
  if (!('customer' in args)) {
    return undefined;
  }
  
  const customer = args['customer'];
  
  // Type validation
  if (typeof customer !== 'string') {
    throw new Error(`Customer parameter must be a string, got: ${typeof customer}`);
  }
  
  // Empty string validation
  if (customer.length === 0) {
    throw new Error('Customer parameter cannot be empty');
  }
  
  // Validate customer exists in .edgerc
  const validation = validateCustomer(customer);
  if (!validation.valid) {
    throw new Error(`Invalid customer '${customer}': ${validation.error}`);
  }
  
  return customer;
}

/**
 * Create safe customer parameter object for spreading
 * Returns empty object if customer is not provided or invalid
 */
export function safeCustomerParam(args: Record<string, unknown>): { customer?: string } {
  try {
    const customer = safeExtractCustomer(args);
    return customer ? { customer } : {};
  } catch (error) {
    // Log error but don't throw - allows graceful fallback to default customer
    console.warn(`Customer parameter validation warning: ${error}`);
    return {};
  }
}