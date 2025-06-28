/**
 * CODE KAI: Enhanced Property Activation Tools
 * World-class property activation with comprehensive validation
 * No shortcuts - every operation validated with proper error handling
 */

import { z } from 'zod';
import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { 
  BaseToolArgs, 
  ToolError, 
  ToolDefinition,
  TIMEOUT_CONFIG
} from '../types/tool-infrastructure';
import { 
  withPropertyValidation,
  getPropertyContext
} from '../utils/property-validation';
import {
  executeWithTimeout,
  OperationType,
  withTimeout,
  ProgressReporter
} from '../utils/timeout-handler';
import { validateApiResponse } from '../utils/api-response-validator';
import { ErrorTranslator } from '../utils/errors';

/**
 * Validation result structure
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  preflightChecks: PreflightCheck[];
}

interface ValidationError {
  severity: 'CRITICAL' | 'ERROR';
  type: string;
  detail: string;
  location?: string;
  resolution?: string;
}

interface ValidationWarning {
  severity: 'WARNING' | 'INFO';
  type: string;
  detail: string;
  location?: string;
}

interface PreflightCheck {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  message: string;
  details?: string;
}

/**
 * Enhanced validate property activation arguments
 */
const ValidatePropertyActivationArgsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().regex(/^prp_\d+$/),
  version: z.number().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  timeout: z.number().optional()
});

type ValidatePropertyActivationArgs = z.infer<typeof ValidatePropertyActivationArgsSchema> & BaseToolArgs;

/**
 * Enhanced property activation validation
 * CODE KAI: Comprehensive validation with timeout handling and proper error context
 */
export async function validatePropertyActivationEnhanced(
  client: AkamaiClient,
  args: ValidatePropertyActivationArgs
): Promise<MCPToolResponse> {
  const validated = ValidatePropertyActivationArgsSchema.parse(args);
  const errorTranslator = new ErrorTranslator();

  return withPropertyValidation(
    client,
    validated,
    'validate_property_activation',
    'validate property for activation',
    async () => {
      return executeWithTimeout(
        async () => {
          const progress = new ProgressReporter(
            'property activation validation',
            validated.timeout || TIMEOUT_CONFIG.DEFAULT
          );

          progress.report('Fetching property details...');

          // Get property details with validated access
          const propertyResponse = await client.request(
            withTimeout({
              path: `/papi/v1/properties/${validated.propertyId}`,
              method: 'GET',
              customer: validated.customer,
            }, OperationType.PROPERTY_VALIDATION, validated.timeout)
          );

          const validatedPropertyResponse = validateApiResponse<{ 
            properties?: { 
              items?: Array<{
                propertyId: string;
                propertyName: string;
                contractId: string;
                groupId: string;
                latestVersion: number;
                productionVersion?: number;
                stagingVersion?: number;
              }> 
            } 
          }>(propertyResponse);

          const property = validatedPropertyResponse.properties?.items?.[0];
          if (!property) {
            throw new ToolError({
              operation: 'validate property activation',
              toolName: 'validate_property_activation',
              args: validated,
              propertyId: validated.propertyId,
              customer: validated.customer,
              suggestion: 'Property not found in response'
            });
          }

          const version = validated.version || property.latestVersion || 1;
          const validation: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            preflightChecks: [],
          };

          progress.report('Checking rule validation...');

          // 1. Check rule validation
          const rulesValidation = await client.request(
            withTimeout({
              path: `/papi/v1/properties/${validated.propertyId}/versions/${version}/rules/errors`,
              method: 'GET',
              customer: validated.customer,
            }, OperationType.DEFAULT, validated.timeout)
          );

          const validatedRulesValidation = validateApiResponse<{ 
            errors?: any[], 
            warnings?: any[] 
          }>(rulesValidation);

          if (validatedRulesValidation.errors && validatedRulesValidation.errors.length > 0) {
            validation.valid = false;
            validatedRulesValidation.errors.forEach((error: any) => {
              validation.errors.push({
                severity: error.type === 'error' ? 'CRITICAL' : 'ERROR',
                type: error.type,
                detail: error.detail,
                location: error.errorLocation,
                resolution: getErrorResolution(error),
              });
            });
          }

          if (validatedRulesValidation.warnings && validatedRulesValidation.warnings.length > 0) {
            validatedRulesValidation.warnings.forEach((warning: any) => {
              validation.warnings.push({
                severity: 'WARNING',
                type: warning.type,
                detail: warning.detail,
                location: warning.errorLocation,
              });
            });
          }

          progress.report('Checking hostname configuration...');

          // 2. Check hostname configuration
          const hostnamesResponse = await client.request(
            withTimeout({
              path: `/papi/v1/properties/${validated.propertyId}/versions/${version}/hostnames`,
              method: 'GET',
              customer: validated.customer,
            }, OperationType.DEFAULT, validated.timeout)
          );

          const validatedHostnamesResponse = validateApiResponse<{ 
            hostnames?: { items?: any[] } 
          }>(hostnamesResponse);
          const hostnames = validatedHostnamesResponse.hostnames?.items || [];

          validation.preflightChecks.push({
            name: 'Hostname Configuration',
            status: hostnames.length > 0 ? 'PASSED' : 'FAILED',
            message:
              hostnames.length > 0
                ? `${hostnames.length} hostname(s) configured`
                : 'No hostnames configured',
            details: hostnames.length === 0 ? 'Add at least one hostname before activation' : undefined,
          });

          // 3. Check edge hostname configuration
          const validEdgeHostnames = hostnames.filter((h: any) => h.edgeHostnameId);
          if (validEdgeHostnames.length < hostnames.length) {
            validation.errors.push({
              severity: 'ERROR',
              type: 'MISSING_EDGE_HOSTNAME',
              detail: 'Some hostnames are missing edge hostname configuration',
              resolution: 'Configure edge hostnames for all property hostnames',
            });
            validation.valid = false;
          }

          // 4. Check activation conflicts
          if (validated.network === 'PRODUCTION' && !property.stagingVersion) {
            validation.warnings.push({
              severity: 'WARNING',
              type: 'NO_STAGING_ACTIVATION',
              detail: 'Property has never been activated to staging',
            });
          }

          // 5. Version comparison check
          const currentVersion =
            validated.network === 'PRODUCTION' ? property.productionVersion : property.stagingVersion;

          if (currentVersion && currentVersion === version) {
            validation.warnings.push({
              severity: 'INFO',
              type: 'VERSION_ALREADY_ACTIVE',
              detail: `Version ${version} is already active in ${validated.network}`,
            });
          }

          progress.report('Generating validation report...');

          // Generate suggestions based on validation results
          if (!validation.valid) {
            validation.suggestions = generateActivationSuggestions(validation);
          }

          // Format response for Claude Desktop
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  validation: {
                    valid: validation.valid,
                    property: {
                      propertyId: property.propertyId,
                      propertyName: property.propertyName,
                      version: version,
                      network: validated.network
                    },
                    errors: validation.errors,
                    warnings: validation.warnings,
                    preflightChecks: validation.preflightChecks,
                    suggestions: validation.suggestions
                  },
                  metadata: {
                    customer: validated.customer || 'default',
                    validatedAt: new Date().toISOString()
                  }
                }, null, 2)
              }
            ]
          };
        },
        {
          operationType: OperationType.PROPERTY_VALIDATION,
          toolName: 'validate_property_activation',
          operationName: 'validate property activation',
          timeout: validated.timeout,
          context: validated
        }
      );
    }
  );
}

/**
 * Get error resolution suggestions
 */
function getErrorResolution(error: any): string {
  if (error.type === 'MISSING_REQUIRED_BEHAVIOR') {
    return 'Add the required behavior to your rule tree';
  }
  if (error.type === 'INVALID_ORIGIN') {
    return 'Check origin hostname configuration and ensure it is reachable';
  }
  if (error.type === 'MISSING_CERTIFICATE') {
    return 'Configure SSL certificate for HTTPS delivery';
  }
  return 'Check the Property Manager documentation for this error type';
}

/**
 * Generate activation suggestions
 */
function generateActivationSuggestions(validation: ValidationResult): string[] {
  const suggestions: string[] = [];

  if (validation.errors.some(e => e.type === 'MISSING_REQUIRED_BEHAVIOR')) {
    suggestions.push('Review and add all required behaviors for your product');
  }

  if (validation.errors.some(e => e.type === 'MISSING_EDGE_HOSTNAME')) {
    suggestions.push('Create edge hostnames for all property hostnames');
  }

  if (validation.errors.some(e => e.type === 'INVALID_ORIGIN')) {
    suggestions.push('Verify origin server is accessible and configured correctly');
  }

  if (validation.warnings.some(w => w.type === 'NO_STAGING_ACTIVATION')) {
    suggestions.push('Consider testing in staging environment first');
  }

  return suggestions;
}

/**
 * Enhanced activate property arguments
 */
const ActivatePropertyArgsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().regex(/^prp_\d+$/),
  version: z.number(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string().optional(),
  notificationEmails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().default(false),
  timeout: z.number().optional()
});

type ActivatePropertyArgs = z.infer<typeof ActivatePropertyArgsSchema> & BaseToolArgs;

/**
 * Enhanced property activation with monitoring
 */
export async function activatePropertyEnhanced(
  client: AkamaiClient,
  args: ActivatePropertyArgs
): Promise<MCPToolResponse> {
  const validated = ActivatePropertyArgsSchema.parse(args);

  // First validate the property
  const validationResult = await validatePropertyActivationEnhanced(client, {
    ...validated,
    version: validated.version
  });

  const validationData = JSON.parse(validationResult.content[0].text);
  
  if (!validationData.validation.valid && !validated.acknowledgeWarnings) {
    throw new ToolError({
      operation: 'activate property',
      toolName: 'activate_property',
      args: validated,
      propertyId: validated.propertyId,
      customer: validated.customer,
      suggestion: 'Property validation failed. Fix errors or set acknowledgeWarnings=true to proceed'
    });
  }

  return withPropertyValidation(
    client,
    validated,
    'activate_property',
    'activate property version',
    async () => {
      return executeWithTimeout(
        async () => {
          const progress = new ProgressReporter(
            'property activation',
            validated.timeout || TIMEOUT_CONFIG.ACTIVATION
          );

          progress.report('Initiating property activation...');

          const response = await client.request(
            withTimeout({
              path: `/papi/v1/properties/${validated.propertyId}/activations`,
              method: 'POST',
              data: {
                propertyVersion: validated.version,
                network: validated.network,
                note: validated.note || `Activated via MCP at ${new Date().toISOString()}`,
                notifyEmails: validated.notificationEmails || [],
                acknowledgeWarnings: validated.acknowledgeWarnings || []
              },
              customer: validated.customer
            }, OperationType.PROPERTY_ACTIVATE, validated.timeout)
          );

          const activationLink = response.activationLink;
          if (!activationLink) {
            throw new ToolError({
              operation: 'activate property',
              toolName: 'activate_property',
              args: validated,
              propertyId: validated.propertyId,
              customer: validated.customer,
              suggestion: 'Activation response missing activationLink'
            });
          }

          const activationId = activationLink.split('/').pop();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  activation: {
                    started: true,
                    activationId,
                    propertyId: validated.propertyId,
                    version: validated.version,
                    network: validated.network,
                    estimatedTime: validated.network === 'PRODUCTION' ? '5-10 minutes' : '3-5 minutes'
                  },
                  nextSteps: [
                    `Check status: get_activation_status propertyId="${validated.propertyId}" activationId="${activationId}"`,
                    `Monitor progress: activation typically takes ${validated.network === 'PRODUCTION' ? '5-10' : '3-5'} minutes`,
                    'Check email for activation completion notification'
                  ],
                  metadata: {
                    customer: validated.customer || 'default',
                    startedAt: new Date().toISOString()
                  }
                }, null, 2)
              }
            ]
          };
        },
        {
          operationType: OperationType.PROPERTY_ACTIVATE,
          toolName: 'activate_property',
          operationName: 'activate property',
          timeout: validated.timeout,
          context: validated
        }
      );
    }
  );
}

/**
 * Tool definitions for registration
 */
export const enhancedActivationTools: ToolDefinition[] = [
  {
    name: 'validate_property_activation',
    description: 'Validate property before activation with comprehensive checks',
    inputSchema: ValidatePropertyActivationArgsSchema,
    implementation: validatePropertyActivationEnhanced,
    examples: [
      {
        description: 'Validate property for staging activation',
        input: {
          propertyId: 'prp_1229270',
          network: 'STAGING'
        }
      }
    ]
  },
  {
    name: 'activate_property',
    description: 'Activate property version with validation and monitoring',
    inputSchema: ActivatePropertyArgsSchema,
    implementation: activatePropertyEnhanced,
    examples: [
      {
        description: 'Activate to staging',
        input: {
          propertyId: 'prp_1229270',
          version: 1,
          network: 'STAGING',
          note: 'Initial staging deployment'
        }
      }
    ]
  }
];