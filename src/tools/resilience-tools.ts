/**
 * Resilience and Error Recovery Tools
 * MCP tools for monitoring, managing, and recovering from operational issues
 */

import {
  globalResilienceManager,
  OperationType,
  CircuitBreakerState,
  HealthChecker,
  type HealthCheckResult,
} from '@utils/resilience-manager';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

/**
 * Get system health status
 */
export async function getSystemHealth(
  _client: AkamaiClient,
  args: {
    includeMetrics?: boolean;
    operationType?: OperationType;
  },
): Promise<MCPToolResponse> {
  try {
    let healthChecks: HealthCheckResult[];

    if (args.operationType) {
      healthChecks = [HealthChecker.checkOperationHealth(args.operationType)];
    } else {
      healthChecks = HealthChecker.checkAllOperationsHealth();
    }

    const overallStatus = healthChecks.every((h) => h.status === 'HEALTHY')
      ? 'HEALTHY'
      : healthChecks.some((h) => h.status === 'UNHEALTHY')
        ? 'UNHEALTHY'
        : 'DEGRADED';

    let responseText = '# System Health Report\n\n';
    responseText += `**Overall Status:** ${getStatusEmoji(overallStatus)} ${overallStatus}\n`;
    responseText += `**Last Check:** ${new Date().toISOString()}\n\n`;

    // Summary by status
    const healthyCount = healthChecks.filter((h) => h.status === 'HEALTHY').length;
    const degradedCount = healthChecks.filter((h) => h.status === 'DEGRADED').length;
    const unhealthyCount = healthChecks.filter((h) => h.status === 'UNHEALTHY').length;

    responseText += '## Status Summary\n';
    responseText += `- ${getStatusEmoji('HEALTHY')} Healthy: ${healthyCount}\n`;
    responseText += `- ${getStatusEmoji('DEGRADED')} Degraded: ${degradedCount}\n`;
    responseText += `- ${getStatusEmoji('UNHEALTHY')} Unhealthy: ${unhealthyCount}\n\n`;

    // Detailed status by operation type
    responseText += '## Operation Status\n\n';

    healthChecks.forEach((check) => {
      responseText += `### ${check.operationType}\n`;
      responseText += `**Status:** ${getStatusEmoji(check.status)} ${check.status}\n`;
      responseText += `**Circuit Breaker:** ${getCircuitBreakerEmoji(check.circuitBreakerState)} ${check.circuitBreakerState}\n`;

      if (check.issues.length > 0) {
        responseText += '**Issues:**\n';
        check.issues.forEach((issue) => {
          responseText += `- ${issue}\n`;
        });
      }

      if (args.includeMetrics) {
        responseText += '**Metrics:**\n';
        responseText += `- Total Calls: ${check.metrics.totalCalls}\n`;
        responseText += `- Success Rate: ${((1 - check.metrics.errorRate) * 100).toFixed(1)}%\n`;
        responseText += `- Avg Response Time: ${check.metrics.averageResponseTime.toFixed(0)}ms\n`;
        responseText += `- P95 Response Time: ${check.metrics.p95ResponseTime.toFixed(0)}ms\n`;
        if (check.metrics.consecutiveFailures > 0) {
          responseText += `- Consecutive Failu_res: ${check.metrics.consecutiveFailures}\n`;
        }
      }

      responseText += '\n';
    });

    // Action recommendations
    const unhealthyOps = healthChecks.filter((h) => h.status === 'UNHEALTHY');
    const degradedOps = healthChecks.filter((h) => h.status === 'DEGRADED');

    if (unhealthyOps.length > 0 || degradedOps.length > 0) {
      responseText += '## Recommended Actions\n\n';

      if (unhealthyOps.length > 0) {
        responseText += '### Critical Issues\n';
        unhealthyOps.forEach((op) => {
          responseText += `**${op.operationType}:**\n`;
          op.issues.forEach((issue) => {
            responseText += `- ${issue}\n`;
          });

          if (op.circuitBreakerState === CircuitBreakerState.OPEN) {
            responseText += '- Wait for circuit breaker reset or use `reset_circuit_breaker` tool\n';
          }
          responseText += '- Check Akamai service status\n';
          responseText += '- Review recent changes to configuration\n\n';
        });
      }

      if (degradedOps.length > 0) {
        responseText += '### Performance Issues\n';
        degradedOps.forEach((op) => {
          responseText += `**${op.operationType}:**\n`;
          op.issues.forEach((issue) => {
            responseText += `- ${issue}\n`;
          });
          responseText += '- Monitor for improvement\n';
          responseText += '- Consider reducing request frequency\n\n';
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
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error checking system health: ${(_error as Error).message}`,
        },
      ],
    };
  }
}

/**
 * Reset circuit breaker for an operation type
 */
export async function resetCircuitBreaker(
  _client: AkamaiClient,
  args: {
    operationType: OperationType;
    force?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const currentState = globalResilienceManager.getCircuitBreakerState(args.operationType);

    if (!currentState) {
      return {
        content: [
          {
            type: 'text',
            text: `No circuit breaker found for operation type: ${args.operationType}`,
          },
        ],
      };
    }

    if (currentState === CircuitBreakerState.CLOSED && !args.force) {
      return {
        content: [
          {
            type: 'text',
            text: `Circuit breaker for ${args.operationType} is already CLOSED. Use force=true to reset anyway.`,
          },
        ],
      };
    }

    globalResilienceManager.resetCircuitBreaker(args.operationType);

    let responseText = '# Circuit Breaker Reset\n\n';
    responseText += `**Operation Type:** ${args.operationType}\n`;
    responseText += `**Previous State:** ${currentState}\n`;
    responseText += '**New State:** CLOSED\n';
    responseText += `**Reset Time:** ${new Date().toISOString()}\n\n`;

    responseText += '## What This Means\n';
    responseText += '- The circuit breaker has been reset to CLOSED state\n';
    responseText += '- Operations will be attempted normally\n';
    responseText += '- Failure counting starts fresh\n';
    responseText += '- Monitor system health to ensure stability\n\n';

    responseText += '## Recommended Actions\n';
    responseText += '1. Monitor the operation closely after reset\n';
    responseText += '2. Check for underlying issues that caused the failures\n';
    responseText += '3. Consider implementing additional safeguards if issues persist\n';
    responseText += '4. Use `get_system_health` to track recovery progress\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error resetting circuit breaker: ${(_error as Error).message}`,
        },
      ],
    };
  }
}

/**
 * Get detailed operation metrics
 */
export async function getOperationMetrics(
  _client: AkamaiClient,
  args: {
    operationType?: OperationType;
    includeTrends?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    let responseText = '# Operation Metrics Report\n\n';
    responseText += `**Generated:** ${new Date().toISOString()}\n\n`;

    const allMetrics = globalResilienceManager.getAllMetrics();

    if (args.operationType) {
      const metrics = globalResilienceManager.getOperationMetrics(args.operationType);
      if (!metrics) {
        return {
          content: [
            {
              type: 'text',
              text: `No metrics found for operation type: ${args.operationType}`,
            },
          ],
        };
      }

      responseText += formatOperationMetrics(args.operationType, metrics);
    } else {
      responseText += '## All Operations Summary\n\n';

      let totalCalls = 0;
      let totalSuccessful = 0;
      let avgResponseTime = 0;

      allMetrics.forEach((metrics) => {
        totalCalls += metrics.totalCalls;
        totalSuccessful += metrics.successfulCalls;
        avgResponseTime += metrics.averageResponseTime;
      });

      avgResponseTime = avgResponseTime / allMetrics.size;
      const overallSuccessRate = totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 0;

      responseText += `- **Total Operations:** ${allMetrics.size}\n`;
      responseText += `- **Total Calls:** ${totalCalls}\n`;
      responseText += `- **Overall Success Rate:** ${overallSuccessRate.toFixed(1)}%\n`;
      responseText += `- **Average Response Time:** ${avgResponseTime.toFixed(0)}ms\n\n`;

      responseText += '## Individual Operation Metrics\n\n';

      allMetrics.forEach((metrics, operationType) => {
        responseText += formatOperationMetrics(operationType, metrics);
        responseText += '\n';
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
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving operation metrics: ${(_error as Error).message}`,
        },
      ],
    };
  }
}

/**
 * Test operation resilience
 */
export async function testOperationResilience(
  client: AkamaiClient,
  args: {
    operationType: OperationType;
    testType: 'basic' | 'circuit_breaker' | 'retry';
    iterations?: number;
  },
): Promise<MCPToolResponse> {
  try {
    const iterations = args.iterations || 5;
    let responseText = '# Resilience Test Report\n\n';
    responseText += `**Operation Type:** ${args.operationType}\n`;
    responseText += `**Test Type:** ${args.testType}\n`;
    responseText += `**Iterations:** ${iterations}\n`;
    responseText += `**Start Time:** ${new Date().toISOString()}\n\n`;

    const results: Array<{
      iteration: number;
      success: boolean;
      responseTime: number;
      error?: string;
    }> = [];

    // Get initial metrics
    const initialMetrics = globalResilienceManager.getOperationMetrics(args.operationType);
    const initialState = globalResilienceManager.getCircuitBreakerState(args.operationType);

    responseText += '## Initial State\n';
    responseText += `- **Circuit Breaker State:** ${initialState}\n`;
    responseText += `- **Error Rate:** ${initialMetrics ? (initialMetrics.errorRate * 100).toFixed(1) : 'N/A'}%\n`;
    responseText += `- **Total Calls:** ${initialMetrics?.totalCalls || 0}\n\n`;

    // Perform test operations
    for (let i = 1; i <= iterations; i++) {
      const startTime = Date.now();

      try {
        // Simple test operation based on type
        await performTestOperation(client, args.operationType);

        results.push({
          iteration: i,
          success: true,
          responseTime: Date.now() - startTime,
        });
      } catch (_error) {
        results.push({
          iteration: i,
          success: false,
          responseTime: Date.now() - startTime,
          error: (_error as Error).message,
        });
      }

      // Small delay between iterations
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Analyze results
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    responseText += '## Test Results\n';
    responseText += `- **Successful Operations:** ${successCount}/${iterations}\n`;
    responseText += `- **Failed Operations:** ${failureCount}/${iterations}\n`;
    responseText += `- **Success Rate:** ${((successCount / iterations) * 100).toFixed(1)}%\n`;
    responseText += `- **Average Response Time:** ${avgResponseTime.toFixed(0)}ms\n\n`;

    // Get final metrics
    const finalMetrics = globalResilienceManager.getOperationMetrics(args.operationType);
    const finalState = globalResilienceManager.getCircuitBreakerState(args.operationType);

    responseText += '## Final State\n';
    responseText += `- **Circuit Breaker State:** ${finalState}\n`;
    responseText += `- **Error Rate:** ${finalMetrics ? (finalMetrics.errorRate * 100).toFixed(1) : 'N/A'}%\n`;
    responseText += `- **Total Calls:** ${finalMetrics?.totalCalls || 0}\n\n`;

    // Detailed results
    if (failureCount > 0) {
      responseText += '## Failed Operations\n';
      results
        .filter((r) => !r.success)
        .forEach((result) => {
          responseText += `- **Iteration ${result.iteration}:** ${result.error} (${result.responseTime}ms)\n`;
        });
      responseText += '\n';
    }

    // Analysis and recommendations
    responseText += '## Analysis\n';

    if (initialState !== finalState) {
      responseText += `- Circuit breaker state changed from ${initialState} to ${finalState}\n`;
    }

    if (failureCount > 0) {
      responseText += `- ${failureCount} operations failed during testing\n`;
      responseText += '- Consider investigating error patterns\n';
    }

    if (avgResponseTime > 5000) {
      responseText += '- High average response time detected\n';
      responseText += '- Monitor for performance issues\n';
    }

    if (successCount === iterations) {
      responseText += '- All operations completed successfully\n';
      responseText += '- System resilience appears healthy for this operation type\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error during resilience test: ${(_error as Error).message}`,
        },
      ],
    };
  }
}

/**
 * Get error recovery suggestions
 */
export async function getErrorRecoverySuggestions(
  _client: AkamaiClient,
  args: {
    errorType?: string;
    operationType?: OperationType;
    includePreventiveMeasures?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    let responseText = '# Error Recovery Suggestions\n\n';

    if (args.errorType || args.operationType) {
      responseText += '**Context:**\n';
      if (args.errorType) {
        responseText += `- Error Type: ${args.errorType}\n`;
      }
      if (args.operationType) {
        responseText += `- Operation Type: ${args.operationType}\n`;
      }
      responseText += '\n';
    }

    // General recovery strategies
    responseText += '## Immediate Recovery Actions\n\n';

    responseText += '### 1. Circuit Breaker Management\n';
    responseText += '- Check circuit breaker status: `get_system_health`\n';
    responseText += '- Reset if stuck open: `reset_circuit_breaker`\n';
    responseText += '- Monitor recovery progress\n\n';

    responseText += '### 2. Retry Strategy\n';
    responseText += '- Most operations use automatic retry with exponential backoff\n';
    responseText += '- For manual retry, wait 30-60 seconds between attempts\n';
    responseText += '- Check operation metrics to understand failure patterns\n\n';

    responseText += '### 3. Service Health Verification\n';
    responseText += '- Run system health check to identify issues\n';
    responseText += '- Verify Akamai service status\n';
    responseText += '- Check network connectivity\n\n';

    // Error-specific guidance
    if (args.errorType) {
      responseText += getErrorSpecificGuidance(args.errorType);
    }

    // Operation-specific guidance
    if (args.operationType) {
      responseText += getOperationSpecificGuidance(args.operationType);
    }

    // Preventive measures
    if (args.includePreventiveMeasures) {
      responseText += '## Preventive Measures\n\n';

      responseText += '### 1. Monitoring\n';
      responseText += '- Regularly check system health\n';
      responseText += '- Set up alerts for high error rates\n';
      responseText += '- Monitor circuit breaker states\n\n';

      responseText += '### 2. Rate Limiting\n';
      responseText += '- Use bulk operations for multiple items\n';
      responseText += '- Implement delays between requests\n';
      responseText += '- Respect API rate limits\n\n';

      responseText += '### 3. Error Handling\n';
      responseText += '- Implement proper retry logic in applications\n';
      responseText += '- Use circuit breaker patterns\n';
      responseText += '- Log errors for analysis\n\n';

      responseText += '### 4. Capacity Planning\n';
      responseText += '- Monitor response times\n';
      responseText += '- Plan for peak usage periods\n';
      responseText += '- Test resilience regularly\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating recovery suggestions: ${(_error as Error).message}`,
        },
      ],
    };
  }
}

// Helper functions
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'HEALTHY':
      return '🟢';
    case 'DEGRADED':
      return '🟡';
    case 'UNHEALTHY':
      return '🔴';
    default:
      return '⚪';
  }
}

function getCircuitBreakerEmoji(state: CircuitBreakerState): string {
  switch (state) {
    case CircuitBreakerState.CLOSED:
      return '🟢';
    case CircuitBreakerState.HALF_OPEN:
      return '🟡';
    case CircuitBreakerState.OPEN:
      return '🔴';
    default:
      return '⚪';
  }
}

function formatOperationMetrics(operationType: OperationType, metrics: any): string {
  let text = `### ${operationType}\n`;
  text += `- **Total Calls:** ${metrics.totalCalls}\n`;
  text += `- **Success Rate:** ${((1 - metrics.errorRate) * 100).toFixed(1)}%\n`;
  text += `- **Avg Response Time:** ${metrics.averageResponseTime.toFixed(0)}ms\n`;
  text += `- **P95 Response Time:** ${metrics.p95ResponseTime.toFixed(0)}ms\n`;

  if (metrics.consecutiveFailures > 0) {
    text += `- **Consecutive Failu_res:** ${metrics.consecutiveFailures}\n`;
  }

  if (metrics.lastFailureTime) {
    text += `- **Last Failure:** ${metrics.lastFailureTime.toISOString()}\n`;
  }

  return text;
}

async function performTestOperation(
  client: AkamaiClient,
  operationType: OperationType,
): Promise<void> {
  // Simple test operations that don't modify data
  switch (operationType) {
    case OperationType.PROPERTY_READ:
      await globalResilienceManager.executeWithResilience(operationType, () =>
        client.request({ path: '/papi/v1/properties', method: 'GET' }),
      );
      break;

    case OperationType.DNS_READ:
      await globalResilienceManager.executeWithResilience(operationType, () =>
        client.request({ path: '/config-dns/v2/zones', method: 'GET' }),
      );
      break;

    default:
      // For operations we can't safely test, just simulate a quick request
      await globalResilienceManager.executeWithResilience(operationType, () =>
        client.request({ path: '/papi/v1/groups', method: 'GET' }),
      );
  }
}

function getErrorSpecificGuidance(errorType: string): string {
  let guidance = `## Error-Specific Guidance: ${errorType}\n\n`;

  switch (errorType.toLowerCase()) {
    case 'rate_limit':
    case '429':
      guidance += '### Rate Limit Errors\n';
      guidance += '- **Immediate Action:** Wait 60 seconds before retry\n';
      guidance += '- **Recovery:** Use exponential backoff for retries\n';
      guidance += '- **Prevention:** Reduce request frequency, use bulk operations\n\n';
      break;

    case 'network':
    case 'connection':
      guidance += '### Network Errors\n';
      guidance += '- **Immediate Action:** Check internet connectivity\n';
      guidance += '- **Recovery:** Retry with automatic backoff\n';
      guidance += '- **Prevention:** Implement connection pooling, use timeouts\n\n';
      break;

    case 'authentication':
    case '401':
      guidance += '### Authentication Errors\n';
      guidance += '- **Immediate Action:** Verify .edgerc credentials\n';
      guidance += '- **Recovery:** Check API client configuration\n';
      guidance += '- **Prevention:** Monitor credential expiration\n\n';
      break;

    case 'authorization':
    case '403':
      guidance += '### Authorization Errors\n';
      guidance += '- **Immediate Action:** Check API client permissions\n';
      guidance += '- **Recovery:** Contact Akamai administrator\n';
      guidance += '- **Prevention:** Regular permission audits\n\n';
      break;

    default:
      guidance += '### General Error Recovery\n';
      guidance += '- **Immediate Action:** Check error message details\n';
      guidance += '- **Recovery:** Use automatic retry mechanisms\n';
      guidance += '- **Prevention:** Monitor error patterns\n\n';
  }

  return guidance;
}

function getOperationSpecificGuidance(operationType: OperationType): string {
  let guidance = `## Operation-Specific Guidance: ${operationType}\n\n`;

  switch (operationType) {
    case OperationType.PROPERTY_WRITE:
      guidance += '### Property Write Operations\n';
      guidance += '- **Recovery:** Check for partial updates\n';
      guidance += '- **Rollback:** Use version management for rollback\n';
      guidance += '- **Prevention:** Validate changes before applying\n\n';
      break;

    case OperationType.ACTIVATION:
      guidance += '### Activation Operations\n';
      guidance += '- **Recovery:** Check activation status\n';
      guidance += '- **Rollback:** Activate previous version if needed\n';
      guidance += '- **Prevention:** Test in staging first\n\n';
      break;

    case OperationType.DNS_WRITE:
      guidance += '### DNS Write Operations\n';
      guidance += '- **Recovery:** Check zone activation status\n';
      guidance += '- **Rollback:** Revert DNS changes if needed\n';
      guidance += '- **Prevention:** Validate DNS records before applying\n\n';
      break;

    case OperationType.BULK_OPERATION:
      guidance += '### Bulk Operations\n';
      guidance += '- **Recovery:** Check individual operation status\n';
      guidance += '- **Rollback:** May require individual rollbacks\n';
      guidance += '- **Prevention:** Use smaller batch sizes\n\n';
      break;

    default:
      guidance += '### General Operation Recovery\n';
      guidance += '- **Recovery:** Check operation completion status\n';
      guidance += '- **Rollback:** Use appropriate rollback mechanism\n';
      guidance += '- **Prevention:** Implement proper validation\n\n';
  }

  return guidance;
}
