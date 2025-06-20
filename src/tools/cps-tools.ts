/**
 * Certificate Provisioning System (CPS) Tools
 * Implements Default DV certificate management with automated DNS validation
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

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
        sans: args.sans,
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

    const enrollmentId = response.enrollment?.split('/').pop() || 'unknown';

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created Default DV certificate enrollment!\n\n**Enrollment ID:** ${enrollmentId}\n**Common Name:** ${args.commonName}\n**SANs:** ${args.sans?.join(', ') || 'None'}\n**Network:** ${args.enhancedTLS !== false ? 'Enhanced TLS' : 'Standard TLS'}\n**QUIC:** ${args.quicEnabled ? 'Enabled' : 'Disabled'}\n\n## Next Steps\n\n1. **Complete DNS Validation:**\n   "Get DV validation challenges for enrollment ${enrollmentId}"\n\n2. **Check Validation Status:**\n   "Check DV enrollment status ${enrollmentId}"\n\n3. **Deploy Certificate:**\n   Once validated, the certificate will be automatically deployed.\n\n⏱️ **Timeline:**\n- DNS validation: 5-10 minutes after DNS records are created\n- Certificate issuance: 10-15 minutes after validation\n- Deployment: 30-60 minutes after issuance`,
        },
      ],
    };
  } catch (_error) {
    return formatError('create DV enrollment', _error);
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

    if (!response.allowedDomains || response.allowedDomains.length === 0) {
      throw new Error('No domains found in enrollment');
    }

    let text = `# DV Validation Challenges - Enrollment ${args.enrollmentId}\n\n`;
    text += `**Status:** ${response.status}\n`;
    text += `**Certificate Type:** ${response.certificateType}\n\n`;

    let hasPendingValidations = false;
    const dnsRecordsToCreate: Array<{ domain: string; recordName: string; recordValue: string }> =
      [];

    text += '## Domain Validation Status\n\n';

    for (const domain of response.allowedDomains) {
      const statusEmoji =
        {
          VALIDATED: '✅',
          PENDING: '⏳',
          IN_PROGRESS: '🔄',
          ERROR: '❌',
          EXPIRED: '⚠️',
        }[domain.validationStatus as keyof {VALIDATED: string; PENDING: string; IN_PROGRESS: string; ERROR: string; EXPIRED: string}] || '❓';

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
            text += `    - ⚠️ Error: ${challenge.error}\n`;
          }
        }
      }
      text += '\n';
    }

    if (dnsRecordsToCreate.length > 0) {
      text += '## 🚨 Required DNS Records\n\n';
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
    } else if (response.status === 'VALIDATED' || !hasPendingValidations) {
      text += '## ✅ All Domains Validated!\n\n';
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
    return formatError('get DV validation challenges', _error);
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
    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    const statusEmoji =
      {
        active: '✅',
        new: '🆕',
        modified: '📝',
        'renewal-in-progress': '🔄',
        'expiring-soon': '⚠️',
        expired: '❌',
        pending: '⏳',
        cancelled: '🚫',
      }[response.status.toLowerCase() as keyof {active: string; new: string; modified: string; 'renewal-in-progress': string; 'expiring-soon': string; expired: string; pending: string; cancelled: string}] || '❓';

    let text = '# Certificate Enrollment Status\n\n';
    text += `**Enrollment ID:** ${response.enrollmentId}\n`;
    text += `**Status:** ${statusEmoji} ${response.status}\n`;
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
          VALIDATED: '✅',
          PENDING: '⏳',
          IN_PROGRESS: '🔄',
          ERROR: '❌',
          EXPIRED: '⚠️',
        }[domain.validationStatus as keyof {VALIDATED: string; PENDING: string; IN_PROGRESS: string; ERROR: string; EXPIRED: string}] || '❓';

      text += `- ${emoji} **${domain.name}**: ${domain.validationStatus}\n`;

      if (domain.validationStatus !== 'VALIDATED') {
        allValidated = false;
      }
      if (domain.validationStatus === 'ERROR') {
        hasErrors = true;
      }
    }

    if (response.pendingChanges && response.pendingChanges.length > 0) {
      text += '\n## ⚠️ Pending Changes\n\n';
      response.pendingChanges.forEach((change: any) => {
        text += `- ${change}\n`;
      });
    }

    text += '\n## Next Steps\n\n';

    if (hasErrors) {
      text += '❌ **Validation Errors Detected**\n\n';
      text +=
        '1. Get validation details: "Get DV validation challenges for enrollment ' +
        args.enrollmentId +
        '"\n';
      text += '2. Fix any DNS record issues\n';
      text += '3. Retry validation if needed\n';
    } else if (!allValidated) {
      text += '⏳ **Validation In Progress**\n\n';
      text +=
        '1. Check validation requirements: "Get DV validation challenges for enrollment ' +
        args.enrollmentId +
        '"\n';
      text += '2. Ensure all DNS records are created\n';
      text += '3. Wait for validation to complete (usually 5-15 minutes)\n';
    } else if (response.status.toLowerCase() === 'active') {
      text += '✅ **Certificate Active!**\n\n';
      text += 'Your certificate is deployed and active.\n\n';
      text += 'To link to a property:\n';
      text += '"Link certificate ' + args.enrollmentId + ' to property [propertyId]"\n';
    } else if (allValidated) {
      text += '🔄 **Certificate Deployment In Progress**\n\n';
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
    return formatError('check DV enrollment status', _error);
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
    const queryParams: any = {};
    if (args.contractId) {
      queryParams.contractId = args.contractId;
    }

    const response = await client.request({
      path: '/cps/v2/enrollments',
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollments.v7+json',
      },
      queryParams,
    });

    if (!response.enrollments || response.enrollments.length === 0) {
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

    let text = `# Certificate Enrollments (${response.enrollments.length} found)\n\n`;

    // Group by status
    const byStatus = response.enrollments.reduce(
      (acc: any, enrollment: any) => {
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
      text += '## ✅ Active Certificates\n\n';
      for (const enrollment of byStatus['active']) {
        text += formatEnrollmentSummary(enrollment);
      }
    }

    // Then pending/in-progress
    const inProgress = [...(byStatus['pending'] || []), ...(byStatus['renewal-in-progress'] || [])];
    if (inProgress.length > 0) {
      text += '## ⏳ In Progress\n\n';
      for (const enrollment of inProgress) {
        text += formatEnrollmentSummary(enrollment);
      }
    }

    // Then expiring soon
    if (byStatus['expiring-soon']) {
      text += '## ⚠️ Expiring Soon\n\n';
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
    return formatError('list certificate enrollments', _error);
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

    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyResponse.properties.items[0];
    const version = args.propertyVersion || property.latestVersion || 1;

    // Get current property hostnames
    const hostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Update hostnames with certificate enrollment ID
    const hostnames = hostnamesResponse.hostnames?.items || [];
    const updatedHostnames = hostnames.map((h: any) => ({
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
          text: `✅ Linked certificate enrollment ${args.enrollmentId} to property ${property.propertyName} (v${version})\n\n## Next Steps\n\n1. **Activate Property:**\n   "Activate property ${args.propertyId} to staging"\n\n2. **Verify HTTPS:**\n   Once activated, test HTTPS access to your domains\n\n3. **Monitor Certificate:**\n   "Check DV enrollment status ${args.enrollmentId}"\n\n⚠️ **Important:** The property must be activated for the certificate to take effect.`,
        },
      ],
    };
  } catch (_error) {
    return formatError('link certificate to property', _error);
  }
}

/**
 * Helper function to format enrollment summary
 */
function formatEnrollmentSummary(enrollment: CPSEnrollmentStatus): string {
  const statusEmoji =
    {
      active: '✅',
      new: '🆕',
      modified: '📝',
      'renewal-in-progress': '🔄',
      'expiring-soon': '⚠️',
      expired: '❌',
      pending: '⏳',
      cancelled: '🚫',
    }[enrollment.status.toLowerCase()] || '❓';

  let text = `### ${statusEmoji} Enrollment ${enrollment.enrollmentId}\n`;
  text += `- **Type:** ${enrollment.certificateType} (${enrollment.validationType.toUpperCase()})\n`;
  text += `- **Status:** ${enrollment.status}\n`;
  text += `- **Domains:** ${enrollment.allowedDomains.map((d) => d.name).join(', ')}\n`;

  if (enrollment.autoRenewalStartTime) {
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
 * Format error responses with helpful guidance
 */
function formatError(operation: string, _error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  let solution = '';

  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;

    // Provide specific solutions based on error type
    if (error.message.includes('401') || error.message.includes('credentials')) {
      solution =
        '**Solution:** Check your ~/.edgerc file has valid credentials with CPS permissions.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      solution =
        '**Solution:** Your API credentials need CPS read/write permissions. Contact your account team.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      solution =
        '**Solution:** The enrollment was not found. Use "List certificate enrollments" to see available certificates.';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      solution =
        '**Solution:** Invalid request parameters. Check domain names and contact information.';
    } else if (error.message.includes('contract')) {
      solution =
        '**Solution:** Specify a valid contract ID. Use "List groups" to find available contracts.';
    }
  } else {
    errorMessage += `: ${String(error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
