/**
 * Certificate API Implementation Details
 * 
 * Contains endpoints, schemas, and formatters for certificate tools
 */

import { z } from 'zod';

/**
 * Certificate API Endpoints
 */
export const CertificateEndpoints = {
  // Enrollment endpoints
  listEnrollments: () => '/cps/v2/enrollments',
  getEnrollment: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}`,
  createEnrollment: () => '/cps/v2/enrollments',
  updateEnrollment: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}`,
  deleteEnrollment: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}`,
  
  // Certificate operations
  getDeploymentStatus: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}/deployments`,
  downloadCertificate: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}/certificate`,
  
  // Domain validation
  getValidationStatus: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}/dv`,
  acknowledgeDvChallenges: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}/acknowledge-pre-validation-warnings`,
  
  // Change management
  getChangeHistory: (enrollmentId: string) => `/cps/v2/enrollments/${enrollmentId}/history`,
  getChangeStatus: (enrollmentId: string, changeId: string) => `/cps/v2/enrollments/${enrollmentId}/changes/${changeId}`
};

/**
 * Certificate Tool Schemas
 */
export const CertificateToolSchemas = {
  listCertificates: z.object({
    contractId: z.string().optional(),
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  getCertificate: z.object({
    enrollmentId: z.string(),
    customer: z.string().optional()
  }),
  
  createDvCertificate: z.object({
    cn: z.string(),
    sans: z.array(z.string()).optional(),
    adminContact: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string()
    }),
    techContact: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string()
    }),
    org: z.object({
      name: z.string(),
      addressLineOne: z.string(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string(),
      countryCode: z.string().length(2),
      phone: z.string()
    }),
    contractId: z.string(),
    networkConfiguration: z.object({
      networkType: z.enum(['standard_tls', 'enhanced_tls']).optional(),
      sniOnly: z.boolean().optional(),
      quicEnabled: z.boolean().optional()
    }).optional(),
    customer: z.string().optional()
  }),
  
  getDvStatus: z.object({
    enrollmentId: z.string(),
    customer: z.string().optional()
  }),
  
  deployCertificate: z.object({
    enrollmentId: z.string(),
    network: z.enum(['staging', 'production']),
    customer: z.string().optional()
  }),
  
  downloadCertificate: z.object({
    enrollmentId: z.string(),
    format: z.enum(['pem', 'der']).optional(),
    customer: z.string().optional()
  })
};

/**
 * Format certificate list response
 */
export function formatCertificateList(response: any): string {
  const enrollments = response.enrollments || [];
  
  let text = `🔐 **SSL Certificates**\n\n`;
  
  if (enrollments.length === 0) {
    text += '⚠️ No certificates found.\n';
    return text;
  }
  
  text += `Found **${enrollments.length}** certificates:\n\n`;
  
  enrollments.slice(0, 10).forEach((cert: any, index: number) => {
    text += `${index + 1}. **${cert.cn}**\n`;
    text += `   • ID: ${cert.id}\n`;
    text += `   • Status: ${cert.pendingChanges?.length > 0 ? '⏳ Pending' : '✅ Active'}\n`;
    text += `   • Type: ${cert.certificateType || 'DV'}\n`;
    text += `   • Valid Until: ${cert.certificateDetails?.expiresOn || 'N/A'}\n`;
    if (cert.sans?.length > 0) {
      text += `   • SANs: ${cert.sans.length} domains\n`;
    }
    text += `\n`;
  });
  
  if (enrollments.length > 10) {
    text += `_... and ${enrollments.length - 10} more certificates_\n`;
  }
  
  return text;
}

/**
 * Format certificate details response
 */
export function formatCertificateDetails(response: any): string {
  const cert = response;
  
  let text = `🔐 **Certificate Details**\n\n`;
  text += `**Common Name:** ${cert.cn}\n`;
  text += `**Enrollment ID:** ${cert.id}\n`;
  text += `**Type:** ${cert.certificateType || 'DV'}\n`;
  text += `**Status:** ${cert.pendingChanges?.length > 0 ? '⏳ Pending Changes' : '✅ Active'}\n`;
  
  if (cert.certificateDetails) {
    text += `\n**Certificate Information:**\n`;
    text += `• Serial: ${cert.certificateDetails.serialNumber}\n`;
    text += `• Issued: ${new Date(cert.certificateDetails.validFrom).toLocaleDateString()}\n`;
    text += `• Expires: ${new Date(cert.certificateDetails.expiresOn).toLocaleDateString()}\n`;
    text += `• Issuer: ${cert.certificateDetails.issuer}\n`;
  }
  
  if (cert.sans?.length > 0) {
    text += `\n**Subject Alternative Names:**\n`;
    cert.sans.slice(0, 10).forEach((san: string) => {
      text += `• ${san}\n`;
    });
    if (cert.sans.length > 10) {
      text += `_... and ${cert.sans.length - 10} more SANs_\n`;
    }
  }
  
  if (cert.networkConfiguration) {
    text += `\n**Network Configuration:**\n`;
    text += `• Type: ${cert.networkConfiguration.networkType}\n`;
    text += `• SNI Only: ${cert.networkConfiguration.sniOnly ? 'Yes' : 'No'}\n`;
    text += `• QUIC: ${cert.networkConfiguration.quicEnabled ? 'Enabled' : 'Disabled'}\n`;
  }
  
  return text;
}

/**
 * Format DV validation status response
 */
export function formatDvStatus(response: any): string {
  const validations = response.dv || [];
  
  let text = `🔍 **Domain Validation Status**\n\n`;
  
  if (validations.length === 0) {
    text += '✅ All domains validated!\n';
    return text;
  }
  
  text += `**Pending Validations:** ${validations.length}\n\n`;
  
  validations.forEach((dv: any) => {
    text += `**${dv.domain}**\n`;
    text += `• Status: ${dv.status}\n`;
    text += `• Validation Method: ${dv.validationMethod || 'DNS'}\n`;
    
    if (dv.challenges) {
      text += `• Challenges:\n`;
      dv.challenges.forEach((challenge: any) => {
        if (challenge.type === 'dns-01') {
          text += `  - Add TXT record: _acme-challenge.${dv.domain}\n`;
          text += `    Value: ${challenge.token}\n`;
        } else if (challenge.type === 'http-01') {
          text += `  - Place file at: http://${dv.domain}/.well-known/acme-challenge/${challenge.token}\n`;
          text += `    Content: ${challenge.response}\n`;
        }
      });
    }
    text += `\n`;
  });
  
  text += `🎯 **Next Steps:**\n`;
  text += `1. Complete domain validation challenges above\n`;
  text += `2. Wait for validation (usually 5-30 minutes)\n`;
  text += `3. Deploy certificate once validated\n`;
  
  return text;
}

/**
 * Format certificate creation response
 */
export function formatCertificateCreated(data: any): string {
  let text = `✅ **Certificate Enrollment Created!**\n\n`;
  text += `**Common Name:** ${data.cn}\n`;
  text += `**Enrollment ID:** ${data.enrollmentId}\n`;
  text += `**Type:** Domain Validated (DV)\n`;
  
  if (data.sans?.length > 0) {
    text += `**SANs:** ${data.sans.length} additional domains\n`;
  }
  
  text += `\n🎯 **Next Steps:**\n`;
  text += `1. Check domain validation status: \`certificate_dv_status\`\n`;
  text += `2. Complete validation challenges\n`;
  text += `3. Deploy certificate once validated: \`certificate_deploy\`\n`;
  
  return text;
}

/**
 * Format deployment status response
 */
export function formatDeploymentStatus(response: any): string {
  const status = response;
  
  let text = `🚀 **Certificate Deployment Status**\n\n`;
  
  if (status.production) {
    text += `**Production:** ${status.production.status}\n`;
    if (status.production.status === 'deployed') {
      text += `• Deployed on: ${new Date(status.production.deployedDate).toLocaleDateString()}\n`;
    }
  }
  
  if (status.staging) {
    text += `\n**Staging:** ${status.staging.status}\n`;
    if (status.staging.status === 'deployed') {
      text += `• Deployed on: ${new Date(status.staging.deployedDate).toLocaleDateString()}\n`;
    }
  }
  
  if (status.pendingChanges?.length > 0) {
    text += `\n⏳ **Pending Changes:**\n`;
    status.pendingChanges.forEach((change: any) => {
      text += `• ${change.description} (${change.status})\n`;
    });
  }
  
  return text;
}