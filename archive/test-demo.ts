import { AkamaiDemoAPI } from './src/demo/type-safe-wrapper';

async function runDemo() {
  console.log('🏔️ Snow Leopard Demo Suite\n');
  
  // Property Management
  console.log('1. Property Management:');
  const properties = await AkamaiDemoAPI.property.list();
  console.log(`   ✓ Found ${properties.data?.length || 0} properties`);
  
  // Security
  console.log('\n2. Application Security:');
  const networkLists = await AkamaiDemoAPI.security.listNetworkLists();
  console.log(`   ✓ Found ${networkLists.data?.length || 0} network lists`);
  
  // Reporting
  console.log('\n3. Analytics & Reporting:');
  const traffic = await AkamaiDemoAPI.reporting.getTrafficSummary('prop_123');
  console.log(`   ✓ Total requests: ${traffic.data?.totalRequests?.toLocaleString()}`);
  console.log(`   ✓ Cache hit ratio: ${((traffic.data?.cacheHitRatio || 0) * 100).toFixed(1)}%`);
  
  console.log('\n✅ All systems operational\!');
}

runDemo().catch(console.error);
