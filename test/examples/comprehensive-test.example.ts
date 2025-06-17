/**
 * Example comprehensive test file demonstrating all testing features
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import { z } from 'zod';
import { 
  akamaiResponseFactory, 
  propertyArb,
  propertyVersionArb,
  scenarioGenerators 
} from '../utils';
import { TypeGuards, SchemaValidators } from '../utils/validators/type-validators';
import { Property, PropertyVersion } from '../../src/types/akamai';

/**
 * Example: Unit tests with factory pattern
 */
describe('Property Service - Unit Tests', () => {
  beforeEach(() => {
    // Reset factories before each test
    akamaiResponseFactory.resetAll();
  });

  it('should create a property with factory', () => {
    // Arrange
    const property = akamaiResponseFactory.property.create({
      propertyName: 'test-property',
      productId: 'prd_Web_Accel',
    });

    // Assert using custom matchers
    expect(property).toBeValidPropertyResponse();
    expect(property).toContainRequiredFields([
      'propertyId',
      'propertyName',
      'contractId',
      'groupId',
    ]);
  });

  it('should validate property schema', () => {
    // Arrange
    const property = akamaiResponseFactory.property.create();

    // Act & Assert
    expect(property).toBeValidZodSchema(SchemaValidators.property);
    expect(TypeGuards.isProperty(property)).toBe(true);
  });
});

/**
 * Example: Property-based tests
 */
describe('Property Service - Property-Based Tests', () => {
  it('should handle any valid property creation params', () => {
    fc.assert(
      fc.property(
        scenarioGenerators.validPropertyCreation,
        (params) => {
          // Property: Creating a property with valid params should succeed
          expect(() => {
            SchemaValidators.property.parse({
              propertyId: 'prp_123456',
              ...params,
              latestVersion: 1,
            });
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain property invariants', () => {
    fc.assert(
      fc.property(
        propertyArb,
        (property) => {
          // Invariant 1: Property ID must start with 'prp_'
          expect(property.propertyId).toMatch(/^prp_/);
          
          // Invariant 2: Latest version must be positive
          expect(property.latestVersion).toBeGreaterThan(0);
          
          // Invariant 3: Production/staging versions <= latest version
          if (property.productionVersion) {
            expect(property.productionVersion).toBeLessThanOrEqual(property.latestVersion);
          }
          if (property.stagingVersion) {
            expect(property.stagingVersion).toBeLessThanOrEqual(property.latestVersion);
          }
        }
      )
    );
  });
});

/**
 * Example: Integration tests with mocking
 */
describe('Property Service - Integration Tests', () => {
  it('should activate property with mocked EdgeGrid', async () => {
    // Arrange
    const mockEdgeGrid = global.testUtils.mockEdgeGrid();
    const property = akamaiResponseFactory.property.create();
    const activation = akamaiResponseFactory.propertyActivation.create({
      propertyId: property.propertyId,
      network: 'STAGING',
    });

    // Setup mock response
    mockEdgeGrid.setResponse(
      `/papi/v1/properties/${property.propertyId}/activations`,
      { activationLink: `/papi/v1/properties/${property.propertyId}/activations/${activation.activationId}` }
    );

    // Act
    const result = await global.testUtils.withMockedAuth(async () => {
      // Simulate activation logic
      return activation;
    });

    // Assert
    expect(result).toBeValidActivationResponse();
    expect(mockEdgeGrid.getCallCount(`/papi/v1/properties/${property.propertyId}/activations`)).toBe(1);
    
    // Cleanup
    mockEdgeGrid.restore();
  });
});

/**
 * Example: Snapshot testing
 */
describe('Property Service - Snapshot Tests', () => {
  it('should match property response snapshot', () => {
    // Arrange
    const property = akamaiResponseFactory.property.create({
      propertyName: 'snapshot-test-property',
      hostnames: ['example.com', 'www.example.com'],
    });

    // Act & Assert
    expect(property).toMatchSnapshot();
  });

  it('should match complex response snapshot', () => {
    // Arrange
    const response = {
      properties: akamaiResponseFactory.property.createMany(3),
      contracts: akamaiResponseFactory.contract.createMany(2),
      groups: akamaiResponseFactory.group.createMany(2),
    };

    // Act & Assert
    expect(response).toMatchSnapshot();
  });
});

/**
 * Example: Type-level tests (compile-time)
 */
describe('Property Service - Type Tests', () => {
  it('should enforce type constraints at compile time', () => {
    // These tests run at compile time via type-tests.ts
    // Runtime assertion to ensure types are loaded
    const property: Property = akamaiResponseFactory.property.create();
    
    // TypeScript will enforce these at compile time
    const id: string = property.propertyId;
    const version: number = property.latestVersion;
    const optional: number | undefined = property.productionVersion;
    
    expect(typeof id).toBe('string');
    expect(typeof version).toBe('number');
  });
});

/**
 * Example: Error scenario testing
 */
describe('Property Service - Error Scenarios', () => {
  it('should handle missing required fields', () => {
    // Arrange
    const invalidProperty = {
      propertyName: 'test',
      // Missing required fields
    };

    // Act & Assert
    expect(() => {
      SchemaValidators.property.parse(invalidProperty);
    }).toThrow();
    
    expect(TypeGuards.isProperty(invalidProperty)).toBe(false);
  });

  it('should validate with detailed error messages', () => {
    // Arrange
    const invalidProperty = {
      propertyId: 'invalid-id', // Should start with prp_
      propertyName: '',
      contractId: 'ctr_123', // Invalid format
      groupId: 'grp_abc', // Should be numeric
      productId: 'invalid',
      latestVersion: -1, // Should be positive
    };

    // Act
    const result = SchemaValidators.property.safeParse(invalidProperty);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors).toHaveLength(6);
      expect(result.error.errors[0].path).toEqual(['propertyId']);
    }
  });
});

/**
 * Example: Performance testing
 */
describe('Property Service - Performance Tests', () => {
  it('should handle large datasets efficiently', () => {
    // Arrange
    const startTime = performance.now();
    const properties = akamaiResponseFactory.property.createMany(10000);
    
    // Act
    const validationStartTime = performance.now();
    const results = properties.map(p => TypeGuards.isProperty(p));
    const validationEndTime = performance.now();
    
    // Assert
    const creationTime = validationStartTime - startTime;
    const validationTime = validationEndTime - validationStartTime;
    
    expect(creationTime).toBeLessThan(1000); // Less than 1 second
    expect(validationTime).toBeLessThan(100); // Less than 100ms
    expect(results.every(r => r === true)).toBe(true);
  });
});

/**
 * Example: Custom matcher usage
 */
describe('Property Service - Custom Matchers', () => {
  it('should use all custom matchers', () => {
    // Arrange
    const property = akamaiResponseFactory.property.create();
    const version = akamaiResponseFactory.propertyVersion.create();
    const activation = akamaiResponseFactory.propertyActivation.create();
    
    // Assert - Akamai-specific matchers
    expect(property).toBeValidAkamaiResponse();
    expect(property).toBeValidPropertyResponse();
    expect(activation).toBeValidActivationResponse();
    
    // Assert - MCP matchers
    const mcpResponse = { success: true, data: property };
    expect(mcpResponse).toBeValidMcpResponse();
    
    // Assert - Schema matching
    expect(property).toMatchAkamaiSchema(SchemaValidators.property);
    
    // Assert - Field validation
    expect(property).toContainRequiredFields(['propertyId', 'propertyName']);
    
    // Assert - HTTP matchers
    const httpResponse = { status: 200, data: property };
    expect(httpResponse).toHaveStatusCode(200);
  });
});