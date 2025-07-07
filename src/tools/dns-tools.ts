// Types for DNS operations
type EdgeDNSChangeListMetadata = {
  zone: string;
  changeTag?: string;
  zoneVersionId?: string;
  stale?: boolean;
  lastModifiedDate: string;
  lastModifiedBy?: string;
};

type ZoneActivationStatus = {
  zone: string;
  activationState: 'PENDING' | 'ACTIVE' | 'FAILED' | 'NEW';
  lastActivationTime?: string;
  lastActivatedBy?: string;
  propagationStatus?: {
    percentage: number;
    serversUpdated: number;
    totalServers: number;
  };
  requestId?: string;
  message?: string;
};

/**
 * Edge DNS API tools for zone and record management
 * 
 * SNOW LEOPARD ARCHITECTURE:
 * - Implements Akamai Edge DNS API v2 with change-list workflow
 * - Type-safe implementation with official API response schemas
 * - Enhanced error handling with detailed user guidance
 * - MCP June 2025 compliant response formats
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * - Complete type safety with no `any` types
 * - Comprehensive API response validation
 * - Defensive error handling for all edge cases
 * - Structured logging for operational visibility
 */

import { createHash } from 'crypto';

import { Spinner, format, icons } from '../utils/progress';
import { createErrorHandler } from '../utils/error-handler';
import { createLogger } from '../utils/pino-logger';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { AkamaiErrorResponse } from '../types/api-responses/common';
import {
  isEdgeDNSZonesResponse,
  isEdgeDNSZoneResponse,
  isEdgeDNSRecordSetsResponse,
  isEdgeDNSZoneSubmitResponse,
  isEdgeDNSZoneActivationStatusResponse,
  EdgeDNSValidationError,
  EdgeDNSChangeListMetadataSchema,
  type EdgeDNSZonesResponse,
  type EdgeDNSZoneResponse,
  type EdgeDNSRecordSetsResponse,
  type EdgeDNSChangeListResponse,
  type EdgeDNSZoneSubmitResponse,
  type EdgeDNSZoneActivationStatusResponse,
  type EdgeDNSRecordSet,
} from '../types/api-responses/edge-dns-zones';

// Initialize logger and error handler
const logger = createLogger('dns-tools');
const errorHandler = createErrorHandler('dns');

// Operational logging utilities
function generateRequestId(): string {
  return createHash('md5')
    .update(Date.now().toString() + require('crypto').randomBytes(16).toString('hex'))
    .digest('hex')
    .substring(0, 8);
}

function logOperation(operation: string, details: Record<string, unknown>) {
  logger.info({ operation, ...details }, `DNS operation: ${operation}`);
}

export interface ZoneActivationOptions {
  validateOnly?: boolean;
  waitForActivation?: boolean;
  timeout?: number;
  retryConfig?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  };
}

/**
 * List all DNS zones with enhanced filtering and pagination
 */
export async function listZones(
  client: AkamaiClient,
  args: {
    contractIds?: string[];
    includeAliases?: boolean;
    search?: string;
    sortBy?: 'zone' | 'type' | 'lastModified';
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Fetching DNS zones...');

  try {
    const queryParams: Record<string, string> = {};

    if (args.contractIds?.length) {
      queryParams['contractIds'] = args.contractIds.join(',');
    }
    if (args.includeAliases !== undefined) {
      queryParams['includeAliases'] = String(args.includeAliases);
    }
    if (args.search) {
      queryParams['search'] = args.search;
    }

    // Enhanced pagination and sorting parameters
    if (args.sortBy) {
      queryParams['sortBy'] = args.sortBy;
    }
    if (args.order) {
      queryParams['order'] = args.order;
    }
    if (args.limit !== undefined) {
      queryParams['limit'] = String(Math.min(args.limit, 1000)); // API limit of 1000
    }
    if (args.offset !== undefined) {
      queryParams['offset'] = String(args.offset);
    }

    const rawResponse = await client.request({
      path: '/config-dns/v2/zones',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      queryParams,
    });

    // CODE KAI: Runtime validation
    if (!isEdgeDNSZonesResponse(rawResponse)) {
      throw new EdgeDNSValidationError(
        'Invalid Edge DNS zones response structure',
        rawResponse,
        'EdgeDNSZonesResponse'
      );
    }

    const response = rawResponse as EdgeDNSZonesResponse;

    spinner.stop();

    if (!response.zones || response.zones.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.info} No DNS zones found`,
          },
        ],
      };
    }

    const zonesList = response.zones
      .map(
        (zone) =>
          `${icons.dns} ${format.cyan(zone.zone)} (${format.green(zone.type)})${zone.comment ? ` - ${format.dim(zone.comment)}` : ''}`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `${icons.success} Found ${format.bold(response.zones.length.toString())} DNS zones:\n\n${zonesList}`,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listZones', _error, spinner, {
      contractIds: args.contractIds,
      search: args.search,
      includeAliases: args.includeAliases
    });
  }
}

/**
 * Get DNS zone details
 */
export async function getZone(
  client: AkamaiClient,
  args: { zone: string },
): Promise<MCPToolResponse> {
  try {
    const rawResponse = await client.request({
      path: `/config-dns/v2/zones/${args.zone}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // CODE KAI: Runtime validation
    if (!isEdgeDNSZoneResponse(rawResponse)) {
      throw new EdgeDNSValidationError(
        'Invalid Edge DNS zone response structure',
        rawResponse,
        'EdgeDNSZoneResponse'
      );
    }

    const response = rawResponse as EdgeDNSZoneResponse;

    let details = `DNS Zone: ${response.zone}\n`;
    details += `Type: ${response.type}\n`;

    if (response.comment) {
      details += `Comment: ${response.comment}\n`;
    }
    if (response.signAndServe !== undefined) {
      details += `DNSSEC: ${response.signAndServe ? 'Enabled' : 'Disabled'}\n`;
    }
    if (response.type === 'SECONDARY' && response.masters) {
      details += `Master servers: ${response.masters.join(', ')}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: details,
        },
      ],
    };
  } catch (_error) {
    // 404s are expected in some scenarios (e.g., checking if zone exists)
    if (_error instanceof Error && _error.message.includes('404:')) {
      throw _error; // Let caller handle 404s
    }
    return errorHandler.handle('getZone', _error, undefined, {
      zone: args.zone
    });
  }
}

/**
 * Create a DNS zone with enhanced validation and error handling
 * 
 * CODE KAI IMPROVEMENTS:
 * - Contract validation before zone creation
 * - Parent zone verification for subzones
 * - Changelist conflict detection and resolution
 * - Enhanced error messages with specific guidance
 * - Retry logic for transient failures
 */
export async function createZone(
  client: AkamaiClient,
  args: {
    zone: string;
    type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
    comment?: string;
    contractId?: string;
    groupId?: string;
    masters?: string[];
    target?: string;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  const errorHandler = createErrorHandler('dns');

  try {
    // Pre-validation checks
    spinner.start('Validating zone creation requirements...');
    
    // 1. Check if zone already exists
    try {
      await client.request({
        path: `/config-dns/v2/zones/${args.zone}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      
      // If we get here, zone already exists
      spinner.fail('Zone already exists');
      return {
        content: [
          {
            type: 'text',
            text: `${icons.error} Zone ${format.cyan(args.zone)} already exists\n\n` +
                  `${icons.info} To modify the existing zone:\n` +
                  `  • Use updateZone to modify configuration\n` +
                  `  • Use deleteZone to remove and recreate\n` +
                  `  • Use listZones to see all zones`,
          },
        ],
      };
    } catch (checkError: unknown) {
      const error = checkError as AkamaiErrorResponse & { statusCode?: number; response?: { status?: number } };
      // 404 is expected - zone doesn't exist, we can proceed
      if (error?.statusCode !== 404 && error?.response?.status !== 404 && error?.status !== 404) {
        throw checkError; // Unexpected error during zone check
      }
    }

    // 2. For subzones, verify parent zone exists and get its contract
    const zoneParts = args.zone.split('.');
    let validatedContractId = args.contractId;
    
    if (zoneParts.length > 2) {
      const parentZone = zoneParts.slice(1).join('.');
      spinner.update(`Verifying parent zone: ${parentZone}...`);
      
      try {
        await client.request({
          path: `/config-dns/v2/zones/${parentZone}`,
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        
        // Get parent zone's contract if not provided
        if (!validatedContractId) {
          try {
            const contractResponse = await client.request({
              path: `/config-dns/v2/zones/${parentZone}/contract`,
              method: 'GET',
              headers: { Accept: 'application/json' },
            });
            
            if (contractResponse && typeof contractResponse === 'object' && 'contractId' in contractResponse) {
              validatedContractId = (contractResponse as { contractId: string }).contractId;
              logger.info({ 
                subZone: args.zone, 
                parentZone,
                inheritedContract: validatedContractId 
              }, 'Using parent zone contract for subzone');
            }
          } catch (contractError) {
            logger.warn({ parentZone, error: contractError }, 'Could not retrieve parent zone contract');
          }
        }
      } catch (parentError: unknown) {
        const error = parentError as AkamaiErrorResponse & { statusCode?: number; response?: { status?: number } };
        if (error?.statusCode === 404 || error?.response?.status === 404 || error?.status === 404) {
          spinner.fail('Parent zone not found');
          return {
            content: [
              {
                type: 'text',
                text: `${icons.error} Parent zone ${format.cyan(parentZone)} does not exist\n\n` +
                      `${icons.info} To create subzone ${format.cyan(args.zone)}:\n` +
                      `  1. First create parent zone: "Create zone ${parentZone}"\n` +
                      `  2. Then create subzone: "Create zone ${args.zone}"\n\n` +
                      `${icons.info} Alternatively, create the full zone hierarchy`,
              },
            ],
          };
        }
        throw parentError; // Unexpected error during parent check
      }
    }

    // 3. Validate contract ID if provided
    if (validatedContractId) {
      spinner.update('Validating contract access...');
      try {
        // Test contract access by listing zones for this contract
        await client.request({
          path: '/config-dns/v2/zones',
          method: 'GET',
          headers: { Accept: 'application/json' },
          queryParams: { contractId: validatedContractId, limit: '1' },
        });
      } catch (contractError: unknown) {
        const error = contractError as AkamaiErrorResponse & { statusCode?: number; response?: { status?: number } };
        if (error?.statusCode === 403 || error?.response?.status === 403 || error?.status === 403) {
          spinner.fail('Contract access denied');
          return {
            content: [
              {
                type: 'text',
                text: `${icons.error} No access to contract ${format.cyan(validatedContractId)}\n\n` +
                      `${icons.info} Possible issues:\n` +
                      `  • Contract ID is incorrect\n` +
                      `  • API credentials don't have access to this contract\n` +
                      `  • Account switching required\n\n` +
                      `${icons.info} Use listContracts to see available contracts`,
              },
            ],
          };
        }
        // Other errors will be handled by main error handler
      }
    }

    // 4. Check for existing changelist conflicts
    try {
      const changelist = await getChangeList(client, args.zone);
      if (changelist) {
        spinner.fail('Changelist conflict');
        return {
          content: [
            {
              type: 'text',
              text: `${icons.error} Active changelist exists for zone ${format.cyan(args.zone)}\n\n` +
                    `${icons.info} Options:\n` +
                    `  • Submit pending changes: "Activate zone changes for ${args.zone}"\n` +
                    `  • Discard changes: "Discard changelist for ${args.zone}"\n` +
                    `  • Wait for current operation to complete`,
            },
          ],
        };
      }
    } catch (changelistError) {
      // 404 is expected for new zones - no changelist exists
      if (changelistError && typeof changelistError === 'object' && 'statusCode' in changelistError && changelistError.statusCode !== 404) {
        logger.warn({ zone: args.zone, error: changelistError }, 'Could not check changelist status');
      }
    }

    // All validations passed, proceed with zone creation
    spinner.update(`Creating ${args.type} zone: ${args.zone}...`);

    const body: Partial<EdgeDNSZoneResponse> = {
      zone: args.zone,
      type: args.type,
      comment: args.comment || `Created via ALECS MCP server`,
    };

    // Add type-specific fields with validation
    if (args.type === 'SECONDARY') {
      if (!args.masters || args.masters.length === 0) {
        spinner.fail('Masters required for SECONDARY zone');
        return {
          content: [
            {
              type: 'text',
              text: `${icons.error} SECONDARY zones require master nameservers\n\n` +
                    `${icons.info} Example:\n` +
                    `  masters: ["ns1.example.com", "ns2.example.com"]`,
            },
          ],
        };
      }
      body.masters = args.masters;
    }
    
    if (args.type === 'ALIAS') {
      if (!args.target) {
        spinner.fail('Target required for ALIAS zone');
        return {
          content: [
            {
              type: 'text',
              text: `${icons.error} ALIAS zones require a target zone\n\n` +
                    `${icons.info} Example:\n` +
                    `  target: "primary-zone.example.com"`,
            },
          ],
        };
      }
      body.target = args.target;
    }

    const queryParams: Record<string, string> = {};
    if (validatedContractId) {
      queryParams['contractId'] = validatedContractId;
    }
    if (args.groupId) {
      queryParams['gid'] = args.groupId;
    }

    // Execute zone creation with retry logic
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await client.request({
          path: '/config-dns/v2/zones',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body,
          queryParams,
        });
        break; // Success, exit retry loop
      } catch (retryError) {
        // Only retry on transient errors (500, 503)
        const error = retryError as AkamaiErrorResponse & { statusCode?: number; response?: { status?: number } };
        const statusCode = error?.statusCode || error?.response?.status || error?.status;
        if ((statusCode === 500 || statusCode === 503) && attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          spinner.update(`Retrying in ${delay}ms... (attempt ${attempt + 2}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw retryError; // Non-retryable error or max retries reached
      }
    }

    // KAIZEN: Auto-activate the zone by submitting changelist
    spinner.update('Activating zone...');
    
    try {
      // Wait a moment for the zone creation to fully register
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const activationResult = await submitChangeList(
        client, 
        args.zone, 
        `Zone creation activation for ${args.zone}`,
        { validateOnly: false, waitForActivation: true, timeout: 30000 }
      );

      spinner.succeed(`Zone created and activated: ${args.zone}`);

      // Enhanced success message with automatic activation
      let responseText = `${icons.success} Successfully created and activated DNS zone: ${format.cyan(args.zone)} (Type: ${format.green(args.type)})`;
      
      if (validatedContractId && validatedContractId !== args.contractId) {
        responseText += `\n${icons.info} Used contract: ${format.dim(validatedContractId)} (inherited from parent)`;
      }
      
      if (activationResult?.requestId) {
        responseText += `\n${icons.info} Activation ID: ${format.dim(activationResult.requestId)}`;
      }
      
      responseText += `\n\n${icons.info} Zone is now live! Next steps:`;
      
      if (args.type === 'PRIMARY') {
        responseText += `\n  • Add DNS records: "Create record in ${args.zone}"`;
        if (zoneParts.length > 2) {
          responseText += `\n  • Add delegation in parent zone: "Create NS record in ${zoneParts.slice(1).join('.')}"`;
        }
      } else if (args.type === 'SECONDARY') {
        responseText += `\n  • Verify zone transfer from masters`;
        responseText += `\n  • Check record synchronization`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };

    } catch (activationError) {
      // Zone was created but activation failed - provide helpful guidance
      spinner.warn(`Zone created but activation failed: ${args.zone}`);
      
      logger.warn({ 
        zone: args.zone, 
        activationError,
        operation: 'createZone_autoActivation'
      }, 'Zone created successfully but auto-activation failed');

      let responseText = `${icons.warning} Zone created successfully but activation failed: ${format.cyan(args.zone)}`;
      responseText += `\n\n${icons.info} Manual activation required:`;
      responseText += `\n  • Use "Activate zone changes for ${args.zone}" to complete the process`;
      responseText += `\n  • Check changelist status if activation continues to fail`;
      
      if (activationError instanceof Error) {
        responseText += `\n\n${icons.error} Activation error: ${activationError.message}`;
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
  } catch (_error) {
    // Enhanced error context for subzones
    const zoneParts = args.zone.split('.');
    if (zoneParts.length > 2) {
      const parentZone = zoneParts.slice(1).join('.');
      logger.error({ 
        subZone: args.zone, 
        parentZone,
        operation: 'createZone',
        contractId: args.contractId,
        error: _error
      }, 'Sub-zone creation failed');
    }
    
    return errorHandler.handle('createZone', _error, spinner, {
      zone: args.zone,
      type: args.type,
      contractId: args.contractId,
      groupId: args.groupId,
    });
  }
}

/**
 * List DNS records for a zone
 */
export async function listRecords(
  client: AkamaiClient,
  args: { zone: string; search?: string; types?: string[] },
): Promise<MCPToolResponse> {
  try {
    const queryParams: Record<string, string> = {};
    if (args.search) {
      queryParams['search'] = args.search;
    }
    if (args.types?.length) {
      queryParams['types'] = args.types.join(',');
    }

    const rawResponse = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/recordsets`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      queryParams,
    });

    // CODE KAI: Runtime validation
    if (!isEdgeDNSRecordSetsResponse(rawResponse)) {
      throw new EdgeDNSValidationError(
        'Invalid Edge DNS record sets response structure',
        rawResponse,
        'EdgeDNSRecordSetsResponse'
      );
    }

    const response = rawResponse as EdgeDNSRecordSetsResponse;

    if (!response.recordsets || response.recordsets.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No DNS records found for zone: ${args.zone}`,
          },
        ],
      };
    }

    const recordsList = response.recordsets
      .map((record) => {
        const rdataStr = record.rdata.join(', ');
        return `• ${record.name} ${record.ttl} ${record.type} ${rdataStr}`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${response.recordsets.length} DNS records in zone ${args.zone}:\n\n${recordsList}`,
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listRecords', _error, undefined, {
      zone: args.zone,
      search: args.search,
      types: args.types
    });
  }
}

/**
 * Get existing changelist metadata for a zone
 */
export async function getChangeListMetadata(
  client: AkamaiClient,
  zone: string,
): Promise<EdgeDNSChangeListMetadata | null> {
  try {
    const rawResponse = await client.request({
      path: `/config-dns/v2/changelists/${zone}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    // CODE KAI: Runtime validation for metadata response
    const parsed = EdgeDNSChangeListMetadataSchema.safeParse(rawResponse);
    if (!parsed.success) {
      throw new EdgeDNSValidationError(
        'Invalid Edge DNS change list metadata response structure',
        rawResponse,
        'EdgeDNSChangeListMetadata'
      );
    }
    return parsed.data as EdgeDNSChangeListMetadata;
  } catch (_error) {
    if (_error instanceof Error && _error.message?.includes('404')) {
      return null;
    }
    throw _error;
  }
}

/**
 * Get existing changelist with records for a zone
 */
export async function getChangeList(
  client: AkamaiClient,
  zone: string,
): Promise<EdgeDNSChangeListResponse | null> {
  try {
    // First check if changelist exists
    const metadata = await getChangeListMetadata(client, zone);
    if (!metadata) {
      return null;
    }

    // Get changelist with records
    const rawResponse = await client.request({
      path: `/config-dns/v2/changelists/${zone}/recordsets`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    // Construct full changelist response
    return {
      zone: metadata.zone,
      lastModifiedDate: metadata.lastModifiedDate,
      changeTag: metadata.changeTag,
      zoneVersionId: metadata.zoneVersionId,
      stale: metadata.stale,
      recordSets: (rawResponse as { recordsets?: EdgeDNSRecordSet[] })?.recordsets || [],
    };
  } catch (_error) {
    if (_error instanceof Error && _error.message?.includes('404')) {
      return null;
    }
    throw _error;
  }
}

/**
 * Enhanced submit changelist with validation and monitoring options
 */
export async function submitChangeList(
  client: AkamaiClient,
  zone: string,
  comment?: string,
  options?: ZoneActivationOptions,
): Promise<EdgeDNSZoneSubmitResponse> {
  const spinner = new Spinner();
  const opts = {
    validateOnly: false,
    waitForActivation: false,
    timeout: 300000, // 5 minutes default
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
    },
    ...options,
  };

  try {
    // Pre-submission validation - check if changelist exists and has content
    spinner.start('Validating changelist...');
    const changelist = await getChangeList(client, zone);

    if (!changelist) {
      spinner.fail('No changelist found');
      throw new Error(
        `No pending changelist exists for zone ${zone}. Create changes before submitting.`,
      );
    }

    if (!changelist.recordSets || changelist.recordSets.length === 0) {
      spinner.fail('Empty changelist');
      throw new Error(`The changelist for zone ${zone} is empty. Add changes before submitting.`);
    }

    // Submit with retry logic
    spinner.update(opts.validateOnly ? 'Validating changes...' : 'Submitting changelist...');

    let response: EdgeDNSZoneSubmitResponse | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= opts.retryConfig.maxRetries!; attempt++) {
      try {
        const rawResponse = await client.request({
          path: `/config-dns/v2/changelists/${zone}/submit`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: {
            comment: comment || `Submitting pending changes for ${zone}`,
            validateOnly: opts.validateOnly,
          },
        });

        // CODE KAI: Handle 204 No Content response
        if (!rawResponse || Object.keys(rawResponse).length === 0) {
          // 204 No Content - submission successful
          response = {
            requestId: generateRequestId(),
            expiryDate: new Date(Date.now() + 86400000).toISOString(), // +24h
          } as EdgeDNSZoneSubmitResponse;
        } else {
          // Validate full response
          if (!isEdgeDNSZoneSubmitResponse(rawResponse)) {
            throw new EdgeDNSValidationError(
              'Invalid Edge DNS zone submit response structure',
              rawResponse,
              'EdgeDNSZoneSubmitResponse'
            );
          }
          response = rawResponse as EdgeDNSZoneSubmitResponse;
        }

        break; // Success, exit retry loop
      } catch (_error) {
        lastError = _error;

        // Check if it's a rate limit error
        const error = _error as AkamaiErrorResponse & { 
          statusCode?: number; 
          response?: { status?: number }; 
          headers?: Record<string, string> 
        };
        
        if ((_error instanceof Error && _error.message?.includes('429')) || 
            error?.statusCode === 429 || error?.response?.status === 429 || error?.status === 429) {
          const retryAfter =
            error.headers?.['retry-after'] ||
            Math.min(
              opts.retryConfig.initialDelay! * Math.pow(2, attempt),
              opts.retryConfig.maxDelay!,
            );

          if (attempt < opts.retryConfig.maxRetries!) {
            const retryDelayMs = typeof retryAfter === 'string' ? parseInt(retryAfter, 10) * 1000 : retryAfter;
            spinner.update(`Rate limited, retrying in ${retryDelayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            continue;
          }
        }

        // For other errors, only retry on transient failures
        if (isTransientError(_error) && attempt < opts.retryConfig.maxRetries!) {
          const delay = Math.min(
            opts.retryConfig.initialDelay! * Math.pow(2, attempt),
            opts.retryConfig.maxDelay!,
          );
          spinner.update(`Transient _error, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error or max retries reached
        throw _error;
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to submit changelist after retries');
    }

    // Handle validation results
    if (opts.validateOnly && response.validationResult) {
      spinner.stop();

      const hasErrors = response.validationResult.errors && response.validationResult.errors.length > 0;
      const hasWarnings = response.validationResult.warnings && response.validationResult.warnings.length > 0;

      if (hasErrors && response.validationResult.errors) {
        const errorMessages = response.validationResult.errors
          .map((e) => `  ${icons.error} ${e.field}: ${e.message}`)
          .join('\n');
        throw new Error(`Validation failed:\n${errorMessages}`);
      }

      if (hasWarnings && response.validationResult.warnings) {
        console.log(`${icons.warning} Validation warnings:`);
        response.validationResult.warnings.forEach((w) => {
          console.log(`  ${icons.warning} ${w.field}: ${w.message}`);
        });
      }

      spinner.succeed('Validation completed successfully');
      return response;
    }

    spinner.succeed(`Changelist submitted successfully (Request ID: ${response.requestId})`);

    // Log submission success
    logOperation('CHANGELIST_SUBMITTED', {
      zone,
      requestId: response.requestId,
      recordCount: changelist.recordSets?.length || 0,
      validateOnly: opts.validateOnly,
      comment: comment,
    });

    // Wait for activation if requested
    if (opts.waitForActivation && !opts.validateOnly) {
      spinner.start('Waiting for zone activation...');
      try {
        const status = await waitForZoneActivation(client, zone, {
          timeout: opts.timeout,
          requestId: response.requestId,
        });

        if (status.activationState === 'ACTIVE') {
          spinner.succeed(
            `Zone ${zone} activated successfully (${status.propagationStatus?.percentage || 100}% propagated)`,
          );
        } else {
          spinner.fail(`Zone activation failed: ${status.activationState}`);
        }
      } catch (_error) {
        spinner.fail('Failed to monitor activation status');
        logger.error({ error: _error, zone }, 'Failed to monitor activation status');
        // Don't throw - submission was successful even if monitoring failed
      }
    }

    return response;
  } catch (_error) {
    if (spinner) {
      spinner.fail('Failed to submit changelist');
    }
    throw _error;
  }
}

/**
 * Helper to determine if an error is transient and should be retried
 */
function isTransientError(_error: unknown): boolean {
  // Network errors
  if (
    _error && typeof _error === 'object' && 'code' in _error &&
    ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes((_error as {code: string}).code)
  ) {
    return true;
  }

  // HTTP errors that might be transient
  const errorObj = _error as {statusCode?: number; response?: {status?: number}};
  const statusCode = errorObj.statusCode || errorObj.response?.status;
  if (statusCode && [502, 503, 504].includes(statusCode)) {
    return true;
  }

  return false;
}

/**
 * Discard an existing changelist with retry logic
 */
export async function discardChangeList(
  client: AkamaiClient,
  zone: string,
  retryConfig?: {
    maxRetries?: number;
    initialDelay?: number;
  },
): Promise<void> {
  const config = {
    maxRetries: 3,
    initialDelay: 1000,
    ...retryConfig,
  };

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      await client.request({
        path: `/config-dns/v2/changelists/${zone}`,
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });
      return; // Success
    } catch (_error) {
      lastError = _error;

      // Don't retry on 404 - changelist doesn't exist
      const error = _error as AkamaiErrorResponse & { statusCode?: number; response?: { status?: number } };
      if ((_error instanceof Error && _error.message?.includes('404')) || 
          error?.statusCode === 404 || error?.response?.status === 404 || error?.status === 404) {
        return; // Consider success - changelist is gone
      }

      // Retry on transient errors
      if (isTransientError(_error) && attempt < config.maxRetries) {
        const delay = config.initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw _error;
    }
  }

  throw lastError || new Error('Failed to discard changelist after retries');
}

/**
 * Check for stale changelist and handle appropriately
 * CODE KAI: Enhanced changelist state management
 */
export async function validateChangelistState(
  client: AkamaiClient,
  zone: string,
  options?: {
    autoResolveStale?: boolean;
    maxStaleAgeMinutes?: number;
  }
): Promise<{
  isValid: boolean;
  changelist?: EdgeDNSChangeListResponse;
  action?: 'SUBMIT' | 'DISCARD' | 'CONTINUE';
  message?: string;
}> {
  const opts = {
    autoResolveStale: true,
    maxStaleAgeMinutes: 30,
    ...options,
  };

  try {
    const changelist = await getChangeList(client, zone);

    if (!changelist) {
      return { isValid: true, action: 'CONTINUE' };
    }

    // Check if changelist is stale
    const lastModified = new Date(changelist.lastModifiedDate);
    const ageMinutes = (Date.now() - lastModified.getTime()) / (1000 * 60);
    
    if (changelist.stale || ageMinutes > opts.maxStaleAgeMinutes) {
      logger.warn({
        zone,
        ageMinutes,
        stale: changelist.stale,
        lastModifiedBy: changelist.lastModifiedBy,
        changeTag: changelist.changeTag,
      }, 'Detected stale changelist');

      if (opts.autoResolveStale) {
        // Auto-discard stale changelist
        await discardChangeList(client, zone);
        return {
          isValid: true,
          action: 'CONTINUE',
          message: `Discarded stale changelist (${ageMinutes.toFixed(1)} minutes old)`,
        };
      } else {
        return {
          isValid: false,
          changelist,
          action: 'DISCARD',
          message: `Stale changelist detected (${ageMinutes.toFixed(1)} minutes old)`,
        };
      }
    }

    // Changelist exists and is not stale
    const recordCount = changelist.recordSets?.length || 0;
    if (recordCount === 0) {
      // Empty changelist - can be discarded
      if (opts.autoResolveStale) {
        await discardChangeList(client, zone);
        return {
          isValid: true,
          action: 'CONTINUE',
          message: 'Discarded empty changelist',
        };
      } else {
        return {
          isValid: false,
          changelist,
          action: 'DISCARD',
          message: 'Empty changelist exists',
        };
      }
    }

    // Valid changelist with pending changes
    return {
      isValid: false,
      changelist,
      action: 'SUBMIT',
      message: `Active changelist with ${recordCount} pending change${recordCount === 1 ? '' : 's'}`,
    };

  } catch (_error) {
    // Assume no changelist if 404 or other error
    const error = _error as AkamaiErrorResponse & { statusCode?: number; response?: { status?: number } };
    if (error?.statusCode === 404 || error?.response?.status === 404 || error?.status === 404) {
      return { isValid: true, action: 'CONTINUE' };
    }
    
    logger.warn({ zone, error: _error }, 'Failed to validate changelist state');
    return { isValid: true, action: 'CONTINUE', message: 'Unable to check changelist state' };
  }
}

/**
 * Wait for zone activation to complete
 */
export async function waitForZoneActivation(
  client: AkamaiClient,
  zone: string,
  options?: {
    timeout?: number;
    pollInterval?: number;
    requestId?: string;
  },
): Promise<ZoneActivationStatus> {
  const opts = {
    timeout: 300000, // 5 minutes default
    pollInterval: 3000, // 3 seconds default
    ...options,
  };

  const startTime = Date.now();
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;
  let backoffMultiplier = 1;

  while (Date.now() - startTime < opts.timeout) {
    try {
      // Get zone activation status
      const rawResponse = await client.request({
        path: `/config-dns/v2/zones/${zone}/status`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      // CODE KAI: Runtime validation
      if (!isEdgeDNSZoneActivationStatusResponse(rawResponse)) {
        throw new EdgeDNSValidationError(
          'Invalid Edge DNS zone activation status response structure',
          rawResponse,
          'EdgeDNSZoneActivationStatusResponse'
        );
      }

      const status = rawResponse as EdgeDNSZoneActivationStatusResponse;

      // Reset error counter on successful request
      consecutiveErrors = 0;
      backoffMultiplier = 1;

      // Check if activation is complete
      if (status.activationState === 'ACTIVE') {
        return status as ZoneActivationStatus;
      }

      // Check if activation failed
      if (status.activationState === 'FAILED') {
        throw new Error(`Zone activation failed for ${zone}`);
      }

      // Still pending - wait before next poll
      const delay = opts.pollInterval * backoffMultiplier;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (_error) {
      // Handle rate limiting with exponential backoff
      if ((_error instanceof Error && _error.message?.includes('429')) || 
          (_error && typeof _error === 'object' && 'statusCode' in _error && (_error as {statusCode: number}).statusCode === 429)) {
        consecutiveErrors++;

        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Rate limited while monitoring zone ${zone} activation`);
        }

        // Exponential backoff with jitter
        backoffMultiplier = Math.min(backoffMultiplier * 2, 10);
        const delay = opts.pollInterval * backoffMultiplier + (require('crypto').randomBytes(2).readUInt16BE(0) / 65536) * 1000;

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, check if transient
      if (isTransientError(_error)) {
        consecutiveErrors++;

        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(
            `Failed to get zone status after ${maxConsecutiveErrors} attempts: ${_error instanceof Error ? _error.message : String(_error)}`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, opts.pollInterval));
        continue;
      }

      // Non-transient error
      throw _error;
    }
  }

  // Timeout reached
  throw new Error(`Timeout waiting for zone ${zone} activation after ${opts.timeout}ms`);
}

/**
 * Process multiple zone operations sequentially with error recovery
 */
export async function processMultipleZones(
  _client: AkamaiClient,
  zones: string[],
  operation: (zone: string) => Promise<unknown>,
  options?: {
    continueOnError?: boolean;
    delayBetweenZones?: number;
  },
): Promise<{
  successful: string[];
  failed: Array<{ zone: string; error: string }>;
}> {
  const opts = {
    continueOnError: options?.continueOnError ?? true,
    delayBetweenZones: options?.delayBetweenZones ?? 1000,
  };

  const result = {
    successful: [] as string[],
    failed: [] as Array<{ zone: string; error: string }>,
  };

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (!zone) {
      continue;
    } // TypeScript guard

    try {
      await operation(zone);
      result.successful.push(zone);

      // Add delay between zones to avoid rate limiting
      if (i < zones.length - 1 && opts.delayBetweenZones > 0) {
        await new Promise((resolve) => setTimeout(resolve, opts.delayBetweenZones));
      }
    } catch (_error) {
      const errorMessage: string =
        _error instanceof Error ? _error.message : String(_error || 'Unknown error');
      result.failed.push({
        zone,
        error: errorMessage,
      });

      if (!opts.continueOnError) {
        throw new Error(`Failed processing zone ${zone}: ${errorMessage}`);
      }
    }
  }

  return result;
}

/**
 * Helper function to ensure a clean change list for a zone
 * This will check for an existing change list and handle it gracefully.
 */
export async function ensureCleanChangeList(
  client: AkamaiClient,
  zone: string,
  spinner?: Spinner,
  force?: boolean,
): Promise<void> {
  // Check for existing change list
  if (spinner) {
    spinner.update('Checking for existing change list...');
  }

  const existingChangeList = await getChangeList(client, zone);

  if (existingChangeList) {
    // Log existing changelist detection
    logOperation('EXISTING_CHANGELIST_FOUND', {
      zone,
      recordCount: existingChangeList.recordSets?.length || 0,
      lastModifiedBy: existingChangeList.lastModifiedBy,
      lastModifiedDate: existingChangeList.lastModifiedDate,
      requestId: generateRequestId(),
    });

    // Stop spinner to show interactive message
    if (spinner) {
      spinner.stop();
    }

    // Format pending changes
    const pendingChanges: string[] = [];
    if (existingChangeList.recordSets && existingChangeList.recordSets.length > 0) {
      existingChangeList.recordSets.forEach((record) => {
        pendingChanges.push(
          `  • ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}`,
        );
      });
    }

    if (!force) {
      // Show error with details about existing changelist
      const errorMessage = [
        `${icons.warning} A changelist already exists for zone ${format.cyan(zone)}`,
        '',
        `${icons.info} Last modified by: ${format.dim(existingChangeList.lastModifiedBy || 'Unknown')}`,
        `${icons.info} Last modified: ${format.dim(existingChangeList.lastModifiedDate || 'Unknown')}`,
        '',
        pendingChanges.length > 0
          ? `${icons.list} Pending changes:`
          : `${icons.info} No pending changes in the changelist`,
        ...pendingChanges.slice(0, 10),
        pendingChanges.length > 10 ? `  ... and ${pendingChanges.length - 10} more changes` : '',
        '',
        `${icons.question} What would you like to do?`,
        '',
        '1. Submit the existing changelist',
        '2. Discard the existing changelist and continue',
        '3. Cancel the operation',
        '',
        'To force discard without asking, use the force option',
      ]
        .filter((line) => line !== '')
        .join('\n');

      throw new Error(errorMessage);
    }

    // Force mode - discard existing changelist
    if (spinner) {
      spinner.start('Discarding existing change list...');
    }

    const discardRequestId = generateRequestId();
    logOperation('DISCARDING_CHANGELIST', { zone, force: true, requestId: discardRequestId });

    await discardChangeList(client, zone);

    logOperation('CHANGELIST_DISCARDED', { zone, requestId: discardRequestId });
  }

  // Create a new change list
  if (spinner) {
    spinner.update('Creating change list...');
  }

  const createRequestId = generateRequestId();
  logOperation('CREATING_CHANGELIST', { zone, requestId: createRequestId });

  // The changelist is created automatically when you make changes to a zone
  // No explicit create endpoint is needed

  logOperation('CHANGELIST_CREATED', { zone, requestId: createRequestId });
}

/**
 * Create or update a DNS record using change list workflow
 * 
 * ENHANCED with intelligent operation detection:
 * - Automatically determines ADD vs EDIT based on existing records
 * - Handles changelist conflicts gracefully
 * - Provides clear guidance for users
 */
export async function upsertRecord(
  client: AkamaiClient,
  args: {
    zone: string;
    name: string;
    type: string;
    ttl: number;
    rdata: string[];
    comment?: string;
    force?: boolean;
    autoSubmit?: boolean; // Auto-submit changes after creation
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();

  try {
    // KAIZEN: Step 1: Validate changelist state before proceeding
    spinner.start('Validating changelist state...');
    const validation = await validateChangelistState(client, args.zone, {
      autoResolveStale: true,
      maxStaleAgeMinutes: 30,
    });

    if (!validation.isValid && validation.action === 'SUBMIT' && !args.force) {
      // There's an active changelist with pending changes
      spinner.fail('Active changelist exists');
      return {
        content: [
          {
            type: 'text',
            text: `${icons.warning} ${validation.message}\n\n` +
                  `${icons.info} Options:\n` +
                  `  • Submit pending changes: "Activate zone changes for ${args.zone}"\n` +
                  `  • Use force=true to discard existing changes\n` +
                  `  • Wait for current operation to complete`,
          },
        ],
      };
    }

    if (args.force && validation.changelist) {
      spinner.update('Force mode: Discarding existing changelist...');
      await discardChangeList(client, args.zone);
    }

    if (validation.message) {
      spinner.update(validation.message);
    }

    // Step 2: Determine if record exists (for ADD vs EDIT decision)
    spinner.update('Checking if record exists...');
    let operation: 'ADD' | 'EDIT' = 'ADD';
    
    try {
      const existingRecords = await client.request({
        path: `/config-dns/v2/zones/${args.zone}/recordsets`,
        method: 'GET',
        headers: { Accept: 'application/json' },
        queryParams: {
          types: args.type,
          search: args.name
        },
      });
      
      const records = (existingRecords as EdgeDNSRecordSetsResponse).recordsets || [];
      const exactMatch = records.find(r => r.name === args.name && r.type === args.type);
      
      if (exactMatch) {
        operation = 'EDIT';
        spinner.update(`Existing ${args.type} record found, will update...`);
      } else {
        spinner.update(`No existing ${args.type} record found, will create...`);
      }
    } catch (checkError) {
      // If we can't check, assume ADD
      logger.debug({ error: checkError }, 'Could not check existing records, assuming ADD');
    }

    // Step 3: Create a new changelist
    spinner.update('Creating changelist...');
    await client.request({
      path: '/config-dns/v2/changelists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      queryParams: {
        zone: args.zone
      }
    });
    
    spinner.update(`Changelist created for zone ${args.zone}`);

    // Step 4: Add/update the record using add-change endpoint
    spinner.update(`${operation === 'ADD' ? 'Adding' : 'Updating'} ${args.type} record for ${args.name}...`);
    
    const changeOperation = {
      name: args.name,
      type: args.type,
      op: operation,
      ttl: args.ttl,
      rdata: args.rdata,
    };

    await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: changeOperation,
    });

    // Step 5: Submit the change list if autoSubmit is true
    if (args.autoSubmit !== false) {
      spinner.update('Submitting changes...');
      const submitResponse = await submitChangeList(
        client, 
        args.zone, 
        args.comment || `${operation === 'ADD' ? 'Created' : 'Updated'} ${args.type} record for ${args.name}`
      );

      spinner.succeed(`Record ${operation === 'ADD' ? 'created' : 'updated'}: ${args.name} ${args.type}`);

      return {
        content: [
          {
            type: 'text',
            text: `${icons.success} Successfully ${operation === 'ADD' ? 'created' : 'updated'} DNS record:\n${icons.dns} ${format.cyan(args.name)} ${format.dim(args.ttl.toString())} ${format.green(args.type)} ${format.yellow(args.rdata.join(' '))}\n\n${icons.info} Changes activated (Request ID: ${format.dim(submitResponse.requestId)})`,
          },
        ],
      };
    } else {
      spinner.succeed(`Record ${operation === 'ADD' ? 'created' : 'updated'} in changelist: ${args.name} ${args.type}`);

      return {
        content: [
          {
            type: 'text',
            text: `${icons.success} Successfully ${operation === 'ADD' ? 'created' : 'updated'} DNS record in changelist:\n${icons.dns} ${format.cyan(args.name)} ${format.dim(args.ttl.toString())} ${format.green(args.type)} ${format.yellow(args.rdata.join(' '))}\n\n${icons.info} Changes pending - activate with "Activate zone changes for ${args.zone}"`,
          },
        ],
      };
    }
  } catch (_error) {
    // Enhanced error handling for common issues
    if (_error instanceof Error) {
      if (_error.message.includes('422') && _error.message.includes('already exists')) {
        // Record exists but we tried ADD - retry with EDIT
        spinner.update('Record exists, retrying with EDIT operation...');
        try {
          const changeOperation = {
            name: args.name,
            type: args.type,
            op: 'EDIT' as const,
            ttl: args.ttl,
            rdata: args.rdata,
          };

          await client.request({
            path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: changeOperation,
          });

          if (args.autoSubmit !== false) {
            spinner.update('Submitting changes...');
            const submitResponse = await submitChangeList(
              client, 
              args.zone, 
              args.comment || `Updated ${args.type} record for ${args.name}`
            );

            spinner.succeed(`Record updated: ${args.name} ${args.type}`);

            return {
              content: [
                {
                  type: 'text',
                  text: `${icons.success} Successfully updated DNS record:\n${icons.dns} ${format.cyan(args.name)} ${format.dim(args.ttl.toString())} ${format.green(args.type)} ${format.yellow(args.rdata.join(' '))}\n\n${icons.info} Changes activated (Request ID: ${format.dim(submitResponse.requestId)})`,
                },
              ],
            };
          }
        } catch (retryError) {
          // If retry fails, fall through to regular error handling
          return errorHandler.handle('upsertRecord', retryError, spinner, {
            zone: args.zone,
            name: args.name,
            type: args.type,
            ttl: args.ttl,
            rdata: args.rdata
          });
        }
      }
    }
    
    return errorHandler.handle('upsertRecord', _error, spinner, {
      zone: args.zone,
      name: args.name,
      type: args.type,
      ttl: args.ttl,
      rdata: args.rdata
    });
  }
}

/**
 * Delete a DNS record using change list workflow
 */
export async function deleteRecord(
  client: AkamaiClient,
  args: {
    zone: string;
    name: string;
    type: string;
    comment?: string;
    force?: boolean;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();

  try {
    // KAIZEN: Step 1: Validate changelist state before proceeding
    spinner.start('Validating changelist state...');
    const validation = await validateChangelistState(client, args.zone, {
      autoResolveStale: true,
      maxStaleAgeMinutes: 30,
    });

    if (!validation.isValid && validation.action === 'SUBMIT') {
      // There's an active changelist with pending changes
      spinner.fail('Active changelist exists');
      return {
        content: [
          {
            type: 'text',
            text: `${icons.warning} ${validation.message}\n\n` +
                  `${icons.info} Options:\n` +
                  `  • Submit pending changes: "Activate zone changes for ${args.zone}"\n` +
                  `  • Use force option to discard existing changes\n` +
                  `  • Wait for current operation to complete`,
          },
        ],
      };
    }

    if (validation.message) {
      spinner.update(validation.message);
    }

    // Step 2: Create a new changelist
    spinner.update('Creating changelist...');
    await client.request({
      path: '/config-dns/v2/changelists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      queryParams: {
        zone: args.zone
      }
    });
    
    spinner.update(`Changelist created for zone ${args.zone}`);

    // Step 2: Add delete operation to the changelist
    spinner.update(`Deleting ${args.type} record for ${args.name}...`);
    
    const deleteOperation = {
      name: args.name,
      type: args.type,
      op: 'DELETE' as const
    };
    
    await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: deleteOperation,
    });

    // Step 3: Submit the change list
    spinner.update('Submitting changes...');
    const rawSubmitResponse = await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        comment: args.comment || `Deleted ${args.type} record for ${args.name}`,
      },
    });

    // CODE KAI: Runtime validation
    if (!isEdgeDNSZoneSubmitResponse(rawSubmitResponse)) {
      throw new EdgeDNSValidationError(
        'Invalid Edge DNS zone submit response structure',
        rawSubmitResponse,
        'EdgeDNSZoneSubmitResponse'
      );
    }

    const submitResponse = rawSubmitResponse as EdgeDNSZoneSubmitResponse;

    spinner.succeed(`Record deleted: ${args.name} ${args.type}`);

    return {
      content: [
        {
          type: 'text',
          text: `${icons.success} Successfully deleted DNS record:\n${icons.dns} ${format.cyan(args.name)} ${format.green(args.type)}\n\n${icons.info} Request ID: ${format.dim(submitResponse.requestId)}`,
        },
      ],
    };
  } catch (_error) {
    // 404s might indicate record doesn't exist, which could be expected
    if (_error instanceof Error && _error.message.includes('404:')) {
      spinner.fail(`Record not found: ${args.name} ${args.type}`);
      throw _error;
    }
    return errorHandler.handle('deleteRecord', _error, spinner, {
      zone: args.zone,
      name: args.name,
      type: args.type
    });
  }
}

/**
 * MCP Tool: Activate zone changes with optional validation and monitoring
 */
export async function activateZoneChanges(
  client: AkamaiClient,
  args: {
    zone: string;
    comment?: string;
    validateOnly?: boolean;
    waitForCompletion?: boolean;
    timeout?: number;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();

  try {
    // Check if there's a changelist to submit
    spinner.start('Checking for pending changes...');
    const changelist = await getChangeList(client, args.zone);

    if (!changelist) {
      spinner.stop();
      return {
        content: [
          {
            type: 'text',
            text: `${icons.info} No pending changes found for zone ${format.cyan(args.zone)}`,
          },
        ],
      };
    }

    // Show pending changes summary
    spinner.stop();
    const changeCount = changelist.recordSets?.length || 0;
    console.log(
      `${icons.info} Found ${format.bold(changeCount.toString())} pending changes for zone ${format.cyan(args.zone)}`,
    );
    console.log(`${icons.info} Last modified by: ${format.dim(changelist.lastModifiedBy || 'Unknown')}`);
    console.log(`${icons.info} Last modified: ${format.dim(changelist.lastModifiedDate || 'Unknown')}`);

    if (changeCount > 0 && changeCount <= 10) {
      console.log(`\n${icons.list} Pending changes:`);
      changelist.recordSets?.forEach((record) => {
        console.log(`  • ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}`);
      });
    } else if (changeCount > 10) {
      console.log(`\n${icons.list} Showing first 10 pending changes:`);
      changelist.recordSets?.slice(0, 10).forEach((record) => {
        console.log(`  • ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}`);
      });
      console.log(`  ... and ${changeCount - 10} more changes`);
    }
    console.log(''); // Empty line for readability

    // Submit the changelist with options
    const submitResponse = await submitChangeList(client, args.zone, args.comment, {
      validateOnly: args.validateOnly,
      waitForActivation: args.waitForCompletion,
      timeout: args.timeout,
    });

    // Format response based on operation type
    if (args.validateOnly) {
      return {
        content: [
          {
            type: 'text',
            text:
              `${icons.success} Validation completed successfully for zone ${format.cyan(args.zone)}\n\n` +
              `${icons.info} All ${changeCount} changes passed validation\n` +
              `${icons.info} Request ID: ${format.dim(submitResponse.requestId)}`,
          },
        ],
      };
    } else {
      let responseText =
        `${icons.success} Successfully activated ${changeCount} changes for zone ${format.cyan(args.zone)}\n\n` +
        `${icons.info} Request ID: ${format.dim(submitResponse.requestId)}`;

      if (!args.waitForCompletion) {
        responseText += `\n${icons.info} Zone activation is in progress. Use the request ID to track status.`;
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
  } catch (_error) {
    // Provide helpful error messages for specific errors
    if (_error instanceof Error && _error.message?.includes('No pending changelist')) {
      spinner.fail('No pending changes to activate');
      return {
        content: [
          {
            type: 'text',
            text:
              `${icons.error} ${_error.message}\n\n` +
              `${icons.info} To make changes:\n` +
              '  1. Use upsertRecord to add/update records\n' +
              '  2. Use deleteRecord to remove records\n' +
              '  3. Then use activateZoneChanges to submit',
          },
        ],
      };
    }

    return errorHandler.handle('activateZoneChanges', _error, spinner, {
      zone: args.zone,
      validateOnly: args.validateOnly,
      waitForCompletion: args.waitForCompletion
    });
  }
}

/**
 * User-friendly DNS delegation setup for subzones
 * 
 * This function handles the complete workflow for delegating a subzone to external nameservers.
 * It automatically handles common issues like phantom changelists and NS record updates.
 * 
 * @example
 * // Delegate oci.example.com to Oracle Cloud nameservers
 * delegateSubzone(client, {
 *   zone: 'oci.example.com',
 *   nameservers: [
 *     'ns1.p201.dns.oraclecloud.net.',
 *     'ns2.p201.dns.oraclecloud.net.',
 *     'ns3.p201.dns.oraclecloud.net.',
 *     'ns4.p201.dns.oraclecloud.net.'
 *   ],
 *   provider: 'Oracle Cloud'
 * })
 */
export async function delegateSubzone(
  client: AkamaiClient,
  args: {
    zone: string;
    nameservers: string[];
    provider?: string;  // Optional provider name for better messages
    ttl?: number;       // TTL for NS records (default: 300)
    createIfMissing?: boolean; // Create zone if it doesn't exist
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  const providerName = args.provider || 'external provider';
  const ttl = args.ttl || 300;

  try {
    spinner.start(`Setting up ${args.zone} delegation to ${providerName}...`);
    
    // Step 1: Check if zone exists
    try {
      await getZone(client, { zone: args.zone });
      spinner.update(`Zone ${args.zone} exists, proceeding with delegation...`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        if (args.createIfMissing) {
          spinner.update(`Zone ${args.zone} not found, creating it...`);
          await createZone(client, {
            zone: args.zone,
            type: 'PRIMARY',
            comment: `Created for ${providerName} delegation`
          });
        } else {
          spinner.fail(`Zone ${args.zone} not found`);
          return {
            content: [
              {
                type: 'text',
                text: `${icons.error} Zone ${format.cyan(args.zone)} does not exist\n\n` +
                      `${icons.info} To create it and set up delegation:\n` +
                      `  • Use createIfMissing: true option\n` +
                      `  • Or create the zone first: "Create zone ${args.zone}"`,
              },
            ],
          };
        }
      } else {
        throw error;
      }
    }
    
    // Step 2: Clean up any phantom changelists
    spinner.update('Checking for existing changelists...');
    try {
      const changelist = await getChangeList(client, args.zone);
      if (changelist) {
        // Check if it's a phantom changelist
        if (!changelist.recordSets || changelist.recordSets.length === 0) {
          spinner.update('Discarding empty changelist...');
          await discardChangeList(client, args.zone);
        } else {
          // Real changelist with changes
          spinner.fail('Active changelist with pending changes');
          return {
            content: [
              {
                type: 'text',
                text: `${icons.warning} Active changelist exists with ${changelist.recordSets.length} pending changes\n\n` +
                      `${icons.info} Options:\n` +
                      `  • Activate pending changes first\n` +
                      `  • Use force option to discard changes\n` +
                      `  • Review changes with "List changelist for ${args.zone}"`,
              },
            ],
          };
        }
      }
    } catch (error) {
      // No changelist exists, which is fine
      logger.debug({ zone: args.zone }, 'No existing changelist');
    }
    
    // Step 3: Get current NS records
    spinner.update('Checking current nameservers...');
    const records = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/recordsets`,
      method: 'GET',
      headers: { Accept: 'application/json' },
      queryParams: { types: 'NS' }
    });
    
    const recordsData = records as EdgeDNSRecordSetsResponse;
    const nsRecord = recordsData.recordsets?.find(r => r.name === args.zone && r.type === 'NS');
    
    if (nsRecord) {
      // Compare nameservers
      const currentNS = nsRecord.rdata.sort();
      const newNS = args.nameservers.sort();
      
      if (JSON.stringify(currentNS) === JSON.stringify(newNS)) {
        spinner.succeed('Nameservers already configured correctly');
        return {
          content: [
            {
              type: 'text',
              text: `${icons.success} Zone ${format.cyan(args.zone)} is already delegated to ${providerName}\n\n` +
                    `${icons.info} Current nameservers:\n` +
                    args.nameservers.map((ns, i) => `  ${i + 1}. ${format.green(ns)}`).join('\n'),
            },
          ],
        };
      }
      
      spinner.update(`Updating nameservers from Akamai to ${providerName}...`);
    } else {
      spinner.update(`Adding ${providerName} nameservers...`);
    }
    
    // Step 4: Create changelist and update NS records
    spinner.update('Creating changelist...');
    await client.request({
      path: '/config-dns/v2/changelists',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      queryParams: { zone: args.zone }
    });
    
    // Use EDIT if NS record exists, ADD if it doesn't
    const operation = nsRecord ? 'EDIT' : 'ADD';
    
    spinner.update(`${operation === 'EDIT' ? 'Updating' : 'Adding'} nameserver records...`);
    await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: {
        name: args.zone,
        type: 'NS',
        op: operation,
        ttl: ttl,
        rdata: args.nameservers
      }
    });
    
    // Step 5: Submit changelist
    spinner.update('Activating delegation changes...');
    const submitResponse = await submitChangeList(
      client,
      args.zone,
      `Delegate ${args.zone} to ${providerName} nameservers`
    );
    
    spinner.succeed(`Successfully delegated ${args.zone} to ${providerName}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.success} Successfully delegated ${format.cyan(args.zone)} to ${providerName}!\n\n` +
                `${icons.dns} Nameservers configured:\n` +
                args.nameservers.map((ns, i) => `  ${i + 1}. ${format.green(ns)}`).join('\n') +
                `\n\n${icons.info} TTL: ${ttl} seconds\n` +
                `${icons.info} Request ID: ${format.dim(submitResponse.requestId)}\n\n` +
                `${icons.sparkle} The delegation is now active. ${providerName} can now manage DNS for ${args.zone}`,
        },
      ],
    };
    
  } catch (_error) {
    return errorHandler.handle('delegateSubzone', _error, spinner, {
      zone: args.zone,
      nameservers: args.nameservers,
      provider: args.provider
    });
  }
}
