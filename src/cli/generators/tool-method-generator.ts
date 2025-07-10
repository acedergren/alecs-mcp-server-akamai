/**
 * Tool Method Generator
 * 
 * Generates individual tool methods to add to existing implementations
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Incremental tool enhancement
 * Approach: Generate individual methods from OpenAPI endpoints
 * Implementation: Smart insertion into existing tool classes
 */

import { promises as fs } from 'fs';
import { createLogger } from '../../utils/pino-logger';
import { OpenAPIParser, ParsedEndpoint } from '../utils/openapi-parser';
import { ZodSchemaGenerator } from '../utils/zod-schema-generator';
import { toSnakeCase } from '../utils/naming';

const logger = createLogger('tool-method-generator');

/**
 * Method generation options
 */
export interface MethodGenerationOptions {
  toolPath: string;
  apiSpecPath: string;
  operationId: string;
  insertPosition?: 'before-last-method' | 'after-constructor' | 'end-of-class';
  updateSchemas?: boolean;
  dryRun?: boolean;
}

/**
 * Generated method result
 */
export interface GeneratedMethod {
  methodCode: string;
  schemaCode?: string;
  mcpDefinition: string;
  imports: string[];
}

/**
 * Tool Method Generator
 */
export class ToolMethodGenerator {
  private parser = new OpenAPIParser();
  private schemaGenerator = new ZodSchemaGenerator();
  
  /**
   * Generate a single tool method from OpenAPI endpoint
   */
  async generateMethod(options: MethodGenerationOptions): Promise<GeneratedMethod> {
    // Load API spec
    await this.parser.loadSpec(options.apiSpecPath);
    const endpoints = this.parser.parseEndpoints();
    const schemas = this.parser.getSchemas();
    
    // Find the specific endpoint
    const endpoint = endpoints.find(e => e.operationId === options.operationId);
    if (!endpoint) {
      throw new Error(`Operation '${options.operationId}' not found in API spec`);
    }
    
    // Prepare schema generator
    const schemaRefs = new Map<string, any>();
    for (const [name, schema] of Object.entries(schemas)) {
      schemaRefs.set(`#/components/schemas/${name}`, schema);
    }
    this.schemaGenerator.setSchemaRefs(schemaRefs);
    
    // Generate method code
    const methodCode = this.generateMethodCode(endpoint);
    
    // Generate schemas if needed
    let schemaCode: string | undefined;
    const neededSchemas = this.getNeededSchemas(endpoint);
    if (neededSchemas.length > 0 && options.updateSchemas) {
      schemaCode = this.generateSchemaCode(neededSchemas, schemas);
    }
    
    // Generate MCP definition
    const domainName = this.extractDomainName(options.toolPath);
    const mcpDefinition = this.generateMCPDefinition(endpoint, domainName);
    
    // Determine imports needed
    const imports = this.getRequiredImports(endpoint);
    
    // Insert into existing file if not dry run
    if (!options.dryRun) {
      await this.insertMethodIntoFile(options.toolPath, methodCode, options.insertPosition);
      
      if (schemaCode && options.updateSchemas) {
        await this.updateSchemasFile(options.toolPath, schemaCode, neededSchemas);
      }
    }
    
    return {
      methodCode,
      schemaCode,
      mcpDefinition,
      imports
    };
  }
  
  /**
   * Generate method code
   */
  private generateMethodCode(endpoint: ParsedEndpoint): string {
    const methodName = endpoint.operationId;
    const hasPathParams = endpoint.parameters.some(p => p.in === 'path');
    const hasBody = !!endpoint.requestBody;
    
    // Build parameter interface
    const params: string[] = [];
    for (const param of endpoint.parameters) {
      const tsType = this.getTypeScriptType(param.schema);
      params.push(`    ${param.name}${param.required ? '' : '?'}: ${tsType};`);
    }
    if (hasBody && endpoint.requestBody?.schemaName) {
      params.push(`    body${endpoint.requestBody.required ? '' : '?'}: ${endpoint.requestBody.schemaName};`);
    }
    
    const paramInterface = params.length > 0 
      ? `{\n${params.join('\n')}\n  }`
      : 'Record<string, never>';
    
    // Build path with parameters
    const pathWithParams = hasPathParams
      ? '`' + endpoint.path.replace(/\{([^}]+)\}/g, '${args.$1}') + '`'
      : `'${endpoint.path}'`;
    
    // Get response schema
    const successResponse = endpoint.responses.find(r => r.status === '200' || r.status === '201');
    const responseValidation = successResponse?.schemaName
      ? `\n      // Validate response\n      const validatedData = ${successResponse.schemaName}Schema.parse(response.data);`
      : '';
    
    // Build query params
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    const queryParamBuilder = queryParams.length > 0
      ? `\n      // Build query parameters\n      const params: Record<string, any> = {};\n${queryParams.map(p => 
          `      if (args.${p.name} !== undefined) params.${p.name} = args.${p.name};`
        ).join('\n')}`
      : '';
    
    return `
  /**
   * ${endpoint.summary || endpoint.operationId}
   * ${endpoint.description ? '\n   * ' + endpoint.description + '\n   * ' : ''}
   * @endpoint ${endpoint.method} ${endpoint.path}
   * @since ${new Date().toISOString()}
   */
  async ${methodName}(args: ${paramInterface}): Promise<MCPToolResponse> {
    try {
      this.errorHandler.operation = '${methodName}';
      logger.info({ args }, 'Executing ${methodName}');
      ${queryParamBuilder}
      const response = await this.client.request({
        method: '${endpoint.method}',
        path: ${pathWithParams}${
          queryParams.length > 0 ? ',\n        params' : ''
        }${
          hasBody ? ',\n        data: args.body' : ''
        }
      });
${responseValidation}
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(${responseValidation ? 'validatedData' : 'response.data'}, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to execute ${methodName}');
      return this.errorHandler.handleError(error);
    }
  }`;
  }
  
  /**
   * Generate MCP definition
   */
  private generateMCPDefinition(endpoint: ParsedEndpoint, domainName: string): string {
    const toolName = `${domainName}_${toSnakeCase(endpoint.operationId)}`;
    const requiredParams = endpoint.parameters
      .filter(p => p.required)
      .map(p => `'${p.name}'`);
    
    const paramProps: string[] = [];
    for (const param of endpoint.parameters) {
      paramProps.push(`      ${param.name}: {
        type: '${this.getJSONSchemaType(param.schema)}',
        description: '${param.description || param.name}'${param.required ? '' : ',\n        required: false'}
      }`);
    }
    
    if (endpoint.requestBody?.schemaName) {
      paramProps.push(`      body: {
        type: 'object',
        description: 'Request body'${endpoint.requestBody.required ? '' : ',\n        required: false'}
      }`);
    }
    
    return `
// Add to MCP tool definitions:
'${toolName}': {
  description: '${endpoint.summary || endpoint.operationId}',
  inputSchema: {
    type: 'object',
    properties: {
${paramProps.join(',\n')}
    }${requiredParams.length > 0 ? `,\n    required: [${requiredParams.join(', ')}]` : ''}
  },
  handler: async (args: any) => ${domainName}Tools.${endpoint.operationId}(args)
}`;
  }
  
  /**
   * Insert method into existing file
   */
  private async insertMethodIntoFile(
    filePath: string,
    methodCode: string,
    position?: string
  ): Promise<void> {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Find insertion point
    let insertIndex: number;
    
    switch (position) {
      case 'after-constructor':
        const constructorEnd = content.indexOf('}\n', content.indexOf('constructor'));
        insertIndex = constructorEnd + 2;
        break;
        
      case 'before-last-method':
        // Find the last method before the closing brace
        const classEnd = content.lastIndexOf('\n}');
        const lastMethod = content.lastIndexOf('\n  async ', classEnd);
        insertIndex = lastMethod > 0 ? lastMethod : classEnd;
        break;
        
      case 'end-of-class':
      default:
        // Find the class closing brace
        const classClosing = content.lastIndexOf('\n}');
        insertIndex = classClosing;
        break;
    }
    
    // Insert the method
    content = 
      content.slice(0, insertIndex) +
      methodCode + '\n' +
      content.slice(insertIndex);
    
    await fs.writeFile(filePath, content, 'utf8');
    logger.info({ filePath, position }, 'Inserted method into file');
  }
  
  /**
   * Update schemas file with new schemas
   */
  private async updateSchemasFile(
    toolPath: string,
    schemaCode: string,
    schemaNames: string[]
  ): Promise<void> {
    const schemasPath = toolPath.replace(/-tools\.ts$/, '-schemas.ts');
    
    try {
      let content = await fs.readFile(schemasPath, 'utf8');
      
      // Check if schemas already exist
      const existingSchemas = schemaNames.filter(name => 
        content.includes(`export const ${name}Schema`)
      );
      
      if (existingSchemas.length === schemaNames.length) {
        logger.info('All schemas already exist, skipping update');
        return;
      }
      
      // Find insertion point (before type exports)
      const typeExportsIndex = content.indexOf('// Type exports');
      const insertIndex = typeExportsIndex > 0 ? typeExportsIndex - 1 : content.length;
      
      // Insert new schemas
      content = 
        content.slice(0, insertIndex) +
        '\n' + schemaCode + '\n' +
        content.slice(insertIndex);
      
      await fs.writeFile(schemasPath, content, 'utf8');
      logger.info({ schemasPath, schemas: schemaNames }, 'Updated schemas file');
      
    } catch (error) {
      logger.warn({ error }, 'Could not update schemas file - it may not exist');
    }
  }
  
  /**
   * Generate schema code
   */
  private generateSchemaCode(
    schemaNames: string[],
    allSchemas: Record<string, any>
  ): string {
    const schemas: string[] = [];
    
    for (const name of schemaNames) {
      const schema = allSchemas[name];
      if (schema) {
        const zodSchema = this.schemaGenerator.generateZodSchema(schema, name);
        schemas.push(`export const ${name}Schema = ${zodSchema};`);
        schemas.push(this.schemaGenerator.generateTypeFromSchema(name));
      }
    }
    
    return schemas.join('\n\n');
  }
  
  /**
   * Get schemas needed for endpoint
   */
  private getNeededSchemas(endpoint: ParsedEndpoint): string[] {
    const schemas: string[] = [];
    
    if (endpoint.requestBody?.schemaName) {
      schemas.push(endpoint.requestBody.schemaName);
    }
    
    for (const response of endpoint.responses) {
      if (response.schemaName) {
        schemas.push(response.schemaName);
      }
    }
    
    return [...new Set(schemas)];
  }
  
  /**
   * Get required imports
   */
  private getRequiredImports(endpoint: ParsedEndpoint): string[] {
    const imports: string[] = [];
    
    const schemas = this.getNeededSchemas(endpoint);
    if (schemas.length > 0) {
      imports.push(`import { ${schemas.join(', ')}, ${schemas.map(s => s + 'Schema').join(', ')} } from './schemas';`);
    }
    
    return imports;
  }
  
  /**
   * Extract domain name from file path
   */
  private extractDomainName(filePath: string): string {
    const match = filePath.match(/\/([^/]+)-tools\.ts$/);
    return (match && match[1]) ? match[1] : 'unknown';
  }
  
  /**
   * Get TypeScript type from schema
   */
  private getTypeScriptType(schema?: any): string {
    if (!schema) return 'unknown';
    
    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum.map((v: string) => `'${v}'`).join(' | ') : 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${this.getTypeScriptType(schema.items)}[]`;
      case 'object':
        return 'Record<string, unknown>';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Get JSON Schema type
   */
  private getJSONSchemaType(schema?: any): string {
    return schema?.type || 'string';
  }
  
  /**
   * Batch generate multiple methods
   */
  async generateMultipleMethods(
    toolPath: string,
    apiSpecPath: string,
    operationIds: string[],
    options?: Partial<MethodGenerationOptions>
  ): Promise<GeneratedMethod[]> {
    const results: GeneratedMethod[] = [];
    
    for (const operationId of operationIds) {
      const result = await this.generateMethod({
        toolPath,
        apiSpecPath,
        operationId,
        ...(options || {})
      });
      results.push(result);
    }
    
    return results;
  }
}