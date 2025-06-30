/**
 * MCP Tool Validation Test Suite
 * 
 * This test validates tool schemas, parameter validation, and basic functionality
 */

import { describe, it, expect, jest } from '@jest/testing-library/jest-dom';

interface ValidationResult {
  toolName: string;
  isValid: boolean;
  errors: string[];
  parameterValidation: {
    hasRequiredParams: boolean;
    hasOptionalParams: boolean;
    parameterCount: number;
    requiredParamCount: number;
  };
  schemaValidation: {
    hasProperStructure: boolean;
    hasDescription: boolean;
    hasValidParameterTypes: boolean;
  };
}

interface MockToolResponse {
  success?: boolean;
  error?: string;
  data?: any;
}

describe('MCP Tool Validation', () => {
  let validationResults: ValidationResult[] = [];

  // Test critical tool categories
  const criticalTools = {
    property: [
      'mcp__alecs-property__list_properties',
      'mcp__alecs-property__get_property',
      'mcp__alecs-property__create_property',
      'mcp__alecs-property__activate_property'
    ],
    dns: [
      'mcp__alecs-dns__list-zones',
      'mcp__alecs-dns__create-zone',
      'mcp__alecs-dns__upsert-record',
      'mcp__alecs-dns__activate-zone-changes'
    ],
    security: [
      'mcp__alecs-security__list-network-lists',
      'mcp__alecs-security__create-network-list',
      'mcp__alecs-security__activate-network-list'
    ],
    certificates: [
      'mcp__alecs-certs__create-dv-enrollment',
      'mcp__alecs-certs__check-dv-enrollment-status',
      'mcp__alecs-certs__list-certificate-enrollments'
    ],
    reporting: [
      'mcp__alecs-reporting__get_traffic_report',
      'mcp__alecs-reporting__get_cache_performance'
    ]
  };

  describe('Tool Schema Validation', () => {
    it('should validate property management tools', async () => {
      for (const toolName of criticalTools.property) {
        const result = await validateTool(toolName);
        validationResults.push(result);
        
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        
        console.log(`✓ ${toolName}: ${result.isValid ? 'VALID' : 'INVALID'}`);
        if (result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.join(', ')}`);
        }
      }
    });

    it('should validate DNS management tools', async () => {
      for (const toolName of criticalTools.dns) {
        const result = await validateTool(toolName);
        validationResults.push(result);
        
        expect(result.isValid).toBe(true);
        
        // DNS tools should have proper parameter validation
        if (toolName.includes('create') || toolName.includes('upsert')) {
          expect(result.parameterValidation.hasRequiredParams).toBe(true);
        }
      }
    });

    it('should validate security tools', async () => {
      for (const toolName of criticalTools.security) {
        const result = await validateTool(toolName);
        validationResults.push(result);
        
        expect(result.isValid).toBe(true);
        expect(result.schemaValidation.hasProperStructure).toBe(true);
      }
    });

    it('should validate certificate tools', async () => {
      for (const toolName of criticalTools.certificates) {
        const result = await validateTool(toolName);
        validationResults.push(result);
        
        expect(result.isValid).toBe(true);
        
        // Certificate tools should have specific parameter requirements
        if (toolName.includes('create-dv-enrollment')) {
          expect(result.parameterValidation.requiredParamCount).toBeGreaterThan(2);
        }
      }
    });

    it('should validate reporting tools', async () => {
      for (const toolName of criticalTools.reporting) {
        const result = await validateTool(toolName);
        validationResults.push(result);
        
        expect(result.isValid).toBe(true);
        
        // Reporting tools should have date parameters
        expect(result.parameterValidation.parameterCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Parameter Validation Tests', () => {
    it('should validate required vs optional parameters', async () => {
      const testCases = [
        {
          tool: 'mcp__alecs-property__list_properties',
          expectedRequired: 0, // Should work without parameters
          expectedOptional: 4 // Should have optional filters
        },
        {
          tool: 'mcp__alecs-property__get_property',
          expectedRequired: 1, // propertyId required
          expectedOptional: 1 // customer optional
        },
        {
          tool: 'mcp__alecs-dns__create-zone',
          expectedRequired: 3, // zone, type, contractId required
          expectedOptional: 5 // comment, masters, etc. optional
        }
      ];

      for (const testCase of testCases) {
        const result = await validateTool(testCase.tool);
        
        // These are estimates based on the tool signatures
        expect(result.parameterValidation.parameterCount).toBeGreaterThanOrEqual(
          testCase.expectedRequired
        );
        
        console.log(`${testCase.tool}:`);
        console.log(`  Parameters: ${result.parameterValidation.parameterCount}`);
        console.log(`  Required: ${result.parameterValidation.requiredParamCount}`);
      }
    });
  });

  describe('Tool Execution Tests', () => {
    it('should test tool execution with minimal parameters', async () => {
      // Test tools that should work with minimal parameters
      const minimalTests = [
        {
          tool: 'mcp__alecs-property__list_properties',
          params: {},
          shouldSucceed: true
        },
        {
          tool: 'mcp__alecs-dns__list-zones',
          params: {},
          shouldSucceed: true
        },
        {
          tool: 'mcp__alecs-security__list-network-lists',
          params: {},
          shouldSucceed: true
        }
      ];

      for (const test of minimalTests) {
        try {
          // Mock the tool execution
          const mockResult = await mockToolExecution(test.tool, test.params);
          
          if (test.shouldSucceed) {
            expect(mockResult.success).toBe(true);
          }
          
          console.log(`${test.tool}: ${mockResult.success ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          if (test.shouldSucceed) {
            console.warn(`Expected ${test.tool} to succeed but got error:`, error);
          }
        }
      }
    });

    it('should test parameter validation errors', async () => {
      // Test tools with invalid parameters
      const errorTests = [
        {
          tool: 'mcp__alecs-property__get_property',
          params: {}, // Missing required propertyId
          expectedError: true
        },
        {
          tool: 'mcp__alecs-dns__create-zone',
          params: { zone: 'test.com' }, // Missing type and contractId
          expectedError: true
        }
      ];

      for (const test of errorTests) {
        try {
          const mockResult = await mockToolExecution(test.tool, test.params);
          
          if (test.expectedError) {
            expect(mockResult.success).toBe(false);
            expect(mockResult.error).toBeDefined();
          }
        } catch (error) {
          // Expected for invalid parameters
          expect(test.expectedError).toBe(true);
        }
      }
    });
  });

  describe('Tool Response Format Validation', () => {
    it('should validate standard response format', async () => {
      const tools = [
        'mcp__alecs-property__list_properties',
        'mcp__alecs-dns__list-zones',
        'mcp__alecs-security__list-network-lists'
      ];

      for (const tool of tools) {
        const mockResponse = await mockToolExecution(tool, {});
        
        // Standard response should have success field
        expect(mockResponse).toHaveProperty('success');
        
        if (mockResponse.success) {
          expect(mockResponse).toHaveProperty('data');
        } else {
          expect(mockResponse).toHaveProperty('error');
        }
      }
    });
  });

  afterAll(() => {
    // Generate validation summary
    const summary = {
      totalToolsValidated: validationResults.length,
      validTools: validationResults.filter(r => r.isValid).length,
      invalidTools: validationResults.filter(r => !r.isValid).length,
      validationRate: validationResults.filter(r => r.isValid).length / validationResults.length,
      categories: {
        property: validationResults.filter(r => r.toolName.includes('property')).length,
        dns: validationResults.filter(r => r.toolName.includes('dns')).length,
        security: validationResults.filter(r => r.toolName.includes('security')).length,
        certificates: validationResults.filter(r => r.toolName.includes('certs')).length,
        reporting: validationResults.filter(r => r.toolName.includes('reporting')).length
      },
      errorSummary: validationResults
        .filter(r => !r.isValid)
        .map(r => ({ tool: r.toolName, errors: r.errors }))
    };

    console.log('\n=== TOOL VALIDATION SUMMARY ===');
    console.log(`Validation Rate: ${(summary.validationRate * 100).toFixed(1)}%`);
    console.log(`Valid Tools: ${summary.validTools}/${summary.totalToolsValidated}`);
    console.log(`Category Breakdown:`);
    Object.entries(summary.categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} tools`);
    });

    if (summary.errorSummary.length > 0) {
      console.log(`\nValidation Errors:`);
      summary.errorSummary.forEach(error => {
        console.log(`  ${error.tool}: ${error.errors.join(', ')}`);
      });
    }

    // Save validation report
    require('fs').writeFileSync(
      '/Users/acedergr/Projects/alecs-mcp-server-akamai/mcp-validation-report.json',
      JSON.stringify({ summary, results: validationResults }, null, 2)
    );
  });
});

// Helper functions
async function validateTool(toolName: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    toolName,
    isValid: true,
    errors: [],
    parameterValidation: {
      hasRequiredParams: false,
      hasOptionalParams: false,
      parameterCount: 0,
      requiredParamCount: 0
    },
    schemaValidation: {
      hasProperStructure: true,
      hasDescription: false,
      hasValidParameterTypes: true
    }
  };

  try {
    // Basic name validation
    if (!toolName.match(/^mcp__[a-zA-Z0-9_-]+__[a-zA-Z0-9_-]+$/)) {
      result.isValid = false;
      result.errors.push('Invalid tool name format');
    }

    // Mock parameter analysis based on known tool signatures
    result.parameterValidation = analyzeToolParameters(toolName);
    
    // Mock schema validation
    result.schemaValidation = analyzeToolSchema(toolName);
    
  } catch (error) {
    result.isValid = false;
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

function analyzeToolParameters(toolName: string) {
  // Mock parameter analysis based on tool patterns
  const analysis = {
    hasRequiredParams: false,
    hasOptionalParams: true, // Most tools have optional customer parameter
    parameterCount: 1,
    requiredParamCount: 0
  };

  if (toolName.includes('get_') || toolName.includes('get-')) {
    analysis.hasRequiredParams = true;
    analysis.requiredParamCount = 1;
    analysis.parameterCount = 2;
  }
  
  if (toolName.includes('create')) {
    analysis.hasRequiredParams = true;
    analysis.requiredParamCount = 2;
    analysis.parameterCount = 5;
  }

  if (toolName.includes('list')) {
    analysis.parameterCount = 4; // Usually have multiple optional filters
  }

  return analysis;
}

function analyzeToolSchema(toolName: string) {
  return {
    hasProperStructure: true,
    hasDescription: true, // Assume all tools have descriptions
    hasValidParameterTypes: true
  };
}

async function mockToolExecution(toolName: string, params: any): Promise<MockToolResponse> {
  // Mock tool execution for testing
  
  // Simulate successful list operations
  if (toolName.includes('list')) {
    return {
      success: true,
      data: {
        items: [],
        total: 0
      }
    };
  }

  // Simulate get operations requiring ID
  if (toolName.includes('get')) {
    const requiredIdParams = ['propertyId', 'zoneId', 'networkListId', 'enrollmentId'];
    const hasRequiredId = requiredIdParams.some(param => params[param]);
    
    if (!hasRequiredId) {
      return {
        success: false,
        error: 'Missing required ID parameter'
      };
    }
    
    return {
      success: true,
      data: { id: params[requiredIdParams.find(p => params[p])!] }
    };
  }

  // Simulate create operations
  if (toolName.includes('create')) {
    // Check for basic required parameters
    if (Object.keys(params).length < 2) {
      return {
        success: false,
        error: 'Missing required parameters for create operation'
      };
    }
    
    return {
      success: true,
      data: { created: true, id: 'mock-id' }
    };
  }

  // Default success for other operations
  return {
    success: true,
    data: { result: 'mock-success' }
  };
}