/**
 * Error Recovery Suggest Tool
 * 
 * Analyzes errors and suggests recovery strategies based on:
 * - Error type and status code
 * - Previous successful recoveries
 * - Current context and state
 * - Available recovery options
 */

import { z } from 'zod';
import { MCPToolResponse } from '../../types';
import { errorRecoveryService, RecoveryContext, RecoveryStrategy } from '../../services/error-recovery-service';
import { AkamaiError } from '../../core/errors/error-handler';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('error-recovery-suggest-tool');

/**
 * Input schema for suggest recovery tool
 */
const SuggestRecoverySchema = z.object({
  error: z.object({
    message: z.string(),
    status: z.number().optional(),
    type: z.string().optional(),
    detail: z.string().optional(),
    requestId: z.string().optional()
  }).describe('Error details to analyze'),
  
  context: z.object({
    tool: z.string().describe('Tool that encountered the error'),
    operation: z.string().describe('Operation that failed'),
    customer: z.string().optional().describe('Customer context'),
    args: z.record(z.any()).optional().describe('Original operation arguments'),
    attempt: z.number().optional().describe('Current retry attempt number')
  }).describe('Context of the error'),
  
  requestMetadata: z.object({
    path: z.string().optional(),
    method: z.string().optional(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  }).optional().describe('HTTP request metadata if available')
});

/**
 * Tool definition
 */
export const suggestRecoveryTool = {
  name: 'error_recovery_suggest',
  description: 'Analyze an error and suggest recovery strategies',
  schema: SuggestRecoverySchema,
  
  handler: async (args: z.infer<typeof SuggestRecoverySchema>): Promise<MCPToolResponse> => {
    try {
      logger.info('Analyzing error for recovery suggestions', {
        tool: args.context.tool,
        operation: args.context.operation,
        errorStatus: args.error.status
      });
      
      // Create error object
      let error: Error | AkamaiError;
      if (args.error.status && args.error.type) {
        error = new AkamaiError({
          type: args.error.type,
          title: args.error.message,
          detail: args.error.detail || args.error.message,
          status: args.error.status,
          requestId: args.error.requestId
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
        requestMetadata: args.requestMetadata
      };
      
      // Get recovery suggestions
      const suggestions = await errorRecoveryService.analyzeError(context);
      
      // Format response
      let response = `## Error Recovery Suggestions\n\n`;
      response += `**Error:** ${args.error.message}\n`;
      response += `**Tool:** ${args.context.tool}\n`;
      response += `**Operation:** ${args.context.operation}\n\n`;
      
      if (suggestions.length === 0) {
        response += `No automatic recovery strategies available. Manual intervention required.\n`;
      } else {
        response += `### Recommended Recovery Strategies\n\n`;
        
        suggestions.forEach((suggestion, index) => {
          response += `#### ${index + 1}. ${getStrategyName(suggestion.strategy)}\n`;
          response += `- **Description:** ${suggestion.description}\n`;
          response += `- **Confidence:** ${Math.round(suggestion.confidence * 100)}%\n`;
          response += `- **Automatic:** ${suggestion.automatic ? 'Yes' : 'No'}\n`;
          
          if (suggestion.estimatedDuration) {
            response += `- **Estimated Duration:** ${Math.round(suggestion.estimatedDuration / 1000)}s\n`;
          }
          
          if (suggestion.parameters) {
            response += `- **Parameters:**\n`;
            Object.entries(suggestion.parameters).forEach(([key, value]) => {
              response += `  - ${key}: ${JSON.stringify(value)}\n`;
            });
          }
          
          if (suggestion.fallbackStrategies && suggestion.fallbackStrategies.length > 0) {
            response += `- **Fallback Strategies:** ${suggestion.fallbackStrategies.map(getStrategyName).join(', ')}\n`;
          }
          
          response += '\n';
        });
        
        // Add execution instructions
        response += `### How to Execute Recovery\n\n`;
        response += `Use the \`error_recovery_execute\` tool with:\n`;
        response += `- strategy: The strategy name from above\n`;
        response += `- context: The same context provided here\n`;
        response += `- parameters: Any additional parameters needed\n\n`;
        
        // Add analytics info
        const analytics = errorRecoveryService.getAnalytics();
        const topStrategy = suggestions[0].strategy;
        const stats = analytics.strategySuccessRates.get(topStrategy);
        
        if (stats && stats.successes + stats.failures > 0) {
          const successRate = (stats.successes / (stats.successes + stats.failures)) * 100;
          response += `### Historical Success Rate\n\n`;
          response += `The recommended strategy (${getStrategyName(topStrategy)}) has a ${successRate.toFixed(1)}% success rate based on ${stats.successes + stats.failures} previous attempts.\n`;
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
      
    } catch (error) {
      logger.error('Failed to suggest recovery strategies', { error });
      
      return {
        content: [{
          type: 'text',
          text: `Error analyzing recovery options: ${error instanceof Error ? error.message : 'Unknown error'}`
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