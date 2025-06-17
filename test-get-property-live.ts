#!/usr/bin/env tsx

/**
 * Live test to verify get-property function works correctly
 * Tests multiple scenarios to ensure 100% success rate
 */

import { AkamaiClient } from './src/akamai-client.js';
import { getProperty } from './src/tools/property-tools.js';

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: string;
}

const results: TestResult[] = [];

// Helper function to run a test
async function runTest(
  name: string, 
  testFn: () => Promise<boolean>
): Promise<void> {
  console.log(`\n🧪 Running: ${name}`);
  const startTime = Date.now();
  
  try {
    const passed = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({ 
      name, 
      passed, 
      duration 
    });
    
    console.log(passed ? `✅ PASSED (${duration}ms)` : `❌ FAILED (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ 
      name, 
      passed: false, 
      duration,
      error: error.message 
    });
    console.log(`❌ ERROR (${duration}ms): ${error.message}`);
  }
}

// Main test suite
async function runAllTests() {
  console.log('🚀 Starting Live Get-Property Tests\n');
  console.log('=' .repeat(60));
  
  const client = new AkamaiClient('default');
  
  // Test 1: Get property by exact ID
  await runTest('Get property by ID (prp_1229436)', async () => {
    const result = await getProperty(client, { 
      propertyId: 'prp_1229436' 
    });
    
    if (!result.content[0] || !('text' in result.content[0])) {
      console.log('   ❌ No text content in response');
      return false;
    }
    
    const text = result.content[0].text;
    
    // Verify expected content
    const checks = [
      { desc: 'Contains property name', check: text.includes('acedergr-test-web') },
      { desc: 'Contains property ID', check: text.includes('prp_1229436') },
      { desc: 'Contains contract info', check: text.includes('ctr_1-5C13O2') },
      { desc: 'Contains group info', check: text.includes('grp_99912') },
      { desc: 'Shows property details header', check: text.includes('Property Details') },
      { desc: 'Shows version info', check: text.includes('Version Information') },
      { desc: 'Shows activation status', check: text.includes('Activation Status') }
    ];
    
    let allPassed = true;
    for (const check of checks) {
      if (check.check) {
        console.log(`   ✓ ${check.desc}`);
      } else {
        console.log(`   ✗ ${check.desc}`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log('   📄 Sample output:');
      console.log('   ' + text.split('\n').slice(0, 5).join('\n   '));
    }
    
    return allPassed;
  });
  
  // Test 2: Get property by name (should trigger search)
  await runTest('Get property by name search', async () => {
    const result = await getProperty(client, { 
      propertyId: 'acedergr-test-web' 
    });
    
    if (!result.content[0] || !('text' in result.content[0])) {
      return false;
    }
    
    const text = result.content[0].text;
    
    // Could return the exact property or a list of matches
    const isDirectMatch = text.includes('Property Details') && text.includes('acedergr-test-web');
    const isSearchResult = text.includes('Found') && text.includes('matching');
    
    if (isDirectMatch) {
      console.log('   ✓ Direct match found and returned');
    } else if (isSearchResult) {
      console.log('   ✓ Search results returned');
    } else {
      console.log('   ✗ Unexpected response format');
      return false;
    }
    
    return true;
  });
  
  // Test 3: Get non-existent property
  await runTest('Get non-existent property', async () => {
    const result = await getProperty(client, { 
      propertyId: 'prp_99999999' 
    });
    
    if (!result.content[0] || !('text' in result.content[0])) {
      return false;
    }
    
    const text = result.content[0].text;
    
    // Should indicate not found
    const hasNotFound = text.includes('not found') || text.includes('No properties found');
    const hasTips = text.includes('Tips:') || text.includes('Tip:');
    
    console.log(`   ${hasNotFound ? '✓' : '✗'} Shows not found message`);
    console.log(`   ${hasTips ? '✓' : '✗'} Provides helpful tips`);
    
    return hasNotFound && hasTips;
  });
  
  // Test 4: Get another valid property to ensure consistency
  await runTest('Get property by ID (prp_1134438)', async () => {
    const result = await getProperty(client, { 
      propertyId: 'prp_1134438' 
    });
    
    if (!result.content[0] || !('text' in result.content[0])) {
      return false;
    }
    
    const text = result.content[0].text;
    
    // Should find acedergr-apex-workaround
    const hasPropertyName = text.includes('acedergr-apex-workaround');
    const hasPropertyDetails = text.includes('Property Details');
    
    console.log(`   ${hasPropertyName ? '✓' : '✗'} Found correct property name`);
    console.log(`   ${hasPropertyDetails ? '✓' : '✗'} Shows property details`);
    
    return hasPropertyName && hasPropertyDetails;
  });
  
  // Test 5: Search with partial name
  await runTest('Search with partial property name', async () => {
    const result = await getProperty(client, { 
      propertyId: 'acedergr' 
    });
    
    if (!result.content[0] || !('text' in result.content[0])) {
      return false;
    }
    
    const text = result.content[0].text;
    
    // Should return search results
    const hasSearchResults = 
      (text.includes('Found') && text.includes('properties matching')) ||
      (text.includes('Property Details') && text.includes('acedergr'));
    
    console.log(`   ${hasSearchResults ? '✓' : '✗'} Returns search results or direct match`);
    
    return hasSearchResults;
  });
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Duration: ${Math.round(totalDuration / results.length)}ms per test`);
  
  console.log('\nDetailed Results:');
  console.log('-'.repeat(60));
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! 100% SUCCESS RATE! 🎉');
  } else {
    console.log(`⚠️  ${failed} tests failed. Fix required.`);
  }
  
  return failed === 0;
}

// Run the tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });