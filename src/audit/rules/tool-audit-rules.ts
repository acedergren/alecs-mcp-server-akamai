/**
 * Tool-specific audit rules for ALECS MCP Server
 * Validates all 175 tools for consistency, correctness, and compliance
 */

import { AuditRule, AuditIssue } from '../audit-framework';

export const toolAuditRules: AuditRule[] = [
  {
    name: 'tool-schema-validation',
    description: 'Ensure all tools have proper Zod schemas',
    category: 'consistency',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/') && context.filePath.endsWith('-tools.ts')) {
        // Check for missing schemas
        const toolDefinitions = context.content.match(/export const \w+ = {[\s\S]*?};/g) || [];
        
        for (const toolDef of toolDefinitions) {
          const hasSchema = toolDef.includes('schema:') || toolDef.includes('inputSchema:');
          if (!hasSchema) {
            const toolName = toolDef.match(/export const (\w+)/)?.[1];
            issues.push({
              severity: 'high',
              category: 'consistency',
              file: context.filePath,
              message: `Tool ${toolName} missing schema definition`,
              suggestion: 'Add Zod schema for input validation',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-description-quality',
    description: 'Check tool descriptions are meaningful and complete',
    category: 'code-quality',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        const descriptions = context.content.matchAll(/description:\s*['"`]([^'"`]+)['"`]/g);
        
        for (const match of descriptions) {
          const desc = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          if (desc.length < 20) {
            issues.push({
              severity: 'low',
              category: 'code-quality',
              file: context.filePath,
              line: lines.length,
              message: 'Tool description too short',
              suggestion: 'Provide detailed description of what the tool does',
              codeSnippet: match[0],
            });
          }
          
          if (desc.toLowerCase().includes('todo') || desc.toLowerCase().includes('fixme')) {
            issues.push({
              severity: 'medium',
              category: 'code-quality',
              file: context.filePath,
              line: lines.length,
              message: 'Incomplete tool description',
              suggestion: 'Complete the incomplete description',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-handler-error-handling',
    description: 'Ensure tool handlers have proper error handling',
    category: 'bug',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        const handlers = context.content.matchAll(/handler:\s*async[^{]*{([^}]+)}/g);
        
        for (const match of handlers) {
          const handlerBody = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          if (!handlerBody.includes('try') && !handlerBody.includes('catch')) {
            issues.push({
              severity: 'high',
              category: 'bug',
              file: context.filePath,
              line: lines.length,
              message: 'Tool handler missing try-catch block',
              suggestion: 'Wrap handler logic in try-catch for proper error handling',
            });
          }
          
          if (!handlerBody.includes('validateCustomer') && handlerBody.includes('customer')) {
            issues.push({
              severity: 'critical',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: 'Tool handler uses customer parameter without validation',
              suggestion: 'Always validate customer parameter before API calls',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-naming-convention',
    description: 'Verify tool names follow MCP naming convention',
    category: 'consistency',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        const toolNames = context.content.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g);
        const validPattern = /^[a-zA-Z0-9_-]{1,64}$/;
        
        for (const match of toolNames) {
          const name = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          if (!validPattern.test(name)) {
            issues.push({
              severity: 'high',
              category: 'consistency',
              file: context.filePath,
              line: lines.length,
              message: `Tool name '${name}' violates MCP naming pattern`,
              suggestion: 'Use only alphanumeric, underscore, and hyphen (max 64 chars)',
              codeSnippet: match[0],
            });
          }
          
          if (name.includes('.')) {
            issues.push({
              severity: 'critical',
              category: 'consistency',
              file: context.filePath,
              line: lines.length,
              message: `Tool name '${name}' contains dots`,
              suggestion: 'Replace dots with hyphens',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-customer-field-consistency',
    description: 'Ensure all tools have consistent customer field in schema',
    category: 'consistency',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        const schemas = context.content.matchAll(/schema:\s*z\.object\({([^}]+)}\)/g);
        
        for (const match of schemas) {
          const schemaBody = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          if (!schemaBody.includes('customer:')) {
            // Find the tool name for better error message
            const beforeSchema = context.content.substring(0, match.index);
            const toolNameMatch = beforeSchema.match(/name:\s*['"`]([^'"`]+)['"`](?![\s\S]*name:)/);
            const toolName = toolNameMatch?.[1] || 'unknown';
            
            issues.push({
              severity: 'high',
              category: 'consistency',
              file: context.filePath,
              line: lines.length,
              message: `Tool '${toolName}' schema missing customer field`,
              suggestion: 'Add customer: z.string().optional() to schema',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-response-format',
    description: 'Verify tools return proper MCP response format',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        const handlers = context.content.matchAll(/handler:\s*async[^{]*{([^}]+)}/g);
        
        for (const match of handlers) {
          const handlerBody = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check if handler returns raw data instead of MCP format
          if (handlerBody.includes('return response.data') && !handlerBody.includes('content:')) {
            issues.push({
              severity: 'high',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'Tool handler returns raw data instead of MCP format',
              suggestion: 'Return { content: [{ type: "text", text: ... }] }',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-duplicate-detection',
    description: 'Detect duplicate tool names across files',
    category: 'bug',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      // This rule needs to track state across files
      // In a real implementation, we'd use a shared state manager
      // For now, we'll check within the same file
      
      if (context.filePath.includes('tools/')) {
        const toolNames = Array.from(context.content.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g));
        const nameMap = new Map<string, number[]>();
        
        toolNames.forEach((match) => {
          const name = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n').length;
          
          if (!nameMap.has(name)) {
            nameMap.set(name, []);
          }
          const nameList = nameMap.get(name);
          if (nameList) {nameList.push(lines);}
        });
        
        for (const [name, lines] of nameMap.entries()) {
          if (lines.length > 1) {
            issues.push({
              severity: 'critical',
              category: 'bug',
              file: context.filePath,
              line: lines[1],
              message: `Duplicate tool name '${name}' found`,
              suggestion: 'Each tool must have a unique name',
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-import-validation',
    description: 'Ensure tools are properly imported and registered',
    category: 'architecture',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.endsWith('tools-registry.ts')) {
        // Check for tools defined but not imported
        const toolUsages = context.content.matchAll(/name:\s*(\w+)\.name/g);
        const imports = context.content.match(/import\s*{[^}]+}\s*from/g) || [];
        const importedText = imports.join(' ');
        const importedSymbols: string[] = importedText.match(/\w+/g) || [];
        
        for (const match of toolUsages) {
          const toolVar = match[1] || '';
          if (toolVar && !importedSymbols.includes(toolVar)) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'critical',
              category: 'architecture',
              file: context.filePath,
              line: lines.length,
              message: `Tool '${toolVar}' used but not imported`,
              suggestion: 'Add import statement for this tool',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-api-endpoint-validation',
    description: 'Verify tool API endpoints match Akamai API specifications',
    category: 'api-compliance',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        // Check for hardcoded API paths that might be incorrect
        const apiPaths = context.content.matchAll(/['"](\/\w+\/[\w-/]+)['"]/g);
        
        for (const match of apiPaths) {
          const apiPath = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          // Check for common API path issues
          if (apiPath.includes('//')) {
            issues.push({
              severity: 'medium',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'API path contains double slashes',
              suggestion: 'Remove duplicate slashes from path',
              codeSnippet: match[0],
            });
          }
          
          if (!apiPath.match(/^\/\w+\/v\d+/)) {
            issues.push({
              severity: 'low',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'API path missing version number',
              suggestion: 'Include API version in path (e.g., /papi/v1/)',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },

  {
    name: 'tool-parameter-validation',
    description: 'Ensure tool parameters are properly validated',
    category: 'bug',
    check: async (context) => {
      const issues: AuditIssue[] = [];
      
      if (context.filePath.includes('tools/')) {
        // Check for parameters used without validation
        const paramUsages = context.content.matchAll(/params\.(\w+)/g);
        const schemaFields = new Set<string>();
        
        // Extract schema fields
        const schemas = context.content.matchAll(/(\w+):\s*z\./g);
        for (const match of schemas) {
          const field = match[1];
          if (field) {schemaFields.add(field);}
        }
        
        // Check if params are validated
        for (const match of paramUsages) {
          const param = match[1] || '';
          const lines = context.content.substring(0, match.index).split('\n');
          
          if (!schemaFields.has(param) && param !== 'customer') {
            issues.push({
              severity: 'high',
              category: 'bug',
              file: context.filePath,
              line: lines.length,
              message: `Parameter '${param}' used without schema validation`,
              suggestion: 'Add parameter to Zod schema',
              codeSnippet: match[0],
            });
          }
        }
      }
      
      return issues;
    },
  },
];