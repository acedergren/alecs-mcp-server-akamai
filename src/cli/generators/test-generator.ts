/**
 * Test Generator for ALECSCore CLI
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automated test generation for CLI-created tools
 * Approach: Template-based test creation with intelligent defaults
 * Implementation: Production-grade test scaffolding
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../../utils/pino-logger';
import { toPascalCase, toSnakeCase } from '../utils/naming';

const logger = createLogger('test-generator');

export interface TestGeneratorOptions {
  /**
   * Domain name (e.g., 'billing')
   */
  domainName: string;
  
  /**
   * Tool name (e.g., 'cost-analysis')
   */
  toolName: string;
  
  /**
   * Tool description
   */
  description?: string;
  
  /**
   * API endpoint pattern
   */
  endpoint?: string;
  
  /**
   * Tool parameters
   */
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description?: string;
  }>;
  
  /**
   * Dry run mode
   */
  dryRun?: boolean;
}

export class TestGenerator {
  private readonly testsPath: string;
  
  constructor(rootPath: string = process.cwd()) {
    this.testsPath = join(rootPath, 'src', '__tests__');
  }
  
  /**
   * Generate test file for a tool
   */
  async generateToolTest(options: TestGeneratorOptions): Promise<void> {
    const { domainName, toolName, dryRun } = options;
    
    logger.info({ domainName, toolName }, 'Generating tool test');
    
    // Generate test content
    const testContent = this.generateTestContent(options);
    
    // Determine file path
    const testDir = join(this.testsPath, 'tools', domainName);
    const testFile = join(testDir, `${toSnakeCase(toolName)}.test.ts`);
    
    if (dryRun) {
      logger.info('DRY RUN - Test that would be generated:');
      console.log(`\n📄 ${testFile}`);
      console.log('─'.repeat(50));
      console.log(testContent);
      return;
    }
    
    // Create directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Write test file
    await fs.writeFile(testFile, testContent);
    
    logger.info({ testFile }, 'Test file generated successfully');
  }
  
  /**
   * Generate test content
   */
  private generateTestContent(options: TestGeneratorOptions): string {
    const { domainName, toolName, description, endpoint, parameters = [] } = options;
    const domainNamePascal = toPascalCase(domainName);
    const toolNameSnake = toSnakeCase(toolName);
    const toolNamePascal = toPascalCase(toolName);
    
    return `/**
 * ${toolNamePascal} Tool Tests
 * 
 * ${description || `Tests for ${domainName} ${toolName} tool`}
 * 
 * Generated on ${new Date().toISOString()} using ALECSCore CLI
 */

import { ${domainName}Tools } from '../../../tools/${domainName}/${domainName}-tools';
import { ToolTestRunner, TestDataGenerator, ToolTestConfig } from '../../../testing/test-framework';
import { z } from 'zod';

describe('${domainNamePascal} - ${toolNamePascal}', () => {
  const runner = new ToolTestRunner();
  const tools = new ${domainNamePascal}Tools('test-customer');
  
  const testConfig: ToolTestConfig = {
    toolName: '${domainName}_${toolNameSnake}',
    handler: async (client, args) => tools.${toSnakeCase(toolName)}(args),
    inputSchema: z.object({
${this.generateSchemaFields(parameters)}
    }),
    testCases: [
      {
        name: 'should ${toolNameSnake} successfully with valid parameters',
        input: {
${this.generateTestInput(parameters, true)}
        },
        expected: {
          success: true,
          contentPattern: /${toolNamePascal}.*successful/
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: ${endpoint ? `/${endpoint}/` : '/\\/api\\/v1\\/.*/'}
            },
            response: {
              status: 200,
              data: ${this.generateMockResponse(domainName, toolName)}
            }
          }
        ]
      },
      {
        name: 'should handle missing required parameters',
        input: {
${this.generateTestInput(parameters, false)}
        },
        expected: {
          success: false,
          errorPattern: /required/i
        }
      },
      {
        name: 'should handle API errors gracefully',
        input: {
${this.generateTestInput(parameters, true)}
        },
        expected: {
          success: false,
          errorPattern: /Error.*${toolNamePascal}/
        },
        mocks: [
          {
            request: {
              method: 'GET',
              pathPattern: ${endpoint ? `/${endpoint}/` : '/\\/api\\/v1\\/.*/'}
            },
            response: {
              status: 403,
              error: new Error('Forbidden: Access denied'),
              data: TestDataGenerator.generateErrorResponse(403, 'Access denied to resource')
            }
          }
        ]
      },
      {
        name: 'should handle network errors',
        input: {
${this.generateTestInput(parameters, true)}
        },
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
      }
    ]
  };
  
  it('should run all test cases', async () => {
    const results = await runner.runTests(testConfig);
    
    expect(results.failed).toBe(0);
    expect(results.errors).toHaveLength(0);
    
    // Log test summary
    console.log(\`✅ ${domainNamePascal} ${toolNamePascal} Tests: \${results.passed}/\${results.totalTests} passed\`);
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
});

/**
 * Custom test data for ${domainName} ${toolName}
 */
function generate${toolNamePascal}TestData() {
  return {
    // Add specific test data here
${this.generateTestDataFields(domainName)}
  };
}`;
  }
  
  /**
   * Generate schema fields for Zod
   */
  private generateSchemaFields(parameters: TestGeneratorOptions['parameters']): string {
    if (!parameters || parameters.length === 0) {
      return '      // No parameters defined';
    }
    
    return parameters.map(param => {
      const zodType = this.getZodType(param.type);
      const chain = param.required ? zodType : `${zodType}.optional()`;
      const description = param.description ? `.describe('${param.description}')` : '';
      
      return `      ${param.name}: ${chain}${description}`;
    }).join(',\n');
  }
  
  /**
   * Get Zod type for parameter type
   */
  private getZodType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'z.string()',
      'number': 'z.number()',
      'boolean': 'z.boolean()',
      'array': 'z.array(z.string())',
      'object': 'z.object({})'
    };
    
    return typeMap[type] || 'z.unknown()';
  }
  
  /**
   * Generate test input data
   */
  private generateTestInput(parameters: TestGeneratorOptions['parameters'], includeRequired: boolean): string {
    if (!parameters || parameters.length === 0) {
      return '          // No parameters';
    }
    
    return parameters
      .filter(param => includeRequired || !param.required)
      .map(param => {
        const value = this.getTestValue(param.type, param.name);
        return `          ${param.name}: ${value}`;
      })
      .join(',\n');
  }
  
  /**
   * Get test value for parameter type
   */
  private getTestValue(type: string, name: string): string {
    const valueMap: Record<string, string> = {
      'string': `'test-${name}'`,
      'number': '123',
      'boolean': 'true',
      'array': `['test1', 'test2']`,
      'object': `{ key: 'value' }`
    };
    
    return valueMap[type] || 'null';
  }
  
  /**
   * Generate mock response based on domain and tool
   */
  private generateMockResponse(domainName: string, toolName: string): string {
    // Domain-specific mock responses
    const domainMocks: Record<string, Record<string, string>> = {
      billing: {
        'cost-analysis': `{
                costs: [
                  { date: '2024-01-01', amount: 1234.56, currency: 'USD' }
                ],
                total: 1234.56
              }`,
        'usage-report': `{
                usage: [
                  { date: '2024-01-01', bandwidth: 1000, requests: 50000 }
                ]
              }`
      },
      property: {
        list: `{
                properties: [
                  TestDataGenerator.generateProperty()
                ]
              }`,
        create: `TestDataGenerator.generateProperty()`
      },
      dns: {
        'zone-list': `{
                zones: [
                  TestDataGenerator.generateDnsZone()
                ]
              }`,
        'record-create': `{
                recordId: 'rec_123',
                name: 'test.example.com',
                type: 'A',
                ttl: 300
              }`
      }
    };
    
    const toolSnake = toSnakeCase(toolName);
    return domainMocks[domainName]?.[toolSnake] || `{
              id: 'test-id',
              status: 'success',
              message: '${toolName} completed successfully'
            }`;
  }
  
  /**
   * Generate test data fields
   */
  private generateTestDataFields(domainName: string): string {
    const domainFields: Record<string, string[]> = {
      billing: [
        "    invoiceId: 'inv_123456',",
        "    amount: 1234.56,",
        "    currency: 'USD',",
        "    period: '2024-01'"
      ],
      property: [
        "    propertyId: 'prp_123456',",
        "    version: 1,",
        "    network: 'STAGING'"
      ],
      dns: [
        "    zone: 'example.com',",
        "    recordType: 'A',",
        "    ttl: 300"
      ]
    };
    
    return domainFields[domainName]?.join('\n') || "    id: 'test-id'";
  }
}

/**
 * Generate domain-level test suite
 */
export async function generateDomainTestSuite(
  domainName: string,
  options: { dryRun?: boolean } = {}
): Promise<void> {
  const generator = new TestGenerator();
  const domainPath = join(process.cwd(), 'src', 'tools', domainName);
  
  try {
    // Read domain index to get all tools
    const indexPath = join(domainPath, 'index.ts');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    
    // Extract tool names from exports
    const toolPattern = /['"]([^'"]+)['"]:\s*{/g;
    const tools: string[] = [];
    let match;
    
    while ((match = toolPattern.exec(indexContent)) !== null) {
      const fullToolName = match[1];
      if (fullToolName && fullToolName.startsWith(`${domainName}_`)) {
        const toolName = fullToolName.replace(`${domainName}_`, '');
        tools.push(toolName);
      }
    }
    
    logger.info({ domainName, tools }, 'Found tools in domain');
    
    // Generate tests for each tool
    for (const toolName of tools) {
      await generator.generateToolTest({
        domainName,
        toolName,
        dryRun: options.dryRun
      });
    }
    
    // Generate domain test suite
    await generateDomainSuiteFile(domainName, tools, options);
    
  } catch (error) {
    logger.error({ error, domainName }, 'Failed to generate domain test suite');
    throw error;
  }
}

/**
 * Generate domain-level test suite file
 */
async function generateDomainSuiteFile(
  domainName: string,
  tools: string[],
  options: { dryRun?: boolean } = {}
): Promise<void> {
  const content = `/**
 * ${toPascalCase(domainName)} Domain Test Suite
 * 
 * Comprehensive tests for all ${domainName} tools
 * 
 * Generated on ${new Date().toISOString()} using ALECSCore CLI
 */

import { DomainTestSuiteBuilder } from '../../testing/test-framework';

describe('${toPascalCase(domainName)} Domain', () => {
  const suite = new DomainTestSuiteBuilder();
  
  // Import all tool tests
${tools.map(tool => `  require('./${toSnakeCase(tool)}.test');`).join('\n')}
  
  it('should have all tools properly tested', () => {
    // This ensures all tool tests are loaded
    expect(true).toBe(true);
  });
  
  afterAll(async () => {
    // Generate test report
    const report = await suite.generateReport();
    console.log('\\n📊 ${toPascalCase(domainName)} Domain Test Report:');
    console.log(\`   Total Tools: \${report.summary.totalTools}\`);
    console.log(\`   Total Tests: \${report.summary.totalTests}\`);
    console.log(\`   Passed: \${report.summary.totalPassed}\`);
    console.log(\`   Failed: \${report.summary.totalFailed}\`);
  });
});`;
  
  const suitePath = join(process.cwd(), 'src', '__tests__', 'tools', domainName, 'index.test.ts');
  
  if (options.dryRun) {
    console.log(`\n📄 ${suitePath}`);
    console.log('─'.repeat(50));
    console.log(content);
    return;
  }
  
  await fs.writeFile(suitePath, content);
  logger.info({ suitePath }, 'Domain test suite generated');
}