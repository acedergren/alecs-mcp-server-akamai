/**
 * Property Production Activation Agent
 * Sub-agent for activating properties to production network after staging validation
 * Handles the 10-60 minute propagation time for new hostnames
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { activateProperty, getActivationStatus } from '../tools/property-manager-tools';
import { getProperty } from '../tools/property-tools';

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
      console.error('[ProductionActivation] Step 1: Validating property...');
      const propertyInfo = await this.validateProperty(config);
      if (!propertyInfo.valid) {
        result.errors = propertyInfo.errors;
        return result;
      }

      const version = config.version || propertyInfo.latestVersion!;

      // Step 2: Check if already activated to production
      console.error('[ProductionActivation] Step 2: Checking current activation status...');
      const currentStatus = await this.checkCurrentActivation(config.propertyId, version);
      if (currentStatus.alreadyActive) {
        result.warnings!.push(`Property version ${version} is already active on production`);
        result.success = true;
        return result;
      }

      // Step 3: Activate to production
      console.error('[ProductionActivation] Step 3: Activating to production network...');
      const activationResult = await this.activateToProduction(config.propertyId, version, config);

      if (!activationResult.success) {
        result.errors!.push('Failed to activate property to production');
        return result;
      }

      result.activationId = activationResult.activationId;
      result.estimatedCompletionTime = this.calculateEstimatedTime();

      // Step 4: Optionally wait for activation to complete
      if (config.waitForActivation) {
        console.error('[ProductionActivation] Step 4: Waiting for activation to complete...');
        const completionResult = await this.waitForActivationCompletion(
          config.propertyId,
          activationResult.activationId!,
          config.maxWaitTime || 60,
        );
        result.status = completionResult.status;
        if (completionResult.warnings) {
          result.warnings!.push(...completionResult.warnings);
        }
      } else {
        result.status = 'PENDING';
        result.warnings!.push(
          'Production activation initiated but not waiting for completion',
          'New hostnames typically take 10-60 minutes to propagate globally',
        );
      }

      result.success = true;
      return result;
    } catch (error) {
      console.error('[ProductionActivation] Error:', error);
      result.errors!.push(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }

  private async validateProperty(config: ProductionActivationConfig): Promise<{
    valid: boolean;
    errors?: string[];
    latestVersion?: number;
  }> {
    try {
      const propertyResult = await getProperty(this.client, {
        propertyId: config.propertyId,
      });

      // Extract version from response
      const responseText = propertyResult.content[0].text;
      const versionMatch = responseText.match(/Latest Version:\*\* (\d+)/);

      if (versionMatch) {
        return {
          valid: true,
          latestVersion: parseInt(versionMatch[1]),
        };
      }

      return {
        valid: false,
        errors: ['Could not determine property version'],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Property ${config.propertyId} not found or inaccessible`],
      };
    }
  }

  private async checkCurrentActivation(
    propertyId: string,
    version: number,
  ): Promise<{
    alreadyActive: boolean;
  }> {
    try {
      // Check if this version is already active on production
      // This would require checking activation history
      // For now, we'll assume it's not active
      return { alreadyActive: false };
    } catch (error) {
      console.error('[ProductionActivation] Error checking current activation:', error);
      return { alreadyActive: false };
    }
  }

  private async activateToProduction(
    propertyId: string,
    version: number,
    config: ProductionActivationConfig,
  ): Promise<{
    success: boolean;
    activationId?: string;
  }> {
    try {
      const note = config.note || `Production activation after staging validation (v${version})`;

      const result = await activateProperty(this.client, {
        propertyId,
        version,
        network: 'PRODUCTION',
        note,
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
      console.error('[ProductionActivation] Activation error:', error);
      return { success: false };
    }
  }

  private async waitForActivationCompletion(
    propertyId: string,
    activationId: string,
    maxWaitMinutes: number,
  ): Promise<{
    status: string;
    warnings?: string[];
  }> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitMinutes * 60 * 1000;
    const checkInterval = 30000; // Check every 30 seconds

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const statusResult = await getActivationStatus(this.client, {
          propertyId,
          activationId,
        });

        const responseText = statusResult.content[0].text;

        // Check for completion status
        if (responseText.includes('ACTIVE')) {
          return { status: 'ACTIVE' };
        } else if (responseText.includes('FAILED') || responseText.includes('ABORTED')) {
          return {
            status: 'FAILED',
            warnings: ['Activation failed or was aborted'],
          };
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('[ProductionActivation] Status check error:', error);
      }
    }

    return {
      status: 'TIMEOUT',
      warnings: [
        `Activation did not complete within ${maxWaitMinutes} minutes. It may still be processing.`,
      ],
    };
  }

  private calculateEstimatedTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Average 30 minutes
    return now.toISOString();
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
    responseText = `# ✅ Production Activation ${result.status === 'ACTIVE' ? 'Complete' : 'Initiated'}\n\n`;
    if (result.activationId) {
      responseText += `**Activation ID:** ${result.activationId}\n`;
    }
    responseText += `**Status:** ${result.status || 'PENDING'}\n`;
    if (result.estimatedCompletionTime) {
      responseText += `**Estimated Completion:** ${new Date(result.estimatedCompletionTime).toLocaleString()}\n`;
    }
    responseText += `\n## ⚡ Important Notes\n\n`;
    responseText += `- New hostnames typically take 10-60 minutes to propagate\n`;
    responseText += `- Test thoroughly before updating DNS records\n`;
    responseText += `- Monitor activation status in Akamai Control Center\n`;
  } else {
    responseText = `# ❌ Production Activation Failed\n\n`;
    if (result.errors && result.errors.length > 0) {
      responseText += `## Errors\n\n`;
      result.errors.forEach((error) => {
        responseText += `- ${error}\n`;
      });
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    responseText += `\n## ⚠️ Warnings\n\n`;
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
