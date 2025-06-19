/**
 * EdgeGrid authentication wrapper for Akamai API requests
 * Uses the official akamai-edgegrid SDK for authentication
 */

import EdgeGrid = require('akamai-edgegrid');
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { type AkamaiError } from './types';

export class AkamaiClient {
  private edgeGrid: EdgeGrid;
  private accountSwitchKey?: string;
  private debug: boolean;
  private section: string;

  constructor(section = 'default', accountSwitchKey?: string) {
    this.section = section;
    const edgercPath = this.getEdgeRcPath();
    this.debug = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

    try {
      // Initialize EdgeGrid client using the SDK
      // The SDK handles all .edgerc parsing automatically
      this.edgeGrid = new EdgeGrid({
        path: edgercPath,
        section: section,
      });

      // If no account switch key provided, try to read it from .edgerc
      if (!accountSwitchKey) {
        accountSwitchKey = this.extractAccountSwitchKey(edgercPath, section);
      }

      // Store account switch key for API requests
      this.accountSwitchKey = accountSwitchKey;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(
          `EdgeGrid configuration not found at ${edgercPath}\n` +
            `Please create this file with your Akamai API credentials.\n` +
            `See: https://techdocs.akamai.com/developer/docs/set-up-authentication-credentials`,
        );
      } else if (error instanceof Error && error.message.includes('section')) {
        throw new Error(
          `Section [${section}] not found in ${edgercPath}\n` +
            `Please ensure your .edgerc file contains the [${section}] section.`,
        );
      }
      throw error;
    }
  }

  /**
   * Get path to .edgerc file
   */
  private getEdgeRcPath(): string {
    // Check environment variable first
    const envPath = process.env.EDGERC_PATH;
    if (envPath) {
      return path.resolve(envPath);
    }

    // Default to ~/.edgerc
    return path.join(os.homedir(), '.edgerc');
  }

  /**
   * Make authenticated request to Akamai API
   */
  async request<T = any>(options: {
    path: string;
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
  }): Promise<T> {
    try {
      // Ensure path starts with /
      const requestPath = options.path.startsWith('/') ? options.path : `/${options.path}`;

      // Build query parameters object
      const queryParams: Record<string, string> = {};

      // Add account switch key if available
      if (this.accountSwitchKey) {
        queryParams.accountSwitchKey = this.accountSwitchKey;
      }

      // Add any additional query parameters
      if (options.queryParams) {
        Object.assign(queryParams, options.queryParams);
      }

      // Prepare request options for EdgeGrid
      const requestOptions: any = {
        path: requestPath,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      };

      // Add query parameters using qs property if any exist
      if (Object.keys(queryParams).length > 0) {
        requestOptions.qs = queryParams;
      }

      // Debug logging
      if (this.debug) {
        console.error(`[AkamaiClient] Making request: ${options.method || 'GET'} ${requestPath}`);
        console.error(
          `[AkamaiClient] Request options:`,
          JSON.stringify(
            {
              ...requestOptions,
              body: requestOptions.body ? '[BODY]' : undefined,
            },
            null,
            2,
          ),
        );
      }

      // Use EdgeGrid's auth method to sign the request
      this.edgeGrid.auth(requestOptions);

      // Make the request using EdgeGrid's send method
      return new Promise((resolve, reject) => {
        this.edgeGrid.send((error: any, response: any, body: any) => {
          if (error) {
            try {
              this.handleApiError(error);
            } catch (handledError) {
              reject(handledError);
            }
            return;
          }

          // Check for HTTP errors
          if (response && response.statusCode >= 400) {
            const akamaiError = this.parseErrorResponse(body, response.statusCode);
            reject(akamaiError);
            return;
          }

          // Parse JSON response
          if (body) {
            try {
              resolve(JSON.parse(body) as T);
            } catch {
              // Return raw body if not JSON
              resolve(body as T);
            }
          } else {
            resolve(null as T);
          }
        });
      });
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Parse Akamai error response
   */
  private parseErrorResponse(body: string, statusCode: number): Error {
    let errorData: AkamaiError;

    try {
      errorData = JSON.parse(body);
    } catch {
      return new Error(`API Error (${statusCode}): ${body}`);
    }

    // Format user-friendly error message
    let message = `Akamai API Error (${statusCode}): ${errorData.title || 'Request failed'}`;

    if (errorData.detail) {
      message += `\n${errorData.detail}`;
    }

    if (errorData.errors && errorData.errors.length > 0) {
      message += '\n\nErrors:';
      for (const err of errorData.errors) {
        message += `\n- ${err.title}: ${err.detail || ''}`;
      }
    }

    // For 400 errors, include the full error response for debugging
    if (statusCode === 400) {
      message += `\n\nFull error response: ${JSON.stringify(errorData, null, 2)}`;
    }

    // Add helpful suggestions based on error type
    if (statusCode === 401) {
      message += '\n\nSolution: Check your .edgerc credentials are valid and not expired.';
    } else if (statusCode === 403) {
      message +=
        '\n\nSolution: Ensure your API client has the required permissions for this operation.';
      if (this.accountSwitchKey) {
        message +=
          '\nNote: You are using account switch key. Verify you have access to the target account.';
      }
    } else if (statusCode === 429) {
      message += '\n\nSolution: Rate limit exceeded. Please wait a moment before retrying.';
    }

    const error = new Error(message);
    (error as any).statusCode = statusCode;
    (error as any).akamaiError = errorData;
    return error;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleApiError(error: any): never {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new Error(
          'Network connectivity issue. Check your internet connection and verify the API host in ~/.edgerc is correct.',
        );
      } else if (error.message.includes('ETIMEDOUT')) {
        throw new Error('Request timed out. The Akamai API might be slow. Try again in a moment.');
      }
    }

    throw error;
  }

  /**
   * Get current configuration info (for debugging)
   */
  getConfig(): {
    edgercPath: string;
    accountSwitchKey?: string;
  } {
    return {
      edgercPath: this.getEdgeRcPath(),
      accountSwitchKey: this.accountSwitchKey,
    };
  }

  /**
   * Get the customer/section name
   */
  getCustomer(): string {
    return this.section;
  }

  /**
   * Extract account_key from .edgerc file (as per Akamai docs)
   * This is passed as accountSwitchKey query parameter to the API
   */
  private extractAccountSwitchKey(edgercPath: string, section: string): string | undefined {
    try {
      const edgercContent = fs.readFileSync(edgercPath, 'utf-8');
      const lines = edgercContent.split('\n');

      let inSection = false;
      let accountSwitchKey: string | undefined;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if we're entering a section
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
          const currentSection = trimmedLine.slice(1, -1);
          inSection = currentSection === section;
          continue;
        }

        // If we're in the right section, look for account_key (or account-switch-key for compatibility)
        if (inSection && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const trimmedKey = key?.trim();

          if (
            trimmedKey === 'account-switch-key' ||
            trimmedKey === 'account_switch_key' ||
            trimmedKey === 'account_key'
          ) {
            const value = valueParts.join('=').trim();
            // Remove quotes if present
            accountSwitchKey = value.replace(/^["']|["']$/g, '');
            break;
          }
        }
      }

      if (accountSwitchKey && this.debug) {
        console.error(
          `[AkamaiClient] Found account_key in section [${section}]: ${accountSwitchKey}`,
        );
      }

      return accountSwitchKey;
    } catch (error) {
      if (this.debug) {
        console.error('[AkamaiClient] Error reading account-switch-key from .edgerc:', error);
      }
      return undefined;
    }
  }

  /**
   * Create a new client with a different account switch key
   */
  withAccountSwitchKey(accountSwitchKey: string): AkamaiClient {
    return new AkamaiClient('default', accountSwitchKey);
  }
}
