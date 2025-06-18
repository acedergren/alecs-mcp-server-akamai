#!/usr/bin/env node

/**
 * Check if code.solutionsedge.io property already exists
 */

import { AkamaiClient } from './src/akamai-client';
import { searchProperties } from './src/tools/property-manager-advanced-tools';
import { listProperties } from './src/tools/property-tools';

async function checkPropertyExists() {
  console.log('🔍 Checking if code.solutionsedge.io already exists...\n');
  
  try {
    const client = new AkamaiClient();
    
    // Method 1: Search by hostname
    console.log('1️⃣ Searching by hostname...');
    try {
      const searchResult = await searchProperties(client, {
        hostname: 'code.solutionsedge.io'
      });
      
      const responseText = searchResult.content[0].text;
      console.log('Search result preview:');
      console.log(responseText.substring(0, 500));
      
      if (responseText.includes('Properties found') && !responseText.includes('No properties found')) {
        console.log('\n✅ Property appears to exist!');
        return true;
      }
    } catch (error) {
      console.log('Search failed:', error instanceof Error ? error.message : error);
    }
    
    // Method 2: List all properties and check
    console.log('\n2️⃣ Listing properties in contract...');
    try {
      const listResult = await listProperties(client, {
        contractId: 'ctr_1-5C13O2',
        groupId: 'grp_18543'
      });
      
      const responseText = listResult.content[0].text;
      if (responseText.includes('code.solutionsedge.io')) {
        console.log('\n✅ Found code.solutionsedge.io in property list!');
        
        // Extract property ID
        const lines = responseText.split('\n');
        let foundProperty = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('code.solutionsedge.io')) {
            console.log('\nProperty details:');
            console.log(lines[i]);
            if (i > 0) console.log(lines[i-1]); // Property ID line
            if (i < lines.length - 1) console.log(lines[i+1]); // Status line
            foundProperty = true;
            break;
          }
        }
        return foundProperty;
      }
    } catch (error) {
      console.log('List failed:', error instanceof Error ? error.message : error);
    }
    
    console.log('\n❌ Property code.solutionsedge.io not found');
    return false;
    
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

checkPropertyExists().then(exists => {
  if (exists) {
    console.log('\n⚠️  Property already exists! The onboarding workflow will likely fail.');
    console.log('   You may need to use a different hostname or delete the existing property.');
  } else {
    console.log('\n✅ Property does not exist, ready for onboarding!');
  }
});