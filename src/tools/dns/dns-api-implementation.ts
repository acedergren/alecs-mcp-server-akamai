/**
 * DNS API Implementation Details
 * 
 * Contains endpoints, schemas, and formatters for DNS tools
 */

import { z } from 'zod';

/**
 * DNS API Endpoints
 */
export const DNSEndpoints = {
  // Zone endpoints
  listZones: () => '/config-dns/v2/zones',
  getZone: (zone: string) => `/config-dns/v2/zones/${zone}`,
  createZone: () => '/config-dns/v2/zones',
  updateZone: (zone: string) => `/config-dns/v2/zones/${zone}`,
  deleteZone: (zone: string) => `/config-dns/v2/zones/${zone}`,
  
  // Record endpoints
  getRecordSets: (zone: string) => `/config-dns/v2/zones/${zone}/recordsets`,
  getRecord: (zone: string, name: string, type: string) => `/config-dns/v2/zones/${zone}/recordsets/${name}/${type}`,
  createRecord: (zone: string) => `/config-dns/v2/zones/${zone}/recordsets`,
  updateRecord: (zone: string, name: string, type: string) => `/config-dns/v2/zones/${zone}/recordsets/${name}/${type}`,
  deleteRecord: (zone: string, name: string, type: string) => `/config-dns/v2/zones/${zone}/recordsets/${name}/${type}`,
  
  // Bulk operations
  bulkCreateRecords: (zone: string) => `/config-dns/v2/zones/${zone}/recordsets`,
  bulkUpdateRecords: (zone: string) => `/config-dns/v2/zones/${zone}/recordsets`,
  bulkDeleteRecords: (zone: string) => `/config-dns/v2/zones/${zone}/recordsets`,
  
  // DNSSEC
  getDNSSECStatus: (zone: string) => `/config-dns/v2/zones/${zone}/dnssec`,
  updateDNSSECStatus: (zone: string) => `/config-dns/v2/zones/${zone}/dnssec`
};

/**
 * DNS Tool Schemas
 */
export const DNSToolSchemas = {
  listZones: z.object({
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional(),
    contractIds: z.array(z.string()).optional(),
    types: z.array(z.enum(['PRIMARY', 'SECONDARY', 'ALIAS'])).optional(),
    includeAliases: z.boolean().optional(),
    search: z.string().optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  getZone: z.object({
    zone: z.string(),
    customer: z.string().optional()
  }),
  
  createZone: z.object({
    zone: z.string(),
    type: z.enum(['primary', 'secondary', 'alias']),
    contractId: z.string(),
    groupId: z.string().optional(),
    masters: z.array(z.string()).optional(),
    targetZone: z.string().optional(),
    tsigKey: z.object({
      name: z.string(),
      algorithm: z.string(),
      secret: z.string()
    }).optional(),
    comment: z.string().optional(),
    customer: z.string().optional()
  }),
  
  listRecords: z.object({
    zone: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'type']).optional(),
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  createRecord: z.object({
    zone: z.string(),
    name: z.string(),
    type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']),
    ttl: z.number().optional(),
    rdata: z.array(z.string()),
    comment: z.string().optional(),
    customer: z.string().optional(),
    useChangelist: z.boolean().optional().describe('Use changelist abstraction for automatic submission and activation'),
    network: z.enum(['STAGING', 'PRODUCTION']).optional().describe('Network environment when using changelist (default: STAGING)'),
    autoActivate: z.boolean().optional().describe('Auto-activate changelist after submission (default: true)')
  }),
  
  updateRecord: z.object({
    zone: z.string(),
    name: z.string(),
    type: z.string(),
    ttl: z.number().optional(),
    rdata: z.array(z.string()),
    customer: z.string().optional(),
    useChangelist: z.boolean().optional().describe('Use changelist abstraction for automatic submission and activation'),
    network: z.enum(['STAGING', 'PRODUCTION']).optional().describe('Network environment when using changelist (default: STAGING)'),
    autoActivate: z.boolean().optional().describe('Auto-activate changelist after submission (default: true)')
  }),
  
  deleteRecord: z.object({
    zone: z.string(),
    name: z.string(),
    type: z.string(),
    customer: z.string().optional(),
    useChangelist: z.boolean().optional().describe('Use changelist abstraction for automatic submission and activation'),
    network: z.enum(['STAGING', 'PRODUCTION']).optional().describe('Network environment when using changelist (default: STAGING)'),
    autoActivate: z.boolean().optional().describe('Auto-activate changelist after submission (default: true)')
  }),
  
  bulkRecords: z.object({
    zone: z.string(),
    operations: z.array(z.object({
      action: z.enum(['create', 'update', 'delete']),
      record: z.object({
        name: z.string(),
        type: z.string(),
        ttl: z.number().optional(),
        rdata: z.array(z.string()).optional()
      })
    })),
    customer: z.string().optional()
  })
};

/**
 * Format DNS zone list response
 */
export function formatZoneList(response: any): string {
  const zones = response.zones || [];
  
  let text = `🌐 **DNS Zones**\n\n`;
  
  if (zones.length === 0) {
    text += '⚠️ No DNS zones found.\n';
    return text;
  }
  
  text += `Found **${zones.length}** zones:\n\n`;
  
  zones.slice(0, 20).forEach((zone: any, index: number) => {
    text += `${index + 1}. **${zone.zone}**\n`;
    text += `   • Type: ${zone.type}\n`;
    text += `   • Contract: ${zone.contractId}\n`;
    if (zone.aliases?.length > 0) {
      text += `   • Aliases: ${zone.aliases.join(', ')}\n`;
    }
    if (zone.masters?.length > 0) {
      text += `   • Masters: ${zone.masters.join(', ')}\n`;
    }
    text += `\n`;
  });
  
  if (zones.length > 20) {
    text += `_... and ${zones.length - 20} more zones_\n`;
  }
  
  return text;
}

/**
 * Format DNS zone details response
 */
export function formatZoneDetails(response: any): string {
  const zone = response;
  
  let text = `🌐 **DNS Zone Details**\n\n`;
  text += `**Zone:** ${zone.zone}\n`;
  text += `**Type:** ${zone.type}\n`;
  text += `**Contract:** ${zone.contractId}\n`;
  
  if (zone.comment) {
    text += `**Comment:** ${zone.comment}\n`;
  }
  
  if (zone.aliases?.length > 0) {
    text += `\n**Aliases:**\n`;
    zone.aliases.forEach((alias: string) => {
      text += `• ${alias}\n`;
    });
  }
  
  if (zone.masters?.length > 0) {
    text += `\n**Masters:**\n`;
    zone.masters.forEach((master: string) => {
      text += `• ${master}\n`;
    });
  }
  
  return text;
}

/**
 * Format DNS record list response
 */
export function formatRecordList(response: any): string {
  const recordsets = response.recordsets || [];
  
  let text = `📝 **DNS Records**\n\n`;
  
  if (recordsets.length === 0) {
    text += '⚠️ No DNS records found.\n';
    return text;
  }
  
  text += `Found **${recordsets.length}** record sets:\n\n`;
  
  // Group by record type
  const byType: { [key: string]: any[] } = {};
  recordsets.forEach((rs: any) => {
    if (!byType[rs.type]) byType[rs.type] = [];
    byType[rs.type].push(rs);
  });
  
  Object.keys(byType).sort().forEach(type => {
    text += `**${type} Records:**\n`;
    byType[type].slice(0, 10).forEach((rs: any) => {
      text += `• ${rs.name} → ${rs.rdata.join(', ')}`;
      if (rs.ttl) text += ` (TTL: ${rs.ttl}s)`;
      text += '\n';
    });
    
    if (byType[type].length > 10) {
      text += `_... and ${byType[type].length - 10} more ${type} records_\n`;
    }
    text += '\n';
  });
  
  return text;
}

/**
 * Format record creation response
 */
export function formatRecordCreated(data: any): string {
  let text = `✅ **DNS Record Created Successfully!**\n\n`;
  text += `**Zone:** ${data.zone}\n`;
  text += `**Record:** ${data.name} (${data.type})\n`;
  text += `**Value:** ${data.rdata.join(', ')}\n`;
  
  if (data.ttl) {
    text += `**TTL:** ${data.ttl} seconds\n`;
  }
  
  text += `\n🎯 **Next Steps:**\n`;
  text += `1. Verify DNS propagation: \`dig ${data.name} ${data.type}\`\n`;
  text += `2. Add more records if needed\n`;
  text += `3. Configure DNSSEC if required\n`;
  
  return text;
}

/**
 * Format bulk operation response
 */
export function formatBulkOperationResult(response: any): string {
  let text = `📦 **Bulk DNS Operation Results**\n\n`;
  
  const results = response.results || [];
  const successful = results.filter((r: any) => r.status === 'success').length;
  const failed = results.filter((r: any) => r.status === 'failed').length;
  
  text += `✅ Successful: ${successful}\n`;
  text += `❌ Failed: ${failed}\n`;
  text += `📊 Total: ${results.length}\n\n`;
  
  if (failed > 0) {
    text += `**Failed Operations:**\n`;
    results.filter((r: any) => r.status === 'failed').forEach((result: any) => {
      text += `• ${result.record.name} (${result.record.type}): ${result.error}\n`;
    });
  }
  
  return text;
}