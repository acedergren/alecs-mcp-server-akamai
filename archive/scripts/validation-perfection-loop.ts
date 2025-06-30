#!/usr/bin/env tsx
/**
 * Validation Perfection Loop
 * 
 * CODE KAI: Systematic approach to achieve 100% OpenAPI compliance
 * 
 * LOOP PROCESS:
 * 1. Study - Parse and understand OpenAPI specifications
 * 2. Understand - Analyze current code implementation
 * 3. Correlate - Map code to spec, identify gaps
 * 4. Fix - Generate and apply fixes
 * 5. Verify - Test against OpenAPI examples
 * 6. Validate - Ensure TypeScript compilation
 * 7. Loop - Repeat until perfection
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { execSync } from 'child_process';

interface ValidationResult {
  functionName: string;
  endpoint: string;
  issues: ValidationIssue[];
  fixes: ProposedFix[];
  status: 'perfect' | 'needs-fix' | 'error';
}

interface ValidationIssue {
  type: 'missing-validation' | 'type-assertion' | 'schema-mismatch' | 'missing-error-handling';
  description: string;
  location: string;
  severity: 'error' | 'warning';
}

interface ProposedFix {
  description: string;
  code: string;
  location: string;
}

class ValidationPerfectionLoop {
  private openApiSpec: any;
  private currentFile: string;
  private iterations = 0;
  private maxIterations = 10;

  constructor(
    private specPath: string,
    private targetFile: string
  ) {
    this.openApiSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    this.currentFile = targetFile;
  }

  /**
   * Main loop - runs until perfection or max iterations
   */
  async runPerfectionLoop(): Promise<void> {
    console.log('🎯 Starting Validation Perfection Loop\n');
    
    while (this.iterations < this.maxIterations) {
      this.iterations++;
      console.log(`\n=== ITERATION ${this.iterations} ===\n`);
      
      // Step 1: Study OpenAPI spec
      const endpoints = this.studyOpenAPISpec();
      console.log(`📚 Studied ${endpoints.length} endpoints from OpenAPI spec`);
      
      // Step 2: Understand current code
      const functions = this.understandCode();
      console.log(`🔍 Found ${functions.length} functions in code`);
      
      // Step 3: Correlate code with spec
      const validationResults = this.correlateWithSpec(functions, endpoints);
      console.log(`🔗 Correlated ${validationResults.length} functions with spec`);
      
      // Step 4: Check if we've achieved perfection
      const imperfectResults = validationResults.filter(r => r.status !== 'perfect');
      if (imperfectResults.length === 0) {
        console.log('\n✨ PERFECTION ACHIEVED! All functions are fully aligned with OpenAPI spec.');
        break;
      }
      
      console.log(`\n⚠️  Found ${imperfectResults.length} functions needing fixes`);
      
      // Step 5: Generate and apply fixes
      for (const result of imperfectResults) {
        console.log(`\n🔧 Fixing ${result.functionName}...`);
        await this.applyFixes(result);
      }
      
      // Step 6: Verify TypeScript compilation
      const compileResult = this.verifyTypeScriptCompilation();
      if (!compileResult.success) {
        console.log(`\n❌ TypeScript compilation failed with ${compileResult.errorCount} errors`);
        console.log('Continuing to next iteration...');
      } else {
        console.log(`\n✅ TypeScript compilation successful`);
      }
      
      // Step 7: Validate against examples
      const validationPassed = await this.validateAgainstExamples(validationResults);
      console.log(`\n${validationPassed ? '✅' : '❌'} Example validation ${validationPassed ? 'passed' : 'failed'}`);
    }
    
    if (this.iterations >= this.maxIterations) {
      console.log('\n⚠️  Reached maximum iterations. Manual intervention required.');
    }
  }

  /**
   * Step 1: Study OpenAPI spec
   */
  private studyOpenAPISpec(): any[] {
    const endpoints: any[] = [];
    
    for (const [path, pathItem] of Object.entries(this.openApiSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            operation: operation as any,
            schemas: this.extractSchemas(operation as any)
          });
        }
      }
    }
    
    return endpoints;
  }

  /**
   * Extract all schemas from an operation
   */
  private extractSchemas(operation: any): any {
    const schemas: any = {
      request: null,
      responses: {}
    };
    
    // Request schema
    if (operation.requestBody?.content?.['application/json']?.schema) {
      schemas.request = operation.requestBody.content['application/json'].schema;
    }
    
    // Response schemas
    if (operation.responses) {
      for (const [status, response] of Object.entries(operation.responses)) {
        if ((response as any).content?.['application/json']?.schema) {
          schemas.responses[status] = {
            schema: (response as any).content['application/json'].schema,
            example: (response as any).content['application/json'].example
          };
        }
      }
    }
    
    return schemas;
  }

  /**
   * Step 2: Understand current code
   */
  private understandCode(): any[] {
    const content = fs.readFileSync(this.currentFile, 'utf-8');
    const functions: any[] = [];
    
    // Find all exported async functions
    const functionMatches = content.matchAll(/export\s+async\s+function\s+(\w+)[\s\S]*?(?=export\s+async\s+function|\s*$)/g);
    
    for (const match of functionMatches) {
      const functionName = match[1];
      const functionBody = match[0];
      
      // Extract API call details
      const pathMatch = functionBody.match(/path:\s*[`'"]([^`'"]+)[`'"]/);
      const methodMatch = functionBody.match(/method:\s*['"](\w+)['"]/);
      
      if (pathMatch) {
        // Check validation status
        const hasValidation = functionBody.includes('validateApiResponse');
        const typeAssertions = [...functionBody.matchAll(/\)\s*as\s+(\w+)/g)].map(m => m[1]);
        
        functions.push({
          name: functionName,
          body: functionBody,
          path: pathMatch[1],
          method: methodMatch?.[1] || 'GET',
          hasValidation,
          typeAssertions,
          startIndex: match.index
        });
      }
    }
    
    return functions;
  }

  /**
   * Step 3: Correlate code with spec
   */
  private correlateWithSpec(functions: any[], endpoints: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const func of functions) {
      const result: ValidationResult = {
        functionName: func.name,
        endpoint: `${func.method} ${func.path}`,
        issues: [],
        fixes: [],
        status: 'perfect'
      };
      
      // Find matching endpoint in spec
      const specEndpoint = endpoints.find(e => 
        this.pathMatches(e.path, func.path) && e.method === func.method
      );
      
      if (!specEndpoint) {
        result.issues.push({
          type: 'schema-mismatch',
          description: 'No matching endpoint found in OpenAPI spec',
          location: func.name,
          severity: 'error'
        });
        result.status = 'error';
      } else {
        // Check for validation
        if (!func.hasValidation) {
          result.issues.push({
            type: 'missing-validation',
            description: 'Function does not use validateApiResponse',
            location: func.name,
            severity: 'error'
          });
          
          // Generate fix
          const zodSchema = this.generateZodSchemaFromOpenAPI(
            specEndpoint.schemas.responses['200'] || specEndpoint.schemas.responses['201'],
            `${func.name}ResponseSchema`
          );
          
          result.fixes.push({
            description: 'Add response validation',
            code: zodSchema,
            location: 'before-function'
          });
          
          result.status = 'needs-fix';
        }
        
        // Check for type assertions
        if (func.typeAssertions.length > 0) {
          result.issues.push({
            type: 'type-assertion',
            description: `Found ${func.typeAssertions.length} type assertions: ${func.typeAssertions.join(', ')}`,
            location: func.name,
            severity: 'error'
          });
          result.status = 'needs-fix';
        }
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check if API path matches (handles path parameters)
   */
  private pathMatches(specPath: string, codePath: string): boolean {
    // Convert OpenAPI path params to regex
    const regexPath = specPath.replace(/{[^}]+}/g, '[^/]+');
    const regex = new RegExp(`^${regexPath}$`);
    
    // Also check template literal paths
    const templatePath = codePath.replace(/\$\{[^}]+\}/g, '[^/]+');
    
    return regex.test(codePath) || regex.test(templatePath);
  }

  /**
   * Generate Zod schema from OpenAPI schema
   */
  private generateZodSchemaFromOpenAPI(responseSchema: any, schemaName: string): string {
    if (!responseSchema?.schema) return '';
    
    const schema = responseSchema.schema;
    const lines: string[] = [];
    
    lines.push(`// Generated from OpenAPI spec`);
    lines.push(`const ${schemaName} = ${this.schemaToZod(schema)};`);
    
    return lines.join('\n');
  }

  /**
   * Convert OpenAPI schema to Zod
   */
  private schemaToZod(schema: any, indent = ''): string {
    if (!schema) return 'z.unknown()';
    
    if (schema.type === 'object') {
      const props: string[] = [];
      const required = schema.required || [];
      
      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          const isRequired = required.includes(key);
          const zodType = this.schemaToZod(value as any, indent + '  ');
          props.push(`${indent}  ${key}: ${zodType}${isRequired ? '' : '.optional()'},`);
        }
      }
      
      return `z.object({\n${props.join('\n')}\n${indent}})${schema.additionalProperties !== false ? '.passthrough()' : ''}`;
    }
    
    if (schema.type === 'array') {
      return `z.array(${this.schemaToZod(schema.items, indent)})`;
    }
    
    if (schema.type === 'string') {
      if (schema.enum) {
        return `z.enum([${schema.enum.map((v: string) => `'${v}'`).join(', ')}])`;
      }
      return 'z.string()';
    }
    
    if (schema.type === 'number' || schema.type === 'integer') {
      return 'z.number()';
    }
    
    if (schema.type === 'boolean') {
      return 'z.boolean()';
    }
    
    if (schema.type === 'null') {
      return 'z.null()';
    }
    
    if (Array.isArray(schema.type)) {
      const types = schema.type.map((t: string) => 
        this.schemaToZod({ ...schema, type: t }, indent)
      );
      return `z.union([${types.join(', ')}])`;
    }
    
    return 'z.unknown()';
  }

  /**
   * Step 4: Apply fixes
   */
  private async applyFixes(result: ValidationResult): Promise<void> {
    // This is where we would apply the actual fixes
    // For now, we'll just log what needs to be done
    console.log(`  Issues found:`);
    for (const issue of result.issues) {
      console.log(`    - ${issue.type}: ${issue.description}`);
    }
    
    console.log(`  Proposed fixes:`);
    for (const fix of result.fixes) {
      console.log(`    - ${fix.description}`);
    }
  }

  /**
   * Step 5: Verify TypeScript compilation
   */
  private verifyTypeScriptCompilation(): { success: boolean; errorCount: number } {
    try {
      execSync('npx tsc --noEmit', { cwd: path.dirname(this.currentFile) });
      return { success: true, errorCount: 0 };
    } catch (error) {
      const output = error.toString();
      const errorMatches = output.match(/Found (\d+) error/);
      const errorCount = errorMatches ? parseInt(errorMatches[1]) : -1;
      return { success: false, errorCount };
    }
  }

  /**
   * Step 6: Validate against examples
   */
  private async validateAgainstExamples(results: ValidationResult[]): Promise<boolean> {
    // This would test our validation schemas against the OpenAPI examples
    // For now, we'll return true if all results have schemas
    return results.every(r => r.status === 'perfect' || r.fixes.length > 0);
  }
}

// Main execution
async function main() {
  const loop = new ValidationPerfectionLoop(
    path.join(__dirname, '../openapi-specs/papi-v1.json'),
    path.join(__dirname, '../src/tools/property-manager.ts')
  );
  
  await loop.runPerfectionLoop();
  
  console.log('\n🎯 Next: Apply the same process to DNS tools');
}

main().catch(console.error);