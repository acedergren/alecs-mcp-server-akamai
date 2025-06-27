/**
 * EdgeGrid authentication wrapper for Akamai API requests
 * Uses the official akamai-edgegrid SDK for authentication
 * 
 * This is the core client that handles all communication with Akamai APIs.
 * It manages:
 * - EdgeGrid authentication (API key, secret, access token)
 * - Account switching for multi-customer support
 * - Connection pooling for performance
 * - Error handling and retry logic
 * - Request/response logging in debug mode
 * 
 * @example
 * ```typescript
 * const client = new AkamaiClient('production', 'account-switch-key');
 * const properties = await client.request({ path: '/papi/v1/properties' });
 * ```
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import EdgeGrid = require('akamai-edgegrid');

import { type AkamaiError } from './types';
import { defaultPool } from './utils/connection-pool';

// EdgeGrid type definitions
interface EdgeGridRequestOptions {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  qs?: Record<string, string>;
}

interface EdgeGridResponse {
  statusCode: number;
  headers: Record<string, string>;
}

export class AkamaiClient {
  private edgeGrid: EdgeGrid;  // EdgeGrid SDK instance for auth
  private accountSwitchKey?: string;  // Optional key for multi-customer support
  private debug: boolean;  // Enable detailed logging when DEBUG=1
  private section: string;  // Which section to use from .edgerc file

  /**
   * Initialize a new Akamai API client
   * @param section - Section name from .edgerc file (default: 'default')
   * @param accountSwitchKey - Optional key for accessing different customer accounts
   */
  constructor(section = 'default', accountSwitchKey?: string) {
    this.section = section;
    const edgercPath = this.getEdgeRcPath();
    this.debug = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

    try {
      // Initialize EdgeGrid client using the SDK with connection pooling
      // The SDK handles all .edgerc parsing automatically
      this.edgeGrid = new EdgeGrid({
        path: edgercPath,
        section: section,
        // Add connection pool agents for better performance
        agentOptions: {
          agent: defaultPool.getHttpsAgent(),
        },
      });

      // If no account switch key provided, try to read it from .edgerc
      if (!accountSwitchKey) {
        accountSwitchKey = this.extractAccountSwitchKey(edgercPath, section);
      }

      // Store account switch key for API requests
      this.accountSwitchKey = accountSwitchKey;
    } catch (_error) {
      if (_error instanceof Error && _error.message.includes('ENOENT')) {
        throw new Error(
          `EdgeGrid configuration not found at ${edgercPath}\n` +
            'Please create this file with your Akamai API credentials.\n' +
            'See: https://techdocs.akamai.com/developer/docs/set-up-authentication-credentials',
        );
      } else if (_error instanceof Error && _error.message.includes('section')) {
        throw new Error(
          `Section [${section}] not found in ${edgercPath}\n` +
            `Please ensure your .edgerc file contains the [${section}] section.`,
        );
      }
      throw _error;
    }
  }

  /**
   * Get path to .edgerc file
   * Checks EDGERC_PATH env var first, then defaults to ~/.edgerc
   * @returns Absolute path to .edgerc file
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
   * Handles EdgeGrid authentication, account switching, and error handling
   * 
   * @param options - Request configuration
   * @param options.path - API endpoint path (e.g., '/papi/v1/properties')
   * @param options.method - HTTP method (default: 'GET')
   * @param options.body - Request body for POST/PUT/PATCH
   * @param options.headers - Additional headers
   * @param options.queryParams - URL query parameters
   * @returns Parsed JSON response
   * @throws AkamaiError for API errors
   */
  async request<T = unknown>(_options: {
    path: string;
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
  }): Promise<T> {
    try {
      // Ensure path starts with /
      const requestPath = _options.path.startsWith('/') ? _options.path : `/${_options.path}`;

      // Build query parameters object
      const queryParams: Record<string, string> = {};

      // Add account switch key if available
      if (this.accountSwitchKey) {
        queryParams.accountSwitchKey = this.accountSwitchKey;
      }

      // Add any additional query parameters
      if (_options.queryParams) {
        Object.assign(queryParams, _options.queryParams);
      }

      // Prepare request _options for EdgeGrid
      const requestOptions: EdgeGridRequestOptions = {
        path: requestPath,
        method: _options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ..._options.headers,
        },
        body: _options.body ? JSON.stringify(_options.body) : undefined,
      };

      // Add query parameters using qs property if any exist
      if (Object.keys(queryParams).length > 0) {
        requestOptions.qs = queryParams;
      }

      // Debug logging
      if (this.debug) {
        console.error(`[AkamaiClient] Making _request: ${_options.method || 'GET'} ${requestPath}`);
        console.error(
          '[AkamaiClient] Request _options:',
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
        this.edgeGrid.send((_error: any, response: any, body?: string) => {
          if (_error) {
            try {
              this.handleApiError(_error);
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
    } catch (_error) {
      this.handleApiError(_error);
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
    const akamaiError = error as Error & { statusCode: number; akamaiError: AkamaiError };
    akamaiError.statusCode = statusCode;
    akamaiError.akamaiError = errorData;
    return error;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleApiError(_error: unknown): never {
    if (_error instanceof Error) {
      // Check for specific error types
      if (_error.message.includes('ENOTFOUND') || _error.message.includes('ECONNREFUSED')) {
        throw new Error(
          'Network connectivity issue. Check your internet connection and verify the API host in ~/.edgerc is correct.',
        );
      } else if (_error.message.includes('ETIMEDOUT')) {
        throw new Error('Request timed out. The Akamai API might be slow. Try again in a moment.');
      }
    }

    throw _error;
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
    } catch (_error) {
      if (this.debug) {
        console.error('[AkamaiClient] Error reading account-switch-key from .edgerc:', _error);
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

  /**
   * Get connection pool statistics
   */
  getConnectionPoolStats() {
    return defaultPool.getStats();
  }
}
