/**
 * Edge DNS Traffic Management - Auto-Generated Tools
 * 
 * PHASE 3.1: Implementing 15+ DNS Traffic Management Endpoints
 * 
 * This implements comprehensive DNS traffic management using auto-generation
 * for load balancing, failover, geographic routing, and advanced DNS policies
 * based on Akamai's Edge DNS API specifications.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse 
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * DNS Traffic Management Schemas - Auto-Generated from API Specs
 */

// Base DNS schemas
const DNSZoneSchema = CustomerSchema.extend({
  zone: z.string().describe('DNS zone name (e.g., example.com)')
});

// DNS Record Base Schema - commented out unused variable warning
// const DNSRecordBaseSchema = DNSZoneSchema.extend({
//   recordName: z.string().describe('DNS record name'),
//   recordType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA']).describe('DNS record type')
// });

// Traffic Management Schemas
const LoadBalancingConfigSchema = DNSZoneSchema.extend({
  configName: z.string().min(1).max(255).describe('Load balancing configuration name'),
  method: z.enum(['round_robin', 'weighted', 'geographic', 'failover', 'performance']).describe('Load balancing method'),
  pools: z.array(z.object({
    poolName: z.string().describe('Pool name'),
    priority: z.number().int().min(1).max(100).describe('Pool priority (1=highest)'),
    weight: z.number().int().min(1).max(100).default(1).describe('Pool weight for weighted load balancing'),
    servers: z.array(z.object({
      address: z.string().describe('Server IP address or hostname'),
      port: z.number().int().min(1).max(65535).optional().describe('Server port'),
      weight: z.number().int().min(1).max(100).default(1),
      enabled: z.boolean().default(true)
    })).min(1),
    healthCheck: z.object({
      enabled: z.boolean().default(true),
      protocol: z.enum(['http', 'https', 'tcp', 'ping']).default('http'),
      port: z.number().int().min(1).max(65535).optional(),
      path: z.string().optional().describe('Health check path for HTTP/HTTPS'),
      interval: z.number().int().min(10).max(3600).default(30).describe('Health check interval in seconds'),
      timeout: z.number().int().min(1).max(60).default(5).describe('Health check timeout in seconds'),
      retries: z.number().int().min(1).max(10).default(3).describe('Number of retries before marking unhealthy')
    }).optional()
  })).min(1).describe('Server pools for load balancing'),
  ttl: z.number().int().min(30).max(86400).default(300).describe('TTL for DNS responses'),
  enabled: z.boolean().default(true)
});

const FailoverConfigSchema = DNSZoneSchema.extend({
  configName: z.string().min(1).max(255).describe('Failover configuration name'),
  primaryTarget: z.object({
    address: z.string().describe('Primary target IP or hostname'),
    port: z.number().int().min(1).max(65535).optional(),
    healthCheck: z.object({
      enabled: z.boolean().default(true),
      protocol: z.enum(['http', 'https', 'tcp', 'ping']).default('http'),
      path: z.string().optional(),
      expectedStatus: z.number().int().min(100).max(599).default(200),
      interval: z.number().int().min(10).max(3600).default(30),
      timeout: z.number().int().min(1).max(60).default(5),
      retries: z.number().int().min(1).max(10).default(3)
    })
  }),
  secondaryTargets: z.array(z.object({
    address: z.string(),
    port: z.number().int().min(1).max(65535).optional(),
    priority: z.number().int().min(1).max(100).describe('Failover priority (1=first backup)'),
    healthCheck: z.object({
      enabled: z.boolean().default(true),
      protocol: z.enum(['http', 'https', 'tcp', 'ping']).default('http'),
      path: z.string().optional(),
      expectedStatus: z.number().int().min(100).max(599).default(200),
      interval: z.number().int().min(10).max(3600).default(30),
      timeout: z.number().int().min(1).max(60).default(5),
      retries: z.number().int().min(1).max(10).default(3)
    })
  })).min(1).describe('Secondary targets for failover'),
  ttl: z.number().int().min(30).max(86400).default(60).describe('TTL for failover responses'),
  failbackEnabled: z.boolean().default(true).describe('Automatically failback to primary when healthy'),
  enabled: z.boolean().default(true)
});

const GeographicRoutingSchema = DNSZoneSchema.extend({
  configName: z.string().min(1).max(255).describe('Geographic routing configuration name'),
  routingRules: z.array(z.object({
    name: z.string().describe('Routing rule name'),
    geographicScope: z.object({
      countries: z.array(z.string().length(2)).optional().describe('ISO 3166-1 alpha-2 country codes'),
      continents: z.array(z.enum(['NA', 'SA', 'EU', 'AF', 'AS', 'OC', 'AN'])).optional().describe('Continent codes'),
      regions: z.array(z.string()).optional().describe('Custom geographic regions'),
      excludeCountries: z.array(z.string().length(2)).optional().describe('Countries to exclude from rule')
    }),
    targets: z.array(z.object({
      address: z.string(),
      weight: z.number().int().min(1).max(100).default(1),
      enabled: z.boolean().default(true)
    })).min(1),
    priority: z.number().int().min(1).max(100).describe('Rule priority (1=highest)'),
    enabled: z.boolean().default(true)
  })).min(1),
  defaultTarget: z.object({
    address: z.string().describe('Default target for unmatched geographic locations'),
    enabled: z.boolean().default(true)
  }),
  ttl: z.number().int().min(30).max(86400).default(300),
  enabled: z.boolean().default(true)
});

const PerformanceRoutingSchema = DNSZoneSchema.extend({
  configName: z.string().min(1).max(255).describe('Performance-based routing configuration name'),
  performanceTargets: z.array(z.object({
    name: z.string().describe('Target name'),
    address: z.string().describe('Target IP or hostname'),
    monitoringPoints: z.array(z.object({
      location: z.string().describe('Monitoring point location'),
      coordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180)
      }).optional()
    })),
    performanceMetrics: z.object({
      latencyWeight: z.number().min(0).max(1).default(0.6).describe('Weight for latency in performance calculation'),
      availabilityWeight: z.number().min(0).max(1).default(0.3).describe('Weight for availability'),
      throughputWeight: z.number().min(0).max(1).default(0.1).describe('Weight for throughput')
    }).optional(),
    enabled: z.boolean().default(true)
  })).min(2).describe('Performance targets for routing decisions'),
  routingPolicy: z.object({
    algorithm: z.enum(['closest', 'fastest', 'hybrid']).default('hybrid'),
    measurementWindow: z.number().int().min(60).max(3600).default(300).describe('Measurement window in seconds'),
    updateInterval: z.number().int().min(60).max(1800).default(300).describe('Routing table update interval'),
    fallbackBehavior: z.enum(['round_robin', 'geographic', 'static']).default('round_robin')
  }).optional(),
  ttl: z.number().int().min(30).max(86400).default(60),
  enabled: z.boolean().default(true)
});

const TrafficPolicySchema = DNSZoneSchema.extend({
  policyName: z.string().min(1).max(255).describe('Traffic policy name'),
  description: z.string().max(1000).optional(),
  rules: z.array(z.object({
    name: z.string().describe('Rule name'),
    conditions: z.array(z.object({
      type: z.enum(['geographic', 'asn', 'subnet', 'time', 'query_type', 'client_subnet']),
      operator: z.enum(['equals', 'contains', 'in_list', 'not_in_list', 'greater_than', 'less_than']),
      values: z.array(z.string()).min(1),
      negate: z.boolean().default(false)
    })).min(1),
    actions: z.array(z.object({
      type: z.enum(['route_to_pool', 'return_answer', 'apply_ttl', 'set_header', 'block']),
      parameters: z.record(z.any()).describe('Action-specific parameters')
    })).min(1),
    priority: z.number().int().min(1).max(1000).describe('Rule priority'),
    enabled: z.boolean().default(true)
  })).min(1),
  defaultAction: z.object({
    type: z.enum(['route_to_pool', 'return_answer', 'nxdomain']),
    parameters: z.record(z.any())
  }),
  enabled: z.boolean().default(true)
});

/**
 * DNS Traffic Management Auto-Generator
 */
export class DNSTrafficManagementAutoGen {
  private client: AkamaiClient;

  constructor(client: AkamaiClient) {
    this.client = client;
  }

  /**
   * AUTO-GENERATED LOAD BALANCING TOOLS
   */
  
  async createLoadBalancingConfig(args: z.infer<typeof LoadBalancingConfigSchema>): Promise<MCPToolResponse> {
    try {
      const params = LoadBalancingConfigSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/load-balancing`,
        method: 'POST',
        body: {
          configName: params.configName,
          method: params.method,
          pools: params.pools,
          ttl: params.ttl,
          enabled: params.enabled
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Load balancing configuration created successfully',
            configId: (response as any).configId,
            configName: params.configName,
            zone: params.zone,
            method: params.method,
            poolsCount: params.pools.length,
            totalServers: params.pools.reduce((sum, pool) => sum + pool.servers.length, 0),
            ttl: params.ttl,
            enabled: params.enabled
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating load balancing configuration: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
  }

  async updateLoadBalancingConfig(args: z.infer<typeof LoadBalancingConfigSchema> & { configId: string }): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/load-balancing/${args.configId}`,
        method: 'PUT',
        body: args
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Load balancing configuration updated successfully',
            configId: args.configId,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error updating load balancing configuration: ${error.message}`
        }]
      };
    }
  }

  async deleteLoadBalancingConfig(args: z.infer<typeof DNSZoneSchema> & { configId: string }): Promise<MCPToolResponse> {
    try {
      await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/load-balancing/${args.configId}`,
        method: 'DELETE'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Load balancing configuration deleted successfully',
            configId: args.configId,
            zone: args.zone
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error deleting load balancing configuration: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED FAILOVER TOOLS
   */
  
  async createFailoverConfig(args: z.infer<typeof FailoverConfigSchema>): Promise<MCPToolResponse> {
    try {
      const params = FailoverConfigSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/failover`,
        method: 'POST',
        body: params
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Failover configuration created successfully',
            configId: (response as any).configId,
            configName: params.configName,
            zone: params.zone,
            primaryTarget: params.primaryTarget.address,
            secondaryTargetsCount: params.secondaryTargets.length,
            ttl: params.ttl,
            failbackEnabled: params.failbackEnabled
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating failover configuration: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED GEOGRAPHIC ROUTING TOOLS
   */
  
  async createGeographicRouting(args: z.infer<typeof GeographicRoutingSchema>): Promise<MCPToolResponse> {
    try {
      const params = GeographicRoutingSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/geographic-routing`,
        method: 'POST',
        body: params
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Geographic routing configuration created successfully',
            configId: (response as any).configId,
            configName: params.configName,
            zone: params.zone,
            routingRulesCount: params.routingRules.length,
            defaultTarget: params.defaultTarget.address,
            ttl: params.ttl
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating geographic routing configuration: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED PERFORMANCE ROUTING TOOLS
   */
  
  async createPerformanceRouting(args: z.infer<typeof PerformanceRoutingSchema>): Promise<MCPToolResponse> {
    try {
      const params = PerformanceRoutingSchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/performance-routing`,
        method: 'POST',
        body: params
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Performance routing configuration created successfully',
            configId: (response as any).configId,
            configName: params.configName,
            zone: params.zone,
            targetsCount: params.performanceTargets.length,
            algorithm: params.routingPolicy?.algorithm || 'hybrid',
            ttl: params.ttl
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating performance routing configuration: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED TRAFFIC POLICY TOOLS
   */
  
  async createTrafficPolicy(args: z.infer<typeof TrafficPolicySchema>): Promise<MCPToolResponse> {
    try {
      const params = TrafficPolicySchema.parse(args);

      const response = await this.client.request({
        path: `/config-dns/v2/zones/${params.zone}/traffic-policies`,
        method: 'POST',
        body: params
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Traffic policy created successfully',
            policyId: (response as any).policyId,
            policyName: params.policyName,
            zone: params.zone,
            rulesCount: params.rules.length,
            enabled: params.enabled
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating traffic policy: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED HEALTH CHECK TOOLS
   */
  
  async listHealthChecks(args: z.infer<typeof DNSZoneSchema>): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/health-checks`,
        method: 'GET'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Health checks retrieved successfully',
            zone: args.zone,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving health checks: ${error.message}`
        }]
      };
    }
  }

  async getHealthCheckStatus(args: z.infer<typeof DNSZoneSchema> & { healthCheckId: string }): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/zones/${args.zone}/health-checks/${args.healthCheckId}/status`,
        method: 'GET'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Health check status retrieved successfully',
            healthCheckId: args.healthCheckId,
            zone: args.zone,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving health check status: ${error.message}`
        }]
      };
    }
  }

  /**
   * AUTO-GENERATED LIST OPERATIONS
   */
  
  async listTrafficManagementConfigs(args: z.infer<typeof DNSZoneSchema>): Promise<MCPToolResponse> {
    try {
      const [loadBalancing, failover, geographic, performance, policies] = await Promise.all([
        this.client.request({ path: `/config-dns/v2/zones/${args.zone}/load-balancing`, method: 'GET' }),
        this.client.request({ path: `/config-dns/v2/zones/${args.zone}/failover`, method: 'GET' }),
        this.client.request({ path: `/config-dns/v2/zones/${args.zone}/geographic-routing`, method: 'GET' }),
        this.client.request({ path: `/config-dns/v2/zones/${args.zone}/performance-routing`, method: 'GET' }),
        this.client.request({ path: `/config-dns/v2/zones/${args.zone}/traffic-policies`, method: 'GET' })
      ]);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Traffic management configurations retrieved successfully',
            zone: args.zone,
            summary: {
              loadBalancingConfigs: (loadBalancing as any).configs?.length || 0,
              failoverConfigs: (failover as any).configs?.length || 0,
              geographicConfigs: (geographic as any).configs?.length || 0,
              performanceConfigs: (performance as any).configs?.length || 0,
              trafficPolicies: (policies as any).policies?.length || 0
            },
            configurations: {
              loadBalancing,
              failover,
              geographic,
              performance,
              trafficPolicies: policies
            }
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving traffic management configurations: ${error.message}`
        }]
      };
    }
  }

  /**
   * Get all DNS Traffic Management tools (15+ total)
   */
  getDNSTrafficManagementTools(): Record<string, any> {
    return {
      // Load Balancing (4 tools)
      'dns.traffic.load-balancing.create': {
        description: 'Create load balancing configuration with health checks',
        inputSchema: LoadBalancingConfigSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createLoadBalancingConfig(args)
      },
      'dns.traffic.load-balancing.update': {
        description: 'Update existing load balancing configuration',
        inputSchema: LoadBalancingConfigSchema.extend({ configId: z.string() }),
        handler: async (_client: AkamaiClient, args: any) => this.updateLoadBalancingConfig(args)
      },
      'dns.traffic.load-balancing.delete': {
        description: 'Delete load balancing configuration',
        inputSchema: DNSZoneSchema.extend({ configId: z.string() }),
        handler: async (_client: AkamaiClient, args: any) => this.deleteLoadBalancingConfig(args)
      },
      'dns.traffic.load-balancing.list': {
        description: 'List all load balancing configurations for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`zones/${args.zone}/load-balancing`, args)
      },

      // Failover (3 tools)
      'dns.traffic.failover.create': {
        description: 'Create failover configuration with health monitoring',
        inputSchema: FailoverConfigSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createFailoverConfig(args)
      },
      'dns.traffic.failover.update': {
        description: 'Update failover configuration',
        inputSchema: FailoverConfigSchema.extend({ configId: z.string() }),
        handler: async (_client: AkamaiClient, args: any) => this.updateResource(`zones/${args.zone}/failover/${args.configId}`, args)
      },
      'dns.traffic.failover.list': {
        description: 'List all failover configurations for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`zones/${args.zone}/failover`, args)
      },

      // Geographic Routing (3 tools)
      'dns.traffic.geographic.create': {
        description: 'Create geographic routing configuration',
        inputSchema: GeographicRoutingSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createGeographicRouting(args)
      },
      'dns.traffic.geographic.update': {
        description: 'Update geographic routing rules',
        inputSchema: GeographicRoutingSchema.extend({ configId: z.string() }),
        handler: async (_client: AkamaiClient, args: any) => this.updateResource(`zones/${args.zone}/geographic-routing/${args.configId}`, args)
      },
      'dns.traffic.geographic.list': {
        description: 'List geographic routing configurations',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`zones/${args.zone}/geographic-routing`, args)
      },

      // Performance Routing (2 tools)
      'dns.traffic.performance.create': {
        description: 'Create performance-based routing configuration',
        inputSchema: PerformanceRoutingSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createPerformanceRouting(args)
      },
      'dns.traffic.performance.list': {
        description: 'List performance routing configurations',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`zones/${args.zone}/performance-routing`, args)
      },

      // Traffic Policies (2 tools)
      'dns.traffic.policy.create': {
        description: 'Create advanced traffic policy with rules',
        inputSchema: TrafficPolicySchema,
        handler: async (_client: AkamaiClient, args: any) => this.createTrafficPolicy(args)
      },
      'dns.traffic.policy.list': {
        description: 'List all traffic policies for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listResource(`zones/${args.zone}/traffic-policies`, args)
      },

      // Health Checks (2 tools)
      'dns.traffic.health-check.list': {
        description: 'List all health checks for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listHealthChecks(args)
      },
      'dns.traffic.health-check.status': {
        description: 'Get health check status and metrics',
        inputSchema: DNSZoneSchema.extend({ healthCheckId: z.string() }),
        handler: async (_client: AkamaiClient, args: any) => this.getHealthCheckStatus(args)
      },

      // Overview (1 tool)
      'dns.traffic.configurations.list': {
        description: 'List all traffic management configurations for zone',
        inputSchema: DNSZoneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listTrafficManagementConfigs(args)
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

  private async updateResource(path: string, args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/config-dns/v2/${path}`,
        method: 'PUT',
        body: args
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
}

/**
 * Export DNS Traffic Management tools for ALECSCore integration
 */
export const dnsTrafficManagementTools = (client: AkamaiClient) => 
  new DNSTrafficManagementAutoGen(client).getDNSTrafficManagementTools();