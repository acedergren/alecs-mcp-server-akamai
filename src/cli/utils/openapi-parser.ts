/**
 * OpenAPI Parser Utility
 * 
 * Parses OpenAPI specifications and extracts useful information
 * for code generation
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automated code generation from API specs
 * Approach: Parse OpenAPI to extract schemas, endpoints, and types
 * Implementation: Type-safe parsing with comprehensive extraction
 */

import { promises as fs } from 'fs';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('openapi-parser');

/**
 * OpenAPI 3.0 types
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    parameters?: Record<string, ParameterObject>;
    responses?: Record<string, ResponseObject>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  parameters?: ParameterObject[];
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  requestBody?: {
    required?: boolean;
    content?: {
      'application/json'?: {
        schema: SchemaObject;
      };
    };
  };
  responses: Record<string, ResponseObject>;
  tags?: string[];
}

export interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: SchemaObject;
}

export interface ResponseObject {
  description: string;
  content?: {
    'application/json'?: {
      schema: SchemaObject;
    };
  };
}

export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: any[];
  description?: string;
  example?: any;
  default?: any;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  $ref?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
}

/**
 * Parsed endpoint information
 */
export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: ParsedResponse[];
  tags: string[];
}

export interface ParsedParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description?: string;
  schema?: SchemaObject;
}

export interface ParsedRequestBody {
  required: boolean;
  schema?: SchemaObject;
  schemaName?: string;
}

export interface ParsedResponse {
  status: string;
  description: string;
  schema?: SchemaObject;
  schemaName?: string;
}

/**
 * OpenAPI Parser
 */
export class OpenAPIParser {
  private spec: OpenAPISpec | null = null;
  private schemaRefs = new Map<string, SchemaObject>();

  /**
   * Load and parse OpenAPI specification
   */
  async loadSpec(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.spec = JSON.parse(content) as OpenAPISpec;
      
      // Build schema reference map
      if (this.spec.components?.schemas) {
        Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
          this.schemaRefs.set(`#/components/schemas/${name}`, schema);
        });
      }
      
      logger.info({ 
        title: this.spec.info.title,
        version: this.spec.info.version,
        pathCount: Object.keys(this.spec.paths).length
      }, 'Loaded OpenAPI specification');
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to load OpenAPI spec');
      throw new Error(`Failed to load OpenAPI spec: ${error}`);
    }
  }

  /**
   * Get API information
   */
  getApiInfo(): { title: string; version: string; description?: string } {
    if (!this.spec) {
      throw new Error('No OpenAPI spec loaded');
    }
    return this.spec.info;
  }

  /**
   * Get base path from servers
   */
  getBasePath(): string {
    if (!this.spec || !this.spec.servers || this.spec.servers.length === 0) {
      return '/';
    }
    
    const firstServer = this.spec.servers[0];
    if (!firstServer) return '/';
    const serverUrl = firstServer.url;
    // Extract path from URL (e.g., "https://example.com/api/v1" -> "/api/v1")
    const match = serverUrl.match(/https?:\/\/[^\/]+(\/.*)?$/);
    return (match && match[1]) || '/';
  }

  /**
   * Parse all endpoints
   */
  parseEndpoints(): ParsedEndpoint[] {
    if (!this.spec) {
      throw new Error('No OpenAPI spec loaded');
    }

    const endpoints: ParsedEndpoint[] = [];

    Object.entries(this.spec.paths).forEach(([path, pathItem]) => {
      const pathParameters = pathItem.parameters || [];

      Object.entries(pathItem).forEach(([method, operation]) => {
        if (method === 'parameters' || !operation) return;

        const op = operation as Operation;
        const operationId = op.operationId || this.generateOperationId(method, path);

        const endpoint: ParsedEndpoint = {
          path,
          method: method.toUpperCase(),
          operationId: this.toCamelCase(operationId),
          summary: op.summary,
          description: op.description,
          parameters: this.parseParameters([...pathParameters, ...(op.parameters || [])]),
          requestBody: this.parseRequestBody(op.requestBody),
          responses: this.parseResponses(op.responses),
          tags: op.tags || []
        };

        endpoints.push(endpoint);
      });
    });

    return endpoints;
  }

  /**
   * Get all schema definitions
   */
  getSchemas(): Record<string, SchemaObject> {
    if (!this.spec) {
      throw new Error('No OpenAPI spec loaded');
    }
    return this.spec.components?.schemas || {};
  }

  /**
   * Parse parameters
   */
  private parseParameters(parameters: ParameterObject[]): ParsedParameter[] {
    return parameters
      .filter(param => param.in !== 'cookie') // Filter out cookie params not supported in ParsedParameter
      .map(param => ({
        name: param.name,
        in: param.in as 'path' | 'query' | 'header',
        required: param.required || false,
        type: this.getSchemaType(param.schema),
        description: param.description,
        schema: param.schema
      }));
  }

  /**
   * Parse request body
   */
  private parseRequestBody(requestBody?: Operation['requestBody']): ParsedRequestBody | undefined {
    if (!requestBody) return undefined;

    const jsonContent = requestBody.content?.['application/json'];
    if (!jsonContent) return undefined;

    const schema = this.resolveSchema(jsonContent.schema);
    const schemaName = this.getSchemaName(jsonContent.schema);

    return {
      required: requestBody.required || false,
      schema,
      schemaName
    };
  }

  /**
   * Parse responses
   */
  private parseResponses(responses: Record<string, ResponseObject>): ParsedResponse[] {
    return Object.entries(responses).map(([status, response]) => {
      const jsonContent = response.content?.['application/json'];
      const schema = jsonContent ? this.resolveSchema(jsonContent.schema) : undefined;
      const schemaName = jsonContent ? this.getSchemaName(jsonContent.schema) : undefined;

      return {
        status,
        description: response.description,
        schema,
        schemaName
      };
    });
  }

  /**
   * Resolve schema references
   */
  private resolveSchema(schema?: SchemaObject): SchemaObject | undefined {
    if (!schema) return undefined;
    
    if (schema.$ref) {
      const resolved = this.schemaRefs.get(schema.$ref);
      return resolved || schema;
    }
    
    return schema;
  }

  /**
   * Get schema name from reference
   */
  private getSchemaName(schema?: SchemaObject): string | undefined {
    if (!schema?.$ref) return undefined;
    
    const match = schema.$ref.match(/#\/components\/schemas\/(.+)$/);
    return match?.[1];
  }

  /**
   * Get TypeScript type from schema
   */
  private getSchemaType(schema?: SchemaObject): string {
    if (!schema) return 'unknown';
    
    if (schema.$ref) {
      const name = this.getSchemaName(schema);
      return name || 'unknown';
    }
    
    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum.map(v => `'${v}'`).join(' | ') : 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${this.getSchemaType(schema.items)}[]`;
      case 'object':
        return 'Record<string, unknown>';
      default:
        return 'unknown';
    }
  }

  /**
   * Generate operation ID from method and path
   */
  private generateOperationId(method: string, path: string): string {
    // Convert path to operation ID (e.g., "GET /properties/{id}" -> "getPropertiesById")
    const pathParts = path.split('/').filter(p => p);
    const pathName = pathParts
      .map(part => {
        if (part.startsWith('{') && part.endsWith('}')) {
          return 'By' + this.toPascalCase(part.slice(1, -1));
        }
        return this.toPascalCase(part);
      })
      .join('');
    
    return method.toLowerCase() + pathName;
  }

  /**
   * Convert to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toLowerCase());
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toUpperCase());
  }
}