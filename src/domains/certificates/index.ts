/**
 * Certificate Domain Module - Consolidated Export
 * 
 * CODE KAI: Single entry point for all certificate operations
 * Provides a clean, unified API for certificate management
 */

// Export all types
export * from './types';

// Export schemas for validation  
export {
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
  validators,
} from './schemas';

// Export consolidated operations
export { certificateOperations } from './operations';

// Export individual operations for backwards compatibility
export {
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
} from './operations';

// Import for the certificateAPI object
import {
  createEnrollment,
  listEnrollments,
  getEnrollment,
  updateEnrollment,
  deleteEnrollment,
  getValidationChallenges,
  validateEnrollment,
  deployCertificate,
  getDeploymentStatus,
  monitorEnrollment,
  linkCertificateToProperty,
  downloadCSR,
  uploadThirdPartyCertificate,
  renewCertificate,
  getCertificateHealth,
  cleanupValidationRecords,
  quickSecurePropertySetup,
} from './operations';

/**
 * Certificate Domain API
 * 
 * Unified interface for all certificate operations.
 * Provides type-safe, performance-optimized access to Akamai CPS.
 * 
 * @example
 * ```typescript
 * import { certificateOperations } from './domains/certificates';
 * 
 * // Create a DV certificate enrollment
 * const enrollment = await certificateOperations.createEnrollment(client, {
 *   commonName: 'example.com',
 *   sans: ['www.example.com'],
 *   certificateType: CertificateType.DV_SAN,
 *   validationType: ValidationType.DV,
 *   networkConfiguration: {
 *     geography: 'core',
 *     secureNetwork: 'enhanced-tls',
 *     sniOnly: true,
 *   },
 *   adminContact: { ... },
 *   techContact: { ... },
 *   org: { ... },
 *   customer: 'example'
 * });
 * 
 * // Get validation challenges
 * const challenges = await certificateOperations.getValidationChallenges(client, {
 *   enrollmentId: enrollment.enrollmentId,
 *   customer: 'example'
 * });
 * 
 * // Deploy to production
 * await certificateOperations.deployCertificate(client, {
 *   enrollmentId: enrollment.enrollmentId,
 *   network: 'production',
 *   customer: 'example'
 * });
 * ```
 */
const certificateAPI = {
  // Re-export operations for default export
  createEnrollment,
  listEnrollments,
  getEnrollment,
  updateEnrollment,
  deleteEnrollment,
  getValidationChallenges,
  validateEnrollment,
  deployCertificate,
  getDeploymentStatus,
  monitorEnrollment,
  linkCertificateToProperty,
  downloadCSR,
  uploadThirdPartyCertificate,
  renewCertificate,
  getCertificateHealth,
  cleanupValidationRecords,
  quickSecurePropertySetup,
};

export default certificateAPI;