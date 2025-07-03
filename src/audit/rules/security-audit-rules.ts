/**
 * Security and customer isolation audit rules for ALECS MCP Server
 * Focuses on EdgeGrid auth, multi-tenant isolation, and security best practices
 */

import { AuditRule, AuditIssue } from '../audit-framework';

export const securityAuditRules: AuditRule[] = [
  {
    name: 'edgegrid-auth-security',
    description: 'Verify EdgeGrid authentication security',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('auth') || context.filePath.includes('edgegrid')) {
        // Check for exposed credentials
        const credentialPatterns = [
          /client_secret\s*[:=]\s*['"][^'"]+['"]/gi,
          /access_token\s*[:=]\s*['"][^'"]+['"]/gi,
          /client_token\s*[:=]\s*['"][^'"]+['"]/gi,
        ];
        
        for (const pattern of credentialPatterns) {
          const matches = context.content.matchAll(pattern);
          for (const match of matches) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'critical',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: 'Potential EdgeGrid credential exposure',
              suggestion: 'Never hardcode credentials, use .edgerc or environment variables',
              codeSnippet: match[0],
            });
          }
        }
        
        // Check for proper nonce generation
        if (context.content.includes('nonce') && !context.content.includes('crypto.randomBytes')) {
          issues.push({
            severity: 'high',
            category: 'security',
            file: context.filePath,
            message: 'Weak nonce generation for EdgeGrid auth',
            suggestion: 'Use crypto.randomBytes() for secure nonce generation',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'customer-data-isolation',
    description: 'Ensure proper customer data isolation',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for cross-customer data access
      if (context.content.includes('customer')) {
        // Look for caching without customer key
        const cachePatterns = [
          /cache\.(get|set|has)\(['"`]([^'"]+)['"`]/g,
          /cacheKey\s*=\s*['"`]([^'"]+)['"`]/g,
        ];
        
        for (const pattern of cachePatterns) {
          const matches = context.content.matchAll(pattern);
          for (const match of matches) {
            const cacheKey = match[1] || match[2] || '';
            const lines = context.content.substring(0, match.index).split('\n');
            
            // Check if cache key includes customer identifier
            const nearbyCode = context.content.substring(
              Math.max(0, match.index! - 200),
              Math.min(context.content.length, match.index! + 200)
            );
            
            if (!nearbyCode.includes('${customer}') && !cacheKey.includes('${customer}')) {
              issues.push({
                severity: 'critical',
                category: 'security',
                file: context.filePath,
                line: lines.length,
                message: 'Cache key missing customer isolation',
                suggestion: 'Include customer identifier in cache keys',
                codeSnippet: match[0],
              });
            }
          }
        }
        
        // Check for SQL/query without customer filter
        const queryPatterns = [
          /WHERE\s+/gi,
          /find\({/g,
          /filter\(/g,
        ];
        
        for (const pattern of queryPatterns) {
          const matches = context.content.matchAll(pattern);
          for (const match of matches) {
            const afterMatch = context.content.substring(match.index!, match.index! + 200);
            const lines = context.content.substring(0, match.index).split('\n');
            
            if (!afterMatch.includes('customer') && context.content.includes('customer')) {
              issues.push({
                severity: 'high',
                category: 'security',
                file: context.filePath,
                line: lines.length,
                message: 'Query potentially missing customer filter',
                suggestion: 'Always filter by customer in multi-tenant queries',
              });
            }
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'input-validation-security',
    description: 'Check for input validation vulnerabilities',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for command injection vulnerabilities
      const dangerousPatterns = [
        /exec\(/g,
        /execSync\(/g,
        /spawn\(/g,
        /eval\(/g,
      ];
      
      for (const pattern of dangerousPatterns) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check if user input is passed to these functions
          const beforeMatch = context.content.substring(
            Math.max(0, match.index! - 500),
            match.index!
          );
          
          if (beforeMatch.includes('params.') || beforeMatch.includes('args.')) {
            issues.push({
              severity: 'critical',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: 'Potential command injection vulnerability',
              suggestion: 'Never pass user input directly to system commands',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      // Check for path traversal
      if (context.content.includes('readFile') || context.content.includes('writeFile')) {
        const fileOps = context.content.matchAll(/(readFile|writeFile)\([^)]+\)/g);
        
        for (const match of fileOps) {
          const operation = match[0];
          const lines = context.content.substring(0, match.index).split('\n');
          
          if (operation.includes('params.') && !operation.includes('path.resolve')) {
            issues.push({
              severity: 'critical',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: 'Potential path traversal vulnerability',
              suggestion: 'Use path.resolve() and validate file paths',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'api-key-rotation',
    description: 'Check for API key rotation capabilities',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('config') || context.filePath.includes('auth')) {
        // Check for API key rotation support
        if (context.content.includes('api_key') || context.content.includes('apiKey')) {
          const hasRotation = context.content.includes('rotate') || 
                             context.content.includes('refresh') ||
                             context.content.includes('renew');
          
          if (!hasRotation) {
            issues.push({
              severity: 'medium',
              category: 'security',
              file: context.filePath,
              message: 'Missing API key rotation capability',
              suggestion: 'Implement API key rotation for security best practices',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'error-message-leakage',
    description: 'Prevent sensitive information in error messages',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for sensitive data in error messages
      const errorPatterns = [
        /throw.*Error.*password/gi,
        /throw.*Error.*secret/gi,
        /throw.*Error.*key/gi,
        /throw.*Error.*token/gi,
      ];
      
      for (const pattern of errorPatterns) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'high',
            category: 'security',
            file: context.filePath,
            line: lines.length,
            message: 'Potential sensitive data in error message',
            suggestion: 'Sanitize error messages before throwing',
            codeSnippet: match[0],
          });
        }
      }
      
      // Check for stack trace exposure
      if (context.content.includes('.stack') && context.content.includes('response')) {
        issues.push({
          severity: 'medium',
          category: 'security',
          file: context.filePath,
          message: 'Potential stack trace exposure in responses',
          suggestion: 'Never send stack traces to clients in production',
        });
      }
      
      return issues;
    },
  },

  {
    name: 'account-switch-security',
    description: 'Verify account switching security',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.content.includes('account-switch-key') || context.content.includes('accountSwitchKey')) {
        // Check for proper validation
        if (!context.content.includes('validateAccountSwitch')) {
          issues.push({
            severity: 'critical',
            category: 'security',
            file: context.filePath,
            message: 'Account switching without validation',
            suggestion: 'Validate account switch permissions before allowing',
          });
        }
        
        // Check for audit logging
        if (!context.content.includes('audit') && !context.content.includes('log.*switch')) {
          issues.push({
            severity: 'high',
            category: 'security',
            file: context.filePath,
            message: 'Account switching without audit logging',
            suggestion: 'Log all account switch operations for security',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'rate-limiting',
    description: 'Check for rate limiting implementation',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('server') || context.filePath.includes('handler')) {
        const hasRateLimit = context.content.includes('rateLimit') || 
                            context.content.includes('throttle') ||
                            context.content.includes('429');
        
        if (!hasRateLimit) {
          issues.push({
            severity: 'medium',
            category: 'security',
            file: context.filePath,
            message: 'Missing rate limiting implementation',
            suggestion: 'Implement rate limiting to prevent API abuse',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'secure-headers',
    description: 'Verify secure headers are set',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('server') || context.filePath.includes('response')) {
        const securityHeaders = [
          'X-Content-Type-Options',
          'X-Frame-Options',
          'X-XSS-Protection',
          'Strict-Transport-Security',
        ];
        
        for (const header of securityHeaders) {
          if (!context.content.includes(header)) {
            issues.push({
              severity: 'low',
              category: 'security',
              file: context.filePath,
              message: `Missing security header: ${header}`,
              suggestion: 'Add security headers to all responses',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'customer-permission-check',
    description: 'Ensure proper permission checks for customer operations',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Look for operations that should have permission checks
      const sensitiveOps = [
        /delete[A-Z]/g,
        /remove[A-Z]/g,
        /update[A-Z]/g,
        /activate[A-Z]/g,
      ];
      
      for (const pattern of sensitiveOps) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const functionName = match[0];
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check for permission check nearby
          const beforeFunction = context.content.substring(
            Math.max(0, match.index! - 1000),
            match.index!
          );
          
          if (!beforeFunction.includes('checkPermission') && 
              !beforeFunction.includes('hasPermission') &&
              !beforeFunction.includes('canAccess')) {
            issues.push({
              severity: 'high',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: `Sensitive operation '${functionName}' without permission check`,
              suggestion: 'Add permission validation before sensitive operations',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'ssl-tls-validation',
    description: 'Check for proper SSL/TLS validation',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for disabled SSL verification
      if (context.content.includes('rejectUnauthorized: false') ||
          context.content.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
        issues.push({
          severity: 'critical',
          category: 'security',
          file: context.filePath,
          message: 'SSL/TLS certificate validation disabled',
          suggestion: 'Never disable SSL certificate validation in production',
        });
      }
      
      // Check for insecure protocols
      if (context.content.includes('http://') && !context.content.includes('localhost')) {
        const httpMatches = context.content.matchAll(/http:\/\/[^\/\s]+/g);
        for (const match of httpMatches) {
          if (!match[0].includes('localhost') && !match[0].includes('127.0.0.1')) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'high',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: 'Using insecure HTTP protocol',
              suggestion: 'Use HTTPS for all external connections',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },
];