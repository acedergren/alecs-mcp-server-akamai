/**
 * Tool Update Detector
 * 
 * Detects changes between API specifications and existing tool implementations
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automated tool maintenance and evolution
 * Approach: Compare API specs with existing implementations to detect changes
 * Implementation: Smart diff detection with update recommendations
 */

import { promises as fs } from 'fs';
import { OpenAPIParser, ParsedEndpoint } from './openapi-parser';

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  toolName: string;
  changes: ToolChange[];
  recommendations: UpdateRecommendation[];
  breakingChanges: boolean;
}

export interface ToolChange {
  type: 'added' | 'removed' | 'modified' | 'deprecated';
  category: 'endpoint' | 'parameter' | 'response' | 'schema';
  path: string;
  details: Record<string, unknown>;
}

export interface UpdateRecommendation {
  severity: 'low' | 'medium' | 'high';
  message: string;
  action: string;
  codeSnippet?: string;
}

/**
 * Existing tool metadata
 */
export interface ExistingToolMetadata {
  filePath: string;
  endpoints: string[];
  parameters: Record<string, string[]>;
  schemas: string[];
  lastUpdated?: string;
  apiVersion?: string;
}

/**
 * Tool Update Detector
 */
export class ToolUpdateDetector {
  private parser = new OpenAPIParser();
  
  /**
   * Detect changes between new API spec and existing tool
   */
  async detectChanges(
    newSpecPath: string,
    existingToolPath: string
  ): Promise<ChangeDetectionResult> {
    // Load new API spec
    await this.parser.loadSpec(newSpecPath);
    const newEndpoints = this.parser.parseEndpoints();
    const newSchemas = this.parser.getSchemas();
    
    // Extract existing tool metadata
    const existingMeta = await this.extractExistingToolMetadata(existingToolPath);
    
    // Compare and detect changes
    const changes: ToolChange[] = [];
    const recommendations: UpdateRecommendation[] = [];
    
    // Check for new endpoints
    const existingEndpointIds = new Set(existingMeta.endpoints);
    for (const endpoint of newEndpoints) {
      if (!existingEndpointIds.has(endpoint.operationId)) {
        changes.push({
          type: 'added',
          category: 'endpoint',
          path: `${endpoint.method} ${endpoint.path}`,
          details: {
            operationId: endpoint.operationId,
            summary: endpoint.summary
          }
        });
        
        recommendations.push({
          severity: 'medium',
          message: `New endpoint available: ${endpoint.operationId}`,
          action: 'Add new method to tool implementation',
          codeSnippet: this.generateEndpointSnippet(endpoint)
        });
      }
    }
    
    // Check for removed endpoints
    const newEndpointIds = new Set(newEndpoints.map(e => e.operationId));
    for (const existingId of existingMeta.endpoints) {
      if (!newEndpointIds.has(existingId)) {
        changes.push({
          type: 'removed',
          category: 'endpoint',
          path: existingId,
          details: {}
        });
        
        recommendations.push({
          severity: 'high',
          message: `Endpoint removed: ${existingId}`,
          action: 'Mark method as deprecated or remove'
        });
      }
    }
    
    // Check for parameter changes
    for (const endpoint of newEndpoints) {
      if (existingEndpointIds.has(endpoint.operationId)) {
        const existingParams = existingMeta.parameters[endpoint.operationId] || [];
        const newParams = endpoint.parameters.map(p => p.name);
        
        // New parameters
        const addedParams = newParams.filter(p => !existingParams.includes(p));
        for (const param of addedParams) {
          const paramInfo = endpoint.parameters.find(p => p.name === param);
          changes.push({
            type: 'added',
            category: 'parameter',
            path: `${endpoint.operationId}.${param}`,
            details: {
              required: paramInfo?.required,
              type: paramInfo?.type
            }
          });
          
          recommendations.push({
            severity: paramInfo?.required ? 'high' : 'low',
            message: `New ${paramInfo?.required ? 'required' : 'optional'} parameter: ${param}`,
            action: 'Update method signature and validation'
          });
        }
        
        // Removed parameters
        const removedParams = existingParams.filter(p => !newParams.includes(p));
        for (const param of removedParams) {
          changes.push({
            type: 'removed',
            category: 'parameter',
            path: `${endpoint.operationId}.${param}`,
            details: {}
          });
          
          recommendations.push({
            severity: 'high',
            message: `Parameter removed: ${param}`,
            action: 'Remove parameter from method signature'
          });
        }
      }
    }
    
    // Check for schema changes
    const newSchemaNames = Object.keys(newSchemas);
    const existingSchemaNames = existingMeta.schemas;
    
    // New schemas
    const addedSchemas = newSchemaNames.filter(s => !existingSchemaNames.includes(s));
    for (const schema of addedSchemas) {
      changes.push({
        type: 'added',
        category: 'schema',
        path: schema,
        details: {
          properties: Object.keys(newSchemas[schema]?.properties || {})
        }
      });
    }
    
    // Determine if there are breaking changes
    const breakingChanges = changes.some(c => 
      c.type === 'removed' || 
      (c.type === 'added' && c.category === 'parameter' && c.details['required'] === true)
    );
    
    return {
      toolName: this.extractToolName(existingToolPath),
      changes,
      recommendations,
      breakingChanges
    };
  }
  
  /**
   * Extract metadata from existing tool implementation
   */
  private async extractExistingToolMetadata(toolPath: string): Promise<ExistingToolMetadata> {
    const content = await fs.readFile(toolPath, 'utf8');
    
    // Extract method names (operation IDs)
    const methodRegex = /async\s+(\w+)\s*\(/g;
    const endpoints: string[] = [];
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      if (match[1] && !['constructor', 'handleError'].includes(match[1])) {
        endpoints.push(match[1]);
      }
    }
    
    // Extract parameters from method signatures
    const parameters: Record<string, string[]> = {};
    for (const endpoint of endpoints) {
      const paramRegex = new RegExp(`async\\s+${endpoint}\\s*\\([^)]*\\)`, 'g');
      const methodMatch = paramRegex.exec(content);
      if (methodMatch) {
        const paramsString = methodMatch[0];
        const argsMatch = paramsString.match(/args:\s*{([^}]+)}/);
        if (argsMatch && argsMatch[1]) {
          const params = argsMatch[1]
            .split(',')
            .map(p => p.trim().split(':')[0]?.trim() || '')
            .filter(p => p);
          parameters[endpoint] = params;
        }
      }
    }
    
    // Extract schema imports
    const schemaRegex = /import\s+.*?{([^}]+)}\s+from\s+['"]\.\/schemas['"]/;
    const schemaMatch = schemaRegex.exec(content);
    const schemas = schemaMatch && schemaMatch[1]
      ? schemaMatch[1].split(',').map(s => s.trim().replace(/Schema$/, ''))
      : [];
    
    // Extract metadata comments
    const versionRegex = /@apiVersion\s+(\S+)/;
    const versionMatch = versionRegex.exec(content);
    const apiVersion = versionMatch?.[1];
    
    const updatedRegex = /@lastUpdated\s+(\S+)/;
    const updatedMatch = updatedRegex.exec(content);
    const lastUpdated = updatedMatch?.[1];
    
    return {
      filePath: toolPath,
      endpoints,
      parameters,
      schemas,
      apiVersion,
      lastUpdated
    };
  }
  
  /**
   * Generate code snippet for new endpoint
   */
  private generateEndpointSnippet(endpoint: ParsedEndpoint): string {
    const params = endpoint.parameters
      .map(p => `${p.name}${p.required ? '' : '?'}: ${this.getTypeScriptType(p.type)}`)
      .join(', ');
    
    return `
  /**
   * ${endpoint.summary || endpoint.operationId}
   */
  async ${endpoint.operationId}(args: { ${params} }): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        method: '${endpoint.method}',
        path: '${endpoint.path}',
        params: args
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return this.handleError(error);
    }
  }`;
  }
  
  /**
   * Get TypeScript type from OpenAPI type
   */
  private getTypeScriptType(type?: string): string {
    if (!type) return 'unknown';
    switch (type) {
      case 'integer':
        return 'number';
      case 'array':
        return 'unknown[]';
      case 'object':
        return 'Record<string, unknown>';
      default:
        return type || 'unknown';
    }
  }
  
  /**
   * Extract tool name from file path
   */
  private extractToolName(filePath: string): string {
    const fileName = filePath.split('/').pop();
    return fileName ? fileName.replace(/-tools\.ts$/, '') : 'unknown';
  }
  
  /**
   * Check if tool uses hardcoded implementation
   */
  async isHardcodedTool(toolPath: string): Promise<boolean> {
    const content = await fs.readFile(toolPath, 'utf8');
    
    // Indicators of hardcoded implementation
    const hardcodedIndicators = [
      /path:\s*['"`]\/[^${]/,  // Hardcoded paths without template literals
      /method:\s*['"](?:GET|POST|PUT|DELETE)['"]/,  // Hardcoded HTTP methods
      /response\.data\??\./,  // Direct data access without validation
      /JSON\.parse\(/,  // Manual JSON parsing
      /any\s*[),]/,  // Use of 'any' type
    ];
    
    return hardcodedIndicators.some(pattern => pattern.test(content));
  }
  
  /**
   * Generate migration plan for hardcoded tool
   */
  async generateMigrationPlan(
    toolPath: string,
    apiSpecPath: string
  ): Promise<MigrationPlan> {
    const isHardcoded = await this.isHardcodedTool(toolPath);
    if (!isHardcoded) {
      return {
        toolPath,
        apiSpecPath,
        steps: [],
        estimatedEffort: 'none'
      };
    }
    
    await this.parser.loadSpec(apiSpecPath);
    const endpoints = this.parser.parseEndpoints();
    
    const steps: MigrationStep[] = [
      {
        order: 1,
        description: 'Generate Zod schemas from OpenAPI spec',
        automated: true,
        command: `alecs generate schemas ${this.extractToolName(toolPath)} --from-spec`
      },
      {
        order: 2,
        description: 'Replace hardcoded paths with API client calls',
        automated: false,
        guidance: 'Update each method to use typed API client with proper error handling'
      },
      {
        order: 3,
        description: 'Add runtime validation for responses',
        automated: true,
        command: `alecs migrate validate-responses ${this.extractToolName(toolPath)}`
      },
      {
        order: 4,
        description: 'Remove any type usage',
        automated: false,
        guidance: 'Replace all `any` types with proper interfaces from generated schemas'
      },
      {
        order: 5,
        description: 'Add comprehensive error handling',
        automated: true,
        command: `alecs migrate error-handling ${this.extractToolName(toolPath)}`
      }
    ];
    
    const estimatedEffort = endpoints.length > 10 ? 'high' : 
                          endpoints.length > 5 ? 'medium' : 'low';
    
    return {
      toolPath,
      apiSpecPath,
      steps,
      estimatedEffort
    };
  }
}

/**
 * Migration plan for hardcoded tools
 */
export interface MigrationPlan {
  toolPath: string;
  apiSpecPath: string;
  steps: MigrationStep[];
  estimatedEffort: 'low' | 'medium' | 'high' | 'none';
}

export interface MigrationStep {
  order: number;
  description: string;
  automated: boolean;
  command?: string;
  guidance?: string;
}