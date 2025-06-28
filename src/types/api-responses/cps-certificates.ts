/**
 * CPS (Certificate Provisioning System) API Response Types
 * @see https://techdocs.akamai.com/cps/reference/api
 * 
 * CODE KAI IMPLEMENTATION:
 * - Runtime validation with Zod schemas
 * - Type guards for safe type assertions
 * - Custom error classes for actionable feedback
 * - Production-grade validation patterns
 */

import { z } from 'zod';

/**
 * Contact information schema
 */
export const ContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  organizationName: z.string().optional(),
  addressLineOne: z.string().optional(),
  addressLineTwo: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  title: z.string().optional(),
});

/**
 * CSR (Certificate Signing Request) schema
 */
export const CSRSchema = z.object({
  cn: z.string().min(1),
  sans: z.array(z.string()).optional(),
  c: z.string().optional(),
  st: z.string().optional(),
  l: z.string().optional(),
  o: z.string().optional(),
  ou: z.string().optional(),
});

/**
 * Network configuration schema
 */
export const NetworkConfigurationSchema = z.object({
  geography: z.enum(['core', 'china', 'russia']),
  quicEnabled: z.boolean(),
  secureNetwork: z.enum(['standard-tls', 'enhanced-tls', 'shared-cert']),
  sniOnly: z.boolean(),
  disallowedTlsVersions: z.array(z.string()).optional(),
  cloneDnsNames: z.boolean().optional(),
});

/**
 * DV validation challenge schema
 */
export const DVChallengeSchema = z.object({
  type: z.enum(['dns-01', 'http-01']),
  status: z.string(),
  error: z.string().optional(),
  token: z.string().optional(),
  responseBody: z.string().optional(),
  fullPath: z.string().optional(),
  redirectFullPath: z.string().optional(),
});

/**
 * Allowed domain schema
 */
export const AllowedDomainSchema = z.object({
  name: z.string().min(1),
  status: z.string(),
  validationStatus: z.string(),
  validationDetails: z.object({
    challenges: z.array(DVChallengeSchema).optional(),
  }).optional(),
});

/**
 * CPS enrollment create response schema
 */
export const CPSEnrollmentCreateResponseSchema = z.object({
  enrollment: z.string().min(1), // Path to enrollment resource
});

/**
 * CPS enrollment status response schema
 */
export const CPSEnrollmentStatusResponseSchema = z.object({
  enrollmentId: z.number().int().positive(),
  enrollment: z.string(),
  pendingChanges: z.array(z.string()),
  status: z.string(),
  autoRenewalStartTime: z.string().optional(),
  certificateType: z.string(),
  validationType: z.string(),
  ra: z.string(),
  allowedDomains: z.array(AllowedDomainSchema),
});

/**
 * CPS enrollment list item schema
 */
export const CPSEnrollmentListItemSchema = z.object({
  enrollmentId: z.number().int().positive(),
  cn: z.string().min(1),
  sans: z.array(z.string()).optional(),
  status: z.string(),
  validationType: z.string(),
  certificateType: z.string(),
  ra: z.string(),
  networkConfiguration: NetworkConfigurationSchema.optional(),
  pendingChanges: z.array(z.string()).optional(),
});

/**
 * CPS enrollments list response schema
 */
export const CPSEnrollmentsListResponseSchema = z.object({
  enrollments: z.array(CPSEnrollmentListItemSchema),
});

/**
 * Type exports
 */
export type Contact = z.infer<typeof ContactSchema>;
export type CSR = z.infer<typeof CSRSchema>;
export type NetworkConfiguration = z.infer<typeof NetworkConfigurationSchema>;
export type DVChallenge = z.infer<typeof DVChallengeSchema>;
export type AllowedDomain = z.infer<typeof AllowedDomainSchema>;
export type CPSEnrollmentCreateResponse = z.infer<typeof CPSEnrollmentCreateResponseSchema>;
export type CPSEnrollmentStatusResponse = z.infer<typeof CPSEnrollmentStatusResponseSchema>;
export type CPSEnrollmentListItem = z.infer<typeof CPSEnrollmentListItemSchema>;
export type CPSEnrollmentsListResponse = z.infer<typeof CPSEnrollmentsListResponseSchema>;

/**
 * Custom error class for CPS validation failures
 */
export class CPSValidationError extends Error {
  public override readonly name = 'CPSValidationError';
  public readonly received: unknown;
  public readonly expected: string;

  constructor(message: string, received: unknown, expected: string) {
    super(message);
    this.received = received;
    this.expected = expected;
    
    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CPSValidationError);
    }
  }
}

/**
 * Type guard for CPS enrollment create response
 */
export function isCPSEnrollmentCreateResponse(data: unknown): data is CPSEnrollmentCreateResponse {
  try {
    CPSEnrollmentCreateResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for CPS enrollment status response
 */
export function isCPSEnrollmentStatusResponse(data: unknown): data is CPSEnrollmentStatusResponse {
  try {
    CPSEnrollmentStatusResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for CPS enrollments list response
 */
export function isCPSEnrollmentsListResponse(data: unknown): data is CPSEnrollmentsListResponse {
  try {
    CPSEnrollmentsListResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * CSR download response schema - for third-party certificates
 */
export const CPSCSRResponseSchema = z.object({
  csr: z.string().min(1),
  keyAlgorithm: z.enum(['RSA', 'ECDSA']),
  signatureAlgorithm: z.enum(['SHA256withRSA', 'SHA384withECDSA']),
  csrData: z.object({
    commonName: z.string().min(1),
    subjectAlternativeNames: z.array(z.string()),
    organization: z.string(),
    organizationalUnit: z.string(),
    locality: z.string(),
    state: z.string(),
    country: z.string().length(2),
  }),
});

export type CPSCSRResponse = z.infer<typeof CPSCSRResponseSchema>;

/**
 * Type guard for CSR response
 */
export function isCPSCSRResponse(data: unknown): data is CPSCSRResponse {
  try {
    CPSCSRResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}