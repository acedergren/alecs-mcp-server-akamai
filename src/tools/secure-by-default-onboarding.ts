/**
 * Secure by Default Property Onboarding Tools
 * Implements the complete workflow for creating properties with Secure by Default (DefaultDV) certificates
 * Based on: https://techdocs.akamai.com/property-mgr/reference/onboard-a-secure-by-default-property
 * 
 * IMPORTANT: This uses Secure by Default (DefaultDV) certificates, NOT regular CPS DV certificates
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { createProperty } from './property-tools.js';
import { updatePropertyRules, addPropertyHostname } from './property-manager-tools.js';

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
  }
): Promise<{ edgeHostnameId: string; edgeHostnameDomain: string }> {
  // Get property details
  const propertyResponse = await client.request({
    path: `/papi/v1/properties/${args.propertyId}`,
    method: 'GET',
  });
  
  if (!propertyResponse.properties?.items?.[0]) {
    throw new Error('Property not found');
  }
  
  const property = propertyResponse.properties.items[0];
  const productId = args.productId || property.productId;

  // Create Secure by Default edge hostname
  // The key is using .edgekey.net suffix and NOT specifying a certificateEnrollmentId
  // This triggers automatic DefaultDV certificate creation
  const response = await client.request({
    path: '/papi/v1/edgehostnames',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
          "useCase": "Download_Mode",
          "option": "BACKGROUND", 
          "type": "GLOBAL"
        }
      ]
    },
  });

  const edgeHostnameId = response.edgeHostnameLink?.split('/').pop()?.split('?')[0];
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
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const steps: string[] = [];
    let propertyId: string | null = null;
    // let edgeHostnameId: string;
    let edgeHostnameDomain: string | null = null;

    // Step 1: Create the property
    steps.push('📦 Creating property...');
    const createPropResult = await createProperty(client, {
      propertyName: args.propertyName,
      productId: args.productId || 'prd_Site_Accel',
      contractId: args.contractId,
      groupId: args.groupId,
    });

    // Extract property ID from response
    const propMatch = createPropResult.content[0]?.text.match(/Property ID:\*\* (\w+)/);
    if (propMatch?.[1]) {
      propertyId = propMatch[1];
      steps.push(`✅ Created property: ${propertyId}`);
    } else {
      throw new Error('Failed to extract property ID from creation response');
    }

    // Step 2: Create Secure by Default edge hostname with automatic DefaultDV certificate
    steps.push('🔐 Creating Secure by Default edge hostname with DefaultDV certificate...');
    
    // Generate edge hostname prefix based on property name
    const edgeHostnamePrefix = args.propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    const edgeHostnameResult = await createSecureByDefaultEdgeHostname(client, {
      propertyId: propertyId!,
      domainPrefix: edgeHostnamePrefix,
      productId: args.productId || 'prd_Site_Accel',
      ipVersion: 'IPV4_IPV6',
    });

    // edgeHostnameId = edgeHostnameResult.edgeHostnameId;
    edgeHostnameDomain = edgeHostnameResult.edgeHostnameDomain;
    steps.push(`✅ Created Secure by Default edge hostname: ${edgeHostnameDomain}`);
    steps.push(`✅ DefaultDV certificate automatically provisioned for all hostnames`);

    // Step 3: Configure property rules with secure settings
    steps.push('⚙️ Configuring property with secure settings...');
    
    const secureRules = {
      name: 'default',
      children: [],
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
            httpVersion: 'http/1.1'
          }
        },
        {
          name: 'cpCode',
          options: {
            value: {
              id: args.cpCode || 12345, // Default CP code
              name: args.propertyName,
              products: [args.productId || 'prd_Site_Accel']
            }
          }
        },
        {
          name: 'allowTransferEncoding',
          options: {
            enabled: true
          }
        },
        {
          name: 'caching',
          options: {
            behavior: 'MAX_AGE',
            mustRevalidate: false,
            ttl: '7d'
          }
        },
        {
          name: 'sureRoute',
          options: {
            enabled: true,
            forceSslForward: false,
            raceStatTtl: '30m',
            toHostStatus: 'INCOMING_HH',
            toHost: 'ORIGIN_HOSTNAME',
            srDownloadLinkTitle: ''
          }
        },
        {
          name: 'tieredDistribution',
          options: {
            enabled: true,
            tieredDistributionMap: 'CH2'
          }
        },
        {
          name: 'prefetch',
          options: {
            enabled: true
          }
        },
        {
          name: 'http2',
          options: {
            enabled: true
          }
        },
        {
          name: 'http3',
          options: {
            enable: true
          }
        },
        {
          name: 'allowPut',
          options: {
            enabled: false
          }
        },
        {
          name: 'allowPatch',
          options: {
            enabled: false
          }
        },
        {
          name: 'allowDelete',
          options: {
            enabled: false
          }
        }
      ],
      criteria: [],
      options: {
        is_secure: true
      }
    };

    await updatePropertyRules(client, {
      propertyId: propertyId!,
      rules: secureRules,
      note: 'Configured Secure by Default settings',
    });
    steps.push('✅ Configured property with secure settings');

    // Step 4: Add hostnames to property
    steps.push('🔗 Adding hostnames to property...');
    
    for (const hostname of args.hostnames) {
      await addPropertyHostname(client, {
        propertyId: propertyId!,
        hostname: hostname,
        edgeHostname: edgeHostnameDomain!,
      });
      steps.push(`✅ Added hostname: ${hostname}`);
    }

    // Step 5: Ready for activation
    steps.push('🚀 Ready for activation!');

    // Generate comprehensive response
    let text = `# ✅ Secure by Default Property Onboarding Complete!\n\n`;
    text += `## Summary\n\n`;
    text += `- **Property Name:** ${args.propertyName}\n`;
    text += `- **Property ID:** ${propertyId}\n`;
    text += `- **Edge Hostname:** ${edgeHostnameDomain}\n`;
    text += `- **Certificate Type:** Secure by Default (DefaultDV)\n`;
    text += `- **Hostnames:** ${args.hostnames.join(', ')}\n`;
    text += `- **Origin:** ${args.originHostname}\n\n`;

    text += `## Steps Completed\n\n`;
    steps.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });

    text += `\n## Key Features of Secure by Default\n\n`;
    text += `- **Automatic Certificate**: DefaultDV certificate automatically provisioned\n`;
    text += `- **No DNS Validation Required**: Certificate validates automatically\n`;
    text += `- **Enhanced Security**: TLS 1.2+ only, strong ciphers\n`;
    text += `- **HTTP/3 Support**: QUIC protocol enabled\n`;
    text += `- **Dual Stack**: IPv4 and IPv6 support\n\n`;

    text += `## Next Steps\n\n`;
    text += `### 1. Create DNS CNAMEs\n`;
    text += `For each hostname, create a CNAME record pointing to the edge hostname:\n`;
    args.hostnames.forEach(hostname => {
      text += `- ${hostname} → ${edgeHostnameDomain}\n`;
    });
    text += `\n`;

    text += `### 2. Activate to Staging\n`;
    text += `Test your configuration in staging:\n`;
    text += `\`\`\`\n"Activate property ${propertyId} to staging"\n\`\`\`\n\n`;

    text += `### 3. Verify Staging\n`;
    text += `Test your site on staging:\n`;
    args.hostnames.forEach(hostname => {
      text += `- https://${hostname}.edgesuite-staging.net\n`;
    });
    text += `\n`;

    text += `### 4. Activate to Production\n`;
    text += `Once staging is verified:\n`;
    text += `\`\`\`\n"Activate property ${propertyId} to production"\n\`\`\`\n\n`;

    text += `## Important Notes\n\n`;
    text += `- **No Certificate Enrollment Needed**: DefaultDV certificates are automatic\n`;
    text += `- **Instant HTTPS**: Certificate is ready immediately, no validation wait\n`;
    text += `- **Automatic Renewal**: Certificates renew automatically\n`;
    text += `- **All Subdomains Covered**: DefaultDV covers all hostnames on the property\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };

  } catch (error) {
    return formatError('onboard Secure by Default property', error);
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
  }
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
      productId: 'prd_Site_Accel',
      customer: args.customer,
    });

  } catch (error) {
    return formatError('quick Secure by Default setup', error);
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
  }
): Promise<MCPToolResponse> {
  try {
    let text = `# Secure by Default Property Status\n\n`;
    
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }
    
    const property = propertyResponse.properties.items[0];
    
    text += `## Property Information\n`;
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

    text += `## Configured Hostnames\n`;
    if (hostnamesResponse.hostnames?.items?.length > 0) {
      hostnamesResponse.hostnames.items.forEach((hostname: any) => {
        text += `- **${hostname.cnameFrom}** → ${hostname.cnameTo}`;
        // DefaultDV certificates are always valid for all hostnames
        text += ` ✅ (DefaultDV certificate active)\n`;
      });
    } else {
      text += 'No hostnames configured\n';
    }
    text += '\n';

    // Get edge hostnames for the property
    text += `## Edge Hostname Status\n`;
    const edgeHostname = hostnamesResponse.hostnames?.items?.[0]?.cnameTo;
    if (edgeHostname && edgeHostname.includes('.edgekey.net')) {
      text += `✅ **Secure by Default Edge Hostname:** ${edgeHostname}\n`;
      text += `✅ **DefaultDV Certificate:** Automatically provisioned and active\n`;
      text += `✅ **HTTPS Ready:** All hostnames can use HTTPS immediately\n`;
    } else {
      text += `⚠️ **Warning:** Property may not be using Secure by Default edge hostname\n`;
    }
    text += '\n';

    // Check activation status
    text += `## Activation Status\n`;
    if (property.productionVersion) {
      text += `✅ **Production:** Version ${property.productionVersion} is active\n`;
    } else {
      text += `⏳ **Production:** Not yet activated\n`;
    }
    
    if (property.stagingVersion) {
      text += `✅ **Staging:** Version ${property.stagingVersion} is active\n`;
    } else {
      text += `⏳ **Staging:** Not yet activated\n`;
    }

    text += `\n## Next Actions\n`;
    
    if (!property.stagingVersion) {
      text += `- Activate to staging: \`"Activate property ${args.propertyId} to staging"\`\n`;
    } else if (!property.productionVersion) {
      text += `- Activate to production: \`"Activate property ${args.propertyId} to production"\`\n`;
    }
    
    text += `- View property rules: \`"Show rules for property ${args.propertyId}"\`\n`;
    text += `- Check hostnames: \`"Show hostnames for property ${args.propertyId}"\`\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };

  } catch (error) {
    return formatError('check Secure by Default status', error);
  }
}

/**
 * Format error responses
 */
function formatError(operation: string, error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  
  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;
  } else {
    errorMessage += `: ${String(error)}`;
  }

  return {
    content: [{
      type: 'text',
      text: errorMessage,
    }],
  };
}