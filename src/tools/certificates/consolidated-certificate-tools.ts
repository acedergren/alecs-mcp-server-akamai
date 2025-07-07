/**
 * Consolidated Certificate Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates certificate enrollment and integration tools
 * - Provides type-safe CPS (Certificate Provisioning System) API interactions
 * - Implements proper error handling and progress tracking
 * - Eliminates 'unknown' type errors through proper schemas
 * 
 * This module handles DV certificate enrollment, validation, deployment,
 * and integration with Edge Hostnames.
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  ContractIdSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';
import { ProgressToken } from '../../utils/mcp-progress';

/**
 * Certificate-specific schemas
 */
const ContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string()
});

const NetworkConfigurationSchema = z.object({
  networkType: z.enum(['STANDARD_TLS', 'ENHANCED_TLS']).optional().default('ENHANCED_TLS'),
  sniOnly: z.boolean().optional().default(true),
  quicEnabled: z.boolean().optional().default(false),
  mustHaveCiphers: z.array(z.string()).optional(),
  preferredCiphers: z.array(z.string()).optional()
});

const OrganizationSchema = z.object({
  name: z.string(),
  addressLineOne: z.string(),
  city: z.string(),
  region: z.string(),
  postalCode: z.string(),
  countryCode: z.string().length(2),
  phone: z.string()
});

const CreateDVEnrollmentSchema = CustomerSchema.extend({
  cn: z.string().describe('Common name (primary domain)'),
  sans: z.array(z.string()).optional().describe('Subject alternative names'),
  adminContact: ContactSchema,
  techContact: ContactSchema,
  org: OrganizationSchema,
  networkConfiguration: NetworkConfigurationSchema.optional(),
  contractId: ContractIdSchema
});

const EnrollmentIdSchema = z.number().int().positive();

const CheckStatusSchema = CustomerSchema.extend({
  enrollmentId: EnrollmentIdSchema
});

const GetValidationChallengesSchema = CustomerSchema.extend({
  enrollmentId: EnrollmentIdSchema
});

const LinkCertificateSchema = CustomerSchema.extend({
  enrollmentId: EnrollmentIdSchema,
  propertyId: z.string(),
  propertyVersion: z.number().int().positive()
});

const MonitorDeploymentSchema = CustomerSchema.extend({
  enrollmentId: EnrollmentIdSchema,
  maxWaitMinutes: z.number().optional().default(120),
  pollIntervalSeconds: z.number().optional().default(30)
});

/**
 * Certificate response schemas
 */
const EnrollmentSchema = z.object({
  enrollmentId: z.number(),
  cn: z.string(),
  sans: z.array(z.string()).optional(),
  status: z.string(),
  certificateType: z.string(),
  networkConfiguration: z.object({
    networkType: z.string(),
    sniOnly: z.boolean()
  }).optional(),
  pendingChanges: z.array(z.string()).optional()
});

const ValidationChallengeSchema = z.object({
  domain: z.string(),
  status: z.string(),
  validationStatus: z.string().optional(),
  error: z.string().optional(),
  token: z.string().optional(),
  responseBody: z.string().optional(),
  fullPath: z.string().optional(),
  redirectFullPath: z.string().optional(),
  validationRecords: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string()
  })).optional()
});

const DeploymentSchema = z.object({
  deploymentId: z.string().optional(),
  deploymentStatus: z.string(),
  deploymentDate: z.string().optional(),
  targetEnvironment: z.string().optional(),
  primaryCertificate: z.object({
    network: z.string(),
    expiry: z.string(),
    serialNumber: z.string()
  }).optional(),
  properties: z.array(z.object({
    propertyId: z.string(),
    propertyName: z.string()
  })).optional()
});

/**
 * Consolidated certificate tools implementation
 */
export class ConsolidatedCertificateTools extends BaseTool {
  protected readonly domain = 'certificate';

  /**
   * Create a Domain Validated (DV) certificate enrollment
   */
  async createDVEnrollment(args: z.infer<typeof CreateDVEnrollmentSchema>): Promise<MCPToolResponse> {
    const params = CreateDVEnrollmentSchema.parse(args);

    return this.executeStandardOperation(
      'create-dv-enrollment',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/cps/v2/enrollments',
            method: 'POST',
            schema: z.object({
              enrollmentId: z.number(),
              changes: z.array(z.string())
            }),
            body: {
              certificateSigningRequest: {
                cn: params.cn,
                c: params.org.countryCode,
                st: params.org.region,
                l: params.org.city,
                o: params.org.name,
                ou: 'IT',
                sans: params.sans
              },
              certificateType: 'san',
              validationType: 'dv',
              ra: 'lets-encrypt',
              networkConfiguration: params.networkConfiguration || {
                networkType: 'ENHANCED_TLS',
                sniOnly: true
              },
              signatureAlgorithm: 'SHA-256',
              adminContact: params.adminContact,
              techContact: params.techContact,
              org: params.org,
              changeManagement: false
            },
            queryParams: {
              contractId: params.contractId,
              'deploy-not-after': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        );

        // Invalidate enrollment list cache
        await this.invalidateCache(['enrollments:list:*']);

        return {
          enrollmentId: response.enrollmentId,
          cn: params.cn,
          sans: params.sans,
          message: `✅ Created DV certificate enrollment ${response.enrollmentId} for ${params.cn}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Check the status of a DV certificate enrollment
   */
  async checkDVEnrollmentStatus(args: z.infer<typeof CheckStatusSchema>): Promise<MCPToolResponse> {
    const params = CheckStatusSchema.parse(args);

    return this.executeStandardOperation(
      'check-enrollment-status',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/cps/v2/enrollments/${params.enrollmentId}`,
            method: 'GET',
            schema: EnrollmentSchema
          }
        );

        const statusEmoji = {
          'pending': '⏳',
          'wait-review': '🔍',
          'action-required': '⚠️',
          'in-progress': '🔄',
          'complete': '✅',
          'cancelled': '❌',
          'expired': '⏰'
        }[response.status] || '❓';

        return {
          enrollmentId: response.enrollmentId,
          cn: response.cn,
          sans: response.sans,
          status: response.status,
          statusEmoji,
          certificateType: response.certificateType,
          networkConfiguration: response.networkConfiguration,
          pendingChanges: response.pendingChanges || [],
          message: `${statusEmoji} Enrollment ${response.enrollmentId} status: ${response.status}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `enrollment:${p.enrollmentId}:status`,
        cacheTtl: 30 // 30 seconds for status checks
      }
    );
  }

  /**
   * Get domain validation challenges for a DV certificate
   */
  async getDVValidationChallenges(args: z.infer<typeof GetValidationChallengesSchema>): Promise<MCPToolResponse> {
    const params = GetValidationChallengesSchema.parse(args);

    return this.executeStandardOperation(
      'get-validation-challenges',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/cps/v2/enrollments/${params.enrollmentId}/dv-history`,
            method: 'GET',
            schema: z.object({
              domainValidations: z.array(ValidationChallengeSchema)
            })
          }
        );

        const validations = response.domainValidations.map(val => {
          const dnsRecord = val.validationRecords?.[0];
          return {
            domain: val.domain,
            status: val.status,
            validationStatus: val.validationStatus,
            error: val.error,
            dnsChallenge: dnsRecord ? {
              recordName: dnsRecord.name,
              recordType: dnsRecord.type,
              recordValue: dnsRecord.value,
              fullRecord: `${dnsRecord.name} IN ${dnsRecord.type} "${dnsRecord.value}"`
            } : undefined,
            httpChallenge: val.token ? {
              token: val.token,
              responseBody: val.responseBody,
              fullPath: val.fullPath,
              redirectFullPath: val.redirectFullPath
            } : undefined
          };
        });

        return {
          enrollmentId: params.enrollmentId,
          validations,
          pendingDomains: validations.filter(v => v.status !== 'VALIDATED').map(v => v.domain),
          completedDomains: validations.filter(v => v.status === 'VALIDATED').map(v => v.domain)
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `enrollment:${p.enrollmentId}:validations`,
        cacheTtl: 60 // 1 minute
      }
    );
  }

  /**
   * Link a certificate to a property
   */
  async linkCertificateToProperty(args: z.infer<typeof LinkCertificateSchema>): Promise<MCPToolResponse> {
    const params = LinkCertificateSchema.parse(args);

    return this.executeStandardOperation(
      'link-certificate-property',
      params,
      async (client) => {
        // Get property details to get contract/group
        const propResponse = await client.request({
          path: `/papi/v1/properties/${params.propertyId}`,
          method: 'GET'
        }) as any;

        const property = propResponse.properties?.items?.[0];
        if (!property) {
          throw new Error(`Property ${params.propertyId} not found`);
        }

        // Update property rules to use the certificate
        const rulesResponse = await client.request({
          path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion}/rules`,
          method: 'GET',
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        }) as any;

        // Find or create default rule with certificate behavior
        const rules = rulesResponse.rules;
        let defaultRule = rules.children?.find((rule: any) => rule.name === 'default');
        
        if (!defaultRule) {
          defaultRule = {
            name: 'default',
            children: [],
            behaviors: [],
            criteria: []
          };
          rules.children = rules.children || [];
          rules.children.push(defaultRule);
        }

        // Add or update certificate behavior
        const certBehavior = {
          name: 'cpCode',
          options: {
            value: {
              id: params.enrollmentId,
              name: `Certificate ${params.enrollmentId}`,
              cpCodeLimits: null,
              products: []
            }
          }
        };

        defaultRule.behaviors = defaultRule.behaviors || [];
        const existingCertIndex = defaultRule.behaviors.findIndex((b: any) => b.name === 'cpCode');
        
        if (existingCertIndex >= 0) {
          defaultRule.behaviors[existingCertIndex] = certBehavior;
        } else {
          defaultRule.behaviors.push(certBehavior);
        }

        // Update property rules
        await client.request({
          path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion}/rules`,
          method: 'PUT',
          body: { rules },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        });

        // Invalidate caches
        await this.invalidateCache([
          `property:${params.propertyId}:rules:*`,
          `enrollment:${params.enrollmentId}:properties`
        ]);

        return {
          enrollmentId: params.enrollmentId,
          propertyId: params.propertyId,
          propertyVersion: params.propertyVersion,
          message: `✅ Linked certificate ${params.enrollmentId} to property ${params.propertyId} version ${params.propertyVersion}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Monitor certificate deployment with real-time status
   */
  async monitorCertificateDeployment(args: z.infer<typeof MonitorDeploymentSchema>): Promise<MCPToolResponse> {
    const params = MonitorDeploymentSchema.parse(args);

    return this.withProgress(
      `Monitoring certificate ${params.enrollmentId} deployment`,
      async (progress: ProgressToken) => {
        return this.executeStandardOperation(
          'monitor-deployment',
          params,
          async (client) => {
            let attempts = 0;
            const maxAttempts = Math.floor((params.maxWaitMinutes * 60) / params.pollIntervalSeconds);
            let lastStatus = '';

            while (attempts < maxAttempts) {
              progress.update(
                Math.min(90, (attempts / maxAttempts) * 100),
                `Checking deployment status... (${attempts * params.pollIntervalSeconds}s elapsed)`
              );

              // Get deployment status
              const response = await this.makeTypedRequest(
                client,
                {
                  path: `/cps/v2/enrollments/${params.enrollmentId}/deployments`,
                  method: 'GET',
                  schema: z.object({
                    networkConfigurations: z.array(DeploymentSchema)
                  })
                }
              );

              const deployments = response.networkConfigurations;
              const productionDeployment = deployments.find(d => 
                d.targetEnvironment === 'production' || 
                d.primaryCertificate?.network === 'production'
              );

              if (productionDeployment) {
                lastStatus = productionDeployment.deploymentStatus;

                if (lastStatus === 'active') {
                  progress.update(100, 'Certificate deployed successfully!');
                  
                  return {
                    enrollmentId: params.enrollmentId,
                    status: 'deployed',
                    deployments: deployments.map(dep => ({
                      network: dep.targetEnvironment || dep.primaryCertificate?.network || 'unknown',
                      status: dep.deploymentStatus,
                      deploymentId: dep.deploymentId,
                      deploymentDate: dep.deploymentDate,
                      certificateExpiry: dep.primaryCertificate?.expiry,
                      linkedProperties: dep.properties?.length || 0
                    })),
                    message: `✅ Certificate ${params.enrollmentId} successfully deployed to production`
                  };
                } else if (lastStatus === 'failed') {
                  throw new Error(`Certificate deployment failed: ${lastStatus}`);
                }
              }

              attempts++;
              await new Promise(resolve => setTimeout(resolve, params.pollIntervalSeconds * 1000));
            }

            return {
              enrollmentId: params.enrollmentId,
              status: 'timeout',
              lastStatus,
              message: `⏱️ Certificate deployment monitoring timed out after ${params.maxWaitMinutes} minutes`
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
   * Get certificate deployment status
   */
  async getCertificateDeploymentStatus(args: z.infer<typeof CheckStatusSchema>): Promise<MCPToolResponse> {
    const params = CheckStatusSchema.parse(args);

    return this.executeStandardOperation(
      'get-deployment-status',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/cps/v2/enrollments/${params.enrollmentId}/deployments`,
            method: 'GET',
            schema: z.object({
              networkConfigurations: z.array(DeploymentSchema)
            })
          }
        );

        const deployments = response.networkConfigurations;
        
        // Group by network
        const byNetwork: Record<string, typeof deployments> = {};
        deployments.forEach(dep => {
          const network = dep.primaryCertificate?.network || dep.targetEnvironment || 'unknown';
          if (!byNetwork[network]) {
            byNetwork[network] = [];
          }
          byNetwork[network].push(dep);
        });

        // Format deployment status
        let text = `# Certificate Deployment Status\n\n`;
        text += `**Enrollment ID:** ${params.enrollmentId}\n\n`;

        Object.entries(byNetwork).forEach(([network, deps]) => {
          text += `## ${network.toUpperCase()} Network\n\n`;

          deps.forEach(dep => {
            const statusEmoji = {
              'active': '✅',
              'pending': '⏳',
              'in-progress': '🔄',
              'failed': '❌',
              'expired': '⏰'
            }[dep.deploymentStatus] || '❓';

            text += `### ${statusEmoji} Deployment ${dep.deploymentId || 'Current'}\n`;
            
            if (dep.deploymentStatus) {
              text += `- **Status:** ${dep.deploymentStatus}\n`;
            }
            
            if (dep.primaryCertificate) {
              text += `- **Certificate Expiry:** ${new Date(dep.primaryCertificate.expiry).toLocaleDateString()}\n`;
              text += `- **Serial Number:** ${dep.primaryCertificate.serialNumber}\n`;
            }
            
            if (dep.deploymentDate) {
              text += `- **Deployed:** ${new Date(dep.deploymentDate).toLocaleString()}\n`;
            }
            
            if (dep.properties && dep.properties.length > 0) {
              text += `- **Linked Properties:** ${dep.properties.length}\n`;
            }
            
            text += '\n';
          });
        });

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `enrollment:${p.enrollmentId}:deployments`,
        cacheTtl: 60 // 1 minute
      }
    );
  }

  /**
   * List all certificate enrollments
   */
  async listCertificateEnrollments(args: {
    contractId?: string;
    status?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: z.string().optional(),
      status: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-enrollments',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/cps/v2/enrollments',
            method: 'GET',
            schema: z.object({
              enrollments: z.array(EnrollmentSchema)
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId })
            }
          }
        );

        const enrollments = params.status 
          ? response.enrollments.filter(e => e.status === params.status)
          : response.enrollments;

        return {
          enrollments: enrollments.map(enrollment => ({
            enrollmentId: enrollment.enrollmentId,
            cn: enrollment.cn,
            sans: enrollment.sans,
            status: enrollment.status,
            certificateType: enrollment.certificateType,
            networkType: enrollment.networkConfiguration?.networkType,
            pendingChanges: enrollment.pendingChanges?.length || 0
          })),
          totalCount: enrollments.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `enrollments:list:${params.contractId || 'all'}:${params.status || 'all'}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }
}

// Export singleton instance
export const consolidatedCertificateTools = new ConsolidatedCertificateTools();