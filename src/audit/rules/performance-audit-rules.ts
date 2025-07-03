/**
 * Performance and caching audit rules for ALECS MCP Server
 * Identifies performance bottlenecks and optimization opportunities
 */

import { AuditRule, AuditIssue } from '../audit-framework';

export const performanceAuditRules: AuditRule[] = [
  {
    name: 'cache-strategy-validation',
    description: 'Verify proper caching implementation',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for missing cache on read operations
      const readOps = [
        /list[A-Z]\w+/g,
        /get[A-Z]\w+/g,
        /search[A-Z]\w+/g,
        /find[A-Z]\w+/g,
      ];
      
      for (const pattern of readOps) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const functionName = match[0];
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check if function has caching
          const functionStart = match.index!;
          const functionEnd = context.content.indexOf('}', functionStart + 200);
          const functionBody = context.content.substring(functionStart, functionEnd);
          
          if (!functionBody.includes('cache.get') && 
              !functionBody.includes('getFromCache') &&
              !functionName.includes('NoCache')) {
            issues.push({
              severity: 'medium',
              category: 'performance',
              file: context.filePath,
              line: lines.length,
              message: `Read operation '${functionName}' without caching`,
              suggestion: 'Consider adding caching for frequently accessed data',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'cache-invalidation-check',
    description: 'Ensure cache invalidation on mutations',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Look for mutation operations
      const mutationOps = [
        /create[A-Z]\w+/g,
        /update[A-Z]\w+/g,
        /delete[A-Z]\w+/g,
        /remove[A-Z]\w+/g,
        /activate[A-Z]\w+/g,
      ];
      
      for (const pattern of mutationOps) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const functionName = match[0];
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check for cache invalidation
          const functionStart = match.index!;
          const functionEnd = context.content.indexOf('return', functionStart) + 100;
          const functionBody = context.content.substring(functionStart, functionEnd);
          
          if (!functionBody.includes('invalidate') && 
              !functionBody.includes('clearCache') &&
              !functionBody.includes('cache.delete')) {
            issues.push({
              severity: 'high',
              category: 'performance',
              file: context.filePath,
              line: lines.length,
              message: `Mutation '${functionName}' without cache invalidation`,
              suggestion: 'Invalidate related cache entries after mutations',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'n-plus-one-queries',
    description: 'Detect potential N+1 query problems',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Look for loops with API calls
      const loopPatterns = [
        /for\s*\([^)]+\)\s*{[^}]*await[^}]*client\./g,
        /\.forEach\s*\([^)]*=>\s*{[^}]*await[^}]*}/g,
        /\.map\s*\([^)]*=>\s*{[^}]*await[^}]*}/g,
      ];
      
      for (const pattern of loopPatterns) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'high',
            category: 'performance',
            file: context.filePath,
            line: lines.length,
            message: 'Potential N+1 query problem: API call inside loop',
            suggestion: 'Batch API calls or use bulk operations',
            codeSnippet: match[0].substring(0, 50) + '...',
          });
        }
      }
      
      // Check for missing Promise.all
      if (context.content.includes('await') && context.content.includes('.map(')) {
        const mapAwaits = context.content.matchAll(/\.map\([^)]+\)\s*;/g);
        for (const match of mapAwaits) {
          const beforeMap = context.content.substring(
            Math.max(0, match.index! - 50),
            match.index!
          );
          if (!beforeMap.includes('Promise.all')) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'medium',
              category: 'performance',
              file: context.filePath,
              line: lines.length,
              message: 'Sequential awaits instead of parallel execution',
              suggestion: 'Use Promise.all() for parallel async operations',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'large-payload-handling',
    description: 'Check for proper handling of large payloads',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for pagination support
      if (context.filePath.includes('tools/') && context.content.includes('list')) {
        const hasLimit = context.content.includes('limit:') || context.content.includes('pageSize:');
        const hasOffset = context.content.includes('offset:') || context.content.includes('page:');
        
        if (!hasLimit || !hasOffset) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'List operation without pagination support',
            suggestion: 'Add limit/offset or pageSize/page parameters',
          });
        }
      }
      
      // Check for streaming support on large operations
      if (context.content.includes('bulkImport') || context.content.includes('export')) {
        if (!context.content.includes('stream') && !context.content.includes('chunk')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'Bulk operation without streaming/chunking',
            suggestion: 'Implement streaming or chunking for large data operations',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'memory-efficiency',
    description: 'Detect inefficient memory usage patterns',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for large array operations
      const arrayOps = [
        /\.concat\(/g,
        /\[\.\.\.(\w+)\]/g,
        /Array\.from\(/g,
      ];
      
      for (const pattern of arrayOps) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          const nearbyCode = context.content.substring(
            Math.max(0, (match.index || 0) - 200),
            Math.min(context.content.length, (match.index || 0) + 200)
          );
          
          if (nearbyCode.includes('forEach') || nearbyCode.includes('map')) {
            issues.push({
              severity: 'low',
              category: 'performance',
              file: context.filePath,
              line: lines.length,
              message: 'Potentially inefficient array operation',
              suggestion: 'Consider using iterators or generators for large arrays',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      // Check for JSON operations on large data
      if (context.content.includes('JSON.parse') || context.content.includes('JSON.stringify')) {
        const jsonOps = context.content.matchAll(/JSON\.(parse|stringify)\([^)]+\)/g);
        for (const match of jsonOps) {
          const lines = context.content.substring(0, match.index).split('\n');
          const operation = match[1];
          
          if (context.content.includes('bulk') || context.content.includes('large')) {
            issues.push({
              severity: 'medium',
              category: 'performance',
              file: context.filePath,
              line: lines.length,
              message: `JSON.${operation} on potentially large data`,
              suggestion: 'Consider streaming JSON or using alternative serialization',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'blocking-operations',
    description: 'Identify blocking synchronous operations',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for sync file operations
      const syncOps = [
        /readFileSync/g,
        /writeFileSync/g,
        /existsSync/g,
        /mkdirSync/g,
        /execSync/g,
      ];
      
      for (const pattern of syncOps) {
        const matches = context.content.matchAll(pattern);
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'high',
            category: 'performance',
            file: context.filePath,
            line: lines.length,
            message: `Blocking synchronous operation: ${match[0]}`,
            suggestion: 'Use async version to avoid blocking event loop',
            codeSnippet: match[0],
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'connection-pooling',
    description: 'Check for proper connection pooling',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for connection management
      if (context.content.includes('new AkamaiClient')) {
        const clientCreations = context.content.matchAll(/new AkamaiClient/g);
        const count = Array.from(clientCreations).length;
        
        if (count > 1) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'Multiple AkamaiClient instances created',
            suggestion: 'Use singleton pattern or connection pooling',
          });
        }
      }
      
      // Check for HTTP agent configuration
      if (context.content.includes('axios') || context.content.includes('http')) {
        if (!context.content.includes('keepAlive') && !context.content.includes('httpAgent')) {
          issues.push({
            severity: 'low',
            category: 'performance',
            file: context.filePath,
            message: 'HTTP connections without keep-alive',
            suggestion: 'Enable HTTP keep-alive for connection reuse',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'response-optimization',
    description: 'Check for response size optimization',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for field selection support
      if (context.filePath.includes('tools/') && context.content.includes('get')) {
        if (!context.content.includes('fields:') && !context.content.includes('includeFields:')) {
          issues.push({
            severity: 'low',
            category: 'performance',
            file: context.filePath,
            message: 'GET operation without field selection support',
            suggestion: 'Add fields parameter to reduce response size',
          });
        }
      }
      
      // Check for compression
      if (context.content.includes('response') && !context.content.includes('gzip')) {
        issues.push({
          severity: 'low',
          category: 'performance',
          file: context.filePath,
          message: 'Responses without compression support',
          suggestion: 'Enable gzip compression for API responses',
        });
      }
      
      return issues;
    },
  },

  {
    name: 'timeout-configuration',
    description: 'Ensure proper timeout configuration',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Check for timeout configuration
      if (context.content.includes('axios') || context.content.includes('fetch')) {
        if (!context.content.includes('timeout')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'HTTP requests without timeout configuration',
            suggestion: 'Set appropriate timeouts to prevent hanging requests',
          });
        }
      }
      
      // Check for long-running operations
      if (context.content.includes('while') || context.content.includes('setInterval')) {
        if (!context.content.includes('maxDuration') && !context.content.includes('timeout')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'Long-running operation without timeout',
            suggestion: 'Add maximum duration limit to prevent infinite loops',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'batch-processing',
    description: 'Identify opportunities for batch processing',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // Look for multiple similar API calls
      const apiCalls = context.content.matchAll(/client\.(get|post|put|delete)\(/g);
      const callsByMethod: Record<string, number> = {};
      
      for (const match of apiCalls) {
        const method = match[1] || '';
        callsByMethod[method] = (callsByMethod[method] || 0) + 1;
      }
      
      for (const [method, count] of Object.entries(callsByMethod)) {
        if (count > 3) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: `Multiple ${method.toUpperCase()} calls (${count}) - consider batching`,
            suggestion: 'Implement bulk operations to reduce API calls',
          });
        }
      }
      
      return issues;
    },
  },
];