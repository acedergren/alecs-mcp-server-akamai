/**
 * Certificate Domain Schemas - Runtime Validation
 * 
 * CODE KAI: Comprehensive validation schemas for certificate operations
 * Provides runtime type safety and input validation
 */

import { z } from 'zod';
import { 
  CertificateType, 
  ValidationType, 
  NetworkType, 
  Geography, 
  EnrollmentStatus 
} from './types';

/**
 * Domain and hostname validation
 */
export const validateDomainName = (domain: string): boolean => {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= 253;
};

export const validateHostname = (hostname: string): boolean => {
  // Allow wildcards for certificate hostnames
  if (hostname.startsWith('*.')) {
    return validateDomainName(hostname.substring(2));
  }
  return validateDomainName(hostname);
};

export const DomainNameSchema = z.string()
  .min(1, 'Domain name is required')
  .max(253, 'Domain name too long')
  .refine(validateDomainName, 'Invalid domain name format');

export const HostnameSchema = z.string()
  .min(1, 'Hostname is required')
  .max(253, 'Hostname too long')
  .refine(validateHostname, 'Invalid hostname format');

/**
 * Contact Information Schemas
 */
export const ContactInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').max(255),
  phone: z.string().min(10, 'Phone number too short').max(20),
  organizationName: z.string().max(100).optional(),
  addressLineOne: z.string().max(100).optional(),
  addressLineTwo: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  region: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2, 'Country code must be 2 characters').optional(),
  title: z.string().max(100).optional(),
});

/**
 * Network Configuration Schemas
 */
export const NetworkConfigurationSchema = z.object({
  geography: z.nativeEnum(Geography, {
    errorMap: () => ({ message: 'Invalid geography. Must be core, china+core, or russia+core' })
  }),
  secureNetwork: z.nativeEnum(NetworkType, {
    errorMap: () => ({ message: 'Invalid secure network type' })
  }),
  sniOnly: z.boolean().default(true),
  quicEnabled: z.boolean().default(false),
  disallowedTlsVersions: z.array(z.string()).optional(),
  cloneDnsNames: z.boolean().optional(),
  mustHaveCiphers: z.array(z.string()).optional(),
  preferredCiphers: z.array(z.string()).optional(),
});

/**
 * Certificate Enrollment Schemas
 */
export const CreateEnrollmentSchema = z.object({
  commonName: HostnameSchema,
  sans: z.array(HostnameSchema).optional(),
  certificateType: z.nativeEnum(CertificateType, {
    errorMap: () => ({ message: 'Invalid certificate type' })
  }),
  validationType: z.nativeEnum(ValidationType, {
    errorMap: () => ({ message: 'Invalid validation type' })
  }),
  networkConfiguration: NetworkConfigurationSchema,
  adminContact: ContactInfoSchema,
  techContact: ContactInfoSchema,
  org: ContactInfoSchema,
  ra: z.string().default('lets-encrypt'),
  signatureAlgorithm: z.string().default('SHA-256'),
  enableMultiStackedCertificates: z.boolean().default(false),
  changeManagement: z.boolean().default(true),
  autoRenewalStartTime: z.string().optional(),
  contractId: z.string().optional(),
  customer: z.string().optional(),
}).refine((data) => {
  // Ensure SANs don't include the common name
  if (data.sans && data.sans.includes(data.commonName)) {
    return false;
  }
  return true;
}, {
  message: 'SANs should not include the common name',
  path: ['sans'],
});

export const UpdateEnrollmentSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  commonName: HostnameSchema.optional(),
  sans: z.array(HostnameSchema).optional(),
  adminContact: ContactInfoSchema.partial().optional(),
  techContact: ContactInfoSchema.partial().optional(),
  org: ContactInfoSchema.partial().optional(),
  networkConfiguration: NetworkConfigurationSchema.partial().optional(),
  changeManagement: z.boolean().optional(),
  autoRenewalStartTime: z.string().optional(),
  customer: z.string().optional(),
});

export const ListEnrollmentsSchema = z.object({
  contractId: z.string().optional(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
  certificateType: z.nativeEnum(CertificateType).optional(),
  validationType: z.nativeEnum(ValidationType).optional(),
  search: z.string().max(255).optional(),
  customer: z.string().optional(),
});

export const GetEnrollmentSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  customer: z.string().optional(),
});

export const DeleteEnrollmentSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  force: z.boolean().default(false),
  customer: z.string().optional(),
});

/**
 * Validation Challenge Schemas
 */
export const DomainValidationChallengeSchema = z.object({
  domain: DomainNameSchema,
  type: z.enum(['dns-01', 'http-01']),
  status: z.enum(['pending', 'processing', 'valid', 'invalid', 'expired']),
  token: z.string().optional(),
  keyAuthorization: z.string().optional(),
  recordName: z.string().optional(),
  recordValue: z.string().optional(),
  recordType: z.enum(['TXT', 'CNAME']).optional(),
  fullPath: z.string().optional(),
  responseBody: z.string().optional(),
  redirectFullPath: z.string().optional(),
  error: z.object({
    type: z.string(),
    detail: z.string(),
    status: z.number(),
  }).optional(),
});

export const GetValidationChallengesSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  customer: z.string().optional(),
});

export const ValidateEnrollmentSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  customer: z.string().optional(),
});

/**
 * Certificate Deployment Schemas
 */
export const DeployCertificateSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  network: z.enum(['staging', 'production'], {
    errorMap: () => ({ message: 'Network must be staging or production' })
  }),
  allowedNetworks: z.array(z.string()).optional(),
  notBefore: z.string().datetime().optional(),
  notAfter: z.string().datetime().optional(),
  customer: z.string().optional(),
});

export const GetDeploymentStatusSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  network: z.enum(['staging', 'production']).optional(),
  customer: z.string().optional(),
});

export const MonitorEnrollmentSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  waitForCompletion: z.boolean().default(false),
  maxWaitTime: z.number().int().min(1).max(3600).default(300), // 5 minutes default, max 1 hour
  pollInterval: z.number().int().min(5).max(300).default(30), // 30 seconds default
  customer: z.string().optional(),
});

/**
 * Property Integration Schemas
 */
export const LinkCertificateSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  propertyId: z.string().min(1, 'Property ID is required'),
  propertyVersion: z.number().int().positive('Property version must be a positive integer'),
  hostnames: z.array(HostnameSchema).optional(),
  customer: z.string().optional(),
});

export const PropertyHostnameSchema = z.object({
  cnameFrom: HostnameSchema,
  cnameTo: z.string().optional(),
  cnameType: z.enum(['EDGE_HOSTNAME']).optional(),
  certProvisioningType: z.enum(['DEFAULT', 'CPS_MANAGED', 'THIRD_PARTY']),
  certStatus: z.object({
    hostname: z.string(),
    target: z.string(),
    status: z.string(),
    statusUpdateDate: z.string().optional(),
  }).optional(),
  edgeHostnameId: z.string().optional(),
  enrollmentId: z.number().optional(),
});

/**
 * Third-party Certificate Schemas
 */
export const ThirdPartyCertificateSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  certificateChain: z.string().min(1, 'Certificate chain is required'),
  trustChain: z.string().optional(),
  customer: z.string().optional(),
});

export const DownloadCSRSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  customer: z.string().optional(),
});

/**
 * Certificate Renewal Schemas
 */
export const RenewCertificateSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  addDomains: z.array(HostnameSchema).optional(),
  removeDomains: z.array(HostnameSchema).optional(),
  autoValidate: z.boolean().default(true),
  customer: z.string().optional(),
});

export const AutoRenewalSettingsSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  enabled: z.boolean(),
  daysBeforeExpiration: z.number().int().min(1).max(90).default(30),
  notificationEmails: z.array(z.string().email()).optional(),
  customer: z.string().optional(),
});

/**
 * Cleanup and Maintenance Schemas
 */
export const CleanupValidationRecordsSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  domains: z.array(DomainNameSchema).optional(),
  validationType: z.enum(['dns-01', 'http-01']).optional(),
  customer: z.string().optional(),
});

export const GetCertificateHealthSchema = z.object({
  enrollmentId: z.number().int().positive('Enrollment ID must be a positive integer'),
  includeValidation: z.boolean().default(true),
  customer: z.string().optional(),
});

/**
 * Automation Schemas
 */
export const AutomationOptionsSchema = z.object({
  autoValidate: z.boolean().default(false),
  autoDeploy: z.boolean().default(false),
  autoActivate: z.boolean().default(false),
  targetNetwork: z.enum(['staging', 'production']).default('staging'),
  waitForCompletion: z.boolean().default(false),
  maxWaitTime: z.number().int().min(60).max(3600).default(300),
  pollInterval: z.number().int().min(5).max(300).default(30),
});

export const CertificateServiceConfigSchema = z.object({
  customer: z.string().optional(),
  autoCreateDNSRecords: z.boolean().default(false),
  autoActivateDNS: z.boolean().default(false),
  enableNotifications: z.boolean().default(false),
  notificationEmails: z.array(z.string().email()).optional(),
  retryAttempts: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(1000).max(60000).default(5000),
  timeoutMs: z.number().int().min(5000).max(300000).default(30000),
  validateDomainOwnership: z.boolean().default(true),
  allowWildcardValidation: z.boolean().default(false),
});

/**
 * Secure by Default Schemas
 */
export const SecureByDefaultSetupSchema = z.object({
  propertyName: z.string().min(1, 'Property name is required'),
  hostnames: z.array(HostnameSchema).min(1, 'At least one hostname is required'),
  contractId: z.string().min(1, 'Contract ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  productId: z.string().optional(),
  certificateType: z.nativeEnum(CertificateType).default(CertificateType.DEFAULT_DV),
  customer: z.string().optional(),
});

export const QuickSecureSetupSchema = z.object({
  hostnames: z.array(HostnameSchema).min(1, 'At least one hostname is required'),
  contractId: z.string().min(1, 'Contract ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  customer: z.string().optional(),
});

/**
 * Certificate Statistics Schemas
 */
export const GetCertificateStatsSchema = z.object({
  contractId: z.string().optional(),
  timeRange: z.enum(['24h', '7d', '30d', '90d']).default('30d'),
  includeExpired: z.boolean().default(false),
  customer: z.string().optional(),
});

/**
 * Domain Ownership Validation
 */
export const validateDomainOwnership = (domain: string, allowedDomains?: string[]): boolean => {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true; // No restrictions
  }
  
  return allowedDomains.some(allowed => {
    if (allowed.startsWith('*.')) {
      // Wildcard domain
      const baseDomain = allowed.substring(2);
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }
    return domain === allowed;
  });
};

/**
 * Certificate Type Validation
 */
export const validateCertificateTypeForDomains = (
  certificateType: CertificateType,
  commonName: string,
  sans?: string[]
): boolean => {
  const allDomains = [commonName, ...(sans || [])];
  
  switch (certificateType) {
    case CertificateType.DV_SINGLE:
      return allDomains.length === 1 && !commonName.startsWith('*.');
      
    case CertificateType.DV_WILDCARD:
      return allDomains.length === 1 && commonName.startsWith('*.');
      
    case CertificateType.DV_SAN:
      return allDomains.length > 1 && !allDomains.some(d => d.startsWith('*.'));
      
    default:
      return true; // Other types have flexible domain requirements
  }
};

/**
 * Enhanced validation schema that includes business logic
 */
export const ComprehensiveEnrollmentSchema = CreateEnrollmentSchema.refine((data) => {
  return validateCertificateTypeForDomains(
    data.certificateType,
    data.commonName,
    data.sans
  );
}, {
  message: 'Certificate type does not match domain configuration',
  path: ['certificateType'],
});

/**
 * Export validation functions for external use
 */
export const validators = {
  validateDomainName,
  validateHostname,
  validateDomainOwnership,
  validateCertificateTypeForDomains,
};