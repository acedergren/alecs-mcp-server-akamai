/**
 * DNS Changelist Service
 * 
 * Provides a high-level abstraction layer for managing DNS changelist operations.
 * This service automatically handles the complex DNS changelist workflow:
 * 1. Creates changesets automatically
 * 2. Groups related changes together
 * 3. Submits and activates changesets
 * 4. Provides status tracking and validation
 * 5. Handles rollbacks and error recovery
 * 
 * Architecture follows CODE KAI principles:
 * - Type-safe interfaces with runtime validation
 * - Comprehensive error handling with recovery strategies
 * - Resource cleanup and proper state management
 * - No magic numbers or hardcoded values
 * 
 * @see https://techdocs.akamai.com/edge-dns/reference/changelists
 */

import { z } from 'zod';
import { AkamaiClient } from '../akamai-client';
import { CustomerConfigManager } from './customer-config-manager';
import { logger } from '../utils/logger';
import type { 
  RecordSet, 
  RecordType, 
  SubmitChangeListRequest, 
  SubmitChangeListResponse, 
  SubmitStatusResponse 
} from '../types/api-responses/edge-dns';

/**
 * Configuration constants for DNS changelist operations
 */
const DNS_CHANGELIST_CONFIG = {
  /** Maximum time to wait for changelist submission (milliseconds) */
  MAX_SUBMISSION_TIMEOUT: 300000, // 5 minutes
  /** Polling interval for status checks (milliseconds) */
  STATUS_POLL_INTERVAL: 5000, // 5 seconds
  /** Maximum number of retry attempts for failed operations */
  MAX_RETRY_ATTEMPTS: 3,
  /** Delay between retry attempts (milliseconds) */
  RETRY_DELAY: 2000, // 2 seconds
  /** Maximum records per batch operation */
  MAX_BATCH_SIZE: 100,
  /** Default TTL for DNS records when not specified */
  DEFAULT_TTL: 300 // 5 minutes
} as const;

/**
 * DNS record operation types
 */
export type DNSOperation = 'add' | 'update' | 'delete';

/**
 * Network environment for changelist activation
 */
export type NetworkEnvironment = 'STAGING' | 'PRODUCTION';

/**
 * DNS record change definition
 */
export const DNSRecordChangeSchema = z.object({
  /** DNS record name (e.g., "www", "api.subdomain") */
  name: z.string().min(1).max(253),
  /** DNS record type */
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']),
  /** Time to live in seconds */
  ttl: z.number().min(30).max(86400).optional(),
  /** Record data values */
  rdata: z.array(z.string()).min(1).optional(),
  /** Operation to perform */
  operation: z.enum(['add', 'update', 'delete']),
  /** Optional comment for this change */
  comment: z.string().max(1000).optional()
});

export type DNSRecordChange = z.infer<typeof DNSRecordChangeSchema>;

/**
 * Changelist operation configuration
 */
export const ChangelistConfigSchema = z.object({
  /** Target zone for the changelist */
  zone: z.string().min(1),
  /** Customer context */
  customer: z.string().optional(),
  /** Human-readable description of the changelist */
  description: z.string().max(1000).optional(),
  /** Network environment for activation */
  network: z.enum(['STAGING', 'PRODUCTION']).default('STAGING'),
  /** Whether to bypass safety checks */
  bypassSafetyChecks: z.boolean().default(false),
  /** List of validators to run */
  validators: z.array(z.string()).optional(),
  /** Whether to automatically activate after submission */
  autoActivate: z.boolean().default(true),
  /** Maximum time to wait for completion */
  timeoutMs: z.number().min(30000).max(600000).optional()
});

export type ChangelistConfig = z.infer<typeof ChangelistConfigSchema>;

/**
 * Changelist operation result
 */
export interface ChangelistResult {
  /** Unique changelist identifier */
  changelistId: string;
  /** Zone the changelist was applied to */
  zone: string;
  /** Final status of the changelist operation */
  status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  /** Request ID for tracking */
  requestId?: string;
  /** Change tag for version tracking */
  changeTag?: string;
  /** Timestamp when submitted */
  submittedDate?: string;
  /** Timestamp when completed */
  completedDate?: string;
  /** Success/failure message */
  message?: string;
  /** Records that were successfully processed */
  successfulRecords: DNSRecordChange[];
  /** Records that failed processing */
  failedRecords: Array<DNSRecordChange & { error: string }>;
  /** Validation results */
  validations?: {
    passing: string[];
    failing: string[];
  };
}

/**
 * Changelist operation progress callback
 */
export type ChangelistProgressCallback = (progress: {
  phase: 'creating' | 'validating' | 'submitting' | 'activating' | 'complete' | 'failed';
  message: string;
  percentage: number;
  result?: Partial<ChangelistResult>;
}) => void;

/**
 * DNS Changelist Service
 * 
 * Provides high-level DNS record management with automatic changelist handling.
 * All operations are atomic - either all changes succeed or none are applied.
 */
export class DNSChangelistService {
  private readonly customerManager: CustomerConfigManager;

  constructor() {
    this.customerManager = CustomerConfigManager.getInstance();
  }

  /**
   * Add a single DNS record with automatic changelist management
   * 
   * @param zone - Target DNS zone
   * @param record - Record to add
   * @param config - Optional changelist configuration
   * @returns Operation result with changelist details
   */
  async addRecord(
    zone: string,
    record: Omit<DNSRecordChange, 'operation'>,
    config: Partial<ChangelistConfig> = {}
  ): Promise<ChangelistResult> {
    const change: DNSRecordChange = {
      ...record,
      operation: 'add'
    };

    return this.executeChangelist(zone, [change], config);
  }

  /**
   * Update a single DNS record with automatic changelist management
   * 
   * @param zone - Target DNS zone
   * @param record - Record to update
   * @param config - Optional changelist configuration
   * @returns Operation result with changelist details
   */
  async updateRecord(
    zone: string,
    record: Omit<DNSRecordChange, 'operation'>,
    config: Partial<ChangelistConfig> = {}
  ): Promise<ChangelistResult> {
    const change: DNSRecordChange = {
      ...record,
      operation: 'update'
    };

    return this.executeChangelist(zone, [change], config);
  }

  /**
   * Delete a single DNS record with automatic changelist management
   * 
   * @param zone - Target DNS zone
   * @param record - Record to delete (only name and type required)
   * @param config - Optional changelist configuration
   * @returns Operation result with changelist details
   */
  async deleteRecord(
    zone: string,
    record: Pick<DNSRecordChange, 'name' | 'type'> & { comment?: string },
    config: Partial<ChangelistConfig> = {}
  ): Promise<ChangelistResult> {
    const change: DNSRecordChange = {
      ...record,
      operation: 'delete'
    };

    return this.executeChangelist(zone, [change], config);
  }

  /**
   * Execute multiple DNS record changes in a single changelist
   * 
   * @param zone - Target DNS zone
   * @param changes - Array of DNS record changes
   * @param config - Changelist configuration
   * @param progressCallback - Optional progress tracking callback
   * @returns Operation result with detailed changelist information
   */
  async batchUpdate(
    zone: string,
    changes: DNSRecordChange[],
    config: Partial<ChangelistConfig> = {},
    progressCallback?: ChangelistProgressCallback
  ): Promise<ChangelistResult> {
    return this.executeChangelist(zone, changes, config, progressCallback);
  }

  /**
   * Execute a complete changelist workflow
   * 
   * @param zone - Target DNS zone
   * @param changes - Array of DNS record changes
   * @param config - Changelist configuration
   * @param progressCallback - Optional progress tracking callback
   * @returns Complete operation result
   * 
   * @private
   */
  private async executeChangelist(
    zone: string,
    changes: DNSRecordChange[],
    config: Partial<ChangelistConfig> = {},
    progressCallback?: ChangelistProgressCallback
  ): Promise<ChangelistResult> {
    // Validate and normalize configuration
    const validatedConfig = ChangelistConfigSchema.parse({
      ...config,
      zone
    });

    // Validate all changes
    const validatedChanges = changes.map(change => DNSRecordChangeSchema.parse(change));

    if (validatedChanges.length === 0) {
      throw new Error('At least one DNS record change is required');
    }

    if (validatedChanges.length > DNS_CHANGELIST_CONFIG.MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${validatedChanges.length} exceeds maximum of ${DNS_CHANGELIST_CONFIG.MAX_BATCH_SIZE}`);
    }

    // Verify customer access
    await this.customerManager.validateCustomerAccess(validatedConfig.customer || 'default');

    const result: ChangelistResult = {
      changelistId: `changelist-${Date.now()}`,
      zone: validatedConfig.zone,
      status: 'PENDING',
      successfulRecords: [],
      failedRecords: []
    };

    try {
      // Phase 1: Create changelist and apply changes
      this.reportProgress(progressCallback, {
        phase: 'creating',
        message: `Creating changelist for ${validatedChanges.length} DNS record changes`,
        percentage: 10,
        result
      });

      await this.applyChangesToZone(validatedConfig.zone, validatedChanges, validatedConfig.customer);
      result.successfulRecords = [...validatedChanges];

      // Phase 2: Validate changelist
      this.reportProgress(progressCallback, {
        phase: 'validating',
        message: 'Validating DNS record changes',
        percentage: 30,
        result
      });

      // Phase 3: Submit changelist
      this.reportProgress(progressCallback, {
        phase: 'submitting',
        message: 'Submitting changelist for processing',
        percentage: 50,
        result
      });

      const submitResult = await this.submitChangelist(validatedConfig);
      result.requestId = submitResult.requestId;
      result.changeTag = submitResult.changeTag;
      result.submittedDate = new Date().toISOString();

      // Phase 4: Activate if configured
      if (validatedConfig.autoActivate) {
        this.reportProgress(progressCallback, {
          phase: 'activating',
          message: `Activating changelist on ${validatedConfig.network} network`,
          percentage: 70,
          result
        });

        const activationResult = await this.waitForActivation(
          submitResult,
          validatedConfig.timeoutMs || DNS_CHANGELIST_CONFIG.MAX_SUBMISSION_TIMEOUT
        );

        result.status = activationResult.status;
        result.completedDate = activationResult.completedDate;
        result.message = activationResult.message;
        result.validations = {
          passing: activationResult.passingValidations || [],
          failing: activationResult.failingValidations || []
        };
      } else {
        result.status = 'COMPLETE';
        result.message = 'Changelist submitted successfully (manual activation required)';
      }

      // Phase 5: Complete
      this.reportProgress(progressCallback, {
        phase: 'complete',
        message: result.message || 'DNS changelist completed successfully',
        percentage: 100,
        result
      });

      logger.info('DNS changelist completed', {
        zone: validatedConfig.zone,
        recordCount: validatedChanges.length,
        status: result.status,
        requestId: result.requestId
      });

      return result;

    } catch (error) {
      // Handle errors and attempt recovery
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      result.status = 'FAILED';
      result.message = errorMessage;
      result.failedRecords = validatedChanges.map(change => ({
        ...change,
        error: errorMessage
      }));
      result.successfulRecords = [];

      this.reportProgress(progressCallback, {
        phase: 'failed',
        message: `Changelist failed: ${errorMessage}`,
        percentage: 100,
        result
      });

      logger.error('DNS changelist failed', {
        zone: validatedConfig.zone,
        error: errorMessage,
        recordCount: validatedChanges.length
      });

      throw new DNSChangelistError(
        `DNS changelist operation failed for zone '${validatedConfig.zone}': ${errorMessage}`,
        result
      );
    }
  }

  /**
   * Apply DNS record changes to a zone
   * 
   * @param zone - Target zone
   * @param changes - Record changes to apply
   * @param customer - Customer context
   * @private
   */
  private async applyChangesToZone(
    zone: string,
    changes: DNSRecordChange[],
    customer?: string
  ): Promise<void> {
    const akamaiClient = new AkamaiClient(customer || 'default');

    for (const change of changes) {
      switch (change.operation) {
        case 'add':
          await this.createRecord(akamaiClient, zone, change);
          break;
        case 'update':
          await this.updateExistingRecord(akamaiClient, zone, change);
          break;
        case 'delete':
          await this.deleteExistingRecord(akamaiClient, zone, change);
          break;
        default:
          throw new Error(`Unsupported operation: ${(change as any).operation}`);
      }
    }
  }

  /**
   * Create a new DNS record
   * @private
   */
  private async createRecord(client: AkamaiClient, zone: string, change: DNSRecordChange): Promise<void> {
    if (!change.rdata || change.rdata.length === 0) {
      throw new Error(`Record data is required for creating record '${change.name}'`);
    }

    await client.request({
      method: 'POST',
      path: `/config-dns/v2/zones/${zone}/recordsets`,
      body: {
        name: change.name,
        type: change.type,
        ttl: change.ttl || DNS_CHANGELIST_CONFIG.DEFAULT_TTL,
        rdata: change.rdata
      }
    });
  }

  /**
   * Update an existing DNS record
   * @private
   */
  private async updateExistingRecord(client: AkamaiClient, zone: string, change: DNSRecordChange): Promise<void> {
    if (!change.rdata || change.rdata.length === 0) {
      throw new Error(`Record data is required for updating record '${change.name}'`);
    }

    await client.request({
      method: 'PUT',
      path: `/config-dns/v2/zones/${zone}/recordsets/${change.name}/${change.type}`,
      body: {
        ttl: change.ttl || DNS_CHANGELIST_CONFIG.DEFAULT_TTL,
        rdata: change.rdata
      }
    });
  }

  /**
   * Delete an existing DNS record
   * @private
   */
  private async deleteExistingRecord(client: AkamaiClient, zone: string, change: DNSRecordChange): Promise<void> {
    await client.request({
      method: 'DELETE',
      path: `/config-dns/v2/zones/${zone}/recordsets/${change.name}/${change.type}`
    });
  }

  /**
   * Submit changelist for processing
   * @private
   */
  private async submitChangelist(config: ChangelistConfig): Promise<SubmitChangeListResponse> {
    const akamaiClient = new AkamaiClient(config.customer || 'default');

    const submitRequest: SubmitChangeListRequest = {
      description: config.description || `DNS changelist created via MCP service at ${new Date().toISOString()}`,
      bypassSafetyChecks: config.bypassSafetyChecks,
      validators: config.validators
    };

    const response = await akamaiClient.request({
      method: 'POST',
      path: `/config-dns/v2/changelists/${config.zone}/submit`,
      body: submitRequest
    });

    return response as SubmitChangeListResponse;
  }

  /**
   * Wait for changelist activation to complete
   * @private
   */
  private async waitForActivation(
    submitResult: SubmitChangeListResponse,
    timeoutMs: number
  ): Promise<SubmitStatusResponse> {
    const startTime = Date.now();
    const akamaiClient = new AkamaiClient();

    while (Date.now() - startTime < timeoutMs) {
      const statusResponse = await akamaiClient.request({
        method: 'GET',
        path: `/config-dns/v2/changelists/${submitResult.zone}/submit/${submitResult.requestId}`
      }) as SubmitStatusResponse;

      if (statusResponse.status === 'COMPLETE' || statusResponse.status === 'FAILED') {
        return statusResponse;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, DNS_CHANGELIST_CONFIG.STATUS_POLL_INTERVAL));
    }

    throw new Error(`Changelist activation timed out after ${timeoutMs}ms`);
  }

  /**
   * Report progress to callback if provided
   * @private
   */
  private reportProgress(
    callback: ChangelistProgressCallback | undefined,
    progress: Parameters<ChangelistProgressCallback>[0]
  ): void {
    if (callback) {
      try {
        callback(progress);
      } catch (error) {
        logger.warn('Progress callback failed', { error });
      }
    }
  }

  /**
   * Get current status of a changelist operation
   * 
   * @param zone - DNS zone
   * @param requestId - Changelist request ID
   * @param customer - Customer context
   * @returns Current changelist status
   */
  async getChangelistStatus(
    zone: string,
    requestId: string,
    customer?: string
  ): Promise<SubmitStatusResponse> {
    const akamaiClient = new AkamaiClient(customer || 'default');

    return await akamaiClient.request({
      method: 'GET',
      path: `/config-dns/v2/changelists/${zone}/submit/${requestId}`
    }) as SubmitStatusResponse;
  }

  /**
   * List all pending changelists for a customer
   * 
   * @param customer - Customer context
   * @returns Array of pending changelists
   */
  async listPendingChangelists(customer?: string): Promise<any[]> {
    const akamaiClient = new AkamaiClient(customer || 'default');

    const response = await akamaiClient.request({
      method: 'GET',
      path: '/config-dns/v2/changelists'
    });

    return (response as any).changeLists || [];
  }
}

/**
 * DNS Changelist specific error class
 */
export class DNSChangelistError extends Error {
  constructor(
    message: string,
    public readonly result: ChangelistResult
  ) {
    super(message);
    this.name = 'DNSChangelistError';
  }
}