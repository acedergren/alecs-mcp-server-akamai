/**
 * Error Recovery Analyze Tool
 * 
 * Provides analytics and insights on error recovery patterns:
 * - Success rates by strategy
 * - Common error patterns
 * - Average recovery times
 * - Learning recommendations
 */

import { z } from 'zod';
import { MCPToolResponse } from '../../types';
import { errorRecoveryService, RecoveryStrategy } from '../../services/error-recovery-service';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('error-recovery-analyze-tool');

/**
 * Input schema for analyze recovery tool
 */
const AnalyzeRecoverySchema = z.object({
  filter: z.object({
    strategy: z.nativeEnum(RecoveryStrategy).optional().describe('Filter by specific strategy'),
    tool: z.string().optional().describe('Filter by tool'),
    minSuccessRate: z.number().min(0).max(1).optional().describe('Minimum success rate threshold'),
    sortBy: z.enum(['success_rate', 'total_attempts', 'avg_duration']).optional().default('success_rate')
  }).optional().default({})
});

/**
 * Tool definition
 */
export const analyzeRecoveryTool = {
  name: 'error_recovery_analyze',
  description: 'Analyze error recovery patterns and get insights',
  schema: AnalyzeRecoverySchema,
  
  handler: async (args: z.infer<typeof AnalyzeRecoverySchema>): Promise<MCPToolResponse> => {
    try {
      logger.info('Analyzing error recovery patterns', { filter: args.filter });
      
      // Get analytics
      const analytics = errorRecoveryService.getAnalytics();
      
      let response = `## Error Recovery Analytics\n\n`;
      
      // Strategy performance
      response += `### Strategy Performance\n\n`;
      response += `| Strategy | Success Rate | Total Attempts | Avg Duration |\n`;
      response += `|----------|-------------|----------------|-------------|\n`;
      
      // Convert to array for sorting
      const strategies: Array<{
        strategy: RecoveryStrategy;
        successRate: number;
        totalAttempts: number;
        avgDuration: number;
      }> = [];
      
      analytics.strategySuccessRates.forEach((stats, strategy) => {
        const totalAttempts = stats.successes + stats.failures;
        if (totalAttempts === 0) return;
        
        const successRate = stats.successes / totalAttempts;
        const avgDuration = analytics.averageRecoveryTimes.get(strategy) || 0;
        
        // Apply filters
        if (args.filter?.strategy && strategy !== args.filter.strategy) return;
        if (args.filter?.minSuccessRate && successRate < args.filter.minSuccessRate) return;
        
        strategies.push({
          strategy,
          successRate,
          totalAttempts,
          avgDuration
        });
      });
      
      // Sort strategies
      strategies.sort((a, b) => {
        switch (args.filter?.sortBy) {
          case 'total_attempts':
            return b.totalAttempts - a.totalAttempts;
          case 'avg_duration':
            return a.avgDuration - b.avgDuration;
          case 'success_rate':
          default:
            return b.successRate - a.successRate;
        }
      });
      
      // Add to table
      strategies.forEach(({ strategy, successRate, totalAttempts, avgDuration }) => {
        response += `| ${getStrategyName(strategy)} | ${(successRate * 100).toFixed(1)}% | ${totalAttempts} | ${(avgDuration / 1000).toFixed(1)}s |\n`;
      });
      
      if (strategies.length === 0) {
        response += `| No data available | - | - | - |\n`;
      }
      
      // Error patterns
      response += `\n### Learned Error Patterns\n\n`;
      
      if (analytics.errorPatterns.size > 0) {
        response += `| Error Pattern | Successful Strategies |\n`;
        response += `|---------------|---------------------|\n`;
        
        analytics.errorPatterns.forEach((strategies, pattern) => {
          const strategyNames = strategies.map(getStrategyName).join(', ');
          response += `| ${pattern} | ${strategyNames} |\n`;
        });
      } else {
        response += `No error patterns learned yet.\n`;
      }
      
      // Recommendations
      response += `\n### Recommendations\n\n`;
      
      // Find best performing strategies
      const highPerformers = strategies.filter(s => s.successRate >= 0.8 && s.totalAttempts >= 5);
      if (highPerformers.length > 0) {
        response += `**High-performing strategies (80%+ success rate):**\n`;
        highPerformers.forEach(s => {
          response += `- ${getStrategyName(s.strategy)}: ${(s.successRate * 100).toFixed(1)}% success rate\n`;
        });
        response += '\n';
      }
      
      // Find struggling strategies
      const lowPerformers = strategies.filter(s => s.successRate < 0.5 && s.totalAttempts >= 5);
      if (lowPerformers.length > 0) {
        response += `**Strategies needing improvement (<50% success rate):**\n`;
        lowPerformers.forEach(s => {
          response += `- ${getStrategyName(s.strategy)}: ${(s.successRate * 100).toFixed(1)}% success rate\n`;
        });
        response += '\n';
      }
      
      // General insights
      response += `**General Insights:**\n`;
      
      const totalRecoveries = strategies.reduce((sum, s) => sum + s.totalAttempts, 0);
      const successfulRecoveries = strategies.reduce((sum, s) => {
        const stats = analytics.strategySuccessRates.get(s.strategy)!;
        return sum + stats.successes;
      }, 0);
      
      if (totalRecoveries > 0) {
        const overallSuccessRate = (successfulRecoveries / totalRecoveries) * 100;
        response += `- Overall recovery success rate: ${overallSuccessRate.toFixed(1)}%\n`;
        response += `- Total recovery attempts: ${totalRecoveries}\n`;
        response += `- Successful recoveries: ${successfulRecoveries}\n`;
      }
      
      // Most common recovery needs
      const attemptsByStrategy = strategies.sort((a, b) => b.totalAttempts - a.totalAttempts).slice(0, 3);
      if (attemptsByStrategy.length > 0) {
        response += `\n**Most common recovery needs:**\n`;
        attemptsByStrategy.forEach((s, i) => {
          response += `${i + 1}. ${getStrategyName(s.strategy)} (${s.totalAttempts} attempts)\n`;
        });
      }
      
      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
      
    } catch (error) {
      logger.error('Failed to analyze recovery patterns', { error });
      
      return {
        content: [{
          type: 'text',
          text: `Error analyzing recovery patterns: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    [RecoveryStrategy.RETRY_WITH_BACKOFF]: 'Retry with Backoff',
    [RecoveryStrategy.ACCOUNT_SWITCH]: 'Account Switch',
    [RecoveryStrategy.FALLBACK_ENDPOINT]: 'Fallback Endpoint',
    [RecoveryStrategy.VALIDATION_CORRECTION]: 'Validation Correction',
    [RecoveryStrategy.CIRCUIT_BREAKER_WAIT]: 'Circuit Breaker Wait',
    [RecoveryStrategy.INCREASE_TIMEOUT]: 'Increase Timeout',
    [RecoveryStrategy.REDUCE_BATCH_SIZE]: 'Reduce Batch Size',
    [RecoveryStrategy.USE_CACHE]: 'Use Cache',
    [RecoveryStrategy.MANUAL_INTERVENTION]: 'Manual Intervention'
  };
  
  return names[strategy] || strategy;
}