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
  params?: Record<string, unknown>;
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
  handleError(error: unknown, spinner?: any): MCPToolResponse {
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

    // Enhanced debugging info
    const debugInfo = this.extractDebugInfo(error);
    const timestamp = new Date().toISOString();

    // Log structured error data with enhanced context
    this.logger.error({
      tool: this.context.tool,
      operation: this.context.operation,
      params: this.context.params,
      customer: this.context.customer,
      statusCode,
      errorMessage,
      akamaiError,
      requestId,
      timestamp,
      debugInfo,
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
    }, `${this.context.tool} operation failed: ${this.context.operation}`);

    // Development mode enhanced logging
    if (process.env.NODE_ENV === 'development') {
      this.logDevelopmentInfo(error, debugInfo);
    }

    // Log user-friendly error information to console
    console.error(`\n[${this.context.tool.toUpperCase()} Error]:`, errorMessage);
    console.error(`[Timestamp]: ${timestamp}`);

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

    // Log parameter validation issues
    this.logParameterIssues();

    // Return formatted error response instead of throwing
    return this.formatAsMCPResponse(error);
  }

  /**
   * Extract debug information from error
   */
  private extractDebugInfo(error: unknown): Record<string, any> {
    const err = error as any;
    return {
      errorType: error?.constructor?.name || 'Unknown',
      hasResponse: !!err?.response,
      hasAkamaiError: !!err?.akamaiError,
      method: err?.config?.method || err?.request?.method,
      url: err?.config?.url || err?.request?.url,
      headers: err?.config?.headers || err?.request?.headers,
      data: err?.config?.data || err?.request?.data,
    };
  }

  /**
   * Log development-specific debugging information
   */
  private logDevelopmentInfo(error: unknown, debugInfo: Record<string, any>): void {
    console.error('\n[DEVELOPMENT DEBUG INFO]:');
    console.error('• Error Type:', debugInfo.errorType);
    console.error('• Has Response:', debugInfo.hasResponse);
    console.error('• Has Akamai Error:', debugInfo.hasAkamaiError);
    
    if (debugInfo.method && debugInfo.url) {
      console.error(`• Request: ${debugInfo.method} ${debugInfo.url}`);
    }
    
    // Log stack trace in development
    if (error instanceof Error && error.stack) {
      console.error('\n[Stack Trace]:');
      const stackLines = error.stack.split('\n').slice(1, 6); // First 5 stack frames
      stackLines.forEach(line => console.error(line.trim()));
    }
  }

  /**
   * Log parameter validation issues
   */
  private logParameterIssues(): void {
    if (!this.context.params || Object.keys(this.context.params).length === 0) {
      return;
    }

    // Check for common parameter issues
    const issues: string[] = [];
    
    for (const [key, value] of Object.entries(this.context.params)) {
      if (value === undefined) {
        issues.push(`• Parameter '${key}' is undefined`);
      } else if (value === null) {
        issues.push(`• Parameter '${key}' is null`);
      } else if (value === '') {
        issues.push(`• Parameter '${key}' is empty string`);
      } else if (typeof value === 'string' && value.includes('undefined')) {
        issues.push(`• Parameter '${key}' contains 'undefined': ${value}`);
      }
    }

    if (issues.length > 0) {
      console.error('\n[Potential Parameter Issues]:');
      issues.forEach(issue => console.error(issue));
    }
  }

  /**
   * Extract status code from various error formats
   */
  private extractStatusCode(error: unknown): number | undefined {
    const err = error as any;
    return err?.statusCode || 
           err?.response?.status || 
           err?.status ||
           (err?.message?.match(/\((\d{3})\):/)?.[1] ? parseInt(err.message.match(/\((\d{3})\):/)[1]) : undefined);
  }

  /**
   * Extract Akamai error details from error object
   */
  private extractAkamaiError(error: unknown): AkamaiErrorDetails | undefined {
    const err = error as any;
    return err?.akamaiError || 
           err?.response?.data ||
           (err?.message?.includes('Akamai API Error') ? this.parseErrorMessage(err.message) : undefined);
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
  formatAsMCPResponse(error: unknown): MCPToolResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = this.extractStatusCode(error);
    const akamaiError = this.extractAkamaiError(error);
    const debugInfo = this.extractDebugInfo(error);
    const timestamp = new Date().toISOString();
    
    // Build developer-friendly error message
    let text = `🔴 ${this.context.tool.toUpperCase()} Operation Failed\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Operation context
    text += `**Operation:** ${this.context.operation}\n`;
    text += `**Timestamp:** ${timestamp}\n`;
    
    // Main error
    text += `\n**Error Message:**\n${this.formatErrorMessage(errorMessage)}\n`;
    
    // Status code with visual indicator
    if (statusCode) {
      const statusIcon = this.getStatusIcon(statusCode);
      text += `\n**Status:** ${statusIcon} ${statusCode} ${this.getStatusText(statusCode)}\n`;
      text += this.getStatusCodeGuidance(statusCode);
    }
    
    // Akamai-specific error details in structured format
    if (akamaiError) {
      text += '\n**API Response Details:**\n';
      text += '```json\n';
      text += JSON.stringify({
        title: akamaiError.title,
        detail: akamaiError.detail,
        errors: akamaiError.errors,
      }, null, 2);
      text += '\n```\n';
    }
    
    // Parameter issues
    const paramIssues = this.getParameterIssues();
    if (paramIssues.length > 0) {
      text += '\n**⚠️ Parameter Issues Detected:**\n';
      paramIssues.forEach(issue => {
        text += `${issue}\n`;
      });
    }
    
    // Request details in development mode
    if (process.env.NODE_ENV === 'development' && (debugInfo.method || debugInfo.url)) {
      text += '\n**🔍 Debug Information:**\n';
      text += `• Request: ${debugInfo.method || 'N/A'} ${debugInfo.url || 'N/A'}\n`;
      text += `• Error Type: ${debugInfo.errorType}\n`;
    }
    
    // Request ID for support
    const errorWithRequestId = error as { requestId?: string };
    const requestId = akamaiError?.requestId || errorWithRequestId?.requestId;
    if (requestId) {
      text += `\n**📋 Support Reference:**\n`;
      text += `Request ID: \`${requestId}\`\n`;
    }
    
    // Actionable next steps
    text += '\n**💡 Suggested Actions:**\n';
    text += this.getSuggestedActions(statusCode, error);
    
    // Quick fix commands if applicable
    const quickFixes = this.getQuickFixCommands(statusCode, error);
    if (quickFixes.length > 0) {
      text += '\n**🛠️ Quick Fix Commands:**\n';
      quickFixes.forEach(fix => {
        text += `\`\`\`bash\n${fix.command}\n\`\`\`\n`;
        text += `${fix.description}\n\n`;
      });
    }
    
    // Documentation links
    text += '\n**📚 Relevant Documentation:**\n';
    text += this.getDocumentationLinks();
    
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      isError: true,
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
   * Format error message for better readability
   */
  private formatErrorMessage(message: string): string {
    // Clean up common error patterns
    return message
      .replace(/Error:\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get status icon based on code
   */
  private getStatusIcon(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return '✅';
    if (statusCode >= 300 && statusCode < 400) return '↩️';
    if (statusCode >= 400 && statusCode < 500) return '❌';
    if (statusCode >= 500) return '💥';
    return '❓';
  }

  /**
   * Get status text description
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[statusCode] || 'Unknown Status';
  }

  /**
   * Get parameter issues as array
   */
  private getParameterIssues(): string[] {
    const issues: string[] = [];
    
    if (!this.context.params) return issues;
    
    for (const [key, value] of Object.entries(this.context.params)) {
      if (value === undefined) {
        issues.push(`• Parameter '${key}' is undefined`);
      } else if (value === null) {
        issues.push(`• Parameter '${key}' is null`);
      } else if (value === '') {
        issues.push(`• Parameter '${key}' is empty string`);
      } else if (typeof value === 'string' && value.includes('undefined')) {
        issues.push(`• Parameter '${key}' contains 'undefined': ${value}`);
      }
    }
    
    return issues;
  }

  /**
   * Get suggested actions based on error
   */
  private getSuggestedActions(statusCode: number | undefined, error: unknown): string {
    const actions: string[] = [];
    
    // Status code specific actions
    if (statusCode === 401) {
      actions.push('• Verify your .edgerc file has valid credentials');
      actions.push('• Check if credentials have expired');
      actions.push('• Ensure the customer section exists in .edgerc');
    } else if (statusCode === 403) {
      actions.push('• Verify you have permissions for this operation');
      actions.push('• Check if account switching is required');
      actions.push('• Confirm API access is enabled for your account');
    } else if (statusCode === 404) {
      actions.push('• Verify the resource ID or name is correct');
      actions.push('• Check if the resource exists in this account');
      actions.push('• Ensure you\'re using the correct API version');
    } else if (statusCode === 429) {
      actions.push('• Wait 60 seconds before retrying');
      actions.push('• Implement exponential backoff for retries');
      actions.push('• Check your API rate limits');
    } else if (statusCode && statusCode >= 500) {
      actions.push('• Wait a few minutes and retry');
      actions.push('• Check Akamai status page for outages');
      actions.push('• Contact support if issue persists');
    }
    
    // Tool-specific actions
    if (this.context.tool === 'property' && actions.length === 0) {
      actions.push('• Verify property ID and version');
      actions.push('• Check property activation status');
      actions.push('• Ensure contract and group IDs are valid');
    } else if (this.context.tool === 'dns' && actions.length === 0) {
      actions.push('• Verify zone name format');
      actions.push('• Check DNS record syntax');
      actions.push('• Ensure zone is active');
    }
    
    // Default actions
    if (actions.length === 0) {
      actions.push('• Verify all parameters are correct');
      actions.push('• Check API documentation for requirements');
      actions.push('• Try with minimal required parameters first');
    }
    
    return actions.join('\n');
  }

  /**
   * Get quick fix commands
   */
  private getQuickFixCommands(statusCode: number | undefined, error: unknown): Array<{command: string, description: string}> {
    const fixes: Array<{command: string, description: string}> = [];
    
    if (statusCode === 401) {
      fixes.push({
        command: 'cat ~/.edgerc | grep -A 4 "\\[default\\]"',
        description: 'Check your default credentials configuration'
      });
    } else if (statusCode === 404 && this.context.tool === 'property') {
      fixes.push({
        command: 'alecs property_list --limit 10',
        description: 'List available properties to verify IDs'
      });
    } else if (statusCode === 403 && this.context.customer) {
      fixes.push({
        command: `cat ~/.edgerc | grep -A 4 "\\[${this.context.customer}\\]"`,
        description: `Check customer section configuration`
      });
    }
    
    return fixes;
  }

  /**
   * Get documentation links
   */
  private getDocumentationLinks(): string {
    const baseDoc = 'https://techdocs.akamai.com/developer/docs/';
    const links: string[] = [];
    
    // General links
    links.push(`• [API Authentication](${baseDoc}authenticate-with-edgegrid)`);
    links.push(`• [Error Codes](${baseDoc}api-error-codes)`);
    
    // Tool-specific links
    if (this.context.tool === 'property') {
      links.push(`• [Property Manager API](${baseDoc}property-manager-api)`);
    } else if (this.context.tool === 'dns') {
      links.push(`• [Edge DNS API](${baseDoc}edge-dns-api)`);
    } else if (this.context.tool === 'cps') {
      links.push(`• [CPS API](${baseDoc}cps-api)`);
    }
    
    // GitHub docs
    links.push('• [ALECSCore Documentation](https://github.com/acedergren/alecs-mcp-server-akamai)');
    
    return links.join('\n');
  }

  /**
   * Create a context-aware error handler for a specific operation
   */
  static create(tool: string, operation: string): (error: unknown, spinner?: unknown, params?: Record<string, unknown>) => MCPToolResponse {
    return (error: unknown, spinner?: any, params?: Record<string, unknown>) => {
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
    handle: (operation: string, error: unknown, spinner?: unknown, params?: Record<string, unknown>) => {
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