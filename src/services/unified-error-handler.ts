/**
 * UNIFIED ERROR HANDLER SERVICE
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Centralized error handling with consistent formatting
 * Approach: Categorize errors and provide actionable responses
 * Implementation: Type-safe, user-friendly error messages
 * 
 * KAIZEN IMPROVEMENTS:
 * - Standardized error response format
 * - Integration with error recovery service
 * - User-friendly error messages
 * - Detailed context for debugging
 * - Actionable next steps
 */

import { createLogger } from '../utils/pino-logger';

const logger = createLogger('unified-error-handler');

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  WORKFLOW = 'workflow',
  UNKNOWN = 'unknown'
}

/**
 * Structured error response
 */
export interface ErrorResponse {
  category: ErrorCategory;
  code: string;
  userMessage: string;
  details: string;
  nextSteps?: string[];
  relatedTools?: string[];
  documentationLink?: string;
  requestId?: string;
}

/**
 * Error context for enhanced debugging
 */
export interface ErrorContext {
  operation: string;
  customer?: string;
  [key: string]: any;
}

/**
 * Unified Error Handler Service
 */
export class UnifiedErrorHandler {
  /**
   * Handle errors and return structured response
   */
  handleError(error: any, context: ErrorContext): ErrorResponse {
    logger.error({ error, context }, 'Handling error');
    
    // Categorize the error
    const category = this.categorizeError(error);
    const code = this.extractErrorCode(error);
    
    // Generate user-friendly message
    const userMessage = this.generateUserMessage(error, category);
    
    // Extract details
    const details = this.extractErrorDetails(error);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(category, error, context);
    
    // Get related tools
    const relatedTools = this.getRelatedTools(category, context.operation);
    
    // Get documentation link
    const documentationLink = this.getDocumentationLink(category);
    
    return {
      category,
      code,
      userMessage,
      details,
      nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
      relatedTools: relatedTools.length > 0 ? relatedTools : undefined,
      documentationLink,
      requestId: context.requestId
    };
  }
  
  /**
   * Categorize error based on type and content
   */
  private categorizeError(error: any): ErrorCategory {
    const message = error?.message?.toLowerCase() || '';
    const statusCode = error?.response?.status || error?.statusCode;
    
    // Authentication errors
    if (statusCode === 401 || message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    // Authorization errors
    if (statusCode === 403 || message.includes('forbidden') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION;
    }
    
    // Not found errors
    if (statusCode === 404 || message.includes('not found')) {
      return ErrorCategory.NOT_FOUND;
    }
    
    // Rate limit errors
    if (statusCode === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }
    
    // Validation errors
    if (statusCode === 400 || message.includes('invalid') || message.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }
    
    // Server errors
    if (statusCode >= 500 || message.includes('internal server error')) {
      return ErrorCategory.SERVER_ERROR;
    }
    
    // Network errors
    if (message.includes('econnrefused') || message.includes('timeout') || message.includes('network')) {
      return ErrorCategory.NETWORK;
    }
    
    // Configuration errors
    if (message.includes('config') || message.includes('missing required')) {
      return ErrorCategory.CONFIGURATION;
    }
    
    // Workflow errors
    if (message.includes('workflow') || message.includes('step failed')) {
      return ErrorCategory.WORKFLOW;
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  /**
   * Extract error code
   */
  private extractErrorCode(error: any): string {
    return error?.code || 
           error?.response?.data?.code || 
           error?.response?.status?.toString() || 
           'UNKNOWN';
  }
  
  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(error: any, category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your API credentials in .edgerc file.';
        
      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this operation. Contact your account administrator.';
        
      case ErrorCategory.NOT_FOUND:
        return 'The requested resource was not found. It may have been deleted or you may be using the wrong ID.';
        
      case ErrorCategory.RATE_LIMIT:
        return 'API rate limit exceeded. Please wait a moment and try again.';
        
      case ErrorCategory.VALIDATION:
        return 'Invalid parameters provided. Please check your input values.';
        
      case ErrorCategory.SERVER_ERROR:
        return 'Akamai server error. This is usually temporary - please try again in a few minutes.';
        
      case ErrorCategory.NETWORK:
        return 'Network connection error. Please check your internet connection and try again.';
        
      case ErrorCategory.CONFIGURATION:
        return 'Configuration error. Please check your setup and required parameters.';
        
      case ErrorCategory.WORKFLOW:
        return 'Workflow execution error. One or more steps failed during execution.';
        
      default:
        return 'An unexpected error occurred. Please check the details below.';
    }
  }
  
  /**
   * Extract detailed error information
   */
  private extractErrorDetails(error: any): string {
    if (error?.response?.data?.detail) {
      return error.response.data.detail;
    }
    
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return JSON.stringify(error, null, 2);
  }
  
  /**
   * Generate actionable next steps
   */
  private generateNextSteps(category: ErrorCategory, error: any, context: ErrorContext): string[] {
    const steps: string[] = [];
    
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        steps.push('Verify your .edgerc file exists and contains valid credentials');
        steps.push('Check that the customer section name is correct');
        steps.push('Ensure your API credentials haven\'t expired');
        break;
        
      case ErrorCategory.AUTHORIZATION:
        steps.push('Verify your API credentials have the required permissions');
        steps.push('Check if you\'re using the correct contract and group IDs');
        steps.push('Contact your Akamai administrator to grant necessary permissions');
        break;
        
      case ErrorCategory.NOT_FOUND:
        steps.push('Verify the resource ID is correct');
        steps.push('Check if you\'re using the correct customer account');
        steps.push('Use the appropriate list tool to find valid IDs');
        break;
        
      case ErrorCategory.RATE_LIMIT:
        steps.push('Wait 60 seconds before retrying');
        steps.push('Consider using bulk operations to reduce API calls');
        steps.push('Implement exponential backoff for retries');
        break;
        
      case ErrorCategory.VALIDATION:
        steps.push('Review the parameter requirements in the tool description');
        steps.push('Check data types and formats (especially dates and IDs)');
        steps.push('Ensure all required parameters are provided');
        break;
        
      case ErrorCategory.WORKFLOW:
        const failedStep = error?.currentStep || 'unknown';
        steps.push(`Check the failed step: ${failedStep}`);
        steps.push('Review workflow parameters for correctness');
        steps.push('Use workflow_rollback if needed to undo completed steps');
        break;
    }
    
    return steps;
  }
  
  /**
   * Get related tools based on error category
   */
  private getRelatedTools(category: ErrorCategory, operation: string): string[] {
    const tools: string[] = [];
    
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        tools.push('contract_list', 'group_list');
        break;
        
      case ErrorCategory.NOT_FOUND:
        if (operation.includes('property')) {
          tools.push('property_list', 'property_search');
        } else if (operation.includes('dns')) {
          tools.push('dns_zone_list', 'dns_record_list');
        } else if (operation.includes('certificate')) {
          tools.push('certificate_list');
        }
        break;
        
      case ErrorCategory.WORKFLOW:
        tools.push('workflow_status', 'workflow_rollback');
        break;
    }
    
    return tools;
  }
  
  /**
   * Get documentation link for error category
   */
  private getDocumentationLink(category: ErrorCategory): string {
    const baseUrl = 'https://techdocs.akamai.com';
    
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return `${baseUrl}/edge-grid/docs/welcome`;
        
      case ErrorCategory.RATE_LIMIT:
        return `${baseUrl}/edge-grid/docs/api-concepts#ratelimiting`;
        
      default:
        return `${baseUrl}/edge-grid/docs/api-error-messages`;
    }
  }
  
  /**
   * Format error for logging
   */
  formatForLogging(error: any, context: ErrorContext): object {
    return {
      timestamp: new Date().toISOString(),
      category: this.categorizeError(error),
      code: this.extractErrorCode(error),
      message: error?.message,
      stack: error?.stack,
      context,
      response: error?.response?.data
    };
  }
}