#!/usr/bin/env node

/**
 * Run all critical security fixes
 */

import { fixCommandInjection } from './fix-command-injection';
import { fixAccountSwitching } from './fix-account-switching';
import { fixCacheIsolation } from './fix-cache-isolation';
import { logger } from '../../utils/logger';

async function runAllFixes() {
  console.log('🔐 Running critical security fixes...\n');
  
  try {
    // Fix command injection vulnerability
    await fixCommandInjection();
    
    // Fix account switching validation
    await fixAccountSwitching();
    
    // Fix cache isolation
    await fixCacheIsolation();
    
    console.log('\n✅ All critical security fixes applied successfully!');
    console.log('\n📌 Next steps:');
    console.log('1. Review the changes made by the fixes');
    console.log('2. Run tests to ensure functionality is preserved');
    console.log('3. Re-run the audit to verify fixes');
    
  } catch (error) {
    logger.error('Failed to apply fixes:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllFixes().catch(error => {
    console.error('❌ Critical fix process failed:', error);
    process.exit(1);
  });
}

export { runAllFixes };