/**
 * Zod Schema Generator
 * 
 * Converts OpenAPI schemas to Zod schemas
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Runtime validation from API specifications
 * Approach: Convert OpenAPI schemas to Zod validation schemas
 * Implementation: Comprehensive type mapping with proper validation
 */

import type { SchemaObject } from './openapi-parser';

export class ZodSchemaGenerator {
  private schemaRefs = new Map<string, SchemaObject>();
  private generatedSchemas = new Map<string, string>();

  /**
   * Set schema references for resolution
   */
  setSchemaRefs(refs: Map<string, SchemaObject>): void {
    this.schemaRefs = refs;
  }

  /**
   * Generate Zod schema from OpenAPI schema
   */
  generateZodSchema(schema: SchemaObject, schemaName?: string): string {
    if (schemaName && this.generatedSchemas.has(schemaName)) {
      return schemaName + 'Schema';
    }

    const zodSchema = this.convertToZodSchema(schema, 0);
    
    if (schemaName) {
      const fullSchema = `export const ${schemaName}Schema = ${zodSchema};`;
      this.generatedSchemas.set(schemaName, fullSchema);
      return schemaName + 'Schema';
    }
    
    return zodSchema;
  }

  /**
   * Get all generated schemas
   */
  getAllGeneratedSchemas(): string {
    return Array.from(this.generatedSchemas.values()).join('\n\n');
  }

  /**
   * Convert OpenAPI schema to Zod schema
   */
  private convertToZodSchema(schema: SchemaObject | undefined, indent: number): string {
    if (!schema) return 'z.unknown()';

    // Handle references
    if (schema.$ref) {
      const refName = this.getSchemaNameFromRef(schema.$ref);
      if (refName) {
        const refSchema = this.schemaRefs.get(schema.$ref);
        if (refSchema && !this.generatedSchemas.has(refName)) {
          // Generate the referenced schema first
          this.generateZodSchema(refSchema, refName);
        }
        return refName + 'Schema';
      }
    }

    // Handle allOf, oneOf, anyOf
    if (schema.allOf) {
      const schemas = schema.allOf.map(s => this.convertToZodSchema(s, indent));
      return schemas.length === 1 ? schemas[0]! : `z.intersection(${schemas.join(', ')})`;
    }

    if (schema.oneOf) {
      const schemas = schema.oneOf.map(s => this.convertToZodSchema(s, indent));
      return `z.union([${schemas.join(', ')}])`;
    }

    if (schema.anyOf) {
      const schemas = schema.anyOf.map(s => this.convertToZodSchema(s, indent));
      return `z.union([${schemas.join(', ')}])`;
    }

    // Handle basic types
    switch (schema.type) {
      case 'string':
        return this.generateStringSchema(schema);
      
      case 'number':
      case 'integer':
        return this.generateNumberSchema(schema);
      
      case 'boolean':
        return 'z.boolean()';
      
      case 'array':
        return this.generateArraySchema(schema, indent);
      
      case 'object':
        return this.generateObjectSchema(schema, indent);
      
      default:
        return 'z.unknown()';
    }
  }

  /**
   * Generate string schema with validations
   */
  private generateStringSchema(schema: SchemaObject): string {
    let zodSchema = 'z.string()';

    if (schema.enum) {
      const enumValues = schema.enum.map(v => `'${v}'`).join(', ');
      return `z.enum([${enumValues}])`;
    }

    if (schema.format) {
      switch (schema.format) {
        case 'date':
        case 'date-time':
          zodSchema += '.datetime()';
          break;
        case 'email':
          zodSchema += '.email()';
          break;
        case 'uri':
        case 'url':
          zodSchema += '.url()';
          break;
        case 'uuid':
          zodSchema += '.uuid()';
          break;
      }
    }

    if (schema.pattern) {
      zodSchema += `.regex(/${schema.pattern}/)`;
    }

    if (schema.minimum !== undefined) {
      zodSchema += `.min(${schema.minimum})`;
    }

    if (schema.maximum !== undefined) {
      zodSchema += `.max(${schema.maximum})`;
    }

    return zodSchema;
  }

  /**
   * Generate number schema with validations
   */
  private generateNumberSchema(schema: SchemaObject): string {
    let zodSchema = schema.type === 'integer' ? 'z.number().int()' : 'z.number()';

    if (schema.minimum !== undefined) {
      zodSchema += `.min(${schema.minimum})`;
    }

    if (schema.maximum !== undefined) {
      zodSchema += `.max(${schema.maximum})`;
    }

    if (schema.enum) {
      const enumValues = schema.enum.join(', ');
      return `z.literal(${enumValues})`;
    }

    return zodSchema;
  }

  /**
   * Generate array schema
   */
  private generateArraySchema(schema: SchemaObject, indent: number): string {
    const itemSchema = this.convertToZodSchema(schema.items, indent);
    return `z.array(${itemSchema})`;
  }

  /**
   * Generate object schema
   */
  private generateObjectSchema(schema: SchemaObject, indent: number): string {
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      return 'z.record(z.unknown())';
    }

    const requiredFields = schema.required || [];
    const spacing = '  '.repeat(indent + 1);
    
    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const zodSchema = this.convertToZodSchema(propSchema, indent + 1);
      const isRequired = requiredFields.includes(key);
      const fieldSchema = isRequired ? zodSchema : `${zodSchema}.optional()`;
      
      // Handle special characters in property names
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      
      return `${spacing}${safeKey}: ${fieldSchema}`;
    });

    return `z.object({\n${properties.join(',\n')}\n${spacing.slice(2)}})`;
  }

  /**
   * Get schema name from $ref
   */
  private getSchemaNameFromRef(ref: string): string | undefined {
    const match = ref.match(/#\/components\/schemas\/(.+)$/);
    return match?.[1];
  }

  /**
   * Generate TypeScript type from Zod schema
   */
  generateTypeFromSchema(schemaName: string): string {
    return `export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`;
  }
}