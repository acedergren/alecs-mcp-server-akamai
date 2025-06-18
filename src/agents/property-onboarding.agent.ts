/**
 * Property Onboarding Agent
 * Automates the complete workflow for onboarding new properties to Akamai CDN
 * with HTTPS-only, Enhanced TLS, and Default DV certificates
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups
} from '../tools/property-tools';
import {
  searchProperties
} from '../tools/property-manager-advanced-tools';
import {
  createEdgeHostname,
  addPropertyHostname,
  activateProperty,
  getActivationStatus,
  updatePropertyRules,
  getPropertyRules
} from '../tools/property-manager-tools';
import {
  listEdgeHostnames
} from '../tools/property-manager-advanced-tools';
import {
  listZones,
  createZone,
  upsertRecord,
  listRecords
} from '../tools/dns-tools';
import {
  listProducts
} from '../tools/product-tools';
import { formatPropertyDisplay } from '../utils/formatting';

export interface OnboardingConfig {
  hostname: string;
  originHostname?: string;
  groupId?: string;
  productId?: string;
  network?: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
  certificateType?: 'DEFAULT' | 'CPS_MANAGED';
  customer?: string;
  notificationEmails?: string[];
  skipDnsSetup?: boolean;
  dnsProvider?: string;
}

export interface OnboardingResult {
  success: boolean;
  propertyId?: string;
  edgeHostname?: string;
  activationId?: string;
  dnsRecordCreated?: boolean;
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}

const DNS_PROVIDER_GUIDES = {
  aws: {
    name: 'AWS Route53',
    exportSteps: [
      '1. Go to AWS Route53 Console',
      '2. Select your hosted zone',
      '3. Click "Hosted zone details"',
      '4. Note the NS records for your domain',
      '5. Enable zone transfers:',
      '   - Create a new policy allowing Akamai\'s transfer IPs',
      '   - IPs: 23.73.134.141, 23.73.134.237, 72.246.199.141, 72.246.199.237',
      '6. Or export zone file: aws route53 list-resource-record-sets --hosted-zone-id ZONE_ID'
    ]
  },
  cloudflare: {
    name: 'Cloudflare',
    exportSteps: [
      '1. Log in to Cloudflare Dashboard',
      '2. Select your domain',
      '3. Go to DNS settings',
      '4. Click "Advanced" → "Export DNS records"',
      '5. Download the BIND format file',
      '6. Note: Cloudflare doesn\'t support AXFR transfers',
      '7. You\'ll need to manually import records to Akamai'
    ]
  },
  azure: {
    name: 'Azure DNS',
    exportSteps: [
      '1. Go to Azure Portal',
      '2. Navigate to DNS zones',
      '3. Select your zone',
      '4. Click "Export zone file" in the overview',
      '5. Or use Azure CLI: az network dns zone export -g ResourceGroup -n zonename -f zonefile.txt',
      '6. Import the zone file to Akamai Edge DNS'
    ]
  },
  other: {
    name: 'Other DNS Provider',
    exportSteps: [
      '1. Export your DNS zone in BIND format if possible',
      '2. Common methods:',
      '   - Look for "Export DNS" or "Export Zone" option',
      '   - Use dig for zone transfer: dig @ns1.provider.com yourdomain.com AXFR',
      '   - Contact support for zone export',
      '3. Ensure you have all records including:',
      '   - A, AAAA, CNAME, MX, TXT, SRV records',
      '   - TTL values',
      '   - Any special records (CAA, DKIM, etc.)'
    ]
  }
};

export class PropertyOnboardingAgent {
  constructor(private client: AkamaiClient) {}

  async execute(config: OnboardingConfig): Promise<OnboardingResult> {
    const result: OnboardingResult = {
      success: false,
      errors: [],
      warnings: [],
      nextSteps: []
    };

    try {
      // Step 1: Validate and prepare configuration
      const validatedConfig = await this.validateConfig(config);
      
      // Step 2: Pre-flight checks
      console.error(`[PropertyOnboarding] Starting onboarding for ${validatedConfig.hostname}`);
      const preflightResult = await this.performPreflightChecks(validatedConfig);
      if (!preflightResult.canProceed) {
        result.errors = preflightResult.errors;
        return result;
      }

      // Step 3: Determine group and product if not provided
      if (!validatedConfig.groupId || !validatedConfig.productId) {
        const selection = await this.selectGroupAndProduct(validatedConfig);
        validatedConfig.groupId = selection.groupId;
        validatedConfig.productId = selection.productId;
      }

      // Step 4: Create property
      const propertyResult = await this.createPropertyWithRetry(validatedConfig);
      if (!propertyResult.success || !propertyResult.propertyId) {
        result.errors!.push('Failed to create property');
        return result;
      }
      result.propertyId = propertyResult.propertyId;

      // Step 5: Create edge hostname
      const edgeHostnameResult = await this.createEdgeHostnameWithRetry(
        propertyResult.propertyId,
        validatedConfig
      );
      if (!edgeHostnameResult.success) {
        result.errors!.push('Failed to create edge hostname');
        result.warnings!.push('Property created but edge hostname creation failed');
        return result;
      }
      result.edgeHostname = edgeHostnameResult.edgeHostname;

      // Step 6: Add hostname to property
      await this.addHostnameToProperty(
        propertyResult.propertyId,
        validatedConfig.hostname,
        edgeHostnameResult.edgeHostname!
      );

      // Step 7: Configure property rules
      await this.configurePropertyRules(
        propertyResult.propertyId,
        validatedConfig
      );

      // Step 8: Handle DNS setup
      if (!validatedConfig.skipDnsSetup) {
        const dnsResult = await this.handleDnsSetup(
          validatedConfig.hostname,
          edgeHostnameResult.edgeHostname!,
          validatedConfig
        );
        result.dnsRecordCreated = dnsResult.recordCreated;
        if (dnsResult.warnings) {
          result.warnings!.push(...dnsResult.warnings);
        }
        if (dnsResult.nextSteps) {
          result.nextSteps!.push(...dnsResult.nextSteps);
        }
      }

      // Step 9: Activate to staging
      const activationResult = await this.activatePropertyToStaging(
        propertyResult.propertyId,
        validatedConfig
      );
      result.activationId = activationResult.activationId;

      // Success!
      result.success = true;
      result.nextSteps!.push(
        `Property ${result.propertyId} created and activated to staging`,
        `Edge hostname: ${result.edgeHostname}`,
        `Test in staging: curl -H "Host: ${validatedConfig.hostname}" https://${result.edgeHostname}`,
        'Once validated, activate to production'
      );

      return result;
    } catch (error) {
      console.error('[PropertyOnboarding] Error:', error);
      result.errors!.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  private async validateConfig(config: OnboardingConfig): Promise<Required<OnboardingConfig>> {
    // Set defaults
    const validated = {
      ...config,
      network: config.network || 'ENHANCED_TLS',
      certificateType: config.certificateType || 'DEFAULT',
      notificationEmails: config.notificationEmails || [],
      skipDnsSetup: config.skipDnsSetup || false,
      customer: config.customer || 'default'
    };

    // Validate hostname format
    if (!this.isValidHostname(validated.hostname)) {
      throw new Error(`Invalid hostname format: ${validated.hostname}`);
    }

    // Prompt for origin hostname if not provided
    if (!validated.originHostname) {
      throw new Error('Origin hostname is required. Please provide originHostname in the configuration.');
    }

    return validated as Required<OnboardingConfig>;
  }

  private isValidHostname(hostname: string): boolean {
    const hostnameRegex = /^(?!-)(?:[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,}$/;
    return hostnameRegex.test(hostname);
  }

  private async performPreflightChecks(config: OnboardingConfig): Promise<{
    canProceed: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if property already exists
    try {
      const searchResult = await searchProperties(this.client, {
        propertyName: config.hostname,
        hostname: config.hostname,
        customer: config.customer
      });
      
      // Parse the response to check if property exists
      const responseText = searchResult.content[0].text;
      if (responseText.includes('Properties found') && !responseText.includes('No properties found')) {
        errors.push(`Property with hostname ${config.hostname} already exists`);
      }
    } catch (error) {
      // Search failed, but we can continue
      warnings.push('Could not verify if property already exists');
    }

    // Check if hostname is already in use
    try {
      const edgeHostnamesResult = await listEdgeHostnames(this.client, {
        customer: config.customer
      });
      
      const responseText = edgeHostnamesResult.content[0].text;
      if (responseText.includes(config.hostname)) {
        errors.push(`Hostname ${config.hostname} is already in use by another property`);
      }
    } catch (error) {
      warnings.push('Could not verify if hostname is already in use');
    }

    return {
      canProceed: errors.length === 0,
      errors,
      warnings
    };
  }

  private async selectGroupAndProduct(config: OnboardingConfig): Promise<{
    groupId: string;
    productId: string;
  }> {
    // Get groups
    const groupsResult = await listGroups(this.client, {
      searchTerm: 'default',
      customer: config.customer
    });

    // Default to first available group or allow user to specify
    let groupId = config.groupId || 'grp_99912'; // Default group ID
    
    // Get products for the contract
    const productsResult = await listProducts(this.client, {
      contractId: 'ctr_1-5C13O2', // Your main contract
      customer: config.customer
    });

    // Default to Ion Standard (Fresca) for HTTPS delivery
    const productId = config.productId || 'prd_Fresca';

    return { groupId, productId };
  }

  private async createPropertyWithRetry(config: Required<OnboardingConfig>): Promise<{
    success: boolean;
    propertyId?: string;
  }> {
    try {
      const result = await createProperty(this.client, {
        propertyName: config.hostname,
        productId: config.productId!,
        contractId: 'ctr_1-5C13O2', // Your main contract
        groupId: config.groupId!,
        customer: config.customer
      });

      // Extract property ID from response
      const responseText = result.content[0].text;
      const propertyIdMatch = responseText.match(/Property ID:\*\* (prp_\d+)/);
      
      if (propertyIdMatch) {
        return {
          success: true,
          propertyId: propertyIdMatch[1]
        };
      }

      return { success: false };
    } catch (error) {
      console.error('[PropertyOnboarding] Create property error:', error);
      return { success: false };
    }
  }

  private async createEdgeHostnameWithRetry(
    propertyId: string,
    config: Required<OnboardingConfig>
  ): Promise<{
    success: boolean;
    edgeHostname?: string;
  }> {
    try {
      const domainPrefix = config.hostname;
      const domainSuffix = 'edgekey.net'; // Using .edgekey.net as default
      
      const result = await createEdgeHostname(this.client, {
        propertyId,
        domainPrefix,
        domainSuffix,
        productId: config.productId!,
        secureNetwork: config.network,
        ipVersionBehavior: 'IPV4',
        customer: config.customer
      });

      const edgeHostname = `${domainPrefix}.${domainSuffix}`;
      return {
        success: true,
        edgeHostname
      };
    } catch (error) {
      console.error('[PropertyOnboarding] Create edge hostname error:', error);
      return { success: false };
    }
  }

  private async addHostnameToProperty(
    propertyId: string,
    hostname: string,
    edgeHostname: string
  ): Promise<void> {
    await addPropertyHostname(this.client, {
      propertyId,
      version: 1,
      hostnames: [{
        cnameFrom: hostname,
        cnameTo: edgeHostname,
        cnameType: 'EDGE_HOSTNAME',
        certStatus: {
          type: 'DEFAULT'
        }
      }],
      customer: 'default'
    });
  }

  private async configurePropertyRules(
    propertyId: string,
    config: Required<OnboardingConfig>
  ): Promise<void> {
    // Get current rules
    const currentRules = await getPropertyRules(this.client, {
      propertyId,
      version: 1,
      customer: config.customer
    });

    // Create HTTPS-only rule configuration
    const rules = {
      name: 'default',
      children: [
        {
          name: 'HTTPS Only',
          behaviors: [
            {
              name: 'redirectPlus',
              options: {
                enabled: true,
                destination: 'SAME_AS_REQUEST',
                responseCode: 301
              }
            }
          ],
          criteria: [
            {
              name: 'requestProtocol',
              options: {
                value: 'HTTP'
              }
            }
          ],
          criteriaMustSatisfy: 'all'
        }
      ],
      behaviors: [
        {
          name: 'origin',
          options: {
            originType: 'CUSTOMER',
            hostname: config.originHostname,
            forwardHostHeader: 'REQUEST_HOST_HEADER',
            httpsPort: 443,
            originSni: true,
            verificationMode: 'PLATFORM_SETTINGS',
            originCertsToHonor: 'STANDARD_CERTIFICATE_AUTHORITIES',
            standardCertificateAuthorities: ['akamai-permissive']
          }
        },
        {
          name: 'cpCode',
          options: {
            value: {
              id: 1234567, // This would need to be created/fetched
              name: config.hostname
            }
          }
        },
        {
          name: 'allowPost',
          options: {
            enabled: true,
            allowWithoutContentLength: false
          }
        },
        {
          name: 'caching',
          options: {
            behavior: 'MAX_AGE',
            ttl: '1d'
          }
        }
      ],
      options: {
        is_secure: true
      },
      criteria: [],
      criteriaMustSatisfy: 'all'
    };

    await updatePropertyRules(this.client, {
      propertyId,
      version: 1,
      rules,
      customer: config.customer
    });
  }

  private async handleDnsSetup(
    hostname: string,
    edgeHostname: string,
    config: Required<OnboardingConfig>
  ): Promise<{
    recordCreated: boolean;
    warnings?: string[];
    nextSteps?: string[];
  }> {
    const domain = this.extractDomain(hostname);
    const recordName = hostname.replace(`.${domain}`, '');
    
    try {
      // Check if zone exists in Edge DNS
      const zonesResult = await listZones(this.client, {
        search: domain,
        customer: config.customer
      });

      const responseText = zonesResult.content[0].text;
      const zoneExists = responseText.includes(domain) && !responseText.includes('No zones found');

      if (zoneExists) {
        // Zone exists, create CNAME record
        await upsertRecord(this.client, {
          zone: domain,
          name: recordName,
          type: 'CNAME',
          ttl: 300,
          rdata: [edgeHostname],
          customer: config.customer
        });

        // For Default DV cert, create ACME challenge records
        await this.createAcmeChallengeRecords(hostname, domain, config);

        return {
          recordCreated: true,
          warnings: ['CNAME and ACME challenge records created in Edge DNS']
        };
      } else {
        // Zone doesn't exist, provide guidance
        return {
          recordCreated: false,
          warnings: [`DNS zone ${domain} not found in Edge DNS`],
          nextSteps: await this.generateDnsGuidance(domain, hostname, edgeHostname, config)
        };
      }
    } catch (error) {
      console.error('[PropertyOnboarding] DNS setup error:', error);
      return {
        recordCreated: false,
        warnings: ['Failed to setup DNS automatically'],
        nextSteps: [`Manually create CNAME: ${hostname} → ${edgeHostname}`]
      };
    }
  }

  private async createAcmeChallengeRecords(
    hostname: string,
    domain: string,
    config: Required<OnboardingConfig>
  ): Promise<void> {
    // Default DV certificates use predictable ACME challenge records
    const acmeRecord = `_acme-challenge.${hostname.replace(`.${domain}`, '')}`;
    const acmeTarget = `${hostname}.acme-validate.edgekey.net`;

    try {
      await upsertRecord(this.client, {
        zone: domain,
        name: acmeRecord,
        type: 'CNAME',
        ttl: 300,
        rdata: [acmeTarget],
        customer: config.customer
      });
    } catch (error) {
      console.error('[PropertyOnboarding] ACME record creation error:', error);
    }
  }

  private async generateDnsGuidance(
    domain: string,
    hostname: string,
    edgeHostname: string,
    config: Required<OnboardingConfig>
  ): Promise<string[]> {
    const steps: string[] = [];
    
    steps.push(`DNS zone ${domain} is not in Akamai Edge DNS.`);
    steps.push('');
    steps.push('Option 1: Migrate DNS to Akamai Edge DNS');
    steps.push(`  - Create zone: mcp__alecs-full__create-zone --zone "${domain}" --type "PRIMARY" --contractId "ctr_1-5C13O2"`);
    
    if (config.dnsProvider) {
      const providerKey = config.dnsProvider.toLowerCase() as keyof typeof DNS_PROVIDER_GUIDES;
      const guide = DNS_PROVIDER_GUIDES[providerKey] || DNS_PROVIDER_GUIDES.other;
      
      steps.push('');
      steps.push(`Migration from ${guide.name}:`);
      steps.push(...guide.exportSteps.map(step => `  ${step}`));
    } else {
      steps.push('');
      steps.push('To provide specific migration steps, please specify your DNS provider:');
      steps.push('  - AWS Route53: dnsProvider: "aws"');
      steps.push('  - Cloudflare: dnsProvider: "cloudflare"');
      steps.push('  - Azure DNS: dnsProvider: "azure"');
      steps.push('  - Other: dnsProvider: "other"');
    }

    steps.push('');
    steps.push('Option 2: Keep DNS with current provider');
    steps.push(`  - Create CNAME: ${hostname} → ${edgeHostname}`);
    steps.push(`  - Create CNAME: _acme-challenge.${hostname} → ${hostname}.acme-validate.edgekey.net`);
    steps.push('  - TTL: 300 seconds recommended');

    return steps;
  }

  private async activatePropertyToStaging(
    propertyId: string,
    config: Required<OnboardingConfig>
  ): Promise<{
    success: boolean;
    activationId?: string;
  }> {
    try {
      const result = await activateProperty(this.client, {
        propertyId,
        version: 1,
        network: 'STAGING',
        note: `Initial staging activation for ${config.hostname}`,
        emails: config.notificationEmails,
        customer: config.customer
      });

      // Extract activation ID from response
      const responseText = result.content[0].text;
      const activationIdMatch = responseText.match(/Activation ID:\*\* (atv_\d+)/);

      return {
        success: true,
        activationId: activationIdMatch ? activationIdMatch[1] : undefined
      };
    } catch (error) {
      console.error('[PropertyOnboarding] Activation error:', error);
      return { success: false };
    }
  }

  private extractDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }
}

// Export function for easy tool integration
export async function onboardProperty(
  client: AkamaiClient,
  args: OnboardingConfig
): Promise<MCPToolResponse> {
  const agent = new PropertyOnboardingAgent(client);
  const result = await agent.execute(args);

  let responseText = '';
  
  if (result.success) {
    responseText = `# ✅ Property Onboarding Successful\n\n`;
    responseText += `**Property ID:** ${result.propertyId}\n`;
    responseText += `**Edge Hostname:** ${result.edgeHostname}\n`;
    if (result.activationId) {
      responseText += `**Activation ID:** ${result.activationId}\n`;
    }
    responseText += `\n## Next Steps\n\n`;
    result.nextSteps?.forEach(step => {
      responseText += `- ${step}\n`;
    });
  } else {
    responseText = `# ❌ Property Onboarding Failed\n\n`;
    if (result.errors && result.errors.length > 0) {
      responseText += `## Errors\n\n`;
      result.errors.forEach(error => {
        responseText += `- ${error}\n`;
      });
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    responseText += `\n## Warnings\n\n`;
    result.warnings.forEach(warning => {
      responseText += `- ${warning}\n`;
    });
  }

  return {
    content: [{
      type: 'text',
      text: responseText
    }]
  };
}