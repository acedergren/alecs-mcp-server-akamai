/**
 * Property List Tool Tests
 * 
 * Tests for property list operations using the enhanced testing framework
 * 
 * Generated as an example of the ALECSCore testing framework
 */

import { propertyTools } from '../../../tools/property';
import { ToolTestRunner, TestDataGenerator, ToolTestConfig } from '../../../testing/test-framework';
import { TestData, assertSuccessResponse, assertErrorResponse } from '../../../testing/test-helpers';
import { z } from 'zod';

describe('Property - List', () => {
  const runner = new ToolTestRunner();
  
  const testConfig: ToolTestConfig = {
    toolName: 'property_list',
    handler: propertyTools.property_list.handler,
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      customer: z.string().optional()
    }),
    testCases: [
      {
        name: 'should list properties successfully',
        input: {
          limit: 10
        },
        expected: {
          success: true,
          contentPattern: /Found \d+ properties/,
          customAssertions: (response) => {
            assertSuccessResponse(response);
            expect(response.content[0].text).toContain('Properties:');
          }
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: /\/papi\/v1\/properties/
            },
            response: {
              status: 200,
              data: {
                properties: {
                  items: [
                    TestData.property(),
                    TestData.property({
                      propertyId: 'prp_789012',
                      propertyName: 'another-property'
                    })
                  ]
                }
              }
            }
          }
        ]
      },
      {
        name: 'should filter by contract ID',
        input: {
          contractId: 'ctr_TEST123',
          limit: 5
        },
        expected: {
          success: true,
          contentPattern: /Properties:/
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: /\/papi\/v1\/properties/,
              params: {
                contractId: 'ctr_TEST123',
                limit: '5'
              }
            },
            response: {
              status: 200,
              data: {
                properties: {
                  items: [TestData.property()]
                }
              }
            }
          }
        ]
      },
      {
        name: 'should handle empty results',
        input: {
          contractId: 'ctr_EMPTY'
        },
        expected: {
          success: true,
          contentPattern: /No properties found/
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: /\/papi\/v1\/properties/
            },
            response: {
              status: 200,
              data: {
                properties: {
                  items: []
                }
              }
            }
          }
        ]
      },
      {
        name: 'should handle 403 forbidden error',
        input: {
          contractId: 'ctr_FORBIDDEN'
        },
        expected: {
          success: false,
          errorPattern: /Access denied|Forbidden/
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: /\/papi\/v1\/properties/
            },
            response: {
              status: 403,
              error: new Error('Forbidden'),
              data: TestDataGenerator.generateErrorResponse(403, 'Access denied to contract')
            }
          }
        ]
      },
      {
        name: 'should handle network errors gracefully',
        input: {},
        expected: {
          success: false,
          errorPattern: /network|connection/i
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: /.*/
            },
            response: {
              error: new Error('ECONNREFUSED: Connection refused')
            }
          }
        ]
      },
      {
        name: 'should paginate results',
        input: {
          limit: 2,
          offset: 10
        },
        expected: {
          success: true,
          contentPattern: /Properties.*Showing \d+-\d+ of \d+/,
          customAssertions: (response) => {
            expect(response.content[0].text).toContain('Showing');
          }
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: /\/papi\/v1\/properties/
            },
            response: {
              status: 200,
              data: {
                properties: {
                  items: [
                    TestData.property({ propertyName: 'page-2-prop-1' }),
                    TestData.property({ propertyName: 'page-2-prop-2' })
                  ]
                },
                totalItems: 50
              }
            }
          }
        ]
      }
    ],
    responseValidator: (response) => {
      // Ensure all responses have proper structure
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content[0].type).toBe('text');
    }
  };
  
  // Run all tests
  it('should pass all test cases', async () => {
    const results = await runner.runTests(testConfig);
    
    expect(results.failed).toBe(0);
    expect(results.errors).toHaveLength(0);
    
    console.log(`✅ Property List Tests: ${results.passed}/${results.totalTests} passed in ${results.duration}ms`);
  });
  
  // Individual test cases for better granularity
  testConfig.testCases.forEach(testCase => {
    it(testCase.name, async () => {
      const singleTestConfig = {
        ...testConfig,
        testCases: [testCase]
      };
      
      const results = await runner.runTests(singleTestConfig);
      
      if (results.failed > 0) {
        throw new Error(results.errors[0]?.error || 'Test failed');
      }
    });
  });
  
  // Performance test
  it('should complete within performance threshold', async () => {
    const startTime = Date.now();
    
    const results = await runner.runTests({
      ...testConfig,
      testCases: [testConfig.testCases[0]] // Just run one test
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(results.failed).toBe(0);
  });
});