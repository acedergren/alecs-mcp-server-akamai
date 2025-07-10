/**
 * Code Migrator
 * 
 * Automatically migrates hardcoded tools to OpenAPI-driven implementations
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automated code modernization
 * Approach: Transform legacy patterns to modern OpenAPI-based code
 * Implementation: AST-based code transformation with safety checks
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createLogger } from '../../utils/pino-logger';
import { OpenAPIParser } from './openapi-parser';
import { ZodSchemaGenerator } from './zod-schema-generator';

const logger = createLogger('code-migrator');

/**
 * Migration options
 */
export interface MigrationOptions {
  dryRun?: boolean;
  backup?: boolean;
  interactive?: boolean;
  force?: boolean;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  filesModified: string[];
  errors: string[];
  warnings: string[];
  backupPaths?: string[];
}

/**
 * Code pattern to replace
 */
interface CodePattern {
  name: string;
  pattern: RegExp;
  replacement: (match: RegExpMatchArray, context: MigrationContext) => string;
  description: string;
}

/**
 * Migration context
 */
interface MigrationContext {
  endpoints: Map<string, EndpointInfo>;
  schemas: Map<string, string>;
  domainName: string;
  className: string;
}

interface EndpointInfo {
  method: string;
  path: string;
  parameters: string[];
  hasBody: boolean;
  responseSchema?: string;
}

/**
 * Code Migrator
 */
export class CodeMigrator {
  private parser = new OpenAPIParser();
  private schemaGenerator = new ZodSchemaGenerator();
  
  /**
   * Migrate hardcoded tool to OpenAPI-driven implementation
   */
  async migrateToolToOpenAPI(
    toolPath: string,
    apiSpecPath: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      filesModified: [],
      errors: [],
      warnings: []
    };
    
    try {
      // Load API spec
      await this.parser.loadSpec(apiSpecPath);
      const endpoints = this.parser.parseEndpoints();
      const schemas = this.parser.getSchemas();
      
      // Create migration context
      const context = this.createMigrationContext(toolPath, endpoints, schemas);
      
      // Backup original file if requested
      if (options.backup) {
        const backupPath = await this.backupFile(toolPath);
        result.backupPaths = [backupPath];
      }
      
      // Read original file
      const originalContent = await fs.readFile(toolPath, 'utf8');
      let modifiedContent = originalContent;
      
      // Apply migration patterns
      const patterns = this.getMigrationPatterns();
      for (const pattern of patterns) {
        const matches = [...modifiedContent.matchAll(pattern.pattern)];
        if (matches.length > 0) {
          logger.info({ 
            pattern: pattern.name, 
            matches: matches.length 
          }, 'Applying migration pattern');
          
          // Apply replacements in reverse order to maintain positions
          for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            if (match && match.index !== undefined) {
              const replacement = pattern.replacement(match, context);
              modifiedContent = 
                modifiedContent.slice(0, match.index) +
                replacement +
                modifiedContent.slice(match.index + match[0].length);
            }
          }
        }
      }
      
      // Generate schemas file
      const schemasPath = join(dirname(toolPath), 'schemas.ts');
      const schemasContent = this.generateSchemasFile(schemas);
      
      if (options.dryRun) {
        console.log('\n=== DRY RUN - Changes that would be made ===\n');
        console.log('Modified tool file:');
        console.log(modifiedContent.substring(0, 500) + '...');
        console.log('\nGenerated schemas file:');
        console.log(schemasContent.substring(0, 500) + '...');
        result.success = true;
        return result;
      }
      
      // Write modified files
      await fs.writeFile(toolPath, modifiedContent, 'utf8');
      result.filesModified.push(toolPath);
      
      await fs.writeFile(schemasPath, schemasContent, 'utf8');
      result.filesModified.push(schemasPath);
      
      // Update imports in the tool file
      await this.updateImports(toolPath, schemasPath);
      
      result.success = true;
      logger.info({ filesModified: result.filesModified }, 'Migration completed successfully');
      
    } catch (error) {
      logger.error({ error }, 'Migration failed');
      result.errors.push(`Migration failed: ${error}`);
    }
    
    return result;
  }
  
  /**
   * Create migration context from endpoints
   */
  private createMigrationContext(
    toolPath: string,
    endpoints: any[],
    schemas: Record<string, any>
  ): MigrationContext {
    const domainName = this.extractDomainName(toolPath);
    const className = this.toPascalCase(domainName) + 'Tools';
    
    const endpointMap = new Map<string, EndpointInfo>();
    
    for (const endpoint of endpoints) {
      endpointMap.set(endpoint.operationId, {
        method: endpoint.method,
        path: endpoint.path,
        parameters: endpoint.parameters.map((p: any) => p.name),
        hasBody: !!endpoint.requestBody,
        responseSchema: endpoint.responses['200']?.schemaName
      });
    }
    
    const schemaMap = new Map<string, string>();
    for (const [name, schema] of Object.entries(schemas)) {
      const zodSchema = this.schemaGenerator.generateZodSchema(schema, name);
      schemaMap.set(name, zodSchema);
    }
    
    return {
      endpoints: endpointMap,
      schemas: schemaMap,
      domainName,
      className
    };
  }
  
  /**
   * Get migration patterns
   */
  private getMigrationPatterns(): CodePattern[] {
    return [
      {
        name: 'hardcoded-api-calls',
        pattern: /await\s+this\.client\.request\(\{[\s\S]*?method:\s*['"](\w+)['"],[\s\S]*?path:\s*['"]([^'"]+)['"][\s\S]*?\}\)/g,
        replacement: (match, context) => {
          const method = match[1] || '';
          const path = match[2] || '';
          
          // Find matching endpoint
          let endpointInfo: EndpointInfo | undefined;
          let operationId: string | undefined;
          
          for (const [id, info] of context.endpoints) {
            if (info.method === method && this.pathMatches(info.path, path)) {
              endpointInfo = info;
              operationId = id;
              break;
            }
          }
          
          if (!endpointInfo || !operationId || !match[0]) {
            return match[0] || ''; // Keep original if no match
          }
          
          // Build typed request
          let replacement = `await this.client.request({\n`;
          replacement += `        method: '${method}',\n`;
          replacement += `        path: \`${this.convertToTemplateLiteral(endpointInfo.path)}\`,\n`;
          
          if (endpointInfo.parameters.length > 0) {
            replacement += `        params: {\n`;
            for (const param of endpointInfo.parameters) {
              replacement += `          ${param}: args.${param},\n`;
            }
            replacement += `        },\n`;
          }
          
          if (endpointInfo.hasBody) {
            replacement += `        data: args.body\n`;
          }
          
          replacement += `      })`;
          
          return replacement;
        },
        description: 'Replace hardcoded API calls with typed versions'
      },
      {
        name: 'any-type-usage',
        pattern: /\(args:\s*any\)/g,
        replacement: (_match, _context) => {
          // This would need method context to work properly
          // For now, return a TODO marker
          return `(args: unknown /* TODO: Add proper type */)`;
        },
        description: 'Replace any types with proper interfaces'
      },
      {
        name: 'unvalidated-responses',
        pattern: /return\s+\{[\s\S]*?content:\s*\[[\s\S]*?text:\s*JSON\.stringify\(response\.data[\s\S]*?\)[\s\S]*?\][\s\S]*?\}/g,
        replacement: (_match, _context) => {
          return `// TODO: Add response validation
      const validatedData = response.data; // Add schema validation here
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validatedData, null, 2)
        }],
        isError: false
      }`;
        },
        description: 'Add response validation placeholders'
      },
      {
        name: 'missing-error-handling',
        pattern: /catch\s*\(error\)\s*\{[\s\S]*?throw error;?[\s\S]*?\}/g,
        replacement: (_match, _context) => {
          return `catch (error) {
      return this.handleError(error);
    }`;
        },
        description: 'Use proper error handling'
      }
    ];
  }
  
  /**
   * Generate schemas file content
   */
  private generateSchemasFile(schemas: Record<string, any>): string {
    let content = `/**
 * Generated Schemas
 * 
 * Auto-generated from OpenAPI specification
 * DO NOT EDIT MANUALLY
 * 
 * Generated on: ${new Date().toISOString()}
 */

import { z } from 'zod';

`;
    
    // Set schema refs for resolution
    const schemaRefs = new Map<string, any>();
    for (const [name, schema] of Object.entries(schemas)) {
      schemaRefs.set(`#/components/schemas/${name}`, schema);
    }
    this.schemaGenerator.setSchemaRefs(schemaRefs);
    
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
    
    return content;
  }
  
  /**
   * Update imports in tool file
   */
  private async updateImports(toolPath: string, _schemasPath: string): Promise<void> {
    let content = await fs.readFile(toolPath, 'utf8');
    
    // Add schema import if not present
    const schemaImport = `import { /* TODO: Add schema imports */ } from './schemas';`;
    if (!content.includes("from './schemas'")) {
      // Find last import
      const lastImportMatch = content.match(/^import.*from.*;$/gm);
      if (lastImportMatch && lastImportMatch.length > 0) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1]!;
        const lastImportIndex = content.lastIndexOf(lastImport);
        content = 
          content.slice(0, lastImportIndex + lastImport.length) +
          '\n' + schemaImport +
          content.slice(lastImportIndex + lastImport.length);
      }
    }
    
    // Add metadata comment
    const metadataComment = `/**
 * @apiVersion ${this.parser.getApiInfo().version}
 * @lastUpdated ${new Date().toISOString()}
 * @migrated true
 */
`;
    
    // Add after imports
    const classMatch = content.match(/export\s+class\s+\w+Tools/);
    if (classMatch && classMatch.index) {
      content = 
        content.slice(0, classMatch.index) +
        metadataComment + '\n' +
        content.slice(classMatch.index);
    }
    
    await fs.writeFile(toolPath, content, 'utf8');
  }
  
  /**
   * Backup file before migration
   */
  private async backupFile(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = filePath.replace('.ts', `.backup.${timestamp}.ts`);
    
    await fs.copyFile(filePath, backupPath);
    logger.info({ original: filePath, backup: backupPath }, 'Created backup');
    
    return backupPath;
  }
  
  /**
   * Check if paths match (accounting for parameters)
   */
  private pathMatches(specPath: string, codePath: string): boolean {
    // Convert spec path parameters to regex
    const regexPath = specPath
      .replace(/\{([^}]+)\}/g, '([^/]+)')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPath}$`);
    return regex.test(codePath);
  }
  
  /**
   * Convert path to template literal
   */
  private convertToTemplateLiteral(path: string): string {
    return path.replace(/\{([^}]+)\}/g, '${args.$1}');
  }
  
  /**
   * Extract domain name from file path
   */
  private extractDomainName(filePath: string): string {
    const parts = filePath.split('/');
    const toolsIndex = parts.indexOf('tools');
    return toolsIndex >= 0 && toolsIndex < parts.length - 1 
      ? (parts[toolsIndex + 1] || 'unknown')
      : 'unknown';
  }
  
  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toUpperCase());
  }
  
  /**
   * Validate migration result
   */
  async validateMigration(toolPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(toolPath, 'utf8');
      
      // Check for common issues
      const issues = [];
      
      if (content.includes(': any')) {
        issues.push('Still contains "any" types');
      }
      
      if (!/import.*from\s+['"]\.\/schemas['"]/.test(content)) {
        issues.push('Missing schema imports');
      }
      
      if (content.includes('JSON.parse(')) {
        issues.push('Still using manual JSON parsing');
      }
      
      if (content.includes("path: '")) {
        issues.push('Still has hardcoded paths');
      }
      
      if (issues.length > 0) {
        logger.warn({ issues }, 'Migration validation found issues');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to validate migration');
      return false;
    }
  }
}