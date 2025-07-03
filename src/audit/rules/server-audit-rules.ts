/**
 * Server-specific audit rules for ALECS MCP Server
 * Validates property, DNS, security, and other server implementations
 */

import { AuditRule, AuditIssue } from '../audit-framework';

export const serverAuditRules: AuditRule[] = [
  {
    name: 'server-initialization',
    description: 'Check server initialization patterns',
    category: 'architecture',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/') && context.filePath.endsWith('-server.ts')) {
        // Check for proper server setup
        if (!context.content.includes('new Server(')) {
          issues.push({
            severity: 'critical',
            category: 'architecture',
            file: context.filePath,
            message: 'Server file missing MCP Server initialization',
            suggestion: 'Initialize MCP Server with proper configuration',
          });
        }
        
        // Check for transport setup
        if (!context.content.includes('StdioServerTransport')) {
          issues.push({
            severity: 'high',
            category: 'architecture',
            file: context.filePath,
            message: 'Server missing StdioServerTransport setup',
            suggestion: 'Add StdioServerTransport for MCP communication',
          });
        }
        
        // Check for error handling in start method
        if (!context.content.includes('.catch')) {
          issues.push({
            severity: 'high',
            category: 'bug',
            file: context.filePath,
            message: 'Server start method missing error handling',
            suggestion: 'Add .catch() to handle startup failures',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-tool-registration',
    description: 'Verify proper tool registration in servers',
    category: 'consistency',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for tool registration pattern
        const registerCalls = context.content.matchAll(/this\.registerTool\(/g);
        const toolCount = Array.from(registerCalls).length;
        
        if (toolCount === 0 && context.filePath.includes('-server.ts')) {
          issues.push({
            severity: 'high',
            category: 'consistency',
            file: context.filePath,
            message: 'Server has no registered tools',
            suggestion: 'Register tools using this.registerTool()',
          });
        }
        
        // Check for consistent registration pattern
        const inconsistentRegistration = context.content.match(/server\.tool\(/);
        if (inconsistentRegistration) {
          issues.push({
            severity: 'medium',
            category: 'consistency',
            file: context.filePath,
            message: 'Inconsistent tool registration pattern',
            suggestion: 'Use this.registerTool() consistently',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-customer-validation',
    description: 'Ensure servers validate customer configuration',
    category: 'security',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for customer validation in handlers
        if (context.content.includes('customer') && !context.content.includes('CustomerConfigManager')) {
          issues.push({
            severity: 'critical',
            category: 'security',
            file: context.filePath,
            message: 'Server handles customer parameter without CustomerConfigManager',
            suggestion: 'Use CustomerConfigManager.getInstance() for validation',
          });
        }
        
        // Check for validateCustomer calls
        const hasCustomerParam = context.content.includes('params.customer');
        const hasValidation = context.content.includes('validateCustomer');
        
        if (hasCustomerParam && !hasValidation) {
          issues.push({
            severity: 'critical',
            category: 'security',
            file: context.filePath,
            message: 'Server uses customer parameter without validation',
            suggestion: 'Call validateCustomer() before using customer parameter',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-error-response',
    description: 'Check server error response format',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for proper MCP error usage
        const genericErrors = context.content.matchAll(/throw new Error\(/g);
        
        for (const match of genericErrors) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'high',
            category: 'api-compliance',
            file: context.filePath,
            line: lines.length,
            message: 'Server throwing generic Error instead of McpError',
            suggestion: 'Use McpError with proper ErrorCode',
            codeSnippet: 'throw new Error(',
          });
        }
        
        // Check for error code usage
        if (!context.content.includes('ErrorCode')) {
          issues.push({
            severity: 'medium',
            category: 'api-compliance',
            file: context.filePath,
            message: 'Server not using MCP ErrorCode enum',
            suggestion: 'Import and use ErrorCode for standard error responses',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-request-handlers',
    description: 'Verify server request handlers are properly set up',
    category: 'architecture',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for required handlers
        const hasListTools = context.content.includes('ListToolsRequestSchema');
        const hasCallTool = context.content.includes('CallToolRequestSchema');
        
        if (!hasListTools) {
          issues.push({
            severity: 'critical',
            category: 'architecture',
            file: context.filePath,
            message: 'Server missing ListToolsRequestSchema handler',
            suggestion: 'Add handler for listing available tools',
          });
        }
        
        if (!hasCallTool) {
          issues.push({
            severity: 'critical',
            category: 'architecture',
            file: context.filePath,
            message: 'Server missing CallToolRequestSchema handler',
            suggestion: 'Add handler for tool execution',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-logging',
    description: 'Ensure proper logging in servers',
    category: 'code-quality',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for logger import
        if (!context.content.includes('logger')) {
          issues.push({
            severity: 'medium',
            category: 'code-quality',
            file: context.filePath,
            message: 'Server missing logger import',
            suggestion: 'Import and use logger for debugging',
          });
        }
        
        // Check for startup logging
        if (!context.content.includes('logger.info') && !context.content.includes('console.log')) {
          issues.push({
            severity: 'low',
            category: 'code-quality',
            file: context.filePath,
            message: 'Server missing startup logging',
            suggestion: 'Add logging for server initialization and startup',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-fastpurge-queue',
    description: 'Check FastPurge server queue management',
    category: 'bug',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('fastpurge-server')) {
        // Check for queue directory creation
        if (!context.content.includes('mkdir') && !context.content.includes('ensureDir')) {
          issues.push({
            severity: 'high',
            category: 'bug',
            file: context.filePath,
            message: 'FastPurge server missing queue directory creation',
            suggestion: 'Create /tmp/alecs-mcp-akamai/purge-queues directory on startup',
          });
        }
        
        // Check for queue persistence
        if (context.content.includes('QueueManager') && !context.content.includes('persistQueue')) {
          issues.push({
            severity: 'medium',
            category: 'bug',
            file: context.filePath,
            message: 'FastPurge queue manager missing persistence',
            suggestion: 'Implement queue persistence to handle restarts',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-memory-leaks',
    description: 'Detect potential memory leaks in servers',
    category: 'performance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for event listener cleanup
        if (context.content.includes('addEventListener') && !context.content.includes('removeEventListener')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'Event listeners added without cleanup',
            suggestion: 'Remove event listeners on server shutdown',
          });
        }
        
        // Check for interval/timeout cleanup
        if (context.content.includes('setInterval') && !context.content.includes('clearInterval')) {
          issues.push({
            severity: 'high',
            category: 'performance',
            file: context.filePath,
            message: 'Interval created without cleanup',
            suggestion: 'Clear intervals on server shutdown',
          });
        }
        
        // Check for growing collections
        const mapOrSet = context.content.match(/new (Map|Set)\(/g);
        if (mapOrSet && !context.content.includes('.clear()') && !context.content.includes('.delete(')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            message: 'Collection that may grow unbounded',
            suggestion: 'Implement cleanup or size limits for collections',
          });
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-concurrency',
    description: 'Check for concurrency issues in servers',
    category: 'bug',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/')) {
        // Check for shared state without synchronization
        const sharedState = context.content.match(/this\.(\w+)\s*=/g);
        const asyncMethods = context.content.match(/async\s+\w+/g);
        
        if (sharedState && asyncMethods && asyncMethods.length > 3) {
          // Look for potential race conditions
          const stateVars = new Set<string>();
          for (const match of sharedState || []) {
            const varName = match.match(/this\.(\w+)/)?.[1];
            if (varName) stateVars.add(varName);
          }
          
          for (const varName of stateVars) {
            const writePattern = new RegExp(`this\\.${varName}\\s*=`);
            const readPattern = new RegExp(`this\\.${varName}(?!\\s*=)`);
            
            if (context.content.match(writePattern) && context.content.match(readPattern)) {
              issues.push({
                severity: 'medium',
                category: 'bug',
                file: context.filePath,
                message: `Potential race condition on shared state: ${varName}`,
                suggestion: 'Consider using locks or atomic operations',
              });
            }
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'server-graceful-shutdown',
    description: 'Ensure servers handle shutdown gracefully',
    category: 'architecture',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('servers/') && context.filePath.endsWith('-server.ts')) {
        // Check for shutdown handling
        if (!context.content.includes('SIGTERM') && !context.content.includes('SIGINT')) {
          issues.push({
            severity: 'medium',
            category: 'architecture',
            file: context.filePath,
            message: 'Server missing graceful shutdown handling',
            suggestion: 'Add signal handlers for SIGTERM/SIGINT',
          });
        }
        
        // Check for cleanup methods
        if (!context.content.includes('cleanup') && !context.content.includes('dispose')) {
          issues.push({
            severity: 'low',
            category: 'architecture',
            file: context.filePath,
            message: 'Server missing cleanup/dispose method',
            suggestion: 'Implement cleanup method for resource disposal',
          });
        }
      }
      
      return issues;
    },
  },
];