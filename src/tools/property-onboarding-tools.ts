/**
 * Property Onboarding Tools
 * Provides streamlined property onboarding workflow
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { onboardProperty, OnboardingConfig } from '../agents/property-onboarding.agent';
import { withToolErrorHandling, ErrorContext } from '../utils/tool-error-handling';
import { listProperties } from './property-tools';
import { listEdgeHostnames } from './property-manager-advanced-tools';
import { listPropertyActivations } from './property-manager-tools';
import { listRecords } from './dns-tools';

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
    let responseText = `# Onboarding Status for ${args.hostname}\n\n`;
    const status = {
      propertyExists: false,
      propertyId: '',
      edgeHostnameCreated: false,
      edgeHostname: '',
      dnsCnameConfigured: false,
      certificateProvisioned: false,
      stagingActivated: false,
      productionActivated: false
    };

    // Step 1: Check if property exists
    responseText += `## 1. Property Status\n`;
    try {
      const propertiesResponse = await listProperties(client, { customer: args.customer });
      const propertiesText = propertiesResponse.content[0]?.text || '';
      
      // Search for the hostname in the properties list
      const propertyMatch = propertiesText.match(new RegExp(`(prp_\\d+).*${args.hostname.replace('.', '\\.')}`, 'i'));
      
      if (propertyMatch || args.propertyId) {
        status.propertyExists = true;
        status.propertyId = args.propertyId || propertyMatch?.[1] || '';
        responseText += `✅ Property found: ${status.propertyId}\n\n`;
      } else {
        responseText += `❌ Property not found for hostname: ${args.hostname}\n\n`;
      }
    } catch (error) {
      responseText += `⚠️ Error checking property: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
    }

    // Step 2: Check edge hostname
    if (status.propertyExists && status.propertyId) {
      responseText += `## 2. Edge Hostname Status\n`;
      try {
        const edgeHostnamesResponse = await listEdgeHostnames(client, { 
          propertyId: status.propertyId,
          customer: args.customer 
        });
        const edgeHostnamesText = edgeHostnamesResponse.content[0]?.text || '';
        
        // Check if edge hostname exists for the property hostname
        const edgeHostnameMatch = edgeHostnamesText.match(new RegExp(`${args.hostname}.*→.*([\\w.-]+\\.edgekey\\.net)`, 'i'));
        
        if (edgeHostnameMatch) {
          status.edgeHostnameCreated = true;
          status.edgeHostname = edgeHostnameMatch[1];
          responseText += `✅ Edge hostname configured: ${args.hostname} → ${status.edgeHostname}\n`;
          
          // Check certificate status from the edge hostname output
          if (edgeHostnamesText.includes('DEFAULT') || edgeHostnamesText.includes('ENHANCED_TLS')) {
            status.certificateProvisioned = true;
            responseText += `✅ Certificate provisioned (DEFAULT DV)\n\n`;
          } else {
            responseText += `⚠️ Certificate not yet provisioned\n\n`;
          }
        } else {
          responseText += `❌ Edge hostname not found for ${args.hostname}\n\n`;
        }
      } catch (error) {
        responseText += `⚠️ Error checking edge hostname: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      }
    }

    // Step 3: Check DNS CNAME
    if (status.edgeHostnameCreated && status.edgeHostname) {
      responseText += `## 3. DNS Configuration\n`;
      try {
        // Extract zone from hostname
        const parts = args.hostname.split('.');
        const zone = parts.slice(-2).join('.');
        const recordName = parts.slice(0, -2).join('.') || '@';
        
        const dnsResponse = await listRecords(client, {
          zone,
          customer: args.customer
        });
        const dnsText = dnsResponse.content[0]?.text || '';
        
        // Check if CNAME exists pointing to edge hostname
        if (dnsText.includes(args.hostname) && dnsText.includes(status.edgeHostname)) {
          status.dnsCnameConfigured = true;
          responseText += `✅ DNS CNAME configured: ${args.hostname} → ${status.edgeHostname}\n\n`;
        } else {
          responseText += `❌ DNS CNAME not configured\n`;
          responseText += `   Required: ${args.hostname} CNAME ${status.edgeHostname}\n\n`;
        }
      } catch (error) {
        // DNS might be external, so this is not necessarily an error
        responseText += `ℹ️ Could not verify DNS (may be external): ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      }
    }

    // Step 4: Check activation status
    if (status.propertyExists && status.propertyId) {
      responseText += `## 4. Activation Status\n`;
      try {
        const activationsResponse = await listPropertyActivations(client, {
          propertyId: status.propertyId,
          customer: args.customer
        });
        const activationsText = activationsResponse.content[0]?.text || '';
        
        // Check for staging activation
        if (activationsText.includes('STAGING') && activationsText.includes('ACTIVE')) {
          status.stagingActivated = true;
          responseText += `✅ Staging activation: ACTIVE\n`;
        } else {
          responseText += `❌ Staging activation: NOT ACTIVE\n`;
        }
        
        // Check for production activation
        if (activationsText.includes('PRODUCTION') && activationsText.includes('ACTIVE')) {
          status.productionActivated = true;
          responseText += `✅ Production activation: ACTIVE\n\n`;
        } else {
          responseText += `⚠️ Production activation: NOT ACTIVE\n\n`;
        }
      } catch (error) {
        responseText += `⚠️ Error checking activation status: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      }
    }

    // Summary
    responseText += `## Summary\n\n`;
    responseText += `- [${status.propertyExists ? 'x' : ' '}] Property exists${status.propertyId ? ` (${status.propertyId})` : ''}\n`;
    responseText += `- [${status.edgeHostnameCreated ? 'x' : ' '}] Edge hostname created${status.edgeHostname ? ` (${status.edgeHostname})` : ''}\n`;
    responseText += `- [${status.dnsCnameConfigured ? 'x' : ' '}] DNS CNAME configured\n`;
    responseText += `- [${status.certificateProvisioned ? 'x' : ' '}] Certificate provisioned\n`;
    responseText += `- [${status.stagingActivated ? 'x' : ' '}] Staging activation\n`;
    responseText += `- [${status.productionActivated ? 'x' : ' '}] Production activation\n\n`;
    
    // Next steps
    if (!status.propertyExists) {
      responseText += `**Next Step:** Run the onboarding process to create the property.\n`;
    } else if (!status.edgeHostnameCreated) {
      responseText += `**Next Step:** Create edge hostname for the property.\n`;
    } else if (!status.certificateProvisioned) {
      responseText += `**Next Step:** Wait for certificate provisioning to complete.\n`;
    } else if (!status.dnsCnameConfigured) {
      responseText += `**Next Step:** Configure DNS CNAME record.\n`;
    } else if (!status.stagingActivated) {
      responseText += `**Next Step:** Activate property on staging network.\n`;
    } else if (!status.productionActivated) {
      responseText += `**Next Step:** Activate property on production network.\n`;
    } else {
      responseText += `✨ **Property is fully onboarded and active!**\n`;
    }

    return {
      content: [{
        type: 'text',
        text: responseText
      }]
    };
  }, context);
}