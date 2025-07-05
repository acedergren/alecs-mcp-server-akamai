/**
 * Fix for Critical Security Issue: Account Switching Without Validation
 * 
 * Multiple files handle account switching without proper validation
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const ACCOUNT_SWITCH_VALIDATION = `
  // SECURITY: Validate account switching
  if (accountSwitchKey) {
    // Verify the account switch key exists in configuration
    const configManager = CustomerConfigManager.getInstance();
    const customerConfig = configManager.getCustomerConfig(customer);
    
    if (!customerConfig?.accountSwitchKey || customerConfig.accountSwitchKey !== accountSwitchKey) {
      throw new Error('Invalid account switch key');
    }
    
    // Log account switch for audit trail
    logger.info('Account switch performed', {
      customer,
      accountSwitchKey: accountSwitchKey.substring(0, 4) + '****',
      timestamp: new Date().toISOString(),
    });
  }
`;

export async function fixAccountSwitching() {
  const filesToFix = [
    'src/akamai-client.ts',
    'src/utils/pino-logger.ts',
    'src/utils/customer-config.ts',
  ];
  
  for (const file of filesToFix) {
    try {
      const filePath = path.join(process.cwd(), file);
      const content = await fs.readFile(filePath, 'utf-8');
      let fixed = content;
      
      // Add validation wherever account-switch-key is used
      if (fixed.includes('account-switch-key') || fixed.includes('accountSwitchKey')) {
        // Add import if needed
        if (!fixed.includes('CustomerConfigManager')) {
          const importLine = "import { CustomerConfigManager } from './customer-config';\n";
          fixed = importLine + fixed;
        }
        
        // Find where account switch is handled and add validation
        fixed = fixed.replace(
          /(if\s*\(.*accountSwitchKey.*\)\s*{)/g,
          `$1${ACCOUNT_SWITCH_VALIDATION}`
        );
      }
      
      if (fixed !== content) {
        await fs.writeFile(filePath, fixed);
        console.log(`✅ Fixed account switching validation in ${file}`);
      }
    } catch (error) {
      console.error(`❌ Failed to fix ${file}:`, error);
    }
  }
}