/**
 * Property Onboarding Tools
 * Provides streamlined property onboarding workflow
 */

import { onboardProperty, type OnboardingConfig } from '../agents/property-onboarding.agent';
import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { withToolErrorHandling, type ErrorContext } from '../utils/tool-error-handling';

import { listRecords } from './dns-tools';
import { listEdgeHostnames } from './property-manager-advanced-tools';
import { listPropertyActivations } from './property-manager-tools';
import { listProperties } from './property-tools';

/**
 * Onboard a new property to Akamai CDN
 * Automates the complete workflow including property creation, edge hostname setup,
 * DNS configuration, and staging activation
 *
 * @example
 * ```
 * onboard-property --hostname "code.solutionsedge.io" --originHostname "origin-code.solutionsedge.io"
 * ```
 */
export async function onboardPropertyTool(
  client: AkamaiClient,
  args: {
    hostname: string;
    originHostname?: string;
    contractId?: string;
    groupId?: string;
    productId?: string;
    network?: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
    certificateType?: 'DEFAULT' | 'CPS_MANAGED';
    customer?: string;
    notificationEmails?: string[];
    skipDnsSetup?: boolean;
    dnsProvider?: 'aws' | 'cloudflare' | 'azure' | 'other' | string;
    useCase?: 'web-app' | 'api' | 'download' | 'streaming' | 'basic-web';
  },
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'onboard property',
    endpoint: 'property onboarding workflow',
    apiType: 'papi',
    customer: args.customer,
  };

  return withToolErrorHandling(async () => {
    // Validate required parameters
    if (!args.hostname) {
      throw new Error('hostname is required');
    }

    // Convert args to OnboardingConfig
    const config: OnboardingConfig = {
      hostname: args.hostname,
      originHostname: args.originHostname,
      contractId: args.contractId,
      groupId: args.groupId,
      productId: args.productId,
      network: args.network,
      certificateType: args.certificateType,
      customer: args.customer,
      notificationEmails: args.notificationEmails,
      skipDnsSetup: args.skipDnsSetup,
      dnsProvider: args.dnsProvider,
      useCase: args.useCase || 'web-app',
    };

    // Execute onboarding workflow
    return await onboardProperty(client, config);
  }, _context);
}

/**
 * Interactive property onboarding wizard
 * Guides through the onboarding process step by step
 */
export async function onboardPropertyWizard(
  client: AkamaiClient,
  args: {
    hostname: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'onboard property wizard',
    endpoint: 'property onboarding workflow',
    apiType: 'papi',
    customer: args.customer,
  };

  return withToolErrorHandling(async () => {
    if (!args.hostname) {
      throw new Error('hostname is required');
    }

    // Start with minimal config and let the agent guide through the process
    const config: OnboardingConfig = {
      hostname: args.hostname,
      customer: args.customer,
      useCase: 'web-app',
    };

    // The agent will prompt for missing information
    return await onboardProperty(client, config);
  }, _context);
}

/**
 * Check the status of property onboarding
 * Verifies all components are properly configured
 */
export async function checkOnboardingStatus(
  client: AkamaiClient,
  args: {
    hostname: string;
    propertyId?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'check onboarding status',
    endpoint: 'multiple endpoints',
    apiType: 'papi',
    customer: args.customer,
  };

  return withToolErrorHandling(async () => {
    if (!args.hostname) {
      throw new Error('hostname is required');
    }

    const status: {
      property?: any;
      edgeHostname?: any;
      dnsRecord?: any;
      activations?: any;
      errors: string[];
      warnings: string[];
    } = {
      errors: [],
      warnings: [],
    };

    // Check if property exists
    try {
      const propertiesResult = await listProperties(client, {
        customer: args.customer,
      });
      // Parse property list to find matching hostname
      const responseText = propertiesResult.content[0]?.text || '';
      if (responseText.includes(args.hostname)) {
        status.property = { found: true, hostname: args.hostname };
      } else {
        status.errors.push(`Property with hostname ${args.hostname} not found`);
      }
    } catch (_error) {
      status.errors.push('Failed to check property status');
    }

    // Check edge hostname
    try {
      const edgeHostnamesResult = await listEdgeHostnames(client, {
        customer: args.customer,
      });
      const responseText = edgeHostnamesResult.content[0]?.text || '';
      if (responseText.includes(args.hostname)) {
        status.edgeHostname = { found: true };
      } else {
        status.warnings.push('Edge hostname not found');
      }
    } catch (_error) {
      status.warnings.push('Failed to check edge hostname status');
    }

    // Check DNS records
    const domain = args.hostname.split('.').slice(-2).join('.');
    const recordName = args.hostname.replace(`.${domain}`, '');
    try {
      const dnsResult = await listRecords(client, {
        zone: domain,
        search: recordName,
      });
      const responseText = dnsResult.content[0]?.text || '';
      if (responseText.includes(recordName)) {
        status.dnsRecord = { found: true };
      } else {
        status.warnings.push('DNS record not found in Edge DNS');
      }
    } catch (_error) {
      status.warnings.push('DNS zone not found or not using Edge DNS');
    }

    // Check activation status if property ID is provided
    if (args.propertyId) {
      try {
        const activationsResult = await listPropertyActivations(client, {
          propertyId: args.propertyId,
        });
        status.activations = activationsResult;
      } catch (_error) {
        status.warnings.push('Failed to check activation status');
      }
    }

    // Generate status report
    let responseText = `# Onboarding Status for ${args.hostname}\n\n`;

    if (status.property?.found) {
      responseText += '[DONE] **Property:** Found\n';
      if (args.propertyId) {
        responseText += `   - Property ID: ${args.propertyId}\n`;
      }
    } else {
      responseText += '[ERROR] **Property:** Not found\n';
    }

    if (status.edgeHostname?.found) {
      responseText += '[DONE] **Edge Hostname:** Configured\n';
    } else {
      responseText += '[WARNING]  **Edge Hostname:** Not found\n';
    }

    if (status.dnsRecord?.found) {
      responseText += '[DONE] **DNS Record:** Found in Edge DNS\n';
    } else {
      responseText += '[WARNING]  **DNS Record:** Not in Edge DNS (may be with external provider)\n';
    }

    if (status.activations) {
      responseText += '\n## Activation Status\n';
      responseText += status.activations.content[0].text;
    }

    if (status.errors.length > 0) {
      responseText += '\n## Errors\n';
      status.errors.forEach((_error) => {
        responseText += `- ${_error}\n`;
      });
    }

    if (status.warnings.length > 0) {
      responseText += '\n## Warnings\n';
      status.warnings.forEach((warning) => {
        responseText += `- ${warning}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  }, _context);
}
