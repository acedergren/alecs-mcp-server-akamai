/**
 * Edge DNS Advanced Operations - Auto-Generated Tools
 * 
 * PHASE 3.2: Implementing 20+ Advanced DNS Operations Endpoints
 * 
 * This implements advanced DNS operations using auto-generation for
 * DNSSEC, zone transfers, bulk operations, analytics, and enterprise
 * DNS management based on Akamai's Edge DNS API specifications.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse 
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * Advanced DNS Operations Schemas - Auto-Generated from API Specs
 */

// Base DNS schemas
const DNSZoneSchema = CustomerSchema.extend({
  zone: z.string().describe('DNS zone name (e.g., example.com)')
});

// DNS Record Base Schema - removed unused variable warning
// const DNSRecordBaseSchema = DNSZoneSchema.extend({
//   recordName: z.string().describe('DNS record name'),
//   recordType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA', 'DNSKEY', 'DS', 'NSEC', 'NSEC3', 'RRSIG']).describe('DNS record type')
// });

// DNSSEC Configuration Schemas
const DNSSECConfigSchema = DNSZoneSchema.extend({
  algorithm: z.enum(['RSASHA1', 'RSASHA256', 'RSASHA512', 'ECDSAP256SHA256', 'ECDSAP384SHA384']).default('RSASHA256').describe('DNSSEC algorithm'),
  keySize: z.number().int().refine(val => [1024, 2048, 3072, 4096].includes(val)).default(2048).describe('Key size in bits'),
  keyRotationPolicy: z.object({
    kskRotationInterval: z.number().int().min(30).max(365).default(365).describe('KSK rotation interval in days'),
    zskRotationInterval: z.number().int().min(7).max(180).default(90).describe('ZSK rotation interval in days'),
    autoRotation: z.boolean().default(true).describe('Enable automatic key rotation')
  }).optional(),
  nsec3Params: z.object({
    algorithm: z.enum(['SHA1']).default('SHA1'),
    iterations: z.number().int().min(0).max(100).default(10),
    salt: z.string().optional().describe('NSEC3 salt (hex string)'),
    optOut: z.boolean().default(false)
  }).optional(),
  enabled: z.boolean().default(true)
});

const DNSSECKeySchema = DNSZoneSchema.extend({
  keyType: z.enum(['KSK', 'ZSK']).describe('DNSSEC key type'),
  algorithm: z.enum(['RSASHA1', 'RSASHA256', 'RSASHA512', 'ECDSAP256SHA256', 'ECDSAP384SHA384']),
  keySize: z.number().int().refine(val => [1024, 2048, 3072, 4096].includes(val)),
  keyData: z.string().optional().describe('Base64 encoded public key data'),
  keyId: z.number().int().positive().optional().describe('Key ID for operations')
});

// Zone Transfer Schemas
const ZoneTransferConfigSchema = DNSZoneSchema.extend({
  transferType: z.enum(['AXFR', 'IXFR']).describe('Zone transfer type'),
  masterServers: z.array(z.object({
    address: z.string().ip().describe('Master server IP address'),
    port: z.number().int().min(1).max(65535).default(53).describe('DNS port'),
    tsigKey: z.object({
      name: z.string().describe('TSIG key name'),
      algorithm: z.enum(['hmac-md5', 'hmac-sha1', 'hmac-sha256', 'hmac-sha512']).default('hmac-sha256'),
      secret: z.string().describe('Base64 encoded TSIG secret')
    }).optional().describe('TSIG authentication for secure transfers')
  })).min(1).describe('Master servers for zone transfers'),
  notifySettings: z.object({
    enabled: z.boolean().default(true),
    notifyServers: z.array(z.string().ip()).optional().describe('Servers to notify of zone changes')
  }).optional(),
  transferSchedule: z.object({
    automatic: z.boolean().default(true),
    interval: z.number().int().min(60).max(86400).default(3600).describe('Transfer check interval in seconds'),
    retryInterval: z.number().int().min(60).max(7200).default(300).describe('Retry interval on failure')
  }).optional(),
  enabled: z.boolean().default(true)
});

// Bulk DNS Operations Schemas
const BulkDNSOperationSchema = DNSZoneSchema.extend({
  operationType: z.enum(['create', 'update', 'delete']).describe('Bulk operation type'),
  records: z.array(z.object({
    name: z.string().describe('Record name'),
    type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS']),
    rdata: z.array(z.string()).min(1).describe('Record data'),
    ttl: z.number().int().min(30).max(86400).default(300),
    comment: z.string().optional()
  })).min(1).max(1000).describe('DNS records for bulk operation (max 1000)'),
  validationLevel: z.enum(['strict', 'permissive']).default('strict').describe('Validation level for records'),
  rollbackOnError: z.boolean().default(true).describe('Rollback all changes if any record fails'),
  notificationEmails: z.array(z.string().email()).optional().describe('Email addresses for operation notifications')
});

const BulkImportSchema = DNSZoneSchema.extend({
  importFormat: z.enum(['bind', 'csv', 'json']).describe('Import file format'),
  importData: z.string().describe('Import data in specified format'),
  mergeStrategy: z.enum(['replace', 'merge', 'append']).default('merge').describe('How to handle existing records'),
  validateOnly: z.boolean().default(false).describe('Validate import without applying changes'),
  backupBeforeImport: z.boolean().default(true).describe('Create backup before importing'),
  notificationEmails: z.array(z.string().email()).optional()
});

// DNS Analytics Schemas
const DNSAnalyticsSchema = DNSZoneSchema.extend({
  timeRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).describe('Start time in ISO format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).describe('End time in ISO format')
  }),
  metrics: z.array(z.enum(['queries', 'responses', 'errors', 'latency', 'cache_hit_ratio', 'geographic_distribution', 'record_type_distribution'])).min(1),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day').describe('Data aggregation granularity'),
  filters: z.object({
    recordTypes: z.array(z.string()).optional(),
    responseCode: z.array(z.enum(['NOERROR', 'NXDOMAIN', 'SERVFAIL', 'REFUSED'])).optional(),
    countries: z.array(z.string().length(2)).optional(),
    clientSubnets: z.array(z.string()).optional()
  }).optional()
});

// Zone Monitoring Schemas
const ZoneMonitoringSchema = DNSZoneSchema.extend({
  monitoringType: z.enum(['availability', 'performance', 'security', 'compliance']).describe('Type of monitoring'),
  checkpoints: z.array(z.object({
    location: z.string().describe('Monitoring checkpoint location'),
    probeType: z.enum(['dns_query', 'tcp_connect', 'http_check']).default('dns_query'),
    frequency: z.number().int().min(60).max(3600).default(300).describe('Check frequency in seconds'),
    timeout: z.number().int().min(1).max(60).default(5).describe('Check timeout in seconds')
  })).min(1).describe('Monitoring checkpoints'),
  alertingPolicy: z.object({
    enabled: z.boolean().default(true),
    thresholds: z.object({
      availabilityPercent: z.number().min(0).max(100).default(99.9),
      responseTimeMs: z.number().int().min(1).max(10000).default(1000),
      errorRatePercent: z.number().min(0).max(100).default(5)
    }),
    notificationChannels: z.array(z.object({
      type: z.enum(['email', 'webhook', 'slack']),
      endpoint: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
    })).min(1)
  }).optional(),
  enabled: z.boolean().default(true)
});

// Advanced Zone Configuration Schemas
const ZoneConfigAdvancedSchema = DNSZoneSchema.extend({
  zoneSettings: z.object({
    defaultTTL: z.number().int().min(30).max(86400).default(300),
    minimumTTL: z.number().int().min(1).max(3600).default(30),
    negativeCacheTTL: z.number().int().min(60).max(86400).default(3600),
    maxZoneSize: z.number().int().min(1000000).max(100000000).default(10000000).describe('Maximum zone size in bytes')
  }).optional(),
  security: z.object({
    queryRateLimiting: z.object({
      enabled: z.boolean().default(false),
      queriesPerSecond: z.number().int().min(1).max(10000).default(100),
      burstSize: z.number().int().min(1).max(1000).default(10),
      blockDuration: z.number().int().min(60).max(3600).default(300).describe('Block duration in seconds')
    }).optional(),
    sourceIPFiltering: z.object({
      enabled: z.boolean().default(false),
      allowedNetworks: z.array(z.string()).optional().describe('CIDR blocks allowed to query'),
      blockedNetworks: z.array(z.string()).optional().describe('CIDR blocks blocked from querying')
    }).optional()
  }).optional(),
  caching: z.object({
    aggressiveCaching: z.boolean().default(false).describe('Enable aggressive negative caching'),
    cacheSharing: z.boolean().default(true).describe('Enable cache sharing between edge servers'),
    customCachingRules: z.array(z.object({
      recordPattern: z.string().describe('Record name pattern (supports wildcards)'),
      ttlOverride: z.number().int().min(30).max(86400),
      cacheLevel: z.enum(['none', 'basic', 'aggressive']).default('basic')
    })).optional()
  }).optional()
});

/**
 * DNS Advanced Operations Auto-Generator
 */
export class DNSAdvancedOperationsAutoGen {
  private client: AkamaiClient;

  constructor(client: AkamaiClient) {
    this.client = client;
  }

  /**
   * AUTO-GENERATED DNSSEC TOOLS
   */
  
  async enableDNSSEC(args: z.infer<typeof DNSSECConfigSchema>): Promise<MCPToolResponse> {
    try {
      const params = DNSSECConfigSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/dnssec`,
        method: 'POST',
        body: {
          algorithm: params.algorithm,
          keySize: params.keySize,
          keyRotationPolicy: params.keyRotationPolicy,
          nsec3Params: params.nsec3Params,
          enabled: params.enabled
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'DNSSEC enabled successfully',
            zone: params.zone,
            algorithm: params.algorithm,
            keySize: params.keySize,
            kskId: (response as any).kskId,
            zskId: (response as any).zskId,
            dsRecords: (response as any).dsRecords,
            nextSteps: [
              'Add DS records to parent zone',
              'Monitor key rotation schedule',
              'Verify DNSSEC chain of trust'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error enabling DNSSEC: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
  }

  async rotateDNSSECKeys(args: z.infer<typeof DNSSECKeySchema>): Promise<MCPToolResponse> {
    try {
      const params = DNSSECKeySchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/dnssec/keys/${params.keyType}/rotate`,
        method: 'POST',
        body: {
          algorithm: params.algorithm,
          keySize: params.keySize
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `DNSSEC ${params.keyType} key rotation initiated successfully`,
            zone: params.zone,
            keyType: params.keyType,
            newKeyId: (response as any).newKeyId,
            rotationId: (response as any).rotationId,
            estimatedCompletionTime: (response as any).estimatedCompletionTime
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error rotating DNSSEC keys: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED ZONE TRANSFER TOOLS
   */
  
  async configureZoneTransfer(args: z.infer<typeof ZoneTransferConfigSchema>): Promise<MCPToolResponse> {
    try {
      const params = ZoneTransferConfigSchema.parse(args);

      await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/transfer`,
        method: 'PUT',
        body: params
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Zone transfer configuration updated successfully',
            zone: params.zone,
            transferType: params.transferType,
            masterServersCount: params.masterServers.length,
            tsigEnabled: params.masterServers.some(server => server.tsigKey),
            notifyEnabled: params.notifySettings?.enabled,
            automaticTransfer: params.transferSchedule?.automatic
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error configuring zone transfer: ${error.message}`
        }]
      };
    }
  }

  async initiateZoneTransfer(args: z.infer<typeof DNSZoneSchema> & { transferType?: string }): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/transfer/initiate`,
        method: 'POST',
        body: {
          transferType: args.transferType || 'AXFR'
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Zone transfer initiated successfully',
            zone: args.zone,
            transferId: (response as any).transferId,
            transferType: args.transferType || 'AXFR',
            status: 'IN_PROGRESS',
            estimatedCompletionTime: (response as any).estimatedCompletionTime
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error initiating zone transfer: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED BULK OPERATIONS TOOLS
   */
  
  async executeBulkDNSOperation(args: z.infer<typeof BulkDNSOperationSchema>): Promise<MCPToolResponse> {
    try {
      const params = BulkDNSOperationSchema.parse(args);

      // Validate records before bulk operation
      const validationResult = await this.validateBulkRecords(params.records);
      if (!validationResult.isValid && params.validationLevel === 'strict') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Bulk operation validation failed',
              validationErrors: validationResult.errors,
              recommendation: 'Fix validation errors or use permissive validation level'
            }, null, 2)
          }]
        };
      }

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/bulk/${params.operationType}`,
        method: 'POST',
        body: {
          records: params.records,
          validationLevel: params.validationLevel,
          rollbackOnError: params.rollbackOnError,
          notificationEmails: params.notificationEmails
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `Bulk ${params.operationType} operation initiated successfully`,
            zone: params.zone,
            operationId: (response as any).operationId,
            recordsCount: params.records.length,
            operationType: params.operationType,
            status: 'IN_PROGRESS',
            estimatedCompletionTime: (response as any).estimatedCompletionTime,
            validationWarnings: validationResult.warnings || []
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error executing bulk DNS operation: ${error.message}`
        }]
      };
    }
  }

  async importZoneData(args: z.infer<typeof BulkImportSchema>): Promise<MCPToolResponse> {
    try {
      const params = BulkImportSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/import`,
        method: 'POST',
        body: {
          format: params.importFormat,
          data: params.importData,
          mergeStrategy: params.mergeStrategy,
          validateOnly: params.validateOnly,
          backupBeforeImport: params.backupBeforeImport,
          notificationEmails: params.notificationEmails
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: params.validateOnly ? 'Zone import validation completed' : 'Zone import initiated successfully',
            zone: params.zone,
            importId: (response as any).importId,
            importFormat: params.importFormat,
            recordsCount: (response as any).recordsCount,
            mergeStrategy: params.mergeStrategy,
            validationOnly: params.validateOnly,
            validationResults: (response as any).validationResults
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error importing zone data: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED ANALYTICS TOOLS
   */
  
  async getDNSAnalytics(args: z.infer<typeof DNSAnalyticsSchema>): Promise<MCPToolResponse> {
    try {
      const params = DNSAnalyticsSchema.parse(args);

      const queryParams: Record<string, string> = {
        startDate: params.timeRange.startDate,
        endDate: params.timeRange.endDate,
        metrics: params.metrics.join(','),
        granularity: params.granularity
      };

      // Add optional filters if they exist
      if (params.filters) {
        const filters = params.filters as any;
        if (filters.recordTypes) {
          // @ts-ignore: TypeScript index signature issue
          queryParams.recordTypes = filters.recordTypes.join(',');
        }
        if (filters.responseCode) {
          // @ts-ignore: TypeScript index signature issue
          queryParams.responseCode = filters.responseCode.join(',');
        }
        if (filters.countries) {
          // @ts-ignore: TypeScript index signature issue  
          queryParams.countries = filters.countries.join(',');
        }
        if (filters.clientSubnets) {
          // @ts-ignore: TypeScript index signature issue
          queryParams.clientSubnets = filters.clientSubnets.join(',');
        }
      }

      const response = await this.client.request({
        path: `/reporting/v1/dns/zones/${params.zone}/analytics`,
        method: 'GET',
        queryParams
      });

      const analytics = response as any;
      const summary = await this.processAnalyticsData(analytics, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'DNS analytics retrieved successfully',
            zone: params.zone,
            timeRange: params.timeRange,
            granularity: params.granularity,
            summary: {
              totalQueries: summary.totalQueries,
              averageLatency: summary.averageLatency,
              errorRate: summary.errorRate,
              topQueryTypes: summary.topQueryTypes,
              topCountries: summary.topCountries
            },
            metrics: params.metrics,
            data: analytics.data,
            trends: summary.trends
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving DNS analytics: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED MONITORING TOOLS
   */
  
  async createZoneMonitoring(args: z.infer<typeof ZoneMonitoringSchema>): Promise<MCPToolResponse> {
    try {
      const params = ZoneMonitoringSchema.parse(args);

      const response = await this.client.request({
        path: `/monitoring/v1/dns/zones/${params.zone}/monitors`,
        method: 'POST',
        body: params
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Zone monitoring configuration created successfully',
            monitorId: (response as any).monitorId,
            zone: params.zone,
            monitoringType: params.monitoringType,
            checkpointsCount: params.checkpoints.length,
            alertingEnabled: params.alertingPolicy?.enabled,
            enabled: params.enabled
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating zone monitoring: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED ADVANCED CONFIGURATION TOOLS
   */
  
  async configureAdvancedZoneSettings(args: z.infer<typeof ZoneConfigAdvancedSchema>): Promise<MCPToolResponse> {
    try {
      const params = ZoneConfigAdvancedSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/advanced-config`,
        method: 'PUT',
        body: {
          zoneSettings: params.zoneSettings,
          security: params.security,
          caching: params.caching
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Advanced zone settings configured successfully',
            zone: params.zone,
            settingsApplied: {
              zoneSettings: !!params.zoneSettings,
              security: !!params.security,
              caching: !!params.caching
            },
            configuration: response
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error configuring advanced zone settings: ${error.message}`
        }]
      };
    }
  }

  /**
   * Helper methods for validation and processing
   */
  
  private async validateBulkRecords(records: any[]): Promise<{isValid: boolean, errors: string[], warnings: string[]}> {
    const errors = [];
    const warnings = [];

    for (const record of records) {
      // Basic validation
      if (!record.name || !record.type || !record.rdata) {
        errors.push(`Invalid record: ${JSON.stringify(record)}`);
      }

      // Type-specific validation
      if (record.type === 'A' && !record.rdata.some((r: string) => /^\d+\.\d+\.\d+\.\d+$/.test(r))) {
        errors.push(`Invalid A record data: ${record.name}`);
      }

      if (record.type === 'MX' && !record.rdata.some((r: string) => /^\d+\s+/.test(r))) {
        errors.push(`Invalid MX record data (missing priority): ${record.name}`);
      }

      // Warning for low TTL
      if (record.ttl < 60) {
        warnings.push(`Low TTL warning for ${record.name}: ${record.ttl} seconds`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async processAnalyticsData(analytics: any, _params: any): Promise<any> {
    const data = analytics.data || [];
    
    return {
      totalQueries: data.reduce((sum: number, entry: any) => sum + (entry.queries || 0), 0),
      averageLatency: data.length > 0 ? 
        Math.round(data.reduce((sum: number, entry: any) => sum + (entry.latency || 0), 0) / data.length) : 0,
      errorRate: data.length > 0 ?
        Math.round((data.reduce((sum: number, entry: any) => sum + (entry.errors || 0), 0) / 
        data.reduce((sum: number, entry: any) => sum + (entry.queries || 0), 0)) * 100 * 100) / 100 : 0,
      topQueryTypes: analytics.topQueryTypes || [],
      topCountries: analytics.topCountries || [],
      trends: analytics.trends || {}
    };
  }

  /**
   * Get all DNS Advanced Operations tools (20+ total)
   */
  getDNSAdvancedOperationsTools(): Record<string, any> {
    return {
      // DNSSEC Management (4 tools)
      'dns.dnssec.enable': {
        description: 'Enable DNSSEC for zone with key generation',
        inputSchema: DNSSECConfigSchema,
        handler: async (_client: AkamaiClient, args: any) => this.enableDNSSEC(args)
      },
      'dns.dnssec.disable': {
        description: 'Disable DNSSEC for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.updateResource(`zones/${args.zone}/dnssec`, { enabled: false })
      },
      'dns.dnssec.keys.rotate': {
        description: 'Rotate DNSSEC keys (KSK or ZSK)',
        inputSchema: DNSSECKeySchema,
        handler: async (_client: AkamaiClient, args: any) => this.rotateDNSSECKeys(args)
      },
      'dns.dnssec.status': {
        description: 'Get DNSSEC status and key information',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`zones/${args.zone}/dnssec`, args)
      },

      // Zone Transfer (3 tools)
      'dns.transfer.configure': {
        description: 'Configure zone transfer settings and TSIG keys',
        inputSchema: ZoneTransferConfigSchema,
        handler: async (_client: AkamaiClient, args: any) => this.configureZoneTransfer(args)
      },
      'dns.transfer.initiate': {
        description: 'Initiate manual zone transfer (AXFR/IXFR)',
        inputSchema: DNSZoneSchema.extend({ transferType: z.enum(['AXFR', 'IXFR']).optional() }),
        handler: async (_client: AkamaiClient, args: any) => this.initiateZoneTransfer(args)
      },
      'dns.transfer.status': {
        description: 'Get zone transfer status and history',
        inputSchema: DNSZoneSchema.extend({ transferId: z.string().optional() }),
        handler: async (_client: AkamaiClient, args: any) => this.getTransferStatus(args)
      },

      // Bulk Operations (4 tools)
      'dns.bulk.create': {
        description: 'Create multiple DNS records in bulk',
        inputSchema: BulkDNSOperationSchema,
        handler: async (_client: AkamaiClient, args: any) => this.executeBulkDNSOperation({ ...args, operationType: 'create' })
      },
      'dns.bulk.update': {
        description: 'Update multiple DNS records in bulk',
        inputSchema: BulkDNSOperationSchema,
        handler: async (_client: AkamaiClient, args: any) => this.executeBulkDNSOperation({ ...args, operationType: 'update' })
      },
      'dns.bulk.delete': {
        description: 'Delete multiple DNS records in bulk',
        inputSchema: BulkDNSOperationSchema,
        handler: async (_client: AkamaiClient, args: any) => this.executeBulkDNSOperation({ ...args, operationType: 'delete' })
      },
      'dns.zone.import': {
        description: 'Import zone data from BIND, CSV, or JSON format',
        inputSchema: BulkImportSchema,
        handler: async (_client: AkamaiClient, args: any) => this.importZoneData(args)
      },

      // Analytics & Reporting (3 tools)
      'dns.analytics.query': {
        description: 'Get DNS analytics and query statistics',
        inputSchema: DNSAnalyticsSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getDNSAnalytics(args)
      },
      'dns.analytics.performance': {
        description: 'Get DNS performance metrics and latency data',
        inputSchema: DNSAnalyticsSchema.extend({
          metrics: z.array(z.enum(['latency', 'cache_hit_ratio', 'response_time'])).default(['latency'])
        }),
        handler: async (_client: AkamaiClient, args: any) => this.getDNSAnalytics(args)
      },
      'dns.analytics.geographic': {
        description: 'Get geographic distribution of DNS queries',
        inputSchema: DNSAnalyticsSchema.extend({
          metrics: z.array(z.enum(['geographic_distribution', 'queries'])).default(['geographic_distribution'])
        }),
        handler: async (_client: AkamaiClient, args: any) => this.getDNSAnalytics(args)
      },

      // Monitoring & Alerting (3 tools)
      'dns.monitoring.create': {
        description: 'Create zone monitoring with health checks',
        inputSchema: ZoneMonitoringSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createZoneMonitoring(args)
      },
      'dns.monitoring.list': {
        description: 'List all monitoring configurations for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`monitoring/dns/zones/${args.zone}/monitors`, args)
      },
      'dns.monitoring.alerts': {
        description: 'Get monitoring alerts and incident history',
        inputSchema: DNSZoneSchema.extend({
          monitorId: z.string().optional(),
          severity: z.enum(['low', 'medium', 'high', 'critical']).optional()
        }),
        handler: async (_client: AkamaiClient, args: any) => this.getMonitoringAlerts(args)
      },

      // Advanced Configuration (3 tools)
      'dns.zone.advanced-config': {
        description: 'Configure advanced zone settings, security, and caching',
        inputSchema: ZoneConfigAdvancedSchema,
        handler: async (_client: AkamaiClient, args: any) => this.configureAdvancedZoneSettings(args)
      },
      'dns.zone.backup': {
        description: 'Create zone backup for disaster recovery',
        inputSchema: DNSZoneSchema.extend({
          backupName: z.string().min(1).max(255).describe('Backup name'),
          includeMetadata: z.boolean().default(true)
        }),
        handler: async (_client: AkamaiClient, args: any) => this.createZoneBackup(args)
      },
      'dns.zone.restore': {
        description: 'Restore zone from backup',
        inputSchema: DNSZoneSchema.extend({
          backupId: z.string().describe('Backup ID to restore from'),
          restoreType: z.enum(['full', 'records_only', 'config_only']).default('full')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.restoreZoneFromBackup(args)
      }
    };
  }

  /**
   * Helper methods for auto-generated operations
   */
  
  private async listResource(path: string, _args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/${path}`,
        method: 'GET'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error listing ${path}: ${error.message}`
        }]
      };
    }
  }

  private async updateResource(path: string, data: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/${path}`,
        method: 'PUT',
        body: data
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `${path} updated successfully`,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error updating ${path}: ${error.message}`
        }]
      };
    }
  }

  private async getTransferStatus(args: any): Promise<MCPToolResponse> {
    try {
      const path = args.transferId 
        ? `/config-dns/v2/zones/${args.zone}/transfer/status/${args.transferId}`
        : `/config-dns/v2/zones/${args.zone}/transfer/status`;

      const response = await this.client.request({ path, method: 'GET' });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Zone transfer status retrieved successfully',
            zone: args.zone,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error getting zone transfer status: ${error.message}`
        }]
      };
    }
  }

  private async getMonitoringAlerts(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/monitoring/v1/dns/zones/${args.zone}/alerts`,
        method: 'GET',
        queryParams: {
          monitorId: args.monitorId,
          severity: args.severity
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Monitoring alerts retrieved successfully',
            zone: args.zone,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error getting monitoring alerts: ${error.message}`
        }]
      };
    }
  }

  private async createZoneBackup(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/backups`,
        method: 'POST',
        body: {
          backupName: args.backupName,
          includeMetadata: args.includeMetadata
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Zone backup created successfully',
            zone: args.zone,
            backupId: (response as any).backupId,
            backupName: args.backupName
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating zone backup: ${error.message}`
        }]
      };
    }
  }

  private async restoreZoneFromBackup(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/restore`,
        method: 'POST',
        body: {
          backupId: args.backupId,
          restoreType: args.restoreType
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Zone restore initiated successfully',
            zone: args.zone,
            backupId: args.backupId,
            restoreType: args.restoreType,
            restoreId: (response as any).restoreId
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error restoring zone from backup: ${error.message}`
        }]
      };
    }
  }
}

/**
 * Export DNS Advanced Operations tools for ALECSCore integration
 */
export const dnsAdvancedOperationsTools = (client: AkamaiClient) => 
  new DNSAdvancedOperationsAutoGen(client).getDNSAdvancedOperationsTools();