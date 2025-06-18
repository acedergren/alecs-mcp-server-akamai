import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Request interceptor for API validation
export class APIRequestInterceptor extends EventEmitter {
  private capturedRequests: CapturedRequest[] = [];
  private validationErrors: ValidationError[] = [];
  private apiSchemas: Map<string, APISchema> = new Map();

  constructor() {
    super();
    this.loadAPISchemas();
  }

  private loadAPISchemas() {
    // Load comprehensive API schemas from documentation
    const schemas = {
      '/papi/v1/properties': {
        method: 'GET',
        queryParams: z.object({
          contractId: z.string().optional(),
          groupId: z.string().optional(),
        }),
        headers: this.getCommonHeaders(),
      },
      '/papi/v1/properties/{propertyId}': {
        method: 'GET',
        pathParams: z.object({
          propertyId: z.string().regex(/^prp_\d+$/),
        }),
        queryParams: z.object({
          contractId: z.string().regex(/^ctr_/),
          groupId: z.string().regex(/^grp_/),
        }),
        headers: this.getCommonHeaders(),
      },
      '/papi/v1/properties/{propertyId}/versions/{version}/rules': {
        method: 'GET',
        pathParams: z.object({
          propertyId: z.string().regex(/^prp_\d+$/),
          version: z.number().int().positive(),
        }),
        queryParams: z.object({
          contractId: z.string(),
          groupId: z.string(),
          validateRules: z.boolean().optional(),
          validateMode: z.enum(['fast', 'full']).optional(),
        }),
        headers: this.getCommonHeaders(),
      },
      '/papi/v1/properties/{propertyId}/activations': {
        method: 'POST',
        pathParams: z.object({
          propertyId: z.string().regex(/^prp_\d+$/),
        }),
        body: z.object({
          propertyVersion: z.number().int().positive(),
          network: z.enum(['STAGING', 'PRODUCTION']),
          activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
          notifyEmails: z.array(z.string().email()),
          acknowledgeWarnings: z.array(z.string()).optional(),
          complianceRecord: z.object({
            nonComplianceReason: z.string().optional(),
          }).optional(),
        }),
        headers: this.getCommonHeaders().extend({
          'Content-Type': z.literal('application/json'),
        }),
      },
      '/config-dns/v2/zones': {
        method: 'GET',
        queryParams: z.object({
          search: z.string().optional(),
          types: z.string().optional(),
          contractIds: z.string().optional(),
          showAll: z.boolean().optional(),
          sortBy: z.enum(['NAME', 'LAST_MODIFIED']).optional(),
          order: z.enum(['ASC', 'DESC']).optional(),
          limit: z.number().int().min(1).max(1000).optional(),
          offset: z.number().int().min(0).optional(),
        }),
        headers: this.getCommonHeaders(),
      },
      '/config-dns/v2/zones/{zone}/recordsets/{name}/{type}': {
        method: 'PUT',
        pathParams: z.object({
          zone: z.string(),
          name: z.string(),
          type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']),
        }),
        body: z.object({
          name: z.string(),
          type: z.string(),
          ttl: z.number().int().min(0),
          rdata: z.array(z.string()).min(1),
        }),
        headers: this.getCommonHeaders().extend({
          'Content-Type': z.literal('application/json'),
        }),
      },
    };

    for (const [path, schema] of Object.entries(schemas)) {
      this.apiSchemas.set(path, schema as APISchema);
    }
  }

  private getCommonHeaders() {
    return z.object({
      Authorization: z.string().regex(/^EG1-HMAC-SHA256/),
      'User-Agent': z.string().optional(),
      'AKAMAI-ACCOUNT-SWITCH-KEY': z.string().optional(),
    });
  }

  // Intercept and validate outgoing requests
  interceptRequest(request: OutgoingRequest): ValidationResult {
    const captured: CapturedRequest = {
      timestamp: new Date(),
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      queryParams: request.queryParams,
      pathParams: request.pathParams,
    };

    this.capturedRequests.push(captured);

    // Find matching API schema
    const schema = this.findMatchingSchema(request.url, request.method);
    if (!schema) {
      return {
        valid: false,
        errors: [`No API schema found for ${request.method} ${request.url}`],
      };
    }

    // Validate request
    const validation = this.validateRequest(captured, schema);
    if (!validation.valid) {
      this.validationErrors.push({
        request: captured,
        errors: validation.errors,
        schema: schema,
      });
    }

    this.emit('request', captured, validation);
    return validation;
  }

  private findMatchingSchema(url: string, method: string): APISchema | null {
    // Extract path from full URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Try exact match first
    let schema = this.apiSchemas.get(path);
    if (schema && schema.method === method) {
      return schema;
    }

    // Try pattern matching for parameterized paths
    for (const [pattern, schemaObj] of this.apiSchemas) {
      if (schemaObj.method !== method) continue;

      const regex = pattern
        .replace(/\{(\w+)\}/g, '([^/]+)')
        .replace(/\//g, '\\/');
      
      if (new RegExp(`^${regex}$`).test(path)) {
        return schemaObj;
      }
    }

    return null;
  }

  private validateRequest(request: CapturedRequest, schema: APISchema): ValidationResult {
    const errors: string[] = [];

    // Validate headers
    if (schema.headers) {
      try {
        schema.headers.parse(request.headers);
      } catch (e) {
        if (e instanceof z.ZodError) {
          errors.push(...e.errors.map(err => `Header ${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    // Validate query parameters
    if (schema.queryParams && request.queryParams) {
      try {
        schema.queryParams.parse(request.queryParams);
      } catch (e) {
        if (e instanceof z.ZodError) {
          errors.push(...e.errors.map(err => `Query param ${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    // Validate path parameters
    if (schema.pathParams && request.pathParams) {
      try {
        schema.pathParams.parse(request.pathParams);
      } catch (e) {
        if (e instanceof z.ZodError) {
          errors.push(...e.errors.map(err => `Path param ${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    // Validate request body
    if (schema.body && request.body) {
      try {
        schema.body.parse(request.body);
      } catch (e) {
        if (e instanceof z.ZodError) {
          errors.push(...e.errors.map(err => `Body ${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    // Check for missing required fields
    if (schema.required) {
      for (const field of schema.required) {
        const hasField = 
          (request.body && field in request.body) ||
          (request.queryParams && field in request.queryParams) ||
          (request.pathParams && field in request.pathParams);
        
        if (!hasField) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Generate validation report
  generateReport(): ValidationReport {
    const report: ValidationReport = {
      totalRequests: this.capturedRequests.length,
      validRequests: this.capturedRequests.length - this.validationErrors.length,
      invalidRequests: this.validationErrors.length,
      errors: this.validationErrors,
      summary: this.generateSummary(),
    };

    return report;
  }

  private generateSummary(): ValidationSummary {
    const errorTypes = new Map<string, number>();
    const endpointErrors = new Map<string, number>();

    for (const error of this.validationErrors) {
      const endpoint = `${error.request.method} ${error.request.url}`;
      endpointErrors.set(endpoint, (endpointErrors.get(endpoint) || 0) + 1);

      for (const err of error.errors) {
        const type = this.categorizeError(err);
        errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
      }
    }

    return {
      errorsByType: Object.fromEntries(errorTypes),
      errorsByEndpoint: Object.fromEntries(endpointErrors),
      commonIssues: this.identifyCommonIssues(),
    };
  }

  private categorizeError(error: string): string {
    if (error.includes('Missing required')) return 'missing_required';
    if (error.includes('Header')) return 'invalid_header';
    if (error.includes('Query param')) return 'invalid_query_param';
    if (error.includes('Path param')) return 'invalid_path_param';
    if (error.includes('Body')) return 'invalid_body';
    if (error.includes('type')) return 'type_mismatch';
    return 'other';
  }

  private identifyCommonIssues(): string[] {
    const issues: string[] = [];
    
    // Check for missing auth headers
    const missingAuth = this.validationErrors.filter(e => 
      e.errors.some(err => err.includes('Authorization'))
    );
    if (missingAuth.length > 0) {
      issues.push(`Missing authorization headers in ${missingAuth.length} requests`);
    }

    // Check for incorrect parameter formats
    const formatErrors = this.validationErrors.filter(e =>
      e.errors.some(err => err.includes('regex'))
    );
    if (formatErrors.length > 0) {
      issues.push(`Parameter format errors in ${formatErrors.length} requests`);
    }

    return issues;
  }

  // Export captured requests for analysis
  exportCaptures(filepath: string) {
    const data = {
      capturedAt: new Date().toISOString(),
      requests: this.capturedRequests,
      errors: this.validationErrors,
      report: this.generateReport(),
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  // Clear captured data
  clear() {
    this.capturedRequests = [];
    this.validationErrors = [];
  }
}

// Types
interface CapturedRequest {
  timestamp: Date;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, any>;
  pathParams?: Record<string, any>;
}

interface ValidationError {
  request: CapturedRequest;
  errors: string[];
  schema: APISchema;
}

interface APISchema {
  method: string;
  pathParams?: z.ZodSchema;
  queryParams?: z.ZodSchema;
  headers?: z.ZodSchema;
  body?: z.ZodSchema;
  required?: string[];
}

interface OutgoingRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, any>;
  pathParams?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ValidationReport {
  totalRequests: number;
  validRequests: number;
  invalidRequests: number;
  errors: ValidationError[];
  summary: ValidationSummary;
}

interface ValidationSummary {
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  commonIssues: string[];
}

// Integration with BaseAkamaiClient
export function createInterceptedClient(originalClient: any): any {
  const interceptor = new APIRequestInterceptor();
  
  // Wrap the makeRequest method
  const originalMakeRequest = originalClient.makeRequest.bind(originalClient);
  
  originalClient.makeRequest = async function(options: any) {
    // Extract request details
    const request: OutgoingRequest = {
      method: options.method,
      url: options.url,
      headers: options.headers,
      body: options.body,
      queryParams: options.params,
      pathParams: options.pathParams,
    };

    // Validate request
    const validation = interceptor.interceptRequest(request);
    
    if (!validation.valid) {
      console.error('API Request Validation Failed:', validation.errors);
      // Log but don't block the request in test mode
    }

    // Make the actual request
    return originalMakeRequest(options);
  };

  // Expose interceptor for testing
  originalClient._interceptor = interceptor;
  
  return originalClient;
}