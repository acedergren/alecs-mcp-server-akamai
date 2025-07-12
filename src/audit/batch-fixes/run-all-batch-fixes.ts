#!/usr/bin/env node

/**
 * Run all batch fixes for high-priority issues
 */

import { fixMissingCustomerValidation } from './fix-missing-customer-validation';
// import { fixGenericErrors } from './fix-generic-errors'; // Archived
import { fixMissingTryCatch } from './fix-missing-try-catch';
import { fixMissingCacheInvalidation } from './fix-missing-cache-invalidation';
import { logger } from '../../utils/logger';

async function runAllBatchFixes() {
  console.log('🚀 Running batch fixes for high-priority issues...\n');
  console.log('═'.repeat(60) + '\n');
  
  const startTime = Date.now();
  
  try {
    // Fix 1: Customer validation (Critical Security)
    console.log('1️⃣ CUSTOMER VALIDATION FIXES');
    console.log('─'.repeat(60));
    await fixMissingCustomerValidation();
    console.log('\n');
    
    // Fix 2: Generic errors (High Priority - API Compliance)
    console.log('2️⃣ GENERIC ERROR REPLACEMENT');
    console.log('─'.repeat(60));
    // await fixGenericErrors(); // Archived
    console.log('\n');
    
    // Fix 3: Missing try-catch (High Priority - Error Handling)
    console.log('3️⃣ ASYNC ERROR HANDLING');
    console.log('─'.repeat(60));
    await fixMissingTryCatch();
    console.log('\n');
    
    // Fix 4: Cache invalidation (High Priority - Performance)
    console.log('4️⃣ CACHE INVALIDATION');
    console.log('─'.repeat(60));
    await fixMissingCacheInvalidation();
    console.log('\n');
    
    const duration = Date.now() - startTime;
    console.log('═'.repeat(60));
    console.log(`✅ All batch fixes completed in ${(duration / 1000).toFixed(2)}s`);
    console.log('\n📌 Next steps:');
    console.log('1. Run npm run build to verify compilation');
    console.log('2. Run tests to ensure functionality');
    console.log('3. Re-run audit to measure improvement');
    console.log('4. Commit the fixes');
    
  } catch (error) {
    logger.error('Batch fix process failed:', error as Record<string, unknown>);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllBatchFixes().catch(error => {
    console.error('❌ Batch fix process failed:', error);
    process.exit(1);
  });
}

export { runAllBatchFixes };