/**
 * Advanced Property Activation Tools
 * Production-ready property activation with validation, monitoring, and rollback capabilities
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { ErrorTranslator, ErrorRecovery } from '../utils/errors.js';

// Enhanced activation types
export interface ActivationProgress {
  activationId: string;
  propertyId: string;
  version: number;
  network: 'STAGING' | 'PRODUCTION';
  status: ActivationStatus;
  percentComplete: number;
  currentZone?: string;
  estimatedTimeRemaining?: number;
  startTime: Date;
  lastUpdateTime: Date;
  errors?: ActivationError[];
  warnings?: ActivationWarning[];
}

export interface ActivationStatus {
  state: 'PENDING' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ACTIVE' | 'FAILED' | 'ABORTED' | 'DEACTIVATED';
  message: string;
  details?: string;
}

export interface ActivationError {
  type: string;
  messageId: string;
  detail: string;
  errorLocation?: string;
  timestamp: Date;
}

export interface ActivationWarning {
  type: string;
  messageId: string;
  detail: string;
  errorLocation?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  preflightChecks: PreflightCheck[];
}

export interface ValidationError {
  severity: 'CRITICAL' | 'ERROR';
  type: string;
  detail: string;
  location?: string;
  resolution?: string;
}

export interface ValidationWarning {
  severity: 'WARNING' | 'INFO';
  type: string;
  detail: string;
  location?: string;
}

export interface PreflightCheck {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  message: string;
  details?: string;
}

export interface ActivationOptions {
  validateFirst?: boolean;
  waitForCompletion?: boolean;
  maxWaitTime?: number;
  progressCallback?: (progress: ActivationProgress) => void;
  rollbackOnFailure?: boolean;
  requireAllPreflightChecks?: boolean;
  fastPush?: boolean;
  notifyEmails?: string[];
  acknowledgeWarnings?: boolean;
}

/**
 * Validate property before activation
 */
export async function validatePropertyActivation(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    network: 'STAGING' | 'PRODUCTION';
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }
    
    const property = propertyResponse.properties.items[0];
    const version = args.version || property.latestVersion || 1;
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      preflightChecks: [],
    };

    // 1. Check rule validation
    const rulesValidation = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules/errors`,
      method: 'GET',
    });

    if (rulesValidation.errors?.length > 0) {
      validation.valid = false;
      rulesValidation.errors.forEach((error: any) => {
        validation.errors.push({
          severity: error.type === 'error' ? 'CRITICAL' : 'ERROR',
          type: error.type,
          detail: error.detail,
          location: error.errorLocation,
          resolution: getErrorResolution(error),
        });
      });
    }

    if (rulesValidation.warnings?.length > 0) {
      rulesValidation.warnings.forEach((warning: any) => {
        validation.warnings.push({
          severity: 'WARNING',
          type: warning.type,
          detail: warning.detail,
          location: warning.errorLocation,
        });
      });
    }

    // 2. Check hostname configuration
    const hostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    const hostnames = hostnamesResponse.hostnames?.items || [];
    
    validation.preflightChecks.push({
      name: 'Hostname Configuration',
      status: hostnames.length > 0 ? 'PASSED' : 'FAILED',
      message: hostnames.length > 0 
        ? `${hostnames.length} hostname(s) configured`
        : 'No hostnames configured',
      details: hostnames.length === 0 
        ? 'Add at least one hostname before activation'
        : undefined,
    });

    // 3. Check certificate status for HTTPS hostnames
    const httpsHostnames = hostnames.filter((h: any) => 
      h.cnameTo && (h.cnameTo.includes('edgekey') || h.cnameTo.includes('edgesuite'))
    );

    if (httpsHostnames.length > 0) {
      const certCheck = await checkCertificateStatus(httpsHostnames, args.network);
      validation.preflightChecks.push(certCheck);
    }

    // 4. Check for concurrent activations
    const activationsResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'GET',
    });

    const pendingActivations = (activationsResponse.activations?.items || [])
      .filter((a: any) => a.status === 'PENDING' && a.network === args.network);

    if (pendingActivations.length > 0) {
      validation.valid = false;
      validation.errors.push({
        severity: 'CRITICAL',
        type: 'CONCURRENT_ACTIVATION',
        detail: `Another activation is already in progress for ${args.network}`,
        resolution: 'Wait for the current activation to complete or cancel it',
      });
    }

    // 5. Version comparison check
    const currentVersion = args.network === 'PRODUCTION' 
      ? property.productionVersion 
      : property.stagingVersion;

    if (currentVersion && currentVersion === version) {
      validation.warnings.push({
        severity: 'INFO',
        type: 'VERSION_ALREADY_ACTIVE',
        detail: `Version ${version} is already active in ${args.network}`,
      });
    }

    // 6. Origin connectivity check (if possible)
    const originCheck = await checkOriginConnectivity(client, args.propertyId, version);
    validation.preflightChecks.push(originCheck);

    // Generate suggestions based on validation results
    if (!validation.valid) {
      validation.suggestions = generateActivationSuggestions(validation);
    }

    // Format response
    let responseText = `# Property Activation Validation\n\n`;
    responseText += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    responseText += `**Version:** ${version}\n`;
    responseText += `**Target Network:** ${args.network}\n\n`;

    responseText += `## Validation Result: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (validation.errors.length > 0) {
      responseText += `### Errors (${validation.errors.length})\n`;
      validation.errors.forEach((error, index) => {
        responseText += `${index + 1}. **${error.severity}**: ${error.detail}\n`;
        if (error.location) responseText += `   - Location: ${error.location}\n`;
        if (error.resolution) responseText += `   - Resolution: ${error.resolution}\n`;
      });
      responseText += '\n';
    }

    if (validation.warnings.length > 0) {
      responseText += `### Warnings (${validation.warnings.length})\n`;
      validation.warnings.forEach((warning, index) => {
        responseText += `${index + 1}. **${warning.severity}**: ${warning.detail}\n`;
        if (warning.location) responseText += `   - Location: ${warning.location}\n`;
      });
      responseText += '\n';
    }

    if (validation.preflightChecks.length > 0) {
      responseText += `### Preflight Checks\n`;
      validation.preflightChecks.forEach(check => {
        const icon = check.status === 'PASSED' ? '✅' : check.status === 'FAILED' ? '❌' : '⚠️';
        responseText += `- ${icon} **${check.name}**: ${check.message}\n`;
        if (check.details) responseText += `  - ${check.details}\n`;
      });
      responseText += '\n';
    }

    if (validation.suggestions.length > 0) {
      responseText += `### Suggestions\n`;
      validation.suggestions.forEach((suggestion, index) => {
        responseText += `${index + 1}. ${suggestion}\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'validate property activation',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Enhanced property activation with monitoring
 */
export async function activatePropertyWithMonitoring(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    network: 'STAGING' | 'PRODUCTION';
    note?: string;
    options?: ActivationOptions;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const options = args.options || {};
  
  try {
    // Validate first if requested
    if (options.validateFirst) {
      const validationResult = await validatePropertyActivation(client, {
        propertyId: args.propertyId,
        version: args.version,
        network: args.network,
      });

      // Parse validation result to check if valid
      const validationText = validationResult.content[0]?.text || '';
      if (validationText.includes('❌ FAILED')) {
        return {
          content: [{
            type: 'text',
            text: `❌ Activation blocked due to validation failures\n\n${validationText}\n\nFix the errors above before proceeding with activation.`,
          }],
        };
      }
    }

    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const property = propertyResponse.properties.items[0];
    const version = args.version || property.latestVersion || 1;

    // Create activation
    const activationResponse = await ErrorRecovery.withRetry(
      async () => {
        return await client.request({
          path: `/papi/v1/properties/${args.propertyId}/activations`,
          method: 'POST',
          body: {
            propertyVersion: version,
            network: args.network,
            note: args.note || `Activated via MCP on ${new Date().toISOString()}`,
            notifyEmails: options.notifyEmails || [],
            acknowledgeAllWarnings: options.acknowledgeWarnings !== false,
            fastPush: options.fastPush !== false,
            useFastFallback: false,
          },
        });
      },
      3,
      (attempt, _error) => {
        console.log(`Activation attempt ${attempt} failed, retrying...`);
      }
    );

    const activationId = activationResponse.activationLink?.split('/').pop();

    // If not waiting for completion, return immediately
    if (!options.waitForCompletion) {
      return {
        content: [{
          type: 'text',
          text: `✅ Started activation of property ${property.propertyName} (v${version}) to ${args.network}\n\n**Activation ID:** ${activationId}\n**Status:** In Progress\n\nTo monitor progress:\n\`\`\`\nGet activation progress ${activationId} for property ${args.propertyId}\n\`\`\``,
        }],
      };
    }

    // Monitor activation progress
    const maxWaitTime = options.maxWaitTime || 1800000; // 30 minutes default
    const startTime = Date.now();
    let lastStatus = '';
    let progress: ActivationProgress;

    while (Date.now() - startTime < maxWaitTime) {
      // Get current status
      const statusResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/activations/${activationId}`,
        method: 'GET',
      });

      const activation = statusResponse.activations?.items?.[0];
      if (!activation) {
        throw new Error('Activation not found');
      }

      // Build progress object
      progress = buildActivationProgress(activation, startTime);

      // Call progress callback if provided
      if (options.progressCallback) {
        options.progressCallback(progress);
      }

      // Check for completion
      if (progress.status.state === 'ACTIVE') {
        return {
          content: [{
            type: 'text',
            text: formatActivationSuccess(property, version, args.network, progress),
          }],
        };
      }

      // Check for failure
      if (progress.status.state === 'FAILED' || progress.status.state === 'ABORTED') {
        if (options.rollbackOnFailure) {
          // Attempt rollback
          await rollbackActivation(client, args.propertyId, args.network);
        }
        
        return {
          content: [{
            type: 'text',
            text: formatActivationFailure(property, version, args.network, progress),
          }],
        };
      }

      // Update if status changed
      if (progress.status.state !== lastStatus) {
        lastStatus = progress.status.state;
      }

      // Progressive delay
      const delay = getProgressiveDelay(Date.now() - startTime);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Timeout reached
    return {
      content: [{
        type: 'text',
        text: `⏱️ Activation timeout reached\n\n**Property:** ${property.propertyName}\n**Version:** ${version}\n**Network:** ${args.network}\n**Activation ID:** ${activationId}\n\nThe activation is still in progress. Continue monitoring with:\n\`\`\`\nGet activation progress ${activationId} for property ${args.propertyId}\n\`\`\``,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'activate property with monitoring',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Get detailed activation progress
 */
export async function getActivationProgress(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });

    const activation = response.activations?.items?.[0];
    if (!activation) {
      throw new Error('Activation not found');
    }

    const startTime = new Date(activation.submitDate).getTime();
    const progress = buildActivationProgress(activation, startTime);

    let responseText = `# Activation Progress\n\n`;
    responseText += `**Activation ID:** ${args.activationId}\n`;
    responseText += `**Property:** ${activation.propertyName} (v${activation.propertyVersion})\n`;
    responseText += `**Network:** ${activation.network}\n`;
    responseText += `**Status:** ${progress.status.state} - ${progress.status.message}\n\n`;

    // Progress bar
    const progressBar = generateProgressBar(progress.percentComplete);
    responseText += `**Progress:** ${progressBar} ${progress.percentComplete}%\n`;

    if (progress.currentZone) {
      responseText += `**Current Zone:** ${progress.currentZone}\n`;
    }

    if (progress.estimatedTimeRemaining) {
      const minutes = Math.ceil(progress.estimatedTimeRemaining / 60000);
      responseText += `**Estimated Time Remaining:** ${minutes} minutes\n`;
    }

    responseText += `**Started:** ${new Date(activation.submitDate).toLocaleString()}\n`;
    responseText += `**Last Update:** ${new Date(activation.updateDate).toLocaleString()}\n\n`;

    // Errors and warnings
    if (progress.errors && progress.errors.length > 0) {
      responseText += `### ❌ Errors (${progress.errors.length})\n`;
      progress.errors.forEach((error, index) => {
        responseText += `${index + 1}. **${error.type}**: ${error.detail}\n`;
      });
      responseText += '\n';
    }

    if (progress.warnings && progress.warnings.length > 0) {
      responseText += `### ⚠️ Warnings (${progress.warnings.length})\n`;
      progress.warnings.forEach((warning, index) => {
        responseText += `${index + 1}. **${warning.type}**: ${warning.detail}\n`;
      });
      responseText += '\n';
    }

    // Next steps based on status
    responseText += `### Next Steps\n`;
    if (progress.status.state === 'ACTIVE') {
      responseText += `✅ Activation completed successfully!\n`;
      responseText += `- Test your property: https://${activation.propertyName}\n`;
      responseText += `- Monitor performance in Control Center\n`;
    } else if (progress.status.state === 'FAILED' || progress.status.state === 'ABORTED') {
      responseText += `❌ Activation failed. Options:\n`;
      responseText += `1. Review errors above and fix issues\n`;
      responseText += `2. Create new property version with fixes\n`;
      responseText += `3. Contact Akamai support with activation ID\n`;
    } else {
      responseText += `⏳ Activation in progress...\n`;
      responseText += `- Continue monitoring this activation\n`;
      responseText += `- Check again in a few minutes\n`;
    }

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'get activation progress',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

// Helper functions

function getErrorResolution(error: any): string {
  const resolutions: Record<string, string> = {
    'missing_required_behavior': 'Add the required behavior to your rule tree',
    'invalid_criteria': 'Update the criteria to use valid values',
    'deprecated_behavior': 'Replace with the recommended alternative behavior',
    'origin_not_reachable': 'Verify origin server is accessible and configured correctly',
    'certificate_not_ready': 'Wait for certificate validation to complete',
  };

  return resolutions[error.type] || 'Review the error details and update configuration';
}

async function checkCertificateStatus(hostnames: any[], network: string): Promise<PreflightCheck> {
  // In a real implementation, this would check actual certificate status
  const httpsHostnames = hostnames.filter(h => h.cnameTo?.includes('edgekey'));
  
  if (httpsHostnames.length === 0) {
    return {
      name: 'HTTPS Certificate Status',
      status: 'PASSED',
      message: 'No HTTPS hostnames configured',
    };
  }

  // Check for certificate status in hostname data
  const missingCerts = httpsHostnames.filter(h => {
    const certStatus = h.certStatus?.[network.toLowerCase()];
    return !certStatus || certStatus.length === 0 || certStatus[0].status !== 'DEPLOYED';
  });

  if (missingCerts.length > 0) {
    return {
      name: 'HTTPS Certificate Status',
      status: 'WARNING',
      message: `${missingCerts.length} hostname(s) missing valid certificates`,
      details: `Hostnames without certificates: ${missingCerts.map(h => h.cnameFrom).join(', ')}`,
    };
  }

  return {
    name: 'HTTPS Certificate Status',
    status: 'PASSED',
    message: `All ${httpsHostnames.length} HTTPS hostname(s) have valid certificates`,
  };
}

async function checkOriginConnectivity(client: AkamaiClient, propertyId: string, version: number): Promise<PreflightCheck> {
  try {
    // Get property rules to find origin configuration
    const rulesResponse = await client.request({
      path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
      method: 'GET',
    });

    // Find origin behavior
    const findOrigin = (rules: any): string | null => {
      if (rules.behaviors) {
        for (const behavior of rules.behaviors) {
          if (behavior.name === 'origin' && behavior.options?.hostname) {
            return behavior.options.hostname;
          }
        }
      }
      if (rules.children) {
        for (const child of rules.children) {
          const origin = findOrigin(child);
          if (origin) return origin;
        }
      }
      return null;
    };

    const originHostname = findOrigin(rulesResponse.rules);

    if (!originHostname) {
      return {
        name: 'Origin Connectivity',
        status: 'WARNING',
        message: 'No origin hostname found in configuration',
        details: 'Verify origin behavior is properly configured',
      };
    }

    return {
      name: 'Origin Connectivity',
      status: 'PASSED',
      message: `Origin configured: ${originHostname}`,
      details: 'Note: Actual connectivity test not performed',
    };
  } catch (error) {
    return {
      name: 'Origin Connectivity',
      status: 'WARNING',
      message: 'Could not verify origin configuration',
      details: 'Manual verification recommended',
    };
  }
}

function generateActivationSuggestions(validation: ValidationResult): string[] {
  const suggestions: string[] = [];

  // Check for common issues
  const hasRuleErrors = validation.errors.some(e => e.location?.includes('/rules'));
  const hasHostnameErrors = validation.preflightChecks.some(c => 
    c.name.includes('Hostname') && c.status === 'FAILED'
  );
  const hasCertErrors = validation.preflightChecks.some(c => 
    c.name.includes('Certificate') && c.status !== 'PASSED'
  );

  if (hasRuleErrors) {
    suggestions.push('Fix rule validation errors by updating property rules');
    suggestions.push('Use "Get property rules" to review current configuration');
  }

  if (hasHostnameErrors) {
    suggestions.push('Add at least one hostname to the property');
    suggestions.push('Use "Add hostname to property" to configure hostnames');
  }

  if (hasCertErrors) {
    suggestions.push('Ensure all HTTPS hostnames have valid certificates');
    suggestions.push('Use "Create DV enrollment" to request new certificates');
  }

  if (validation.errors.some(e => e.type === 'CONCURRENT_ACTIVATION')) {
    suggestions.push('Wait for current activation to complete');
    suggestions.push('Or cancel the pending activation if needed');
  }

  return suggestions;
}

function buildActivationProgress(activation: any, startTime: number): ActivationProgress {
  const now = Date.now();
  const elapsed = now - startTime;
  
  // Calculate percentage based on status
  const statusPercentages: Record<string, number> = {
    'PENDING': 5,
    'ZONE_1': 25,
    'ZONE_2': 50,
    'ZONE_3': 75,
    'ACTIVE': 100,
    'FAILED': 0,
    'ABORTED': 0,
    'DEACTIVATED': 0,
  };

  const percentComplete = statusPercentages[activation.status] || 0;

  // Estimate remaining time based on network and progress
  const estimatedTotalTime = activation.network === 'PRODUCTION' ? 1800000 : 600000; // 30min : 10min
  const estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsed);

  // Build status message
  const statusMessages: Record<string, string> = {
    'PENDING': 'Preparing activation',
    'ZONE_1': 'Deploying to first zone',
    'ZONE_2': 'Deploying to second zone',
    'ZONE_3': 'Deploying to third zone',
    'ACTIVE': 'Activation complete',
    'FAILED': 'Activation failed',
    'ABORTED': 'Activation aborted',
    'DEACTIVATED': 'Property deactivated',
  };

  return {
    activationId: activation.activationId,
    propertyId: activation.propertyId,
    version: activation.propertyVersion,
    network: activation.network,
    status: {
      state: activation.status,
      message: statusMessages[activation.status] || activation.status,
      details: activation.fatalError,
    },
    percentComplete,
    currentZone: activation.status.startsWith('ZONE_') ? activation.status : undefined,
    estimatedTimeRemaining: activation.status === 'ACTIVE' ? 0 : estimatedTimeRemaining,
    startTime: new Date(activation.submitDate),
    lastUpdateTime: new Date(activation.updateDate),
    errors: activation.errors,
    warnings: activation.warnings,
  };
}

function getProgressiveDelay(elapsedTime: number): number {
  if (elapsedTime < 120000) return 5000;      // First 2 minutes: 5 seconds
  if (elapsedTime < 420000) return 10000;     // Next 5 minutes: 10 seconds
  if (elapsedTime < 1020000) return 30000;    // Next 10 minutes: 30 seconds
  return 60000;                                // After 17 minutes: 60 seconds
}

function generateProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function formatActivationSuccess(property: any, version: number, network: string, progress: ActivationProgress): string {
  const duration = Date.now() - progress.startTime.getTime();
  const minutes = Math.round(duration / 60000);

  return `✅ **Activation Completed Successfully!**\n\n` +
    `**Property:** ${property.propertyName}\n` +
    `**Version:** ${version}\n` +
    `**Network:** ${network}\n` +
    `**Duration:** ${minutes} minutes\n\n` +
    `## What's Next?\n` +
    `1. **Test your property**: Visit your website to verify changes\n` +
    `2. **Monitor performance**: Check Control Center for metrics\n` +
    `3. **Clear cache if needed**: Use Fast Purge for immediate updates\n\n` +
    `${network === 'STAGING' ? '💡 **Tip**: Test thoroughly before activating to PRODUCTION' : '🎉 **Congratulations!** Your property is now live in production.'}`;
}

function formatActivationFailure(property: any, version: number, network: string, progress: ActivationProgress): string {
  let response = `❌ **Activation Failed**\n\n` +
    `**Property:** ${property.propertyName}\n` +
    `**Version:** ${version}\n` +
    `**Network:** ${network}\n` +
    `**Status:** ${progress.status.state}\n`;

  if (progress.status.details) {
    response += `**Error:** ${progress.status.details}\n`;
  }

  response += `\n## Error Details\n`;

  if (progress.errors && progress.errors.length > 0) {
    progress.errors.forEach((error, index) => {
      response += `${index + 1}. **${error.type}**: ${error.detail}\n`;
    });
  }

  response += `\n## Recommended Actions\n`;
  response += `1. Review the errors above\n`;
  response += `2. Create a new property version with fixes\n`;
  response += `3. Validate the new version before activation\n`;
  response += `4. Contact support if the issue persists (Activation ID: ${progress.activationId})\n`;

  return response;
}

async function rollbackActivation(client: AkamaiClient, propertyId: string, network: string): Promise<void> {
  try {
    // Get previous stable version
    const activationsResponse = await client.request({
      path: `/papi/v1/properties/${propertyId}/activations`,
      method: 'GET',
    });

    const previousActivation = activationsResponse.activations?.items
      ?.filter((a: any) => a.network === network && a.status === 'ACTIVE')
      ?.sort((a: any, b: any) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime())[1];

    if (previousActivation) {
      // Attempt to reactivate previous version
      await client.request({
        path: `/papi/v1/properties/${propertyId}/activations`,
        method: 'POST',
        body: {
          propertyVersion: previousActivation.propertyVersion,
          network: network,
          note: `Automatic rollback due to failed activation`,
          acknowledgeAllWarnings: true,
          fastPush: true,
        },
      });
    }
  } catch (error) {
    console.error('Rollback failed:', error);
  }
}

/**
 * Cancel a pending activation
 */
export async function cancelPropertyActivation(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  
  try {
    // Check activation status first
    const statusResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });

    const activation = statusResponse.activations?.items?.[0];
    if (!activation) {
      throw new Error('Activation not found');
    }

    if (activation.status !== 'PENDING') {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Cannot cancel activation\n\n**Activation ID:** ${args.activationId}\n**Current Status:** ${activation.status}\n\nOnly PENDING activations can be cancelled. This activation has already progressed beyond the cancellable stage.`,
        }],
      };
    }

    // Cancel the activation
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'DELETE',
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Activation cancelled successfully\n\n**Activation ID:** ${args.activationId}\n**Property:** ${activation.propertyName}\n**Version:** ${activation.propertyVersion}\n**Network:** ${activation.network}\n\nThe activation has been cancelled and will not proceed.`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'cancel property activation',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Create an activation plan for complex deployments
 */
export async function createActivationPlan(
  client: AkamaiClient,
  args: {
    properties: Array<{
      propertyId: string;
      version?: number;
      network: 'STAGING' | 'PRODUCTION';
    }>;
    strategy?: 'PARALLEL' | 'SEQUENTIAL' | 'DEPENDENCY_ORDERED';
    dependencies?: Record<string, string[]>;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const strategy = args.strategy || 'SEQUENTIAL';
  
  try {
    // Validate all properties exist and get details
    const propertyDetails = await Promise.all(
      args.properties.map(async (prop) => {
        const response = await client.request({
          path: `/papi/v1/properties/${prop.propertyId}`,
          method: 'GET',
        });
        
        if (!response.properties?.items?.[0]) {
          throw new Error(`Property ${prop.propertyId} not found`);
        }
        
        return {
          ...prop,
          details: response.properties.items[0],
        };
      })
    );

    // Build activation plan
    let responseText = `# Activation Plan\n\n`;
    responseText += `**Strategy:** ${strategy}\n`;
    responseText += `**Properties:** ${propertyDetails.length}\n\n`;

    responseText += `## Deployment Order\n`;

    if (strategy === 'DEPENDENCY_ORDERED' && args.dependencies) {
      // Sort by dependencies
      const sorted = topologicalSort(propertyDetails, args.dependencies);
      responseText += formatDeploymentOrder(sorted);
    } else if (strategy === 'SEQUENTIAL') {
      responseText += formatDeploymentOrder(propertyDetails);
    } else {
      responseText += 'All properties will be activated in parallel.\n\n';
      propertyDetails.forEach((prop, index) => {
        responseText += `${index + 1}. **${prop.details.propertyName}** (${prop.propertyId}) → ${prop.network}\n`;
      });
    }

    responseText += `\n## Estimated Timeline\n`;
    const estimatedTime = calculateEstimatedTime(propertyDetails, strategy);
    responseText += `- **Total Duration:** ${estimatedTime.total} minutes\n`;
    responseText += `- **Start Time:** Now\n`;
    responseText += `- **Completion:** ~${new Date(Date.now() + estimatedTime.total * 60000).toLocaleTimeString()}\n`;

    responseText += `\n## Pre-Activation Checklist\n`;
    responseText += `- [ ] All properties validated\n`;
    responseText += `- [ ] Certificates ready for HTTPS hostnames\n`;
    responseText += `- [ ] Origin servers accessible\n`;
    responseText += `- [ ] Notification emails configured\n`;
    responseText += `- [ ] Rollback plan prepared\n`;

    responseText += `\n## Execute Plan\n`;
    responseText += `To execute this activation plan:\n`;
    responseText += `\`\`\`\nExecute activation plan for ${propertyDetails.length} properties\n\`\`\``;

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'create activation plan',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

function topologicalSort(properties: any[], dependencies: Record<string, string[]>): any[] {
  // Simple topological sort for dependency ordering
  const sorted: any[] = [];
  const visited = new Set<string>();
  
  const visit = (propId: string) => {
    if (visited.has(propId)) return;
    visited.add(propId);
    
    const deps = dependencies[propId] || [];
    deps.forEach(dep => visit(dep));
    
    const prop = properties.find(p => p.propertyId === propId);
    if (prop) sorted.push(prop);
  };
  
  properties.forEach(prop => visit(prop.propertyId));
  return sorted;
}

function formatDeploymentOrder(properties: any[]): string {
  let text = '';
  properties.forEach((prop, index) => {
    const version = prop.version || prop.details.latestVersion;
    text += `${index + 1}. **${prop.details.propertyName}** (${prop.propertyId} v${version}) → ${prop.network}\n`;
    if (index < properties.length - 1) {
      text += `   ↓\n`;
    }
  });
  return text;
}

function calculateEstimatedTime(properties: any[], strategy: string): { total: number } {
  const baseTime = properties.reduce((sum, prop) => {
    return sum + (prop.network === 'PRODUCTION' ? 30 : 10);
  }, 0);
  
  if (strategy === 'PARALLEL') {
    // Max time of any single activation
    return { 
      total: Math.max(...properties.map(p => p.network === 'PRODUCTION' ? 30 : 10))
    };
  }
  
  return { total: baseTime };
}