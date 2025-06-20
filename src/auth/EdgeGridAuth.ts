/**
 * Enhanced EdgeGrid Authentication module for Akamai APIs
 * Provides type-safe authentication with account switching support
 */

import * as crypto from 'crypto';

import { CustomerConfigManager } from '@utils/customer-config';
import { logger } from '@utils/logger';
import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import {
  type EdgeGridCredentials,
  ConfigurationError,
  ConfigErrorType,
  type NetworkEnvironment,
} from '../types/config';

/**
 * EdgeGrid authentication header components
 */
export interface EdgeGridAuthHeader {
  client_token: string;
  access_token: string;
  timestamp: string;
  nonce: string;
  signature: string;
}

/**
 * EdgeGrid _request configuration
 */
export interface EdgeGridRequestConfig {
  /** API endpoint path */
  path: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request body */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Query parameters */
  queryParams?: Record<string, string | number | boolean>;
  /** Customer section name */
  customer?: string;
  /** Network environment for endpoint selection */
  network?: NetworkEnvironment;
}

/**
 * EdgeGrid API error response
 */
export interface EdgeGridErrorResponse {
  type?: string;
  title?: string;
  detail?: string;
  instance?: string;
  status?: number;
  errors?: Array<{
    type?: string;
    title?: string;
    detail?: string;
    error?: string;
  }>;
}

/**
 * EdgeGrid authentication error
 */
export class EdgeGridAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: EdgeGridErrorResponse,
  ) {
    super(message);
    this.name = 'EdgeGridAuthError';
  }
}

/**
 * EdgeGrid client configuration _options
 */
export interface EdgeGridClientOptions {
  /** Customer section name */
  customer?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to validate credentials on initialization */
  validateOnInit?: boolean;
  /** Custom base URL override */
  baseUrl?: string;
}

/**
 * Enhanced EdgeGrid authentication client
 */
export class EdgeGridAuth {
  private static instances: Map<string, EdgeGridAuth> = new Map();
  private readonly axiosInstance: AxiosInstance;
  private readonly credentials: EdgeGridCredentials;
  private readonly customerName: string;
  private readonly hasAccountSwitching: boolean;

  private constructor(_options: EdgeGridClientOptions = {}) {
    const { customer = 'default', timeout = 30000, validateOnInit = true } = _options;

    this.customerName = customer;

    // Get credentials with validation
    try {
      this.credentials = CustomerConfigManager.getInstance().getSection(customer);
    } catch (_error) {
      throw new ConfigurationError(
        ConfigErrorType.SECTION_NOT_FOUND,
        `Customer section '${customer}' not found`,
        customer,
      );
    }

    // Validate credentials if requested
    if (validateOnInit) {
      this.validateCredentials();
    }

    this.hasAccountSwitching = !!this.credentials.account_switch_key;

    // Create axios instance with typed configuration
    this.axiosInstance = axios.create({
      baseURL: _options.baseUrl || `https://${this.credentials.host}`,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Akamai-MCP-Server/1.0',
      },
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Add _request interceptor for EdgeGrid authentication
    this.axiosInstance.interceptors.request.use(
      (config) => this.addAuthHeaders(config),
      (error) => Promise.reject(this.createAuthError(error)),
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error) => this.handleError(error),
    );
  }

  /**
   * Get or create EdgeGrid client instance
   */
  static getInstance(_options: EdgeGridClientOptions = {}): EdgeGridAuth {
    const key = _options.customer || 'default';

    if (!EdgeGridAuth.instances.has(key)) {
      EdgeGridAuth.instances.set(key, new EdgeGridAuth(_options));
    }

    return EdgeGridAuth.instances.get(key)!;
  }

  /**
   * Clear cached instances (useful for testing)
   */
  static clearInstances(): void {
    EdgeGridAuth.instances.clear();
  }

  /**
   * Validate EdgeGrid credentials
   */
  private validateCredentials(): void {
    const required: Array<keyof EdgeGridCredentials> = [
      'host',
      'client_token',
      'client_secret',
      'access_token',
    ];
    const missing = required.filter((key) => !this.credentials[key]);

    if (missing.length > 0) {
      throw new ConfigurationError(
        ConfigErrorType.MISSING_CREDENTIALS,
        `Missing required credentials: ${missing.join(', ')}`,
        this.customerName,
        { missing },
      );
    }

    // Validate host format
    if (!this.isValidHost(this.credentials.host)) {
      throw new ConfigurationError(
        ConfigErrorType.INVALID_CREDENTIALS,
        `Invalid host format: ${this.credentials.host}`,
        this.customerName,
        { host: this.credentials.host },
      );
    }
  }

  /**
   * Validate host format
   */
  private isValidHost(host: string): boolean {
    return /^[a-zA-Z0-9.-]+\.akamai(?:apis)?\.net$/.test(host);
  }

  /**
   * Add EdgeGrid authentication headers
   */
  private addAuthHeaders(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const timestamp = this.createTimestamp();
    const nonce = this.createNonce();
    const authHeader = this.createAuthHeader(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      config.data ? this.serializeBody(config.data) : '',
      timestamp,
      nonce,
    );

    // Set authentication headers
    config.headers.set('Authorization', authHeader);

    // Add account switch key if available and not already set
    if (this.hasAccountSwitching && this.credentials.account_switch_key) {
      config.headers.set('AKAMAI-ACCOUNT-SWITCH-KEY', this.credentials.account_switch_key);
      logger.debug('Added account switch key', {
        customer: this.customerName,
        key: this.credentials.account_switch_key,
      });
    }

    return config;
  }

  /**
   * Create EdgeGrid authentication header
   */
  private createAuthHeader(
    method: string,
    url: string,
    body: string,
    timestamp: string,
    nonce: string,
  ): string {
    const contentHash = body ? this.createContentHash(body) : '';
    const authData = `${method}\thttps\t${this.credentials.host}\t${url}\t\t${contentHash}\t`;
    const signingKey = this.createSigningKey(timestamp);
    const authSignature = this.createAuthSignature(authData, signingKey, timestamp, nonce);

    const header: EdgeGridAuthHeader = {
      client_token: this.credentials.client_token,
      access_token: this.credentials.access_token,
      timestamp,
      nonce,
      signature: authSignature,
    };

    return this.formatAuthHeader(header);
  }

  /**
   * Format authentication header
   */
  private formatAuthHeader(header: EdgeGridAuthHeader): string {
    return (
      'EG1-HMAC-SHA256 ' +
      `client_token=${header.client_token};` +
      `access_token=${header.access_token};` +
      `timestamp=${header.timestamp};` +
      `nonce=${header.nonce};` +
      `signature=${header.signature}`
    );
  }

  /**
   * Create ISO timestamp for authentication
   */
  private createTimestamp(): string {
    return new Date().toISOString().replace(/[:|-]|\.\d{3}/g, '');
  }

  /**
   * Create nonce for authentication
   */
  private createNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Serialize _request body
   */
  private serializeBody(data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data);
  }

  /**
   * Create content hash for _request body
   */
  private createContentHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  }

  /**
   * Create signing key for authentication
   */
  private createSigningKey(timestamp: string): string {
    return crypto
      .createHmac('sha256', this.credentials.client_secret)
      .update(timestamp)
      .digest('base64');
  }

  /**
   * Create authentication signature
   */
  private createAuthSignature(
    authData: string,
    signingKey: string,
    timestamp: string,
    nonce: string,
  ): string {
    const dataToSign =
      authData +
      'EG1-HMAC-SHA256 ' +
      `client_token=${this.credentials.client_token};` +
      `access_token=${this.credentials.access_token};` +
      `timestamp=${timestamp};` +
      `nonce=${nonce};`;

    return crypto.createHmac('sha256', signingKey).update(dataToSign).digest('base64');
  }

  /**
   * Handle successful response
   */
  private handleResponse<T>(response: AxiosResponse<T>): AxiosResponse<T> {
    // Log successful requests at debug level
    logger.debug(
      `${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`,
      {
        customer: this.customerName,
        status: response.status,
        headers: response.headers,
      },
    );

    return response;
  }

  /**
   * Handle _request/response errors
   */
  private async handleError(_error: AxiosError): Promise<never> {
    if (error.response) {
      const errorResponse = error.response.data as EdgeGridErrorResponse;
      const errorMessage = this.extractErrorMessage(errorResponse, error.response.status);

      logger.error(`API error [${error.response.status}]`, {
        customer: this.customerName,
        status: error.response.status,
        path: error.config?.url,
        error: errorResponse,
      });

      throw new EdgeGridAuthError(
        errorMessage,
        `API_ERROR_${error.response.status}`,
        error.response.status,
        errorResponse,
      );
    } else if (error.request) {
      logger.error('No response from API', {
        customer: this.customerName,
        error: _error.message,
      });

      throw new EdgeGridAuthError('No response from Akamai API', 'NO_RESPONSE');
    } else {
      logger.error('Request error', {
        customer: this.customerName,
        error: _error.message,
      });

      throw new EdgeGridAuthError(_error.message, 'REQUEST_ERROR');
    }
  }

  /**
   * Create authentication error
   */
  private createAuthError(_error: unknown): EdgeGridAuthError {
    if (error instanceof Error) {
      return new EdgeGridAuthError(_error.message, 'AUTH_ERROR');
    }
    return new EdgeGridAuthError('Unknown authentication error', 'AUTH_ERROR');
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(data: EdgeGridErrorResponse, status: number): string {
    if (data.detail) {
      return data.detail;
    }

    if (data.title) {
      return data.title;
    }

    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => e.detail || e.title || e.error || 'Unknown error').join(', ');
    }

    return `API Error [${status}]`;
  }

  /**
   * Make authenticated _request
   */
  async _request<T = unknown>(config: EdgeGridRequestConfig): Promise<T> {
    const { path, method = 'GET', body, headers = {}, queryParams = {} } = config;

    logger.info(`${method} ${path}`, {
      customer: this.customerName,
      queryParams,
      hasBody: !!body,
      hasAccountSwitching: this.hasAccountSwitching,
    });

    const response = await this.axiosInstance.request<T>({
      method,
      url: path,
      data: body,
      headers,
      params: queryParams,
    });

    return response.data;
  }

  /**
   * GET _request
   */
  async get<T = unknown>(
    path: string,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this._request<T>({ path, method: 'GET', queryParams });
  }

  /**
   * POST _request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this._request<T>({ path, method: 'POST', body, queryParams });
  }

  /**
   * PUT _request
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this._request<T>({ path, method: 'PUT', body, queryParams });
  }

  /**
   * DELETE _request
   */
  async delete<T = unknown>(
    path: string,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this._request<T>({ path, method: 'DELETE', queryParams });
  }

  /**
   * PATCH _request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this._request<T>({ path, method: 'PATCH', body, queryParams });
  }

  /**
   * Get customer name
   */
  getCustomerName(): string {
    return this.customerName;
  }

  /**
   * Check if account switching is enabled
   */
  isAccountSwitchingEnabled(): boolean {
    return this.hasAccountSwitching;
  }
}
