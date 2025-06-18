/**
 * Property Onboarding Agent
 * Automates the complete workflow for onboarding new properties to Akamai CDN
 * with HTTPS-only, Enhanced TLS, and Default DV certificates
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { listProperties, getProperty, createProperty, listGroups } from '../tools/property-tools';
import { searchProperties } from '../tools/property-manager-advanced-tools';
import {
  createEdgeHostname,
  addPropertyHostname,
  activateProperty,
  getActivationStatus,
  updatePropertyRules,
  getPropertyRules,
} from '../tools/property-manager-tools';
import { listEdgeHostnames } from '../tools/property-manager-advanced-tools';
import { listZones, createZone, upsertRecord, listRecords } from '../tools/dns-tools';
import { listProducts } from '../tools/product-tools';
import { createCPCode } from '../tools/cpcode-tools';
import { formatPropertyDisplay } from '@utils/formatting';

export interface OnboardingConfig {
  hostname: string;
  originHostname?: string;
  contractId?: string;
  groupId?: string;
  productId?: string;
  cpCodeId?: string;
  network?: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
  certificateType?: 'DEFAULT' | 'CPS_MANAGED';
  customer?: string;
  notificationEmails?: string[];
  skipDnsSetup?: boolean;
  dnsProvider?: string;
  useCase?: 'web-app' | 'api' | 'download' | 'streaming' | 'basic-web';
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
      "   - Create a new policy allowing Akamai's transfer IPs",
      '   - IPs: 23.73.134.141, 23.73.134.237, 72.246.199.141, 72.246.199.237',
      '6. Or export zone file: aws route53 list-resource-record-sets --hosted-zone-id ZONE_ID',
    ],
  },
  cloudflare: {
    name: 'Cloudflare',
    exportSteps: [
      '1. Log in to Cloudflare Dashboard',
      '2. Select your domain',
      '3. Go to DNS settings',
      '4. Click "Advanced" → "Export DNS records"',
      '5. Download the BIND format file',
      "6. Note: Cloudflare doesn't support AXFR transfers",
      "7. You'll need to manually import records to Akamai",
    ],
  },
  azure: {
    name: 'Azure DNS',
    exportSteps: [
      '1. Go to Azure Portal',
      '2. Navigate to DNS zones',
      '3. Select your zone',
      '4. Click "Export zone file" in the overview',
      '5. Or use Azure CLI: az network dns zone export -g ResourceGroup -n zonename -f zonefile.txt',
      '6. Import the zone file to Akamai Edge DNS',
    ],
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
      '   - Any special records (CAA, DKIM, etc.)',
    ],
  },
};

export class PropertyOnboardingAgent {
  constructor(private client: AkamaiClient) {}

  async execute(config: OnboardingConfig): Promise<OnboardingResult> {
    const result: OnboardingResult = {
      success: false,
      errors: [],
      warnings: [],
      nextSteps: [],
    };

    try {
      // Step 1: Validate and prepare configuration
      console.error('[PropertyOnboarding] Step 1: Validating configuration...');
      const validatedConfig = await this.validateConfig(config);

      // Step 2: Pre-flight checks
      console.error(
        `[PropertyOnboarding] Step 2: Pre-flight checks for ${validatedConfig.hostname}...`,
      );
      const preflightResult = await this.performPreflightChecks(validatedConfig);
      if (!preflightResult.canProceed) {
        result.errors = preflightResult.errors;
        return result;
      }

      // Step 3: Determine group and product if not provided
      console.error('[PropertyOnboarding] Step 3: Determining group and product...');
      if (!validatedConfig.groupId || !validatedConfig.productId) {
        const selection = await this.selectGroupAndProduct(validatedConfig);
        validatedConfig.groupId = selection.groupId;
        validatedConfig.productId = selection.productId;
      }

      // Step 4: Create CP Code
      console.error('[PropertyOnboarding] Step 4: Creating CP Code...');
      const cpCodeResult = await this.createCPCodeForProperty(validatedConfig);
      if (!cpCodeResult.success || !cpCodeResult.cpCodeId) {
        result.errors!.push('Failed to create CP Code');
        return result;
      }
      console.error(`[PropertyOnboarding] Created CP Code: ${cpCodeResult.cpCodeId}`);
      validatedConfig.cpCodeId = cpCodeResult.cpCodeId;

      // Step 5: Create property
      console.error('[PropertyOnboarding] Step 5: Creating property...');
      const propertyResult = await this.createPropertyWithRetry(validatedConfig);
      if (!propertyResult.success || !propertyResult.propertyId) {
        result.errors!.push('Failed to create property');
        return result;
      }
      result.propertyId = propertyResult.propertyId;
      console.error(`[PropertyOnboarding] Created property: ${result.propertyId}`);

      // Step 6: Create edge hostname
      console.error('[PropertyOnboarding] Step 6: Creating edge hostname...');
      const edgeHostnameResult = await this.createEdgeHostnameWithRetry(
        propertyResult.propertyId,
        validatedConfig,
      );
      if (!edgeHostnameResult.success) {
        result.errors!.push('Failed to create edge hostname');
        result.warnings!.push('Property created but edge hostname creation failed');
        return result;
      }
      result.edgeHostname = edgeHostnameResult.edgeHostname;

      // Step 7: Add hostname to property
      console.error('[PropertyOnboarding] Step 7: Adding hostname to property...');
      await this.addHostnameToProperty(
        propertyResult.propertyId,
        validatedConfig.hostname,
        edgeHostnameResult.edgeHostname!,
      );

      // Step 8: Configure property rules with CP Code
      console.error('[PropertyOnboarding] Step 8: Configuring property rules...');
      await this.configurePropertyRules(propertyResult.propertyId, validatedConfig);

      // Step 9: Handle DNS setup
      console.error('[PropertyOnboarding] Step 9: Handling DNS setup...');
      if (!validatedConfig.skipDnsSetup) {
        const dnsResult = await this.handleDnsSetup(
          validatedConfig.hostname,
          edgeHostnameResult.edgeHostname!,
          validatedConfig,
        );
        result.dnsRecordCreated = dnsResult.recordCreated;
        if (dnsResult.warnings) {
          result.warnings!.push(...dnsResult.warnings);
        }
        if (dnsResult.nextSteps) {
          result.nextSteps!.push(...dnsResult.nextSteps);
        }
      }

      // Step 10: Activate to staging only (production takes 10-60 minutes)
      console.error('[PropertyOnboarding] Step 10: Activating to staging network...');
      const activationResult = await this.activatePropertyToStaging(
        propertyResult.propertyId,
        validatedConfig,
      );
      result.activationId = activationResult.activationId;

      // Success!
      result.success = true;
      result.nextSteps!.push(
        `✅ Property ${result.propertyId} created and activated to STAGING`,
        `🌐 Edge hostname: ${result.edgeHostname}`,
        `🧪 Test in staging: curl -H "Host: ${validatedConfig.hostname}" https://${result.edgeHostname}`,
        '',
        '⏳ Production activation:',
        '   - New hostnames take 10-60 minutes to propagate',
        '   - Test thoroughly in staging first',
        '   - Use property.activate tool to push to production when ready',
        `   - Command: property.activate --propertyId "${result.propertyId}" --version 1 --network "PRODUCTION" --note "Production activation after staging validation"`,
      );

      return result;
    } catch (error) {
      console.error('[PropertyOnboarding] Error:', error);
      result.errors!.push(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      customer: config.customer || 'default',
    };

    // Validate hostname format
    if (!this.isValidHostname(validated.hostname)) {
      throw new Error(`Invalid hostname format: ${validated.hostname}`);
    }

    // Prompt for origin hostname if not provided
    if (!validated.originHostname) {
      throw new Error(
        'Origin hostname is required. Please provide originHostname in the configuration.',
      );
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
        customer: config.customer,
      });

      // Parse the response to check if property exists
      const responseText = searchResult.content[0].text;
      if (
        responseText.includes('Properties found') &&
        !responseText.includes('No properties found')
      ) {
        errors.push(`Property with hostname ${config.hostname} already exists`);
      }
    } catch (error) {
      // Search failed, but we can continue
      warnings.push('Could not verify if property already exists');
    }

    // Check if hostname is already in use
    try {
      const edgeHostnamesResult = await listEdgeHostnames(this.client, {
        customer: config.customer,
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
      warnings,
    };
  }

  private async selectGroupAndProduct(config: OnboardingConfig): Promise<{
    groupId: string;
    productId: string;
  }> {
    // Get groups
    const groupsResult = await listGroups(this.client, {
      searchTerm: 'default',
    });

    // Use provided group ID or prompt user to specify
    const groupId = config.groupId;
    if (!groupId) {
      throw new Error('Group ID is required. Use "List groups" to find available groups.');
    }

    // Get products for the contract
    const contractId = config.contractId || 'ctr_1-5C13O2'; // Default contract
    const productsResult = await listProducts(this.client, {
      contractId: contractId,
      customer: config.customer,
    });

    // Select product based on use case
    let productId = config.productId;
    if (!productId) {
      // Check if Ion Standard (prd_Fresca) is available
      const responseText = productsResult.content[0].text;
      const hasIonStandard =
        responseText.includes('prd_Fresca') || responseText.includes('Ion Standard');

      // Auto-detect use case based on hostname if not specified
      let useCase = config.useCase;
      if (!useCase) {
        if (config.hostname.startsWith('api.') || config.hostname.startsWith('www.')) {
          useCase = 'web-app'; // Default to web-app for api. and www. prefixes
        }
      }

      switch (useCase) {
        case 'web-app':
        case 'api':
          productId = hasIonStandard ? 'prd_Fresca' : 'prd_SPM'; // Ion Standard or Standard TLS
          break;
        case 'download':
          productId = 'prd_Download_Delivery'; // Download Delivery
          break;
        case 'streaming':
          productId = 'prd_Adaptive_Media_Delivery'; // Adaptive Media Delivery
          break;
        case 'basic-web':
        default:
          productId = 'prd_SPM'; // Ion Premier
          break;
      }

      console.error(
        `[PropertyOnboarding] Selected product: ${productId} for use case: ${useCase || 'default'}`,
      );
    }

    return { groupId, productId };
  }

  private async createCPCodeForProperty(config: Required<OnboardingConfig>): Promise<{
    success: boolean;
    cpCodeId?: string;
  }> {
    try {
      // Generate CP Code name based on hostname or property name
      const cpCodeName = config.hostname.replace(/\./g, '-');

      console.error(`[PropertyOnboarding] Creating CP Code with name: ${cpCodeName}`);

      const result = await createCPCode(this.client, {
        productId: config.productId,
        contractId: config.contractId || 'ctr_1-5C13O2',
        groupId: config.groupId,
        cpcodeName: cpCodeName,
      });

      // Extract CP Code ID from response
      const responseText = result.content[0].text;
      // Look for patterns like "CP Code ID: 1234567" or "CP Code: cpc_1234567"
      const cpCodeMatch = responseText.match(/(?:CP Code ID:|CP Code:)\s*(?:cpc_)?(\d+)/i);

      if (cpCodeMatch) {
        const cpCodeId = cpCodeMatch[1];
        return {
          success: true,
          cpCodeId: cpCodeId, // Just the numeric part
        };
      }

      console.error('[PropertyOnboarding] Could not extract CP Code ID from response');
      return { success: false };
    } catch (error) {
      console.error('[PropertyOnboarding] Create CP Code error:', error);
      return { success: false };
    }
  }

  private async createPropertyWithRetry(config: Required<OnboardingConfig>): Promise<{
    success: boolean;
    propertyId?: string;
  }> {
    try {
      const result = await createProperty(this.client, {
        propertyName: config.hostname,
        productId: config.productId,
        contractId: config.contractId || 'ctr_1-5C13O2',
        groupId: config.groupId,
      });

      // Extract property ID from response
      const responseText = result.content[0].text;
      const propertyIdMatch = responseText.match(/Property ID:\*\* (prp_\d+)/);

      if (propertyIdMatch) {
        return {
          success: true,
          propertyId: propertyIdMatch[1],
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
    config: Required<OnboardingConfig>,
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
        productId: config.productId,
        secure: true, // Always secure for ENHANCED_TLS
        ipVersion: 'IPV4',
      });

      const edgeHostname = `${domainPrefix}.${domainSuffix}`;
      return {
        success: true,
        edgeHostname,
      };
    } catch (error) {
      console.error('[PropertyOnboarding] Create edge hostname error:', error);
      return { success: false };
    }
  }

  private async addHostnameToProperty(
    propertyId: string,
    hostname: string,
    edgeHostname: string,
  ): Promise<void> {
    await addPropertyHostname(this.client, {
      propertyId,
      version: 1,
      hostname: hostname,
      edgeHostname: edgeHostname,
    });
  }

  private async configurePropertyRules(
    propertyId: string,
    config: Required<OnboardingConfig>,
  ): Promise<void> {
    // Use the Ion Standard template provided by the user
    const rules = this.getIonStandardTemplate(config);

    await updatePropertyRules(this.client, {
      propertyId,
      version: 1,
      rules,
    });
  }

  private getIonStandardTemplate(config: Required<OnboardingConfig>): any {
    // Based on the user-provided Ion Standard template
    const template = {
      name: 'default',
      children: [
        {
          name: 'Augment insights',
          children: [
            {
              name: 'Traffic reporting',
              children: [],
              behaviors: [
                {
                  name: 'cpCode',
                  options: {
                    value: {
                      id: parseInt(config.cpCodeId),
                      name: config.hostname.replace(/\./g, '-'),
                    },
                  },
                },
              ],
              criteria: [],
              criteriaMustSatisfy: 'all',
              comments:
                'Identify your main traffic segments so you can granularly zoom in your traffic statistics like hits, bandwidth, offload, response codes, and errors.',
            },
            {
              name: 'mPulse RUM',
              children: [],
              behaviors: [
                {
                  name: 'mPulse',
                  options: {
                    apiKey: '',
                    bufferSize: '',
                    configOverride: '',
                    enabled: false, // Disabled by default
                    loaderVersion: 'V12',
                    requirePci: false,
                    titleOptional: '',
                  },
                },
              ],
              criteria: [],
              criteriaMustSatisfy: 'all',
            },
            {
              name: 'Geolocation',
              children: [],
              behaviors: [
                {
                  name: 'edgeScape',
                  options: {
                    enabled: false,
                  },
                },
              ],
              criteria: [
                {
                  name: 'requestType',
                  options: {
                    matchOperator: 'IS',
                    value: 'CLIENT_REQ',
                  },
                },
              ],
              criteriaMustSatisfy: 'all',
            },
            {
              name: 'Log delivery',
              children: [],
              behaviors: [
                {
                  name: 'report',
                  options: {
                    logAcceptLanguage: false,
                    logCookies: 'OFF',
                    logCustomLogField: false,
                    logEdgeIP: false,
                    logHost: false,
                    logReferer: false,
                    logUserAgent: false,
                    logXForwardedFor: false,
                  },
                },
              ],
              criteria: [],
              criteriaMustSatisfy: 'all',
            },
          ],
          behaviors: [],
          criteria: [],
          criteriaMustSatisfy: 'all',
        },
        // Add HTTPS redirect as first rule in Strengthen security
        {
          name: 'Strengthen security',
          children: [
            {
              name: 'HTTPS Redirect',
              behaviors: [
                {
                  name: 'redirectPlus',
                  options: {
                    enabled: true,
                    destination: 'SAME_AS_REQUEST',
                    responseCode: 301,
                  },
                },
              ],
              criteria: [
                {
                  name: 'requestProtocol',
                  options: {
                    value: 'HTTP',
                  },
                },
              ],
              criteriaMustSatisfy: 'all',
              comments: 'Redirect all HTTP traffic to HTTPS',
            },
          ],
          behaviors: [],
          criteria: [],
          criteriaMustSatisfy: 'all',
        },
      ],
      behaviors: [
        {
          name: 'origin',
          options: {
            cacheKeyHostname: 'REQUEST_HOST_HEADER',
            compress: true,
            enableTrueClientIp: true,
            forwardHostHeader: 'REQUEST_HOST_HEADER',
            httpPort: 80,
            httpsPort: 443,
            minTlsVersion: 'DYNAMIC',
            originCertificate: '',
            originSni: true,
            originType: 'CUSTOMER',
            ports: '',
            tlsVersionTitle: '',
            trueClientIpClientSetting: false,
            trueClientIpHeader: 'True-Client-IP',
            verificationMode: 'PLATFORM_SETTINGS',
            ipVersion: 'IPV4',
            hostname: config.originHostname,
          },
        },
        {
          name: 'enhancedDebug',
          options: {
            enableDebug: false,
          },
        },
      ],
      options: {
        is_secure: true,
      },
      variables: [],
      criteria: [],
      criteriaMustSatisfy: 'all',
      comments:
        'Ion Standard template optimized for web applications and API delivery with Enhanced TLS',
    };

    return template;
  }

  private async handleDnsSetup(
    hostname: string,
    edgeHostname: string,
    config: Required<OnboardingConfig>,
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
        });

        // For Default DV cert, create ACME challenge records
        await this.createAcmeChallengeRecords(hostname, domain, config);

        return {
          recordCreated: true,
          warnings: ['CNAME and ACME challenge records created in Edge DNS'],
        };
      } else {
        // Zone doesn't exist, provide guidance
        return {
          recordCreated: false,
          warnings: [`DNS zone ${domain} not found in Edge DNS`],
          nextSteps: await this.generateDnsGuidance(domain, hostname, edgeHostname, config),
        };
      }
    } catch (error) {
      console.error('[PropertyOnboarding] DNS setup error:', error);
      return {
        recordCreated: false,
        warnings: ['Failed to setup DNS automatically'],
        nextSteps: [`Manually create CNAME: ${hostname} → ${edgeHostname}`],
      };
    }
  }

  private async createAcmeChallengeRecords(
    hostname: string,
    domain: string,
    config: Required<OnboardingConfig>,
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
      });
    } catch (error) {
      console.error('[PropertyOnboarding] ACME record creation error:', error);
    }
  }

  private async generateDnsGuidance(
    domain: string,
    hostname: string,
    edgeHostname: string,
    config: Required<OnboardingConfig>,
  ): Promise<string[]> {
    const steps: string[] = [];

    steps.push(`DNS zone ${domain} is not in Akamai Edge DNS.`);
    steps.push('');
    steps.push('Option 1: Migrate DNS to Akamai Edge DNS');
    steps.push(
      `  - Create zone: dns.zone.create --zone "${domain}" --type "PRIMARY" --contractId "[YOUR-CONTRACT-ID]"`,
    );

    if (config.dnsProvider) {
      const providerKey = config.dnsProvider.toLowerCase() as keyof typeof DNS_PROVIDER_GUIDES;
      const guide = DNS_PROVIDER_GUIDES[providerKey] || DNS_PROVIDER_GUIDES.other;

      steps.push('');
      steps.push(`Migration from ${guide.name}:`);
      steps.push(...guide.exportSteps.map((step) => `  ${step}`));
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
    steps.push(
      `  - Create CNAME: _acme-challenge.${hostname} → ${hostname}.acme-validate.edgekey.net`,
    );
    steps.push('  - TTL: 300 seconds recommended');

    return steps;
  }

  private async activatePropertyToStaging(
    propertyId: string,
    config: Required<OnboardingConfig>,
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
        notifyEmails: config.notificationEmails,
      });

      // Extract activation ID from response
      const responseText = result.content[0].text;
      const activationIdMatch = responseText.match(/Activation ID:\*\* (atv_\d+)/);

      return {
        success: true,
        activationId: activationIdMatch ? activationIdMatch[1] : undefined,
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
  args: OnboardingConfig,
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
    result.nextSteps?.forEach((step) => {
      responseText += `- ${step}\n`;
    });
  } else {
    responseText = `# ❌ Property Onboarding Failed\n\n`;
    if (result.errors && result.errors.length > 0) {
      responseText += `## Errors\n\n`;
      result.errors.forEach((error) => {
        responseText += `- ${error}\n`;
      });
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    responseText += `\n## Warnings\n\n`;
    result.warnings.forEach((warning) => {
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
}
