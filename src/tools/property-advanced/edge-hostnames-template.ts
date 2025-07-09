/**
 * Edge Hostnames Management - Template-Based Generation
 * 
 * PHASE 2.2: Implementing 10+ Edge Hostnames Endpoints
 * 
 * This implements comprehensive edge hostname management using
 * intelligent templates for DNS integration and certificate coordination.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse 
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * Edge Hostname Schemas
 */
const EdgeHostnameBaseSchema = CustomerSchema.extend({
  edgeHostnameId: z.number().int().positive().optional().describe('Edge hostname ID'),
  domainPrefix: z.string().min(1).max(63).optional().describe('Domain prefix for edge hostname'),
  domainSuffix: z.string().optional().describe('Domain suffix (default: edgesuite.net)'),
  secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).optional().describe('Security network type'),
  ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).optional().describe('IP version behavior')
});

const CreateEdgeHostnameSchema = CustomerSchema.extend({
  domainPrefix: z.string().min(1).max(63).describe('Domain prefix for new edge hostname'),
  domainSuffix: z.string().default('edgesuite.net').describe('Domain suffix'),
  secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).default('ENHANCED_TLS'),
  ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).default('IPV4'),
  certificateEnrollmentId: z.number().int().positive().optional().describe('Certificate enrollment ID for secure hostnames'),
  slotNumber: z.number().int().min(0).max(999).optional().describe('Slot number for shared certificates'),
  comments: z.string().max(1000).optional().describe('Comments for the edge hostname')
});

const UpdateEdgeHostnameSchema = EdgeHostnameBaseSchema.extend({
  edgeHostnameId: z.number().int().positive().describe('Edge hostname ID to update'),
  ttl: z.number().int().min(300).max(86400).optional().describe('TTL for DNS records'),
  mapDetails: z.object({
    mapDomain: z.string().optional(),
    mapMethod: z.enum(['CNAME', 'A', 'AAAA']).optional()
  }).optional()
});

const EdgeHostnameCertificateSchema = EdgeHostnameBaseSchema.extend({
  edgeHostnameId: z.number().int().positive(),
  certificateEnrollmentId: z.number().int().positive().describe('Certificate enrollment ID to associate'),
  certificateType: z.enum(['CPS_MANAGED', 'THIRD_PARTY']).default('CPS_MANAGED')
});

/**
 * Edge Hostname Template Generator
 */
export class EdgeHostnameTemplate {
  private client: AkamaiClient;

  constructor(client: AkamaiClient) {
    this.client = client;
  }

  /**
   * EDGE HOSTNAME CRUD OPERATIONS
   */
  
  async createEdgeHostname(args: z.infer<typeof CreateEdgeHostnameSchema>): Promise<MCPToolResponse> {
    try {
      const params = CreateEdgeHostnameSchema.parse(args);

      // Enterprise validation: Check for naming conflicts
      const existingHostnames = await this.listEdgeHostnames({});
      const fullHostname = `${params.domainPrefix}.${params.domainSuffix}`;
      
      const conflictCheck = (existingHostnames as any).edgeHostnames?.find(
        (eh: any) => eh.edgeHostnameDomain === fullHostname
      );

      if (conflictCheck) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Edge hostname already exists',
              conflictingHostname: fullHostname,
              existingId: conflictCheck.edgeHostnameId,
              recommendation: 'Use a different domain prefix or update the existing hostname'
            }, null, 2)
          }]
        };
      }

      // Validate certificate enrollment if provided
      if (params.certificateEnrollmentId) {
        const certValidation = await this.validateCertificateEnrollment(params.certificateEnrollmentId);
        if (!certValidation.isValid) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Invalid certificate enrollment',
                certificateEnrollmentId: params.certificateEnrollmentId,
                details: certValidation.error
              }, null, 2)
            }]
          };
        }
      }

      const response = await this.client.request({
        path: '/papi/v1/edgehostnames',
        method: 'POST',
        body: {
          domainPrefix: params.domainPrefix,
          domainSuffix: params.domainSuffix,
          secureNetwork: params.secureNetwork,
          ipVersionBehavior: params.ipVersionBehavior,
          certificateEnrollmentId: params.certificateEnrollmentId,
          slotNumber: params.slotNumber,
          comments: params.comments
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Edge hostname created successfully',
            edgeHostnameId: (response as any).edgeHostnameId,
            edgeHostnameDomain: fullHostname,
            secureNetwork: params.secureNetwork,
            ipVersionBehavior: params.ipVersionBehavior,
            certificateEnrollmentId: params.certificateEnrollmentId,
            status: 'PENDING_DEPLOYMENT',
            nextSteps: [
              'Monitor deployment status with property.edge-hostname.status',
              'Associate with properties using property.hostnames.update',
              'Configure DNS records if using custom domain'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating edge hostname: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
  }

  async listEdgeHostnames(args: z.infer<typeof CustomerSchema>): Promise<MCPToolResponse> {
    try {
      const params = CustomerSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional()
      }).parse(args);
      const response = await this.client.request({
        path: '/papi/v1/edgehostnames',
        method: 'GET',
        queryParams: {
          ...(params.groupId && { groupId: params.groupId }),
          ...(params.contractId && { contractId: params.contractId })
        }
      });

      const edgeHostnames = (response as any).edgeHostnames || [];
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            edgeHostnamesCount: edgeHostnames.length,
            edgeHostnames: edgeHostnames.map((eh: any) => ({
              edgeHostnameId: eh.edgeHostnameId,
              edgeHostnameDomain: eh.edgeHostnameDomain,
              domainPrefix: eh.domainPrefix,
              domainSuffix: eh.domainSuffix,
              secureNetwork: eh.secureNetwork,
              ipVersionBehavior: eh.ipVersionBehavior,
              status: eh.status,
              certificateEnrollmentId: eh.certificateEnrollmentId,
              usedBy: eh.usedBy?.length || 0,
              createdDate: eh.createdDate,
              lastModifiedDate: eh.lastModifiedDate
            })),
            summary: {
              total: edgeHostnames.length,
              bySecureNetwork: this.groupBy(edgeHostnames, 'secureNetwork'),
              byStatus: this.groupBy(edgeHostnames, 'status'),
              byIpVersion: this.groupBy(edgeHostnames, 'ipVersionBehavior')
            }
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error listing edge hostnames: ${error.message}`
        }]
      };
    }
  }

  async getEdgeHostname(args: z.infer<typeof EdgeHostnameBaseSchema>): Promise<MCPToolResponse> {
    try {
      const params = EdgeHostnameBaseSchema.parse(args);

      if (!params.edgeHostnameId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: edgeHostnameId is required'
          }]
        };
      }

      const response = await this.client.request({
        path: `/papi/v1/edgehostnames/${params.edgeHostnameId}`,
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
          text: `Error getting edge hostname: ${error.message}`
        }]
      };
    }
  }

  async updateEdgeHostname(args: z.infer<typeof UpdateEdgeHostnameSchema>): Promise<MCPToolResponse> {
    try {
      const params = UpdateEdgeHostnameSchema.parse(args);

      await this.client.request({
        path: `/papi/v1/edgehostnames/${params.edgeHostnameId}`,
        method: 'PUT',
        body: {
          ttl: params.ttl,
          mapDetails: params.mapDetails
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Edge hostname updated successfully',
            edgeHostnameId: params.edgeHostnameId,
            updatedFields: {
              ttl: params.ttl,
              mapDetails: params.mapDetails
            }
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error updating edge hostname: ${error.message}`
        }]
      };
    }
  }

  async deleteEdgeHostname(args: z.infer<typeof EdgeHostnameBaseSchema>): Promise<MCPToolResponse> {
    try {
      const params = EdgeHostnameBaseSchema.parse(args);

      if (!params.edgeHostnameId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: edgeHostnameId is required'
          }]
        };
      }

      // Enterprise validation: Check if hostname is in use
      const usageCheck = await this.checkEdgeHostnameUsage(params.edgeHostnameId);
      if (usageCheck.inUse) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Cannot delete edge hostname in use',
              edgeHostnameId: params.edgeHostnameId,
              usedByProperties: usageCheck.properties,
              recommendation: 'Remove hostname from all properties before deletion'
            }, null, 2)
          }]
        };
      }

      await this.client.request({
        path: `/papi/v1/edgehostnames/${params.edgeHostnameId}`,
        method: 'DELETE'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Edge hostname deleted successfully',
            edgeHostnameId: params.edgeHostnameId
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error deleting edge hostname: ${error.message}`
        }]
      };
    }
  }

  /**
   * CERTIFICATE INTEGRATION
   */
  
  async associateCertificate(args: z.infer<typeof EdgeHostnameCertificateSchema>): Promise<MCPToolResponse> {
    try {
      const params = EdgeHostnameCertificateSchema.parse(args);

      // Validate certificate enrollment
      const certValidation = await this.validateCertificateEnrollment(params.certificateEnrollmentId);
      if (!certValidation.isValid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Certificate validation failed',
              details: certValidation.error
            }, null, 2)
          }]
        };
      }

      await this.client.request({
        path: `/papi/v1/edgehostnames/${params.edgeHostnameId}/certificate`,
        method: 'PUT',
        body: {
          certificateEnrollmentId: params.certificateEnrollmentId,
          certificateType: params.certificateType
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Certificate associated with edge hostname successfully',
            edgeHostnameId: params.edgeHostnameId,
            certificateEnrollmentId: params.certificateEnrollmentId,
            certificateType: params.certificateType,
            associationStatus: 'PENDING_DEPLOYMENT'
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error associating certificate: ${error.message}`
        }]
      };
    }
  }

  /**
   * DNS INTEGRATION
   */
  
  async generateDNSRecords(args: z.infer<typeof EdgeHostnameBaseSchema>): Promise<MCPToolResponse> {
    try {
      const params = EdgeHostnameBaseSchema.parse(args);

      if (!params.edgeHostnameId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: edgeHostnameId is required'
          }]
        };
      }

      const hostnameDetails = await this.client.request({
        path: `/papi/v1/edgehostnames/${params.edgeHostnameId}`,
        method: 'GET'
      });

      const hostname = hostnameDetails as any;
      const dnsRecords = this.generateDNSRecordsForHostname(hostname);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            edgeHostnameId: params.edgeHostnameId,
            edgeHostnameDomain: hostname.edgeHostnameDomain,
            recommendedDNSRecords: dnsRecords,
            instructions: [
              'Create these DNS records in your DNS provider',
              'Wait for DNS propagation (typically 5-15 minutes)',
              'Verify DNS resolution with property.edge-hostname.verify-dns'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error generating DNS records: ${error.message}`
        }]
      };
    }
  }

  async verifyDNS(args: z.infer<typeof EdgeHostnameBaseSchema>): Promise<MCPToolResponse> {
    try {
      const params = EdgeHostnameBaseSchema.parse(args);

      if (!params.edgeHostnameId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: edgeHostnameId is required'
          }]
        };
      }

      const response = await this.client.request({
        path: `/papi/v1/edgehostnames/${params.edgeHostnameId}/dns-verification`,
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
          text: `Error verifying DNS: ${error.message}`
        }]
      };
    }
  }

  /**
   * Helper methods
   */
  
  private async validateCertificateEnrollment(enrollmentId: number): Promise<{isValid: boolean, error?: string}> {
    try {
      const response = await this.client.request({
        path: `/cps/v2/enrollments/${enrollmentId}`,
        method: 'GET'
      });

      const enrollment = response as any;
      if (enrollment.validationType !== 'dv') {
        return {
          isValid: false,
          error: 'Only Domain Validated (DV) certificates are supported for edge hostnames'
        };
      }

      return { isValid: true };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Certificate enrollment ${enrollmentId} not found or not accessible`
      };
    }
  }

  private async checkEdgeHostnameUsage(edgeHostnameId: number): Promise<{inUse: boolean, properties: string[]}> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/edgehostnames/${edgeHostnameId}/usage`,
        method: 'GET'
      });

      const usage = response as any;
      return {
        inUse: usage.usedBy && usage.usedBy.length > 0,
        properties: usage.usedBy || []
      };
    } catch (error: any) {
      return { inUse: false, properties: [] };
    }
  }

  private generateDNSRecordsForHostname(hostname: any): any[] {
    const records = [];

    // CNAME record for the edge hostname
    if (hostname.edgeHostnameDomain) {
      records.push({
        type: 'CNAME',
        name: hostname.domainPrefix,
        value: hostname.edgeHostnameDomain,
        ttl: 300,
        comment: `Edge hostname for Akamai delivery`
      });
    }

    // Add IPv6 records if IPv6 is enabled
    if (hostname.ipVersionBehavior === 'IPV6_PERFORMANCE' || hostname.ipVersionBehavior === 'IPV6_COMPLIANCE') {
      records.push({
        type: 'AAAA',
        name: hostname.domainPrefix,
        value: '2001:db8::1', // Placeholder - would be actual IPv6 address
        ttl: 300,
        comment: `IPv6 support for edge hostname`
      });
    }

    return records;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Get all edge hostname tools (10+ total)
   */
  getEdgeHostnameTools(): Record<string, any> {
    return {
      // Core CRUD Operations (5 tools)
      'property.edge-hostname.create': {
        description: 'Create new edge hostname with DNS and certificate integration',
        inputSchema: CreateEdgeHostnameSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createEdgeHostname(args)
      },
      'property.edge-hostname.list': {
        description: 'List all edge hostnames with filtering and summary',
        inputSchema: CustomerSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listEdgeHostnames(args)
      },
      'property.edge-hostname.get': {
        description: 'Get detailed information about specific edge hostname',
        inputSchema: EdgeHostnameBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getEdgeHostname(args)
      },
      'property.edge-hostname.update': {
        description: 'Update edge hostname configuration and mapping',
        inputSchema: UpdateEdgeHostnameSchema,
        handler: async (_client: AkamaiClient, args: any) => this.updateEdgeHostname(args)
      },
      'property.edge-hostname.delete': {
        description: 'Delete edge hostname with usage validation',
        inputSchema: EdgeHostnameBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.deleteEdgeHostname(args)
      },

      // Certificate Integration (2 tools)
      'property.edge-hostname.certificate.associate': {
        description: 'Associate certificate with edge hostname',
        inputSchema: EdgeHostnameCertificateSchema,
        handler: async (_client: AkamaiClient, args: any) => this.associateCertificate(args)
      },
      'property.edge-hostname.certificate.status': {
        description: 'Get certificate association status for edge hostname',
        inputSchema: EdgeHostnameBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getEdgeHostname(args) // Same endpoint
      },

      // DNS Integration (3 tools)
      'property.edge-hostname.dns.generate': {
        description: 'Generate DNS records for edge hostname configuration',
        inputSchema: EdgeHostnameBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.generateDNSRecords(args)
      },
      'property.edge-hostname.dns.verify': {
        description: 'Verify DNS configuration for edge hostname',
        inputSchema: EdgeHostnameBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.verifyDNS(args)
      },
      'property.edge-hostname.usage': {
        description: 'Check which properties use specific edge hostname',
        inputSchema: EdgeHostnameBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.checkEdgeHostnameUsage(args.edgeHostnameId!).then(usage => ({
          content: [{
            type: 'text',
            text: JSON.stringify(usage, null, 2)
          }]
        }))
      }
    };
  }
}

/**
 * Export edge hostname tools for ALECSCore integration
 */
export const edgeHostnameTools = (client: AkamaiClient) => 
  new EdgeHostnameTemplate(client).getEdgeHostnameTools();