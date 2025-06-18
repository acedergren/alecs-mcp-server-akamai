/**
 * Property Onboarding Tools
 * Provides streamlined property onboarding workflow
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { onboardProperty, OnboardingConfig } from '../agents/property-onboarding.agent';
import { withToolErrorHandling, ErrorContext } from '../utils/tool-error-handling';

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
  }
): Promise<MCPToolResponse> {
  const context: ErrorContext = {
    operation: 'onboard property',
    endpoint: 'property onboarding workflow',
    apiType: 'papi',
    customer: args.customer
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
      useCase: args.useCase || 'web-app'
    };

    // Execute onboarding workflow
    return await onboardProperty(client, config);
  }, context);
}

/**
 * Interactive property onboarding wizard
 * Guides through the onboarding process with prompts for missing information
 */
export async function onboardPropertyWizard(
  client: AkamaiClient,
  args: {
    hostname: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const context: ErrorContext = {
    operation: 'onboard property wizard',
    endpoint: 'property onboarding workflow',
    apiType: 'papi',
    customer: args.customer
  };

  return withToolErrorHandling(async () => {
    let responseText = `# Property Onboarding Wizard\n\n`;
    responseText += `Starting onboarding for: **${args.hostname}**\n\n`;
    
    responseText += `## Required Information\n\n`;
    responseText += `To complete the onboarding, please provide:\n\n`;
    responseText += `1. **Origin Hostname**: The backend server hostname (required)\n`;
    responseText += `   Example: origin-code.solutionsedge.io\n\n`;
    
    responseText += `2. **DNS Provider** (optional): Your current DNS provider\n`;
    responseText += `   Options: aws, cloudflare, azure, other\n`;
    responseText += `   This helps provide specific migration instructions\n\n`;
    
    responseText += `3. **Notification Emails** (optional): Emails for activation notifications\n`;
    responseText += `   Example: ["ops@example.com", "dev@example.com"]\n\n`;
    
    responseText += `## Default Configuration\n\n`;
    responseText += `The following defaults will be used:\n`;
    responseText += `- **Network**: Enhanced TLS (HTTPS-only)\n`;
    responseText += `- **Certificate**: Default DV (shared certificate)\n`;
    responseText += `- **Edge Hostname**: ${args.hostname}.edgekey.net\n`;
    responseText += `- **Use Case**: Web Application (Ion Standard if available)\n`;
    responseText += `- **CP Code**: Created automatically\n\n`;
    
    responseText += `## Use Case Options\n\n`;
    responseText += `- **web-app**: Web applications (Ion Standard)\n`;
    responseText += `- **api**: API delivery (Ion Standard)\n`;
    responseText += `- **download**: File downloads (Download Delivery)\n`;
    responseText += `- **streaming**: Video/audio streaming (Adaptive Media)\n`;
    responseText += `- **basic-web**: Basic websites (Standard TLS)\n\n`;
    
    responseText += `## Example Command\n\n`;
    responseText += '```\n';
    responseText += `onboard-property \\\n`;
    responseText += `  --hostname "${args.hostname}" \\\n`;
    responseText += `  --originHostname "origin-${args.hostname}" \\\n`;
    responseText += `  --contractId "ctr_YOUR-CONTRACT" \\\n`;
    responseText += `  --groupId "grp_YOUR-GROUP" \\\n`;
    responseText += `  --useCase "web-app" \\\n`;
    responseText += `  --dnsProvider "cloudflare" \\\n`;
    responseText += `  --notificationEmails '["team@example.com"]'\n`;
    responseText += '```\n\n';
    
    responseText += `Please run the command with the required originHostname parameter.`;

    return {
      content: [{
        type: 'text',
        text: responseText
      }]
    };
  }, context);
}

/**
 * Check property onboarding status
 * Verifies the current state of a property being onboarded
 */
export async function checkOnboardingStatus(
  client: AkamaiClient,
  args: {
    hostname: string;
    propertyId?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const context: ErrorContext = {
    operation: 'check onboarding status',
    endpoint: 'various',
    apiType: 'papi',
    customer: args.customer
  };

  return withToolErrorHandling(async () => {
    // This would check various aspects of the onboarding
    let responseText = `# Onboarding Status for ${args.hostname}\n\n`;
    
    // TODO: Implement actual status checks
    responseText += `## Checks to Perform\n\n`;
    responseText += `- [ ] Property exists\n`;
    responseText += `- [ ] Edge hostname created\n`;
    responseText += `- [ ] DNS CNAME configured\n`;
    responseText += `- [ ] Certificate provisioned\n`;
    responseText += `- [ ] Staging activation status\n`;
    responseText += `- [ ] Production activation status\n\n`;
    
    responseText += `To implement: Query property, edge hostname, DNS, and activation status.`;

    return {
      content: [{
        type: 'text',
        text: responseText
      }]
    };
  }, context);
}