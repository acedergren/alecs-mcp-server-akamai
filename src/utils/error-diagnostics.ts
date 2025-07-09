/**
 * Error Diagnostics Engine
 * Snow Leopard production-grade error analysis and recovery
 */

import { logger } from './logger';

export interface ErrorContext {
  operation: string;
  contractId?: string;
  productId?: string;
  groupId?: string;
  propertyId?: string;
  customer?: string;
}

export interface DiagnosticResult {
  errorType: 'permission' | 'validation' | 'notfound' | 'ratelimit' | 'network' | 'auth' | 'unknown';
  userMessage: string;
  technicalDetails: string;
  suggestedActions: string[];
  canRetry: boolean;
  retryDelay?: number;
  debugInfo?: {
    statusCode?: number;
    headers?: Record<string, string>;
    requestUrl?: string;
    requestMethod?: string;
    responseBody?: any;
    timestamp: string;
  };
  quickFixes?: Array<{
    description: string;
    command: string;
  }>;
}

/**
 * Analyzes API errors and provides actionable diagnostics
 */
export function diagnoseError(error: any, context: ErrorContext): DiagnosticResult {
  // Type guard for error with response
  const apiError = error as any;
  
  // Extract debug info
  const debugInfo = {
    statusCode: apiError?.response?.status,
    headers: apiError?.response?.headers,
    requestUrl: apiError?.config?.url || apiError?.request?.url,
    requestMethod: apiError?.config?.method || apiError?.request?.method,
    responseBody: apiError?.response?.data,
    timestamp: new Date().toISOString()
  };
  
  // Handle authentication errors first
  if (apiError?.response?.status === 401) {
    return diagnose401Error(apiError, context, debugInfo);
  }
  
  // Handle Akamai API errors
  if (apiError?.response?.status === 403) {
    return diagnose403Error(apiError, context, debugInfo);
  }
  
  if (apiError?.response?.status === 404) {
    return diagnose404Error(apiError, context, debugInfo);
  }
  
  if (apiError?.response?.status === 400) {
    return diagnose400Error(apiError, context, debugInfo);
  }
  
  if (apiError?.response?.status === 429) {
    return diagnose429Error(apiError, debugInfo);
  }
  
  if (apiError?.response?.status >= 500) {
    return diagnose5xxError(apiError, debugInfo);
  }
  
  // Network errors
  if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ETIMEDOUT') {
    return diagnoseNetworkError(error, debugInfo);
  }
  
  // Default unknown error
  return {
    errorType: 'unknown',
    userMessage: 'An unexpected error occurred',
    technicalDetails: (error as any).message || 'Unknown error',
    suggestedActions: [
      'Check your network connection',
      'Verify API credentials are valid',
      'Try again in a few moments'
    ],
    canRetry: true,
    retryDelay: 5000,
    debugInfo
  };
}

function diagnose401Error(error: any, context: ErrorContext, debugInfo: any): DiagnosticResult {
  const detail = error.response?.data?.detail || '';
  
  return {
    errorType: 'auth',
    userMessage: 'Authentication failed - invalid or expired credentials',
    technicalDetails: `401 Unauthorized: ${detail}`,
    suggestedActions: [
      'Verify your .edgerc file exists and is properly formatted',
      'Check that your API credentials have not expired',
      'Ensure the correct customer section is being used',
      context.customer ? `Verify section [${context.customer}] exists in .edgerc` : 'Check the [default] section in .edgerc'
    ],
    canRetry: false,
    debugInfo,
    quickFixes: [
      {
        description: 'Check .edgerc file permissions',
        command: 'ls -la ~/.edgerc'
      },
      {
        description: 'View .edgerc sections',
        command: 'grep "^\\[" ~/.edgerc'
      },
      context.customer ? {
        description: `Check ${context.customer} credentials`,
        command: `grep -A 4 "\\[${context.customer}\\]" ~/.edgerc | grep -E "(client_token|client_secret|access_token|host)"`
      } : {
        description: 'Check default credentials',
        command: 'grep -A 4 "\\[default\\]" ~/.edgerc | grep -E "(client_token|client_secret|access_token|host)"'
      }
    ]
  };
}

function diagnose403Error(error: any, context: ErrorContext, debugInfo: any): DiagnosticResult {
  const detail = error.response?.data?.detail || '';
  const title = error.response?.data?.title || '';
  
  // Pattern matching for specific 403 causes
  if (detail.includes('authorization token') || detail.includes('does not allow access')) {
    // Contract permission issue
    return {
      errorType: 'permission',
      userMessage: `Your API credentials don't have write access to contract ${context.contractId}`,
      technicalDetails: `403 Forbidden: ${detail}`,
      suggestedActions: [
        `Use 'property_list' to see contracts you can write to`,
        `Try a different contract that you have write permissions for`,
        `Contact your Akamai administrator to grant write access to ${context.contractId}`
      ],
      canRetry: false,
      debugInfo,
      quickFixes: [
        {
          description: 'List available contracts',
          command: 'alecs property_list --limit 5'
        }
      ]
    };
  }
  
  if (detail.includes('group') && context.groupId) {
    return {
      errorType: 'permission',
      userMessage: `Access denied to group ${context.groupId}`,
      technicalDetails: `403 Forbidden: ${detail}`,
      suggestedActions: [
        `Use 'property.list_groups' to see accessible groups`,
        `Verify you have permissions for group ${context.groupId}`,
        `Try using a different group`
      ],
      canRetry: false,
      debugInfo
    };
  }
  
  if (detail.includes('product') && context.productId) {
    return {
      errorType: 'validation',
      userMessage: `Product ${context.productId} is not available on contract ${context.contractId}`,
      technicalDetails: `403 Forbidden: ${detail}`,
      suggestedActions: [
        `Use 'property_list --contractId ${context.contractId}' to see available products`,
        `Choose a product that's available on this contract`,
        `Try a different contract that has ${context.productId}`
      ],
      canRetry: false,
      debugInfo
    };
  }
  
  // Generic 403
  return {
    errorType: 'permission',
    userMessage: 'Access denied - insufficient permissions',
    technicalDetails: `403 Forbidden: ${detail || title}`,
    suggestedActions: [
      'Verify your API credentials have the necessary permissions',
      'Check that you have access to the requested resource',
      'Contact your Akamai administrator for access'
    ],
    canRetry: false,
    debugInfo
  };
}

function diagnose404Error(error: any, context: ErrorContext, debugInfo: any): DiagnosticResult {
  const detail = error.response?.data?.detail || '';
  
  if (context.propertyId) {
    return {
      errorType: 'notfound',
      userMessage: `Property ${context.propertyId} not found`,
      technicalDetails: `404 Not Found: ${detail}`,
      suggestedActions: [
        `Use 'property.list' to see all available properties`,
        `Verify the property ID is correct (format: prp_12345)`,
        `Check if the property exists in the specified group/contract`
      ],
      canRetry: false,
      debugInfo
    };
  }
  
  return {
    errorType: 'notfound',
    userMessage: 'Requested resource not found',
    technicalDetails: `404 Not Found: ${detail}`,
    suggestedActions: [
      'Verify the resource ID is correct',
      'Check if the resource exists',
      'Use the appropriate list command to browse available resources'
    ],
    canRetry: false,
    debugInfo
  };
}

function diagnose400Error(error: any, _context: ErrorContext, debugInfo: any): DiagnosticResult {
  const detail = error.response?.data?.detail || '';
  const errors = error.response?.data?.errors || [];
  
  // Validation errors
  if (errors.length > 0) {
    const errorMessages = errors.map((e: any) => e.detail || e.message).join(', ');
    return {
      errorType: 'validation',
      userMessage: 'Invalid request parameters',
      technicalDetails: `400 Bad Request: ${errorMessages}`,
      suggestedActions: errors.map((e: any) => {
        if (e.field) {
          return `Fix ${e.field}: ${e.detail}`;
        }
        return e.detail || e.message;
      }),
      canRetry: false,
      debugInfo
    };
  }
  
  return {
    errorType: 'validation',
    userMessage: 'Invalid request',
    technicalDetails: `400 Bad Request: ${detail}`,
    suggestedActions: [
      'Check that all required parameters are provided',
      'Verify parameter formats are correct',
      'Review the API documentation for this operation'
    ],
    canRetry: false,
    debugInfo
  };
}

function diagnose429Error(error: any, debugInfo: any): DiagnosticResult {
  const retryAfter = error.response?.headers?.['retry-after'];
  const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
  
  return {
    errorType: 'ratelimit',
    userMessage: 'API rate limit exceeded',
    technicalDetails: '429 Too Many Requests',
    suggestedActions: [
      `Wait ${retryDelay / 1000} seconds before retrying`,
      'Consider spreading requests over time',
      'Contact Akamai support if you need higher rate limits'
    ],
    canRetry: true,
    retryDelay,
    debugInfo
  };
}

function diagnose5xxError(error: any, debugInfo: any): DiagnosticResult {
  return {
    errorType: 'network',
    userMessage: 'Akamai API service error',
    technicalDetails: `${error.response?.status} ${error.response?.statusText}`,
    suggestedActions: [
      'This is a temporary service issue',
      'Wait a few moments and try again',
      'Check Akamai service status if the issue persists'
    ],
    canRetry: true,
    retryDelay: 30000,
    debugInfo
  };
}

function diagnoseNetworkError(error: any, debugInfo: any): DiagnosticResult {
  return {
    errorType: 'network',
    userMessage: 'Network connection error',
    technicalDetails: `${error.code}: ${error.message}`,
    suggestedActions: [
      'Check your internet connection',
      'Verify Akamai API endpoints are accessible',
      'Check if you\'re behind a proxy or firewall'
    ],
    canRetry: true,
    retryDelay: 10000,
    debugInfo
  };
}

/**
 * Formats diagnostic result for user display with enhanced debugging info
 */
export function formatDiagnosticMessage(result: DiagnosticResult): string {
  let message = `🔴 Error: ${result.userMessage}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Technical details
  message += `**Technical Details:**\n${result.technicalDetails}\n\n`;
  
  // Debug info in development mode
  if (process.env['NODE_ENV'] === 'development' && result.debugInfo) {
    message += `**🔍 Debug Information:**\n`;
    if (result.debugInfo.requestMethod && result.debugInfo.requestUrl) {
      message += `• Request: ${result.debugInfo.requestMethod} ${result.debugInfo.requestUrl}\n`;
    }
    if (result.debugInfo.statusCode) {
      message += `• Status Code: ${result.debugInfo.statusCode}\n`;
    }
    message += `• Timestamp: ${result.debugInfo.timestamp}\n\n`;
  }
  
  // Suggested actions
  if (result.suggestedActions.length > 0) {
    message += '**💡 Suggested Actions:**\n';
    result.suggestedActions.forEach((action, index) => {
      message += `${index + 1}. ${action}\n`;
    });
    message += '\n';
  }
  
  // Quick fixes
  if (result.quickFixes && result.quickFixes.length > 0) {
    message += '**🛠️ Quick Fix Commands:**\n';
    result.quickFixes.forEach(fix => {
      message += `\`\`\`bash\n${fix.command}\n\`\`\`\n`;
      message += `${fix.description}\n\n`;
    });
  }
  
  // Retry information
  if (result.canRetry) {
    message += `\n**🔄 Retry Information:**\n`;
    if (result.retryDelay) {
      message += `• This error may be temporary\n`;
      message += `• Recommended retry delay: ${result.retryDelay / 1000} seconds\n`;
    } else {
      message += `• You can retry this operation\n`;
    }
  } else {
    message += `\n**❌ This error requires manual intervention**\n`;
  }
  
  // Log full diagnostics for debugging
  logger.debug('Error diagnostics', {
    errorType: result.errorType,
    technicalDetails: result.technicalDetails,
    canRetry: result.canRetry,
    debugInfo: result.debugInfo
  });
  
  return message;
}

/**
 * Smart retry logic based on error diagnostics
 */
export async function retryWithDiagnostics<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const diagnostic = diagnoseError(error, context);
      
      if (!diagnostic.canRetry || attempt === maxRetries) {
        throw new Error(formatDiagnosticMessage(diagnostic));
      }
      
      logger.info(`Retry attempt ${attempt}/${maxRetries} after ${diagnostic.retryDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, diagnostic.retryDelay || 5000));
    }
  }
  
  throw lastError;
}