import * as crypto from 'crypto';

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { CustomerConfigManager, type EdgeRcSection } from './customer-config';
import { logger } from './logger';

export interface EdgeGridRequestOptions {
  path: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  customer?: string;
}

export class EdgeGridClient {
  private static instances: Map<string, EdgeGridClient> = new Map();
  private axiosInstance: AxiosInstance;
  private config: EdgeRcSection;
  private customerName: string;

  private constructor(customer = 'default') {
    this.customerName = customer;
    this.config = CustomerConfigManager.getInstance().getSection(customer);

    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.host}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for EdgeGrid authentication
    this.axiosInstance.interceptors.request.use(
      (config) => this.addAuthHeaders(config),
      (_error) => Promise.reject(_error),
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (_error) => this.handleError(_error),
    );
  }

  static getInstance(customer = 'default'): EdgeGridClient {
    if (!EdgeGridClient.instances.has(customer)) {
      EdgeGridClient.instances.set(customer, new EdgeGridClient(customer));
    }
    return EdgeGridClient.instances.get(customer)!;
  }

  private addAuthHeaders(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const timestamp = new Date().toISOString().replace(/[:.-]|\.\d{3}/g, '');
    const nonce = crypto.randomBytes(16).toString('hex');
    const authHeader = this.createAuthHeader(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      config.data ? JSON.stringify(config.data) : '',
      timestamp,
      nonce,
    );

    // Use headers.set for proper AxiosHeaders manipulation
    config.headers.set('Authorization', authHeader);
    config.headers.set('Content-Type', 'application/json');

    // Add account switch key if available
    if (this.config.account_switch_key) {
      config.headers.set('AKAMAI-ACCOUNT-SWITCH-KEY', this.config.account_switch_key);
    }

    return config;
  }

  private createAuthHeader(
    method: string,
    url: string,
    body: string,
    timestamp: string,
    nonce: string,
  ): string {
    const authData = `${method}\thttps\t${this.config.host}\t${url}\t\t${body ? this.createContentHash(body) : ''}\t`;
    const signingKey = this.createSigningKey(timestamp);
    const authSignature = this.createAuthSignature(authData, signingKey, timestamp);

    return (
      'EG1-HMAC-SHA256 ' +
      `client_token=${this.config.client_token};` +
      `access_token=${this.config.access_token};` +
      `timestamp=${timestamp};` +
      `nonce=${nonce};` +
      `signature=${authSignature}`
    );
  }

  private createContentHash(content: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(content, 'utf8');
    return hash.digest('base64');
  }

  private createSigningKey(timestamp: string): string {
    const signingKey = crypto.createHmac('sha256', this.config.client_secret);
    signingKey.update(timestamp);
    return signingKey.digest('base64');
  }

  private createAuthSignature(authData: string, signingKey: string, timestamp: string): string {
    const signature = crypto.createHmac('sha256', signingKey);
    signature.update(
      authData +
        'EG1-HMAC-SHA256 ' +
        `client_token=${this.config.client_token};` +
        `access_token=${this.config.access_token};` +
        `timestamp=${timestamp};` +
        'nonce=',
    );
    return signature.digest('base64');
  }

  private async handleError(_error: any): Promise<never> {
    if (_error.response) {
      const { status, data } = _error.response;
      logger.error(`API Error [${status}]`, {
        customer: this.customerName,
        status,
        data,
        path: _error.config?.url,
      });

      // Extract error message from Akamai API response
      let errorMessage = `API Error [${status}]`;
      if (data) {
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.title) {
          errorMessage = data.title;
        } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.errors.map((_e: any) => _e.detail || _e.error || _e).join(', ');
        }
      }

      throw new Error(errorMessage);
    } else if (_error.request) {
      logger.error('No response from API', {
        customer: this.customerName,
        error: _error.message,
      });
      throw new Error('No response from Akamai API');
    } else {
      logger.error('Request error', {
        customer: this.customerName,
        error: _error.message,
      });
      throw new Error(_error.message);
    }
  }

  async request<T = any>(_options: EdgeGridRequestOptions): Promise<T> {
    const { path, method = 'GET', body, headers = {}, queryParams = {} } = _options;

    logger.debug(`${method} ${path}`, {
      customer: this.customerName,
      queryParams,
      hasBody: !!body,
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

  // Convenience methods
  async get<T = any>(path: string, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>({ path, method: 'GET', queryParams });
  }

  async post<T = any>(path: string, body?: any, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>({ path, method: 'POST', body, queryParams });
  }

  async put<T = any>(path: string, body?: any, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>({ path, method: 'PUT', body, queryParams });
  }

  async delete<T = any>(path: string, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>({ path, method: 'DELETE', queryParams });
  }

  async patch<T = any>(path: string, body?: any, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>({ path, method: 'PATCH', body, queryParams });
  }
}
