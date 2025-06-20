/**
 * Property Production Activation Agent
 * Sub-agent for activating properties to production network after staging validation
 * Handles the 10-60 minute propagation time for new hostnames
 */

import { type AkamaiClient } from '../akamai-client';
import { activateProperty, getActivationStatus } from '../tools/property-manager-tools';
import { getProperty } from '../tools/property-tools';
import { type MCPToolResponse } from '../types';

export interface ProductionActivationConfig {
  propertyId: string;
  version?: number;
  notificationEmails: string[];
  note?: string;
  customer?: string;
  waitForActivation?: boolean;
  maxWaitTime?: number; // in minutes
}

export interface ProductionActivationResult {
  success: boolean;
  activationId?: string;
  status?: string;
  errors?: string[];
  warnings?: string[];
  estimatedCompletionTime?: string;
}

export class PropertyProductionActivationAgent {
  constructor(private client: AkamaiClient) {}

  async execute(config: ProductionActivationConfig): Promise<ProductionActivationResult> {
    const result: ProductionActivationResult = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Validate property exists and get current version
      console.log('[ 1: Validating property...');
      const propertyResult = await getProperty(this.client, {
        propertyId: config.propertyId,
      });

      // Extract property details from response
      const responseText = propertyResult.content[0].text;
      if (!responseText.includes('Property Name:')) {
        result.errors!.push(`Property ${config.propertyId} not found`);
        return result;
      }

      // Step 2: Activate to production
      console.log('[ 2: Activating to production network...');
      const version = config.version || 1;
      const activationResult = await activateProperty(this.client, {
        propertyId: config.propertyId,
        version: version,
        network: 'PRODUCTION',
        note: config.note || 'Production activation after staging validation',
        notifyEmails: config.notificationEmails,
      });

      // Extract activation ID from response
      const activationResponseText = activationResult.content[0].text;
      const activationIdMatch = activationResponseText.match(/Activation ID:\*\* (atv_\d+)/);

      if (!activationIdMatch) {
        result.errors!.push('Failed to extract activation ID from response');
        return result;
      }

      result.activationId = activationIdMatch[1];
      result.success = true;

      // Step 3: Provide time estimates based on hostname status
      console.log('[ 3: Calculating completion estimates...');
      const isNewHostname = this.checkIfNewHostname(responseText);

      if (isNewHostname) {
        result.warnings!.push(
          'This property contains new hostnames that have not been activated to production before.',
        );
        result.warnings!.push(
          'New hostnames require 10-60 minutes for DNS propagation across Akamai edge servers.',
        );
        result.estimatedCompletionTime = '10-60 minutes';
      } else {
        result.estimatedCompletionTime = '5-10 minutes';
      }

      // Step 4: Optionally wait for activation
      if (config.waitForActivation) {
        const maxWaitTime = config.maxWaitTime || 60; // Default 60 minutes
        console.error(
          `[ProductionActivation] Step 4: Waiting for activation (max ${maxWaitTime} minutes)...`,
        );
        const finalStatus = await this.waitForActivation(
          config.propertyId,
          result.activationId,
          maxWaitTime,
        );
        result.status = finalStatus;
      } else {
        result.status = 'PENDING';
      }

      return result;
    } catch (error) {
      console.error("[Error]:", error);
      result.errors!.push(
        `Activation error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }

  private checkIfNewHostname(propertyResponseText: string): boolean {
    // Check if this is likely a new hostname by looking for indicators
    // In production, you'd check activation history
    return propertyResponseText.includes('Version: 1') || propertyResponseText.includes('v1');
  }

  private async waitForActivation(
    propertyId: string,
    activationId: string,
    maxWaitMinutes: number,
  ): Promise<string> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitMinutes * 60 * 1000;
    const checkInterval = 30 * 1000; // Check every 30 seconds

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const statusResult = await getActivationStatus(this.client, {
          propertyId,
          activationId,
        });

        const responseText = statusResult.content[0].text;
        // Parse status from response
        if (responseText.includes('Status: ACTIVE')) {
          return 'ACTIVE';
        } else if (responseText.includes('Status: FAILED')) {
          return 'FAILED';
        } else if (responseText.includes('Status: DEACTIVATED')) {
          return 'DEACTIVATED';
        }

        // Still pending, wait before next check
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error("[Error]:", error);
        // Continue waiting
      }
    }

    return 'TIMEOUT';
  }
}

// Export function for easy tool integration
export async function activatePropertyToProduction(
  client: AkamaiClient,
  args: ProductionActivationConfig,
): Promise<MCPToolResponse> {
  const agent = new PropertyProductionActivationAgent(client);
  const result = await agent.execute(args);

  let responseText = '';

  if (result.success) {
    responseText = '# ✅ Production Activation Initiated\n\n';
    responseText += `**Activation ID:** ${result.activationId}\n`;
    responseText += `**Status:** ${result.status}\n`;
    responseText += `**Estimated Completion:** ${result.estimatedCompletionTime}\n\n`;

    responseText += '## Important Notes\n\n';
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach((warning) => {
        responseText += `⚠️ ${warning}\n`;
      });
      responseText += '\n';
    }

    responseText += '## Next Steps\n\n';
    responseText += `1. Monitor activation status with: property.activation.status --propertyId "${args.propertyId}" --activationId "${result.activationId}"\n`;
    responseText += '2. Once active, test your production hostname\n';
    responseText += '3. Update DNS records to point to the Akamai edge hostname\n';
    responseText += '4. Monitor traffic and performance in Control Center\n';
  } else {
    responseText = '# ❌ Production Activation Failed\n\n';
    if (result.errors && result.errors.length > 0) {
      responseText += '## Errors\n\n';
      result.errors.forEach((_error) => {
        responseText += `- ${_error}\n`;
      });
    }
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
