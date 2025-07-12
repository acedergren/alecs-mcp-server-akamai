/**
 * Zod to JSON Schema Conversion Utility
 * 
 * Extracted from akamai-server-factory.ts for reusability and maintainability
 * 
 * ARCHITECTURE NOTES:
 * - Defensive programming with comprehensive error handling
 * - Supports all major Zod types with proper validation
 * - Returns valid JSON Schema Draft-07 compatible objects
 * - Graceful fallbacks for unsupported or invalid schemas
 */

import { z, ZodType, ZodTypeDef, ZodObject, ZodRawShape } from 'zod';
import { createLogger } from './pino-logger';

const logger = createLogger('zod-schema-converter');

/**
 * Convert Zod schema to JSON Schema for MCP compatibility
 * KAIZEN: Defensive schema conversion with comprehensive error handling
 */
export function zodToJsonSchema(zodSchema: ZodType<unknown, ZodTypeDef, unknown>): Record<string, unknown> {
  try {
    // DEFENSIVE: Handle null/undefined schemas
    if (!zodSchema) {
      logger.warn('Received null/undefined schema, returning default object schema');
      return { type: 'object', properties: {}, additionalProperties: false };
    }

    // Handle ZodObject types with proper typing
    if (zodSchema instanceof ZodObject) {
      const shape = zodSchema.shape as ZodRawShape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      // DEFENSIVE: Validate shape exists
      if (!shape || typeof shape !== 'object') {
        logger.warn('Invalid Zod object shape, using empty properties');
        return { type: 'object', properties: {}, additionalProperties: false };
      }

      for (const [key, fieldSchema] of Object.entries(shape)) {
        try {
          // DEFENSIVE: Validate field schema before processing
          if (fieldSchema && typeof fieldSchema === 'object') {
            properties[key] = zodFieldToJsonSchema(fieldSchema);
            
            // Check if field is required using proper Zod API
            // A field is required if it's not wrapped in ZodOptional
            const typeName = fieldSchema._def?.typeName;
            if (typeName && typeName !== z.ZodFirstPartyTypeKind.ZodOptional) {
              required.push(key);
            }
          } else {
            // DEFENSIVE: Skip invalid field schemas
            logger.warn(`Skipping invalid field schema for key: ${key}`);
          }
        } catch (fieldError) {
          logger.warn(`Error processing field '${key}':`, fieldError);
          // DEFENSIVE: Continue processing other fields
          properties[key] = { type: 'string', description: 'Field schema conversion failed' };
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
        additionalProperties: false,
        // KAIZEN: Add schema metadata for debugging
        $schema: 'http://json-schema.org/draft-07/schema#',
      };
    }

    // DEFENSIVE: Handle non-object schemas gracefully
    logger.warn('Non-object Zod schema provided, converting to object schema');
    return { 
      type: 'object', 
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#',
    };
  } catch (error) {
    logger.error('Critical schema conversion error:', error);
    // DEFENSIVE: Return a valid fallback schema that won't break MCP
    return { 
      type: 'object', 
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#',
      description: 'Schema conversion failed - using fallback'
    };
  }
}

/**
 * Convert individual Zod field to JSON Schema
 * KAIZEN: Enhanced with defensive programming and comprehensive error handling
 */
export function zodFieldToJsonSchema(field: ZodType<unknown, ZodTypeDef, unknown>): Record<string, unknown> {
  try {
    // DEFENSIVE: Validate field exists
    if (!field) {
      logger.warn('Null/undefined field provided to zodFieldToJsonSchema');
      return { type: 'string', description: 'Field schema conversion failed' };
    }

    // DEFENSIVE: Handle ZodString with constraints validation
    if (field instanceof z.ZodString) {
      const schema: Record<string, unknown> = { type: 'string' };
      
      try {
        const description = field['description'];
        if (description && typeof description === 'string') {
          schema['description'] = description;
        }
        
        // KAIZEN: Extract string constraints if available
        const def = (field as any)._def;
        if (def && typeof def === 'object') {
          if (def.minLength !== null && def.minLength !== undefined) {
            schema['minLength'] = def.minLength;
          }
          if (def.maxLength !== null && def.maxLength !== undefined) {
            schema['maxLength'] = def.maxLength;
          }
        }
      } catch (descError) {
        logger.warn('Error extracting string field metadata:', descError);
      }
      
      return schema;
    }
    
    // DEFENSIVE: Handle ZodNumber with constraints validation
    if (field instanceof z.ZodNumber) {
      const schema: Record<string, unknown> = { type: 'number' };
      
      try {
        const description = field['description'];
        if (description && typeof description === 'string') {
          schema['description'] = description;
        }
        
        // KAIZEN: Extract number constraints if available
        const def = (field as any)._def;
        if (def && typeof def === 'object') {
          if (def.minimum !== null && def.minimum !== undefined) {
            schema['minimum'] = def.minimum;
          }
          if (def.maximum !== null && def.maximum !== undefined) {
            schema['maximum'] = def.maximum;
          }
        }
      } catch (descError) {
        logger.warn('Error extracting number field metadata:', descError);
      }
      
      return schema;
    }
    
    // DEFENSIVE: Handle ZodBoolean
    if (field instanceof z.ZodBoolean) {
      const schema: Record<string, unknown> = { type: 'boolean' };
      
      try {
        const description = field['description'];
        if (description && typeof description === 'string') {
          schema['description'] = description;
        }
      } catch (descError) {
        logger.warn('Error extracting boolean field metadata:', descError);
      }
      
      return schema;
    }
    
    // DEFENSIVE: Handle ZodArray with element validation
    if (field instanceof z.ZodArray) {
      try {
        const element = (field as any).element;
        if (!element) {
          logger.warn('ZodArray missing element schema');
          return { type: 'array', items: { type: 'string' } };
        }
        
        return {
          type: 'array',
          items: zodFieldToJsonSchema(element),
        };
      } catch (arrayError) {
        logger.warn('Error processing ZodArray:', arrayError);
        return { type: 'array', items: { type: 'string' } };
      }
    }
    
    // DEFENSIVE: Handle ZodEnum with options validation
    if (field instanceof z.ZodEnum) {
      try {
        const options = (field as any).options;
        if (!Array.isArray(options) || options.length === 0) {
          logger.warn('ZodEnum missing or empty options');
          return { type: 'string' };
        }
        
        return {
          type: 'string',
          enum: options,
        };
      } catch (enumError) {
        logger.warn('Error processing ZodEnum:', enumError);
        return { type: 'string' };
      }
    }
    
    // DEFENSIVE: Handle ZodOptional
    if (field instanceof z.ZodOptional) {
      try {
        const unwrapped = field.unwrap();
        if (!unwrapped) {
          logger.warn('ZodOptional failed to unwrap');
          return { type: 'string' };
        }
        
        return zodFieldToJsonSchema(unwrapped);
      } catch (optionalError) {
        logger.warn('Error processing ZodOptional:', optionalError);
        return { type: 'string' };
      }
    }
    
    // DEFENSIVE: Handle ZodUnion with comprehensive validation
    if (field instanceof z.ZodUnion) {
      try {
        const options = (field as any).options;
        if (!Array.isArray(options)) {
          logger.warn('ZodUnion missing options array');
          return { type: 'string' };
        }
        
        // Handle nullable types (union with null)
        if (options.length === 2) {
          const hasNull = options.some((opt: ZodType) => opt instanceof z.ZodNull);
          if (hasNull) {
            const nonNullOption = options.find((opt: ZodType) => !(opt instanceof z.ZodNull));
            if (nonNullOption) {
              return zodFieldToJsonSchema(nonNullOption);
            }
          }
        }
        
        // KAIZEN: For complex unions, try to find a common type
        const types = options.map((opt: ZodType) => {
          try {
            if (opt instanceof z.ZodString) {return 'string';}
            if (opt instanceof z.ZodNumber) {return 'number';}
            if (opt instanceof z.ZodBoolean) {return 'boolean';}
            return 'string';
          } catch {
            return 'string';
          }
        });
        
        const uniqueTypes = [...new Set(types)];
        if (uniqueTypes.length === 1) {
          return { type: uniqueTypes[0] };
        }
        
        // For mixed unions, default to string with enum if possible
        return { type: 'string' };
      } catch (unionError) {
        logger.warn('Error processing ZodUnion:', unionError);
        return { type: 'string' };
      }
    }
    
    // DEFENSIVE: Handle ZodObject recursively
    if (field instanceof z.ZodObject) {
      try {
        return zodToJsonSchema(field);
      } catch (objectError) {
        logger.warn('Error processing nested ZodObject:', objectError);
        return { type: 'object', properties: {}, additionalProperties: false };
      }
    }
    
    // KAIZEN: Handle additional Zod types
    if (field instanceof z.ZodLiteral) {
      try {
        const value = (field as any)._def?.value;
        if (value !== undefined) {
          return { 
            type: typeof value,
            const: value
          };
        }
      } catch (literalError) {
        logger.warn('Error processing ZodLiteral:', literalError);
      }
    }
    
    if (field instanceof z.ZodDate) {
      return { 
        type: 'string', 
        format: 'date-time',
        description: 'ISO 8601 date-time string'
      };
    }
    
    // DEFENSIVE: Log unhandled Zod types for debugging
    const typeName = (field as any)._def?.typeName || field.constructor.name;
    logger.warn(`Unhandled Zod type: ${typeName}, falling back to string type`);
    
    // Safe fallback for unhandled types
    return { 
      type: 'string',
      description: `Unhandled Zod type: ${typeName}`
    };
    
  } catch (error) {
    logger.error('Critical error in zodFieldToJsonSchema:', error);
    // DEFENSIVE: Return valid fallback that won't break MCP
    return { 
      type: 'string',
      description: 'Field schema conversion failed'
    };
  }
}