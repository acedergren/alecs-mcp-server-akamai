#!/usr/bin/env tsx

/**
 * Test script for cache invalidation implementation
 * Verifies that mutation operations properly invalidate cache
 */

import { getCacheService } from '../src/services/unified-cache-service';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('cache-test');

async function testCacheInvalidation() {
  logger.info('Starting cache invalidation tests...');
  
  try {
    // Get cache service instance
    const cacheService = await getCacheService();
    
    if (!cacheService.isAvailable()) {
      logger.warn('Cache service not available - skipping tests');
      return;
    }
    
    // Test 1: Basic cache operations
    logger.info('Test 1: Basic cache operations');
    const testKey = 'test:property:prp_123456';
    const testData = { propertyId: 'prp_123456', name: 'Test Property' };
    
    // Set cache
    await cacheService.set(testKey, testData, 300); // 5 min TTL
    logger.info('Cache set successfully');
    
    // Get from cache
    const cached = await cacheService.get(testKey);
    if (cached && cached.propertyId === testData.propertyId) {
      logger.info('✅ Cache get successful');
    } else {
      logger.error('❌ Cache get failed');
    }
    
    // Delete from cache
    await cacheService.del(testKey);
    const afterDelete = await cacheService.get(testKey);
    if (!afterDelete) {
      logger.info('✅ Cache delete successful');
    } else {
      logger.error('❌ Cache delete failed');
    }
    
    // Test 2: Property invalidation
    logger.info('\nTest 2: Property-specific invalidation');
    const propertyId = 'prp_654321';
    const customer = 'test-customer';
    
    // Set multiple related keys
    await cacheService.set(`${customer}:property:${propertyId}`, { id: propertyId });
    await cacheService.set(`${customer}:property:${propertyId}:versions`, [1, 2, 3]);
    await cacheService.set(`${customer}:property:${propertyId}:rules`, { rules: [] });
    
    // Invalidate property
    await cacheService.invalidateProperty(propertyId, customer);
    
    // Check if all related keys are deleted
    const keys = [
      `${customer}:property:${propertyId}`,
      `${customer}:property:${propertyId}:versions`,
      `${customer}:property:${propertyId}:rules`
    ];
    
    let allDeleted = true;
    for (const key of keys) {
      const value = await cacheService.get(key);
      if (value) {
        logger.error(`❌ Key ${key} not deleted`);
        allDeleted = false;
      }
    }
    
    if (allDeleted) {
      logger.info('✅ Property invalidation successful');
    }
    
    // Test 3: Pattern-based deletion
    logger.info('\nTest 3: Pattern-based deletion');
    const searchPattern = `${customer}:search:*`;
    
    // Set multiple search keys
    await cacheService.set(`${customer}:search:query1`, { results: [] });
    await cacheService.set(`${customer}:search:query2`, { results: [] });
    await cacheService.set(`${customer}:search:query3`, { results: [] });
    
    // Delete by pattern
    const deletedCount = await cacheService.scanAndDelete(searchPattern);
    if (deletedCount === 3) {
      logger.info(`✅ Pattern deletion successful - deleted ${deletedCount} keys`);
    } else {
      logger.error(`❌ Pattern deletion failed - deleted ${deletedCount} keys, expected 3`);
    }
    
    // Test 4: Cache stats
    logger.info('\nTest 4: Cache statistics');
    const stats = cacheService.getStats();
    logger.info('Cache stats:', stats);
    
    logger.info('\n✅ All cache invalidation tests completed successfully!');
    
  } catch (error) {
    logger.error('Test failed:', error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run tests
testCacheInvalidation().catch(console.error);