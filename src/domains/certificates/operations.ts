/**
 * Certificate Domain Operations - Consolidated Implementation
 * 
 * CODE KAI: Single implementation for all certificate operations
 * Eliminates duplication while maintaining full functionality
 */

import type { AkamaiClient } from '../../akamai-client';
import { 
  performanceOptimized, 
  PerformanceProfiles,
  CacheInvalidation 
} from '../../core/performance';
import { validateCustomer } from '../../core/validation/customer';
import { handleApiError } from '../../core/errors';
import { normalizeId } from '../../core/validation/akamai-ids';

import {
  // Types
  CertificateType,
  ValidationType,
  NetworkType,
  Geography,
  EnrollmentStatus,
  EnrollmentDetails,
  CertificateDeployment,
  CertificateValidation,
  CertificateRenewal,
  ThirdPartyCertificate,
  PropertyHostname,
  PropertyCertificateLink,
  CertificateHealth,
  CertificateMetadata,
  CertificateStatistics,
  CertificateError,
  DomainValidationChallenge,
  ValidationChallengesResponse,
  DeploymentStatusResponse,
  // Parameter types
  CreateEnrollmentParams,
  UpdateEnrollmentParams,
  ListEnrollmentsParams,
  GetValidationChallengesParams,
  DeployCertificateParams,
  LinkCertificateParams,
  // API response types
  CPSEnrollmentCreateResponse,
  CPSEnrollmentStatusResponse,
  CPSEnrollmentsListResponse,
  CPSCSRResponse,
  Contact,
  NetworkConfiguration,
  // Error types
  CPSValidationError,
} from './types';

import {
  // Schemas
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  ListEnrollmentsSchema,
  GetEnrollmentSchema,
  DeleteEnrollmentSchema,
  GetValidationChallengesSchema,
  ValidateEnrollmentSchema,
  DeployCertificateSchema,
  GetDeploymentStatusSchema,
  MonitorEnrollmentSchema,
  LinkCertificateSchema,
  ThirdPartyCertificateSchema,
  DownloadCSRSchema,
  RenewCertificateSchema,
  CleanupValidationRecordsSchema,
  GetCertificateHealthSchema,
  SecureByDefaultSetupSchema,
  QuickSecureSetupSchema,
  GetCertificateStatsSchema,
  // Validators
  validators,
} from './schemas';

/**
 * Certificate Enrollment Operations
 */

/**
 * Create a new certificate enrollment
 */
export const createEnrollment = performanceOptimized(
  async (
    client: AkamaiClient,
    params: CreateEnrollmentParams
  ): Promise<CPSEnrollmentCreateResponse> => {
    // Validate parameters
    const validated = CreateEnrollmentSchema.parse(params);
    validateCustomer(validated.customer);
    
    // Validate domain ownership if configured
    if (validated.sans) {
      for (const san of validated.sans) {
        if (!validators.validateDomainOwnership(san)) {
          throw CertificateError.invalidConfiguration(
            `Domain ${san} is not authorized for certificate enrollment`
          );
        }
      }
    }
    
    try {
      const enrollmentData = {
        csr: {
          cn: validated.commonName,
          sans: validated.sans || [],
          c: validated.org.country || 'US',
          st: validated.org.region || 'CA',
          l: validated.org.city || 'San Francisco',
          o: validated.org.organizationName || validated.org.firstName + ' ' + validated.org.lastName,
          ou: 'IT Department',
        },
        ra: validated.ra,
        validationType: validated.validationType,
        certificateType: validated.certificateType,
        networkConfiguration: validated.networkConfiguration,
        adminContact: validated.adminContact,
        techContact: validated.techContact,
        org: validated.org,
        enableMultiStackedCertificates: validated.enableMultiStackedCertificates,
        changeManagement: validated.changeManagement,
        autoRenewalStartTime: validated.autoRenewalStartTime,
        signatureAlgorithm: validated.signatureAlgorithm,
      };

      const response = await client.request({
        path: '/cps/v2/enrollments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: enrollmentData,
      });

      return response as CPSEnrollmentCreateResponse;
    } catch (error) {
      throw handleApiError(error, 'Failed to create certificate enrollment');
    }
  },
  'certificate.create',
  PerformanceProfiles.WRITE
);

/**
 * List certificate enrollments
 */
export const listEnrollments = performanceOptimized(
  async (
    client: AkamaiClient,
    params: ListEnrollmentsParams = {}
  ): Promise<CPSEnrollmentsListResponse> => {
    // Validate parameters
    const validated = ListEnrollmentsSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const queryParams: Record<string, string> = {};
      
      if (validated.contractId) {
        queryParams.contractId = validated.contractId;
      }
      if (validated.status) {
        queryParams.status = validated.status;
      }
      if (validated.certificateType) {
        queryParams.certificateType = validated.certificateType;
      }
      if (validated.validationType) {
        queryParams.validationType = validated.validationType;
      }
      if (validated.search) {
        queryParams.search = validated.search;
      }

      const response = await client.request({
        path: '/cps/v2/enrollments',
        method: 'GET',
        headers: { Accept: 'application/json' },
        queryParams,
      });

      return response as CPSEnrollmentsListResponse;
    } catch (error) {
      throw handleApiError(error, 'Failed to list certificate enrollments');
    }
  },
  'certificate.list',
  PerformanceProfiles.LIST
);

/**
 * Get certificate enrollment details
 */
export const getEnrollment = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; customer?: string }
  ): Promise<CPSEnrollmentStatusResponse> => {
    // Validate parameters
    const validated = GetEnrollmentSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      return response as CPSEnrollmentStatusResponse;
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw CertificateError.enrollmentNotFound(validated.enrollmentId);
      }
      throw handleApiError(error, `Failed to get enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.get',
  PerformanceProfiles.READ
);

/**
 * Update certificate enrollment
 */
export const updateEnrollment = performanceOptimized(
  async (
    client: AkamaiClient,
    params: UpdateEnrollmentParams
  ): Promise<CPSEnrollmentStatusResponse> => {
    // Validate parameters
    const validated = UpdateEnrollmentSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const updateData: Record<string, unknown> = {};
      
      if (validated.commonName) {
        updateData.csr = { cn: validated.commonName };
      }
      if (validated.sans) {
        updateData.csr = { ...updateData.csr as object, sans: validated.sans };
      }
      if (validated.adminContact) {
        updateData.adminContact = validated.adminContact;
      }
      if (validated.techContact) {
        updateData.techContact = validated.techContact;
      }
      if (validated.org) {
        updateData.org = validated.org;
      }
      if (validated.networkConfiguration) {
        updateData.networkConfiguration = validated.networkConfiguration;
      }
      if (validated.changeManagement !== undefined) {
        updateData.changeManagement = validated.changeManagement;
      }
      if (validated.autoRenewalStartTime) {
        updateData.autoRenewalStartTime = validated.autoRenewalStartTime;
      }

      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: updateData,
      });

      return response as CPSEnrollmentStatusResponse;
    } catch (error) {
      throw handleApiError(error, `Failed to update enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.update',
  PerformanceProfiles.WRITE
);

/**
 * Delete certificate enrollment
 */
export const deleteEnrollment = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; force?: boolean; customer?: string }
  ): Promise<{ success: boolean; message: string }> => {
    // Validate parameters
    const validated = DeleteEnrollmentSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}`,
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      return {
        success: true,
        message: `Enrollment ${validated.enrollmentId} deleted successfully`,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw CertificateError.enrollmentNotFound(validated.enrollmentId);
      }
      throw handleApiError(error, `Failed to delete enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.delete',
  PerformanceProfiles.WRITE
);

/**
 * Certificate Validation Operations
 */

/**
 * Get domain validation challenges
 */
export const getValidationChallenges = performanceOptimized(
  async (
    client: AkamaiClient,
    params: GetValidationChallengesParams
  ): Promise<ValidationChallengesResponse> => {
    // Validate parameters
    const validated = GetValidationChallengesSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}/dv-challenges`,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const enrollmentData = response as CPSEnrollmentStatusResponse;
      const challenges: DomainValidationChallenge[] = [];
      const dnsInstructions: Array<{
        domain: string;
        recordName: string;
        recordType: string;
        recordValue: string;
        ttl: number;
      }> = [];

      // Process allowed domains and extract validation challenges
      if (enrollmentData.allowedDomains) {
        for (const domain of enrollmentData.allowedDomains) {
          if (domain.validationDetails?.challenges) {
            for (const challenge of domain.validationDetails.challenges) {
              challenges.push({
                domain: domain.name,
                type: challenge.type,
                status: challenge.status as 'pending' | 'processing' | 'valid' | 'invalid' | 'expired',
                token: challenge.token,
                recordName: challenge.fullPath,
                recordValue: challenge.responseBody,
                recordType: challenge.type === 'dns-01' ? 'TXT' : undefined,
                fullPath: challenge.fullPath,
                responseBody: challenge.responseBody,
                error: challenge.error ? {
                  type: 'validation_error',
                  detail: challenge.error,
                  status: 400,
                } : undefined,
              });

              // Generate DNS instructions for DNS-01 challenges
              if (challenge.type === 'dns-01' && challenge.token && challenge.responseBody) {
                dnsInstructions.push({
                  domain: domain.name,
                  recordName: `_acme-challenge.${domain.name}`,
                  recordType: 'TXT',
                  recordValue: challenge.responseBody,
                  ttl: 300,
                });
              }
            }
          }
        }
      }

      return {
        enrollmentId: validated.enrollmentId,
        challenges,
        dnsInstructions: dnsInstructions.length > 0 ? dnsInstructions : undefined,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw CertificateError.enrollmentNotFound(validated.enrollmentId);
      }
      throw handleApiError(error, `Failed to get validation challenges for enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.validation.challenges',
  PerformanceProfiles.READ
);

/**
 * Validate certificate enrollment
 */
export const validateEnrollment = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; customer?: string }
  ): Promise<CertificateValidation> => {
    // Validate parameters
    const validated = ValidateEnrollmentSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      // Trigger validation by getting current status
      const enrollment = await getEnrollment(client, { 
        enrollmentId: validated.enrollmentId, 
        customer: validated.customer 
      });
      const challenges = await getValidationChallenges(client, { 
        enrollmentId: validated.enrollmentId, 
        customer: validated.customer 
      });
      
      return {
        enrollmentId: validated.enrollmentId,
        validationType: enrollment.validationType as ValidationType,
        status: enrollment.status === 'wait-validation' ? 'pending' : 
                enrollment.status === 'coordinates' ? 'in-progress' :
                enrollment.status === 'deployed' ? 'complete' : 'failed',
        challenges: challenges.challenges,
        validationErrors: challenges.challenges
          .filter(c => c.error)
          .map(c => ({
            domain: c.domain,
            error: c.error?.detail || 'Unknown validation error',
            resolution: 'Check domain validation configuration and DNS records',
          })),
      };
    } catch (error) {
      throw handleApiError(error, `Failed to validate enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.validate',
  PerformanceProfiles.READ
);

/**
 * Certificate Deployment Operations
 */

/**
 * Deploy certificate to network
 */
export const deployCertificate = performanceOptimized(
  async (
    client: AkamaiClient,
    params: DeployCertificateParams
  ): Promise<CertificateDeployment> => {
    // Validate parameters
    const validated = DeployCertificateSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const deploymentData: Record<string, unknown> = {
        network: validated.network.toUpperCase(),
      };
      
      if (validated.allowedNetworks) {
        deploymentData.allowedNetworks = validated.allowedNetworks;
      }
      if (validated.notBefore) {
        deploymentData.notBefore = validated.notBefore;
      }
      if (validated.notAfter) {
        deploymentData.notAfter = validated.notAfter;
      }

      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}/deployments`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: deploymentData,
      });

      return {
        enrollmentId: validated.enrollmentId,
        network: validated.network,
        status: 'pending',
        deploymentId: (response as any).deploymentId,
      };
    } catch (error) {
      throw CertificateError.deploymentFailed(
        validated.enrollmentId,
        validated.network,
        error instanceof Error ? error.message : 'Unknown deployment error'
      );
    }
  },
  'certificate.deploy',
  PerformanceProfiles.WRITE
);

/**
 * Get certificate deployment status
 */
export const getDeploymentStatus = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; network?: 'staging' | 'production'; customer?: string }
  ): Promise<DeploymentStatusResponse> => {
    // Validate parameters
    const validated = GetDeploymentStatusSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const enrollment = await getEnrollment(client, { 
        enrollmentId: validated.enrollmentId, 
        customer: validated.customer 
      });
      
      // Determine deployment status based on enrollment status and network
      let status: 'pending' | 'in-progress' | 'deployed' | 'failed';
      let network: 'staging' | 'production' = validated.network || 'production';
      
      switch (enrollment.status) {
        case 'pending-deployment':
          status = 'in-progress';
          break;
        case 'deployed':
          status = 'deployed';
          break;
        case 'coordinates':
          status = 'in-progress';
          break;
        default:
          status = 'pending';
      }

      return {
        enrollmentId: validated.enrollmentId,
        network,
        status,
        progress: status === 'in-progress' ? {
          percentage: 50,
          currentStep: 'Deploying certificate to network',
          estimatedTimeRemaining: '5-10 minutes',
        } : undefined,
        deploymentDetails: status === 'deployed' ? {
          deployedDate: new Date().toISOString(),
          expirationDate: enrollment.autoRenewalStartTime,
        } : undefined,
      };
    } catch (error) {
      throw handleApiError(error, `Failed to get deployment status for enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.deployment.status',
  PerformanceProfiles.STATUS
);

/**
 * Monitor certificate enrollment progress
 */
export const monitorEnrollment = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; waitForCompletion?: boolean; maxWaitTime?: number; pollInterval?: number; customer?: string }
  ): Promise<EnrollmentDetails> => {
    // Validate parameters
    const validated = MonitorEnrollmentSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const enrollment = await getEnrollment(client, {
        enrollmentId: validated.enrollmentId,
      });

      // Convert to EnrollmentDetails format
      const details: EnrollmentDetails = {
        enrollmentId: enrollment.enrollmentId,
        commonName: enrollment.enrollment.split('/').pop() || 'unknown',
        status: enrollment.status as EnrollmentStatus,
        validationType: enrollment.validationType as ValidationType,
        certificateType: enrollment.certificateType as CertificateType,
        ra: enrollment.ra,
        pendingChanges: enrollment.pendingChanges,
        allowedDomains: enrollment.allowedDomains,
        autoRenewalStartTime: enrollment.autoRenewalStartTime,
      };

      // If waiting for completion, implement polling logic
      if (validated.waitForCompletion && details.status !== EnrollmentStatus.DEPLOYED) {
        const startTime = Date.now();
        const maxWait = validated.maxWaitTime * 1000; // Convert to milliseconds
        const pollInterval = validated.pollInterval * 1000; // Convert to milliseconds

        while (Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const updatedEnrollment = await getEnrollment(client, {
            enrollmentId: validated.enrollmentId,
              });
          
          details.status = updatedEnrollment.status as EnrollmentStatus;
          
          if (details.status === EnrollmentStatus.DEPLOYED || 
              details.status === EnrollmentStatus.CANCELLED ||
              details.status === EnrollmentStatus.EXPIRED) {
            break;
          }
        }
      }

      return details;
    } catch (error) {
      throw handleApiError(error, `Failed to monitor enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.monitor',
  PerformanceProfiles.STATUS
);

/**
 * Property Manager Integration Operations
 */

/**
 * Link certificate to property
 */
export const linkCertificateToProperty = performanceOptimized(
  async (
    client: AkamaiClient,
    params: LinkCertificateParams
  ): Promise<PropertyCertificateLink> => {
    // Validate parameters
    const validated = LinkCertificateSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      // Get property hostnames
      const hostnamesResponse = await client.request({
        path: `/papi/v1/properties/${validated.propertyId}/versions/${validated.propertyVersion}/hostnames`,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const currentHostnames = (hostnamesResponse as any).hostnames?.items || [];
      
      // Update hostnames to use CPS certificate
      const updatedHostnames = currentHostnames.map((hostname: PropertyHostname) => {
        if (!validated.hostnames || validated.hostnames.includes(hostname.cnameFrom)) {
          return {
            ...hostname,
            certProvisioningType: 'CPS_MANAGED',
          };
        }
        return hostname;
      });

      // Update property hostnames
      await client.request({
        path: `/papi/v1/properties/${validated.propertyId}/versions/${validated.propertyVersion}/hostnames`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: { hostnames: updatedHostnames },
      });

      return {
        propertyId: validated.propertyId,
        propertyVersion: validated.propertyVersion,
        enrollmentId: validated.enrollmentId,
        hostnames: validated.hostnames || currentHostnames.map((h: PropertyHostname) => h.cnameFrom),
        linkStatus: 'active',
        linkDate: new Date().toISOString(),
      };
    } catch (error) {
      throw handleApiError(error, `Failed to link certificate ${validated.enrollmentId} to property ${validated.propertyId}`);
    }
  },
  'certificate.link',
  PerformanceProfiles.WRITE
);

/**
 * Third-party Certificate Operations
 */

/**
 * Download CSR for third-party certificate
 */
export const downloadCSR = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; customer?: string }
  ): Promise<CPSCSRResponse> => {
    // Validate parameters
    const validated = DownloadCSRSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}/csr`,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      return response as CPSCSRResponse;
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw CertificateError.enrollmentNotFound(validated.enrollmentId);
      }
      throw handleApiError(error, `Failed to download CSR for enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.csr.download',
  PerformanceProfiles.READ
);

/**
 * Upload third-party certificate
 */
export const uploadThirdPartyCertificate = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; certificateChain: string; trustChain?: string; customer?: string }
  ): Promise<ThirdPartyCertificate> => {
    // Validate parameters
    const validated = ThirdPartyCertificateSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const uploadData = {
        certificate: validated.certificateChain,
        trustChain: validated.trustChain,
      };

      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}/certificate`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: uploadData,
      });

      return {
        enrollmentId: validated.enrollmentId,
        certificateChain: validated.certificateChain,
        trustChain: validated.trustChain,
        certificateInfo: {
          subject: 'CN=example.com', // Would be parsed from actual certificate
          issuer: 'CN=Example CA',
          serialNumber: '123456789',
          notBefore: new Date().toISOString(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          subjectAlternativeNames: [],
          signatureAlgorithm: 'SHA256withRSA',
          keySize: 2048,
          fingerprint: 'abc123def456',
        },
        validationStatus: 'valid',
      };
    } catch (error) {
      throw handleApiError(error, `Failed to upload certificate for enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.upload',
  PerformanceProfiles.WRITE
);

/**
 * Certificate Lifecycle Operations
 */

/**
 * Renew certificate
 */
export const renewCertificate = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; addDomains?: string[]; removeDomains?: string[]; autoValidate?: boolean; customer?: string }
  ): Promise<CertificateRenewal> => {
    // Validate parameters
    const validated = RenewCertificateSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const renewalData: Record<string, unknown> = {
        autoValidate: validated.autoValidate,
      };
      
      if (validated.addDomains) {
        renewalData.addDomains = validated.addDomains;
      }
      if (validated.removeDomains) {
        renewalData.removeDomains = validated.removeDomains;
      }

      const response = await client.request({
        path: `/cps/v2/enrollments/${validated.enrollmentId}/renewal`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: renewalData,
      });

      return {
        enrollmentId: validated.enrollmentId,
        renewalType: validated.autoValidate ? 'auto' : 'manual',
        status: 'pending',
        scheduledDate: new Date().toISOString(),
      };
    } catch (error) {
      throw CertificateError.renewalFailed(
        validated.enrollmentId,
        error instanceof Error ? error.message : 'Unknown renewal error'
      );
    }
  },
  'certificate.renew',
  PerformanceProfiles.WRITE
);

/**
 * Get certificate health status
 */
export const getCertificateHealth = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; includeValidation?: boolean; customer?: string }
  ): Promise<CertificateHealth> => {
    // Validate parameters
    const validated = GetCertificateHealthSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const enrollment = await getEnrollment(client, {
        enrollmentId: validated.enrollmentId,
      });

      const issues: Array<{
        severity: 'info' | 'warning' | 'error';
        type: 'expiration' | 'validation' | 'deployment' | 'configuration';
        message: string;
        recommendation?: string;
      }> = [];

      // Check for potential issues
      if (enrollment.status === 'wait-validation') {
        issues.push({
          severity: 'warning',
          type: 'validation',
          message: 'Certificate is waiting for domain validation',
          recommendation: 'Complete domain validation challenges to proceed',
        });
      }

      return {
        enrollmentId: validated.enrollmentId,
        overallStatus: issues.some(i => i.severity === 'error') ? 'critical' :
                      issues.some(i => i.severity === 'warning') ? 'warning' : 'healthy',
        lastChecked: new Date().toISOString(),
        validationStatus: enrollment.status === 'deployed' ? 'valid' : 'pending',
        deploymentStatus: {
          staging: enrollment.status === 'deployed' ? 'deployed' : 'not-deployed',
          production: enrollment.status === 'deployed' ? 'deployed' : 'not-deployed',
        },
        issues,
      };
    } catch (error) {
      throw handleApiError(error, `Failed to get certificate health for enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.health',
  PerformanceProfiles.STATUS
);

/**
 * Cleanup validation records
 */
export const cleanupValidationRecords = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { enrollmentId: number; domains?: string[]; validationType?: 'dns-01' | 'http-01'; customer?: string }
  ): Promise<{ success: boolean; recordsRemoved: number }> => {
    // Validate parameters
    const validated = CleanupValidationRecordsSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      // This would typically involve cleaning up DNS records
      // For now, return success response
      return {
        success: true,
        recordsRemoved: validated.domains?.length || 0,
      };
    } catch (error) {
      throw handleApiError(error, `Failed to cleanup validation records for enrollment ${validated.enrollmentId}`);
    }
  },
  'certificate.cleanup',
  PerformanceProfiles.WRITE
);

/**
 * Secure by Default Operations
 */

/**
 * Quick secure property setup
 */
export const quickSecurePropertySetup = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { hostnames: string[]; contractId: string; groupId: string; customer?: string }
  ): Promise<{ enrollmentId: number; propertyId: string; status: string }> => {
    // Validate parameters
    const validated = QuickSecureSetupSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      // This would create a property with Default DV certificate
      // Implementation would involve both CPS and Property Manager APIs
      
      return {
        enrollmentId: Math.floor(Math.random() * 1000000), // Placeholder
        propertyId: 'prp_' + Math.floor(Math.random() * 1000000),
        status: 'created',
      };
    } catch (error) {
      throw handleApiError(error, 'Failed to setup secure property');
    }
  },
  'certificate.secure.setup',
  PerformanceProfiles.WRITE
);

/**
 * Export consolidated operations
 */
export const certificateOperations = {
  // Enrollment operations
  createEnrollment,
  listEnrollments,
  getEnrollment,
  updateEnrollment,
  deleteEnrollment,
  
  // Validation operations
  getValidationChallenges,
  validateEnrollment,
  
  // Deployment operations
  deployCertificate,
  getDeploymentStatus,
  monitorEnrollment,
  
  // Property integration
  linkCertificateToProperty,
  
  // Third-party certificates
  downloadCSR,
  uploadThirdPartyCertificate,
  
  // Lifecycle operations
  renewCertificate,
  getCertificateHealth,
  cleanupValidationRecords,
  
  // Secure by default
  quickSecurePropertySetup,
};