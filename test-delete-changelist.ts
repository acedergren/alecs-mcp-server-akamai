#!/usr/bin/env tsx
/**
 * Delete existing changelist for a zone
 */

import { AkamaiClient } from './src/akamai-client';

const zone = 'solutionsedge.io';

async function deleteChangelist() {
  const client = new AkamaiClient();
  
  try {
    console.log(`🗑️  Deleting changelist for zone: ${zone}`);
    
    await client.request({
      path: `/config-dns/v2/changelists/${zone}`,
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    });
    
    console.log('✅ Changelist deleted successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      console.log('✅ No changelist found to delete');
    } else {
      console.error('❌ Failed to delete changelist:', error);
      throw error;
    }
  }
}

deleteChangelist();