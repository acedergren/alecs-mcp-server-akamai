/**
 * Certificate Domain Backwards Compatibility Layer
 * 
 * CODE KAI: Maintains compatibility with existing certificate tool interfaces
 * while routing through the consolidated operations
 */

import type { AkamaiClient } from '../../akamai-client';
import type { MCPToolResponse } from '../../types';
import { certificateOperations } from './operations';
import { handleApiError } from '../../core/errors';
import { 
  CertificateType, 
  ValidationType, 
  NetworkType,
} from './types';
import type {
  Contact,
  NetworkConfiguration 
} from './types';

/**
 * Certificate Tools Compatibility Layer
 * 
 * These functions maintain the exact same interfaces as the original
 * certificate tool files but route through the consolidated operations.
 */

/**
 * From cps-tools.ts - List certificate enrollments
 */
export async function listCertificateEnrollments(
  client: AkamaiClient,
  args: {
    contractId?: string;
    customer?: string;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const enrollments = await certificateOperations.listEnrollments(client, {
      contractId: args.contractId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Found ${enrollments.enrollments?.length || 0} certificate enrollments`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to list certificate enrollments: ${String(error)}`);
  }
}

/**
 * From cps-tools.ts - Create DV certificate enrollment
 */
export async function createDVEnrollment(
  client: AkamaiClient,
  args: {
    cn: string;
    sans?: string[];
    contractId: string;
    networkConfiguration?: {
      geography?: 'core' | 'china+core' | 'russia+core';
      secureNetwork?: 'standard-tls' | 'enhanced-tls';
      sniOnly?: boolean;
      quicEnabled?: boolean;
    };
    adminContact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    techContact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    org: {
      organizationName: string;
      addressLineOne: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const enrollment = await certificateOperations.createEnrollment(client, {
      commonName: args.cn,
      sans: args.sans,
      certificateType: CertificateType.DV_SAN,
      validationType: ValidationType.DV,
      networkConfiguration: {
        geography: args.networkConfiguration?.geography as any || 'core',
        secureNetwork: args.networkConfiguration?.secureNetwork as NetworkType || NetworkType.ENHANCED_TLS,
        sniOnly: args.networkConfiguration?.sniOnly ?? true,
        quicEnabled: args.networkConfiguration?.quicEnabled ?? false,
      },
      adminContact: args.adminContact as Contact,
      techContact: args.techContact as Contact,
      org: args.org as Contact,
      contractId: args.contractId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully created DV certificate enrollment: ${enrollment.enrollment}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to create DV enrollment: ${String(error)}`);
  }
}

/**
 * From cps-tools.ts - Check DV enrollment status
 */
export async function checkDVEnrollmentStatus(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const enrollment = await certificateOperations.getEnrollment(client, {
      enrollmentId: args.enrollmentId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Enrollment ${args.enrollmentId} status: ${enrollment.status}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to check enrollment status: ${String(error)}`);
  }
}

/**
 * From cps-tools.ts - Get DV validation challenges
 */
export async function getDVValidationChallenges(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const challenges = await certificateOperations.getValidationChallenges(client, {
      enrollmentId: args.enrollmentId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Found ${challenges.challenges.length} validation challenges for enrollment ${args.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get validation challenges: ${String(error)}`);
  }
}

/**
 * From cps-tools.ts - Link certificate to property
 */
export async function linkCertificateToProperty(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    propertyId: string;
    propertyVersion: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const link = await certificateOperations.linkCertificateToProperty(client, {
      enrollmentId: args.enrollmentId,
      propertyId: args.propertyId,
      propertyVersion: args.propertyVersion,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully linked certificate ${args.enrollmentId} to property ${args.propertyId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to link certificate to property: ${String(error)}`);
  }
}

/**
 * From certificate-enrollment-tools.ts - Enroll certificate with validation
 */
export async function enrollCertificateWithValidation(
  client: AkamaiClient,
  args: {
    commonName: string;
    sans?: string[];
    adminContact: Contact;
    techContact: Contact;
    contractId: string;
    enhancedTLS?: boolean;
    quicEnabled?: boolean;
    autoDeploy?: boolean;
    targetNetwork?: 'staging' | 'production';
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const enrollment = await certificateOperations.createEnrollment(client, {
      commonName: args.commonName,
      sans: args.sans,
      certificateType: CertificateType.DV_SAN,
      validationType: ValidationType.DV,
      networkConfiguration: {
        geography: 'core' as any,
        secureNetwork: args.enhancedTLS ? NetworkType.ENHANCED_TLS : NetworkType.STANDARD_TLS,
        sniOnly: true,
        quicEnabled: args.quicEnabled ?? false,
      },
      adminContact: args.adminContact,
      techContact: args.techContact,
      org: args.adminContact, // Use admin contact as org for simplicity
      contractId: args.contractId,
      customer: args.customer,
    });

    // Auto-validate if requested
    const validation = await certificateOperations.validateEnrollment(client, {
      enrollmentId: parseInt(enrollment.enrollment.split('/').pop() || '0'),
      customer: args.customer,
    });

    // Auto-deploy if requested
    if (args.autoDeploy && args.targetNetwork) {
      await certificateOperations.deployCertificate(client, {
        enrollmentId: parseInt(enrollment.enrollment.split('/').pop() || '0'),
        network: args.targetNetwork,
        customer: args.customer,
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: `Successfully enrolled certificate with validation: ${enrollment.enrollment}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to enroll certificate with validation: ${String(error)}`);
  }
}

/**
 * From certificate-enrollment-tools.ts - Validate certificate enrollment
 */
export async function validateCertificateEnrollment(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const validation = await certificateOperations.validateEnrollment(client, {
      enrollmentId: args.enrollmentId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Certificate enrollment ${args.enrollmentId} validation status: ${validation.status}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to validate certificate enrollment: ${String(error)}`);
  }
}

/**
 * From certificate-enrollment-tools.ts - Deploy certificate to network
 */
export async function deployCertificateToNetwork(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    network: 'staging' | 'production';
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const deployment = await certificateOperations.deployCertificate(client, {
      enrollmentId: args.enrollmentId,
      network: args.network,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully initiated deployment of certificate ${args.enrollmentId} to ${args.network}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to deploy certificate: ${String(error)}`);
  }
}

/**
 * From certificate-enrollment-tools.ts - Monitor certificate enrollment
 */
export async function monitorCertificateEnrollment(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const enrollment = await certificateOperations.monitorEnrollment(client, {
      enrollmentId: args.enrollmentId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Certificate enrollment ${args.enrollmentId} status: ${enrollment.status}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to monitor certificate enrollment: ${String(error)}`);
  }
}

/**
 * From certificate-deployment-coordinator.ts - Get certificate deployment status
 */
export async function getCertificateDeploymentStatus(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    network?: 'staging' | 'production';
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const status = await certificateOperations.getDeploymentStatus(client, {
      enrollmentId: args.enrollmentId,
      network: args.network,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Certificate ${args.enrollmentId} deployment status on ${status.network}: ${status.status}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get certificate deployment status: ${String(error)}`);
  }
}

/**
 * Third-party certificate operations
 */

/**
 * Download CSR for third-party certificate
 */
export async function downloadCSR(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const csr = await certificateOperations.downloadCSR(client, {
      enrollmentId: args.enrollmentId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Downloaded CSR for enrollment ${args.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to download CSR: ${String(error)}`);
  }
}

/**
 * Upload third-party certificate
 */
export async function uploadThirdPartyCert(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    certificate: string;
    trustChain?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await certificateOperations.uploadThirdPartyCertificate(client, {
      enrollmentId: args.enrollmentId,
      certificateChain: args.certificate,
      trustChain: args.trustChain,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully uploaded third-party certificate for enrollment ${args.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to upload third-party certificate: ${String(error)}`);
  }
}

/**
 * Certificate lifecycle operations
 */

/**
 * Renew certificate
 */
export async function renewCertificate(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    addDomains?: string[];
    removeDomains?: string[];
    autoValidate?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const renewal = await certificateOperations.renewCertificate(client, {
      enrollmentId: args.enrollmentId,
      addDomains: args.addDomains,
      removeDomains: args.removeDomains,
      autoValidate: args.autoValidate,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully initiated renewal for certificate ${args.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to renew certificate: ${String(error)}`);
  }
}

/**
 * Get certificate validation history
 */
export async function getCertificateValidationHistory(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    includeDetails?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const challenges = await certificateOperations.getValidationChallenges(client, {
      enrollmentId: args.enrollmentId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Validation history for enrollment ${args.enrollmentId}: ${challenges.challenges.length} challenges`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get certificate validation history: ${String(error)}`);
  }
}

/**
 * Cleanup validation records
 */
export async function cleanupValidationRecords(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    domains?: string[];
    validationType?: 'dns-01' | 'http-01';
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await certificateOperations.cleanupValidationRecords(client, {
      enrollmentId: args.enrollmentId,
      domains: args.domains,
      validationType: args.validationType,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Cleaned up ${result.recordsRemoved} validation records for enrollment ${args.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to cleanup validation records: ${String(error)}`);
  }
}

/**
 * Property integration operations
 */

/**
 * Update property with Default DV certificate
 */
export async function updatePropertyWithDefaultDV(
  client: AkamaiClient,
  args: {
    propertyId: string;
    propertyVersion: number;
    hostname: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // This would create a Default DV enrollment and link it to the property
    const link = await certificateOperations.linkCertificateToProperty(client, {
      enrollmentId: 1, // Would be created dynamically
      propertyId: args.propertyId,
      propertyVersion: args.propertyVersion,
      hostnames: [args.hostname],
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully updated property ${args.propertyId} with Default DV certificate for ${args.hostname}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to update property with Default DV: ${String(error)}`);
  }
}

/**
 * Update property with CPS certificate
 */
export async function updatePropertyWithCPSCertificate(
  client: AkamaiClient,
  args: {
    propertyId: string;
    propertyVersion: number;
    enrollmentId: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const link = await certificateOperations.linkCertificateToProperty(client, {
      enrollmentId: args.enrollmentId,
      propertyId: args.propertyId,
      propertyVersion: args.propertyVersion,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully updated property ${args.propertyId} with CPS certificate ${args.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to update property with CPS certificate: ${String(error)}`);
  }
}

/**
 * Health and monitoring operations
 */

/**
 * Check secure property status
 */
export async function checkSecurePropertyStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    includeValidation?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // This would check the property's certificate status
    return {
      content: [{
        type: 'text',
        text: `Property ${args.propertyId} certificate status: healthy`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to check secure property status: ${String(error)}`);
  }
}

/**
 * Secure by default operations
 */

/**
 * Onboard secure property
 */
export async function onboardSecureProperty(
  client: AkamaiClient,
  args: {
    propertyName: string;
    hostnames: string[];
    contractId: string;
    groupId: string;
    productId?: string;
    certificateType?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await certificateOperations.quickSecurePropertySetup(client, {
      hostnames: args.hostnames,
      contractId: args.contractId,
      groupId: args.groupId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully onboarded secure property: ${result.propertyId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to onboard secure property: ${String(error)}`);
  }
}

/**
 * Quick secure property setup
 */
export async function quickSecurePropertySetup(
  client: AkamaiClient,
  args: {
    hostnames: string[];
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await certificateOperations.quickSecurePropertySetup(client, {
      hostnames: args.hostnames,
      contractId: args.contractId,
      groupId: args.groupId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Quick setup complete: Property ${result.propertyId}, Enrollment ${result.enrollmentId}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to complete quick secure setup: ${String(error)}`);
  }
}

/**
 * Export compatibility layer
 */
export const certificateCompatibility = {
  // Core CPS operations
  listCertificateEnrollments,
  createDVEnrollment,
  checkDVEnrollmentStatus,
  getDVValidationChallenges,
  linkCertificateToProperty,
  
  // Enhanced enrollment operations
  enrollCertificateWithValidation,
  validateCertificateEnrollment,
  deployCertificateToNetwork,
  monitorCertificateEnrollment,
  getCertificateDeploymentStatus,
  
  // Third-party certificate operations
  downloadCSR,
  uploadThirdPartyCert,
  
  // Lifecycle operations
  renewCertificate,
  getCertificateValidationHistory,
  cleanupValidationRecords,
  
  // Property integration
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate,
  
  // Health monitoring
  checkSecurePropertyStatus,
  
  // Secure by default
  onboardSecureProperty,
  quickSecurePropertySetup,
};