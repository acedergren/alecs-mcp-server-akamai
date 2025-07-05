/**
 * Enhanced Error Handler for all Akamai MCP Tools
 * Uses Pino for structured logging with detailed error context
 */

import { createLogger } from './pino-logger';
import type { Logger } from 'pino';
import type { MCPToolResponse } from '../types';

// Create dedicated error logger (removed - using context-specific loggers instead)

export interface ErrorContext {
  tool: string;
  operation: string;
  params?: Record<string, any>;
  customer?: string;
  requestId?: string;
}

export interface AkamaiErrorDetails {
  statusCode?: number;
  title?: string;
  detail?: string;
  errors?: Array<{
    field?: string;
    title: string;
    detail?: string;
  }>;
  requestId?: string;
}

/**
 * Enhanced error handler with Pino logging
 */
export class ToolErrorHandler {
  private logger: Logger;
  private context: ErrorContext;

  constructor(context: ErrorContext) {
    this.context = context;
    this.logger = createLogger(`${context.tool}-errors`);
  }

  /**
   * Handle and log errors with enhanced debugging information
   */
  handleError(error: any, spinner?: any): MCPToolResponse {
    // Stop spinner if provided
    if (spinner) {
      spinner.fail(`Operation failed: ${this.context.operation}`);
    }

    // Extract error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = this.extractStatusCode(error);
    const akamaiError = this.extractAkamaiError(error);
    const errorWithRequestId = error as { requestId?: string };
    const requestId = akamaiError?.requestId || errorWithRequestId?.requestId;

    // Log structured error data
    this.logger.error({
      tool: this.context.tool,
      operation: this.context.operation,
      params: this.context.params,
      customer: this.context.customer,
      statusCode,
      errorMessage,
      akamaiError,
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    }, `${this.context.tool} operation failed: ${this.context.operation}`);

    // Log user-friendly error information to console
    console.error(`\n[${this.context.tool.toUpperCase()} Error]:`, errorMessage);

    // Handle specific status codes
    this.logStatusCodeHelp(statusCode, akamaiError);

    // Log Akamai-specific error details
    if (akamaiError) {
      this.logAkamaiErrorDetails(akamaiError);
    }

    // Log request ID for support
    if (requestId) {
      console.error(`\n[Request ID for Support]: ${requestId}`);
    }

    // Return formatted error response instead of throwing
    return this.formatAsMCPResponse(error);
  }

  /**
   * Extract status code from various error formats
   */
  private extractStatusCode(error: any): number | undefined {
    return error?.statusCode || 
           error?.response?.status || 
           error?.status ||
           (error?.message?.match(/\((\d{3})\):/)?.[1] ? parseInt(error.message.match(/\((\d{3})\):/)[1]) : undefined);
  }

  /**
   * Extract Akamai error details from error object
   */
  private extractAkamaiError(error: any): AkamaiErrorDetails | undefined {
    return error?.akamaiError || 
           error?.response?.data ||
           (error?.message?.includes('Akamai API Error') ? this.parseErrorMessage(error.message) : undefined);
  }

  /**
   * Parse error details from error message
   */
  private parseErrorMessage(message: string): AkamaiErrorDetails | undefined {
    try {
      const jsonMatch = message.match(/Full error response: ({.*})/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  /**
   * Log status code specific help
   */
  private logStatusCodeHelp(statusCode: number | undefined, akamaiError: AkamaiErrorDetails | undefined): void {
    if (!statusCode) {return;}

    console.error(`\n[${statusCode} Error - Possible Causes]:`);

    switch (statusCode) {
      case 400:
        console.error('• Invalid request parameters or malformed request');
        console.error('• Missing required fields');
        console.error('• Invalid field values or formats');
        this.logValidationErrors(akamaiError);
        break;

      case 401:
        console.error('• Invalid or expired API credentials');
        console.error('• Incorrect .edgerc configuration');
        console.error('• Missing authentication headers');
        console.error('\nSolution: Check your .edgerc file and ensure credentials are valid');
        break;

      case 403:
        console.error('• Insufficient permissions for this operation');
        console.error('• API access not enabled for your account');
        console.error('• Resource belongs to a different account');
        if (this.context.customer) {
          console.error(`• Account switch key issues for customer: ${this.context.customer}`);
        }
        console.error('\nSolution: Verify API permissions and account access');
        break;

      case 404:
        console.error('• Resource not found');
        console.error('• Incorrect ID or name');
        console.error('• Resource may have been deleted');
        console.error('\nSolution: Verify the resource exists and you have access');
        break;

      case 409:
        console.error('• Resource conflict or duplicate');
        console.error('• Operation already in progress');
        console.error('• State conflict (e.g., activation pending)');
        console.error('\nSolution: Check for existing resources or wait for pending operations');
        break;

      case 429:
        console.error('• Rate limit exceeded');
        console.error('• Too many requests in a short time');
        console.error('\nSolution: Wait before retrying or implement exponential backoff');
        break;

      case 500:
        console.error('• Internal server error at Akamai');
        console.error('• Temporary service disruption');
        console.error('• Invalid data causing server issues');
        this.log500ErrorHelp();
        console.error('\nSolution: Wait a few minutes and retry');
        break;

      case 503:
        console.error('• Service temporarily unavailable');
        console.error('• Maintenance or high load');
        console.error('\nSolution: Wait and retry later');
        break;
    }
  }

  /**
   * Log validation errors from Akamai response
   */
  private logValidationErrors(akamaiError: AkamaiErrorDetails | undefined): void {
    if (!akamaiError?.errors || akamaiError.errors.length === 0) {return;}

    console.error('\n[Validation Errors]:');
    akamaiError.errors.forEach((err, index) => {
      if (err.field) {
        console.error(`${index + 1}. Field '${err.field}': ${err.detail || err.title}`);
      } else {
        console.error(`${index + 1}. ${err.detail || err.title}`);
      }
    });
  }

  /**
   * Log specific help for 500 errors based on operation
   */
  private log500ErrorHelp(): void {
    const { tool, operation } = this.context;

    // Tool-specific 500 error help
    if (tool === 'dns' && operation.includes('create')) {
      console.error('\n[DNS-Specific Checks]:');
      console.error('• Parent zone must exist and be active');
      console.error('• Contract and Group IDs must be valid');
      console.error('• Zone name format must be correct');
    } else if (tool === 'property' && operation.includes('activation')) {
      console.error('\n[Property Activation Checks]:');
      console.error('• Property version must be valid');
      console.error('• No pending activations on same network');
      console.error('• Rule tree must be valid');
    } else if (tool === 'cps' || tool === 'certificate') {
      console.error('\n[CPS Certificate Checks]:');
      if (operation.includes('create') || operation.includes('DV')) {
        console.error('• Domain validation must be complete');
        console.error('• DNS TXT records must be properly configured');
        console.error('• Domain must be publicly accessible');
        console.error('• CSR parameters must be valid');
      } else if (operation.includes('upload')) {
        console.error('• Certificate must be in valid PEM format');
        console.error('• Certificate must match the CSR exactly');
        console.error('• Trust chain must be complete and valid');
        console.error('• Certificate must be from a trusted CA');
      } else {
        console.error('• Enrollment ID must be valid and accessible');
        console.error('• Certificate must not be in conflicting state');
        console.error('• API credentials must have CPS permissions');
      }
    }
  }

  /**
   * Log Akamai-specific error details
   */
  private logAkamaiErrorDetails(akamaiError: AkamaiErrorDetails): void {
    console.error('\n[Akamai API Response]:');
    
    if (akamaiError.title) {
      console.error(`Title: ${akamaiError.title}`);
    }
    
    if (akamaiError.detail) {
      console.error(`Detail: ${akamaiError.detail}`);
    }

    // Log full error object for debugging
    this.logger.debug({ akamaiError }, 'Full Akamai error details');
  }

  /**
   * Format error as MCPToolResponse instead of throwing
   */
  formatAsMCPResponse(error: any): MCPToolResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = this.extractStatusCode(error);
    const akamaiError = this.extractAkamaiError(error);
    
    // Build user-friendly error message
    let text = `[ERROR] ${this.context.tool.toUpperCase()} Error: ${this.context.operation}\n\n`;
    text += `**Error:** ${errorMessage}\n`;
    
    // Add status code context
    if (statusCode) {
      text += `**Status Code:** ${statusCode}\n`;
      text += this.getStatusCodeGuidance(statusCode);
    }
    
    // Add Akamai-specific error details
    if (akamaiError) {
      if (akamaiError.title) {
        text += `\n**Details:** ${akamaiError.title}\n`;
      }
      if (akamaiError.detail) {
        text += `**Description:** ${akamaiError.detail}\n`;
      }
      if (akamaiError.errors && akamaiError.errors.length > 0) {
        text += '\n**Validation Errors:**\n';
        akamaiError.errors.forEach((err, index) => {
          text += `${index + 1}. ${err.field ? `${err.field}: ` : ''}${err.detail || err.title}\n`;
        });
      }
    }
    
    // Add request ID
    const errorWithRequestId = error as { requestId?: string };
    const requestId = akamaiError?.requestId || errorWithRequestId?.requestId;
    if (requestId) {
      text += `\n**Request ID:** ${requestId}\n`;
    }
    
    // Add tool-specific guidance
    text += '\n**Next Steps:**\n';
    if (this.context.tool === 'cps') {
      text += this.getCPSSpecificGuidance();
    } else {
      text += '• Check your API credentials and permissions\n';
      text += '• Verify all required parameters are provided\n';
      text += '• Review the Akamai API documentation\n';
      text += '• Contact Akamai support if the issue persists\n';
    }
    
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  /**
   * Get status code specific guidance
   */
  private getStatusCodeGuidance(statusCode: number): string {
    const guidance: Record<number, string> = {
      400: '\n**Issue:** Bad Request - Invalid parameters or malformed request\n',
      401: '\n**Issue:** Unauthorized - Check your API credentials\n',
      403: '\n**Issue:** Forbidden - Insufficient permissions\n',
      404: '\n**Issue:** Not Found - Resource does not exist\n',
      409: '\n**Issue:** Conflict - Resource already exists or state conflict\n',
      429: '\n**Issue:** Rate Limited - Too many requests\n',
      500: '\n**Issue:** Internal Server Error - Temporary issue\n',
      503: '\n**Issue:** Service Unavailable - Try again later\n',
    };
    
    return guidance[statusCode] || '\n**Issue:** Unexpected error occurred\n';
  }

  /**
   * Get CPS-specific guidance based on operation
   */
  private getCPSSpecificGuidance(): string {
    const { operation } = this.context;
    let guidance = '';

    if (operation.includes('create') || operation.includes('DV')) {
      guidance += '• Verify domain names are valid and publicly accessible\n';
      guidance += '• Ensure contact information is complete and accurate\n';
      guidance += '• Check that the contract has CPS entitlements\n';
      guidance += '• Validate that domains are not already enrolled\n';
    } else if (operation.includes('validation') || operation.includes('challenges')) {
      guidance += '• Ensure DNS TXT records are created correctly\n';
      guidance += '• Allow 5-10 minutes for DNS propagation\n';
      guidance += '• Verify domain is publicly resolvable\n';
      guidance += '• Check that validation has not expired\n';
    } else if (operation.includes('upload')) {
      guidance += '• Verify certificate is in valid PEM format\n';
      guidance += '• Ensure certificate matches the CSR exactly\n';
      guidance += '• Check that trust chain is complete\n';
      guidance += '• Confirm certificate is from a trusted CA\n';
    } else if (operation.includes('link')) {
      guidance += '• Verify the property exists and is accessible\n';
      guidance += '• Ensure certificate is active and deployed\n';
      guidance += '• Check property version number is correct\n';
      guidance += '• Confirm you have property management permissions\n';
    } else {
      guidance += '• Verify enrollment ID is correct and accessible\n';
      guidance += '• Check your CPS API permissions\n';
      guidance += '• Ensure certificate is not in a conflicting state\n';
      guidance += '• Review the CPS API documentation\n';
    }

    guidance += '• Contact Akamai support if the issue persists\n';
    return guidance;
  }

  /**
   * Create a context-aware error handler for a specific operation
   */
  static create(tool: string, operation: string): (error: any, spinner?: any, params?: Record<string, any>) => MCPToolResponse {
    return (error: any, spinner?: any, params?: Record<string, any>) => {
      const handler = new ToolErrorHandler({
        tool,
        operation,
        params,
      });
      return handler.handleError(error, spinner);
    };
  }
}

/**
 * Quick error handler factory for tools
 */
export function createErrorHandler(tool: string) {
  return {
    handle: (operation: string, error: any, spinner?: any, params?: Record<string, any>) => {
      const handler = new ToolErrorHandler({
        tool,
        operation,
        params,
      });
      return handler.handleError(error, spinner);
    },
    
    wrap: (operation: string) => {
      return ToolErrorHandler.create(tool, operation);
    }
  };
}