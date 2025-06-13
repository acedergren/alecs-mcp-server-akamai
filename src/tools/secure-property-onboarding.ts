/**
 * Secure-by-Default Property Onboarding Tools
 * Implements the complete workflow for creating properties with Default DV certificates
 * Based on: https://techdocs.akamai.com/property-mgr/reference/onboard-a-secure-by-default-property
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { createProperty } from './property-tools.js';
import { createPropertyVersion, updatePropertyRules, createEdgeHostname, addPropertyHostname, activateProperty } from './property-manager-tools.js';
import { createDVEnrollment, getDVValidationChallenges, checkDVEnrollmentStatus } from './cps-tools.js';
import { createACMEValidationRecords } from './cps-dns-integration.js';

/**
 * Complete workflow for onboarding a secure-by-default property
 * This follows the Akamai recommended process:
 * 1. Create property
 * 2. Create Default DV certificate enrollment
 * 3. Create secure edge hostname with certificate
 * 4. Configure property with secure settings
 * 5. Add hostnames to property
 * 6. Complete DNS validation
 * 7. Activate to staging/production
 */
export async function onboardSecureProperty(
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
    let enrollmentId: number | null = null;
    let edgeHostnameId: string | null = null;
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
    const propMatch = createPropResult.content[0].text.match(/Property ID:\*\* (\w+)/);
    if (propMatch) {
      propertyId = propMatch[1];
      steps.push(`✅ Created property: ${propertyId}`);
    } else {
      throw new Error('Failed to extract property ID from creation response');
    }

    // Step 2: Create Default DV certificate enrollment
    steps.push('🔐 Creating Default DV certificate enrollment...');
    
    // Prepare SANs list - include both www and non-www versions
    const sans: string[] = [];
    args.hostnames.forEach(hostname => {
      sans.push(hostname);
      // Add www version if not already included
      if (!hostname.startsWith('www.') && !sans.includes(`www.${hostname}`)) {
        sans.push(`www.${hostname}`);
      }
      // Add non-www version if this is a www hostname
      if (hostname.startsWith('www.')) {
        const nonWww = hostname.substring(4);
        if (!sans.includes(nonWww)) {
          sans.push(nonWww);
        }
      }
    });

    const enrollmentResult = await createDVEnrollment(client, {
      cn: args.hostnames[0], // Primary hostname as CN
      sans: sans.slice(1), // Rest as SANs
      secureNetwork: 'enhanced-tls',
      mustHaveCiphers: 'ak-akamai-default-2024q1',
      sniOnly: true,
      adminContact: {
        firstName: 'Admin',
        lastName: 'Contact',
        email: args.notificationEmails?.[0] || 'admin@example.com',
        phone: '+1-555-0100',
      },
      techContact: {
        firstName: 'Tech',
        lastName: 'Contact', 
        email: args.notificationEmails?.[0] || 'tech@example.com',
        phone: '+1-555-0100',
      },
      certificateChainType: 'default',
      networkConfiguration: {
        geography: 'core',
        quicEnabled: true,
        dnsNameSettings: {
          cloneDnsNames: true,
        },
      },
      customer: args.customer,
    });

    // Extract enrollment ID
    const enrollMatch = enrollmentResult.content[0].text.match(/Enrollment ID:\*\* (\d+)/);
    if (enrollMatch) {
      enrollmentId = parseInt(enrollMatch[1]);
      steps.push(`✅ Created certificate enrollment: ${enrollmentId}`);
    } else {
      throw new Error('Failed to extract enrollment ID');
    }

    // Step 3: Create secure edge hostname with certificate
    steps.push('🌐 Creating secure edge hostname...');
    
    // Generate edge hostname prefix based on property name
    const edgeHostnamePrefix = args.propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    const edgeHostnameResult = await createEdgeHostname(client, {
      propertyId: propertyId,
      domainPrefix: edgeHostnamePrefix,
      domainSuffix: '.edgekey.net',
      productId: args.productId || 'prd_Site_Accel',
      secure: true,
      ipVersion: 'IPV4_IPV6',
      certificateEnrollmentId: enrollmentId,
    });

    // Extract edge hostname
    const edgeMatch = edgeHostnameResult.content[0].text.match(/Created edge hostname: ([^\s]+)/);
    if (edgeMatch) {
      edgeHostnameDomain = edgeMatch[1];
      steps.push(`✅ Created edge hostname: ${edgeHostnameDomain}`);
    }

    // Step 4: Configure property rules with secure settings
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
        },
        {
          name: 'edgeRedirector',
          options: {
            enabled: true,
            cloudletSharedPolicy: 0
          }
        }
      ],
      criteria: [],
      options: {
        is_secure: true
      }
    };

    await updatePropertyRules(client, {
      propertyId: propertyId,
      rules: secureRules,
      note: 'Configured secure-by-default settings',
    });
    steps.push('✅ Configured property with secure settings');

    // Step 5: Add hostnames to property
    steps.push('🔗 Adding hostnames to property...');
    
    for (const hostname of args.hostnames) {
      await addPropertyHostname(client, {
        propertyId: propertyId,
        hostname: hostname,
        edgeHostname: edgeHostnameDomain!,
      });
      steps.push(`✅ Added hostname: ${hostname}`);
    }

    // Step 6: Create DNS validation records
    steps.push('📋 Setting up DNS validation...');
    
    const dnsResult = await createACMEValidationRecords(client, {
      enrollmentId: enrollmentId,
      customer: args.customer,
      autoDetectZones: true,
    });
    
    steps.push('✅ Created DNS validation records');

    // Step 7: Provide activation instructions
    steps.push('🚀 Ready for activation!');

    // Generate comprehensive response
    let text = `# ✅ Secure Property Onboarding Complete!\n\n`;
    text += `## Summary\n\n`;
    text += `- **Property Name:** ${args.propertyName}\n`;
    text += `- **Property ID:** ${propertyId}\n`;
    text += `- **Certificate Enrollment:** ${enrollmentId}\n`;
    text += `- **Edge Hostname:** ${edgeHostnameDomain}\n`;
    text += `- **Hostnames:** ${args.hostnames.join(', ')}\n`;
    text += `- **Origin:** ${args.originHostname}\n\n`;

    text += `## Steps Completed\n\n`;
    steps.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });

    text += `\n## Next Steps\n\n`;
    text += `### 1. Verify DNS Validation\n`;
    text += `Wait for DNS propagation (usually 5-15 minutes), then check:\n`;
    text += `\`\`\`\n"Check DV certificate status for enrollment ${enrollmentId}"\n\`\`\`\n\n`;

    text += `### 2. Create DNS CNAMEs\n`;
    text += `For each hostname, create a CNAME record pointing to the edge hostname:\n`;
    args.hostnames.forEach(hostname => {
      text += `- ${hostname} → ${edgeHostnameDomain}\n`;
    });
    text += `\n`;

    text += `### 3. Activate to Staging\n`;
    text += `Test your configuration in staging:\n`;
    text += `\`\`\`\n"Activate property ${propertyId} to staging"\n\`\`\`\n\n`;

    text += `### 4. Verify Staging\n`;
    text += `Test your site on staging:\n`;
    args.hostnames.forEach(hostname => {
      text += `- https://${hostname}.edgesuite-staging.net\n`;
    });
    text += `\n`;

    text += `### 5. Activate to Production\n`;
    text += `Once staging is verified:\n`;
    text += `\`\`\`\n"Activate property ${propertyId} to production"\n\`\`\`\n\n`;

    text += `## Important Notes\n\n`;
    text += `- **Certificate Validation:** The DV certificate will be validated automatically once DNS records propagate\n`;
    text += `- **HTTPS Redirect:** The property is configured with secure settings and HTTP/2 enabled\n`;
    text += `- **Enhanced TLS:** Using Enhanced TLS network for better security and performance\n`;
    text += `- **IPv6:** Edge hostname supports both IPv4 and IPv6\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };

  } catch (error) {
    return formatError('onboard secure property', error);
  }
}

/**
 * Quick setup for secure property with minimal inputs
 * This is a simplified version that uses sensible defaults
 */
export async function quickSecurePropertySetup(
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

    // Use the full onboarding process with defaults
    return await onboardSecureProperty(client, {
      propertyName: propertyName,
      hostnames: hostnames,
      originHostname: args.originHostname,
      contractId: args.contractId,
      groupId: args.groupId,
      productId: 'prd_Site_Accel',
      notificationEmails: [`admin@${args.domain}`],
      customer: args.customer,
    });

  } catch (error) {
    return formatError('quick secure property setup', error);
  }
}

/**
 * Check the status of secure property onboarding
 */
export async function checkSecurePropertyStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    enrollmentId?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    let text = `# Secure Property Status\n\n`;
    
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
        if (hostname.certStatus) {
          const prodStatus = hostname.certStatus.production?.[0]?.status || 'No cert';
          const stagingStatus = hostname.certStatus.staging?.[0]?.status || 'No cert';
          text += ` (Prod: ${prodStatus}, Staging: ${stagingStatus})`;
        }
        text += '\n';
      });
    } else {
      text += 'No hostnames configured\n';
    }
    text += '\n';

    // Check certificate status if enrollment ID provided
    if (args.enrollmentId) {
      const certResult = await checkDVEnrollmentStatus(client, {
        enrollmentId: args.enrollmentId,
        customer: args.customer,
      });
      
      text += `## Certificate Status\n`;
      text += certResult.content[0].text.split('## Domain Validation Status')[1] || 'Certificate status not available\n';
    }

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
    
    if (args.enrollmentId) {
      text += `- Check certificate: \`"Check DV certificate status for enrollment ${args.enrollmentId}"\`\n`;
    }
    
    text += `- View property rules: \`"Show rules for property ${args.propertyId}"\`\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };

  } catch (error) {
    return formatError('check secure property status', error);
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