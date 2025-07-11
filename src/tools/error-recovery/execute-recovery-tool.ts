/**
 * Error Recovery Execute Tool
 * 
 * Executes a recovery strategy with monitoring and tracking.
 * Integrates with the original operation to retry with
 * recovery parameters applied.
 */

import { z } from 'zod';
import { MCPToolResponse } from '../../types';
import { errorRecoveryService, RecoveryContext, RecoveryStrategy, RecoveryAction } from '../../services/error-recovery-service';
import { AkamaiError } from '../../core/errors/error-handler';
import { createLogger } from '../../utils/pino-logger';
import { AkamaiClient } from '../../akamai-client';

const logger = createLogger('error-recovery-execute-tool');

/**
 * Input schema for execute recovery tool
 */
const ExecuteRecoverySchema = z.object({
  strategy: z.nativeEnum(RecoveryStrategy).describe('Recovery strategy to execute'),
  
  context: z.object({
    tool: z.string().describe('Tool that encountered the error'),
    operation: z.string().describe('Operation that failed'),
    customer: z.string().optional().describe('Customer context'),
    args: z.record(z.any()).optional().describe('Original operation arguments'),
    attempt: z.number().optional().describe('Current retry attempt number')
  }).describe('Context of the error'),
  
  error: z.object({
    message: z.string(),
    status: z.number().optional(),
    type: z.string().optional(),
    detail: z.string().optional()
  }).describe('Original error details'),
  
  parameters: z.record(z.any()).optional().describe('Additional parameters for the recovery strategy'),
  
  originalRequest: z.object({
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    body: z.any().optional(),
    queryParams: z.record(z.string()).optional(),
    headers: z.record(z.string()).optional()
  }).optional().describe('Original API request to retry')
});

/**
 * Tool definition
 */
export const executeRecoveryTool = {
  name: 'error_recovery_execute',
  description: 'Execute a recovery strategy for a failed operation',
  schema: ExecuteRecoverySchema,
  
  handler: async (args: z.infer<typeof ExecuteRecoverySchema>): Promise<MCPToolResponse> => {
    try {
      logger.info('Executing recovery strategy', {
        strategy: args.strategy,
        tool: args.context.tool,
        operation: args.context.operation
      });
      
      // Create error object
      let error: Error | AkamaiError;
      if (args.error.status && args.error.type) {
        error = new AkamaiError({
          type: args.error.type,
          title: args.error.message,
          detail: args.error.detail || args.error.message,
          status: args.error.status
        });
      } else {
        error = new Error(args.error.message);
      }
      
      // Build recovery context
      const context: RecoveryContext = {
        error,
        tool: args.context.tool,
        operation: args.context.operation,
        args: args.context.args,
        customer: args.context.customer,
        attempt: args.context.attempt,
        requestMetadata: args.originalRequest
      };
      
      // Create recovery action
      const action: RecoveryAction = {
        strategy: args.strategy,
        description: `Executing ${args.strategy} recovery`,
        confidence: 1.0,
        automatic: true,
        parameters: args.parameters
      };
      
      // Create executor function
      const executor = async (params?: any) => {
        if (!args.originalRequest) {
          throw new Error('Original request information required for recovery execution');
        }
        
        // Create client with appropriate customer
        const customer = params?.customer || args.context.customer || 'default';
        const client = new AkamaiClient(customer);
        
        // Merge recovery parameters with original request
        const requestConfig = {
          ...args.originalRequest,
          ...(params?.requestOverrides || {})
        };
        
        // Execute the request
        return client.request(requestConfig);
      };
      
      // Execute recovery
      const result = await errorRecoveryService.executeRecovery(action, context, executor);
      
      // Format response
      let response = `## Recovery Execution Result\n\n`;
      response += `**Strategy:** ${getStrategyName(args.strategy)}\n`;
      response += `**Success:** ${result.success ? '✅ Yes' : '❌ No'}\n`;
      response += `**Duration:** ${(result.duration / 1000).toFixed(2)}s\n\n`;
      
      if (result.success) {
        response += `### Operation Succeeded\n\n`;
        response += `The ${args.context.operation} operation completed successfully after recovery.\n\n`;
        
        if (result.result) {
          response += `### Result\n\n`;
          response += `\`\`\`json\n${JSON.stringify(result.result, null, 2)}\n\`\`\`\n`;
        }
        
        // Add learning note
        response += `\n### Recovery Learning\n\n`;
        response += `This successful recovery has been recorded and will improve future suggestions for similar errors.\n`;
      } else {
        response += `### Recovery Failed\n\n`;
        response += `The recovery strategy did not succeed.\n`;
        
        if (result.error) {
          response += `\n**Error:** ${result.error.message}\n`;
        }
        
        // Suggest next steps
        response += `\n### Next Steps\n\n`;
        response += `1. Try a different recovery strategy\n`;
        response += `2. Check the error details for more information\n`;
        response += `3. Consider manual intervention\n`;
        response += `4. Contact support if the issue persists\n`;
      }
      
      // Add analytics summary
      const analytics = errorRecoveryService.getAnalytics();
      const stats = analytics.strategySuccessRates.get(args.strategy);
      
      if (stats && stats.successes + stats.failures > 0) {
        const successRate = (stats.successes / (stats.successes + stats.failures)) * 100;
        response += `\n### Strategy Performance\n\n`;
        response += `This strategy has a ${successRate.toFixed(1)}% success rate (${stats.successes}/${stats.successes + stats.failures} attempts).\n`;
      }
      
      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
      
    } catch (error) {
      logger.error('Failed to execute recovery strategy', { error });
      
      return {
        content: [{
          type: 'text',
          text: `Error executing recovery: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
};

/**
 * Get human-readable strategy name
 */
function getStrategyName(strategy: RecoveryStrategy): string {
  const names: Record<RecoveryStrategy, string> = {
    [RecoveryStrategy.RETRY_WITH_BACKOFF]: 'Retry with Exponential Backoff',
    [RecoveryStrategy.ACCOUNT_SWITCH]: 'Switch Account',
    [RecoveryStrategy.FALLBACK_ENDPOINT]: 'Use Fallback Endpoint',
    [RecoveryStrategy.VALIDATION_CORRECTION]: 'Correct Validation Errors',
    [RecoveryStrategy.CIRCUIT_BREAKER_WAIT]: 'Wait for Circuit Breaker',
    [RecoveryStrategy.INCREASE_TIMEOUT]: 'Increase Timeout',
    [RecoveryStrategy.REDUCE_BATCH_SIZE]: 'Reduce Batch Size',
    [RecoveryStrategy.USE_CACHE]: 'Use Cached Data',
    [RecoveryStrategy.MANUAL_INTERVENTION]: 'Manual Intervention Required'
  };
  
  return names[strategy] || strategy;
}