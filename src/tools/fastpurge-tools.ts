import { FastPurgeService } from '../services/FastPurgeService';
import { PurgeQueueManager } from '../services/PurgeQueueManager';
import { PurgeStatusTracker } from '../services/PurgeStatusTracker';
import { CustomerConfigManager } from '../utils/customer-config';
import { logger } from '../utils/logger';
import { AkamaiError } from '../utils/errors';

const fastPurgeService = FastPurgeService.getInstance();
const queueManager = PurgeQueueManager.getInstance();
const statusTracker = PurgeStatusTracker.getInstance();
const configManager = CustomerConfigManager.getInstance();

// Input validation functions
function validateUrls(urls: string[]): void {
  const invalidUrls = urls.filter(url => {
    try {
      new URL(url);
      return false;
    } catch {
      return true;
    }
  });

  if (invalidUrls.length > 0) {
    throw new AkamaiError(
      `Invalid URLs detected: ${invalidUrls.slice(0, 5).join(', ')}${invalidUrls.length > 5 ? '...' : ''}`,
      'INVALID_URLS'
    );
  }
}

function validateCpCodes(cpCodes: string[]): void {
  const invalidCodes = cpCodes.filter(code => !/^\d+$/.test(code));
  
  if (invalidCodes.length > 0) {
    throw new AkamaiError(
      `Invalid CP codes detected: ${invalidCodes.join(', ')}. CP codes must be numeric.`,
      'INVALID_CP_CODES'
    );
  }
}

function validateCacheTags(tags: string[]): void {
  const invalidTags = tags.filter(tag => 
    tag.length === 0 || 
    tag.length > 128 || 
    /[^a-zA-Z0-9._-]/.test(tag)
  );
  
  if (invalidTags.length > 0) {
    throw new AkamaiError(
      `Invalid cache tags: ${invalidTags.slice(0, 3).join(', ')}. Tags must be 1-128 characters, alphanumeric, dots, underscores, or hyphens only.`,
      'INVALID_CACHE_TAGS'
    );
  }
}

function formatResponse(operation: any, estimatedTime?: number): any {
  return {
    success: true,
    operationId: operation.id || operation.purgeId,
    message: operation.detail || 'FastPurge operation initiated successfully',
    estimatedCompletionTime: estimatedTime || operation.estimatedSeconds || 5,
    supportId: operation.supportId,
    batchCount: Array.isArray(operation) ? operation.length : 1,
    totalObjects: operation.purgedCount || operation.totalObjects,
    network: operation.network,
    nextSteps: [
      'Monitor progress using fastpurge.status.check',
      'Check queue status with fastpurge.queue.status',
      'Review operation details in the customer dashboard'
    ]
  };
}

// FastPurge URL invalidation tool
export const fastpurgeUrlInvalidate = {
  name: 'fastpurge.url.invalidate',
  description: 'Invalidate content by URL with intelligent batching and progress tracking',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer configuration name from .edgerc'
      },
      network: {
        type: 'string',
        enum: ['staging', 'production'],
        default: 'staging',
        description: 'Target network for purge operation'
      },
      urls: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10000,
        description: 'URLs to invalidate (up to 10,000 URLs per operation)'
      },
      useQueue: {
        type: 'boolean',
        default: true,
        description: 'Use intelligent queue management for batching and rate limiting'
      }
    },
    required: ['customer', 'urls']
  },
  handler: async (params: any) => {
    try {
      // Validate customer
      const customers = await configManager.getCustomers();
      if (!customers.includes(params.customer)) {
        throw new AkamaiError(
          `Unknown customer: ${params.customer}. Available customers: ${customers.join(', ')}`,
          'INVALID_CUSTOMER'
        );
      }

      // Validate URLs
      validateUrls(params.urls);

      // Production confirmation
      if (params.network === 'production') {
        logger.warn(`PRODUCTION PURGE initiated by customer ${params.customer} for ${params.urls.length} URLs`);
      }

      if (params.useQueue) {
        // Use queue manager for intelligent processing
        const queueItem = await queueManager.enqueue({
          customer: params.customer,
          network: params.network || 'staging',
          objects: params.urls,
          type: 'url'
        });

        return {
          success: true,
          queueId: queueItem.id,
          message: `${params.urls.length} URLs queued for purge on ${params.network || 'staging'}`,
          estimatedWaitTime: '0-30 seconds (depending on queue depth)',
          queuePosition: (await queueManager.getQueueStatus(params.customer)).pending,
          batchEstimate: Math.ceil(params.urls.length / 2000),
          nextSteps: [
            'Monitor queue status with fastpurge.queue.status',
            'Track progress once processing begins',
            'Check for consolidation suggestions to optimize future purges'
          ]
        };
      } else {
        // Direct purge for immediate processing
        const responses = await fastPurgeService.purgeByUrl(
          params.customer,
          params.network || 'staging',
          params.urls
        );

        // Track the operation
        const operationId = await statusTracker.trackOperation(
          params.customer,
          'url',
          params.network || 'staging',
          params.urls,
          responses
        );

        return {
          ...formatResponse(responses[0]),
          operationId,
          batchCount: responses.length,
          totalObjects: params.urls.length
        };
      }
    } catch (error: any) {
      logger.error(`FastPurge URL invalidate failed: ${error.message}`);
      
      if (error instanceof AkamaiError) {
        return {
          success: false,
          error: error.code,
          message: error.message,
          guidance: error.code === 'RATE_LIMIT_EXCEEDED' 
            ? 'Wait a few minutes before retrying, or use queue management for automatic rate limiting'
            : 'Check URL format and network parameters'
        };
      }
      
      throw error;
    }
  }
};

// FastPurge CP Code invalidation tool
export const fastpurgeCpcodeInvalidate = {
  name: 'fastpurge.cpcode.invalidate',
  description: 'Invalidate content by CP code with impact estimation and confirmation',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer configuration name from .edgerc'
      },
      network: {
        type: 'string',
        enum: ['staging', 'production'],
        default: 'staging',
        description: 'Target network for purge operation'
      },
      cpCodes: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 100,
        description: 'CP codes to invalidate (numeric values only)'
      },
      confirmed: {
        type: 'boolean',
        default: false,
        description: 'Confirmation for high-impact CP code purge operation'
      }
    },
    required: ['customer', 'cpCodes']
  },
  handler: async (params: any) => {
    try {
      // Validate customer
      const customers = await configManager.getCustomers();
      if (!customers.includes(params.customer)) {
        throw new AkamaiError(
          `Unknown customer: ${params.customer}. Available customers: ${customers.join(', ')}`,
          'INVALID_CUSTOMER'
        );
      }

      // Validate CP codes
      validateCpCodes(params.cpCodes);

      // High-impact operation confirmation
      if (!params.confirmed && (params.network === 'production' || params.cpCodes.length > 5)) {
        return {
          success: false,
          requiresConfirmation: true,
          message: 'CP code purge is a high-impact operation that affects all content under the specified codes',
          impact: {
            network: params.network || 'staging',
            cpCodes: params.cpCodes,
            affectedContent: 'All cached content under these CP codes will be invalidated'
          },
          confirmation: 'Add "confirmed": true to proceed with this operation',
          estimatedImpact: params.cpCodes.length > 1 ? 'High - Multiple CP codes' : 'Medium - Single CP code'
        };
      }

      const responses = await fastPurgeService.purgeByCpCode(
        params.customer,
        params.network || 'staging',
        params.cpCodes
      );

      // Track the operation
      const operationId = await statusTracker.trackOperation(
        params.customer,
        'cpcode',
        params.network || 'staging',
        params.cpCodes,
        responses
      );

      return {
        ...formatResponse(responses[0]),
        operationId,
        batchCount: responses.length,
        totalCpCodes: params.cpCodes.length,
        impact: 'All content under specified CP codes has been invalidated',
        warning: params.network === 'production' 
          ? 'Production content invalidated - monitor for any impact'
          : undefined
      };
    } catch (error: any) {
      logger.error(`FastPurge CP code invalidate failed: ${error.message}`);
      
      if (error instanceof AkamaiError) {
        return {
          success: false,
          error: error.code,
          message: error.message,
          guidance: 'Verify CP codes exist and are accessible in your account'
        };
      }
      
      throw error;
    }
  }
};

// FastPurge cache tag invalidation tool
export const fastpurgeTagInvalidate = {
  name: 'fastpurge.tag.invalidate',
  description: 'Invalidate content by cache tag with tag validation and hierarchical support',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer configuration name from .edgerc'
      },
      network: {
        type: 'string',
        enum: ['staging', 'production'],
        default: 'staging',
        description: 'Target network for purge operation'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5000,
        description: 'Cache tags to invalidate (1-128 characters, alphanumeric plus dots, underscores, hyphens)'
      }
    },
    required: ['customer', 'tags']
  },
  handler: async (params: any) => {
    try {
      // Validate customer
      const customers = await configManager.getCustomers();
      if (!customers.includes(params.customer)) {
        throw new AkamaiError(
          `Unknown customer: ${params.customer}. Available customers: ${customers.join(', ')}`,
          'INVALID_CUSTOMER'
        );
      }

      // Validate cache tags
      validateCacheTags(params.tags);

      const responses = await fastPurgeService.purgeByCacheTag(
        params.customer,
        params.network || 'staging',
        params.tags
      );

      // Track the operation
      const operationId = await statusTracker.trackOperation(
        params.customer,
        'tag',
        params.network || 'staging',
        params.tags,
        responses
      );

      return {
        ...formatResponse(responses[0]),
        operationId,
        batchCount: responses.length,
        totalTags: params.tags.length,
        efficiency: 'Cache tag purging is the most efficient invalidation method',
        tip: 'Use hierarchical tags (e.g., "product.123", "category.electronics") for better cache management'
      };
    } catch (error: any) {
      logger.error(`FastPurge tag invalidate failed: ${error.message}`);
      
      if (error instanceof AkamaiError) {
        return {
          success: false,
          error: error.code,
          message: error.message,
          guidance: 'Check tag format - only alphanumeric characters, dots, underscores, and hyphens allowed'
        };
      }
      
      throw error;
    }
  }
};

// FastPurge status check tool
export const fastpurgeStatusCheck = {
  name: 'fastpurge.status.check',
  description: 'Check operation status with real-time progress and detailed reporting',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer configuration name from .edgerc'
      },
      operationId: {
        type: 'string',
        description: 'Operation ID from fastpurge operation or purge ID from Akamai'
      }
    },
    required: ['customer', 'operationId']
  },
  handler: async (params: any) => {
    try {
      const customers = await configManager.getCustomers();
      if (!customers.includes(params.customer)) {
        throw new AkamaiError(
          `Unknown customer: ${params.customer}. Available customers: ${customers.join(', ')}`,
          'INVALID_CUSTOMER'
        );
      }

      // First try to get operation from tracker
      const operation = await statusTracker.getOperationStatus(params.operationId);
      
      if (operation) {
        const timeElapsed = Date.now() - operation.createdAt.getTime();
        const isComplete = operation.status === 'completed' || operation.status === 'failed';
        
        return {
          success: true,
          operationId: operation.id,
          status: operation.status,
          progress: operation.progress,
          remainingTime: operation.remainingSeconds,
          timeElapsed: Math.floor(timeElapsed / 1000),
          details: {
            customer: operation.customer,
            type: operation.type,
            network: operation.network,
            totalObjects: operation.totalObjects,
            processedObjects: operation.processedObjects,
            batchesCompleted: operation.batches.filter(b => b.status === 'completed').length,
            totalBatches: operation.batches.length
          },
          summary: operation.summary,
          errors: operation.errors.slice(-5), // Last 5 errors
          isComplete,
          nextAction: isComplete 
            ? 'Operation complete - check summary for details'
            : 'Continue monitoring or check queue status'
        };
      } else {
        // Fall back to direct API check
        const status = await fastPurgeService.checkPurgeStatus(params.customer, params.operationId);
        
        return {
          success: true,
          purgeId: status.purgeId,
          status: status.status,
          submittedBy: status.submittedBy,
          submittedTime: status.submittedTime,
          completionTime: status.completionTime,
          estimatedSeconds: status.estimatedSeconds,
          purgedCount: status.purgedCount,
          supportId: status.supportId,
          isComplete: status.status === 'Done' || status.status === 'Failed'
        };
      }
    } catch (error: any) {
      logger.error(`FastPurge status check failed: ${error.message}`);
      
      if (error instanceof AkamaiError) {
        return {
          success: false,
          error: error.code,
          message: error.message,
          guidance: 'Verify operation ID is correct and operation exists'
        };
      }
      
      throw error;
    }
  }
};

// FastPurge queue status tool
export const fastpurgeQueueStatus = {
  name: 'fastpurge.queue.status',
  description: 'Check queue status with customer-specific metrics and capacity planning',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer configuration name from .edgerc'
      },
      detailed: {
        type: 'boolean',
        default: false,
        description: 'Include detailed queue items and consolidation suggestions'
      }
    },
    required: ['customer']
  },
  handler: async (params: any) => {
    try {
      const customers = await configManager.getCustomers();
      if (!customers.includes(params.customer)) {
        throw new AkamaiError(
          `Unknown customer: ${params.customer}. Available customers: ${customers.join(', ')}`,
          'INVALID_CUSTOMER'
        );
      }

      const queueStats = await queueManager.getQueueStatus(params.customer);
      const rateLimitStatus = fastPurgeService.getRateLimitStatus(params.customer);
      const dashboard = await statusTracker.getCustomerDashboard(params.customer);

      const response: any = {
        success: true,
        customer: params.customer,
        queue: {
          pending: queueStats.pending,
          processing: queueStats.processing,
          completed: queueStats.completed,
          failed: queueStats.failed,
          estimatedCompletionTime: queueStats.estimatedCompletionTime,
          queueDepth: queueStats.queueDepth
        },
        rateLimit: {
          available: rateLimitStatus.available,
          capacity: rateLimitStatus.capacity,
          utilizationPercent: Math.round(((rateLimitStatus.capacity - rateLimitStatus.available) / rateLimitStatus.capacity) * 100)
        },
        performance: {
          throughputRate: queueStats.throughputRate,
          successRate: dashboard.performance.successRate,
          averageLatency: dashboard.performance.averageLatency
        },
        capacity: {
          canProcessImmediately: rateLimitStatus.available > 0,
          recommendedBatchSize: Math.min(2000, rateLimitStatus.available * 50),
          nextAvailableSlot: rateLimitStatus.available === 0 ? '60 seconds' : 'Immediate'
        }
      };

      if (params.detailed) {
        const queueItems = await queueManager.getQueueItems(params.customer, undefined, 20);
        const suggestions = await queueManager.getConsolidationSuggestions(params.customer);
        
        response.queueItems = queueItems.map(item => ({
          id: item.id,
          type: item.type,
          network: item.network,
          objectCount: item.objects.length,
          status: item.status,
          priority: item.priority,
          createdAt: item.createdAt,
          attempts: item.attempts
        }));
        
        response.consolidationSuggestions = suggestions;
      }

      return response;
    } catch (error: any) {
      logger.error(`FastPurge queue status failed: ${error.message}`);
      
      if (error instanceof AkamaiError) {
        return {
          success: false,
          error: error.code,
          message: error.message
        };
      }
      
      throw error;
    }
  }
};

// FastPurge operation estimation tool
export const fastpurgeEstimate = {
  name: 'fastpurge.estimate',
  description: 'Pre-operation impact assessment with time estimates and resource consumption',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer configuration name from .edgerc'
      },
      type: {
        type: 'string',
        enum: ['url', 'cpcode', 'tag'],
        description: 'Type of purge operation to estimate'
      },
      objects: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Objects to purge (URLs, CP codes, or cache tags)'
      },
      network: {
        type: 'string',
        enum: ['staging', 'production'],
        default: 'staging',
        description: 'Target network for estimation'
      }
    },
    required: ['customer', 'type', 'objects']
  },
  handler: async (params: any) => {
    try {
      const customers = await configManager.getCustomers();
      if (!customers.includes(params.customer)) {
        throw new AkamaiError(
          `Unknown customer: ${params.customer}. Available customers: ${customers.join(', ')}`,
          'INVALID_CUSTOMER'
        );
      }

      // Validate objects based on type
      if (params.type === 'url') {
        validateUrls(params.objects);
      } else if (params.type === 'cpcode') {
        validateCpCodes(params.objects);
      } else if (params.type === 'tag') {
        validateCacheTags(params.objects);
      }

      const estimatedTime = fastPurgeService.estimateCompletionTime(params.objects);
      const rateLimitStatus = fastPurgeService.getRateLimitStatus(params.customer);
      
      // Calculate batch information
      const batchSizes = params.objects.map(obj => Buffer.byteLength(obj, 'utf8'));
      const totalSize = batchSizes.reduce((a, b) => a + b, 0);
      const estimatedBatches = Math.ceil(totalSize / (50 * 1024)); // 50KB limit
      
      const estimate = {
        success: true,
        operation: {
          type: params.type,
          network: params.network || 'staging',
          objectCount: params.objects.length,
          estimatedBatches,
          totalSize: `${Math.round(totalSize / 1024)}KB`
        },
        timing: {
          estimatedCompletionTime: estimatedTime,
          processingDelay: rateLimitStatus.available > 0 ? 0 : 60,
          totalEstimatedTime: estimatedTime + (rateLimitStatus.available > 0 ? 0 : 60)
        },
        resources: {
          rateLimitTokensRequired: estimatedBatches,
          currentlyAvailable: rateLimitStatus.available,
          canProceedImmediately: rateLimitStatus.available >= estimatedBatches
        },
        recommendations: [] as string[]
      };

      // Add recommendations based on analysis
      if (params.type === 'url' && params.objects.length > 100) {
        estimate.recommendations.push('Consider using CP code purging for better efficiency with large URL sets');
      }
      
      if (params.type === 'url' && params.objects.length > 2000) {
        estimate.recommendations.push('Large URL set detected - operation will be automatically batched');
      }
      
      if (estimatedBatches > rateLimitStatus.available) {
        estimate.recommendations.push('Rate limit capacity exceeded - use queue management for automatic processing');
      }
      
      if (params.network === 'production') {
        estimate.recommendations.push('Production purge detected - ensure proper validation and approval processes');
      }

      return estimate;
    } catch (error: any) {
      logger.error(`FastPurge estimate failed: ${error.message}`);
      
      if (error instanceof AkamaiError) {
        return {
          success: false,
          error: error.code,
          message: error.message,
          guidance: 'Check operation parameters and object format'
        };
      }
      
      throw error;
    }
  }
};

// Export all tools
export const fastPurgeTools = [
  fastpurgeUrlInvalidate,
  fastpurgeCpcodeInvalidate,
  fastpurgeTagInvalidate,
  fastpurgeStatusCheck,
  fastpurgeQueueStatus,
  fastpurgeEstimate
];