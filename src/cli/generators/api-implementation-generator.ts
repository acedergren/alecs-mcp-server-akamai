/**
 * API Implementation Generator
 * 
 * Generates complete tool implementations from OpenAPI specifications
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automated tool generation from API specs
 * Approach: Parse OpenAPI to generate type-safe, validated implementations
 * Implementation: Complete tool generation with error handling and validation
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createLogger } from '../../utils/pino-logger';
import { OpenAPIParser, ParsedEndpoint } from '../utils/openapi-parser';
import { ZodSchemaGenerator } from '../utils/zod-schema-generator';
import { toPascalCase, toSnakeCase } from '../utils/naming';

const logger = createLogger('api-implementation-generator');

/**
 * Generation options
 */
export interface GenerationOptions {
  domainName: string;
  apiSpecPath: string;
  outputDir: string;
  overwrite?: boolean;
  includeTests?: boolean;
  customerId?: string;
}

/**
 * Generated files
 */
export interface GeneratedFiles {
  toolsFile: string;
  schemasFile: string;
  indexFile: string;
  testFile?: string;
  readmeFile: string;
}

/**
 * API Implementation Generator
 */
export class APIImplementationGenerator {
  private parser = new OpenAPIParser();
  private schemaGenerator = new ZodSchemaGenerator();
  
  /**
   * Generate complete tool implementation from OpenAPI spec
   */
  async generateImplementation(options: GenerationOptions): Promise<GeneratedFiles> {
    // Load and parse OpenAPI spec
    await this.parser.loadSpec(options.apiSpecPath);
    const apiInfo = this.parser.getApiInfo();
    const basePath = this.parser.getBasePath();
    const endpoints = this.parser.parseEndpoints();
    const schemas = this.parser.getSchemas();
    
    // Prepare schema generator
    const schemaRefs = new Map<string, any>();
    for (const [name, schema] of Object.entries(schemas)) {
      schemaRefs.set(`#/components/schemas/${name}`, schema);
    }
    this.schemaGenerator.setSchemaRefs(schemaRefs);
    
    // Create output directory
    await fs.mkdir(options.outputDir, { recursive: true });
    
    // Generate files
    const toolsFile = await this.generateToolsFile(options, endpoints, apiInfo, basePath);
    const schemasFile = await this.generateSchemasFile(options, schemas);
    const indexFile = await this.generateIndexFile(options);
    const readmeFile = await this.generateReadmeFile(options, endpoints, apiInfo);
    
    let testFile: string | undefined;
    if (options.includeTests) {
      testFile = await this.generateTestFile(options, endpoints);
    }
    
    return {
      toolsFile,
      schemasFile,
      indexFile,
      testFile,
      readmeFile
    };
  }
  
  /**
   * Generate tools implementation file
   */
  private async generateToolsFile(
    options: GenerationOptions,
    endpoints: ParsedEndpoint[],
    apiInfo: any,
    basePath: string
  ): Promise<string> {
    const domainNamePascal = toPascalCase(options.domainName);
    const domainNameSnake = toSnakeCase(options.domainName);
    
    // Group endpoints by tag or create a single group
    // const endpointGroups = this.groupEndpoints(endpoints); // TODO: Use for grouping
    
    // Generate tool methods
    const toolMethods = this.generateToolMethods(endpoints, options.domainName);
    
    // Generate MCP tool definitions
    const mcpDefinitions = this.generateMCPDefinitions(endpoints, domainNameSnake);
    
    const content = `/**
 * ${domainNamePascal} Domain Tools
 * 
 * ${apiInfo.description || `${domainNamePascal} operations`}
 * 
 * API Version: ${apiInfo.version}
 * Generated from: ${options.apiSpecPath}
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Type-safe API integration with runtime validation
 * Approach: OpenAPI-driven code generation with Zod schemas
 * Implementation: Production-ready tools with comprehensive error handling
 * 
 * @apiVersion ${apiInfo.version}
 * @lastUpdated ${new Date().toISOString()}
 * @generated true
 */

import { BaseTool } from '../base-tool';
import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiClient } from '../../akamai-client';
import { createLogger } from '../../utils/pino-logger';
import { ToolErrorHandler } from '../../utils/tool-error-handler';
import { z } from 'zod';
import {
  ${this.getSchemaImports(endpoints)}
} from './schemas';

const logger = createLogger('${options.domainName}-tools');

/**
 * ${domainNamePascal} Tools Implementation
 * 
 * Provides comprehensive ${options.domainName} operations
 */
export class ${domainNamePascal}Tools extends BaseTool {
  private client: AkamaiClient;
  private errorHandler: ToolErrorHandler;
  private basePath = '${basePath}';

  constructor(customer: string = '${options.customerId || 'default'}') {
    super();
    this.client = new AkamaiClient(customer);
    this.errorHandler = new ToolErrorHandler({
      tool: '${options.domainName}',
      operation: 'general',
      customer
    });
  }

${toolMethods}
}

/**
 * MCP Tool Definitions
 */
export const ${options.domainName}ToolDefinitions = {
${mcpDefinitions}
};

/**
 * Create ${options.domainName} tools instance
 */
export const ${options.domainName}Tools = new ${domainNamePascal}Tools();`;

    const filePath = join(options.outputDir, `${options.domainName}-tools.ts`);
    await fs.writeFile(filePath, content, 'utf8');
    logger.info({ filePath }, 'Generated tools file');
    
    return filePath;
  }
  
  /**
   * Generate tool methods from endpoints
   */
  private generateToolMethods(endpoints: ParsedEndpoint[], domainName: string): string {
    const methods: string[] = [];
    
    for (const endpoint of endpoints) {
      const method = this.generateToolMethod(endpoint, domainName);
      methods.push(method);
    }
    
    return methods.join('\n\n');
  }
  
  /**
   * Generate single tool method
   */
  private generateToolMethod(endpoint: ParsedEndpoint, _domainName: string): string {
    const methodName = endpoint.operationId;
    const hasPathParams = endpoint.parameters.some(p => p.in === 'path');
    const hasQueryParams = endpoint.parameters.some(p => p.in === 'query');
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
    
    return `  /**
   * ${endpoint.summary || endpoint.operationId}
   * ${endpoint.description ? '\n   * ' + endpoint.description + '\n   * ' : ''}
   * @endpoint ${endpoint.method} ${endpoint.path}
   */
  async ${methodName}(args: ${paramInterface}): Promise<MCPToolResponse> {
    try {
      this.errorHandler.operation = '${methodName}';
      logger.info({ args }, 'Executing ${methodName}');
      
      const response = await this.client.request({
        method: '${endpoint.method}',
        path: this.basePath + ${pathWithParams}${
          hasQueryParams ? `,\n        params: this.buildQueryParams(args, [${endpoint.parameters.filter(p => p.in === 'query').map(p => `'${p.name}'`).join(', ')}])` : ''
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
   * Generate MCP tool definitions
   */
  private generateMCPDefinitions(endpoints: ParsedEndpoint[], domainPrefix: string): string {
    const definitions: string[] = [];
    
    for (const endpoint of endpoints) {
      const toolName = `${domainPrefix}_${toSnakeCase(endpoint.operationId)}`;
      const requiredParams = endpoint.parameters
        .filter(p => p.required)
        .map(p => `'${p.name}'`);
      
      const paramProps: string[] = [];
      for (const param of endpoint.parameters) {
        paramProps.push(`        ${param.name}: {
          type: '${this.getJSONSchemaType(param.schema)}',
          description: '${param.description || param.name}'${param.required ? '' : ',\n          required: false'}
        }`);
      }
      
      if (endpoint.requestBody?.schemaName) {
        paramProps.push(`        body: {
          type: 'object',
          description: 'Request body'${endpoint.requestBody.required ? '' : ',\n          required: false'}
        }`);
      }
      
      const definition = `  '${toolName}': {
    description: '${endpoint.summary || endpoint.operationId}',
    inputSchema: {
      type: 'object',
      properties: {
${paramProps.join(',\n')}
      }${requiredParams.length > 0 ? `,\n      required: [${requiredParams.join(', ')}]` : ''}
    },
    handler: async (args: any) => ${domainPrefix}Tools.${endpoint.operationId}(args)
  }`;
      
      definitions.push(definition);
    }
    
    return definitions.join(',\n\n');
  }
  
  /**
   * Generate schemas file
   */
  private async generateSchemasFile(
    options: GenerationOptions,
    schemas: Record<string, any>
  ): Promise<string> {
    let content = `/**
 * ${toPascalCase(options.domainName)} Domain Schemas
 * 
 * Auto-generated from OpenAPI specification
 * DO NOT EDIT MANUALLY
 * 
 * Generated on: ${new Date().toISOString()}
 */

import { z } from 'zod';

`;
    
    // Generate all schemas
    for (const [name, schema] of Object.entries(schemas)) {
      this.schemaGenerator.generateZodSchema(schema, name);
    }
    
    // Add all generated schemas
    content += this.schemaGenerator.getAllGeneratedSchemas();
    
    // Add type exports
    content += '\n\n// Type exports\n';
    for (const name of Object.keys(schemas)) {
      content += this.schemaGenerator.generateTypeFromSchema(name) + '\n';
    }
    
    const filePath = join(options.outputDir, 'schemas.ts');
    await fs.writeFile(filePath, content, 'utf8');
    logger.info({ filePath }, 'Generated schemas file');
    
    return filePath;
  }
  
  /**
   * Generate index file
   */
  private async generateIndexFile(options: GenerationOptions): Promise<string> {
    const content = `/**
 * ${toPascalCase(options.domainName)} Domain
 * 
 * Auto-generated domain export
 */

export * from './${options.domainName}-tools';
export * from './schemas';
`;
    
    const filePath = join(options.outputDir, 'index.ts');
    await fs.writeFile(filePath, content, 'utf8');
    logger.info({ filePath }, 'Generated index file');
    
    return filePath;
  }
  
  /**
   * Generate README file
   */
  private async generateReadmeFile(
    options: GenerationOptions,
    endpoints: ParsedEndpoint[],
    apiInfo: any
  ): Promise<string> {
    const domainNamePascal = toPascalCase(options.domainName);
    
    const endpointDocs = endpoints.map(e => 
      `- **${e.operationId}** - ${e.summary || 'No description'}\n  - \`${e.method} ${e.path}\``
    ).join('\n');
    
    const content = `# ${domainNamePascal} Domain

${apiInfo.description || `${domainNamePascal} tools for Akamai API operations`}

## Overview

This domain provides tools for interacting with the ${apiInfo.title} (v${apiInfo.version}).

Generated from: \`${options.apiSpecPath}\`

## Available Tools

${endpointDocs}

## Usage

\`\`\`typescript
import { ${options.domainName}Tools } from './${options.domainName}-tools';

// List resources
const result = await ${options.domainName}Tools.listResources({ limit: 10 });
\`\`\`

## Schema Validation

All API responses are validated using Zod schemas generated from the OpenAPI specification.
This ensures type safety and runtime validation of API responses.

## Error Handling

All tools use the standard ToolErrorHandler for consistent error reporting.
Errors are properly typed and include context for debugging.
`;
    
    const filePath = join(options.outputDir, 'README.md');
    await fs.writeFile(filePath, content, 'utf8');
    logger.info({ filePath }, 'Generated README file');
    
    return filePath;
  }
  
  /**
   * Generate test file
   */
  private async generateTestFile(
    options: GenerationOptions,
    endpoints: ParsedEndpoint[]
  ): Promise<string> {
    const domainNamePascal = toPascalCase(options.domainName);
    
    const testCases = endpoints.slice(0, 3).map(e => `
  describe('${e.operationId}', () => {
    it('should handle successful response', async () => {
      const mockResponse = { data: { /* mock data */ } };
      (mockClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tools.${e.operationId}({
        // Add required parameters
      });
      
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
    });
    
    it('should handle errors', async () => {
      const mockError = new Error('API Error');
      (mockClient.request as jest.Mock).mockRejectedValueOnce(mockError);
      
      const result = await tools.${e.operationId}({
        // Add required parameters
      });
      
      expect(result.isError).toBe(true);
    });
  });`).join('\n');
    
    const content = `/**
 * ${domainNamePascal} Tools Tests
 * 
 * Auto-generated test suite
 */

import { ${domainNamePascal}Tools } from '../${options.domainName}-tools';
import { AkamaiClient } from '../../../akamai-client';

// Mock dependencies
jest.mock('../../../akamai-client');
jest.mock('../../../utils/pino-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('${domainNamePascal}Tools', () => {
  let tools: ${domainNamePascal}Tools;
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    tools = new ${domainNamePascal}Tools('test');
    mockClient = (AkamaiClient as jest.MockedClass<typeof AkamaiClient>).mock.instances[0] as any;
  });
${testCases}
});`;
    
    const testDir = join(dirname(options.outputDir), '__tests__');
    await fs.mkdir(testDir, { recursive: true });
    
    const filePath = join(testDir, `${options.domainName}-tools.test.ts`);
    await fs.writeFile(filePath, content, 'utf8');
    logger.info({ filePath }, 'Generated test file');
    
    return filePath;
  }
  
  /**
   * Group endpoints by tag
   * TODO: Use for better organization
   */
  /*
  private groupEndpoints(endpoints: ParsedEndpoint[]): Map<string, ParsedEndpoint[]> {
    const groups = new Map<string, ParsedEndpoint[]>();
    
    for (const endpoint of endpoints) {
      const tag = endpoint.tags[0] || 'General';
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag)!.push(endpoint);
    }
    
    return groups;
  }
  */
  
  /**
   * Get schema imports needed
   */
  private getSchemaImports(endpoints: ParsedEndpoint[]): string {
    const schemas = new Set<string>();
    
    for (const endpoint of endpoints) {
      // Request body schemas
      if (endpoint.requestBody?.schemaName) {
        schemas.add(endpoint.requestBody.schemaName);
        schemas.add(endpoint.requestBody.schemaName + 'Schema');
      }
      
      // Response schemas
      for (const response of endpoint.responses) {
        if (response.schemaName) {
          schemas.add(response.schemaName);
          schemas.add(response.schemaName + 'Schema');
        }
      }
    }
    
    return Array.from(schemas).join(',\n  ');
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
  
  // Build query params helper method would go in the generated class
}