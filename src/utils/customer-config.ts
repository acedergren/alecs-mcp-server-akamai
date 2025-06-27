/**
 * MULTI-CUSTOMER CONFIGURATION MANAGER
 * 
 * ARCHITECTURE PURPOSE:
 * Enables ALECS MCP server to serve multiple Akamai customer accounts
 * from a single server instance, supporting service providers, consultants,
 * and enterprises with multiple contracts.
 * 
 * SUPPORTED DEPLOYMENT PATTERNS:
 * 1. MSP/Consultant: Multiple client accounts with separate credentials
 * 2. Enterprise: Multiple divisions/business units with separate contracts  
 * 3. Development: Staging/production environments per customer
 * 4. Testing: Dedicated test environments with controlled data
 * 
 * .EDGERC MULTI-CUSTOMER STRUCTURE:
 * ```
 * [default]                    # Default/primary customer
 * [client-acme]               # Service provider client 1
 * [client-beta]               # Service provider client 2  
 * [division-media]            # Enterprise division 1
 * [division-ecommerce]        # Enterprise division 2
 * [staging]                   # Development environment
 * [testing]                   # Test environment (dedicated section)
 * ```
 * 
 * SCALING ARCHITECTURE:
 * Local .edgerc → Remote credential service → Distributed MCP → Enterprise SaaS
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Akamai EdgeGrid Configuration Section
 * 
 * MULTI-CUSTOMER FIELDS:
 * - host: Akamai API endpoint (usually same across customers)
 * - client_token: Customer-specific API client identifier  
 * - client_secret: Customer-specific API client secret
 * - access_token: Customer-specific access token
 * - account_switch_key: Optional for cross-account operations (MSP/enterprise use)
 */
export interface EdgeRcSection {
  host: string;
  client_token: string;
  client_secret: string;
  access_token: string;
  account_switch_key?: string; // Critical for multi-customer service providers
}

/**
 * MULTI-CUSTOMER CONFIGURATION MANAGER IMPLEMENTATION
 * 
 * CURRENT CAPABILITIES:
 * - Parses .edgerc file with multiple customer sections
 * - Singleton pattern for consistent configuration access
 * - Automatic credential loading and validation
 * 
 * INTENDED ENHANCEMENTS (Phase 2):
 * - Customer validation methods (hasCustomer, validateCustomer)
 * - Account switching support for cross-customer operations  
 * - Environment-specific configuration (staging/production per customer)
 * - Customer context logging and audit trails
 * - Dynamic customer onboarding without server restart
 * 
 * MULTI-CUSTOMER METHODS TO IMPLEMENT:
 * - hasCustomer(customerName: string): boolean
 * - getCustomerConfig(customerName: string): EdgeRcSection  
 * - validateCustomerAccess(customerName: string): Promise<boolean>
 * - listAvailableCustomers(): string[]
 * - switchCustomerContext(fromCustomer: string, toCustomer: string): EdgeRcSection
 */
export class CustomerConfigManager {
  private static instance: CustomerConfigManager;
  private edgercPath = '';
  
  /**
   * Customer Sections Map
   * Key: Customer identifier (e.g., 'client-acme', 'division-media', 'staging')
   * Value: EdgeGrid configuration for that customer's Akamai account
   * 
   * MULTI-CUSTOMER EXAMPLES:
   * - sections.get('client-acme') → ACME Corp's Akamai credentials
   * - sections.get('division-media') → Media division's contract credentials  
   * - sections.get('testing') → Test environment with controlled data
   */
  private sections: Map<string, EdgeRcSection> = new Map();

  private constructor() {
    // Try common locations for .edgerc
    const locations = [
      process.env.EDGERC_PATH,
      path.join(process.cwd(), '.edgerc'),
      path.join(os.homedir(), '.edgerc'),
    ];

    for (const location of locations) {
      if (location && fs.existsSync(location)) {
        this.edgercPath = location;
        break;
      }
    }

    if (!this.edgercPath) {
      throw new Error(
        'No .edgerc file found. Please create one or set EDGERC_PATH environment variable.',
      );
    }

    this.loadConfig();
  }

  static getInstance(): CustomerConfigManager {
    if (!CustomerConfigManager.instance) {
      CustomerConfigManager.instance = new CustomerConfigManager();
    }
    return CustomerConfigManager.instance;
  }

  private loadConfig(): void {
    const content = fs.readFileSync(this.edgercPath, 'utf-8');
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentConfig: Partial<EdgeRcSection> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for section header
      const sectionMatch = trimmedLine.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        // Save previous section if exists
        if (currentSection && this.isCompleteSection(currentConfig)) {
          this.sections.set(currentSection, currentConfig as EdgeRcSection);
        }

        currentSection = sectionMatch[1] || null;
        currentConfig = {};
        continue;
      }

      // Parse key-value pairs
      const keyValueMatch = trimmedLine.match(/^(.+?)\s*=\s*(.+)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1]?.trim() || '';
        const value = keyValueMatch[2]?.trim() || '';

        switch (key) {
          case 'host':
            currentConfig.host = value;
            break;
          case 'client_token':
            currentConfig.client_token = value;
            break;
          case 'client_secret':
            currentConfig.client_secret = value;
            break;
          case 'access_token':
            currentConfig.access_token = value;
            break;
          case 'account-switch-key':
            currentConfig.account_switch_key = value;
            break;
        }
      }
    }

    // Save last section
    if (currentSection && this.isCompleteSection(currentConfig)) {
      this.sections.set(currentSection, currentConfig as EdgeRcSection);
    }
  }

  private isCompleteSection(config: Partial<EdgeRcSection>): boolean {
    return !!(config.host && config.client_token && config.client_secret && config.access_token);
  }

  getSection(sectionName = 'default'): EdgeRcSection {
    const section = this.sections.get(sectionName);
    if (!section) {
      throw new Error(
        `Section '${sectionName}' not found in .edgerc file. Available sections: ${Array.from(this.sections.keys()).join(', ')}`,
      );
    }
    return section;
  }

  listSections(): string[] {
    return Array.from(this.sections.keys());
  }

  hasSection(sectionName: string): boolean {
    return this.sections.has(sectionName);
  }

  getCustomers(): string[] {
    return this.listSections();
  }
}

export function getCustomerConfig(customer = 'default'): EdgeRcSection {
  return CustomerConfigManager.getInstance().getSection(customer);
}

export function listCustomers(): string[] {
  return CustomerConfigManager.getInstance().listSections();
}

export function hasCustomer(customer: string): boolean {
  return CustomerConfigManager.getInstance().hasSection(customer);
}
