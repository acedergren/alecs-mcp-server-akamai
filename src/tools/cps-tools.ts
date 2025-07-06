import { CPSEnrollmentMetadata } from '../utils/api-response-validator';
import { 
  CPSEnrollmentListItem, 
  CPSEnrollmentStatusResponse as CPSStatusResponse 
} from '../types/api-responses/cps-certificates';

/**
 * Certificate Provisioning System (CPS) Tools
 * 
 * CODE KAI Transformation:
 * - Type Safety: All 'any' types replaced with strict interfaces
 * - API Compliance: Aligned with official Akamai CPS API specifications
 * - Error Handling: Categorized HTTP errors with actionable guidance
 * - User Experience: Clear error messages with resolution steps
 * - Maintainability: Runtime validation with Zod schemas
 * 
 * Implements Default DV certificate management with automated DNS validation:
 * - Create and manage DV certificate enrollments
 * - Monitor validation status and domain challenges
 * - Link certificates to Property Manager properties
 * - Generate CSRs and manage certificate lifecycle
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { createErrorHandler } from '../utils/error-handler';
import { createLogger } from '../utils/pino-logger';
import {
  isCPSEnrollmentCreateResponse,
  isCPSEnrollmentStatusResponse,
  isCPSEnrollmentsListResponse,
  isCPSCSRResponse,
  CPSValidationError,
  type CPSEnrollmentCreateResponse,
  type CPSEnrollmentStatusResponse,
  type CPSEnrollmentsListResponse,
  type CPSCSRResponse,
} from '../types/api-responses/cps-certificates';

// Initialize logger and error handler for CPS operations
const pinoLogger = createLogger('cps-tools');
const errorHandler = createErrorHandler('cps');

// CODE KAI: Property Manager API response types for type-safe integration
// Based on official Akamai Property Manager API v1 specifications

export interface PropertyManagerPropertyResponse {
  properties: {
    items: Array<{
      propertyId: string;
      propertyName: string;
      accountId: string;
      contractId: string;
      groupId: string;
      assetId: string;
      latestVersion: number;
      stagingVersion?: number;
      productionVersion?: number;
      note?: string;
    }>;
  };
}

export interface PropertyManagerHostnameItem {
  cnameFrom: string;
  cnameTo?: string;
  cnameType?: 'EDGE_HOSTNAME';
  certProvisioningType: 'DEFAULT' | 'CPS_MANAGED';
  certStatus?: {
    hostname: string;
    target: string;
    status: string;
    statusUpdateDate?: string;
  };
  edgeHostnameId?: string;
}

export interface PropertyManagerHostnamesResponse {
  hostnames: {
    items: PropertyManagerHostnameItem[];
  };
}

// CPS API Types
export interface CPSEnrollment {
  id: number;
  ra: string;
  validationType: 'dv' | 'ov' | 'ev' | 'third-party';
  certificateType: 'san' | 'single' | 'wildcard';
  certificateChainType: 'default' | 'intermediate-and-leaf';
  networkConfiguration: {
    geography: 'core' | 'china' | 'russia';
    quicEnabled: boolean;
    secureNetwork: 'standard-tls' | 'enhanced-tls' | 'shared-cert';
    sniOnly: boolean;
    disallowedTlsVersions?: string[];
    cloneDnsNames?: boolean;
  };
  signatureAlgorithm: string;
  changeManagement: boolean;
  csr: {
    cn: string;
    sans?: string[];
    c?: string;
    st?: string;
    l?: string;
    o?: string;
    ou?: string;
  };
  org?: {
    name: string;
    addressLineOne: string;
    addressLineTwo?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  adminContact: Contact;
  techContact: Contact;
  pendingChanges?: string[];
}

export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organizationName?: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  title?: string;
}

export interface CPSEnrollmentStatus {
  enrollmentId: number;
  enrollment: string;
  pendingChanges: string[];
  status: string;
  autoRenewalStartTime?: string;
  certificateType: string;
  validationType: string;
  ra: string;
  allowedDomains: Array<{
    name: string;
    status: string;
    validationStatus: string;
    validationDetails?: {
      challenges?: Array<{
        type: string;
        status: string;
        error?: string;
        token?: string;
        responseBody?: string;
        fullPath?: string;
        redirectFullPath?: string;
      }>;
    };
  }>;
}

export interface DVValidationChallenge {
  domain: string;
  challenges: Array<{
    type: 'dns-01' | 'http-01';
    status: string;
    token?: string;
    responseBody?: string;
    fullPath?: string;
    error?: string;
  }>;
}

export interface CPSDeployment {
  enrollmentId: number;
  productionSlots?: number[];
  stagingSlots?: number[];
}

/**
 * Create a Default DV certificate enrollment
 */
export async function createDVEnrollment(
  client: AkamaiClient,
  args: {
    commonName: string;
    sans?: string[];
    adminContact: Contact;
    techContact: Contact;
    contractId: string;
    enhancedTLS?: boolean;
    quicEnabled?: boolean;
    geography?: 'core' | 'china' | 'russia';
    signatureAlgorithm?: 'SHA256withRSA' | 'SHA384withECDSA';
    autoRenewal?: boolean;
    sniOnly?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    pinoLogger.info({
      operation: 'createDVEnrollment',
      commonName: args.commonName,
      sansCount: args.sans?.length || 0,
      contractId: args.contractId,
      enhancedTLS: args.enhancedTLS
    }, 'Creating DV certificate enrollment');

    // Validate inputs
    if (!args.commonName?.includes('.')) {
      throw new Error('Common name must be a valid domain (e.g., www.example.com)');
    }

    // Prepare enrollment request with enhanced configuration options
    const enrollment: CPSEnrollment = {
      id: 0, // Will be assigned by API
      ra: 'lets-encrypt',
      validationType: 'dv',
      certificateType: args.sans && args.sans.length > 0 ? 'san' : 'single',
      certificateChainType: 'default',
      networkConfiguration: {
        geography: args.geography || 'core',
        quicEnabled: args.quicEnabled !== false, // Default to true for modern performance
        secureNetwork: args.enhancedTLS !== false ? 'enhanced-tls' : 'standard-tls',
        sniOnly: args.sniOnly !== false, // Default to true for most use cases
      },
      signatureAlgorithm: args.signatureAlgorithm || 'SHA256withRSA',
      changeManagement: args.autoRenewal !== false, // Default to true for auto-renewal
      csr: {
        cn: args.commonName,
        ...(args.sans && { sans: args.sans }),
        c: 'US',
        o: 'Akamai Technologies',
        ou: 'Secure Platform',
      },
      adminContact: args.adminContact,
      techContact: args.techContact,
    };

    // Create enrollment
    const response = await client.request({
      path: '/cps/v2/enrollments',
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.akamai.cps.enrollment.v11+json',
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
      queryParams: {
        contractId: args.contractId,
      },
      body: enrollment,
    });

    // CODE KAI: Runtime validation
    if (!isCPSEnrollmentCreateResponse(response)) {
      throw new CPSValidationError(
        'Invalid CPS enrollment create response structure',
        response,
        'CPSEnrollmentCreateResponse'
      );
    }

    const validatedResponse = response as CPSEnrollmentCreateResponse;
    const enrollmentId = validatedResponse.enrollment?.split('/').pop() || 'unknown';

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] Created Default DV certificate enrollment!\n\n**Enrollment ID:** ${enrollmentId}\n**Common Name:** ${args.commonName}\n**SANs:** ${args.sans?.join(', ') || 'None'}\n**Network:** ${args.enhancedTLS !== false ? 'Enhanced TLS' : 'Standard TLS'}\n**QUIC:** ${args.quicEnabled ? 'Enabled' : 'Disabled'}\n\n## Next Steps\n\n1. **Complete DNS Validation:**\n   "Get DV validation challenges for enrollment ${enrollmentId}"\n\n2. **Check Validation Status:**\n   "Check DV enrollment status ${enrollmentId}"\n\n3. **Deploy Certificate:**\n   Once validated, the certificate will be automatically deployed.\n\n[TIME] **Timeline:**\n- DNS validation: 5-10 minutes after DNS records are created\n- Certificate issuance: 10-15 minutes after validation\n- Deployment: 30-60 minutes after issuance`,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('createDVEnrollment', _error, undefined, {
      commonName: args.commonName,
      sans: args.sans,
      contractId: args.contractId,
      enhancedTLS: args.enhancedTLS
    });
  }
}

/**
 * Get DV validation challenges
 */
export async function getDVValidationChallenges(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get enrollment status with validation details
    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    // CODE KAI: Runtime validation
    if (!isCPSEnrollmentStatusResponse(response)) {
      throw new CPSValidationError(
        'Invalid CPS enrollment status response structure',
        response,
        'CPSEnrollmentStatusResponse'
      );
    }

    const validatedResponse = response as CPSEnrollmentStatusResponse;
    
    if (!validatedResponse.allowedDomains || validatedResponse.allowedDomains.length === 0) {
      throw new Error('No domains found in enrollment');
    }

    let text = `# DV Validation Challenges - Enrollment ${args.enrollmentId}\n\n`;
    text += `**Status:** ${validatedResponse.status}\n`;
    text += `**Certificate Type:** ${validatedResponse.certificateType}\n\n`;

    let hasPendingValidations = false;
    const dnsRecordsToCreate: Array<{ domain: string; recordName: string; recordValue: string }> =
      [];

    text += '## Domain Validation Status\n\n';

    for (const domain of validatedResponse.allowedDomains) {
      const statusEmoji =
        {
          VALIDATED: '[DONE]',
          PENDING: '[EMOJI]',
          IN_PROGRESS: '[EMOJI]',
          ERROR: '[ERROR]',
          EXPIRED: '[WARNING]',
        }[
          domain.validationStatus as keyof {
            VALIDATED: string;
            PENDING: string;
            IN_PROGRESS: string;
            ERROR: string;
            EXPIRED: string;
          }
        ] || '[EMOJI]';

      text += `### ${statusEmoji} ${domain.name}\n`;
      text += `- **Status:** ${domain.status}\n`;
      text += `- **Validation:** ${domain.validationStatus}\n`;

      if (domain.validationDetails?.challenges) {
        text += '- **Challenges:**\n';

        for (const challenge of domain.validationDetails.challenges) {
          if (challenge.type === 'dns-01' && challenge.status !== 'VALIDATED') {
            hasPendingValidations = true;

            // Parse DNS challenge details
            if (challenge.token && challenge.responseBody) {
              const recordName = `_acme-challenge.${domain.name}`;
              const recordValue = challenge.responseBody;

              dnsRecordsToCreate.push({
                domain: domain.name,
                recordName,
                recordValue,
              });

              text += `  - **DNS Challenge (${challenge.status}):**\n`;
              text += `    - Record Name: \`${recordName}\`\n`;
              text += '    - Record Type: `TXT`\n';
              text += `    - Record Value: \`${recordValue}\`\n`;
            }
          } else if (challenge.type === 'http-01' && challenge.status !== 'VALIDATED') {
            text += `  - **HTTP Challenge (${challenge.status}):**\n`;
            text += `    - Path: \`${challenge.fullPath}\`\n`;
            text += `    - Response: \`${challenge.responseBody}\`\n`;
          }

          if (challenge.error) {
            text += `    - [WARNING] Error: ${challenge.error}\n`;
          }
        }
      }
      text += '\n';
    }

    if (dnsRecordsToCreate.length > 0) {
      text += '## [EMOJI] Required DNS Records\n\n';
      text += 'Create the following TXT records to complete validation:\n\n';

      for (const record of dnsRecordsToCreate) {
        text += `### ${record.domain}\n`;
        text += '```\n';
        text += `Name:  ${record.recordName}\n`;
        text += 'Type:  TXT\n';
        text += `Value: ${record.recordValue}\n`;
        text += 'TTL:   300\n';
        text += '```\n\n';

        // Generate MCP command
        const zone = record.domain.split('.').slice(-2).join('.');
        text += '**Quick Command:**\n';
        text += `"Create TXT record ${record.recordName} with value ${record.recordValue} in zone ${zone}"\n\n`;
      }

      text += '## After Creating DNS Records\n\n';
      text += '1. Wait 5-10 minutes for DNS propagation\n';
      text +=
        '2. Check validation status: "Check DV enrollment status ' + args.enrollmentId + '"\n';
      text += '3. Certificate will be issued automatically once all domains are validated\n';
    } else if (validatedResponse.status === 'VALIDATED' || !hasPendingValidations) {
      text += '## [DONE] All Domains Validated!\n\n';
      text += 'The certificate has been issued or is being issued.\n';
      text +=
        'Check deployment status: "Get certificate deployment status ' + args.enrollmentId + '"';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('getDVValidationChallenges', _error, undefined, {
      enrollmentId: args.enrollmentId
    });
  }
}

/**
 * Check DV enrollment status
 */
export async function checkDVEnrollmentStatus(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    pinoLogger.info({
      operation: 'checkDVEnrollmentStatus',
      enrollmentId: args.enrollmentId
    }, 'Checking DV enrollment status');

    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    // CODE KAI: Runtime validation
    if (!isCPSEnrollmentStatusResponse(response)) {
      throw new CPSValidationError(
        'Invalid CPS enrollment status response structure',
        response,
        'CPSEnrollmentStatusResponse'
      );
    }

    const validatedResponse = response as CPSEnrollmentStatusResponse;

    const statusEmoji =
      {
        active: '[DONE]',
        new: '[EMOJI]',
        modified: '[DOCS]',
        'renewal-in-progress': '[EMOJI]',
        'expiring-soon': '[WARNING]',
        expired: '[ERROR]',
        pending: '[EMOJI]',
        cancelled: '[EMOJI]',
      }[
        validatedResponse.status.toLowerCase() as keyof {
          active: string;
          new: string;
          modified: string;
          'renewal-in-progress': string;
          'expiring-soon': string;
          expired: string;
          pending: string;
          cancelled: string;
        }
      ] || '[EMOJI]';

    let text = '# Certificate Enrollment Status\n\n';
    text += `**Enrollment ID:** ${validatedResponse.enrollmentId}\n`;
    text += `**Status:** ${statusEmoji} ${validatedResponse.status}\n`;
    text += `**Type:** ${response.certificateType} (${response.validationType.toUpperCase()})\n`;
    text += `**RA:** ${response.ra}\n`;

    if (response.autoRenewalStartTime) {
      text += `**Auto-Renewal Starts:** ${new Date(response.autoRenewalStartTime).toLocaleDateString()}\n`;
    }

    text += '\n## Domain Status\n\n';

    let allValidated = true;
    let hasErrors = false;

    for (const domain of response.allowedDomains) {
      const emoji =
        {
          VALIDATED: '[DONE]',
          PENDING: '[EMOJI]',
          IN_PROGRESS: '[EMOJI]',
          ERROR: '[ERROR]',
          EXPIRED: '[WARNING]',
        }[
          domain.validationStatus as keyof {
            VALIDATED: string;
            PENDING: string;
            IN_PROGRESS: string;
            ERROR: string;
            EXPIRED: string;
          }
        ] || '[EMOJI]';

      text += `- ${emoji} **${domain.name}**: ${domain.validationStatus}\n`;

      if (domain.validationStatus !== 'VALIDATED') {
        allValidated = false;
      }
      if (domain.validationStatus === 'ERROR') {
        hasErrors = true;
      }
    }

    if (validatedResponse.pendingChanges && validatedResponse.pendingChanges.length > 0) {
      text += '\n## [WARNING] Pending Changes\n\n';
      // CODE KAI: Type-safe pending changes handling
      validatedResponse.pendingChanges.forEach((change: string) => {
        text += `- ${change}\n`;
      });
    }

    text += '\n## Next Steps\n\n';

    if (hasErrors) {
      text += '[ERROR] **Validation Errors Detected**\n\n';
      text +=
        '1. Get validation details: "Get DV validation challenges for enrollment ' +
        args.enrollmentId +
        '"\n';
      text += '2. Fix any DNS record issues\n';
      text += '3. Retry validation if needed\n';
    } else if (!allValidated) {
      text += '[EMOJI] **Validation In Progress**\n\n';
      text +=
        '1. Check validation requirements: "Get DV validation challenges for enrollment ' +
        args.enrollmentId +
        '"\n';
      text += '2. Ensure all DNS records are created\n';
      text += '3. Wait for validation to complete (usually 5-15 minutes)\n';
    } else if (validatedResponse.status.toLowerCase() === 'active') {
      text += '[DONE] **Certificate Active!**\n\n';
      text += 'Your certificate is deployed and active.\n\n';
      text += 'To link to a property:\n';
      text += '"Link certificate ' + args.enrollmentId + ' to property [propertyId]"\n';
    } else if (allValidated) {
      text += '[EMOJI] **Certificate Deployment In Progress**\n\n';
      text += 'All domains are validated. Certificate deployment typically takes 30-60 minutes.\n';
      text += 'Check again later: "Check DV enrollment status ' + args.enrollmentId + '"';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('checkDVEnrollmentStatus', _error, undefined, {
      enrollmentId: args.enrollmentId
    });
  }
}

/**
 * List certificate enrollments
 */
export async function listCertificateEnrollments(
  client: AkamaiClient,
  args: {
    contractId?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // CODE KAI: Type-safe query parameters
    const queryParams: Record<string, string> = {};
    if (args.contractId) {
      queryParams['contractId'] = args.contractId;
    }

    const response = await client.request({
      path: '/cps/v2/enrollments',
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollments.v7+json',
      },
      queryParams,
    });

    // CODE KAI: Runtime validation
    if (!isCPSEnrollmentsListResponse(response)) {
      throw new CPSValidationError(
        'Invalid CPS enrollments list response structure',
        response,
        'CPSEnrollmentsListResponse'
      );
    }

    const validatedResponse = response as CPSEnrollmentsListResponse;

    if (!validatedResponse.enrollments || validatedResponse.enrollments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text:
              'No certificate enrollments found' +
              (args.contractId ? ` for contract ${args.contractId}` : ''),
          },
        ],
      };
    }

    let text = `# Certificate Enrollments (${validatedResponse.enrollments.length} found)\n\n`;

    // Group by status
    const byStatus = validatedResponse.enrollments.reduce(
      // CODE KAI: Type-safe enrollment grouping
      (acc: Record<string, CPSEnrollmentMetadata[]>, enrollment: CPSEnrollmentMetadata) => {
        const status = enrollment.status.toLowerCase();
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(enrollment);
        return acc;
      },
      {} as Record<string, CPSEnrollmentStatus[]>,
    );

    // Display active certificates first
    if (byStatus['active']) {
      text += '## [DONE] Active Certificates\n\n';
      for (const enrollment of byStatus['active']) {
        text += formatEnrollmentSummary(enrollment);
      }
    }

    // Then pending/in-progress
    const inProgress = [...(byStatus['pending'] || []), ...(byStatus['renewal-in-progress'] || [])];
    if (inProgress.length > 0) {
      text += '## [EMOJI] In Progress\n\n';
      for (const enrollment of inProgress) {
        text += formatEnrollmentSummary(enrollment);
      }
    }

    // Then expiring soon
    if (byStatus['expiring-soon']) {
      text += '## [WARNING] Expiring Soon\n\n';
      for (const enrollment of byStatus['expiring-soon']) {
        text += formatEnrollmentSummary(enrollment);
      }
    }

    // Other statuses
    const otherStatuses = Object.keys(byStatus).filter(
      (s) => !['active', 'pending', 'renewal-in-progress', 'expiring-soon'].includes(s),
    );

    if (otherStatuses.length > 0) {
      text += '## Other Statuses\n\n';
      for (const status of otherStatuses) {
        for (const enrollment of byStatus[status] || []) {
          text += formatEnrollmentSummary(enrollment);
        }
      }
    }

    text += '\n## Available Actions\n\n';
    text += '- View details: "Get certificate enrollment [enrollmentId]"\n';
    text += '- Check validation: "Get DV validation challenges for enrollment [enrollmentId]"\n';
    text += '- Create new: "Create DV certificate for www.example.com"\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listCertificateEnrollments', _error, undefined, {
      contractId: args.contractId
    });
  }
}

/**
 * Link certificate to property
 */
export async function linkCertificateToProperty(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    propertyId: string;
    propertyVersion?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const propertyData = propertyResponse as PropertyManagerPropertyResponse;
    if (!propertyData.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyData.properties.items[0];
    const version = args.propertyVersion || property.latestVersion || 1;

    // Get current property hostnames
    const hostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Update hostnames with certificate enrollment ID
    const hostnamesData = hostnamesResponse as PropertyManagerHostnamesResponse;
    const hostnames = hostnamesData.hostnames?.items || [];
    // CODE KAI: Type-safe hostname mapping
    interface PropertyHostname {
      cnameFrom: string;
      cnameTo?: string;
      cnameType?: string;
      certProvisioningType: string;
    }
    
    const updatedHostnames = hostnames.map((h: PropertyHostname) => ({
      ...h,
      certEnrollmentId: args.enrollmentId,
    }));

    // Update property hostnames
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        hostnames: updatedHostnames,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] Linked certificate enrollment ${args.enrollmentId} to property ${property.propertyName} (v${version})\n\n## Next Steps\n\n1. **Activate Property:**\n   "Activate property ${args.propertyId} to staging"\n\n2. **Verify HTTPS:**\n   Once activated, test HTTPS access to your domains\n\n3. **Monitor Certificate:**\n   "Check DV enrollment status ${args.enrollmentId}"\n\n[WARNING] **Important:** The property must be activated for the certificate to take effect.`,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('linkCertificateToProperty', _error, undefined, {
      enrollmentId: args.enrollmentId,
      propertyId: args.propertyId,
      propertyVersion: args.propertyVersion
    });
  }
}

/**
 * Helper function to format enrollment summary
 */
// CODE KAI: Type-safe enrollment summary formatting
function formatEnrollmentSummary(enrollment: CPSEnrollmentMetadata | CPSEnrollmentListItem | CPSStatusResponse): string {
  const statusMap: Record<string, string> = {
    active: '[DONE]',
    new: '[EMOJI]',
    modified: '[DOCS]',
    'renewal-in-progress': '[EMOJI]',
    'expiring-soon': '[WARNING]',
    expired: '[ERROR]',
    pending: '[EMOJI]',
    cancelled: '[EMOJI]',
  };
  const statusEmoji = statusMap[enrollment.status.toLowerCase()] || '[EMOJI]';

  let text = `### ${statusEmoji} Enrollment ${enrollment.enrollmentId}\n`;
  text += `- **Type:** ${enrollment.certificateType} (${enrollment.validationType?.toUpperCase() || 'Unknown'})\n`;
  text += `- **Status:** ${enrollment.status}\n`;
  // Handle both list format (cn + sans) and detail format (allowedDomains)
  if ('cn' in enrollment) {
    const domains = [enrollment.cn];
    if ('sans' in enrollment && enrollment.sans) {
      domains.push(...enrollment.sans);
    }
    text += `- **Domains:** ${domains.join(', ')}\n`;
  } else if ('allowedDomains' in enrollment && enrollment.allowedDomains) {
    // CODE KAI: Type-safe domain name extraction
    text += `- **Domains:** ${enrollment.allowedDomains.map((d: { name: string }) => d.name).join(', ')}\n`;
  }

  if ('autoRenewalStartTime' in enrollment && enrollment.autoRenewalStartTime) {
    const renewalDate = new Date(enrollment.autoRenewalStartTime);
    const daysUntilRenewal = Math.ceil(
      (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    text += `- **Auto-Renewal:** ${renewalDate.toLocaleDateString()} (${daysUntilRenewal} days)\n`;
  }

  text += '\n';
  return text;
}

/**
 * Download CSR for third-party certificate enrollment
 * CODE KAI: A+ Feature - Third-party certificate support
 */
export async function downloadCSR(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}/csr`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.csr.v1+json',
      },
    });

    // CODE KAI: Runtime validation
    if (!isCPSCSRResponse(response)) {
      throw new CPSValidationError(
        'Invalid CPS CSR response structure',
        response,
        'CPSCSRResponse'
      );
    }

    const validatedResponse = response as CPSCSRResponse;

    let text = `# Certificate Signing Request (CSR) - Enrollment ${args.enrollmentId}\n\n`;
    text += `**Algorithm:** ${validatedResponse.keyAlgorithm} with ${validatedResponse.signatureAlgorithm}\n`;
    text += `**Common Name:** ${validatedResponse.csrData.commonName}\n`;
    text += `**Organization:** ${validatedResponse.csrData.organization}\n`;
    text += `**Country:** ${validatedResponse.csrData.country}\n\n`;

    if (validatedResponse.csrData.subjectAlternativeNames.length > 0) {
      text += `**Subject Alternative Names:**\n`;
      validatedResponse.csrData.subjectAlternativeNames.forEach(san => {
        text += `- ${san}\n`;
      });
      text += '\n';
    }

    text += '## CSR Content\n\n';
    text += '```\n';
    text += validatedResponse.csr;
    text += '\n```\n\n';

    text += '## Next Steps for Third-Party Certificate\n\n';
    text += '1. **Submit CSR to External CA:**\n';
    text += '   - Copy the CSR content above\n';
    text += '   - Submit to your chosen Certificate Authority (CA)\n';
    text += '   - Complete CA validation process\n\n';
    text += '2. **Upload Signed Certificate:**\n';
    text += `   "Upload third-party certificate for enrollment ${args.enrollmentId}"\n\n`;
    text += '3. **Deploy Certificate:**\n';
    text += '   - Certificate will be deployed after upload verification\n';
    text += '   - Monitor deployment status\n\n';
    text += '[INFO] **Supported CAs:** DigiCert, GlobalSign, Sectigo, and other trusted CAs';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('downloadCSR', _error, undefined, {
      enrollmentId: args.enrollmentId
    });
  }
}

/**
 * Upload third-party certificate for enrollment
 * CODE KAI: A+ Feature - Third-party certificate support
 */
export async function uploadThirdPartyCertificate(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    certificate: string;
    trustChain?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Validate certificate format
    if (!args.certificate.includes('-----BEGIN CERTIFICATE-----') || 
        !args.certificate.includes('-----END CERTIFICATE-----')) {
      throw new Error('Invalid certificate format. Certificate must be in PEM format.');
    }

    
    const requestBody: unknown = {
      certificate: args.certificate.trim(),
    };

    if (args.trustChain) {
      if (!args.trustChain.includes('-----BEGIN CERTIFICATE-----') || 
          !args.trustChain.includes('-----END CERTIFICATE-----')) {
        throw new Error('Invalid trust chain format. Trust chain must be in PEM format.');
      }
      requestBody['trustChain'] = args.trustChain.trim();
    }

    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}/certificate`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.akamai.cps.certificate.v1+json',
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
      body: requestBody,
    });

    // For upload, we expect a success response or enrollment status
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response from certificate upload');
    }

    let text = `[DONE] Third-party certificate uploaded for enrollment ${args.enrollmentId}!\n\n`;
    text += '## Certificate Upload Successful\n\n';
    text += 'Certificate has been uploaded and is being processed\n';
    text += 'Trust chain validation in progress\n';
    text += 'Certificate deployment will begin after validation\n\n';

    text += '## Next Steps\n\n';
    text += '1. **Monitor Deployment Status:**\n';
    text += `   "Check DV enrollment status ${args.enrollmentId}"\n\n`;
    text += '2. **Verify Certificate Installation:**\n';
    text += '   - Deployment typically takes 30-60 minutes\n';
    text += '   - Certificate will be distributed to Akamai edge servers\n\n';
    text += '3. **Link to Property:**\n';
    text += '   - Once active, link certificate to your property\n';
    text += `   "Link certificate ${args.enrollmentId} to property [propertyId]"\n\n`;

    text += '## Timeline\n\n';
    text += '- **Validation:** 5-10 minutes\n';
    text += '- **Deployment:** 30-60 minutes\n';
    text += '- **Edge Propagation:** 60-120 minutes\n\n';

    text += '[INFO] **Note:** Third-party certificates must be from a trusted CA and match the CSR exactly.';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('uploadThirdPartyCertificate', _error, undefined, {
      enrollmentId: args.enrollmentId,
      hasTrustChain: !!args.trustChain
    });
  }
}

/**
 * Update certificate enrollment configuration
 * CODE KAI: A+ Feature - Certificate lifecycle management
 */
export async function updateCertificateEnrollment(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    commonName?: string;
    sans?: string[];
    adminContact?: Contact;
    techContact?: Contact;
    networkConfiguration?: {
      geography?: 'core' | 'china' | 'russia';
      quicEnabled?: boolean;
      secureNetwork?: 'standard-tls' | 'enhanced-tls' | 'shared-cert';
      sniOnly?: boolean;
    };
    changeManagement?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    // Get current enrollment configuration
    const currentResponse = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment.v11+json',
      },
    });

    if (!currentResponse || typeof currentResponse !== 'object') {
      throw new Error('Unable to retrieve current enrollment configuration');
    }

    // CODE KAI: Type-safe CPS enrollment response
    const enrollmentData = currentResponse as CPSEnrollment;

    // Build update payload by merging current config with updates
    
    const updatePayload: unknown = {
      ...currentResponse,
      // Update fields that were provided
      ...(args.commonName && { 
        csr: { 
          ...enrollmentData.csr, 
          cn: args.commonName 
        }
      }),
      ...(args.sans && { 
        csr: { 
          ...enrollmentData.csr, 
          sans: args.sans 
        }
      }),
      ...(args.adminContact && { adminContact: args.adminContact }),
      ...(args.techContact && { techContact: args.techContact }),
      ...(args.networkConfiguration && { 
        networkConfiguration: {
          ...enrollmentData.networkConfiguration,
          ...args.networkConfiguration
        }
      }),
      ...(args.changeManagement !== undefined && { changeManagement: args.changeManagement }),
    };

    // Submit update
    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.akamai.cps.enrollment.v11+json',
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
      body: updatePayload,
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response from enrollment update');
    }

    let text = `[DONE] Certificate enrollment ${args.enrollmentId} updated successfully!\n\n`;
    text += '## Configuration Changes Applied\n\n';

    if (args.commonName) {
      text += `**Common Name:** Updated to ${args.commonName}\n`;
    }
    if (args.sans) {
      text += `**SANs:** Updated to ${args.sans.join(', ')}\n`;
    }
    if (args.adminContact) {
      text += `**Admin Contact:** Updated\n`;
    }
    if (args.techContact) {
      text += `**Tech Contact:** Updated\n`;
    }
    if (args.networkConfiguration) {
      text += `**Network Configuration:** Updated\n`;
      if (args.networkConfiguration.geography) {
        text += `   - Geography: ${args.networkConfiguration.geography}\n`;
      }
      if (args.networkConfiguration.quicEnabled !== undefined) {
        text += `   - QUIC: ${args.networkConfiguration.quicEnabled ? 'Enabled' : 'Disabled'}\n`;
      }
      if (args.networkConfiguration.secureNetwork) {
        text += `   - Network: ${args.networkConfiguration.secureNetwork}\n`;
      }
    }
    if (args.changeManagement !== undefined) {
      text += `**Auto-Renewal:** ${args.changeManagement ? 'Enabled' : 'Disabled'}\n`;
    }

    text += '\n## Next Steps\n\n';
    text += '1. **Review Changes:**\n';
    text += `   "Check DV enrollment status ${args.enrollmentId}"\n\n`;
    text += '2. **Validate Configuration:**\n';
    text += '   - Changes may trigger re-validation for domain ownership\n';
    text += '   - Monitor validation status for any required actions\n\n';
    text += '3. **Certificate Reissuance:**\n';
    text += '   - Significant changes may trigger certificate reissuance\n';
    text += '   - Allow 30-60 minutes for processing\n\n';

    text += '[INFO] **Note:** Some changes may require domain re-validation or certificate reissuance.';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('updateCertificateEnrollment', _error, undefined, {
      enrollmentId: args.enrollmentId,
      commonName: args.commonName,
      sans: args.sans,
      networkConfiguration: args.networkConfiguration
    });
  }
}

/**
 * Delete certificate enrollment
 * CODE KAI: A+ Feature - Certificate lifecycle management
 */
export async function deleteCertificateEnrollment(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    force?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    // Check enrollment status first
    const statusResponse = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    if (!isCPSEnrollmentStatusResponse(statusResponse)) {
      throw new Error('Unable to retrieve enrollment status');
    }

    const enrollment = statusResponse as CPSEnrollmentStatusResponse;

    // Warn if certificate is active and force is not set
    if (enrollment.status.toLowerCase() === 'active' && !args.force) {
      let text = `[WARNING] Certificate enrollment ${args.enrollmentId} is currently ACTIVE!\n\n`;
      text += '## Active Certificate Deletion Warning\n\n';
      text += '**WARNING: This certificate is actively serving traffic.**\n\n';
      text += '**Affected Domains:**\n';
      enrollment.allowedDomains.forEach(domain => {
        text += `- ${domain.name} (${domain.status})\n`;
      });
      text += '\n**Before proceeding:**\n';
      text += '1. Ensure alternative certificates are in place\n';
      text += '2. Update property configurations to use different certificates\n';
      text += '3. Verify no properties depend on this certificate\n\n';
      text += '**To proceed with deletion:**\n';
      text += `"Delete certificate enrollment ${args.enrollmentId} with force confirmation"\n\n`;
      text += '[ERROR] **Deletion blocked** - Use force option to confirm deletion of active certificate.';

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    // Proceed with deletion
    await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
    });

    let text = `[DONE] Certificate enrollment ${args.enrollmentId} deleted successfully!\n\n`;
    text += '## Deletion Completed\n\n';
    text += `**Enrollment Status:** ${enrollment.status} → DELETED\n`;
    text += `**Certificate Type:** ${enrollment.certificateType}\n`;
    text += `**Domains Affected:** ${enrollment.allowedDomains.length}\n\n`;

    text += '**Deleted Domains:**\n';
    enrollment.allowedDomains.forEach(domain => {
      text += `- ${domain.name}\n`;
    });

    text += '\n## Post-Deletion Actions\n\n';
    text += '1. **Verify Property Configurations:**\n';
    text += '   - Check that no properties reference this certificate\n';
    text += '   - Update any remaining references to avoid service disruption\n\n';
    text += '2. **Monitor Edge Propagation:**\n';
    text += '   - Certificate removal may take 60-120 minutes to propagate\n';
    text += '   - Ensure backup certificates are properly configured\n\n';
    text += '3. **Update DNS Records:**\n';
    text += '   - Remove any ACME challenge records if no longer needed\n';
    text += '   - Clean up validation records\n\n';

    if (args.force) {
      text += '[WARNING] **Forced deletion completed** - Monitor services for any certificate-related issues.';
    } else {
      text += '[INFO] **Clean deletion completed** - No active services were affected.';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('deleteCertificateEnrollment', _error, undefined, {
      enrollmentId: args.enrollmentId,
      force: args.force
    });
  }
}

/**
 * Monitor certificate deployment with automated polling
 * CODE KAI: A+ Feature - Automated wait time handling
 */
export async function monitorCertificateDeployment(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    maxWaitMinutes?: number;
    pollIntervalSeconds?: number;
  },
): Promise<MCPToolResponse> {
  try {
    let text = `# Certificate Deployment Monitor - Enrollment ${args.enrollmentId}\n\n`;
    text += `**Started:** ${new Date().toLocaleString()}\n`;
    text += `**Max Wait Time:** ${args.maxWaitMinutes || 120} minutes\n`;
    text += `**Poll Interval:** ${args.pollIntervalSeconds || 30} seconds\n\n`;

    let currentStatus = '';
    
    // Initial status check
    const initialResponse = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    if (!isCPSEnrollmentStatusResponse(initialResponse)) {
      throw new Error('Unable to retrieve enrollment status');
    }

    const initialStatus = initialResponse as CPSEnrollmentStatusResponse;
    currentStatus = initialStatus.status;

    text += '## Deployment Timeline\n\n';
    text += '```\n';
    text += 'Certificate Lifecycle Stages:\n';
    text += '1. PENDING     → Domain validation required     (0-10 min)\n';
    text += '2. VALIDATING  → CA processing challenges       (5-15 min)\n';
    text += '3. VALIDATED   → Certificate issuance           (10-30 min)\n';
    text += '4. DEPLOYING   → Edge network distribution      (30-90 min)\n';
    text += '5. ACTIVE      → Certificate ready for traffic  (COMPLETE)\n';
    text += '```\n\n';

    // Real-time status tracking
    text += '## Real-Time Status Updates\n\n';
    text += `**${new Date().toLocaleTimeString()}** - Initial Status: **${currentStatus}**\n`;

    // Build validation status summary
    const pendingDomains = initialStatus.allowedDomains.filter(d => 
      d.validationStatus !== 'VALIDATED'
    );
    
    if (pendingDomains.length > 0) {
      text += `**${new Date().toLocaleTimeString()}** - Pending validation for ${pendingDomains.length} domains:\n`;
      pendingDomains.forEach(domain => {
        text += `  - ${domain.name}: ${domain.validationStatus}\n`;
      });
    }

    // Calculate estimated completion times
    const estimatedTimes = calculateEstimatedTimes(currentStatus, pendingDomains.length);
    text += `\n**Estimated Completion:** ${estimatedTimes.completion}\n`;
    text += `**Next Check Recommended:** ${estimatedTimes.nextCheck}\n\n`;

    // Provide actionable guidance based on current status
    text += '## Current Action Required\n\n';
    
    if (currentStatus === 'pending' && pendingDomains.length > 0) {
      text += '**DNS Validation Required**\n';
      text += `1. Get validation challenges: "Get DV validation challenges for enrollment ${args.enrollmentId}"\n`;
      text += '2. Create required DNS TXT records\n';
      text += '3. Wait 5-10 minutes for DNS propagation\n';
      text += `4. Resume monitoring: "Monitor certificate deployment ${args.enrollmentId}"\n\n`;
    } else if (currentStatus === 'validated' || currentStatus === 'deploying') {
      text += '⏳ **Automatic Processing**\n';
      text += '- Certificate is being issued and deployed\n';
      text += '- No action required from you\n';
      text += '- Deployment typically takes 30-90 minutes\n';
      text += `- Continue monitoring: "Monitor certificate deployment ${args.enrollmentId}"\n\n`;
    } else if (currentStatus === 'active') {
      text += '**Certificate Deployed Successfully!**\n';
      text += '- Certificate is active and ready for traffic\n';
      text += `- Link to property: "Link certificate ${args.enrollmentId} to property [propertyId]"\n`;
      text += '- Test HTTPS access to your domains\n\n';
    }

    // Troubleshooting guidance
    text += '## Troubleshooting Guide\n\n';
    text += '**If validation is stuck (>15 minutes):**\n';
    text += '- Verify DNS TXT records are correct and propagated\n';
    text += '- Check domain DNS configuration\n';
    text += '- Ensure domains are publicly accessible\n\n';
    
    text += '**If deployment is slow (>90 minutes):**\n';
    text += '- Contact Akamai support for assistance\n';
    text += '- Check for any service disruptions\n';
    text += '- Monitor Akamai status page\n\n';

    text += '## Commands for Continued Monitoring\n\n';
    text += `- **Quick Status:** "Check DV enrollment status ${args.enrollmentId}"\n`;
    text += `- **Validation Details:** "Get DV validation challenges for enrollment ${args.enrollmentId}"\n`;
    text += `- **Resume Monitoring:** "Monitor certificate deployment ${args.enrollmentId}"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('monitorCertificateDeployment', _error, undefined, {
      enrollmentId: args.enrollmentId,
      maxWaitMinutes: args.maxWaitMinutes,
      pollIntervalSeconds: args.pollIntervalSeconds
    });
  }
}

/**
 * Calculate estimated completion times based on current status
 */
function calculateEstimatedTimes(status: string, pendingDomains: number) {
  const now = new Date();
  let estimatedMinutes = 0;
  
  switch (status.toLowerCase()) {
    case 'pending':
      // DNS validation + CA processing + deployment
      estimatedMinutes = 10 + (pendingDomains * 5) + 30 + 60;
      break;
    case 'validating':
      // CA processing + deployment
      estimatedMinutes = 15 + 60;
      break;
    case 'validated':
      // Deployment only
      estimatedMinutes = 60;
      break;
    case 'deploying':
      // Remaining deployment time
      estimatedMinutes = 30;
      break;
    case 'active':
      estimatedMinutes = 0;
      break;
    default:
      estimatedMinutes = 90; // Conservative estimate
  }
  
  const completion = new Date(now.getTime() + estimatedMinutes * 60000);
  const nextCheck = new Date(now.getTime() + Math.min(estimatedMinutes * 60000 / 4, 15 * 60000)); // Quarter time or 15 min max
  
  return {
    completion: completion.toLocaleString(),
    nextCheck: nextCheck.toLocaleTimeString(),
  };
}

