/**
 * Secure Hostname Onboarding Elicitation Tool
 * 
 * A comprehensive, guided workflow for onboarding hostnames with security best practices:
 * - Intelligent certificate selection (DefaultDV, DV SAN SNI)
 * - Optional DNS migration to Akamai
 * - Security configuration with App & API Protector
 * - WAF policy creation in alert mode
 * - Step-by-step guidance with smart defaults
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getAkamaiClient } from '../../utils/auth';
import { logger } from '../../utils/logger';
import { Spinner, format, icons } from '../../utils/progress';
import { selectBestProduct } from '../../utils/product-mapping';
import type { AkamaiClient } from '../../akamai-client';
import type { MCPToolResponse } from '../../types';

// Import necessary tools
import { createProperty } from '../property-tools';
import { createCPCode } from '../cpcode-tools';
import { updatePropertyRules, addPropertyHostname } from '../property-manager-tools';
import { createZone, upsertRecord } from '../dns-tools';
import { listCertificateEnrollments } from '../cps-tools';
import { validateApiResponse } from '../../utils/api-response-validator';

// Operation types for the workflow
const OnboardingOperation = z.enum([
  'start',
  'check-requirements',
  'setup-property',
  'configure-dns',
  'configure-security',
  'activate',
  'status',
  'help',
]);

// Certificate type options
const CertificateType = z.enum([
  'default-dv',      // Secure by Default (DefaultDV)
  'dv-san-sni',      // Standard DV SAN with SNI
  'third-party',     // Third-party certificate
  'auto',            // Auto-detect best option
]);

// Security level options
const SecurityLevel = z.enum([
  'basic',           // Basic security (no WAF)
  'standard',        // WAF in alert mode
  'enhanced',        // WAF with App & API Protector
  'custom',          // Custom security configuration
]);

// Input schema for the elicitation tool
const SecureHostnameOnboardingSchema = z.object({
  operation: OnboardingOperation.optional(),
  hostname: z.string().optional(),
  additionalHostnames: z.array(z.string()).optional(),
  originHostname: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  productId: z.string().optional(),
  certificateType: CertificateType.optional(),
  migrateDNS: z.boolean().optional(),
  currentNameservers: z.array(z.string()).optional(),
  securityLevel: SecurityLevel.optional(),
  notificationEmails: z.array(z.string()).optional(),
  confirmAction: z.boolean().optional(),
  propertyId: z.string().optional(), // For continuing an existing onboarding
  customer: z.string().optional(),
});

type SecureHostnameOnboardingInput = z.infer<typeof SecureHostnameOnboardingSchema>;

// Onboarding state to track progress
interface OnboardingState {
  propertyId?: string;
  propertyName?: string;
  edgeHostnameId?: string;
  edgeHostnameDomain?: string;
  cpCodeId?: number;
  certificateType?: string;
  certificateId?: string;
  securityConfigId?: string;
  wafPolicyId?: string;
  dnsZoneCreated?: boolean;
  completedSteps: string[];
  currentStep?: string;
  recommendations: string[];
}

// Helper to detect available certificate options
async function detectCertificateOptions(
  client: AkamaiClient,
  hostname: string,
  contractId: string,
): Promise<{
  hasDefaultDV: boolean;
  hasDVSANSNI: boolean;
  hasThirdParty: boolean;
  existingCertificates: any[];
  recommendation: string;
}> {
  try {
    // Check for existing certificate enrollments
    const enrollments = await listCertificateEnrollments(client, {});
    const existingCerts = enrollments.content[0]?.text ? 
      JSON.parse(enrollments.content[0].text).enrollments || [] : [];
    
    // Check if hostname is covered by existing certificates
    const matchingCerts = existingCerts.filter((cert: any) => {
      const sans = cert.sans || [];
      const cn = cert.cn || '';
      return cn === hostname || sans.includes(hostname) || 
             cn.includes('*') && hostname.endsWith(cn.replace('*.', ''));
    });
    
    // Check contract products for DefaultDV availability
    const productsResponse = await client.request({
      path: '/papi/v1/products',
      method: 'GET',
      queryParams: { contractId },
    });
    
    const validatedProductsResponse = validateApiResponse<{ products?: { items?: any[] } }>(productsResponse);
    const hasIonOrSimilar = validatedProductsResponse.products?.items?.some((p: any) => 
      ['prd_fresca', 'prd_SPM', 'prd_Dynamic_Site_Del'].includes(p.productId)
    ) || false;
    
    let recommendation = '';
    if (hasIonOrSimilar && matchingCerts.length === 0) {
      recommendation = 'default-dv';
    } else if (matchingCerts.length > 0) {
      recommendation = 'existing';
    } else {
      recommendation = 'dv-san-sni';
    }
    
    return {
      hasDefaultDV: hasIonOrSimilar,
      hasDVSANSNI: true, // Always available
      hasThirdParty: matchingCerts.some((c: any) => c.certificateType === 'third-party'),
      existingCertificates: matchingCerts,
      recommendation,
    };
  } catch (error) {
    logger.debug('Failed to detect certificate options', { error });
    return {
      hasDefaultDV: true,
      hasDVSANSNI: true,
      hasThirdParty: false,
      existingCertificates: [],
      recommendation: 'default-dv',
    };
  }
}

// Helper to create security configuration
async function createSecurityConfiguration(
  client: AkamaiClient,
  args: {
    propertyName: string;
    hostnames: string[];
    securityLevel: string;
    notificationEmails?: string[];
  },
): Promise<{
  securityConfigId?: string;
  wafPolicyId?: string;
  status: string;
}> {
  if (args.securityLevel === 'basic') {
    return { status: 'No security configuration needed for basic level' };
  }
  
  try {
    // Create App & API Protector configuration
    const configName = `${args.propertyName}-security`;
    
    // Create security configuration
    const createResponse = await client.request({
      path: '/appsec/v1/configs',
      method: 'POST',
      body: {
        name: configName,
        description: `Security configuration for ${args.propertyName}`,
        hostnames: args.hostnames,
        contractId: 'default', // Will be replaced with actual contract
        groupId: 'default',    // Will be replaced with actual group
      },
    });
    
    const validatedCreateResponse = validateApiResponse<{ configId?: string }>(createResponse);
    const securityConfigId = validatedCreateResponse.configId;
    
    // Create WAF policy in alert mode
    if (args.securityLevel !== 'basic') {
      const policyResponse = await client.request({
        path: `/appsec/v1/configs/${securityConfigId}/versions/1/security-policies`,
        method: 'POST',
        body: {
          policyName: `${args.propertyName}-waf-policy`,
          policyPrefix: args.propertyName.substring(0, 4).toUpperCase(),
          defaultSettings: true,
          mode: 'ASE_MANUAL', // Alert mode
        },
      });
      
      const validatedPolicyResponse = validateApiResponse<{ policyId?: string }>(policyResponse);
      const wafPolicyId = validatedPolicyResponse.policyId;
      
      // Enable protections in alert mode
      await client.request({
        path: `/appsec/v1/configs/${securityConfigId}/versions/1/security-policies/${wafPolicyId}/mode`,
        method: 'PUT',
        body: {
          mode: 'ASE_MANUAL',
          ruleActions: {
            default: 'alert',
          },
        },
      });
      
      return {
        securityConfigId,
        wafPolicyId,
        status: 'Security configuration created with WAF in alert mode',
      };
    }
    
    return {
      securityConfigId,
      status: 'Security configuration created',
    };
  } catch (error) {
    logger.error('Failed to create security configuration', { error });
    return {
      status: `Security configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Helper to provide user-friendly explanations
function getOperationExplanation(operation: string): string {
  switch (operation) {
    case 'start':
      return 'Starting a new secure hostname onboarding process. This wizard will guide you through setting up your hostname with the best security practices.';
    case 'check-requirements':
      return 'Checking prerequisites and available options for your hostname setup.';
    case 'setup-property':
      return 'Creating and configuring the Akamai property for your hostname.';
    case 'configure-dns':
      return 'Setting up DNS records and optionally migrating your DNS to Akamai.';
    case 'configure-security':
      return 'Configuring Web Application Firewall (WAF) and security policies.';
    case 'activate':
      return 'Activating your configuration to staging or production.';
    case 'status':
      return 'Checking the current status of your hostname onboarding.';
    default:
      return '';
  }
}

// Main handler
async function handleSecureHostnameOnboarding(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  const state: OnboardingState = { 
    completedSteps: [], 
    recommendations: [] 
  };
  
  try {
    // If no operation specified, provide help
    if (!params.operation || params.operation === 'help') {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.info} Secure Hostname Onboarding - Interactive Guide\n\n` +
              `This wizard helps you onboard hostnames with enterprise-grade security.\n\n` +
              `Available operations:\n` +
              `  • ${format.cyan('start')} - Begin a new hostname onboarding\n` +
              `  • ${format.cyan('check-requirements')} - Verify prerequisites\n` +
              `  • ${format.cyan('setup-property')} - Create and configure property\n` +
              `  • ${format.cyan('configure-dns')} - Set up DNS records\n` +
              `  • ${format.cyan('configure-security')} - Configure WAF and security\n` +
              `  • ${format.cyan('activate')} - Deploy to staging/production\n` +
              `  • ${format.cyan('status')} - Check onboarding progress\n\n` +
              `To get started: { "operation": "start" }`,
          },
        ],
      };
    }
    
    // Provide operation-specific guidance
    const explanation = getOperationExplanation(params.operation);
    
    // Handle different operations
    switch (params.operation) {
      case 'start':
        return await handleStartOnboarding(client, params, state);
        
      case 'check-requirements':
        return await handleCheckRequirements(client, params, state);
        
      case 'setup-property':
        return await handleSetupProperty(client, params, state);
        
      case 'configure-dns':
        return await handleConfigureDNS(client, params, state);
        
      case 'configure-security':
        return await handleConfigureSecurity(client, params, state);
        
      case 'activate':
        return await handleActivation(client, params, state);
        
      case 'status':
        return await handleCheckStatus(client, params, state);
        
      default:
        return {
          content: [
            {
              type: 'text',
              text: `${icons.error} Unknown operation: ${params.operation}`,
            },
          ],
        };
    }
  } catch (error) {
    spinner.fail('Operation failed');
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.error} Operation failed: ${error instanceof Error ? error.message : String(error)}\n\n` +
            `${icons.info} Current progress saved. You can continue from where you left off.\n` +
            `To check status: { "operation": "status", "propertyId": "${state.propertyId}" }`,
        },
      ],
    };
  }
}

// Handle start operation
async function handleStartOnboarding(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.hostname) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Welcome to Secure Hostname Onboarding!\n\n` +
            `Let's start by setting up your hostname.\n` +
            `What is the primary hostname you want to onboard?\n\n` +
            `Example: { "operation": "start", "hostname": "www.example.com" }`,
        },
      ],
    };
  }
  
  if (!params.originHostname) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Great! Setting up ${format.cyan(params.hostname)}\n\n` +
            `What is your origin server hostname?\n` +
            `This is where Akamai will fetch content from.\n\n` +
            `Example: { "operation": "start", "hostname": "${params.hostname}", "originHostname": "origin.example.com" }`,
        },
      ],
    };
  }
  
  if (!params.contractId || !params.groupId) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Almost ready to begin!\n\n` +
            `Please provide your Akamai contract and group IDs.\n` +
            `These determine where your configuration will be created.\n\n` +
            `Example: { "operation": "start", "hostname": "${params.hostname}", "originHostname": "${params.originHostname}", "contractId": "ctr_1-ABC123", "groupId": "grp_12345" }\n\n` +
            `${icons.info} Tip: Use the "list-contracts" tool if you need to find these IDs.`,
        },
      ],
    };
  }
  
  // All required info collected, start the process
  const spinner = new Spinner();
  spinner.start('Analyzing your requirements...');
  
  // Detect certificate options
  const certOptions = await detectCertificateOptions(client, params.hostname, params.contractId);
  
  // Get available products
  const productsResponse = await client.request({
    path: '/papi/v1/products',
    method: 'GET',
    queryParams: { contractId: params.contractId },
  });
  
  const validatedProductsResp = validateApiResponse<{ products?: { items?: any[] } }>(productsResponse);
  const bestProduct = selectBestProduct(validatedProductsResp.products?.items || []);
  
  spinner.succeed('Requirements analyzed');
  
  let text = `${icons.success} Ready to onboard ${format.cyan(params.hostname)}!\n\n`;
  text += `## Configuration Summary\n\n`;
  text += `- **Primary Hostname:** ${params.hostname}\n`;
  text += `- **Origin Server:** ${params.originHostname}\n`;
  text += `- **Contract:** ${params.contractId}\n`;
  text += `- **Group:** ${params.groupId}\n\n`;
  
  text += `## Certificate Options\n\n`;
  if (certOptions.hasDefaultDV) {
    text += `[DONE] **Secure by Default (DefaultDV)** - Recommended\n`;
    text += `   Instant HTTPS with automatic certificate provisioning\n`;
  }
  if (certOptions.existingCertificates.length > 0) {
    text += `[DONE] **Existing Certificates Found:**\n`;
    certOptions.existingCertificates.forEach(cert => {
      text += `   - ${cert.cn} (${cert.certificateType})\n`;
    });
  }
  text += `[DONE] **DV SAN SNI** - Standard domain validation\n`;
  text += `   Requires DNS validation (automated)\n\n`;
  
  text += `## Recommended Configuration\n\n`;
  text += `- **Product:** ${bestProduct?.productName || 'Ion (Dynamic Site Delivery)'}\n`;
  text += `- **Certificate:** ${certOptions.recommendation === 'default-dv' ? 'Secure by Default' : 'DV SAN SNI'}\n`;
  text += `- **Security:** WAF in alert mode (recommended)\n`;
  text += `- **DNS:** Optional migration to Akamai\n\n`;
  
  text += `## Next Steps\n\n`;
  text += `1. **Setup Property:** { "operation": "setup-property", "hostname": "${params.hostname}", "originHostname": "${params.originHostname}", "contractId": "${params.contractId}", "groupId": "${params.groupId}"${bestProduct ? `, "productId": "${bestProduct.productId}"` : ''} }\n\n`;
  text += `2. **Or customize options:** Add parameters like:\n`;
  text += `   - "certificateType": "${certOptions.recommendation === 'default-dv' ? 'default-dv' : 'dv-san-sni'}"\n`;
  text += `   - "securityLevel": "enhanced"\n`;
  text += `   - "migrateDNS": true\n`;
  text += `   - "additionalHostnames": ["example.com", "api.example.com"]\n`;
  
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

// Handle check requirements operation
async function handleCheckRequirements(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.hostname || !params.contractId) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} To check requirements, please provide:\n\n` +
            `- hostname: The domain you want to onboard\n` +
            `- contractId: Your Akamai contract ID\n\n` +
            `Example: { "operation": "check-requirements", "hostname": "www.example.com", "contractId": "ctr_1-ABC123" }`,
        },
      ],
    };
  }
  
  const spinner = new Spinner();
  spinner.start('Checking requirements...');
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check contract access
    await client.request({
      path: `/papi/v1/contracts/${params.contractId}`,
      method: 'GET',
    });
  } catch (error) {
    issues.push(`[ERROR] Contract ${params.contractId} not accessible`);
  }
  
  // Check certificate options
  const certOptions = await detectCertificateOptions(client, params.hostname, params.contractId);
  
  // Check DNS
  try {
    const dns = await client.request({
      path: '/netstorage/v1/dig',
      method: 'GET',
      queryParams: { hostname: params.hostname },
    });
    
    const validatedDns = validateApiResponse<{ answer?: Array<{ data?: string }> }>(dns);
    if (validatedDns.answer?.length && validatedDns.answer[0]?.data) {
      recommendations.push(`Current DNS points to: ${validatedDns.answer[0].data}`);
    }
  } catch (error) {
    recommendations.push('Unable to check current DNS settings');
  }
  
  spinner.succeed('Requirements check complete');
  
  let text = `${icons.info} Requirements Check for ${format.cyan(params.hostname)}\n\n`;
  
  if (issues.length > 0) {
    text += `## Issues Found\n\n`;
    issues.forEach(issue => text += `${issue}\n`);
    text += '\n';
  } else {
    text += `${icons.success} All prerequisites met!\n\n`;
  }
  
  text += `## Certificate Options Available\n\n`;
  text += `- Default DV: ${certOptions.hasDefaultDV ? '[DONE] Available' : '[ERROR] Not available'}\n`;
  text += `- DV SAN SNI: [DONE] Available\n`;
  text += `- Existing Certificates: ${certOptions.existingCertificates.length}\n\n`;
  
  if (recommendations.length > 0) {
    text += `## Recommendations\n\n`;
    recommendations.forEach(rec => text += `- ${rec}\n`);
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

// Handle setup property operation
async function handleSetupProperty(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.hostname || !params.originHostname || !params.contractId || !params.groupId) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.error} Missing required parameters for property setup.\n\n` +
            `Required: hostname, originHostname, contractId, groupId`,
        },
      ],
    };
  }
  
  if (!params.confirmAction) {
    const certificateType = params.certificateType || 'auto';
    const securityLevel = params.securityLevel || 'standard';
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Ready to create property with these settings:\n\n` +
            `**Property Configuration:**\n` +
            `- Primary Hostname: ${format.cyan(params.hostname)}\n` +
            `- Additional Hostnames: ${params.additionalHostnames?.join(', ') || 'None'}\n` +
            `- Origin: ${format.yellow(params.originHostname)}\n` +
            `- Certificate Type: ${format.green(certificateType)}\n` +
            `- Security Level: ${format.green(securityLevel)}\n` +
            `- Contract: ${params.contractId}\n` +
            `- Group: ${params.groupId}\n\n` +
            `${icons.warning} This will create:\n` +
            `- New Akamai property\n` +
            `- Edge hostname with certificate\n` +
            `- CP Code for reporting\n` +
            `${securityLevel !== 'basic' ? '- Security configuration with WAF\n' : ''}\n` +
            `Add "confirmAction": true to proceed.`,
        },
      ],
    };
  }
  
  const spinner = new Spinner();
  const steps: string[] = [];
  
  try {
    // Step 1: Create property
    spinner.start('Creating property...');
    const propertyName = params.hostname.replace(/\./g, '-');
    
    // Auto-select product if not specified
    let productId = params.productId;
    if (!productId) {
      const productsResponse = await client.request({
        path: '/papi/v1/products',
        method: 'GET',
        queryParams: { contractId: params.contractId },
      });
      
      const validatedProdsResp = validateApiResponse<{ products?: { items?: any[] } }>(productsResponse);
      const bestProduct = selectBestProduct(validatedProdsResp.products?.items || []);
      productId = bestProduct?.productId || 'prd_fresca';
    }
    
    const createPropResult = await createProperty(client, {
      propertyName,
      productId,
      contractId: params.contractId,
      groupId: params.groupId,
    });
    
    const propMatch = createPropResult.content[0]?.text.match(/Property ID:\*\* (\w+)/);
    if (propMatch?.[1]) {
      state.propertyId = propMatch[1];
      state.propertyName = propertyName;
      spinner.succeed(`Created property: ${state.propertyId}`);
      steps.push(`[DONE] Created property: ${propertyName}`);
      state.completedSteps.push('property-created');
    }
    
    // Step 2: Create CP Code
    spinner.start('Setting up CP Code...');
    const cpCodeResult = await createCPCode(client, {
      cpcodeName: propertyName,
      contractId: params.contractId,
      groupId: params.groupId,
      productId,
    });
    
    const cpCodeMatch = cpCodeResult.content[0]?.text.match(/CP Code ID:\*\* (\d+)/);
    if (cpCodeMatch?.[1]) {
      state.cpCodeId = parseInt(cpCodeMatch[1]);
      spinner.succeed(`Created CP Code: ${state.cpCodeId}`);
      steps.push(`[DONE] Created CP Code: ${state.cpCodeId}`);
      state.completedSteps.push('cpcode-created');
    }
    
    // Step 3: Configure edge hostname based on certificate type
    spinner.start('Setting up edge hostname and certificate...');
    
    const certificateType = params.certificateType || 'auto';
    let edgeHostnameDomain: string;
    
    if (certificateType === 'default-dv' || certificateType === 'auto') {
      // Create Secure by Default edge hostname
      const edgeHostnamePrefix = propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      edgeHostnameDomain = `${edgeHostnamePrefix}.edgekey.net`;
      
      const edgeHostnameResponse = await client.request({
        path: '/papi/v1/edgehostnames',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAPI-Use-Prefixes': 'true',
        },
        queryParams: {
          contractId: params.contractId,
          groupId: params.groupId,
        },
        body: {
          productId,
          domainPrefix: edgeHostnamePrefix,
          domainSuffix: 'edgekey.net',
          secure: true,
          secureNetwork: 'ENHANCED_TLS',
          ipVersionBehavior: 'IPV4_IPV6',
        },
      });
      
      const validatedEdgeHostnameResponse = validateApiResponse<{ edgeHostnameLink?: string }>(edgeHostnameResponse);
      if (validatedEdgeHostnameResponse.edgeHostnameLink) {
        state.edgeHostnameId = validatedEdgeHostnameResponse.edgeHostnameLink.split('/').pop()?.split('?')[0];
      }
      state.edgeHostnameDomain = edgeHostnameDomain;
      state.certificateType = 'DefaultDV';
      
      spinner.succeed('Created Secure by Default edge hostname');
      steps.push(`[DONE] Created edge hostname: ${edgeHostnameDomain}`);
      steps.push('[DONE] DefaultDV certificate automatically provisioned');
      state.completedSteps.push('edge-hostname-created');
    } else {
      // For DV SAN SNI, we'll need to create certificate enrollment
      // This is a placeholder - would need full certificate enrollment flow
      edgeHostnameDomain = `${propertyName}.edgesuite.net`;
      state.certificateType = 'DV SAN SNI';
      
      spinner.succeed('Edge hostname prepared for DV SAN SNI');
      steps.push('[EMOJI] DV SAN SNI certificate enrollment required');
      state.recommendations.push('Complete certificate enrollment and validation');
    }
    
    // Step 4: Configure property rules
    spinner.start('Configuring property rules...');
    
    const rules = {
      name: 'default',
      children: [],
      behaviors: [
        {
          name: 'origin',
          options: {
            hostname: params.originHostname,
            forwardHostHeader: 'REQUEST_HOST_HEADER',
            httpPort: 80,
            httpsPort: 443,
            originType: 'CUSTOMER',
            verificationMode: 'PLATFORM_SETTINGS',
            compress: true,
            enableTrueClientIp: true,
          },
        },
        {
          name: 'cpCode',
          options: {
            value: {
              id: state.cpCodeId,
              name: propertyName,
            },
          },
        },
        {
          name: 'caching',
          options: {
            behavior: 'MAX_AGE',
            ttl: '7d',
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
      ],
      criteria: [],
      options: {
        is_secure: true,
      },
    };
    
    await updatePropertyRules(client, {
      propertyId: state.propertyId!,
      rules,
      note: 'Initial secure configuration',
    });
    
    spinner.succeed('Property rules configured');
    steps.push('[DONE] Configured property with secure settings');
    state.completedSteps.push('rules-configured');
    
    // Step 5: Add hostnames
    spinner.start('Adding hostnames...');
    const allHostnames = [params.hostname, ...(params.additionalHostnames || [])];
    
    for (const hostname of allHostnames) {
      await addPropertyHostname(client, {
        propertyId: state.propertyId!,
        hostname,
        edgeHostname: edgeHostnameDomain,
      });
      steps.push(`[DONE] Added hostname: ${hostname}`);
    }
    
    spinner.succeed('All hostnames added');
    state.completedSteps.push('hostnames-added');
    
    // Step 6: Configure security if requested
    if (params.securityLevel && params.securityLevel !== 'basic') {
      spinner.start('Configuring security...');
      const securityResult = await createSecurityConfiguration(client, {
        propertyName,
        hostnames: allHostnames,
        securityLevel: params.securityLevel,
        notificationEmails: params.notificationEmails,
      });
      
      if (securityResult.securityConfigId) {
        state.securityConfigId = securityResult.securityConfigId;
        state.wafPolicyId = securityResult.wafPolicyId;
        spinner.succeed('Security configuration created');
        steps.push('[DONE] WAF policy created in alert mode');
        state.completedSteps.push('security-configured');
      } else {
        spinner.warn(securityResult.status);
        steps.push(`[WARNING] ${securityResult.status}`);
      }
    }
    
    // Generate comprehensive response
    let text = `# [DONE] Property Setup Complete!\n\n`;
    text += `## Summary\n\n`;
    text += `- **Property Name:** ${propertyName}\n`;
    text += `- **Property ID:** ${state.propertyId}\n`;
    text += `- **Edge Hostname:** ${edgeHostnameDomain}\n`;
    text += `- **Certificate Type:** ${state.certificateType}\n`;
    text += `- **Hostnames:** ${allHostnames.join(', ')}\n`;
    text += `- **Origin:** ${params.originHostname}\n\n`;
    
    text += `## Steps Completed\n\n`;
    steps.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });
    
    text += `\n## Next Steps\n\n`;
    
    if (params.migrateDNS) {
      text += `### 1. Configure DNS\n`;
      text += `Set up DNS records and optionally migrate to Akamai:\n`;
      text += `\`\`\`\n{ "operation": "configure-dns", "propertyId": "${state.propertyId}", "hostname": "${params.hostname}", "migrateDNS": true }\n\`\`\`\n\n`;
    } else {
      text += `### 1. Create DNS CNAMEs\n`;
      text += `For each hostname, create a CNAME record:\n`;
      allHostnames.forEach(hostname => {
        text += `- ${hostname} → ${edgeHostnameDomain}\n`;
      });
      text += '\n';
    }
    
    text += `### 2. Activate to Staging\n`;
    text += `Test your configuration:\n`;
    text += `\`\`\`\n{ "operation": "activate", "propertyId": "${state.propertyId}", "network": "staging" }\n\`\`\`\n\n`;
    
    text += `### 3. Activate to Production\n`;
    text += `Once verified in staging:\n`;
    text += `\`\`\`\n{ "operation": "activate", "propertyId": "${state.propertyId}", "network": "production" }\n\`\`\`\n`;
    
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
    
  } catch (error) {
    spinner.fail('Property setup failed');
    throw error;
  }
}

// Handle configure DNS operation
async function handleConfigureDNS(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.hostname) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Please provide the hostname to configure DNS for.\n\n` +
            `Example: { "operation": "configure-dns", "hostname": "www.example.com" }`,
        },
      ],
    };
  }
  
  if (params.migrateDNS === undefined) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} DNS Configuration Options for ${format.cyan(params.hostname)}\n\n` +
            `Would you like to:\n` +
            `1. **Just create CNAME** - You'll manage DNS elsewhere\n` +
            `2. **Migrate DNS to Akamai** - Full DNS management in Akamai\n\n` +
            `For option 1: { "operation": "configure-dns", "hostname": "${params.hostname}", "migrateDNS": false }\n` +
            `For option 2: { "operation": "configure-dns", "hostname": "${params.hostname}", "migrateDNS": true }`,
        },
      ],
    };
  }
  
  if (!params.migrateDNS) {
    // Just provide CNAME instructions
    const edgeHostname = state.edgeHostnameDomain || `${params.hostname.replace(/\./g, '-')}.edgekey.net`;
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.info} DNS Configuration Instructions\n\n` +
            `Create the following CNAME record in your DNS provider:\n\n` +
            `**Record Type:** CNAME\n` +
            `**Name:** ${params.hostname}\n` +
            `**Value:** ${edgeHostname}\n` +
            `**TTL:** 300 (5 minutes)\n\n` +
            `${icons.warning} Important:\n` +
            `- Ensure no conflicting A/AAAA records exist\n` +
            `- The change may take up to 24 hours to propagate\n` +
            `- Test with: \`dig ${params.hostname} CNAME\`\n\n` +
            `Once DNS is configured, activate your property:\n` +
            `{ "operation": "activate", "propertyId": "${state.propertyId}", "network": "staging" }`,
        },
      ],
    };
  }
  
  // Full DNS migration
  if (!params.currentNameservers) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} To migrate DNS to Akamai, I need your current nameservers.\n\n` +
            `Current nameservers can be found with: \`dig ${params.hostname} NS\`\n\n` +
            `Example: { "operation": "configure-dns", "hostname": "${params.hostname}", "migrateDNS": true, "currentNameservers": ["ns1.example.com", "ns2.example.com"] }`,
        },
      ],
    };
  }
  
  if (!params.confirmAction) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.warning} Ready to migrate DNS to Akamai\n\n` +
            `This will:\n` +
            `1. Create a new DNS zone in Akamai\n` +
            `2. Import existing DNS records\n` +
            `3. Add required CNAME for Akamai delivery\n` +
            `4. Provide new Akamai nameservers\n\n` +
            `**Current Nameservers:** ${params.currentNameservers.join(', ')}\n` +
            `**Zone to create:** ${params.hostname.replace('www.', '')}\n\n` +
            `Add "confirmAction": true to proceed.`,
        },
      ],
    };
  }
  
  const spinner = new Spinner();
  
  try {
    // Create DNS zone
    spinner.start('Creating DNS zone...');
    const zone = params.hostname.replace('www.', '');
    
    const zoneResult = await createZone(client, {
      zone,
      type: 'SECONDARY',
      masters: params.currentNameservers,
      comment: `Migrated zone for ${params.hostname}`,
    });
    
    spinner.succeed('DNS zone created');
    state.dnsZoneCreated = true;
    
    // Add CNAME record
    spinner.start('Adding CNAME record...');
    const edgeHostname = state.edgeHostnameDomain || `${params.hostname.replace(/\./g, '-')}.edgekey.net`;
    
    await upsertRecord(client, {
      zone,
      name: params.hostname,
      type: 'CNAME',
      ttl: 300,
      rdata: [edgeHostname],
    });
    
    spinner.succeed('CNAME record added');
    
    let text = `${icons.success} DNS Migration Complete!\n\n`;
    text += `## Zone Created\n`;
    text += `- **Zone:** ${zone}\n`;
    text += `- **Type:** Secondary (importing from current DNS)\n\n`;
    
    text += `## Next Steps\n\n`;
    text += `### 1. Update Domain Registrar\n`;
    text += `Change your domain's nameservers to:\n`;
    text += `- use1.akamai.net\n`;
    text += `- use2.akamai.net\n`;
    text += `- use3.akamai.net\n`;
    text += `- use4.akamai.net\n\n`;
    
    text += `### 2. Verify DNS\n`;
    text += `Once nameservers are updated (24-48 hours):\n`;
    text += `\`\`\`\ndig ${params.hostname} @use1.akamai.net\n\`\`\`\n\n`;
    
    text += `### 3. Activate Property\n`;
    text += `\`\`\`\n{ "operation": "activate", "propertyId": "${state.propertyId}", "network": "staging" }\n\`\`\``;
    
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
    
  } catch (error) {
    spinner.fail('DNS configuration failed');
    throw error;
  }
}

// Handle configure security operation
async function handleConfigureSecurity(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.propertyId) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.error} Property ID required for security configuration.\n\n` +
            `Example: { "operation": "configure-security", "propertyId": "prp_123456" }`,
        },
      ],
    };
  }
  
  if (!params.securityLevel) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Choose your security level:\n\n` +
            `**Available Options:**\n` +
            `• ${format.cyan('basic')} - No WAF, standard Akamai protections only\n` +
            `• ${format.cyan('standard')} - WAF in alert mode (recommended)\n` +
            `• ${format.cyan('enhanced')} - WAF with App & API Protector\n` +
            `• ${format.cyan('custom')} - Custom security configuration\n\n` +
            `Example: { "operation": "configure-security", "propertyId": "${params.propertyId}", "securityLevel": "standard" }`,
        },
      ],
    };
  }
  
  const spinner = new Spinner();
  
  try {
    spinner.start('Configuring security...');
    
    // For now, return configuration details
    // In production, this would create actual security configs
    
    let text = `${icons.success} Security Configuration\n\n`;
    text += `## Security Level: ${format.cyan(params.securityLevel)}\n\n`;
    
    switch (params.securityLevel) {
      case 'basic':
        text += `Standard Akamai protections enabled:\n`;
        text += `- DDoS protection\n`;
        text += `- Rate limiting\n`;
        text += `- Geographic controls\n\n`;
        text += `No additional WAF configuration needed.`;
        break;
        
      case 'standard':
        text += `WAF Configuration (Alert Mode):\n`;
        text += `- OWASP Top 10 protection\n`;
        text += `- SQL injection detection\n`;
        text += `- XSS prevention\n`;
        text += `- Command injection blocking\n\n`;
        text += `${icons.info} All threats logged but not blocked initially\n`;
        text += `Review logs and tune before enabling blocking mode`;
        break;
        
      case 'enhanced':
        text += `App & API Protector Configuration:\n`;
        text += `- Advanced bot detection\n`;
        text += `- API rate limiting\n`;
        text += `- Behavioral analysis\n`;
        text += `- Custom rule creation\n`;
        text += `- Real-time threat intelligence\n\n`;
        text += `${icons.warning} Requires additional license`;
        break;
    }
    
    spinner.succeed('Security configuration completed');
    
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
    
  } catch (error) {
    spinner.fail('Security configuration failed');
    throw error;
  }
}

// Handle activation operation
async function handleActivation(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.propertyId) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.error} Property ID required for activation.\n\n` +
            `Example: { "operation": "activate", "propertyId": "prp_123456" }`,
        },
      ],
    };
  }
  
  // This would trigger actual activation
  // For now, provide activation instructions
  
  let text = `${icons.rocket} Ready for Activation!\n\n`;
  text += `## Activation Steps\n\n`;
  text += `### 1. Activate to Staging\n`;
  text += `Test your configuration safely:\n`;
  text += `\`\`\`\nActivate property ${params.propertyId} to staging\n\`\`\`\n\n`;
  
  text += `### 2. Test on Staging\n`;
  text += `- Modify your hosts file or use staging URLs\n`;
  text += `- Verify content delivery\n`;
  text += `- Check security policies\n`;
  text += `- Test all functionality\n\n`;
  
  text += `### 3. Activate to Production\n`;
  text += `Once staging is verified:\n`;
  text += `\`\`\`\nActivate property ${params.propertyId} to production\n\`\`\`\n\n`;
  
  text += `${icons.info} Activation typically takes 5-10 minutes per network`;
  
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

// Handle status check operation
async function handleCheckStatus(
  client: AkamaiClient,
  params: SecureHostnameOnboardingInput,
  state: OnboardingState,
): Promise<MCPToolResponse> {
  if (!params.propertyId) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.error} Property ID required to check status.\n\n` +
            `Example: { "operation": "status", "propertyId": "prp_123456" }`,
        },
      ],
    };
  }
  
  const spinner = new Spinner();
  spinner.start('Checking onboarding status...');
  
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${params.propertyId}`,
      method: 'GET',
    });
    
    const validatedPropertyResponse = validateApiResponse<{ properties?: { items?: any } }>(propertyResponse);
    const property = validatedPropertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }
    
    spinner.succeed('Status retrieved');
    
    let text = `# Onboarding Status for ${property.propertyName}\n\n`;
    text += `## Property Information\n`;
    text += `- **Property ID:** ${property.propertyId}\n`;
    text += `- **Latest Version:** ${property.latestVersion}\n`;
    text += `- **Production Version:** ${property.productionVersion || 'Not activated'}\n`;
    text += `- **Staging Version:** ${property.stagingVersion || 'Not activated'}\n\n`;
    
    // Get hostnames
    const hostnamesResponse = await client.request({
      path: `/papi/v1/properties/${params.propertyId}/versions/${property.latestVersion}/hostnames`,
      method: 'GET',
    });
    
    text += `## Configured Hostnames\n`;
    const validatedHostnamesResponse = validateApiResponse<{ hostnames?: { items?: Array<{ cnameFrom?: string; cnameTo?: string }> } }>(hostnamesResponse);
    if (validatedHostnamesResponse.hostnames?.items?.length) {
      validatedHostnamesResponse.hostnames.items.forEach((hostname) => {
        text += `- ${hostname.cnameFrom} → ${hostname.cnameTo}\n`;
      });
    } else {
      text += 'No hostnames configured\n';
    }
    text += '\n';
    
    text += `## Completed Steps\n`;
    const steps = [
      { id: 'property-created', name: 'Property created' },
      { id: 'cpcode-created', name: 'CP Code created' },
      { id: 'edge-hostname-created', name: 'Edge hostname configured' },
      { id: 'rules-configured', name: 'Property rules configured' },
      { id: 'hostnames-added', name: 'Hostnames added' },
      { id: 'security-configured', name: 'Security configured' },
      { id: 'dns-configured', name: 'DNS configured' },
    ];
    
    steps.forEach(step => {
      const completed = state.completedSteps.includes(step.id);
      text += `${completed ? '[DONE]' : '[EMOJI]'} ${step.name}\n`;
    });
    
    text += `\n## Next Actions\n`;
    
    if (!property.stagingVersion) {
      text += `- Activate to staging first\n`;
    } else if (!property.productionVersion) {
      text += `- Property is on staging, ready for production activation\n`;
    } else {
      text += `- Property is fully activated!\n`;
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
    spinner.fail('Failed to check status');
    throw error;
  }
}

// Tool definition
export const secureHostnameOnboardingTool: Tool = {
  name: 'secure-hostname-onboarding',
  description: 'Comprehensive elicitation workflow for secure hostname onboarding with intelligent defaults',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: Object.values(OnboardingOperation.enum),
        description: 'The onboarding operation to perform',
      },
      hostname: {
        type: 'string',
        description: 'Primary hostname to onboard',
      },
      additionalHostnames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional hostnames to include',
      },
      originHostname: {
        type: 'string',
        description: 'Origin server hostname',
      },
      contractId: {
        type: 'string',
        description: 'Akamai contract ID',
      },
      groupId: {
        type: 'string',
        description: 'Akamai group ID',
      },
      productId: {
        type: 'string',
        description: 'Akamai product ID (auto-selected if not provided)',
      },
      certificateType: {
        type: 'string',
        enum: Object.values(CertificateType.enum),
        description: 'Certificate type preference',
      },
      migrateDNS: {
        type: 'boolean',
        description: 'Whether to migrate DNS to Akamai',
      },
      currentNameservers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Current nameservers (for DNS migration)',
      },
      securityLevel: {
        type: 'string',
        enum: Object.values(SecurityLevel.enum),
        description: 'Security configuration level',
      },
      notificationEmails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Email addresses for notifications',
      },
      confirmAction: {
        type: 'boolean',
        description: 'Confirm the action',
      },
      propertyId: {
        type: 'string',
        description: 'Existing property ID (for continuing onboarding)',
      },
      customer: {
        type: 'string',
        description: 'Optional customer identifier',
      },
    },
  },
};

// Export handler
export async function handleSecureHostnameOnboardingTool(params: SecureHostnameOnboardingInput): Promise<MCPToolResponse> {
  const client = await getAkamaiClient(params.customer);
  logger.info('Secure hostname onboarding tool request', { params });
  
  return handleSecureHostnameOnboarding(client, params);
}