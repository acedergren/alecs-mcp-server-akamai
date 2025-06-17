/**
 * DNS Migration Tools
 * Implements zone import via AXFR, zone file parsing, and bulk record migration
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse, DNSRecordSet } from '../types';
import { createZone, ensureCleanChangeList } from './dns-tools';

// DNS Migration Types
export interface ZoneFileRecord {
  name: string;
  ttl: number;
  class: string;
  type: string;
  rdata: string[];
}

export interface MigrationPlan {
  zone: string;
  sourceRecords: ZoneFileRecord[];
  akamaiRecords: DNSRecordSet[];
  conflicts: Array<{
    record: string;
    issue: string;
    resolution: string;
  }>;
  estimatedTime: string;
}

export interface MigrationResult {
  zone: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: Array<{
    record: string;
    error: string;
  }>;
}

/**
 * Import DNS zone via AXFR transfer
 */
export async function importZoneViaAXFR(
  client: AkamaiClient,
  args: {
    zone: string;
    masterServer: string;
    tsigKey?: {
      name: string;
      algorithm: string;
      secret: string;
    };
    contractId?: string;
    groupId?: string;
    comment?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // First, create the zone as SECONDARY
    await createZone(client, {
      zone: args.zone,
      type: 'SECONDARY',
      masters: [args.masterServer],
      comment: args.comment || `Imported from ${args.masterServer} via AXFR`,
      contractId: args.contractId,
      groupId: args.groupId,
    });

    // If TSIG key provided, update zone with TSIG configuration
    if (args.tsigKey) {
      await client.request({
        path: `/config-dns/v2/zones/${args.zone}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          zone: args.zone,
          type: 'SECONDARY',
          masters: [args.masterServer],
          tsigKey: args.tsigKey,
        },
      });
    }

    // Initiate zone transfer
    await client.request({
      path: `/config-dns/v2/zones/${args.zone}/zone-transfer`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Started AXFR import for zone ${args.zone}\n\n**Master Server:** ${args.masterServer}\n**Type:** Secondary Zone\n${args.tsigKey ? '**TSIG:** Configured\n' : ''}\n## Import Status\n\nThe zone transfer has been initiated. This typically takes 5-15 minutes depending on zone size.\n\n## Next Steps\n\n1. **Check Import Status:**\n   "Get zone ${args.zone}"\n\n2. **Convert to Primary Zone:**\n   Once imported, convert to primary for full control:\n   "Convert zone ${args.zone} to primary"\n\n3. **Review Records:**\n   "List records in zone ${args.zone}"\n\n## Migration Timeline\n\n- Zone transfer: 5-15 minutes\n- DNS propagation: 5-30 minutes (depends on TTL)\n- Full migration: 24-48 hours (wait for old TTLs to expire)\n\n⚠️ **Important:** Keep the original nameservers active during migration!`,
      }],
    };
  } catch (error) {
    return formatError('import zone via AXFR', error);
  }
}

/**
 * Parse zone file and create migration plan
 */
export async function parseZoneFile(
  _client: AkamaiClient,
  args: {
    zone: string;
    zoneFileContent: string;
    validateRecords?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    const records = parseBindZoneFile(args.zoneFileContent, args.zone);
    const akamaiRecords = convertToAkamaiFormat(records, args.zone);
    
    // Analyze migration
    const conflicts: Array<{ record: string; issue: string; resolution: string }> = [];
    const unsupportedTypes = new Set<string>();
    let totalRecords = 0;
    let migrateableRecords = 0;

    for (const record of records) {
      totalRecords++;
      
      // Check for unsupported record types
      const supportedTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'];
      if (!supportedTypes.includes(record.type)) {
        unsupportedTypes.add(record.type);
        conflicts.push({
          record: `${record.name} ${record.type}`,
          issue: `Record type ${record.type} requires manual migration`,
          resolution: 'Manually configure this record type after migration',
        });
        continue;
      }

      // Check for CNAME conflicts
      if (record.type === 'CNAME' && record.name === args.zone) {
        conflicts.push({
          record: `${record.name} CNAME`,
          issue: 'CNAME at zone apex not allowed',
          resolution: 'Use ANAME or A/AAAA records instead',
        });
        continue;
      }

      migrateableRecords++;
    }

    // Generate migration plan
    let text = `# Zone File Migration Plan - ${args.zone}\n\n`;
    text += `## Summary\n\n`;
    text += `- **Total Records:** ${totalRecords}\n`;
    text += `- **Migrateable:** ${migrateableRecords}\n`;
    text += `- **Requires Attention:** ${conflicts.length}\n`;
    text += `- **Estimated Migration Time:** ${estimateMigrationTime(totalRecords)}\n\n`;

    if (unsupportedTypes.size > 0) {
      text += `## ⚠️ Unsupported Record Types\n\n`;
      text += `The following record types need manual migration:\n`;
      Array.from(unsupportedTypes).forEach(type => {
        text += `- ${type}\n`;
      });
      text += '\n';
    }

    if (conflicts.length > 0) {
      text += `## 🔍 Issues Requiring Attention\n\n`;
      for (const conflict of conflicts) {
        text += `### ${conflict.record}\n`;
        text += `- **Issue:** ${conflict.issue}\n`;
        text += `- **Resolution:** ${conflict.resolution}\n\n`;
      }
    }

    // Show sample records
    text += `## Sample Records (First 10)\n\n`;
    text += '```\n';
    akamaiRecords.slice(0, 10).forEach(record => {
      text += `${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}\n`;
    });
    if (akamaiRecords.length > 10) {
      text += `... and ${akamaiRecords.length - 10} more records\n`;
    }
    text += '```\n\n';

    // Validation results if requested
    if (args.validateRecords) {
      text += `## Validation Results\n\n`;
      const validationResults = await validateDNSRecords(records.slice(0, 5)); // Validate first 5
      
      for (const result of validationResults) {
        text += `- **${result.name} ${result.type}:** ${result.valid ? '✅ Valid' : '❌ ' + result.error}\n`;
      }
      text += '\n';
    }

    // Migration instructions
    text += `## Migration Steps\n\n`;
    text += `1. **Create Zone:**\n   "Create primary zone ${args.zone}"\n\n`;
    text += `2. **Import Records:**\n   "Bulk import records to zone ${args.zone}"\n\n`;
    text += `3. **Verify Import:**\n   "List records in zone ${args.zone}"\n\n`;
    text += `4. **Test Resolution:**\n   Test with Akamai nameservers before switching\n\n`;
    text += `5. **Update Nameservers:**\n   Update domain registrar to use Akamai nameservers\n\n`;

    // Store parsed records for bulk import
    globalMigrationCache.set(args.zone, akamaiRecords);

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('parse zone file', error);
  }
}

/**
 * Bulk import records to zone
 */
export async function bulkImportRecords(
  client: AkamaiClient,
  args: {
    zone: string;
    records?: DNSRecordSet[];
    skipValidation?: boolean;
    comment?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Get records from cache or args
    const records = args.records || globalMigrationCache.get(args.zone);
    if (!records || records.length === 0) {
      throw new Error('No records to import. Parse a zone file first or provide records.');
    }

    // Ensure we have a clean change list
    await ensureCleanChangeList(client, args.zone);

    // Add records in batches
    const batchSize = 50;
    const errors: Array<{ record: string; error: string }> = [];
    let successCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Skip validation if requested
          if (!args.skipValidation) {
            const validation = await validateSingleRecord(record);
            if (!validation.valid) {
              errors.push({
                record: `${record.name} ${record.type}`,
                error: validation.error || 'Validation failed',
              });
              continue;
            }
          }

          // Add record to change list
          await client.request({
            path: `/config-dns/v2/changelists/${args.zone}/recordsets/${record.name}/${record.type}`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: record,
          });
          
          successCount++;
        } catch (error) {
          errors.push({
            record: `${record.name} ${record.type}`,
            error: error instanceof Error ? error.message : JSON.stringify(error),
          });
        }
      }

      // Show progress
      if (i + batchSize < records.length) {
        console.error(`Progress: ${Math.min(i + batchSize, records.length)}/${records.length} records processed`);
      }
    }

    // Submit changelist if we have successful records
    let submitResponse: any = {};
    if (successCount > 0) {
      submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          comment: args.comment || `Bulk import of ${successCount} records`,
        },
      });
    }

    // Clear cache after processing (whether successful or not)
    globalMigrationCache.delete(args.zone);

    // Format results
    let text = `# Bulk Import Results - ${args.zone}\n\n`;
    text += `## Summary\n\n`;
    text += `- **Total Records:** ${records.length}\n`;
    text += `- **Successfully Imported:** ${successCount} ✅\n`;
    text += `- **Failed:** ${errors.length} ❌\n`;
    text += `- **Request ID:** ${submitResponse.requestId || submitResponse.changeListId || 'N/A'}\n`;
    text += `- **Status:** ${successCount > 0 ? 'Changes submitted' : 'No changes made'}\n\n`;

    if (errors.length > 0) {
      text += `## ❌ Failed Records\n\n`;
      errors.slice(0, 20).forEach(error => {
        text += `- **${error.record}:** ${error.error}\n`;
      });
      if (errors.length > 20) {
        text += `\n... and ${errors.length - 20} more errors\n`;
      }
      text += '\n';
    }

    text += `## Next Steps\n\n`;
    text += `1. **Verify Import:**\n   "List records in zone ${args.zone}"\n\n`;
    text += `2. **Test Resolution:**\n   \`dig @use4-akadns.net ${args.zone} SOA\`\n\n`;
    text += `3. **Fix Failed Records:**\n   Review and manually add any failed records\n\n`;
    
    if (successCount > 0) {
      text += `## 🎉 Success!\n\n`;
      text += `Your DNS records have been imported to Akamai Edge DNS.\n\n`;
      text += `**Akamai Nameservers:**\n`;
      text += `- use.akadns.net\n`;
      text += `- use4.akadns.net\n`;
      text += `- use2.akadns.net\n`;
      text += `- use3.akadns.net\n\n`;
      text += `⚠️ **Important:** Don't update your domain registrar until you've verified all records are working correctly!`;
    }

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('bulk import records', error);
  }
}

/**
 * Convert secondary zone to primary
 */
export async function convertZoneToPrimary(
  client: AkamaiClient,
  args: {
    zone: string;
    comment?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Get current zone config
    const currentZone = await client.request({
      path: `/config-dns/v2/zones/${args.zone}`,
      method: 'GET',
    });

    if (currentZone.type !== 'SECONDARY') {
      return {
        content: [{
          type: 'text',
          text: `Zone ${args.zone} is already a ${currentZone.type} zone.`,
        }],
      };
    }

    // Update zone type
    await client.request({
      path: `/config-dns/v2/zones/${args.zone}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        zone: args.zone,
        type: 'PRIMARY',
        comment: args.comment || 'Converted from secondary to primary zone',
      },
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Successfully converted ${args.zone} to PRIMARY zone\n\n## What Changed\n\n- **Before:** Secondary zone (read-only, synced from master)\n- **After:** Primary zone (full control, authoritative)\n\n## Benefits\n\n- Full control over all DNS records\n- Can add, modify, delete records\n- No dependency on external master server\n- Integrated with Akamai CDN services\n\n## Next Steps\n\n1. **Review Records:**\n   "List records in zone ${args.zone}"\n\n2. **Add CDN Records:**\n   "Create CNAME record www.${args.zone} pointing to www.${args.zone}.edgesuite.net"\n\n3. **Update Nameservers:**\n   Update your domain registrar to use Akamai nameservers`,
      }],
    };
  } catch (error) {
    return formatError('convert zone to primary', error);
  }
}

/**
 * Generate migration instructions
 */
export async function generateMigrationInstructions(
  client: AkamaiClient,
  args: {
    zone: string;
    currentNameservers?: string[];
    estimateDowntime?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    // Get zone details
    await client.request({
      path: `/config-dns/v2/zones/${args.zone}`,
      method: 'GET',
    });

    // Get record count
    const recordsResponse = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/recordsets`,
      method: 'GET',
    });
    const recordCount = recordsResponse.recordsets?.length || 0;

    let text = `# DNS Migration Instructions - ${args.zone}\n\n`;
    text += `## Pre-Migration Checklist\n\n`;
    text += `- [ ] Zone created in Akamai Edge DNS\n`;
    text += `- [ ] All records imported (${recordCount} records found)\n`;
    text += `- [ ] Critical records verified (A, AAAA, CNAME, MX)\n`;
    text += `- [ ] TTLs reviewed and adjusted if needed\n`;
    text += `- [ ] Monitoring configured\n\n`;

    text += `## Current Configuration\n\n`;
    if (args.currentNameservers && args.currentNameservers.length > 0) {
      text += `**Current Nameservers:**\n`;
      args.currentNameservers.forEach(ns => {
        text += `- ${ns}\n`;
      });
      text += '\n';
    }

    text += `**Akamai Nameservers:**\n`;
    text += `- use.akadns.net\n`;
    text += `- use4.akadns.net\n`;
    text += `- use2.akadns.net\n`;
    text += `- use3.akadns.net\n\n`;

    text += `## Migration Steps\n\n`;
    text += `### Phase 1: Preparation (Day 1)\n\n`;
    text += `1. **Lower TTLs** (24 hours before migration)\n`;
    text += `   - Reduce TTL on NS records to 300 seconds\n`;
    text += `   - Reduce TTL on critical records to 300 seconds\n\n`;
    text += `2. **Final Sync**\n`;
    text += `   - Import any last-minute record changes\n`;
    text += `   - Verify all records match source\n\n`;
    text += `3. **Testing**\n`;
    text += `   \`\`\`bash\n`;
    text += `   # Test resolution from Akamai nameservers\n`;
    text += `   dig @use4-akadns.net ${args.zone} ANY\n`;
    text += `   dig @use4-akadns.net www.${args.zone} A\n`;
    text += `   dig @use4-akadns.net ${args.zone} MX\n`;
    text += `   \`\`\`\n\n`;

    text += `### Phase 2: Migration (Day 2)\n\n`;
    text += `1. **Update Domain Registrar**\n`;
    text += `   - Log into your domain registrar\n`;
    text += `   - Replace nameservers with Akamai nameservers\n`;
    text += `   - Save changes\n\n`;
    text += `2. **Monitor Propagation**\n`;
    text += `   \`\`\`bash\n`;
    text += `   # Check nameserver propagation\n`;
    text += `   dig ${args.zone} NS +trace\n`;
    text += `   \n`;
    text += `   # Monitor from multiple locations\n`;
    text += `   # Use online tools like whatsmydns.net\n`;
    text += `   \`\`\`\n\n`;

    text += `### Phase 3: Validation (Day 2-3)\n\n`;
    text += `1. **Verify Services**\n`;
    text += `   - [ ] Website loads correctly\n`;
    text += `   - [ ] Email delivery working\n`;
    text += `   - [ ] All subdomains resolving\n`;
    text += `   - [ ] API endpoints accessible\n\n`;
    text += `2. **Check Logs**\n`;
    text += `   - Monitor application logs for DNS errors\n`;
    text += `   - Check email delivery logs\n`;
    text += `   - Review CDN hit rates\n\n`;

    text += `### Phase 4: Cleanup (Day 7)\n\n`;
    text += `1. **Restore TTLs**\n`;
    text += `   - Increase TTLs back to normal values\n`;
    text += `   - Typical: 3600 (1 hour) or 86400 (24 hours)\n\n`;
    text += `2. **Decommission Old DNS**\n`;
    text += `   - Keep old nameservers active for 7 days\n`;
    text += `   - Monitor query logs for stragglers\n`;
    text += `   - Safely decommission after no queries\n\n`;

    if (args.estimateDowntime) {
      text += `## Downtime Estimation\n\n`;
      text += `**Expected Downtime:** ZERO\n\n`;
      text += `When done correctly, DNS migration has no downtime:\n`;
      text += `- Both old and new nameservers serve identical records\n`;
      text += `- Clients gradually switch to new nameservers\n`;
      text += `- No service interruption\n\n`;
      text += `**Propagation Timeline:**\n`;
      text += `- 50% of clients: 1-4 hours\n`;
      text += `- 90% of clients: 4-24 hours\n`;
      text += `- 99% of clients: 24-48 hours\n`;
      text += `- Complete: up to 72 hours\n\n`;
    }

    text += `## Emergency Rollback\n\n`;
    text += `If issues arise:\n\n`;
    text += `1. **Immediate:** Change nameservers back at registrar\n`;
    text += `2. **Wait:** 5-15 minutes for registrar update\n`;
    text += `3. **Force:** Flush DNS caches if critical\n\n`;
    text += `⚠️ **Keep old nameservers active for at least 7 days!**\n\n`;

    text += `## Support Contacts\n\n`;
    text += `- **Akamai Support:** support@akamai.com\n`;
    text += `- **Domain Registrar:** Check your registrar's support page\n`;
    text += `- **Your Team:** Define escalation contacts\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('generate migration instructions', error);
  }
}

/**
 * Import DNS zone from Cloudflare using their API
 */
export async function importFromCloudflare(
  client: AkamaiClient,
  args: {
    zone: string;
    cloudflareApiToken: string;
    contractId?: string;
    groupId?: string;
    includeProxiedRecords?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    // Step 1: Get zone information from Cloudflare
    const cfZonesResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${args.zone}`,
      {
        headers: {
          'Authorization': `Bearer ${args.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!cfZonesResponse.ok) {
      throw new Error(`Cloudflare API error: ${cfZonesResponse.statusText}`);
    }
    
    const zonesData = await cfZonesResponse.json() as any;
    if (!zonesData.result || zonesData.result.length === 0) {
      throw new Error(`Zone ${args.zone} not found in Cloudflare account`);
    }
    
    const cfZone = zonesData.result[0];
    const zoneId = cfZone.id;
    
    // Step 2: Create zone in Akamai as PRIMARY
    await createZone(client, {
      zone: args.zone,
      type: 'PRIMARY',
      comment: `Imported from Cloudflare on ${new Date().toISOString()}`,
      contractId: args.contractId,
      groupId: args.groupId,
    });
    
    // Step 3: Get all DNS records from Cloudflare
    let allRecords: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const cfRecordsResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?page=${page}&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${args.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!cfRecordsResponse.ok) {
        throw new Error(`Failed to fetch DNS records: ${cfRecordsResponse.statusText}`);
      }
      
      const recordsData = await cfRecordsResponse.json() as any;
      allRecords = allRecords.concat(recordsData.result);
      
      if (recordsData.result_info.page >= recordsData.result_info.total_pages) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    // Step 4: Convert and import records
    const records: DNSRecordSet[] = [];
    const skippedRecords: string[] = [];
    
    for (const cfRecord of allRecords) {
      // Skip proxied records if not requested
      if (cfRecord.proxied && !args.includeProxiedRecords) {
        skippedRecords.push(`${cfRecord.name} (${cfRecord.type}) - Cloudflare proxied`);
        continue;
      }
      
      // Skip unsupported record types
      const supportedTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA'];
      if (!supportedTypes.includes(cfRecord.type)) {
        skippedRecords.push(`${cfRecord.name} (${cfRecord.type}) - Unsupported type`);
        continue;
      }
      
      // Convert Cloudflare record to Akamai format
      const akamaiRecord: DNSRecordSet = {
        name: cfRecord.name,
        type: cfRecord.type,
        ttl: cfRecord.ttl === 1 ? 300 : cfRecord.ttl, // Cloudflare uses 1 for 'automatic'
        rdata: [],
      };
      
      // Format rdata based on record type
      switch (cfRecord.type) {
        case 'MX':
          akamaiRecord.rdata = [`${cfRecord.priority} ${cfRecord.content}`];
          break;
        case 'TXT':
          // Cloudflare may have quotes, ensure proper formatting
          akamaiRecord.rdata = [cfRecord.content.replace(/^"|"$/g, '')];
          break;
        case 'CAA':
          const parts = cfRecord.data;
          akamaiRecord.rdata = [`${parts.flags} ${parts.tag} "${parts.value}"`];
          break;
        default:
          akamaiRecord.rdata = [cfRecord.content];
      }
      
      records.push(akamaiRecord);
    }
    
    // Step 5: Bulk import records
    await bulkImportRecords(client, {
      zone: args.zone,
      records,
      comment: `Cloudflare import - ${records.length} records`,
    });
    
    // Format results
    let text = `# Cloudflare Import Results - ${args.zone}\n\n`;
    text += `## Summary\n\n`;
    text += `- **Cloudflare Zone ID:** ${zoneId}\n`;
    text += `- **Total Records Found:** ${allRecords.length}\n`;
    text += `- **Records Imported:** ${records.length}\n`;
    text += `- **Records Skipped:** ${skippedRecords.length}\n\n`;
    
    if (skippedRecords.length > 0) {
      text += `## Skipped Records\n\n`;
      skippedRecords.forEach(record => {
        text += `- ${record}\n`;
      });
      text += `\n`;
    }
    
    text += `## Next Steps\n\n`;
    text += `1. **Review imported records:**\n`;
    text += `   "List records in zone ${args.zone}"\n\n`;
    text += `2. **Update nameservers at registrar:**\n`;
    text += `   - Remove Cloudflare nameservers\n`;
    text += `   - Add Akamai nameservers:\n`;
    text += `     - use.akadns.net\n`;
    text += `     - use4.akadns.net\n\n`;
    text += `3. **Configure CDN if needed:**\n`;
    text += `   - Create property for ${args.zone}\n`;
    text += `   - Add CNAME records for CDN delivery\n\n`;
    
    if (allRecords.some((r: any) => r.proxied)) {
      text += `⚠️ **Note:** Some records were proxied through Cloudflare.\n`;
      text += `You may need to configure similar security features in Akamai.\n`;
    }
    
    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('import from Cloudflare', error);
  }
}

// Helper Functions

/**
 * Parse BIND-style zone file
 */
function parseBindZoneFile(content: string, zone: string): ZoneFileRecord[] {
  const records: ZoneFileRecord[] = [];
  const lines = content.split('\n');
  
  let currentTTL = 86400; // Default TTL
  let currentName = zone;
  
  for (const line of lines) {
    // Skip comments and empty lines
    const lineParts = line.split(';');
    const cleanLine = lineParts[0] ? lineParts[0].trim() : '';
    if (!cleanLine) continue;
    
    // Handle $TTL directive
    if (cleanLine.startsWith('$TTL')) {
      const ttlMatch = cleanLine.match(/\$TTL\s+(\d+)/);
      if (ttlMatch && ttlMatch[1]) {
        currentTTL = parseInt(ttlMatch[1]);
      }
      continue;
    }
    
    // Skip other directives
    if (cleanLine.startsWith('$')) continue;
    
    // Parse record
    const parts = cleanLine.split(/\s+/);
    if (parts.length < 3) continue;
    
    let name: string;
    let ttl: number;
    let recordClass: string;
    let type: string;
    let rdata: string[];
    
    // Determine field positions
    let fieldIndex = 0;
    
    // Name field (could be @, *, or actual name)
    if (parts[0] === '@') {
      name = zone;
    } else if (parts[0] === '') {
      name = currentName; // Continue from previous record
    } else {
      const namePart = parts[0];
      if (!namePart) {
        continue; // Skip if no name
      }
      if (!namePart.endsWith('.')) {
        name = namePart === '*' ? `*.${zone}` : `${namePart}.${zone}`;
      } else {
        name = namePart.slice(0, -1); // Remove trailing dot
      }
    }
    currentName = name;
    fieldIndex++;
    
    // Check for TTL
    const ttlField = fieldIndex < parts.length ? parts[fieldIndex] : undefined;
    if (ttlField && /^\d+$/.test(ttlField)) {
      ttl = parseInt(ttlField);
      fieldIndex++;
    } else {
      ttl = currentTTL;
    }
    
    // Check for class
    const classField = fieldIndex < parts.length ? parts[fieldIndex] : undefined;
    if (classField && classField.toUpperCase() === 'IN') {
      recordClass = 'IN';
      fieldIndex++;
    } else {
      recordClass = 'IN';
    }
    
    // Type
    const typeField = fieldIndex < parts.length ? parts[fieldIndex] : undefined;
    type = typeField ? typeField.toUpperCase() : '';
    if (!type) continue;
    fieldIndex++;
    
    // Rest is RDATA
    rdata = parts.slice(fieldIndex);
    
    // Special handling for different record types
    switch (type) {
      case 'MX':
        // MX records need priority as part of rdata
        if (rdata.length >= 2) {
          records.push({ name, ttl, class: recordClass, type, rdata });
        }
        break;
        
      case 'TXT':
        // Concatenate TXT record data
        const txtData = rdata.join(' ').replace(/"/g, '');
        records.push({ name, ttl, class: recordClass, type, rdata: [txtData] });
        break;
        
      case 'SRV':
        // SRV records need all parts
        if (rdata.length >= 4) {
          records.push({ name, ttl, class: recordClass, type, rdata });
        }
        break;
        
      default:
        // Simple records (A, AAAA, CNAME, NS, etc.)
        records.push({ name, ttl, class: recordClass, type, rdata });
    }
  }
  
  return records;
}

/**
 * Convert zone file records to Akamai format
 */
function convertToAkamaiFormat(records: ZoneFileRecord[], _zone: string): DNSRecordSet[] {
  const akamaiRecords: DNSRecordSet[] = [];
  
  // Group records by name and type
  const grouped = new Map<string, ZoneFileRecord[]>();
  
  for (const record of records) {
    const key = `${record.name}|${record.type}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(record);
  }
  
  // Convert grouped records
  for (const [key, groupedRecords] of grouped) {
    const [name, type] = key.split('|');
    const firstRecord = groupedRecords[0];
    
    if (!firstRecord || !name || !type) continue;
    
    // Combine rdata from all records in group
    const rdata: string[] = [];
    
    for (const record of groupedRecords) {
      switch (type) {
        case 'MX':
          // Format: priority hostname
          if (record.rdata.length >= 2) {
            const priority = record.rdata[0];
            const hostnameField = record.rdata[1];
            if (hostnameField) {
              const hostname = hostnameField.endsWith('.') 
                ? hostnameField.slice(0, -1) 
                : hostnameField;
              rdata.push(`${priority} ${hostname}`);
            }
          }
          break;
          
        case 'TXT':
          // TXT records might need quotes
          if (record.rdata.length > 0 && record.rdata[0]) {
            rdata.push(record.rdata[0]);
          }
          break;
          
        case 'SRV':
          // Format: priority weight port target
          if (record.rdata.length >= 4) {
            const targetField = record.rdata[3];
            if (targetField) {
              const target = targetField.endsWith('.')
                ? targetField.slice(0, -1)
                : targetField;
              rdata.push(`${record.rdata[0]} ${record.rdata[1]} ${record.rdata[2]} ${target}`);
            }
          }
          break;
          
        case 'CNAME':
        case 'NS':
          // Remove trailing dots
          if (record.rdata.length > 0) {
            const targetField = record.rdata[0];
            if (targetField) {
              const target = targetField.endsWith('.')
                ? targetField.slice(0, -1)
                : targetField;
              rdata.push(target);
            }
          }
          break;
          
        default:
          // A, AAAA, and others - use as is
          rdata.push(...record.rdata);
      }
    }
    
    akamaiRecords.push({
      name: name,
      type: type,
      ttl: firstRecord.ttl,
      rdata: rdata,
    });
  }
  
  return akamaiRecords;
}

/**
 * Validate DNS records (basic validation)
 */
async function validateDNSRecords(records: ZoneFileRecord[]): Promise<Array<{
  name: string;
  type: string;
  valid: boolean;
  error?: string;
}>> {
  const results = [];
  
  for (const record of records) {
    try {
      const result = await validateSingleRecord({
        name: record.name,
        type: record.type,
        ttl: record.ttl,
        rdata: record.rdata,
      });
      results.push(result);
    } catch (error) {
      results.push({
        name: record.name,
        type: record.type,
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      });
    }
  }
  
  return results;
}

/**
 * Validate a single DNS record
 */
async function validateSingleRecord(record: DNSRecordSet): Promise<{
  name: string;
  type: string;
  valid: boolean;
  error?: string;
}> {
  try {
    switch (record.type) {
      case 'A':
        // Validate IPv4 addresses
        for (const ip of record.rdata) {
          if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            return { name: record.name, type: record.type, valid: false, error: 'Invalid IPv4 address' };
          }
          const parts = ip.split('.').map(Number);
          if (parts.some(p => p > 255)) {
            return { name: record.name, type: record.type, valid: false, error: 'Invalid IPv4 octet' };
          }
        }
        break;
        
      case 'AAAA':
        // Validate IPv6 addresses
        for (const ip of record.rdata) {
          if (!/^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/.test(ip) && 
              !/^::1$/.test(ip) && 
              !/^([\da-fA-F]{1,4}:){1,7}:$/.test(ip)) {
            return { name: record.name, type: record.type, valid: false, error: 'Invalid IPv6 address' };
          }
        }
        break;
        
      case 'CNAME':
        // CNAME should have exactly one target
        if (record.rdata.length !== 1) {
          return { name: record.name, type: record.type, valid: false, error: 'CNAME must have exactly one target' };
        }
        break;
        
      case 'MX':
        // Validate MX format
        for (const mx of record.rdata) {
          if (!/^\d+ \S+$/.test(mx)) {
            return { name: record.name, type: record.type, valid: false, error: 'Invalid MX format (priority hostname)' };
          }
        }
        break;
        
      case 'TXT':
        // TXT records can contain anything
        break;
        
      default:
        // Basic validation passed
        break;
    }
    
    return { name: record.name, type: record.type, valid: true };
  } catch (error) {
    return {
      name: record.name,
      type: record.type,
      valid: false,
      error: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

/**
 * Estimate migration time based on record count
 */
function estimateMigrationTime(recordCount: number): string {
  if (recordCount < 100) {
    return '5-10 minutes';
  } else if (recordCount < 500) {
    return '10-20 minutes';
  } else if (recordCount < 1000) {
    return '20-30 minutes';
  } else {
    return `${Math.ceil(recordCount / 50)} minutes (approx)`;
  }
}

// Global cache for migration data
const globalMigrationCache = new Map<string, DNSRecordSet[]>();

/**
 * Format error responses
 */
function formatError(operation: string, error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  let solution = '';
  
  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;
    
    // Provide specific solutions
    if (error.message.includes('zone') && error.message.includes('exist')) {
      solution = '**Solution:** Create the zone first using "Create primary zone [domain]"';
    } else if (error.message.includes('parse')) {
      solution = '**Solution:** Check zone file format. Ensure it follows BIND format.';
    } else if (error.message.includes('AXFR')) {
      solution = '**Solution:** Ensure the master server allows zone transfers from Akamai IPs.';
    }
  } else {
    errorMessage += `: ${String(error)}`;
  }
  
  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}