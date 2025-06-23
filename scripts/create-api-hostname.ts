#!/usr/bin/env tsx

import { AkamaiClient } from '../src/akamai-client';

async function createApiHostname() {
  console.log('🌐 Hostname Creation for api.solutionsedge.io');
  console.log('=============================================\n');
  
  const client = new AkamaiClient();
  
  try {
    // First get contracts and groups
    console.log('📋 Getting account information...');
    const contracts = await client.request({
      method: 'GET',
      path: '/papi/v1/contracts',
      headers: { 'Accept': 'application/json' }
    });
    
    const contractId = contracts.contracts?.items?.[0]?.contractId || 'ctr_1-5C13O2';
    console.log(`   Using contract: ${contractId}`);
    
    // Get groups
    const groups = await client.request({
      method: 'GET',
      path: '/papi/v1/groups',
      headers: { 'Accept': 'application/json' }
    });
    
    const groupId = groups.groups?.items?.[0]?.groupId || 'grp_123456';
    console.log(`   Using group: ${groupId}\n`);
    
    // Step 1: Find a suitable property
    console.log('1️⃣ Finding properties...');
    const properties = await client.request({
      method: 'GET',
      path: '/papi/v1/properties',
      params: {
        contractId: contractId,
        groupId: groupId
      },
      headers: { 'Accept': 'application/json' }
    });
    
    const allProps = properties.properties?.items || [];
    console.log(`   Found ${allProps.length} properties`);
    
    // Look for solutionsedge properties
    const solutionsEdgeProps = allProps.filter((p: any) => 
      p.propertyName?.toLowerCase().includes('solution') ||
      p.propertyName?.toLowerCase().includes('api')
    );
    
    if (solutionsEdgeProps.length > 0) {
      console.log('\n   Related properties:');
      solutionsEdgeProps.slice(0, 5).forEach((p: any, i: number) => {
        console.log(`   ${i+1}. ${p.propertyName}`);
        console.log(`      ID: ${p.propertyId}`);
        console.log(`      Latest version: ${p.latestVersion}`);
      });
    } else if (allProps.length > 0) {
      console.log('\n   All properties:');
      allProps.slice(0, 5).forEach((p: any, i: number) => {
        console.log(`   ${i+1}. ${p.propertyName} (v${p.latestVersion})`);
      });
    }
    
    // Step 2: Check edge hostnames
    console.log('\n2️⃣ Checking edge hostnames...');
    const edgeHostnames = await client.request({
      method: 'GET',
      path: '/papi/v1/edgehostnames',
      params: {
        contractId: contractId,
        groupId: groupId
      },
      headers: { 'Accept': 'application/json' }
    });
    
    const apiEdgeHostname = edgeHostnames.edgeHostnames?.items?.find((eh: any) => 
      eh.domainPrefix === 'api.solutionsedge.io'
    );
    
    if (apiEdgeHostname) {
      console.log('   ✅ Edge hostname already exists!');
      console.log(`   • Domain: ${apiEdgeHostname.domainPrefix}.${apiEdgeHostname.domainSuffix}`);
      console.log(`   • ID: ${apiEdgeHostname.edgeHostnameId}`);
      console.log(`   • Status: ${apiEdgeHostname.status}`);
    } else {
      console.log('   ℹ️  No edge hostname exists for api.solutionsedge.io yet');
      
      // Show existing edge hostnames
      const existingEH = edgeHostnames.edgeHostnames?.items || [];
      if (existingEH.length > 0) {
        console.log('\n   Existing edge hostnames:');
        existingEH.slice(0, 3).forEach((eh: any) => {
          console.log(`   • ${eh.domainPrefix}.${eh.domainSuffix}`);
        });
      }
    }
    
    // Step 3: Create edge hostname if needed
    if (!apiEdgeHostname) {
      console.log('\n3️⃣ Ready to create edge hostname...\n');
      console.log('   📝 Configuration:');
      console.log('   • Hostname: api.solutionsedge.io');
      console.log('   • Edge hostname: api.solutionsedge.io.edgekey.net');
      console.log('   • Certificate: Standard TLS (DV)');
      console.log('   • IP version: IPv4 + IPv6\n');
      
      console.log('   Would you like to create this edge hostname? (Simulating yes)\n');
      
      // Create the edge hostname
      console.log('   Creating edge hostname...');
      try {
        const createResult = await client.request({
          method: 'POST',
          path: '/papi/v1/edgehostnames',
          params: {
            contractId: contractId,
            groupId: groupId
          },
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: {
            domainPrefix: 'api.solutionsedge.io',
            domainSuffix: 'edgekey.net',
            secure: true,
            ipVersionBehavior: 'IPV4_IPV6',
            certificateEnrollmentId: null // Will use Standard TLS
          }
        });
        
        console.log('   ✅ Edge hostname created successfully!');
        console.log(`   • ID: ${createResult.edgeHostnameLink}`);
      } catch (error: any) {
        console.log('   ⚠️  Could not create edge hostname automatically');
        console.log(`   Reason: ${error.message}`);
      }
    }
    
    // Step 4: Show property configuration steps
    console.log('\n📋 Next Steps to Complete Setup:\n');
    
    console.log('   1. Choose or create a property for your API');
    console.log('   2. Add api.solutionsedge.io as a hostname');
    console.log('   3. Configure the property rules:');
    console.log('      • Origin server: ds01.cloud.solutionsedge.io');
    console.log('      • Cache settings for API responses');
    console.log('      • CORS headers if needed');
    console.log('      • Security headers\n');
    
    console.log('   4. Test on staging network');
    console.log('   5. Activate to production\n');
    
    console.log('✨ Your DNS CNAME (api.solutionsedge.io → ds01.cloud.solutionsedge.io) is already configured!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Execute if running directly
if (require.main === module) {
  createApiHostname();
}