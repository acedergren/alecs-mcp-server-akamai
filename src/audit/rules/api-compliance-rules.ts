/**
 * API compliance audit rules for ALECS MCP Server
 * Ensures compliance with Akamai API specifications and MCP protocol
 */

import { AuditRule, AuditIssue } from '../audit-framework';

export const apiComplianceRules: AuditRule[] = [
  {
    name: 'akamai-error-format',
    description: 'Verify Akamai API error format compliance',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for proper Akamai error structure
      if (context.content.includes('catch')) {
        const catchBlocks = context.content.matchAll(/catch\s*\([^)]+\)\s*{([^}]+)}/g);
        
        for (const match of catchBlocks) {
          const catchBody = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check if error is properly formatted
          if (!catchBody.includes('type:') || !catchBody.includes('detail:')) {
            issues.push({
              severity: 'high',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'Error response missing Akamai format (type, title, detail)',
              suggestion: 'Format errors with: { type, title, detail, instance, status }',
            });
          }
          
          // Check for error code mapping
          if (catchBody.includes('status:') && !catchBody.includes('mapErrorCode')) {
            issues.push({
              severity: 'medium',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'Error status code not mapped to Akamai standards',
              suggestion: 'Map HTTP status codes to Akamai error types',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'mcp-response-format',
    description: 'Ensure MCP protocol response format',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check tool handlers return correct format
      if (context.filePath.includes('tools/')) {
        const returns = context.content.matchAll(/return\s*{([^}]+)}/g);
        
        for (const match of returns) {
          const returnBody = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check for MCP content format
          const hasContent = returnBody.includes('content:');
          const hasData = returnBody.includes('data:');
          // const hasError = returnBody.includes('error:');
          
          if (!hasContent && hasData) {
            issues.push({
              severity: 'high',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'Tool returns data instead of MCP content format',
              suggestion: 'Return { content: [{ type: "text", text: ... }] }',
            });
          }
          
          // Check for proper text block structure
          if (hasContent && !returnBody.includes('type:')) {
            issues.push({
              severity: 'medium',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'MCP content missing type field',
              suggestion: 'Each content item must have type: "text"',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'api-versioning',
    description: 'Check API version consistency',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Extract API versions used
      const versionPatterns = [
        /\/papi\/v(\d+)/g,
        /\/dns-config\/v(\d+)/g,
        /\/cps\/v(\d+)/g,
        /\/network-list\/v(\d+)/g,
      ];
      
      const versions = new Map<string, Set<string>>();
      
      for (const pattern of versionPatterns) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const api = match[0].split('/')[1] || '';
          const version = match[1] || '';
          
          if (!versions.has(api)) {
            versions.set(api, new Set());
          }
          versions.get(api)!.add(version);
        }
      }
      
      // Check for multiple versions of same API
      for (const [api, versionSet] of versions.entries()) {
        if (versionSet.size > 1) {
          issues.push({
            severity: 'medium',
            category: 'api-compliance',
            file: context.filePath,
            message: `Multiple versions of ${api} API used: ${Array.from(versionSet).join(', ')}`,
            suggestion: 'Use consistent API version across the codebase',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'http-method-compliance',
    description: 'Verify correct HTTP methods for operations',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for incorrect HTTP methods
      const methodPatterns = [
        { pattern: /\.get\([^)]*\).*create/gi, correct: 'POST' },
        { pattern: /\.get\([^)]*\).*update/gi, correct: 'PUT/PATCH' },
        { pattern: /\.get\([^)]*\).*delete/gi, correct: 'DELETE' },
        { pattern: /\.post\([^)]*\).*list/gi, correct: 'GET' },
        { pattern: /\.delete\([^)]*\).*get/gi, correct: 'GET' },
      ];
      
      for (const { pattern, correct } of methodPatterns) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'high',
            category: 'api-compliance',
            file: context.filePath,
            line: lines.length,
            message: 'Incorrect HTTP method for operation',
            suggestion: `Use ${correct} method instead`,
            codeSnippet: match[0],
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'header-compliance',
    description: 'Check required Akamai headers',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('client') || context.filePath.includes('auth')) {
        // Check for required headers
        const requiredHeaders = [
          'Content-Type',
          'Authorization',
          'User-Agent',
        ];
        
        for (const header of requiredHeaders) {
          if (!context.content.includes(header)) {
            issues.push({
              severity: 'medium',
              category: 'api-compliance',
              file: context.filePath,
              message: `Missing required header: ${header}`,
              suggestion: 'Add all required Akamai API headers',
            });
          }
        }
        
        // Check for account switching header
        if (context.content.includes('accountSwitchKey') && 
            !context.content.includes('X-Akamai-Account-Key')) {
          issues.push({
            severity: 'high',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Account switch key not set in headers',
            suggestion: 'Set X-Akamai-Account-Key header for account switching',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'pagination-compliance',
    description: 'Verify pagination implementation',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check list operations for pagination
      if (context.content.includes('list') && context.filePath.includes('tools/')) {
        const hasPageParam = context.content.includes('page:') || context.content.includes('offset:');
        const hasLimitParam = context.content.includes('limit:') || context.content.includes('pageSize:');
        
        if (!hasPageParam || !hasLimitParam) {
          issues.push({
            severity: 'medium',
            category: 'api-compliance',
            file: context.filePath,
            message: 'List operation missing pagination parameters',
            suggestion: 'Add page/limit or offset/pageSize parameters',
          });
        }
        
        // Check for pagination metadata in response
        if (!context.content.includes('totalCount') && !context.content.includes('hasMore')) {
          issues.push({
            severity: 'low',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Pagination response missing metadata',
            suggestion: 'Include totalCount, hasMore, or nextPage in response',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'async-operation-compliance',
    description: 'Check async operation handling',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for activation operations
      if (context.content.includes('activate')) {
        // Check for status polling
        if (!context.content.includes('poll') && !context.content.includes('checkStatus')) {
          issues.push({
            severity: 'high',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Activation without status polling mechanism',
            suggestion: 'Implement status polling for async operations',
          });
        }
        
        // Check for activation ID handling
        if (!context.content.includes('activationId') && !context.content.includes('activation_id')) {
          issues.push({
            severity: 'medium',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Activation response missing activation ID',
            suggestion: 'Return activation ID for status tracking',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'rate-limit-handling',
    description: 'Verify rate limit error handling',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for rate limit handling
      if (context.content.includes('catch') || context.content.includes('error')) {
        const has429Handling = context.content.includes('429') || 
                              context.content.includes('rate limit') ||
                              context.content.includes('Too Many Requests');
        
        if (!has429Handling) {
          issues.push({
            severity: 'medium',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Missing rate limit error handling',
            suggestion: 'Handle 429 errors with retry logic',
          });
        }
        
        // Check for Retry-After header
        if (has429Handling && !context.content.includes('Retry-After')) {
          issues.push({
            severity: 'low',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Rate limit handling without Retry-After header',
            suggestion: 'Respect Retry-After header for retries',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'response-field-naming',
    description: 'Check response field naming conventions',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for camelCase vs snake_case consistency
      const responsePatterns = [
        /response\.data\.(\w+_\w+)/g,  // snake_case
        /response\.data\.([a-z][a-zA-Z]+)/g,  // camelCase
      ];
      
      let hasSnakeCase = false;
      let hasCamelCase = false;
      
      for (const pattern of responsePatterns) {
        const matches = context.content.matchAll(pattern);
        if (Array.from(matches).length > 0) {
          if (pattern.source.includes('_')) {
            hasSnakeCase = true;
          } else {
            hasCamelCase = true;
          }
        }
      }
      
      if (hasSnakeCase && hasCamelCase) {
        issues.push({
          severity: 'low',
          category: 'api-compliance',
          file: context.filePath,
          message: 'Mixed naming conventions in API responses',
          suggestion: 'Use consistent naming (Akamai uses snake_case)',
        });
      }
      
      return issues;
    },
  },

  {
    name: 'schema-validation-compliance',
    description: 'Ensure proper request/response validation',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for response validation
      if (context.content.includes('response.data')) {
        const hasValidation = context.content.includes('.parse(') || 
                             context.content.includes('validate') ||
                             context.content.includes('schema.safeParse');
        
        if (!hasValidation) {
          issues.push({
            severity: 'high',
            category: 'api-compliance',
            file: context.filePath,
            message: 'API response used without validation',
            suggestion: 'Validate API responses with Zod schemas',
          });
        }
      }
      
      // Check for request validation
      if (context.content.includes('params') && context.filePath.includes('tools/')) {
        const hasSchema = context.content.includes('schema:') || 
                         context.content.includes('inputSchema:');
        
        if (!hasSchema) {
          issues.push({
            severity: 'high',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Tool missing input schema validation',
            suggestion: 'Add Zod schema for request validation',
          });
        }
      }
      
      return issues;
    },
  },
];