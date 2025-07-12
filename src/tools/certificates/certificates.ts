/**
 * Certificate Management Tools
 * 
 * Comprehensive certificate enrollment, validation, and deployment tools
 * for Akamai Certificate Provisioning System (CPS).
 * 
 * ARCHITECTURE NOTES:
 * - Uses AkamaiOperation.execute pattern for consistency
 * - Follows Snow Leopard Architecture principles
 * - Provides type-safe certificate management
 */

import { z } from 'zod';
import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiOperation } from '../common/akamai-operation';
import { CertificateToolSchemas, CertificateEndpoints } from './api';

/**
 * List all certificate enrollments
 */
export async function listCertificates(args: z.infer<typeof CertificateToolSchemas.listCertificates>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificates_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        method: 'GET',
        path: CertificateEndpoints.listEnrollments(),
        queryParams
      });
    },
    {
      format: args.format || 'text',
      formatter: (response: any) => {
        const enrollments = response.enrollments || [];
        
        let text = `📜 **Certificate Enrollments**\n\n`;
        
        if (enrollments.length === 0) {
          text += '⚠️ No certificate enrollments found.\n';
          return text;
        }
        
        text += `Found **${enrollments.length}** enrollments:\n\n`;
        
        enrollments.forEach((enrollment: any, index: number) => {
          text += `${index + 1}. **${enrollment.csr?.cn || 'Unknown CN'}**\n`;
          text += `   • ID: ${enrollment.enrollmentId}\n`;
          text += `   • Status: ${enrollment.pendingChanges?.length > 0 ? 'Pending Changes' : 'Active'}\n`;
          text += `   • Type: ${enrollment.certificateType || 'Unknown'}\n`;
          text += `   • Network: ${enrollment.networkConfiguration?.dnsNameSettings?.dnsNames?.join(', ') || 'Not configured'}\n`;
          text += `\n`;
        });
        
        return text;
      },
      cacheKey: (p) => `certificates:list:${p.contractId || 'all'}:${p.offset || 0}`,
      cacheTtl: 300
    }
  );
}

/**
 * Get certificate enrollment details
 */
export async function getCertificate(args: z.infer<typeof CertificateToolSchemas.getCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificate_get',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: CertificateEndpoints.getEnrollment(args.enrollmentId)
      });
    },
    {
      format: 'text',
      formatter: (enrollment: any) => {
        let text = `📜 **Certificate Details**\n\n`;
        text += `**Enrollment ID:** ${enrollment.enrollmentId}\n`;
        text += `**Common Name:** ${enrollment.csr?.cn || 'Unknown'}\n`;
        text += `**Status:** ${enrollment.pendingChanges?.length > 0 ? 'Pending Changes' : 'Active'}\n`;
        text += `**Certificate Type:** ${enrollment.certificateType || 'Unknown'}\n`;
        
        if (enrollment.csr?.sans?.length > 0) {
          text += `**SANs:** ${enrollment.csr.sans.join(', ')}\n`;
        }
        
        if (enrollment.networkConfiguration?.dnsNameSettings?.dnsNames) {
          text += `**DNS Names:** ${enrollment.networkConfiguration.dnsNameSettings.dnsNames.join(', ')}\n`;
        }
        
        if (enrollment.validationType) {
          text += `**Validation Type:** ${enrollment.validationType}\n`;
        }
        
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Monitor validation status\n`;
        text += `2. Deploy to networks when ready\n`;
        text += `3. Configure edge hostnames\n`;
        
        return text;
      },
      cacheKey: (p) => `certificate:${p.enrollmentId}`,
      cacheTtl: 60
    }
  );
}

/**
 * Create a new Default DV certificate enrollment
 */
export async function createDvCertificate(args: z.infer<typeof CertificateToolSchemas.createDvCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificate_create_dv',
    args,
    async (client) => {
      const enrollmentBody = {
        certificateType: 'default_dv',
        csr: {
          cn: args.commonName,
          sans: args.sans || [],
          c: args.country || 'US',
          st: args.state || 'Massachusetts',
          l: args.city || 'Cambridge',
          o: args.organization || 'Akamai Customer',
          ou: args.organizationalUnit || 'IT'
        },
        adminContact: args.adminContact,
        techContact: args.techContact,
        networkConfiguration: {
          geography: args.geography || 'core',
          secureNetwork: args.secureNetwork || 'enhanced-tls',
          sni: {
            enableSni: true,
            cloneDnsNames: true
          },
          dnsNameSettings: {
            dnsNames: [args.commonName, ...(args.sans || [])],
            cloneDnsNames: true
          }
        },
        signatureAlgorithm: args.signatureAlgorithm || 'SHA-256',
        enableMultiStackedCertificates: args.enableMultiStackedCertificates || false
      };
      
      const queryParams: any = {};
      if (args.contractId) queryParams.contractId = args.contractId;
      
      return client.request({
        method: 'POST',
        path: CertificateEndpoints.createEnrollment(),
        body: enrollmentBody,
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        let text = `✅ **Default DV Certificate Created!**\n\n`;
        text += `**Enrollment ID:** ${response.enrollmentId}\n`;
        text += `**Common Name:** ${args.commonName}\n`;
        text += `**Certificate Type:** Default DV\n`;
        text += `**Status:** Enrollment created, validation pending\n`;
        
        if (args.sans?.length) {
          text += `**SANs:** ${args.sans.join(', ')}\n`;
        }
        
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Check domain validation status\n`;
        text += `2. Complete DNS/HTTP validation challenges\n`;
        text += `3. Monitor certificate issuance\n`;
        text += `4. Deploy to networks when ready\n`;
        
        return text;
      }
    }
  );
}

/**
 * Get domain validation status and challenges
 */
export async function getDomainValidationStatus(args: z.infer<typeof CertificateToolSchemas.getDomainValidationStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificate_dv_status',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: CertificateEndpoints.getValidationStatus(args.enrollmentId)
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        let text = `🔍 **Domain Validation Status**\n\n`;
        text += `**Enrollment ID:** ${args.enrollmentId}\n`;
        
        if (response.dv && response.dv.length > 0) {
          text += `\n**Validation Challenges:**\n\n`;
          
          response.dv.forEach((domain: any, index: number) => {
            text += `${index + 1}. **${domain.domain}**\n`;
            text += `   • Status: ${domain.status}\n`;
            
            if (domain.challenges) {
              domain.challenges.forEach((challenge: any) => {
                text += `   • ${challenge.type.toUpperCase()} Challenge:\n`;
                
                if (challenge.type === 'http') {
                  text += `     - URL: http://${domain.domain}/.well-known/acme-challenge/${challenge.token}\n`;
                  text += `     - Content: ${challenge.keyAuthorization}\n`;
                } else if (challenge.type === 'dns') {
                  text += `     - Record: _acme-challenge.${domain.domain}\n`;
                  text += `     - Type: TXT\n`;
                  text += `     - Value: ${challenge.keyAuthorization}\n`;
                }
              });
            }
            text += `\n`;
          });
        } else {
          text += `**Status:** No validation challenges found\n`;
        }
        
        text += `\n🎯 **Instructions:**\n`;
        text += `1. Complete the validation challenges above\n`;
        text += `2. Challenges must be accessible within 7 days\n`;
        text += `3. Use "Acknowledge DV challenges" when ready\n`;
        
        return text;
      }
    }
  );
}

/**
 * Acknowledge domain validation challenges completion
 */
export async function acknowledgeDvChallenges(args: z.infer<typeof CertificateToolSchemas.acknowledgeDvChallenges>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificate_acknowledge_dv',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: CertificateEndpoints.acknowledgeDvChallenges(args.enrollmentId),
        body: {
          acknowledgement: args.acknowledgement || 'Domain validation challenges have been completed'
        }
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        let text = `✅ **Domain Validation Acknowledged!**\n\n`;
        text += `**Enrollment ID:** ${args.enrollmentId}\n`;
        text += `**Status:** Validation challenges acknowledged\n`;
        text += `**Next:** Certificate will be issued automatically\n`;
        
        text += `\n🎯 **Expected Timeline:**\n`;
        text += `• HTTP Validation: 5-15 minutes\n`;
        text += `• DNS Validation: 15-60 minutes\n`;
        text += `• Certificate Issuance: 1-4 hours\n`;
        text += `• Network Deployment: 2-6 hours\n`;
        
        return text;
      }
    }
  );
}

/**
 * Get certificate deployment status
 */
export async function getDeploymentStatus(args: z.infer<typeof CertificateToolSchemas.getDeploymentStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificate_deployment_status',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: CertificateEndpoints.getDeploymentStatus(args.enrollmentId)
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        let text = `🚀 **Certificate Deployment Status**\n\n`;
        text += `**Enrollment ID:** ${args.enrollmentId}\n`;
        
        if (response.production) {
          text += `\n**Production Network:**\n`;
          text += `• Status: ${response.production.status}\n`;
          if (response.production.lastUpdated) {
            text += `• Last Updated: ${new Date(response.production.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        if (response.staging) {
          text += `\n**Staging Network:**\n`;
          text += `• Status: ${response.staging.status}\n`;
          if (response.staging.lastUpdated) {
            text += `• Last Updated: ${new Date(response.staging.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        text += `\n🎯 **Usage:**\n`;
        text += `• Configure edge hostnames to use this certificate\n`;
        text += `• Update property manager configurations\n`;
        text += `• Test SSL/TLS connectivity\n`;
        
        return text;
      }
    }
  );
}

/**
 * Download certificate details
 */
export async function downloadCertificate(args: z.infer<typeof CertificateToolSchemas.downloadCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificates',
    'certificate_download',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: CertificateEndpoints.downloadCertificate(args.enrollmentId)
      });
    },
    {
      format: 'text',
      formatter: (response: any) => {
        let text = `📄 **Certificate Information**\n\n`;
        text += `**Enrollment ID:** ${args.enrollmentId}\n`;
        
        if (response.certificate) {
          text += `**Certificate:** Available\n`;
          text += `**Format:** PEM\n`;
          
          if (response.trustChain) {
            text += `**Trust Chain:** Included\n`;
          }
          
          // Extract common name and expiration from certificate if available
          if (response.certificate.includes('BEGIN CERTIFICATE')) {
            text += `**Status:** Certificate issued and ready for use\n`;
          }
        } else {
          text += `**Status:** Certificate not yet available\n`;
        }
        
        text += `\n🎯 **Usage:**\n`;
        text += `• Certificate is automatically deployed to Akamai networks\n`;
        text += `• No manual certificate installation required\n`;
        text += `• Configure edge hostnames and properties to use this certificate\n`;
        
        return text;
      }
    }
  );
}

/**
 * Certificate Operations Registry
 * Exports all certificate management operations for the registry
 */
export const certificateOperations = {
  certificate_list: {
    name: 'certificate_list',
    description: 'List all certificate enrollments for account',
    inputSchema: CertificateToolSchemas.listCertificates,
    handler: listCertificates
  },
  
  certificate_get: {
    name: 'certificate_get', 
    description: 'Get certificate enrollment details',
    inputSchema: CertificateToolSchemas.getCertificate,
    handler: getCertificate
  },
  
  certificate_create_dv: {
    name: 'certificate_create_dv',
    description: 'Create a new Default DV certificate enrollment',
    inputSchema: CertificateToolSchemas.createDvCertificate,
    handler: createDvCertificate
  },
  
  certificate_dv_status: {
    name: 'certificate_dv_status',
    description: 'Get domain validation status and challenges',
    inputSchema: CertificateToolSchemas.getDomainValidationStatus,
    handler: getDomainValidationStatus
  },
  
  certificate_acknowledge_dv: {
    name: 'certificate_acknowledge_dv',
    description: 'Acknowledge domain validation challenges completion',
    inputSchema: CertificateToolSchemas.acknowledgeDvChallenges,
    handler: acknowledgeDvChallenges
  },
  
  certificate_deployment_status: {
    name: 'certificate_deployment_status',
    description: 'Get certificate deployment status across networks',
    inputSchema: CertificateToolSchemas.getDeploymentStatus,
    handler: getDeploymentStatus
  },
  
  certificate_download: {
    name: 'certificate_download',
    description: 'Download certificate details and information',
    inputSchema: CertificateToolSchemas.downloadCertificate,
    handler: downloadCertificate
  }
};