/**
 * Customer Configuration Manager
 * Manages customer-specific configurations from .edgerc file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CustomerConfig {
  client_secret: string;
  host: string;
  access_token: string;
  client_token: string;
  account_switch_key?: string;
}

export class CustomerConfigManager {
  private static instance: CustomerConfigManager;
  private configs: Map<string, CustomerConfig> = new Map();
  private configPath: string;
  
  private constructor() {
    this.configPath = process.env['EDGERC'] || path.join(os.homedir(), '.edgerc');
    this.loadConfigs();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): CustomerConfigManager {
    if (!CustomerConfigManager.instance) {
      CustomerConfigManager.instance = new CustomerConfigManager();
    }
    return CustomerConfigManager.instance;
  }
  
  /**
   * Load configurations from .edgerc file
   */
  private loadConfigs(): void {
    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      const sections = content.split(/\n\[/).filter(Boolean);
      
      for (const section of sections) {
        const lines = section.split('\n').filter(line => line.trim());
        const sectionName = lines[0]?.replace(/[\[\]]/g, '').trim() || '';
        const config: unknown = {};
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const [key, value] = line.split('=').map(s => s.trim());
          if (key && value) {
            config[key] = value;
          }
        }
        
        if (config.client_secret && config.host && config.access_token && config.client_token) {
          this.configs.set(sectionName, config as CustomerConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load .edgerc file:', error);
      // Set default config if file not found
      this.configs.set('default', {
        client_secret: process.env['AKAMAI_CLIENT_SECRET'] || '',
        host: process.env['AKAMAI_HOST'] || '',
        access_token: process.env['AKAMAI_ACCESS_TOKEN'] || '',
        client_token: process.env['AKAMAI_CLIENT_TOKEN'] || '',
      });
    }
  }
  
  /**
   * Get configuration for a customer
   */
  getConfig(customer: string): CustomerConfig {
    const config = this.configs.get(customer);
    if (!config) {
      throw new Error(`Customer configuration '${customer}' not found`);
    }
    return config;
  }
  
  /**
   * Check if customer exists
   */
  hasCustomer(customer: string): boolean {
    return this.configs.has(customer);
  }
  
  /**
   * Get all customer names
   */
  getCustomers(): string[] {
    return Array.from(this.configs.keys());
  }
}

export default CustomerConfigManager;
