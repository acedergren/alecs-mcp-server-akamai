import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface EdgeRcSection {
  host: string;
  client_token: string;
  client_secret: string;
  access_token: string;
  account_switch_key?: string;
}

export class CustomerConfigManager {
  private static instance: CustomerConfigManager;
  private edgercPath: string = '';
  private sections: Map<string, EdgeRcSection> = new Map();

  private constructor() {
    // Try common locations for .edgerc
    const locations = [
      process.env.EDGERC_PATH,
      path.join(process.cwd(), '.edgerc'),
      path.join(os.homedir(), '.edgerc')
    ];

    for (const location of locations) {
      if (location && fs.existsSync(location)) {
        this.edgercPath = location;
        break;
      }
    }

    if (!this.edgercPath) {
      throw new Error('No .edgerc file found. Please create one or set EDGERC_PATH environment variable.');
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

  getSection(sectionName: string = 'default'): EdgeRcSection {
    const section = this.sections.get(sectionName);
    if (!section) {
      throw new Error(`Section '${sectionName}' not found in .edgerc file. Available sections: ${Array.from(this.sections.keys()).join(', ')}`);
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

export function getCustomerConfig(customer: string = 'default'): EdgeRcSection {
  return CustomerConfigManager.getInstance().getSection(customer);
}

export function listCustomers(): string[] {
  return CustomerConfigManager.getInstance().listSections();
}

export function hasCustomer(customer: string): boolean {
  return CustomerConfigManager.getInstance().hasSection(customer);
}