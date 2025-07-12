/**
 * Certificate Domain Tools
 * 
 * Complete implementation of Akamai CPS (Certificate Provisioning System) API tools
 * Using the standard Tool pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  CertificateEndpoints, 
  CertificateToolSchemas,
  formatCertificateList,
  formatCertificateDetails,
  formatDvStatus,
  formatCertificateCreated,
  formatDeploymentStatus
} from './api';
import type { z } from 'zod';

/**
 * List certificates
 */
export async function listCertificates(args: z.infer<typeof CertificateToolSchemas.listCertificates>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificate',
    'certificate_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) {queryParams.contractId = args.contractId;}
      if (args.limit) {queryParams.limit = args.limit;}
      if (args.offset) {queryParams.offset = args.offset;}
      
      return client.request({
        method: 'GET',
        path: CertificateEndpoints.listEnrollments(),
        queryParams
      });
    },
    {
      format: args.format || 'text',
      formatter: formatCertificateList,
      cacheKey: (p) => `certificate:list:${p.contractId || 'all'}:${p.offset || 0}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get certificate details
 */
export async function getCertificate(args: z.infer<typeof CertificateToolSchemas.getCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificate',
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
      formatter: formatCertificateDetails,
      cacheKey: (p) => `certificate:${p.enrollmentId}`,
      cacheTtl: 300
    }
  );
}

/**
 * Create DV certificate
 */
export async function createDvCertificate(args: z.infer<typeof CertificateToolSchemas.createDvCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificate',
    'certificate_dv_create',
    args,
    async (client) => {
      const body: any = {
        certificateSigningRequest: {
          cn: args.cn,
          sans: args.sans || []
        },
        certificateType: 'san',
        validationType: 'dv',
        networkConfiguration: {
          networkType: args.networkConfiguration?.networkType?.toUpperCase() || 'ENHANCED_TLS',
          sniOnly: args.networkConfiguration?.sniOnly ?? true,
          quicEnabled: args.networkConfiguration?.quicEnabled ?? true
        },
        adminContact: args.adminContact,
        techContact: args.techContact,
        org: args.org
      };
      
      const response = await client.request({
        method: 'POST',
        path: CertificateEndpoints.createEnrollment(),
        body,
        queryParams: {
          contractId: args.contractId
        }
      });
      
      const enrollmentId = (response as any).enrollmentLink?.split('/').pop() || (response as any).enrollment?.id;
      
      return {
        cn: args.cn,
        sans: args.sans,
        enrollmentId
      };
    },
    {
      format: 'text',
      formatter: formatCertificateCreated
    }
  );
}

/**
 * Get DV validation status
 */
export async function getDvStatus(args: z.infer<typeof CertificateToolSchemas.getDvStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificate',
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
      formatter: formatDvStatus,
      cacheKey: (p) => `certificate:dv:${p.enrollmentId}`,
      cacheTtl: 60 // 1 minute - validation status changes frequently
    }
  );
}

/**
 * Deploy certificate
 */
export async function deployCertificate(args: z.infer<typeof CertificateToolSchemas.deployCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificate',
    'certificate_deploy',
    args,
    async (client) => {
      // First acknowledge any pre-validation warnings
      try {
        await client.request({
          method: 'POST',
          path: CertificateEndpoints.acknowledgeDvChallenges(args.enrollmentId),
          body: {
            acknowledgement: 'acknowledge'
          }
        });
      } catch (error) {
        // It's okay if there are no warnings to acknowledge
      }
      
      // Deploy to specified network
      const deployBody = {
        deploy: {
          notBefore: new Date().toISOString(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        }
      };
      
      await client.request({
        method: 'PUT',
        path: CertificateEndpoints.updateEnrollment(args.enrollmentId),
        body: deployBody,
        queryParams: {
          deploy: args.network
        }
      });
      
      // Get deployment status
      const status = await client.request({
        method: 'GET',
        path: CertificateEndpoints.getDeploymentStatus(args.enrollmentId)
      });
      
      return status;
    },
    {
      format: 'text',
      formatter: formatDeploymentStatus,
      progress: true,
      progressMessage: `Deploying certificate to ${args.network}...`
    }
  );
}

/**
 * Download certificate
 */
export async function downloadCertificate(args: z.infer<typeof CertificateToolSchemas.downloadCertificate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'certificate',
    'certificate_download',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: CertificateEndpoints.downloadCertificate(args.enrollmentId),
        queryParams: {
          format: args.format || 'pem'
        }
      });
      
      return {
        certificate: response,
        format: args.format || 'pem'
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `Certificate Download\n\n`;
        text += `Format: ${data.format.toUpperCase()}\n\n`;
        text += `\`\`\`${data.format}\n`;
        text += `${data.certificate}\n`;
        text += `\`\`\`\n`;
        text += `\nTip: Save this certificate to a file for backup or installation on origin servers.`;
        
        return text;
      }
    }
  );
}

/**
 * Additional certificate utility functions
 */
export async function searchCertificates(args: any): Promise<MCPToolResponse> {
  return listCertificates(args);
}

export async function linkCertificateToProperty(args: any): Promise<MCPToolResponse> {
  return {
    content: [{
      type: 'text',
      text: `Certificate linking functionality is not yet implemented. This would link certificate ${args.certificateId} to property ${args.propertyId}.`
    }]
  };
}

export async function monitorCertificateDeployment(args: any): Promise<MCPToolResponse> {
  return deployCertificate(args);
}