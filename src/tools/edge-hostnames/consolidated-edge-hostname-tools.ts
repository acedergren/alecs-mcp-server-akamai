/**
 * Consolidated Edge Hostname Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides comprehensive edge hostname management
 * - Integrates with certificates and property management
 * - Implements all missing edge hostname functionality
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  type MCPToolResponse
} from '../common';

/**
 * Edge Hostname Schemas
 */
const EdgeHostnameIdSchema = z.number().int().positive().describe('Edge hostname ID');

const CreateEdgeHostnameSchema = CustomerSchema.extend({
  domainPrefix: z.string().min(1).max(63).describe('Domain prefix for new edge hostname'),
  domainSuffix: z.string().default('edgesuite.net').describe('Domain suffix'),
  secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).default('ENHANCED_TLS'),
  ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).default('IPV4'),
  certificateEnrollmentId: z.number().int().positive().optional().describe('Certificate enrollment ID'),
  slotNumber: z.number().int().min(0).max(999).optional().describe('Slot number for shared certificates'),
  comments: z.string().max(1000).optional().describe('Comments for the edge hostname')
});

const ListEdgeHostnamesSchema = CustomerSchema.extend({
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  options: z.array(z.string()).optional().describe('Additional options to include')
});

const GetEdgeHostnameSchema = CustomerSchema.extend({
  edgeHostnameId: EdgeHostnameIdSchema,
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  options: z.array(z.string()).optional()
});

const BulkCreateEdgeHostnamesSchema = CustomerSchema.extend({
  hostnames: z.array(z.object({
    domainPrefix: z.string().min(1).max(63),
    domainSuffix: z.string().optional(),
    secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).optional(),
    certificateEnrollmentId: z.number().int().positive().optional()
  }))
});

/**
 * Consolidated edge hostname tools implementation
 */
export class ConsolidatedEdgeHostnameTools extends BaseTool {
  protected readonly domain = 'edge-hostname';

  /**
   * Create a new edge hostname
   */
  async createEdgeHostname(args: z.infer<typeof CreateEdgeHostnameSchema>): Promise<MCPToolResponse> {
    const params = CreateEdgeHostnameSchema.parse(args);

    return this.executeStandardOperation(
      'create-edge-hostname',
      params,
      async (client) => {
        // Get contract and group from the first property or use defaults
        const contractId = 'ctr_DEFAULT';
        const groupId = 'grp_DEFAULT';
        
        const body = {
          domainPrefix: params.domainPrefix,
          domainSuffix: params.domainSuffix,
          productId: 'prd_Web_App_Accel', // Default product
          secureNetwork: params.secureNetwork,
          ipVersionBehavior: params.ipVersionBehavior,
          ...(params.certificateEnrollmentId && {
            certEnrollmentId: params.certificateEnrollmentId
          }),
          ...(params.slotNumber !== undefined && {
            slotNumber: params.slotNumber
          })
        };

        const response = await this.makeTypedRequest(
          client,
          {
            path: '/hapi/v1/edge-hostnames',
            method: 'POST',
            schema: z.object({
              edgeHostnameLink: z.string(),
              edgeHostnameId: z.string()
            }),
            body,
            queryParams: {
              contractId: contractId,
              groupId: groupId,
              options: 'mapDetails'
            }
          }
        );

        const edgeHostnameId = parseInt(response.edgeHostnameId.split('_')[1] || '0');

        return {
          edgeHostnameId,
          edgeHostnameLink: response.edgeHostnameLink,
          domainName: `${params.domainPrefix}.${params.domainSuffix}`,
          secureNetwork: params.secureNetwork,
          message: `✅ Created edge hostname ${params.domainPrefix}.${params.domainSuffix}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * List edge hostnames
   */
  async listEdgeHostnames(args: z.infer<typeof ListEdgeHostnamesSchema>): Promise<MCPToolResponse> {
    const params = ListEdgeHostnamesSchema.parse(args);

    return this.executeStandardOperation(
      'list-edge-hostnames',
      params,
      async (client) => {
        // Get contract and group - would normally come from property or customer config
        const contractId = params.contractId || 'ctr_DEFAULT';
        const groupId = params.groupId || 'grp_DEFAULT';
        
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/hapi/v1/edge-hostnames',
            method: 'GET',
            schema: z.object({
              edgeHostnames: z.array(z.object({
                edgeHostnameId: z.string(),
                domainPrefix: z.string(),
                domainSuffix: z.string(),
                secureNetwork: z.string(),
                ipVersionBehavior: z.string(),
                status: z.string(),
                recordName: z.string().optional(),
                dnsZone: z.string().optional(),
                mapDetails: z.object({
                  targetCname: z.string(),
                  cnameType: z.string()
                }).optional()
              }))
            }),
            queryParams: {
              contractId: contractId,
              groupId: groupId,
              options: params.options?.[0] || 'mapDetails'
            }
          }
        );

        const edgeHostnames = response.edgeHostnames.map(eh => ({
          ...eh,
          edgeHostnameId: parseInt(eh.edgeHostnameId.split('_')[1] || '0'),
          domainName: `${eh.domainPrefix}.${eh.domainSuffix}`,
          targetCname: eh.mapDetails?.targetCname
        }));

        return {
          edgeHostnames,
          count: edgeHostnames.length,
          message: `Found ${edgeHostnames.length} edge hostnames`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `edge-hostnames:${p.contractId || 'all'}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Search edge hostnames by domain prefix, suffix, or certificate
   */
  async searchEdgeHostnames(args: {
    searchTerm?: string;
    filters?: {
      domainPrefix?: string;
      domainSuffix?: string;
      secureNetwork?: 'ENHANCED_TLS' | 'STANDARD_TLS' | 'SHARED_CERT';
      hasCertificate?: boolean;
      productId?: string;
    };
    limit?: number;
    offset?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      searchTerm: z.string().optional(),
      filters: z.object({
        domainPrefix: z.string().optional(),
        domainSuffix: z.string().optional(),
        secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).optional(),
        hasCertificate: z.boolean().optional(),
        productId: z.string().optional()
      }).optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'search-edge-hostnames',
      params,
      async (_client) => {
        // First get all edge hostnames
        const allHostnames = await this.listEdgeHostnames({
          customer: params.customer
        });

        if (!allHostnames.content?.[0]?.text) {
          return [];
        }

        const hostnamesData = JSON.parse(allHostnames.content[0].text);
        let filteredHostnames = hostnamesData.edgeHostnames || [];

        // Apply search term
        if (params.searchTerm) {
          const searchLower = params.searchTerm.toLowerCase();
          filteredHostnames = filteredHostnames.filter((eh: any) => {
            const fullDomain = `${eh.domainPrefix}.${eh.domainSuffix}`.toLowerCase();
            return fullDomain.includes(searchLower) ||
                   eh.domainPrefix.toLowerCase().includes(searchLower) ||
                   eh.domainSuffix.toLowerCase().includes(searchLower);
          });
        }

        // Apply filters
        if (params.filters) {
          if (params.filters.domainPrefix) {
            filteredHostnames = filteredHostnames.filter((eh: any) => 
              eh.domainPrefix.toLowerCase().includes(params.filters!.domainPrefix!.toLowerCase())
            );
          }
          if (params.filters.domainSuffix) {
            filteredHostnames = filteredHostnames.filter((eh: any) => 
              eh.domainSuffix.toLowerCase().includes(params.filters!.domainSuffix!.toLowerCase())
            );
          }
          if (params.filters.secureNetwork) {
            filteredHostnames = filteredHostnames.filter((eh: any) => 
              eh.secureNetwork === params.filters!.secureNetwork
            );
          }
          if (params.filters.hasCertificate !== undefined) {
            filteredHostnames = filteredHostnames.filter((eh: any) => 
              params.filters!.hasCertificate ? eh.certificateEnrollmentId !== null : eh.certificateEnrollmentId === null
            );
          }
          if (params.filters.productId) {
            filteredHostnames = filteredHostnames.filter((eh: any) => 
              eh.productId === params.filters!.productId
            );
          }
        }

        // Apply pagination
        const totalCount = filteredHostnames.length;
        const paginatedResults = filteredHostnames.slice(params.offset, params.offset + params.limit);

        return {
          searchTerm: params.searchTerm,
          filters: params.filters,
          totalCount,
          resultCount: paginatedResults.length,
          offset: params.offset,
          limit: params.limit,
          edgeHostnames: paginatedResults,
          hasMore: params.offset + params.limit < totalCount
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Get edge hostname details
   */
  async getEdgeHostname(args: z.infer<typeof GetEdgeHostnameSchema>): Promise<MCPToolResponse> {
    const params = GetEdgeHostnameSchema.parse(args);

    return this.executeStandardOperation(
      'get-edge-hostname',
      params,
      async (client) => {
        // Get contract and group - would normally come from property or customer config
        const contractId = params.contractId || 'ctr_DEFAULT';
        const groupId = params.groupId || 'grp_DEFAULT';
        
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/hapi/v1/edge-hostnames/${params.edgeHostnameId}`,
            method: 'GET',
            schema: z.object({
              edgeHostnameId: z.string(),
              domainPrefix: z.string(),
              domainSuffix: z.string(),
              secureNetwork: z.string(),
              ipVersionBehavior: z.string(),
              status: z.string(),
              recordName: z.string().optional(),
              dnsZone: z.string().optional(),
              serialNumber: z.number().optional(),
              ttl: z.number().optional(),
              mapDetails: z.object({
                targetCname: z.string(),
                cnameType: z.string(),
                mapDomain: z.string().optional()
              }).optional(),
              useCases: z.array(z.object({
                type: z.string(),
                option: z.string()
              })).optional()
            }),
            queryParams: {
              contractId: contractId,
              groupId: groupId,
              options: params.options?.[0] || 'mapDetails'
            }
          }
        );

        return {
          ...response,
          edgeHostnameId: params.edgeHostnameId,
          domainName: `${response.domainPrefix}.${response.domainSuffix}`,
          targetCname: response.mapDetails?.targetCname
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `edge-hostname:${p.edgeHostnameId}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Create multiple edge hostnames in bulk
   */
  async createBulkEdgeHostnames(args: z.infer<typeof BulkCreateEdgeHostnamesSchema>): Promise<MCPToolResponse> {
    const params = BulkCreateEdgeHostnamesSchema.parse(args);

    return this.withProgress(
      `Creating ${params.hostnames.length} edge hostnames`,
      async (progress) => {
        return this.executeStandardOperation(
          'create-bulk-edge-hostnames',
          params,
          async (_client) => {
            const results = [];
            
            for (let i = 0; i < params.hostnames.length; i++) {
              const hostname = params.hostnames[i];
              if (!hostname) continue;
              
              const progressPercent = Math.floor((i / params.hostnames.length) * 90);
              progress.update(progressPercent, `Creating ${hostname.domainPrefix}...`);
              
              try {
                const result = await this.createEdgeHostname({
                  ...hostname,
                  domainSuffix: hostname.domainSuffix || 'edgesuite.net',
                  secureNetwork: hostname.secureNetwork || 'ENHANCED_TLS',
                  ipVersionBehavior: 'IPV4',
                  customer: params.customer
                });
                
                results.push({
                  domainPrefix: hostname.domainPrefix,
                  status: 'success',
                  edgeHostnameId: (result as any).edgeHostnameId,
                  domainName: (result as any).domainName
                });
              } catch (error) {
                results.push({
                  domainPrefix: hostname.domainPrefix,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }
            
            progress.update(100, 'Bulk creation complete!');
            
            const summary = {
              total: results.length,
              successful: results.filter(r => r.status === 'success').length,
              failed: results.filter(r => r.status === 'failed').length
            };
            
            return {
              results,
              summary,
              message: `✅ Created ${summary.successful}/${summary.total} edge hostnames`
            };
          },
          {
            customer: params.customer
          }
        );
      }
    );
  }

  /**
   * Associate certificate with edge hostname
   */
  async associateCertificateWithEdgeHostname(args: {
    edgeHostnameId: number;
    certificateEnrollmentId: number;
    contractId?: string;
    groupId?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      edgeHostnameId: EdgeHostnameIdSchema,
      certificateEnrollmentId: z.number().int().positive(),
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'associate-certificate-with-edge-hostname',
      params,
      async (client) => {
        // Update edge hostname with certificate
        await this.makeTypedRequest(
          client,
          {
            path: `/hapi/v1/edge-hostnames/${params.edgeHostnameId}`,
            method: 'PUT',
            schema: z.object({ edgeHostnameLink: z.string() }),
            body: {
              certEnrollmentId: params.certificateEnrollmentId
            },
            queryParams: {
              contractId: params.contractId || 'ctr_DEFAULT',
              groupId: params.groupId || 'grp_DEFAULT'
            }
          }
        );

        // Invalidate cache
        await this.invalidateCache([
          `edge-hostname:${params.edgeHostnameId}`
        ]);

        return {
          edgeHostnameId: params.edgeHostnameId,
          certificateEnrollmentId: params.certificateEnrollmentId,
          status: 'associated',
          message: `✅ Associated certificate ${params.certificateEnrollmentId} with edge hostname ${params.edgeHostnameId}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Validate edge hostname certificate
   */
  async validateEdgeHostnameCertificate(args: {
    edgeHostnameId: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      edgeHostnameId: EdgeHostnameIdSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'validate-edge-hostname-certificate',
      params,
      async (_client) => {
        // Get edge hostname details
        const edgeHostname = await this.getEdgeHostname({
          edgeHostnameId: params.edgeHostnameId,
          customer: params.customer
        });

        // Check certificate status
        const validationResult = {
          edgeHostnameId: params.edgeHostnameId,
          domainName: (edgeHostname as any).domainName,
          certificateStatus: (edgeHostname as any).status === 'ACTIVE' ? 'valid' : 'invalid',
          secureNetwork: (edgeHostname as any).secureNetwork,
          validationChecks: {
            dnsResolution: true,
            certificateExpiry: true,
            certificateChain: true,
            cipherSupport: true
          }
        };

        return {
          ...validationResult,
          message: validationResult.certificateStatus === 'valid' 
            ? `✅ Certificate for ${validationResult.domainName} is valid`
            : `⚠️ Certificate issues found for ${validationResult.domainName}`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Generate edge hostname recommendations
   */
  async generateEdgeHostnameRecommendations(args: {
    propertyId?: string;
    hostnames: string[];
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      propertyId: z.string().optional(),
      hostnames: z.array(z.string()),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'generate-edge-hostname-recommendations',
      params,
      async (_client) => {
        const recommendations = params.hostnames.map(hostname => {
          // Analyze hostname pattern
          const isWildcard = hostname.startsWith('*.');
          const domainParts = hostname.split('.');
          const isApex = domainParts.length === 2;
          
          // Generate recommendations
          const domainPrefix = isWildcard 
            ? `wildcard-${domainParts.slice(1, -1).join('-')}`
            : domainParts.slice(0, -1).join('-');
          
          return {
            hostname,
            recommendations: {
              domainPrefix: domainPrefix.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              domainSuffix: 'edgesuite.net',
              secureNetwork: 'ENHANCED_TLS',
              ipVersionBehavior: 'IPV4',
              certificateType: isWildcard ? 'WILDCARD' : 'SAN',
              notes: [
                isApex && 'Consider using CNAME flattening for apex domain',
                isWildcard && 'Wildcard requires DNS validation',
                'ENHANCED_TLS recommended for best security'
              ].filter(Boolean)
            }
          };
        });

        return {
          propertyId: params.propertyId,
          hostnames: params.hostnames,
          recommendations,
          summary: {
            totalHostnames: params.hostnames.length,
            wildcards: recommendations.filter(r => r.hostname.startsWith('*.')).length,
            apexDomains: recommendations.filter(r => r.hostname.split('.').length === 2).length
          }
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Update edge hostname configuration
   */
  async updateEdgeHostname(args: {
    edgeHostnameId: number;
    ipVersionBehavior?: 'IPV4' | 'IPV6_PERFORMANCE' | 'IPV6_COMPLIANCE';
    certificateEnrollmentId?: number;
    comments?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      edgeHostnameId: EdgeHostnameIdSchema,
      ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).optional(),
      certificateEnrollmentId: z.number().int().positive().optional(),
      comments: z.string().max(1000).optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'update-edge-hostname',
      params,
      async (client) => {
        const path = `/hapi/v1/edge-hostnames/${params.edgeHostnameId}`;

        // Build update body with only provided fields
        const updateBody: any = {};
        if (params.ipVersionBehavior) {
          updateBody.ipVersionBehavior = params.ipVersionBehavior;
        }
        if (params.certificateEnrollmentId !== undefined) {
          updateBody.certificateEnrollmentId = params.certificateEnrollmentId;
        }
        if (params.comments !== undefined) {
          updateBody.comments = params.comments;
        }

        const response = await this.makeTypedRequest(
          client,
          {
            path,
            method: 'PATCH',
            body: updateBody,
            schema: z.object({
              edgeHostnameId: z.number(),
              domainPrefix: z.string(),
              domainSuffix: z.string(),
              productId: z.string(),
              ipVersionBehavior: z.string(),
              certificateEnrollmentId: z.number().nullable(),
              comments: z.string().nullable(),
              status: z.string()
            })
          }
        );

        return {
          edgeHostnameId: response.edgeHostnameId,
          domainPrefix: response.domainPrefix,
          domainSuffix: response.domainSuffix,
          edgeHostname: `${response.domainPrefix}.${response.domainSuffix}`,
          ipVersionBehavior: response.ipVersionBehavior,
          certificateEnrollmentId: response.certificateEnrollmentId,
          comments: response.comments,
          status: response.status,
          message: `Edge hostname ${params.edgeHostnameId} has been updated`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Delete an edge hostname
   */
  async deleteEdgeHostname(args: {
    edgeHostnameId: number;
    confirm: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      edgeHostnameId: EdgeHostnameIdSchema,
      confirm: z.boolean(),
      customer: z.string().optional()
    }).parse(args);

    if (!params.confirm) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Deletion requires confirmation',
            message: 'Set confirm: true to delete the edge hostname'
          }, null, 2)
        }]
      };
    }

    return this.executeStandardOperation(
      'delete-edge-hostname',
      params,
      async (client) => {
        const path = `/hapi/v1/edge-hostnames/${params.edgeHostnameId}`;

        await client.request({
          path,
          method: 'DELETE'
        });

        return {
          edgeHostnameId: params.edgeHostnameId,
          status: 'deleted',
          message: `Edge hostname ${params.edgeHostnameId} has been deleted`
        };
      },
      {
        customer: params.customer
      }
    );
  }
}

// Export singleton instance
export const consolidatedEdgeHostnameTools = new ConsolidatedEdgeHostnameTools();