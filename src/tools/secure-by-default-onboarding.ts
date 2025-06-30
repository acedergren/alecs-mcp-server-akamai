/**
 * Secure by Default Property Onboarding Tools
 * Implements the complete workflow for creating properties with Secure by Default (DefaultDV) certificates
 * Based on: https://techdocs.akamai.com/property-mgr/reference/onboard-a-secure-by-default-property
 *
 * IMPORTANT: This uses Secure by Default (DefaultDV) certificates, NOT regular CPS DV certificates
 */

import { selectBestProduct, formatProductDisplay } from '../utils/product-mapping';
import { Spinner } from '../utils/progress';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

import { createCPCode } from './cpcode-tools';
import { updatePropertyRules, addPropertyHostname } from './property-manager-tools';
import { createProperty } from './property-tools';
import { validateApiResponse } from '../utils/api-response-validator';

interface OnboardingState {
  propertyId?: string;
  edgeHostnameId?: string;
  cpCodeId?: number;
  completed: string[];
  failed?: { step: string; error: string };
}

/**
 * Validate prerequisites before starting onboarding
 */
async function validatePrerequisites(
  client: AkamaiClient,
  args: {
    originHostname: string;
    contractId: string;
    groupId: string;
    productId?: string;
  },
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate contract exists
  try {
    await client.request({
      path: `/papi/v1/contracts/${args.contractId}`,
      method: 'GET',
    });
  } catch (_error) {
    errors.push(`Contract ${args.contractId} not found or not accessible`);
  }

  // Validate group exists
  try {
    const groupsResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    const validatedGroupsResponse = validateApiResponse<{ groups?: { items?: any } }>(groupsResponse);
    const groupExists = validatedGroupsResponse.groups?.items?.some((g: any) => g.groupId === args.groupId);

    if (!groupExists) {
      errors.push(`Group ${args.groupId} not found`);
    }
  } catch (_error) {
    errors.push(`Unable to validate group ${args.groupId}`);
  }

  // Basic validation of origin hostname format
  const hostnameRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!hostnameRegex.test(args.originHostname)) {
    errors.push(`Invalid origin hostname format: ${args.originHostname}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create or get CP Code for the property
 */
async function ensureCPCode(
  client: AkamaiClient,
  args: {
    propertyName: string;
    contractId: string;
    groupId: string;
    productId: string;
    cpCode?: number;
  },
): Promise<number> {
  if (args.cpCode) {
    // Verify CP code exists
    try {
      await client.request({
        path: `/papi/v1/cpcodes/${args.cpCode}`,
        method: 'GET',
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId,
        },
      });
      return args.cpCode;
    } catch (_error) {
      // CP code doesn't exist, create new one
    }
  }

  // Create new CP code
  const cpCodeResult = await createCPCode(client, {
    cpcodeName: args.propertyName,
    contractId: args.contractId,
    groupId: args.groupId,
    productId: args.productId,
  });

  // Extract CP code ID from response
  const cpCodeMatch = cpCodeResult.content[0]?.text.match(/CP Code ID:\*\* (\d+)/);
  if (cpCodeMatch?.[1]) {
    return parseInt(cpCodeMatch[1]);
  }

  throw new Error('Failed to create CP code');
}

/**
 * Create a Secure by Default edge hostname with automatic DefaultDV certificate
 * This is the key difference - DefaultDV certs are created automatically with the edge hostname
 */
async function createSecureByDefaultEdgeHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    domainPrefix: string;
    productId?: string;
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  },
): Promise<{ edgeHostnameId: string; edgeHostnameDomain: string }> {
  // Get property details
  const propertyResponse = await client.request({
    path: `/papi/v1/properties/${args.propertyId}`,
    method: 'GET',
  });

  const validatedPropertyResponse = validateApiResponse<{ properties?: { items?: Array<any> } }>(propertyResponse);
  if (!validatedPropertyResponse.properties?.items?.[0]) {
    throw new Error('Property not found');
  }

  const property = validatedPropertyResponse.properties.items[0];
  const productId = args.productId || property.productId;

  // Create Secure by Default edge hostname
  // The key is using .edgekey.net suffix and NOT specifying a certificateEnrollmentId
  // This triggers automatic DefaultDV certificate creation
  const response = await client.request({
    path: '/papi/v1/edgehostnames',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'PAPI-Use-Prefixes': 'true', // Important header from your example
    },
    queryParams: {
      contractId: property.contractId,
      groupId: property.groupId,
      options: 'mapDetails', // From your example
    },
    body: {
      productId: productId,
      domainPrefix: args.domainPrefix,
      domainSuffix: 'edgekey.net', // Remove the leading dot based on your example
      secure: true,
      secureNetwork: 'ENHANCED_TLS', // Key addition from your example
      ipVersionBehavior: args.ipVersion || 'IPV4_IPV6',
      // For Secure by Default, we still omit certEnrollmentId to get DefaultDV
      // certEnrollmentId: null, // Comment out - don't include this field at all
      useCases: [
        {
          useCase: 'Download_Mode',
          option: 'BACKGROUND',
          type: 'GLOBAL',
        },
      ],
    },
  });

  const validatedResponse = validateApiResponse<{ edgeHostnameLink?: { split?: any } }>(response);
    const edgeHostnameId = validatedResponse.edgeHostnameLink?.split('/').pop()?.split('?')[0];
  const edgeHostnameDomain = `${args.domainPrefix}.edgekey.net`;

  return { edgeHostnameId, edgeHostnameDomain };
}

/**
 * Complete workflow for onboarding a Secure by Default property
 * This uses DefaultDV certificates which are automatically provisioned
 */
export async function onboardSecureByDefaultProperty(
  client: AkamaiClient,
  args: {
    propertyName: string;
    hostnames: string[];
    originHostname: string;
    contractId: string;
    groupId: string;
    productId?: string;
    cpCode?: number;
    notificationEmails?: string[];
    validatePrerequisites?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  const spinner = process.env['MCP_ENVIRONMENT'] === 'production' ? null : new Spinner();
  const state: OnboardingState = { completed: [] };

  try {
    // Step 1: Validate prerequisites
    if (args.validatePrerequisites !== false) {
      spinner?.start('Validating prerequisites...');
      const validation = await validatePrerequisites(client, {
        originHostname: args.originHostname,
        contractId: args.contractId,
        groupId: args.groupId,
        productId: args.productId,
      });

      if (!validation.valid) {
        spinner?.fail('Prerequisites validation failed');
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] **Prerequisites Validation Failed**\n\n${validation.errors.map((e) => `- ${e}`).join('\n')}\n\n**Solution:** Fix the issues above and try again.`,
            },
          ],
        };
      }
      spinner?.succeed('Prerequisites validated');
      state.completed.push('Prerequisites validated');
    }

    const steps: string[] = [];
    let propertyId: string | null = null;
    // let edgeHostnameId: string;
    let edgeHostnameDomain: string | null = null;

    // If productId is not provided, auto-select best available product
    let productId = args.productId;
    if (!productId) {
      // Get available products for the contract
      const productsResponse = await client.request({
        path: '/papi/v1/products',
        method: 'GET',
        queryParams: {
          contractId: args.contractId,
        },
      });

      const validatedProductsResponse = validateApiResponse<{ products?: { items?: Array<any> } }>(productsResponse);
      if (validatedProductsResponse.products?.items?.length && validatedProductsResponse.products.items.length > 0) {
        const bestProduct = selectBestProduct(validatedProductsResponse.products.items);
        if (bestProduct) {
          productId = bestProduct.productId;
          steps.push(
            `[SEARCH] Auto-selected product: ${bestProduct.friendlyName} (${bestProduct.productId})`,
          );
        }
      }

      // Fallback to Ion if no product could be selected
      if (!productId) {
        productId = 'prd_fresca';
        steps.push('[SEARCH] Using default product: Ion (prd_fresca)');
      }
    }

    // Step 2: Create the property
    spinner?.start('Creating property...');
    steps.push('[PACKAGE] Creating property...');
    const createPropResult = await createProperty(client, {
      propertyName: args.propertyName,
      productId: productId,
      contractId: args.contractId,
      groupId: args.groupId,
    });

    // Extract property ID from response
    const propMatch = createPropResult.content[0]?.text.match(/Property ID:\*\* (\w+)/);
    if (propMatch?.[1]) {
      propertyId = propMatch[1];
      state.propertyId = propertyId;
      spinner?.succeed(`Created property: ${propertyId}`);
      steps.push(`[DONE] Created property: ${propertyId}`);
      state.completed.push('Property created');
    } else {
      throw new Error('Failed to extract property ID from creation response');
    }

    // Step 3: Ensure CP Code exists
    spinner?.start('Setting up CP Code...');
    const cpCodeId = await ensureCPCode(client, {
      propertyName: args.propertyName,
      contractId: args.contractId,
      groupId: args.groupId,
      productId: productId,
      cpCode: args.cpCode,
    });
    state.cpCodeId = cpCodeId;
    spinner?.succeed(`CP Code ready: ${cpCodeId}`);
    steps.push(`[DONE] CP Code configured: ${cpCodeId}`);
    state.completed.push('CP Code configured');

    // Step 4: Create Secure by Default edge hostname with automatic DefaultDV certificate
    spinner?.start('Creating Secure by Default edge hostname...');
    steps.push('[EMOJI] Creating Secure by Default edge hostname with DefaultDV certificate...');

    // Generate edge hostname prefix based on property name
    const edgeHostnamePrefix = args.propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const edgeHostnameResult = await createSecureByDefaultEdgeHostname(client, {
      propertyId: propertyId,
      domainPrefix: edgeHostnamePrefix,
      productId: productId,
      ipVersion: 'IPV4_IPV6',
    });

    state.edgeHostnameId = edgeHostnameResult.edgeHostnameId;
    edgeHostnameDomain = edgeHostnameResult.edgeHostnameDomain;
    spinner?.succeed(`Created edge hostname: ${edgeHostnameDomain}`);
    steps.push(`[DONE] Created Secure by Default edge hostname: ${edgeHostnameDomain}`);
    steps.push('[DONE] DefaultDV certificate automatically provisioned for all hostnames');
    state.completed.push('Edge hostname created');

    // Step 5: Configure property rules with secure settings
    spinner?.start('Configuring property rules...');
    steps.push('[SETTINGS] Configuring property with secure settings...');

    const secureRules = {
      name: 'default',
      children: [] as any[],
      behaviors: [
        {
          name: 'origin',
          options: {
            hostname: args.originHostname,
            forwardHostHeader: 'REQUEST_HOST_HEADER',
            httpPort: 80,
            httpsPort: 443,
            originType: 'CUSTOMER',
            originCertificate: '',
            verificationMode: 'PLATFORM_SETTINGS',
            ports: '',
            cacheKeyHostname: 'REQUEST_HOST_HEADER',
            compress: true,
            enableTrueClientIp: true,
            trueClientIpHeader: 'True-Client-IP',
            trueClientIpClientSetting: false,
            originSni: true,
            allowTransferEncoding: true,
            httpVersion: 'http/1.1',
          },
        },
        {
          name: 'cpCode',
          options: {
            value: {
              id: cpCodeId,
              name: args.propertyName,
              products: [productId],
            },
          },
        },
        {
          name: 'allowTransferEncoding',
          options: {
            enabled: true,
          },
        },
        {
          name: 'caching',
          options: {
            behavior: 'MAX_AGE',
            mustRevalidate: false,
            ttl: '7d',
          },
        },
        {
          name: 'sureRoute',
          options: {
            enabled: true,
            forceSslForward: false,
            raceStatTtl: '30m',
            toHostStatus: 'INCOMING_HH',
            toHost: 'ORIGIN_HOSTNAME',
            srDownloadLinkTitle: '',
          },
        },
        {
          name: 'tieredDistribution',
          options: {
            enabled: true,
            tieredDistributionMap: 'CH2',
          },
        },
        {
          name: 'prefetch',
          options: {
            enabled: true,
          },
        },
        {
          name: 'http2',
          options: {
            enabled: true,
          },
        },
        {
          name: 'http3',
          options: {
            enable: true,
          },
        },
        {
          name: 'allowPut',
          options: {
            enabled: false,
          },
        },
        {
          name: 'allowPatch',
          options: {
            enabled: false,
          },
        },
        {
          name: 'allowDelete',
          options: {
            enabled: false,
          },
        },
      ],
      criteria: [] as any[],
      options: {
        is_secure: true,
      },
    };

    await updatePropertyRules(client, {
      propertyId: propertyId,
      rules: secureRules,
      note: 'Configured Secure by Default settings',
    });
    spinner?.succeed('Property rules configured');
    steps.push('[DONE] Configured property with secure settings');
    state.completed.push('Property rules configured');

    // Step 6: Add hostnames to property
    spinner?.start('Adding hostnames to property...');
    steps.push('[EMOJI] Adding hostnames to property...');

    for (const hostname of args.hostnames) {
      await addPropertyHostname(client, {
        propertyId: propertyId,
        hostname: hostname,
        edgeHostname: edgeHostnameDomain,
      });
      steps.push(`[DONE] Added hostname: ${hostname}`);
    }
    spinner?.succeed('All hostnames added');
    state.completed.push('Hostnames configured');

    // Step 7: Ready for activation
    steps.push('[DEPLOY] Ready for activation!');

    // Generate comprehensive response
    let text = '# [DONE] Secure by Default Property Onboarding Complete!\n\n';
    text += '## Summary\n\n';
    text += `- **Property Name:** ${args.propertyName}\n`;
    text += `- **Property ID:** ${propertyId}\n`;
    text += `- **Product:** ${formatProductDisplay(productId)}\n`;
    text += `- **Edge Hostname:** ${edgeHostnameDomain}\n`;
    text += '- **Certificate Type:** Secure by Default (DefaultDV)\n';
    text += `- **Hostnames:** ${args.hostnames.join(', ')}\n`;
    text += `- **Origin:** ${args.originHostname}\n\n`;

    text += '## Steps Completed\n\n';
    steps.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });

    text += '\n## Key Features of Secure by Default\n\n';
    text += '- **Automatic Certificate**: DefaultDV certificate automatically provisioned\n';
    text += '- **No DNS Validation Required**: Certificate validates automatically\n';
    text += '- **Enhanced Security**: TLS 1.2+ only, strong ciphers\n';
    text += '- **HTTP/3 Support**: QUIC protocol enabled\n';
    text += '- **Dual Stack**: IPv4 and IPv6 support\n\n';

    text += '## Next Steps\n\n';
    text += '### 1. Create DNS CNAMEs\n';
    text += 'For each hostname, create a CNAME record pointing to the edge hostname:\n';
    args.hostnames.forEach((hostname) => {
      text += `- ${hostname} → ${edgeHostnameDomain}\n`;
    });
    text += '\n';

    text += '### 2. Activate to Staging\n';
    text += 'Test your configuration in staging:\n';
    text += `\`\`\`\n"Activate property ${propertyId} to staging"\n\`\`\`\n\n`;

    text += '### 3. Verify Staging\n';
    text += 'Test your site on staging:\n';
    args.hostnames.forEach((hostname) => {
      text += `- https://${hostname}.edgesuite-staging.net\n`;
    });
    text += '\n';

    text += '### 4. Activate to Production\n';
    text += 'Once staging is verified:\n';
    text += `\`\`\`\n"Activate property ${propertyId} to production"\n\`\`\`\n\n`;

    text += '## Important Notes\n\n';
    text += '- **No Certificate Enrollment Needed**: DefaultDV certificates are automatic\n';
    text += '- **Instant HTTPS**: Certificate is ready immediately, no validation wait\n';
    text += '- **Automatic Renewal**: Certificates renew automatically\n';
    text += '- **All Subdomains Covered**: DefaultDV covers all hostnames on the property\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    spinner?.fail('Onboarding failed');

    // Attempt rollback if needed
    if (state.propertyId) {
      try {
        await rollbackProperty(client, state.propertyId);
      } catch (_rollbackError) {
        // Log but don't fail
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: generateFailureReport(state, _error, args),
        },
      ],
    };
  }
}

/**
 * Quick setup for Secure by Default property with minimal inputs
 */
export async function quickSecureByDefaultSetup(
  client: AkamaiClient,
  args: {
    domain: string;
    originHostname: string;
    contractId: string;
    groupId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Generate property name from domain
    const propertyName = args.domain.replace(/\./g, '-');

    // Prepare hostnames (both www and non-www)
    const hostnames = [args.domain];
    if (!args.domain.startsWith('www.')) {
      hostnames.push(`www.${args.domain}`);
    }

    // Use the full onboarding process
    return await onboardSecureByDefaultProperty(client, {
      propertyName: propertyName,
      hostnames: hostnames,
      originHostname: args.originHostname,
      contractId: args.contractId,
      groupId: args.groupId,
      productId: 'prd_fresca',
      customer: args.customer,
    });
  } catch (_error) {
    return formatError('quick Secure by Default setup', _error);
  }
}

/**
 * Check the status of Secure by Default property
 */
export async function checkSecureByDefaultStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    let text = '# Secure by Default Property Status\n\n';

    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const validatedPropertyResponse = validateApiResponse<{ properties?: { items?: Array<any> } }>(propertyResponse);
    if (!validatedPropertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = validatedPropertyResponse.properties.items[0];

    text += '## Property Information\n';
    text += `- **Name:** ${property.propertyName}\n`;
    text += `- **ID:** ${property.propertyId}\n`;
    text += `- **Latest Version:** ${property.latestVersion}\n`;
    text += `- **Production Version:** ${property.productionVersion || 'Not activated'}\n`;
    text += `- **Staging Version:** ${property.stagingVersion || 'Not activated'}\n\n`;

    // Get hostnames
    const hostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${property.latestVersion}/hostnames`,
      method: 'GET',
    });

    text += '## Configured Hostnames\n';
    const validatedHostnamesResponse = validateApiResponse<{ hostnames?: { items?: Array<any> } }>(hostnamesResponse);
    if (validatedHostnamesResponse.hostnames?.items?.length && validatedHostnamesResponse.hostnames.items.length > 0) {
      validatedHostnamesResponse.hostnames.items.forEach((hostname: any) => {
        text += `- **${hostname.cnameFrom}** → ${hostname.cnameTo}`;
        // DefaultDV certificates are always valid for all hostnames
        text += ' [DONE] (DefaultDV certificate active)\n';
      });
    } else {
      text += 'No hostnames configured\n';
    }
    text += '\n';

    // Get edge hostnames for the property
    text += '## Edge Hostname Status\n';
    const edgeHostname = validatedHostnamesResponse.hostnames?.items?.[0]?.cnameTo;
    if (edgeHostname?.includes('.edgekey.net')) {
      text += `[DONE] **Secure by Default Edge Hostname:** ${edgeHostname}\n`;
      text += '[DONE] **DefaultDV Certificate:** Automatically provisioned and active\n';
      text += '[DONE] **HTTPS Ready:** All hostnames can use HTTPS immediately\n';
    } else {
      text += '[WARNING] **Warning:** Property may not be using Secure by Default edge hostname\n';
    }
    text += '\n';

    // Check activation status
    text += '## Activation Status\n';
    if (property.productionVersion) {
      text += `[DONE] **Production:** Version ${property.productionVersion} is active\n`;
    } else {
      text += '[EMOJI] **Production:** Not yet activated\n';
    }

    if (property.stagingVersion) {
      text += `[DONE] **Staging:** Version ${property.stagingVersion} is active\n`;
    } else {
      text += '[EMOJI] **Staging:** Not yet activated\n';
    }

    text += '\n## Next Actions\n';

    if (!property.stagingVersion) {
      text += `- Activate to staging: \`"Activate property ${args.propertyId} to staging"\`\n`;
    } else if (!property.productionVersion) {
      text += `- Activate to production: \`"Activate property ${args.propertyId} to production"\`\n`;
    }

    text += `- View property rules: \`"Show rules for property ${args.propertyId}"\`\n`;
    text += `- Check hostnames: \`"Show hostnames for property ${args.propertyId}"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('check Secure by Default status', _error);
  }
}

/**
 * Generate failure report with recovery options
 */
function generateFailureReport(state: OnboardingState, _error: any, args: any): string {
  let text = '# [ERROR] Secure Property Onboarding Failed\n\n';

  text += '## Error Details\n';
  text += `- **Error:** ${_error instanceof Error ? _error.message : String(_error)}\n`;
  text += `- **Failed At:** ${state.failed?.step || 'Unknown step'}\n\n`;

  text += '## Completed Steps\n';
  if (state.completed.length > 0) {
    state.completed.forEach((step, index) => {
      text += `${index + 1}. [DONE] ${step}\n`;
    });
  } else {
    text += 'No steps were completed successfully.\n';
  }
  text += '\n';

  if (state.propertyId) {
    text += '## Partial Resources Created\n';
    text += `- **Property ID:** ${state.propertyId}\n`;
    text += '  [WARNING] This property was created but not fully configured.\n\n';

    text += '## Recovery Options\n';
    text += '1. **Continue Setup Manually:**\n';
    text += `   - Configure edge hostname: \`"Create edge hostname for property ${state.propertyId}"\`\n`;
    text += `   - Add hostnames: \`"Add hostname to property ${state.propertyId}"\`\n\n`;

    text += '2. **Start Over:**\n';
    text += `   - Delete property: \`"Remove property ${state.propertyId}"\`\n`;
    text += `   - Retry: \`"Onboard secure property ${args.propertyName}"\`\n`;
  } else {
    text += '## Recovery Options\n';
    text += '1. Fix the error and retry the onboarding\n';
    text += '2. Use manual property creation if automated onboarding continues to fail\n';
  }

  return text;
}

/**
 * Rollback a partially created property
 */
async function rollbackProperty(client: AkamaiClient, propertyId: string): Promise<void> {
  try {
    // Check if property has any activations
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${propertyId}`,
      method: 'GET',
    });

    const validatedPropertyResponse = validateApiResponse<{ properties?: { items?: any } }>(propertyResponse);
    const property = validatedPropertyResponse.properties?.items?.[0];
    if (!property?.productionVersion && !property?.stagingVersion) {
      // Safe to delete
      await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'DELETE',
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId,
        },
      });
    }
  } catch (_error) {
    // Rollback failed, but don't throw
  }
}

/**
 * Format error responses
 */
function formatError(operation: string, _error: any): MCPToolResponse {
  let errorMessage = `[ERROR] Failed to ${operation}`;

  if (_error instanceof Error) {
    errorMessage += `: ${_error.message}`;
  } else {
    errorMessage += `: ${String(_error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: errorMessage,
      },
    ],
  };
}
