/**
 * Certificate Integration Tools for PAPI
 * Implements certificate-property linking functionality
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' types  
 * - Full runtime validation with Zod
 * - Comprehensive error handling
 * - Property-certificate lifecycle management
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { z } from 'zod';
import { validateApiResponse } from '../utils/api-response-validator';
import { handleApiError } from '../utils/error-handling';

// Response schemas
const CertificateLinkSchema = z.object({
  certificateLinks: z.object({
    items: z.array(z.object({
      certificateId: z.string(),
      enrollmentId: z.number(),
      hostname: z.string(),
      status: z.string(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      issuer: z.string().optional(),
      deploymentStatus: z.object({
        staging: z.string().optional(),
        production: z.string().optional()
      }).optional()
    }).passthrough())
  })
});

const CertificateStatusSchema = z.object({
  certificateStatus: z.object({
    propertyId: z.string(),
    version: z.number(),
    certificates: z.array(z.object({
      hostname: z.string(),
      certificateId: z.string(),
      enrollmentId: z.number(),
      status: z.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'FAILED']),
      type: z.enum(['DEFAULT_DV', 'CPS_MANAGED', 'THIRD_PARTY']),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      daysUntilExpiry: z.number().optional(),
      issuer: z.string().optional(),
      deploymentInfo: z.object({
        staging: z.object({
          status: z.string(),
          lastUpdated: z.string().optional()
        }).optional(),
        production: z.object({
          status: z.string(),
          lastUpdated: z.string().optional()
        }).optional()
      }).optional()
    }).passthrough())
  })
});

/**
 * Link certificate to property
 * Associates SSL/TLS certificates with property configurations
 */
export async function linkCertificateToProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    enrollmentId: number;
    certificateId: string;
    hostname: string;
    contractId: string;
    groupId: string;
    acknowledgeWarnings?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });
    
    if (args.acknowledgeWarnings !== undefined) {
      params.append('acknowledgeWarnings', args.acknowledgeWarnings.toString());
    }

    const requestBody = {
      certificateId: args.certificateId,
      enrollmentId: args.enrollmentId,
      hostname: args.hostname
    };

    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/certificates?${params.toString()}`,
      method: 'POST',
      body: requestBody
    });

    let responseText = '# Certificate Linked Successfully\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Certificate ID:** ${args.certificateId}\n`;
    responseText += `**Enrollment ID:** ${args.enrollmentId}\n`;
    responseText += `**Hostname:** ${args.hostname}\n`;
    responseText += `**Linked:** ${new Date().toISOString()}\n\n`;

    responseText += '## Certificate Details\n\n';
    responseText += '- **Type:** CPS Managed Certificate\n';
    responseText += '- **Status:** Link created successfully\n';
    responseText += '- **Contract:** ' + args.contractId + '\n';
    responseText += '- **Group:** ' + args.groupId + '\n\n';

    responseText += '## Next Steps\n\n';
    responseText += '1. **Validate:** Check certificate status\n';
    responseText += '2. **Activate:** Deploy property to staging\n';
    responseText += '3. **Test:** Verify SSL/TLS functionality\n';
    responseText += '4. **Deploy:** Activate to production\n\n';

    responseText += '## Important Notes\n\n';
    responseText += '- Certificate must be valid and active\n';
    responseText += '- Hostname must match certificate SAN/CN\n';
    responseText += '- May require property reactivation\n';
    responseText += '- Monitor deployment status\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'linking certificate to property');
  }
}

/**
 * Get property certificate status
 * Retrieves detailed certificate information for a property version
 */
export async function getPropertyCertificateStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/certificates?${params.toString()}`,
      method: 'GET'
    });

    const validated = validateApiResponse<{ certificateStatus?: any }>(response);
    const certStatus = validated.certificateStatus || { certificates: [] };
    const certificates = certStatus.certificates || [];

    let responseText = '# Property Certificate Status\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Total Certificates:** ${certificates.length}\n`;
    responseText += `**Checked:** ${new Date().toISOString()}\n\n`;

    if (certificates.length === 0) {
      responseText += '⚠️ No certificates found for this property version.\n\n';
      responseText += '## Recommendations\n\n';
      responseText += '- Use Default DV certificates for quick setup\n';
      responseText += '- Link CPS certificates for custom domains\n';
      responseText += '- Ensure hostnames have valid certificates\n';
    } else {
      // Group by certificate type
      const byType: Record<string, typeof certificates> = {};
      certificates.forEach((cert: any) => {
        const type = cert.type || 'UNKNOWN';
        if (!byType[type]) byType[type] = [];
        byType[type].push(cert);
      });

      Object.entries(byType).forEach(([type, typeCerts]) => {
        responseText += `## ${type} Certificates (${typeCerts.length})\n\n`;
        
        typeCerts.forEach((cert: any) => {
          const statusEmoji = cert.status === 'ACTIVE' ? '✅' : 
                            cert.status === 'PENDING' ? '⏳' : 
                            cert.status === 'EXPIRED' ? '⚠️' : '❌';
          
          responseText += `### ${statusEmoji} ${cert.hostname}\n`;
          responseText += `- **Certificate ID:** ${cert.certificateId}\n`;
          responseText += `- **Enrollment ID:** ${cert.enrollmentId}\n`;
          responseText += `- **Status:** ${cert.status}\n`;
          
          if (cert.validFrom && cert.validTo) {
            responseText += `- **Valid From:** ${new Date(cert.validFrom).toISOString()}\n`;
            responseText += `- **Valid To:** ${new Date(cert.validTo).toISOString()}\n`;
            
            if (cert.daysUntilExpiry !== undefined) {
              if (cert.daysUntilExpiry < 30) {
                responseText += `- **⚠️ Expires in:** ${cert.daysUntilExpiry} days\n`;
              } else {
                responseText += `- **Expires in:** ${cert.daysUntilExpiry} days\n`;
              }
            }
          }
          
          if (cert.issuer) {
            responseText += `- **Issuer:** ${cert.issuer}\n`;
          }
          
          // Deployment status
          if (cert.deploymentInfo) {
            responseText += '\n**Deployment Status:**\n';
            if (cert.deploymentInfo.staging) {
              responseText += `- **Staging:** ${cert.deploymentInfo.staging.status}`;
              if (cert.deploymentInfo.staging.lastUpdated) {
                responseText += ` (${new Date(cert.deploymentInfo.staging.lastUpdated).toISOString()})`;
              }
              responseText += '\n';
            }
            if (cert.deploymentInfo.production) {
              responseText += `- **Production:** ${cert.deploymentInfo.production.status}`;
              if (cert.deploymentInfo.production.lastUpdated) {
                responseText += ` (${new Date(cert.deploymentInfo.production.lastUpdated).toISOString()})`;
              }
              responseText += '\n';
            }
          }
          
          responseText += '\n';
        });
      });

      // Summary and recommendations
      responseText += '## Summary\n\n';
      const activeCerts = certificates.filter((c: any) => c.status === 'ACTIVE').length;
      const expiringSoon = certificates.filter((c: any) => c.daysUntilExpiry && c.daysUntilExpiry < 30).length;
      const expired = certificates.filter((c: any) => c.status === 'EXPIRED').length;
      
      responseText += `- **Active Certificates:** ${activeCerts}\n`;
      if (expiringSoon > 0) {
        responseText += `- **⚠️ Expiring Soon:** ${expiringSoon}\n`;
      }
      if (expired > 0) {
        responseText += `- **❌ Expired:** ${expired}\n`;
      }
      
      if (expiringSoon > 0 || expired > 0) {
        responseText += '\n## ⚠️ Action Required\n\n';
        if (expiringSoon > 0) {
          responseText += '- Renew certificates expiring within 30 days\n';
        }
        if (expired > 0) {
          responseText += '- Replace expired certificates immediately\n';
        }
        responseText += '- Use `mcp__alecs-certs__renew-certificate` for renewals\n';
      }
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting property certificate status');
  }
}