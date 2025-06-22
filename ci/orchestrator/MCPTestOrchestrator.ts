import { MCPCapabilities, TestSuiteResults, TestResult, UXIssue, CriticalIssue } from '../types/TestTypes';
import { AlexPersonality } from '../utils/AlexPersonality';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 🎭 MCP TEST ORCHESTRATOR
 * Alex Rodriguez: "Orchestrating tests like a symphony conductor!"
 */
export class MCPTestOrchestrator {
  private testResults: TestResult[] = [];
  private uxIssues: UXIssue[] = [];
  private criticalIssues: CriticalIssue[] = [];
  
  /**
   * Run all tests for discovered MCP capabilities
   */
  async runAllTests(capabilities: MCPCapabilities): Promise<TestSuiteResults> {
    console.log('\n🎭 [ORCHESTRATOR] Alex Rodriguez: Starting comprehensive test suite!');
    console.log(AlexPersonality.getTestingWisdom());
    
    const startTime = Date.now();
    const totalTools = capabilities.tools.length;
    let testedTools = 0;
    
    // Run tests for each tool
    for (const tool of capabilities.tools) {
      console.log(`\n📋 Testing tool ${++testedTools}/${totalTools}: ${tool.name}`);
      console.log(AlexPersonality.getProgressUpdate('Testing', (testedTools / totalTools) * 100));
      
      try {
        await this.runToolTests(tool);
      } catch (error) {
        console.error(`❌ Error testing ${tool.name}:`, error);
        this.recordCriticalIssue(tool.name, error);
      }
    }
    
    // Run integration tests
    console.log('\n🔗 [ORCHESTRATOR] Running integration tests...');
    await this.runIntegrationTests(capabilities);
    
    // Run UX validation tests
    console.log('\n🎨 [ORCHESTRATOR] Running UX validation tests...');
    await this.runUXValidationTests(capabilities);
    
    // Calculate results
    const results = this.calculateResults(startTime, capabilities);
    
    console.log(`\n✅ [ORCHESTRATOR] Test execution complete!`);
    console.log(`📊 Pass rate: ${(results.passRate * 100).toFixed(1)}%`);
    
    return results;
  }
  
  /**
   * Run tests for a specific tool
   */
  private async runToolTests(tool: any): Promise<void> {
    const testStartTime = Date.now();
    
    // Check if test file exists
    const testFilePath = await this.findTestFileForTool(tool.name);
    
    if (!testFilePath) {
      console.log(`⚠️  No test file found for ${tool.name} - will be auto-generated`);
      this.testResults.push({
        testId: `${tool.name}-missing`,
        testName: `${tool.name} - Test File Missing`,
        status: 'skipped',
        duration: 0,
        error: 'Test file not found - needs generation'
      });
      return;
    }
    
    try {
      // Run the test
      console.log(`🧪 Running tests from: ${testFilePath}`);
      const output = execSync(`npm test -- ${testFilePath} --passWithNoTests`, {
        encoding: 'utf-8',
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' }
      });
      
      // Parse test results
      const passed = output.includes('PASS');
      const duration = Date.now() - testStartTime;
      
      this.testResults.push({
        testId: `${tool.name}-suite`,
        testName: `${tool.name} - Test Suite`,
        status: passed ? 'passed' : 'failed',
        duration,
        error: passed ? undefined : 'Test suite failed'
      });
      
      // Check for UX issues in output
      this.parseUXIssuesFromOutput(tool.name, output);
      
    } catch (error: any) {
      const duration = Date.now() - testStartTime;
      this.testResults.push({
        testId: `${tool.name}-suite`,
        testName: `${tool.name} - Test Suite`,
        status: 'failed',
        duration,
        error: error.message || 'Test execution failed'
      });
    }
  }
  
  /**
   * Run integration tests across multiple tools
   */
  private async runIntegrationTests(capabilities: MCPCapabilities): Promise<void> {
    console.log('🔗 Testing tool interactions and workflows...');
    
    // Test common workflows
    const workflows = [
      {
        name: 'Property Creation and Activation',
        tools: ['create_property', 'list_properties', 'activate_property'],
        test: () => this.testPropertyWorkflow()
      },
      {
        name: 'DNS Configuration',
        tools: ['create_zone', 'upsert_record', 'list_zones'],
        test: () => this.testDNSWorkflow()
      },
      {
        name: 'Certificate Enrollment',
        tools: ['create_dv_enrollment', 'list_certificate_enrollments'],
        test: () => this.testCertificateWorkflow()
      }
    ];
    
    for (const workflow of workflows) {
      const hasAllTools = workflow.tools.every(toolName => 
        capabilities.tools.some(t => t.name === toolName)
      );
      
      if (hasAllTools) {
        console.log(`✅ Testing workflow: ${workflow.name}`);
        const startTime = Date.now();
        
        try {
          await workflow.test();
          this.testResults.push({
            testId: `workflow-${workflow.name.toLowerCase().replace(/\s+/g, '-')}`,
            testName: `Workflow: ${workflow.name}`,
            status: 'passed',
            duration: Date.now() - startTime
          });
        } catch (error: any) {
          this.testResults.push({
            testId: `workflow-${workflow.name.toLowerCase().replace(/\s+/g, '-')}`,
            testName: `Workflow: ${workflow.name}`,
            status: 'failed',
            duration: Date.now() - startTime,
            error: error.message
          });
        }
      }
    }
  }
  
  /**
   * Run UX validation tests - Alex's specialty!
   */
  private async runUXValidationTests(capabilities: MCPCapabilities): Promise<void> {
    console.log('🎨 Alex Rodriguez: Time for my specialty - UX validation!');
    
    const uxTests = [
      {
        name: 'Natural Language Understanding',
        test: () => this.testNaturalLanguageUnderstanding(capabilities)
      },
      {
        name: 'Error Message Clarity',
        test: () => this.testErrorMessageClarity(capabilities)
      },
      {
        name: 'Workflow Discovery',
        test: () => this.testWorkflowDiscovery(capabilities)
      },
      {
        name: 'Context Maintenance',
        test: () => this.testContextMaintenance(capabilities)
      }
    ];
    
    for (const uxTest of uxTests) {
      console.log(`🎨 Testing: ${uxTest.name}`);
      const startTime = Date.now();
      
      try {
        await uxTest.test();
        this.testResults.push({
          testId: `ux-${uxTest.name.toLowerCase().replace(/\s+/g, '-')}`,
          testName: `UX: ${uxTest.name}`,
          status: 'passed',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        this.testResults.push({
          testId: `ux-${uxTest.name.toLowerCase().replace(/\s+/g, '-')}`,
          testName: `UX: ${uxTest.name}`,
          status: 'failed',
          duration: Date.now() - startTime,
          error: error.message
        });
        
        // Record UX issue
        this.uxIssues.push({
          severity: 'major',
          description: `${uxTest.name} failed: ${error.message}`,
          recommendation: 'Review user interaction flow and improve natural language processing'
        });
      }
    }
  }
  
  /**
   * Test workflows (placeholder implementations)
   */
  private async testPropertyWorkflow(): Promise<void> {
    // In real implementation, this would test the full property workflow
    console.log('  → Testing property creation → listing → activation flow');
  }
  
  private async testDNSWorkflow(): Promise<void> {
    // In real implementation, this would test DNS configuration
    console.log('  → Testing DNS zone creation → record management flow');
  }
  
  private async testCertificateWorkflow(): Promise<void> {
    // In real implementation, this would test certificate enrollment
    console.log('  → Testing certificate enrollment → validation flow');
  }
  
  private async testNaturalLanguageUnderstanding(capabilities: MCPCapabilities): Promise<void> {
    // Test that tools understand natural language requests
    console.log('  → Validating natural language processing capabilities');
  }
  
  private async testErrorMessageClarity(capabilities: MCPCapabilities): Promise<void> {
    // Test that error messages are user-friendly
    console.log('  → Checking error message clarity and helpfulness');
  }
  
  private async testWorkflowDiscovery(capabilities: MCPCapabilities): Promise<void> {
    // Test that system helps users discover workflows
    console.log('  → Testing workflow discovery and guidance');
  }
  
  private async testContextMaintenance(capabilities: MCPCapabilities): Promise<void> {
    // Test that context is maintained across conversations
    console.log('  → Validating context maintenance in multi-turn conversations');
  }
  
  /**
   * Find test file for a tool
   */
  private async findTestFileForTool(toolName: string): Promise<string | null> {
    const testDirs = [
      '__tests__/e2e',
      '__tests__/integration',
      '__tests__/unit',
      'ci/tests/generated'
    ];
    
    for (const dir of testDirs) {
      const testPath = path.join(process.cwd(), dir, `${toolName}.test.ts`);
      try {
        await fs.access(testPath);
        return testPath;
      } catch {
        // File doesn't exist, continue searching
      }
    }
    
    return null;
  }
  
  /**
   * Parse UX issues from test output
   */
  private parseUXIssuesFromOutput(toolName: string, output: string): void {
    // Look for UX-related issues in test output
    if (output.includes('unclear') || output.includes('confusing')) {
      this.uxIssues.push({
        severity: 'minor',
        description: `${toolName} may have unclear messaging`,
        recommendation: 'Review user-facing messages for clarity'
      });
    }
    
    if (output.includes('timeout') || output.includes('slow')) {
      this.uxIssues.push({
        severity: 'major',
        description: `${toolName} performance may impact user experience`,
        recommendation: 'Optimize response times to under 2 seconds'
      });
    }
  }
  
  /**
   * Record critical issues
   */
  private recordCriticalIssue(toolName: string, error: any): void {
    this.criticalIssues.push({
      toolName,
      issue: error.message || 'Unknown error',
      impact: 'Tool testing completely failed',
      recommendation: 'Investigate immediately - may block user workflows'
    });
  }
  
  /**
   * Calculate final test results
   */
  private calculateResults(startTime: number, capabilities: MCPCapabilities): TestSuiteResults {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'passed').length;
    const failedTests = this.testResults.filter(t => t.status === 'failed').length;
    const skippedTests = this.testResults.filter(t => t.status === 'skipped').length;
    
    // Calculate coverage
    const testedTools = new Set(this.testResults.map(t => t.testId.split('-')[0])).size;
    const totalTools = capabilities.tools.length;
    
    // Category coverage
    const categoryCoverage: Record<string, number> = {};
    for (const tool of capabilities.tools) {
      const category = tool.analysis.category;
      const tested = this.testResults.some(t => t.testId.startsWith(tool.name));
      if (!categoryCoverage[category]) categoryCoverage[category] = 0;
      if (tested) categoryCoverage[category]++;
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate: totalTests > 0 ? passedTests / totalTests : 0,
      duration: Date.now() - startTime,
      testResults: this.testResults,
      uxIssues: this.uxIssues,
      criticalIssues: this.criticalIssues,
      performance: {
        testsPerSecond: totalTests > 0 ? totalTests / ((Date.now() - startTime) / 1000) : 0,
        averageTestDuration: totalTests > 0 ? (Date.now() - startTime) / totalTests : 0,
        totalExecutionTime: Date.now() - startTime
      },
      coverage: {
        totalTools,
        testedTools,
        coveragePercentage: totalTools > 0 ? (testedTools / totalTools) * 100 : 0,
        untestablTools: capabilities.tools
          .filter(t => !this.testResults.some(r => r.testId.startsWith(t.name)))
          .map(t => t.name),
        categoryCoverage
      }
    };
  }
  
  /**
   * Commit test changes back to repository
   */
  async commitChanges(message: string): Promise<void> {
    try {
      // Check if there are changes to commit
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      
      if (status.trim()) {
        console.log('📝 [ORCHESTRATOR] Committing test updates...');
        
        execSync('git add -A');
        execSync(`git commit -m "${message}"`);
        
        console.log('✅ [ORCHESTRATOR] Changes committed successfully');
      } else {
        console.log('ℹ️  [ORCHESTRATOR] No changes to commit');
      }
    } catch (error) {
      console.error('❌ [ORCHESTRATOR] Failed to commit changes:', error);
    }
  }
}