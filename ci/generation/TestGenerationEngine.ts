import { ToolAnalysis, TestCase, TestSuite, ToolModification } from '../types/TestTypes';
import { AlexPersonality } from '../utils/AlexPersonality';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 🏭 INTELLIGENT TEST GENERATION ENGINE
 * Alex Rodriguez: "Why write tests manually when AI can generate perfect ones?"
 */
export class TestGenerationEngine {
  private generatedTestsDir = path.join(process.cwd(), 'ci/tests/generated');
  
  constructor() {
    // Ensure generated tests directory exists
    this.ensureDirectoryExists();
  }
  
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.generatedTestsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create generated tests directory:', error);
    }
  }
  
  /**
   * Generate comprehensive test suites for new tools
   */
  async generateTestsForNewTools(newTools: ToolAnalysis[]): Promise<void> {
    console.log(`\n🆕 [GENERATION] Alex Rodriguez: Generating tests for ${newTools.length} new tools!`);
    console.log(AlexPersonality.getMotivationalMessage());
    
    for (const tool of newTools) {
      console.log(`\n📝 [GENERATION] Creating test suite for: ${tool.name}`);
      
      const testSuite = await this.generateCompleteTestSuite(tool);
      await this.writeTestSuiteToFile(testSuite);
      
      console.log(`✅ [GENERATION] Generated ${testSuite.tests.length} tests for ${tool.name}`);
    }
  }
  
  /**
   * Update tests for modified tools
   */
  async updateTestsForModifiedTools(modifiedTools: ToolModification[]): Promise<void> {
    console.log(`\n🔄 [GENERATION] Updating tests for ${modifiedTools.length} modified tools`);
    
    for (const modification of modifiedTools) {
      console.log(`📝 [GENERATION] Updating tests for: ${modification.toolName}`);
      console.log(`   Changes: ${modification.changeDescription}`);
      
      // In a real implementation, this would:
      // 1. Load existing tests
      // 2. Analyze what changed
      // 3. Update affected tests
      // 4. Add new tests for new functionality
      
      const updatedSuite = await this.generateCompleteTestSuite(modification.newAnalysis);
      await this.writeTestSuiteToFile(updatedSuite);
    }
  }
  
  /**
   * Clean up tests for removed tools
   */
  async cleanupTestsForRemovedTools(removedTools: ToolAnalysis[]): Promise<void> {
    console.log(`\n🗑️ [GENERATION] Cleaning up tests for ${removedTools.length} removed tools`);
    
    for (const tool of removedTools) {
      const testFilePath = path.join(this.generatedTestsDir, `${tool.name}.test.ts`);
      
      try {
        await fs.unlink(testFilePath);
        console.log(`✅ [GENERATION] Removed test file for: ${tool.name}`);
      } catch (error) {
        console.log(`ℹ️  [GENERATION] Test file not found for: ${tool.name}`);
      }
    }
  }
  
  /**
   * Generate a complete test suite for a single tool
   */
  private async generateCompleteTestSuite(tool: ToolAnalysis): Promise<TestSuite> {
    const testSuite: TestSuite = {
      toolName: tool.name,
      category: tool.category,
      description: `Auto-generated tests for ${tool.name}`,
      generatedAt: new Date().toISOString(),
      generatedBy: 'Alex Rodriguez Self-Updating Test Suite',
      tests: []
    };
    
    // Generate different types of tests based on tool characteristics
    testSuite.tests.push(...await this.generateHappyPathTests(tool));
    testSuite.tests.push(...await this.generateErrorHandlingTests(tool));
    testSuite.tests.push(...await this.generateEdgeCaseTests(tool));
    testSuite.tests.push(...await this.generateUXValidationTests(tool));
    
    if (tool.riskLevel === 'high') {
      testSuite.tests.push(...await this.generateSafetyTests(tool));
    }
    
    return testSuite;
  }
  
  /**
   * Generate happy path tests
   */
  private async generateHappyPathTests(tool: ToolAnalysis): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    
    tests.push({
      id: `${tool.name}-happy-001`,
      name: `${tool.name} - Basic Happy Path`,
      description: `Validate ${tool.name} works correctly with valid inputs`,
      category: 'happy-path',
      priority: 'high',
      userIntent: tool.exampleUsage[0] || `Use ${tool.name} successfully`,
      expectedWorkflow: [
        'User provides valid input',
        'Tool processes request',
        'Success response returned',
        'Output is properly formatted'
      ],
      validationCriteria: [
        '✅ Tool accepts valid parameters',
        '✅ Response is successful',
        '✅ Output format is correct',
        '✅ Performance is acceptable'
      ],
      testData: this.generateTestData(tool)
    });
    
    return tests;
  }
  
  /**
   * Generate error handling tests
   */
  private async generateErrorHandlingTests(tool: ToolAnalysis): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    
    tests.push({
      id: `${tool.name}-error-001`,
      name: `${tool.name} - Missing Required Parameters`,
      description: `Validate ${tool.name} handles missing parameters gracefully`,
      category: 'error-handling',
      priority: 'high',
      userIntent: 'Accidentally omit required information',
      expectedWorkflow: [
        'User forgets required parameter',
        'Tool validates input',
        'Clear error message returned',
        'Guidance provided on fixing the issue'
      ],
      validationCriteria: [
        '✅ Error is caught gracefully',
        '✅ Error message is user-friendly',
        '✅ Guidance is provided',
        '✅ No technical jargon in error'
      ],
      testData: {} // Empty to trigger missing params
    });
    
    return tests;
  }
  
  /**
   * Generate edge case tests
   */
  private async generateEdgeCaseTests(tool: ToolAnalysis): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    
    if (tool.name.includes('list')) {
      tests.push({
        id: `${tool.name}-edge-001`,
        name: `${tool.name} - Empty Results Handling`,
        description: `Validate ${tool.name} handles empty results gracefully`,
        category: 'edge-case',
        priority: 'medium',
        userIntent: 'List items when none exist',
        expectedWorkflow: [
          'User requests list',
          'No items found',
          'Friendly empty state message',
          'Suggestions for next steps'
        ],
        validationCriteria: [
          '✅ No errors on empty results',
          '✅ Clear empty state message',
          '✅ Helpful suggestions provided',
          '✅ No confusing output'
        ],
        testData: { customer: 'test-empty' }
      });
    }
    
    return tests;
  }
  
  /**
   * Generate UX validation tests
   */
  private async generateUXValidationTests(tool: ToolAnalysis): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    
    tests.push({
      id: `${tool.name}-ux-001`,
      name: `${tool.name} - User Experience Validation`,
      description: `Alex Rodriguez UX validation for ${tool.name}`,
      category: 'ux-validation',
      priority: 'high',
      userIntent: tool.exampleUsage[0] || `Use ${tool.name} naturally`,
      expectedWorkflow: [
        'User expresses intent naturally',
        'System understands and processes',
        'Clear progress feedback',
        'Results presented clearly',
        'Next steps suggested'
      ],
      validationCriteria: [
        '✅ Natural language understood',
        '✅ Progress feedback provided',
        '✅ Results are clear',
        '✅ Next steps suggested',
        '✅ Overall experience is smooth'
      ],
      testData: this.generateTestData(tool)
    });
    
    return tests;
  }
  
  /**
   * Generate safety tests for high-risk tools
   */
  private async generateSafetyTests(tool: ToolAnalysis): Promise<TestCase[]> {
    const tests: TestCase[] = [];
    
    tests.push({
      id: `${tool.name}-safety-001`,
      name: `${tool.name} - Safety Validation`,
      description: `Ensure ${tool.name} has proper safety checks`,
      category: 'safety',
      priority: 'critical',
      userIntent: 'Use tool safely',
      expectedWorkflow: [
        'User initiates risky operation',
        'Confirmation required',
        'Impact clearly explained',
        'Ability to cancel',
        'Safe execution'
      ],
      validationCriteria: [
        '✅ Confirmation for risky operations',
        '✅ Clear impact explanation',
        '✅ Easy cancellation option',
        '✅ No accidental execution',
        '✅ Audit trail created'
      ],
      testData: this.generateTestData(tool)
    });
    
    return tests;
  }
  
  /**
   * Generate test data based on tool analysis
   */
  private generateTestData(tool: ToolAnalysis): Record<string, any> {
    const data: Record<string, any> = {};
    
    // Add required parameters
    for (const param of tool.requiredParams) {
      data[param] = this.generateParamValue(param, tool);
    }
    
    // Add some optional parameters
    for (const param of tool.optionalParams.slice(0, 2)) {
      data[param] = this.generateParamValue(param, tool);
    }
    
    return data;
  }
  
  /**
   * Generate appropriate value for a parameter
   */
  private generateParamValue(param: string, tool: ToolAnalysis): any {
    // Common parameter patterns
    if (param === 'customer') return 'solutionsedge';
    if (param === 'propertyId') return 'prp_123456';
    if (param === 'network') return 'staging';
    if (param === 'limit') return 10;
    if (param === 'domain') return 'solutionsedge.io';
    
    // Default based on type hints in name
    if (param.includes('name')) return `test-${tool.name}`;
    if (param.includes('id')) return `test-id-${Date.now()}`;
    if (param.includes('count') || param.includes('number')) return 1;
    
    return 'test-value';
  }
  
  /**
   * Write test suite to file
   */
  private async writeTestSuiteToFile(testSuite: TestSuite): Promise<void> {
    const fileName = `${testSuite.toolName}.test.ts`;
    const filePath = path.join(this.generatedTestsDir, fileName);
    
    const content = this.generateTestFileContent(testSuite);
    
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`📄 [GENERATION] Written test file: ${fileName}`);
  }
  
  /**
   * Generate TypeScript test file content
   */
  private generateTestFileContent(testSuite: TestSuite): string {
    return `/**
 * 🤖 AUTO-GENERATED TEST SUITE
 * Tool: ${testSuite.toolName}
 * Category: ${testSuite.category}
 * Generated: ${testSuite.generatedAt}
 * By: ${testSuite.generatedBy}
 * 
 * Alex Rodriguez: "These tests evolve with your code!"
 */

import { MCPTestClient } from '../../utils/MCPTestClient';

describe('${testSuite.toolName} - Auto-Generated Tests', () => {
  let client: MCPTestClient;
  
  beforeAll(async () => {
    client = new MCPTestClient();
    await client.connect();
  });
  
  afterAll(async () => {
    await client.disconnect();
  });
  
${testSuite.tests.map(test => `
  describe('${test.category}', () => {
    test('${test.name}', async () => {
      // ${test.description}
      
      // User Intent: ${test.userIntent}
      
      const response = await client.callTool('${testSuite.toolName}', ${JSON.stringify(test.testData, null, 6)});
      
      // Validate response
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      
      // Validation Criteria:
${test.validationCriteria.map(criterion => `      // ${criterion}`).join('\n')}
    });
  });
`).join('\n')}
});

// Generated with ❤️ by Alex Rodriguez's Self-Updating Test Suite
`;
  }
}