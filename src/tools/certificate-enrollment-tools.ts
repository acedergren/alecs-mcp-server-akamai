/**
 * Certificate Enrollment Tools
 * Enhanced tools for certificate enrollment automation and management
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { createCertificateEnrollmentService } from '@services/certificate-enrollment-service';
import { checkDVEnrollmentStatus } from './cps-tools';

/**
 * Automated certificate enrollment with DV validation
 */
export async function enrollCertificateWithValidation(
  client: AkamaiClient,
  args: {
    customer?: string;
    commonName: string;
    sans?: string[];
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
    contractId: string;
    enhancedTLS?: boolean;
    quicEnabled?: boolean;
    autoDeploy?: boolean;
    targetNetwork?: 'staging' | 'production';
  },
): Promise<MCPToolResponse> {
  const service = createCertificateEnrollmentService(client, {
    customer: args.customer,
    autoCreateDNSRecords: true,
    autoActivateDNS: true,
    enableNotifications: true,
  });

  return service.enrollDefaultDVCertificate({
    ...args,
    autoValidate: true,
  });
}

/**
 * Validate existing certificate enrollment
 */
export async function validateCertificateEnrollment(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  const service = createCertificateEnrollmentService(client, {
    customer: args.customer,
  });

  return service.validateCertificateEnrollment(args.enrollmentId);
}

/**
 * Deploy validated certificate to network
 */
export async function deployCertificateToNetwork(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
    network: 'staging' | 'production';
  },
): Promise<MCPToolResponse> {
  const service = createCertificateEnrollmentService(client, {
    customer: args.customer,
  });

  return service.deployCertificate(args.enrollmentId, args.network);
}

/**
 * Monitor certificate enrollment lifecycle
 */
export async function monitorCertificateEnrollment(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  const service = createCertificateEnrollmentService(client, {
    customer: args.customer,
  });

  return service.monitorCertificateLifecycle(args.enrollmentId);
}

/**
 * Get certificate deployment status
 */
export async function getCertificateDeploymentStatus(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get deployments
    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}/deployments`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.deployments.v3+json',
      },
    });

    const deployments = response.results || [];

    if (deployments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No deployments found for enrollment ${args.enrollmentId}\n\nThe certificate may not be deployed yet or validation may still be pending.`,
          },
        ],
      };
    }

    let text = `# Certificate Deployment Status\n\n`;
    text += `**Enrollment ID:** ${args.enrollmentId}\n\n`;

    // Group by network
    const byNetwork: Record<string, any[]> = {};
    deployments.forEach((dep: any) => {
      const network = dep.primaryCertificate?.network || dep.targetEnvironment || 'unknown';
      if (!byNetwork[network]) byNetwork[network] = [];
      byNetwork[network].push(dep);
    });

    // Display deployments by network
    Object.entries(byNetwork).forEach(([network, deps]) => {
      text += `## ${network.toUpperCase()} Network\n\n`;

      deps.forEach((dep: any) => {
        const statusEmoji = (() => {
          const statusMap: Record<string, string> = {
            active: '✅',
            pending: '⏳',
            'in-progress': '🔄',
            failed: '❌',
            expired: '⚠️',
          };
          return statusMap[dep.deploymentStatus] || '❓';
        })();

        text += `### ${statusEmoji} Deployment ${dep.deploymentId || 'Current'}\n`;

        if (dep.deploymentStatus) {
          text += `- **Status:** ${dep.deploymentStatus}\n`;
        }

        if (dep.primaryCertificate) {
          text += `- **Certificate Expiry:** ${new Date(dep.primaryCertificate.expiry).toLocaleDateString()}\n`;
          text += `- **Serial Number:** ${dep.primaryCertificate.serialNumber}\n`;
        }

        if (dep.deploymentDate) {
          text += `- **Deployed:** ${new Date(dep.deploymentDate).toLocaleString()}\n`;
        }

        if (dep.properties && dep.properties.length > 0) {
          text += `- **Linked Properties:** ${dep.properties.length}\n`;
        }

        text += '\n';
      });
    });

    text += `## Actions\n\n`;
    text += `- Check validation: "Get DV validation challenges for enrollment ${args.enrollmentId}"\n`;
    text += `- Deploy to staging: "Deploy certificate ${args.enrollmentId} to staging"\n`;
    text += `- Deploy to production: "Deploy certificate ${args.enrollmentId} to production"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to get deployment status: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Automated certificate renewal
 */
export async function renewCertificate(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
    autoValidate?: boolean;
    autoDeploy?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    let steps = `# Certificate Renewal Process\n\n`;
    steps += `**Enrollment ID:** ${args.enrollmentId}\n\n`;

    // Step 1: Check current status
    const statusResponse = await checkDVEnrollmentStatus(client, {
      enrollmentId: args.enrollmentId,
    });

    const statusText = Array.isArray(statusResponse.content)
      ? statusResponse.content[0]?.text || ''
      : statusResponse.content || '';

    // Check if renewal is needed
    if (!statusText.includes('expiring-soon') && !statusText.includes('expired')) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ Certificate renewal not needed yet\n\n${statusText}`,
          },
        ],
      };
    }

    // Step 2: Initiate renewal
    steps += `## Initiating Renewal\n\n`;

    await client.request({
      method: 'POST',
      path: `/cps/v2/enrollments/${args.enrollmentId}/renewals`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        changeManagement: false,
      },
    });

    steps += `✅ Renewal initiated\n\n`;

    // Step 3: Handle validation if auto-validate
    if (args.autoValidate) {
      steps += `## Auto-Validation\n\n`;
      const service = createCertificateEnrollmentService(client, {
        customer: args.customer,
      });

      const validationResult = await service.validateCertificateEnrollment(args.enrollmentId);
      steps += Array.isArray(validationResult.content)
        ? validationResult.content[0]?.text || ''
        : validationResult.content || '';
      steps += '\n';
    }

    // Step 4: Handle deployment if auto-deploy
    if (args.autoDeploy) {
      steps += `## Auto-Deployment\n\n`;
      const service = createCertificateEnrollmentService(client, {
        customer: args.customer,
      });

      const deployResult = await service.deployCertificate(args.enrollmentId, 'production');
      steps += Array.isArray(deployResult.content)
        ? deployResult.content[0]?.text || ''
        : deployResult.content || '';
    }

    steps += `\n## Next Steps\n\n`;
    steps += `1. Monitor renewal: "Monitor certificate enrollment ${args.enrollmentId}"\n`;
    steps += `2. Check deployment: "Get certificate deployment status ${args.enrollmentId}"\n`;

    return {
      content: [
        {
          type: 'text',
          text: steps,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to renew certificate: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Cleanup DNS validation records
 */
export async function cleanupValidationRecords(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get validation challenges to find DNS records
    const challengesResponse = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    const enrollment = challengesResponse;
    const recordsToDelete: Array<{ zone: string; recordName: string }> = [];

    // Extract DNS records from validation details
    if (enrollment.allowedDomains) {
      enrollment.allowedDomains.forEach((domain: any) => {
        if (domain.validationDetails?.challenges) {
          domain.validationDetails.challenges.forEach((challenge: any) => {
            if (challenge.type === 'dns-01' && challenge.token) {
              const recordName = `_acme-challenge.${domain.name}`;
              const zone = domain.name.split('.').slice(-2).join('.');
              recordsToDelete.push({ zone, recordName });
            }
          });
        }
      });
    }

    if (recordsToDelete.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No validation records found to cleanup for enrollment ${args.enrollmentId}`,
          },
        ],
      };
    }

    let text = `# Cleaning Up Validation Records\n\n`;
    text += `Found ${recordsToDelete.length} ACME validation records to remove:\n\n`;

    // Import deleteRecord function
    const { deleteRecord } = await import('./dns-tools.js');

    let deleted = 0;
    let failed = 0;

    for (const record of recordsToDelete) {
      try {
        await deleteRecord(client, {
          zone: record.zone,
          name: record.recordName,
          type: 'TXT',
          comment: `Cleanup ACME validation for enrollment ${args.enrollmentId}`,
        });
        text += `✅ Deleted: ${record.recordName} from ${record.zone}\n`;
        deleted++;
      } catch (error) {
        text += `❌ Failed to delete ${record.recordName}: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
        failed++;
      }
    }

    text += `\n## Summary\n\n`;
    text += `- **Records Deleted:** ${deleted}\n`;
    text += `- **Failed:** ${failed}\n`;

    if (deleted > 0) {
      text += `\n✅ Validation records cleaned up successfully`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to cleanup validation records: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Get certificate validation history
 */
export async function getCertificateValidationHistory(
  client: AkamaiClient,
  args: {
    customer?: string;
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/cps/v2/enrollments/${args.enrollmentId}/dv-history`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.dv-history.v2+json',
      },
    });

    const history = response.results || [];

    if (history.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No validation history found for enrollment ${args.enrollmentId}`,
          },
        ],
      };
    }

    let text = `# Certificate Validation History\n\n`;
    text += `**Enrollment ID:** ${args.enrollmentId}\n\n`;

    // Group by domain
    const byDomain: Record<string, any[]> = {};
    history.forEach((entry: any) => {
      const domain = entry.domain || 'unknown';
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(entry);
    });

    // Display history by domain
    Object.entries(byDomain).forEach(([domain, entries]) => {
      text += `## ${domain}\n\n`;

      entries.sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
      );

      entries.forEach((entry: any) => {
        const statusEmoji = (() => {
          const statusMap: Record<string, string> = {
            completed: '✅',
            pending: '⏳',
            'in-progress': '🔄',
            failed: '❌',
            expired: '⚠️',
          };
          return statusMap[entry.status] || '❓';
        })();

        text += `### ${statusEmoji} ${entry.validationMethod || 'dns-01'} - ${entry.status}\n`;

        if (entry.timestamp) {
          text += `- **Time:** ${new Date(entry.timestamp).toLocaleString()}\n`;
        }

        if (entry.expires) {
          text += `- **Expires:** ${new Date(entry.expires).toLocaleString()}\n`;
        }

        if (entry.error) {
          text += `- **Error:** ${entry.error}\n`;
        }

        if (entry.dnsTarget) {
          text += `- **DNS Record:** ${entry.dnsTarget.recordName}\n`;
          text += `- **Value:** \`${entry.dnsTarget.recordValue}\`\n`;
        }

        text += '\n';
      });
    });

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to get validation history: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
