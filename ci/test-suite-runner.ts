#!/usr/bin/env tsx

import { MCPTestOrchestrator } from './orchestrator/MCPTestOrchestrator';
import { DynamicTestDiscovery } from './discovery/DynamicTestDiscovery';
import { TestGenerationEngine } from './generation/TestGenerationEngine';
import { ChangeDetectionService } from './detection/ChangeDetectionService';
import { ReportingService } from './reporting/ReportingService';
import { AlexPersonality } from './utils/AlexPersonality';
import { TestSuiteResults, DetectedChanges } from './types/TestTypes';

/**
 * 🚀 ALEX'S MASTERPIECE: Self-Updating CI Test Suite
 * 
 * This is the future of testing - tests that intelligently adapt to code changes!
 * When new MCP tools are added, tests are automatically generated.
 * When tool signatures change, tests are updated.
 * When tools are removed, tests are cleaned up.
 * 
 * Alex Rodriguez: "I'm building tests that are smarter than most developers!"
 */
export class SelfUpdatingCITestSuite {
  private orchestrator: MCPTestOrchestrator;
  private discovery: DynamicTestDiscovery;
  private generator: TestGenerationEngine;
  private changeDetector: ChangeDetectionService;
  private reporter: ReportingService;

  constructor() {
    console.log('🎯 Alex Rodriguez: Initializing REVOLUTIONARY test suite!');
    console.log(AlexPersonality.getMotivationalMessage());
    
    this.orchestrator = new MCPTestOrchestrator();
    this.discovery = new DynamicTestDiscovery();
    this.generator = new TestGenerationEngine();
    this.changeDetector = new ChangeDetectionService();
    this.reporter = new ReportingService();
  }

  /**
   * Main CI entry point - this runs on every commit!
   */
  async runCITestSuite(): Promise<TestSuiteResults> {
    const startTime = Date.now();
    
    console.log('🚀 [CI] Starting ALECS Self-Updating Test Suite');
    console.log('👨‍💻 [CI] Alex Rodriguez: Making sure this GenAI revolution WORKS!');
    console.log(`📅 [CI] Test run started at: ${new Date().toISOString()}`);
    console.log('─'.repeat(80));
    
    try {
      // PHASE 1: Discover current MCP server capabilities
      console.log('\n🔍 PHASE 1: DISCOVERY');
      const currentCapabilities = await this.discovery.discoverMCPCapabilities();
      console.log(`✅ [CI] Discovered ${currentCapabilities.tools.length} MCP tools`);
      console.log(`📊 [CI] Categories: ${this.summarizeCategories(currentCapabilities)}`);
      
      // PHASE 2: Detect changes since last run
      console.log('\n🔄 PHASE 2: CHANGE DETECTION');
      const changes = await this.changeDetector.detectChanges(currentCapabilities);
      await this.handleDetectedChanges(changes);
      
      // PHASE 3: Run comprehensive test suite
      console.log('\n🧪 PHASE 3: TEST EXECUTION');
      const testResults = await this.orchestrator.runAllTests(currentCapabilities);
      
      // PHASE 4: Generate detailed reports
      console.log('\n📊 PHASE 4: REPORTING');
      const finalReport = await this.reporter.generateComprehensiveReport(
        testResults, 
        changes, 
        Date.now() - startTime
      );
      
      console.log('\n' + '─'.repeat(80));
      console.log('✅ [CI] Alex Rodriguez: MISSION ACCOMPLISHED! Tests are PERFECT!');
      console.log(AlexPersonality.getCelebrationMessage('Test suite completed successfully'));
      
      return finalReport;
      
    } catch (error) {
      console.error('🚨 [CI] Test suite failed:', error);
      console.log(AlexPersonality.getInvestigationMessage('critical failure'));
      await this.reporter.reportFailure(error);
      throw error;
    }
  }

  /**
   * Handle detected changes and update test suite accordingly
   */
  private async handleDetectedChanges(changes: DetectedChanges): Promise<void> {
    if (!changes.hasChanges()) {
      console.log('✅ [CI] No changes detected - test suite is up to date!');
      return;
    }

    console.log(`📝 [CI] Processing ${changes.getTotalChangeCount()} changes...`);

    if (changes.newTools.length > 0) {
      console.log(`\n🆕 [CI] Alex found ${changes.newTools.length} new tools! Generating tests...`);
      for (const tool of changes.newTools) {
        console.log(`   ➕ ${tool.name} - ${tool.category}`);
      }
      await this.generator.generateTestsForNewTools(changes.newTools);
    }

    if (changes.modifiedTools.length > 0) {
      console.log(`\n🔄 [CI] ${changes.modifiedTools.length} tools modified. Updating tests...`);
      for (const mod of changes.modifiedTools) {
        console.log(`   🔧 ${mod.toolName}: ${mod.changeDescription}`);
      }
      await this.generator.updateTestsForModifiedTools(changes.modifiedTools);
    }

    if (changes.removedTools.length > 0) {
      console.log(`\n🗑️ [CI] ${changes.removedTools.length} tools removed. Cleaning up tests...`);
      for (const tool of changes.removedTools) {
        console.log(`   ➖ ${tool.name}`);
      }
      await this.generator.cleanupTestsForRemovedTools(changes.removedTools);
    }

    console.log('\n📝 [CI] Alex Rodriguez: Test suite evolved! Committing updates...');
    await this.commitTestUpdates(changes);
  }

  private async commitTestUpdates(changes: DetectedChanges): Promise<void> {
    // Auto-commit test updates back to repo
    const commitMessage = `🤖 Auto-update tests: ${changes.getSummary()}

Generated by Alex Rodriguez's Self-Updating Test Suite
- New tools: ${changes.newTools.length}
- Modified tools: ${changes.modifiedTools.length}  
- Removed tools: ${changes.removedTools.length}

Tests are now perfectly aligned with current MCP capabilities! 🚀`;

    await this.orchestrator.commitChanges(commitMessage);
    console.log('✅ [CI] Test updates committed automatically!');
  }

  private summarizeCategories(capabilities: any): string {
    const categories = new Map<string, number>();
    capabilities.tools.forEach((tool: any) => {
      const category = tool.category || 'general';
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    return Array.from(categories.entries())
      .map(([cat, count]) => `${cat}(${count})`)
      .join(', ');
  }
}

// Main entry point
async function main() {
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🤖 ALECS SELF-UPDATING CI TEST SUITE                                         │
│ Lead Test Engineer: Alex Rodriguez, Senior UX Test Engineer                 │
│ Mission: Create intelligent tests that evolve with the codebase            │
│ Philosophy: "Tests should be as smart as the code they validate"           │
│ Status: BUILDING THE FUTURE OF AUTOMATED TESTING                           │
└─────────────────────────────────────────────────────────────────────────────┘
`);

  const suite = new SelfUpdatingCITestSuite();
  
  try {
    const results = await suite.runCITestSuite();
    
    // Exit with appropriate code based on results
    if (results.testResults.failedTests > 0) {
      console.error(`\n❌ [CI] ${results.testResults.failedTests} tests failed`);
      process.exit(1);
    } else {
      console.log(`\n✅ [CI] All ${results.testResults.totalTests} tests passed!`);
      process.exit(0);
    }
  } catch (error) {
    console.error('\n🚨 [CI] Fatal error:', error);
    process.exit(2);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('🚨 Unhandled error:', error);
    process.exit(3);
  });
}

// Export already done in class declaration above