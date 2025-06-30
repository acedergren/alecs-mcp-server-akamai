#!/usr/bin/env tsx
/**
 * OpenAPI Alignment Analyzer
 * 
 * This script analyzes our code against Akamai OpenAPI specifications to ensure
 * perfect alignment. It follows the CODE KAI principle of systematic validation.
 * 
 * Process:
 * 1. Parse OpenAPI spec to extract all endpoints and schemas
 * 2. Map each function in our code to its OpenAPI endpoint
 * 3. Compare our validation schemas with OpenAPI schemas
 * 4. Generate a report of mismatches and required fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

interface OpenAPIEndpoint {
  path: string;
  method: string;
  operationId: string;
  requestSchema?: any;
  responseSchemas: {
    [statusCode: string]: {
      schema: any;
      example?: any;
    }
  };
}

interface FunctionMapping {
  functionName: string;
  file: string;
  endpoint: {
    path: string;
    method: string;
  };
  hasValidation: boolean;
  validationSchema?: string;
  usesTypeAssertion: boolean;
  typeAssertions: string[];
}

class OpenAPIAlignmentAnalyzer {
  private openApiSpec: any;
  private functionMappings: FunctionMapping[] = [];

  constructor(private specPath: string) {
    this.openApiSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  }

  /**
   * Extract all endpoints from OpenAPI spec
   */
  extractEndpoints(): OpenAPIEndpoint[] {
    const endpoints: OpenAPIEndpoint[] = [];
    
    for (const [path, pathItem] of Object.entries(this.openApiSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation as any;
          const endpoint: OpenAPIEndpoint = {
            path,
            method: method.toUpperCase(),
            operationId: op.operationId || `${method}_${path}`,
            responseSchemas: {}
          };

          // Extract request schema if present
          if (op.requestBody?.content?.['application/json']?.schema) {
            endpoint.requestSchema = op.requestBody.content['application/json'].schema;
          }

          // Extract response schemas
          if (op.responses) {
            for (const [statusCode, response] of Object.entries(op.responses)) {
              const resp = response as any;
              if (resp.content?.['application/json']?.schema) {
                endpoint.responseSchemas[statusCode] = {
                  schema: resp.content['application/json'].schema,
                  example: resp.content['application/json'].example
                };
              }
            }
          }

          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  /**
   * Analyze a TypeScript file to find API calls and validation
   */
  analyzeFile(filePath: string): FunctionMapping[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const mappings: FunctionMapping[] = [];

    // Find all exported async functions (including multiline)
    const functionRegex = /export\s+async\s+function\s+(\w+)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const functionStart = match.index;
      console.log(`Found function: ${functionName} at index ${functionStart}`);
      
      // Find the function body
      let braceCount = 0;
      let inFunction = false;
      let functionEnd = functionStart;
      
      for (let i = functionStart; i < content.length; i++) {
        if (content[i] === '{') {
          braceCount++;
          inFunction = true;
        } else if (content[i] === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            functionEnd = i;
            break;
          }
        }
      }

      const functionBody = content.substring(functionStart, functionEnd + 1);

      // Extract API endpoint
      const pathMatch = functionBody.match(/path:\s*[`'"]([^`'"]+)[`'"]/);
      const methodMatch = functionBody.match(/method:\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/);
      
      console.log(`  Path match: ${pathMatch?.[1] || 'none'}`);
      console.log(`  Method match: ${methodMatch?.[1] || 'none'}`);

      if (pathMatch && methodMatch) {
        // Check for validation
        const hasValidation = functionBody.includes('validateApiResponse');
        const validationMatch = functionBody.match(/validateApiResponse\s*\(\s*\w+,\s*(\w+),/);
        
        // Check for type assertions
        const typeAssertions: string[] = [];
        const assertionRegex = /\)\s*as\s+([A-Z]\w+)/g;
        let assertionMatch;
        while ((assertionMatch = assertionRegex.exec(functionBody)) !== null) {
          typeAssertions.push(assertionMatch[1]);
        }

        mappings.push({
          functionName,
          file: path.basename(filePath),
          endpoint: {
            path: pathMatch[1],
            method: methodMatch[1]
          },
          hasValidation,
          validationSchema: validationMatch?.[1],
          usesTypeAssertion: typeAssertions.length > 0,
          typeAssertions
        });
      }
    }

    return mappings;
  }

  /**
   * Generate Zod schema from OpenAPI schema
   */
  generateZodSchema(openApiSchema: any, schemaName: string): string {
    const lines: string[] = [];
    lines.push(`const ${schemaName} = z.object({`);

    if (openApiSchema.properties) {
      const required = openApiSchema.required || [];
      
      for (const [propName, propSchema] of Object.entries(openApiSchema.properties)) {
        const prop = propSchema as any;
        const isRequired = required.includes(propName);
        
        let zodType = this.mapOpenApiTypeToZod(prop);
        if (!isRequired) {
          zodType += '.optional()';
        }
        
        lines.push(`  ${propName}: ${zodType},`);
      }
    }

    lines.push('});');
    return lines.join('\n');
  }

  /**
   * Map OpenAPI type to Zod type
   */
  private mapOpenApiTypeToZod(schema: any): string {
    if (schema.type === 'string') {
      if (schema.enum) {
        return `z.enum([${schema.enum.map((v: string) => `'${v}'`).join(', ')}])`;
      }
      return 'z.string()';
    } else if (schema.type === 'integer' || schema.type === 'number') {
      return 'z.number()';
    } else if (schema.type === 'boolean') {
      return 'z.boolean()';
    } else if (schema.type === 'array') {
      return `z.array(${this.mapOpenApiTypeToZod(schema.items)})`;
    } else if (schema.type === 'object') {
      if (schema.properties) {
        return this.generateZodSchema(schema, 'nested').replace('const nested = ', '');
      }
      return 'z.object({}).passthrough()';
    } else if (schema.nullable) {
      return `z.union([${this.mapOpenApiTypeToZod({ ...schema, nullable: false })}, z.null()])`;
    } else if (Array.isArray(schema.type) && schema.type.includes('null')) {
      const nonNullType = schema.type.find((t: string) => t !== 'null');
      return `z.union([${this.mapOpenApiTypeToZod({ ...schema, type: nonNullType })}, z.null()])`;
    }
    
    return 'z.unknown()';
  }

  /**
   * Generate alignment report
   */
  generateReport(): string {
    const endpoints = this.extractEndpoints();
    const report: string[] = [];
    
    report.push('# OpenAPI Alignment Report');
    report.push(`\nTotal OpenAPI Endpoints: ${endpoints.length}`);
    report.push(`\n## Property Manager Endpoints\n`);

    // Group endpoints by resource
    const propertyEndpoints = endpoints.filter(e => e.path.includes('/properties'));
    
    for (const endpoint of propertyEndpoints) {
      report.push(`### ${endpoint.method} ${endpoint.path}`);
      report.push(`Operation ID: ${endpoint.operationId}`);
      
      if (endpoint.responseSchemas['200'] || endpoint.responseSchemas['201']) {
        const responseSchema = endpoint.responseSchemas['200'] || endpoint.responseSchemas['201'];
        report.push(`\n**Response Schema:**`);
        report.push('```typescript');
        report.push(this.generateZodSchema(responseSchema.schema, `${endpoint.operationId}ResponseSchema`));
        report.push('```\n');
      }
    }

    return report.join('\n');
  }
}

// Main execution
async function main() {
  console.log('🔍 Analyzing OpenAPI alignment...\n');

  const analyzer = new OpenAPIAlignmentAnalyzer(
    path.join(__dirname, '../openapi-specs/papi-v1.json')
  );

  // Analyze property-manager.ts
  const propertyManagerPath = path.join(__dirname, '../src/tools/property-manager.ts');
  const mappings = analyzer.analyzeFile(propertyManagerPath);

  console.log('📋 Function Mappings Found:');
  for (const mapping of mappings) {
    console.log(`\n- ${mapping.functionName}`);
    console.log(`  Endpoint: ${mapping.endpoint.method} ${mapping.endpoint.path}`);
    console.log(`  Has Validation: ${mapping.hasValidation ? '✅' : '❌'}`);
    console.log(`  Uses Type Assertion: ${mapping.usesTypeAssertion ? '⚠️  Yes' : '✅ No'}`);
    if (mapping.typeAssertions.length > 0) {
      console.log(`  Type Assertions: ${mapping.typeAssertions.join(', ')}`);
    }
  }

  // Generate report
  const report = analyzer.generateReport();
  const reportPath = path.join(__dirname, '../openapi-alignment-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n📄 Report generated: ${reportPath}`);
  
  // Summary
  const needsValidation = mappings.filter(m => !m.hasValidation);
  const hasAssertions = mappings.filter(m => m.usesTypeAssertion);
  
  console.log('\n📊 Summary:');
  console.log(`- Total functions analyzed: ${mappings.length}`);
  console.log(`- Functions without validation: ${needsValidation.length}`);
  console.log(`- Functions with type assertions: ${hasAssertions.length}`);
  
  if (needsValidation.length > 0) {
    console.log('\n⚠️  Functions needing validation:');
    needsValidation.forEach(m => console.log(`  - ${m.functionName}`));
  }
}

main().catch(console.error);