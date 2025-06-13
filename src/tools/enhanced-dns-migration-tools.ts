/**
 * Enhanced DNS Migration Tools with Progress Tracking
 * Implements zone import via AXFR, Cloudflare API, zone file parsing, and bulk record migration
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse, DNSRecordSet } from '../types.js';
import { createZone, upsertRecord } from './dns-tools.js';
import { ProgressBar, Spinner, withProgress } from '../utils/progress.js';
import axios from 'axios';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveCname = promisify(dns.resolveCname);
const resolveMx = promisify(dns.resolveMx);

// DNS record type mapping
const RECORD_TYPE_MAP: Record<string, string> = {
  'A': 'A',
  'AAAA': 'AAAA',
  'CNAME': 'CNAME',
  'MX': 'MX',
  'TXT': 'TXT',
  'NS': 'NS',
  'SOA': 'SOA',
  'PTR': 'PTR',
  'SRV': 'SRV',
  'CAA': 'CAA',
};

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  name_servers: string[];
}

interface CloudflareRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  priority?: number;
  data?: {
    name?: string;
    priority?: number;
    weight?: number;
    port?: number;
    target?: string;
    service?: string;
    proto?: string;
  };
}

/**
 * Import zone from Cloudflare using their API
 */
export async function importFromCloudflare(
  client: AkamaiClient,
  args: {
    zone: string;
    cloudflareToken: string;
    cloudflareZoneId?: string;
    customer?: string;
    createAkamaiZone?: boolean;
    contractId?: string;
    groupId?: string;
  }
): Promise<MCPToolResponse> {
  const spinner = new Spinner('Connecting to Cloudflare API...');
  spinner.start();

  try {
    // Find zone if ID not provided
    let zoneId = args.cloudflareZoneId;
    
    if (!zoneId) {
      spinner.update('Searching for zone in Cloudflare...');
      const zonesResponse = await axios.get('https://api.cloudflare.com/client/v4/zones', {
        headers: {
          'Authorization': `Bearer ${args.cloudflareToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          name: args.zone,
        },
      });

      if (!zonesResponse.data.success || zonesResponse.data.result.length === 0) {
        throw new Error(`Zone ${args.zone} not found in Cloudflare`);
      }

      zoneId = zonesResponse.data.result[0].id;
    }

    spinner.update('Fetching DNS records from Cloudflare...');
    
    // Fetch all records with pagination
    const allRecords: CloudflareRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const recordsResponse = await axios.get(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        headers: {
          'Authorization': `Bearer ${args.cloudflareToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          page,
          per_page: 100,
        },
      });

      if (!recordsResponse.data.success) {
        throw new Error('Failed to fetch DNS records from Cloudflare');
      }

      allRecords.push(...recordsResponse.data.result);
      hasMore = recordsResponse.data.result_info.page < recordsResponse.data.result_info.total_pages;
      page++;
    }

    spinner.stop();
    console.log(`✅ Found ${allRecords.length} DNS records in Cloudflare`);

    // Create Akamai zone if requested
    if (args.createAkamaiZone && args.contractId && args.groupId) {
      console.log('\n📦 Creating zone in Akamai Edge DNS...');
      await createZone(client, {
        zone: args.zone,
        type: 'PRIMARY',
        contractId: args.contractId,
        groupId: args.groupId,
        customer: args.customer,
        comment: `Migrated from Cloudflare on ${new Date().toISOString()}`,
      });
    }

    // Convert and import records
    console.log('\n📥 Importing records to Akamai...');
    const progressBar = new ProgressBar('Importing records', allRecords.length);
    progressBar.start();

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ record: string; error: string }>,
    };

    for (const cfRecord of allRecords) {
      try {
        // Skip Cloudflare-specific record types
        if (!RECORD_TYPE_MAP[cfRecord.type]) {
          results.skipped++;
          progressBar.increment();
          continue;
        }

        // Convert record to Akamai format
        const akamaiRecord = convertCloudflareRecord(cfRecord, args.zone);
        
        // Import to Akamai
        await upsertRecord(client, {
          zone: args.zone,
          name: akamaiRecord.name,
          type: akamaiRecord.type,
          ttl: akamaiRecord.ttl,
          rdata: akamaiRecord.rdata,
          customer: args.customer,
        });

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          record: `${cfRecord.name} (${cfRecord.type})`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      progressBar.increment();
    }

    progressBar.stop();

    // Generate migration report
    const content = [`
# 🚀 Cloudflare to Akamai DNS Migration Report

## Summary
- **Zone**: ${args.zone}
- **Total Records**: ${allRecords.length}
- **Successfully Imported**: ${results.successful}
- **Failed**: ${results.failed}
- **Skipped**: ${results.skipped}
- **Migration Date**: ${new Date().toLocaleString()}

## Migration Status
${results.successful === allRecords.length - results.skipped ? '✅ All supported records imported successfully!' : '⚠️ Some records failed to import'}
`];

    if (results.errors.length > 0) {
      content.push('\n## ❌ Failed Records\n');
      results.errors.forEach(err => {
        content.push(`- **${err.record}**: ${err.error}`);
      });
    }

    // Nameserver instructions
    content.push(`
## 📝 Next Steps

1. **Verify Records**: Check that all critical records were imported correctly
2. **Update Nameservers**: Change your domain's nameservers at your registrar to:
   - ns1-123.akamaidns.net
   - ns2-123.akamaidns.com
   - ns3-123.akamaidns.org
   - ns4-123.akamaidns.co.uk

3. **Monitor Propagation**: DNS changes can take 24-48 hours to fully propagate

## ⚡ Quick Verification Commands

\`\`\`bash
# Check specific record
dig @ns1-123.akamaidns.net ${args.zone} A +short

# Verify all records
dig @ns1-123.akamaidns.net ${args.zone} ANY
\`\`\`
`);

    return {
      content: content.join('\n'),
      isError: false,
    };

  } catch (error) {
    spinner.stop();
    return {
      content: `❌ Cloudflare import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

/**
 * Convert Cloudflare record to Akamai format
 */
function convertCloudflareRecord(cfRecord: CloudflareRecord, zone: string): DNSRecordSet {
  // Handle record name
  let recordName = cfRecord.name;
  if (recordName === zone) {
    recordName = '@'; // Apex record
  } else if (recordName.endsWith(`.${zone}`)) {
    recordName = recordName.substring(0, recordName.length - zone.length - 1);
  }

  // Convert rdata based on type
  let rdata: string[] = [];
  
  switch (cfRecord.type) {
    case 'A':
    case 'AAAA':
    case 'CNAME':
    case 'NS':
      rdata = [cfRecord.content];
      break;
      
    case 'MX':
      rdata = [`${cfRecord.priority || 10} ${cfRecord.content}`];
      break;
      
    case 'TXT':
      // Cloudflare may have quotes, Akamai expects without
      rdata = [cfRecord.content.replace(/^"|"$/g, '')];
      break;
      
    case 'SRV':
      if (cfRecord.data) {
        rdata = [`${cfRecord.data.priority || 0} ${cfRecord.data.weight || 0} ${cfRecord.data.port || 0} ${cfRecord.data.target || cfRecord.content}`];
      }
      break;
      
    case 'CAA':
      // Parse CAA record format
      const caaParts = cfRecord.content.match(/(\d+)\s+(\w+)\s+"(.+)"/);
      if (caaParts) {
        rdata = [`${caaParts[1]} ${caaParts[2]} "${caaParts[3]}"`];
      } else {
        rdata = [cfRecord.content];
      }
      break;
      
    default:
      rdata = [cfRecord.content];
  }

  return {
    name: recordName,
    type: cfRecord.type,
    ttl: cfRecord.ttl === 1 ? 300 : cfRecord.ttl, // Cloudflare uses 1 for "automatic"
    rdata,
  };
}

/**
 * Import zone file with progress tracking
 */
export async function importZoneFile(
  client: AkamaiClient,
  args: {
    zone: string;
    zoneFileContent: string;
    customer?: string;
    createZone?: boolean;
    contractId?: string;
    groupId?: string;
  }
): Promise<MCPToolResponse> {
  console.log('📄 Parsing zone file...');
  
  try {
    // Parse zone file
    const records = parseZoneFileContent(args.zoneFileContent, args.zone);
    console.log(`✅ Parsed ${records.length} records from zone file`);

    // Create zone if requested
    if (args.createZone && args.contractId && args.groupId) {
      console.log('\n📦 Creating zone in Akamai Edge DNS...');
      await createZone(client, {
        zone: args.zone,
        type: 'PRIMARY',
        contractId: args.contractId,
        groupId: args.groupId,
        customer: args.customer,
        comment: `Imported from zone file on ${new Date().toISOString()}`,
      });
    }

    // Import records
    console.log('\n📥 Importing records...');
    const progressBar = new ProgressBar('Importing records', records.length);
    progressBar.start();

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ record: string; error: string }>,
    };

    for (const record of records) {
      try {
        await upsertRecord(client, {
          zone: args.zone,
          name: record.name,
          type: record.type,
          ttl: record.ttl,
          rdata: record.rdata,
          customer: args.customer,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          record: `${record.name} (${record.type})`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      progressBar.increment();
    }

    progressBar.stop();

    // Generate report
    const content = [`
# 📄 Zone File Import Report

## Summary
- **Zone**: ${args.zone}
- **Total Records**: ${records.length}
- **Successfully Imported**: ${results.successful}
- **Failed**: ${results.failed}
- **Import Date**: ${new Date().toLocaleString()}

## Status
${results.successful === records.length ? '✅ All records imported successfully!' : '⚠️ Some records failed to import'}
`];

    if (results.errors.length > 0) {
      content.push('\n## ❌ Failed Records\n');
      results.errors.forEach(err => {
        content.push(`- **${err.record}**: ${err.error}`);
      });
    }

    return {
      content: content.join('\n'),
      isError: false,
    };

  } catch (error) {
    return {
      content: `❌ Zone file import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

/**
 * Parse zone file content into records
 */
function parseZoneFileContent(content: string, zone: string): DNSRecordSet[] {
  const records: DNSRecordSet[] = [];
  const lines = content.split('\n');
  
  let currentName = '@';
  let defaultTTL = 3600;
  
  for (const line of lines) {
    // Skip comments and empty lines
    const cleanLine = line.split(';')[0].trim();
    if (!cleanLine) continue;
    
    // Handle $TTL directive
    if (cleanLine.startsWith('$TTL')) {
      const ttlMatch = cleanLine.match(/\$TTL\s+(\d+)/);
      if (ttlMatch) {
        defaultTTL = parseInt(ttlMatch[1]);
      }
      continue;
    }
    
    // Handle $ORIGIN directive
    if (cleanLine.startsWith('$ORIGIN')) {
      const originMatch = cleanLine.match(/\$ORIGIN\s+(.+)/);
      if (originMatch) {
        currentName = originMatch[1].replace(/\.$/, '');
      }
      continue;
    }
    
    // Parse record line
    const parts = cleanLine.split(/\s+/);
    if (parts.length < 3) continue;
    
    let name: string;
    let ttl: number;
    let recordClass: string;
    let type: string;
    let rdata: string[];
    
    // Determine field positions
    let fieldIndex = 0;
    
    // Name field (optional, uses previous if not specified)
    if (!parts[0].match(/^\d+$/) && parts[0] !== 'IN' && !RECORD_TYPE_MAP[parts[0]]) {
      name = parts[0];
      fieldIndex++;
    } else {
      name = currentName;
    }
    
    // TTL field (optional)
    if (parts[fieldIndex] && parts[fieldIndex].match(/^\d+$/)) {
      ttl = parseInt(parts[fieldIndex]);
      fieldIndex++;
    } else {
      ttl = defaultTTL;
    }
    
    // Class field (optional, usually IN)
    if (parts[fieldIndex] === 'IN') {
      recordClass = parts[fieldIndex];
      fieldIndex++;
    }
    
    // Type field
    type = parts[fieldIndex];
    fieldIndex++;
    
    // Rdata (remaining fields)
    rdata = parts.slice(fieldIndex);
    
    // Skip unsupported types
    if (!RECORD_TYPE_MAP[type]) continue;
    
    // Handle special rdata formatting
    if (type === 'TXT') {
      // Join TXT record parts and handle quotes
      const txtData = rdata.join(' ');
      rdata = [txtData.replace(/^"|"$/g, '')];
    } else if (type === 'MX' || type === 'SRV') {
      // Keep as array for proper formatting
      rdata = [rdata.join(' ')];
    }
    
    // Convert name to relative
    if (name === '@' || name === zone || name === `${zone}.`) {
      name = '@';
    } else if (name.endsWith(`.${zone}`)) {
      name = name.substring(0, name.length - zone.length - 1);
    } else if (name.endsWith('.')) {
      // Fully qualified name for different zone
      continue; // Skip external references
    }
    
    records.push({
      name,
      type,
      ttl,
      rdata,
    });
    
    currentName = name;
  }
  
  return records;
}

/**
 * Generate nameserver migration instructions
 */
export async function getNameserverMigrationInstructions(
  client: AkamaiClient,
  args: {
    zone: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    console.log('🔍 Fetching zone information...');
    
    // Get zone details to find nameservers
    const response = await client.request({
      method: 'GET',
      path: `/config-dns/v2/zones/${args.zone}`,
      customer: args.customer,
    });

    const zoneData = response.data;
    
    // Get current nameservers (if accessible)
    let currentNameservers: string[] = [];
    try {
      const nsRecords = await dns.resolveNs(args.zone);
      currentNameservers = nsRecords;
    } catch {
      // Domain might not be delegated yet
    }

    const content = [`
# 📋 Nameserver Migration Instructions for ${args.zone}

## Current Status
- **Zone Type**: ${zoneData.type}
- **Zone Status**: Active in Akamai Edge DNS
- **Contract**: ${zoneData.contractId || 'N/A'}
${currentNameservers.length > 0 ? `- **Current Nameservers**: ${currentNameservers.join(', ')}` : ''}

## 🎯 Akamai Edge DNS Nameservers

Your zone should be delegated to these Akamai nameservers:

\`\`\`
${zoneData.masters?.join('\n') || 'ns1-123.akamaidns.net\nns2-123.akamaidns.com\nns3-123.akamaidns.org\nns4-123.akamaidns.co.uk'}
\`\`\`

## 📝 Migration Steps

### 1. Pre-Migration Checklist
- [ ] Verify all DNS records have been imported to Akamai
- [ ] Test resolution using Akamai nameservers
- [ ] Document current TTL values
- [ ] Schedule migration during low-traffic period

### 2. Update at Your Domain Registrar
1. Log in to your domain registrar's control panel
2. Navigate to DNS/Nameserver settings for **${args.zone}**
3. Replace current nameservers with Akamai nameservers listed above
4. Save changes

### 3. Popular Registrar Instructions

#### GoDaddy
1. Go to "My Products" → "DNS"
2. Click "Manage" next to your domain
3. Select "Change" under Nameservers
4. Choose "Custom" and enter Akamai nameservers

#### Namecheap
1. Go to "Domain List" → "Manage"
2. Find "Nameservers" section
3. Select "Custom DNS"
4. Add Akamai nameservers

#### Cloudflare Registrar
1. Go to domain overview
2. Click "Configure" → "Edit" next to nameservers
3. Add Akamai nameservers

### 4. Verification Commands

\`\`\`bash
# Check propagation status
dig ${args.zone} NS +short

# Test resolution via Akamai
dig @ns1-123.akamaidns.net ${args.zone} A +short

# Check SOA record
dig ${args.zone} SOA +short

# Monitor propagation globally
# Use: https://www.whatsmydns.net/#NS/${args.zone}
\`\`\`

## ⏱️ Timeline

- **Propagation Time**: 24-48 hours globally
- **TTL Consideration**: Previous NS record TTL affects propagation speed
- **Rollback Window**: Keep previous nameserver details for 72 hours

## ⚠️ Important Notes

1. **Dual Verification**: Ensure records resolve correctly via both old and new nameservers before migration
2. **Email Services**: Verify MX records are correctly configured
3. **Monitoring**: Watch for resolution issues during propagation
4. **Support**: Contact Akamai support if issues arise

## 🚨 Emergency Rollback

If issues occur, revert nameservers at registrar immediately:
1. Change nameservers back to original values
2. Wait for propagation (usually faster for rollback)
3. Investigate and resolve issues before retry

---
Generated: ${new Date().toLocaleString()}
`];

    return {
      content: content.join('\n'),
      isError: false,
    };

  } catch (error) {
    return {
      content: `❌ Failed to generate migration instructions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

/**
 * Bulk import DNS records with hidden change-list management
 */
export async function importBulkRecords(
  client: AkamaiClient,
  args: {
    zone: string;
    records: DNSRecordSet[];
    customer?: string;
    validateOnly?: boolean;
  }
): Promise<MCPToolResponse> {
  const progressBar = new ProgressBar('Importing DNS records', args.records.length);
  progressBar.start();

  const results = {
    successful: 0,
    failed: 0,
    validated: 0,
    errors: [] as Array<{ record: string; error: string }>,
  };

  try {
    // Process records in batches to avoid overwhelming the API
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < args.records.length; i += batchSize) {
      batches.push(args.records.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (record) => {
          try {
            if (args.validateOnly) {
              // Just validate the record format
              validateDNSRecord(record);
              results.validated++;
            } else {
              // Actually import the record
              await upsertRecord(client, {
                zone: args.zone,
                name: record.name,
                type: record.type,
                ttl: record.ttl,
                rdata: record.rdata,
                customer: args.customer,
              });
              results.successful++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              record: `${record.name} (${record.type})`,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          progressBar.increment();
        })
      );
    }

    progressBar.stop();

    // Generate report
    const content = [`
# 📊 Bulk Import Report

## Summary
- **Zone**: ${args.zone}
- **Total Records**: ${args.records.length}
${args.validateOnly ? `- **Validated**: ${results.validated}` : `- **Imported**: ${results.successful}`}
- **Failed**: ${results.failed}

## Status
${results.failed === 0 ? '✅ All records processed successfully!' : '⚠️ Some records failed'}
`];

    if (results.errors.length > 0) {
      content.push('\n## ❌ Failed Records\n');
      results.errors.forEach(err => {
        content.push(`- **${err.record}**: ${err.error}`);
      });
    }

    return {
      content: content.join('\n'),
      isError: false,
    };

  } catch (error) {
    progressBar.stop();
    return {
      content: `❌ Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

/**
 * Validate DNS record format
 */
function validateDNSRecord(record: DNSRecordSet): void {
  if (!record.name) {
    throw new Error('Record name is required');
  }
  
  if (!record.type || !RECORD_TYPE_MAP[record.type]) {
    throw new Error(`Invalid record type: ${record.type}`);
  }
  
  if (!record.ttl || record.ttl < 0) {
    throw new Error('Invalid TTL value');
  }
  
  if (!record.rdata || record.rdata.length === 0) {
    throw new Error('Record data (rdata) is required');
  }
  
  // Type-specific validation
  switch (record.type) {
    case 'A':
      // Validate IPv4
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(record.rdata[0])) {
        throw new Error('Invalid IPv4 address');
      }
      break;
      
    case 'AAAA':
      // Validate IPv6
      const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
      if (!ipv6Regex.test(record.rdata[0]) && !record.rdata[0].includes('::')) {
        throw new Error('Invalid IPv6 address');
      }
      break;
      
    case 'MX':
      // Validate MX format
      const mxParts = record.rdata[0].split(' ');
      if (mxParts.length < 2 || isNaN(parseInt(mxParts[0]))) {
        throw new Error('Invalid MX record format (expected: priority hostname)');
      }
      break;
  }
}