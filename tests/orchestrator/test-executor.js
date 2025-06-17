/**
 * Master Test Orchestrator and Execution Engine
 * Coordinates and executes all test suites with intelligent scheduling and reporting
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class TestExecutor {
  constructor() {
    this.testSuites = new Map();
    this.executionQueue = [];
    this.activeExecutions = new Map();
    this.results = new Map();
    this.config = {
      maxConcurrentSuites: 3,
      defaultTimeout: 300000, // 5 minutes
      retryAttempts: 2,
      failureThreshold: 0.8, // 80% pass rate required
      executionStrategies: {
        sequential: 'sequential',
        parallel: 'parallel',
        priority: 'priority_based',
        dependency: 'dependency_ordered'
      }
    };
    
    this.executionMetrics = {
      totalSuites: 0,
      completedSuites: 0,
      failedSuites: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0
    };

    this.qualityGates = {
      unitTests: { required: true, threshold: 0.95 },
      integrationTests: { required: true, threshold: 0.90 },
      e2eTests: { required: true, threshold: 0.85 },
      performanceTests: { required: true, threshold: 0.80 },
      securityTests: { required: true, threshold: 0.95 },
      reliabilityTests: { required: true, threshold: 0.90 }
    };

    this.reportingCallbacks = [];
    this.monitoringHooks = [];
  }

  /**
   * Initialize the test executor with available test suites
   */
  async initializeTestExecutor() {
    console.log('\n🎯 Initializing Master Test Orchestrator');
    console.log('========================================\n');

    // Discover and register available test suites
    await this.discoverTestSuites();

    // Initialize test dependencies
    await this.analyzeDependencies();

    // Setup monitoring and reporting
    await this.setupMonitoring();

    console.log(`✅ Test Executor initialized with ${this.testSuites.size} test suites`);
  }

  /**
   * Discover all available test suites in the project
   */
  async discoverTestSuites() {
    console.log('🔍 Discovering test suites...\n');

    const testDirectories = [
      'tests/diagnostics',
      'tests/workflows', 
      'tests/edge-cases',
      'tests/performance',
      'tests/analysis',
      'tests/personas',
      'tests/ux',
      'tests/integration',
      'tests/support',
      'tests/analytics',
      'tests/metrics',
      'tests/improvement',
      'tests/feedback',
      'tests/reliability',
      'tests/security',
      'tests/operations',
      'tests/continuity'
    ];

    const suiteDefinitions = [
      {
        id: 'mcp-health-check',
        name: 'MCP Health Diagnostics',
        category: 'diagnostics',
        priority: 'critical',
        path: 'tests/diagnostics/mcp-health-check.js',
        dependencies: [],
        estimatedDuration: 120000,
        timeout: 180000,
        retryable: true
      },
      {
        id: 'customer-journey',
        name: 'Customer Journey Simulation',
        category: 'workflows',
        priority: 'high',
        path: 'tests/workflows/customer-journey.js',
        dependencies: ['mcp-health-check'],
        estimatedDuration: 300000,
        timeout: 450000,
        retryable: true
      },
      {
        id: 'error-scenarios',
        name: 'Edge Case Error Scenarios',
        category: 'edge-cases',
        priority: 'high',
        path: 'tests/edge-cases/error-scenarios.js',
        dependencies: ['mcp-health-check'],
        estimatedDuration: 180000,
        timeout: 270000,
        retryable: true
      },
      {
        id: 'load-testing',
        name: 'Performance Load Testing',
        category: 'performance',
        priority: 'high',
        path: 'tests/performance/load-testing.js',
        dependencies: ['customer-journey'],
        estimatedDuration: 600000,
        timeout: 900000,
        retryable: false
      },
      {
        id: 'bug-analysis',
        name: 'Automated Bug Detection',
        category: 'analysis',
        priority: 'medium',
        path: 'tests/analysis/bug-detector.js',
        dependencies: [],
        estimatedDuration: 240000,
        timeout: 360000,
        retryable: true
      },
      {
        id: 'customer-scenarios',
        name: 'Customer Persona Testing',
        category: 'personas',
        priority: 'high',
        path: 'tests/personas/customer-scenarios.js',
        dependencies: ['customer-journey'],
        estimatedDuration: 480000,
        timeout: 720000,
        retryable: true
      },
      {
        id: 'interaction-testing',
        name: 'UX Interaction Testing',
        category: 'ux',
        priority: 'medium',
        path: 'tests/ux/interaction-testing.js',
        dependencies: ['customer-scenarios'],
        estimatedDuration: 300000,
        timeout: 450000,
        retryable: true
      },
      {
        id: 'end-to-end',
        name: 'End-to-End Integration',
        category: 'integration',
        priority: 'critical',
        path: 'tests/integration/end-to-end.js',
        dependencies: ['customer-journey', 'error-scenarios'],
        estimatedDuration: 720000,
        timeout: 1080000,
        retryable: true
      },
      {
        id: 'troubleshooting',
        name: 'Support Troubleshooting',
        category: 'support',
        priority: 'medium',
        path: 'tests/support/troubleshooting.js',
        dependencies: ['end-to-end'],
        estimatedDuration: 360000,
        timeout: 540000,
        retryable: true
      },
      {
        id: 'journey-analytics',
        name: 'Customer Journey Analytics',
        category: 'analytics',
        priority: 'medium',
        path: 'tests/analytics/journey-analyzer.js',
        dependencies: ['customer-scenarios'],
        estimatedDuration: 180000,
        timeout: 270000,
        retryable: true
      },
      {
        id: 'experience-metrics',
        name: 'Experience Quality Metrics',
        category: 'metrics',
        priority: 'medium',
        path: 'tests/metrics/experience-metrics.js',
        dependencies: ['journey-analytics'],
        estimatedDuration: 120000,
        timeout: 180000,
        retryable: true
      },
      {
        id: 'feedback-processing',
        name: 'Feedback Integration System',
        category: 'feedback',
        priority: 'medium',
        path: 'tests/feedback/feedback-processor.js',
        dependencies: ['experience-metrics'],
        estimatedDuration: 240000,
        timeout: 360000,
        retryable: true
      },
      {
        id: 'resilience-testing',
        name: 'Production Resilience Testing',
        category: 'reliability',
        priority: 'critical',
        path: 'tests/reliability/resilience-test.js',
        dependencies: ['end-to-end'],
        estimatedDuration: 900000,
        timeout: 1350000,
        retryable: false
      },
      {
        id: 'security-compliance',
        name: 'Security Compliance Validation',
        category: 'security',
        priority: 'critical',
        path: 'tests/security/compliance-check.js',
        dependencies: ['mcp-health-check'],
        estimatedDuration: 480000,
        timeout: 720000,
        retryable: true
      },
      {
        id: 'operational-excellence',
        name: 'Operational Excellence Validation',
        category: 'operations',
        priority: 'high',
        path: 'tests/operations/monitoring-test.js',
        dependencies: ['resilience-testing'],
        estimatedDuration: 360000,
        timeout: 540000,
        retryable: true
      },
      {
        id: 'disaster-recovery',
        name: 'Business Continuity Testing',
        category: 'continuity',
        priority: 'high',
        path: 'tests/continuity/disaster-recovery.js',
        dependencies: ['operational-excellence'],
        estimatedDuration: 600000,
        timeout: 900000,
        retryable: false
      }
    ];

    // Register all test suites
    for (const suite of suiteDefinitions) {
      this.testSuites.set(suite.id, suite);
      console.log(`  📋 Registered: ${suite.name} (${suite.category})`);
    }

    this.executionMetrics.totalSuites = this.testSuites.size;
  }

  /**
   * Analyze test dependencies to determine execution order
   */
  async analyzeDependencies() {
    console.log('\n🔗 Analyzing test dependencies...\n');

    const dependencyGraph = new Map();
    const dependencyCounts = new Map();

    // Build dependency graph
    for (const [suiteId, suite] of this.testSuites) {
      dependencyGraph.set(suiteId, suite.dependencies || []);
      dependencyCounts.set(suiteId, suite.dependencies ? suite.dependencies.length : 0);
    }

    // Validate dependencies
    for (const [suiteId, dependencies] of dependencyGraph) {
      for (const depId of dependencies) {
        if (!this.testSuites.has(depId)) {
          console.warn(`⚠️  ${suiteId} has invalid dependency: ${depId}`);
        }
      }
    }

    console.log('✅ Dependency analysis completed');
  }

  /**
   * Setup monitoring and reporting hooks
   */
  async setupMonitoring() {
    console.log('\n📊 Setting up monitoring and reporting...\n');

    // Register default reporting callbacks
    this.reportingCallbacks.push(this.generateProgressReport.bind(this));
    this.reportingCallbacks.push(this.updateExecutionMetrics.bind(this));

    // Register monitoring hooks
    this.monitoringHooks.push(this.checkResourceUsage.bind(this));
    this.monitoringHooks.push(this.validateQualityGates.bind(this));

    console.log('✅ Monitoring setup completed');
  }

  /**
   * Execute test suites with specified strategy
   */
  async executeTestSuites(strategy = 'dependency', options = {}) {
    console.log(`\n🚀 Starting test execution with ${strategy} strategy`);
    console.log('================================================\n');

    const startTime = Date.now();
    const executionOptions = {
      maxConcurrent: options.maxConcurrent || this.config.maxConcurrentSuites,
      timeout: options.timeout || this.config.defaultTimeout,
      retryAttempts: options.retryAttempts || this.config.retryAttempts,
      failFast: options.failFast || false,
      suiteFilter: options.suiteFilter || null,
      categoryFilter: options.categoryFilter || null,
      priorityFilter: options.priorityFilter || null
    };

    try {
      // Prepare execution queue based on strategy
      await this.prepareExecutionQueue(strategy, executionOptions);

      // Execute test suites
      const results = await this.runExecutionQueue(executionOptions);

      // Calculate final metrics
      this.executionMetrics.totalExecutionTime = Date.now() - startTime;
      this.executionMetrics.averageExecutionTime = 
        this.executionMetrics.totalExecutionTime / this.executionMetrics.completedSuites;

      // Generate comprehensive report
      const report = await this.generateExecutionReport(results);

      console.log('\n✅ Test execution completed');
      return report;

    } catch (error) {
      console.error('\n❌ Test execution failed:', error);
      throw error;
    }
  }

  /**
   * Prepare execution queue based on strategy
   */
  async prepareExecutionQueue(strategy, options) {
    console.log(`📋 Preparing execution queue (${strategy})...`);

    let suites = Array.from(this.testSuites.values());

    // Apply filters
    if (options.suiteFilter) {
      suites = suites.filter(suite => options.suiteFilter.includes(suite.id));
    }
    if (options.categoryFilter) {
      suites = suites.filter(suite => options.categoryFilter.includes(suite.category));
    }
    if (options.priorityFilter) {
      suites = suites.filter(suite => options.priorityFilter.includes(suite.priority));
    }

    // Sort based on strategy
    switch (strategy) {
      case 'sequential':
        this.executionQueue = suites.sort((a, b) => a.priority.localeCompare(b.priority));
        break;
        
      case 'parallel':
        this.executionQueue = suites.sort((a, b) => a.estimatedDuration - b.estimatedDuration);
        break;
        
      case 'priority':
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        this.executionQueue = suites.sort((a, b) => 
          priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
        
      case 'dependency':
      default:
        this.executionQueue = this.topologicalSort(suites);
        break;
    }

    console.log(`  📊 Queue prepared with ${this.executionQueue.length} test suites`);
  }

  /**
   * Topological sort for dependency-based execution
   */
  topologicalSort(suites) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (suite) => {
      if (visiting.has(suite.id)) {
        throw new Error(`Circular dependency detected involving ${suite.id}`);
      }
      if (visited.has(suite.id)) {
        return;
      }

      visiting.add(suite.id);

      // Visit dependencies first
      for (const depId of suite.dependencies || []) {
        const depSuite = suites.find(s => s.id === depId);
        if (depSuite) {
          visit(depSuite);
        }
      }

      visiting.delete(suite.id);
      visited.add(suite.id);
      sorted.push(suite);
    };

    for (const suite of suites) {
      visit(suite);
    }

    return sorted;
  }

  /**
   * Run the execution queue
   */
  async runExecutionQueue(options) {
    const results = new Map();
    const concurrentPromises = [];

    for (const suite of this.executionQueue) {
      // Wait if we've reached max concurrent executions
      if (concurrentPromises.length >= options.maxConcurrent) {
        await Promise.race(concurrentPromises);
      }

      // Check if dependencies are satisfied
      const dependenciesSatisfied = await this.checkDependencies(suite, results);
      if (!dependenciesSatisfied) {
        console.log(`⏸️  Waiting for dependencies: ${suite.name}`);
        continue;
      }

      // Start test suite execution
      const executionPromise = this.executeSingleSuite(suite, options)
        .then(result => {
          results.set(suite.id, result);
          this.removeFromConcurrent(concurrentPromises, executionPromise);
          return result;
        })
        .catch(error => {
          const errorResult = {
            suiteId: suite.id,
            success: false,
            error: error.message,
            duration: 0,
            tests: []
          };
          results.set(suite.id, errorResult);
          this.removeFromConcurrent(concurrentPromises, executionPromise);
          
          // Fail fast if enabled
          if (options.failFast) {
            throw error;
          }
          return errorResult;
        });

      concurrentPromises.push(executionPromise);
    }

    // Wait for all remaining executions to complete
    await Promise.allSettled(concurrentPromises);

    return results;
  }

  /**
   * Execute a single test suite
   */
  async executeSingleSuite(suite, options) {
    console.log(`\n🧪 Executing: ${suite.name}`);
    console.log(`   Category: ${suite.category} | Priority: ${suite.priority}`);
    console.log(`   Estimated Duration: ${(suite.estimatedDuration / 1000).toFixed(0)}s`);

    const startTime = Date.now();
    const execution = {
      suiteId: suite.id,
      startTime,
      process: null,
      attempts: 0
    };

    this.activeExecutions.set(suite.id, execution);

    let result;
    let attempts = 0;
    const maxAttempts = suite.retryable ? options.retryAttempts + 1 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      execution.attempts = attempts;

      try {
        console.log(`   🔄 Attempt ${attempts}/${maxAttempts}`);
        
        result = await this.runTestSuiteProcess(suite, options);
        
        if (result.success) {
          console.log(`   ✅ ${suite.name} completed successfully`);
          break;
        } else if (attempts < maxAttempts) {
          console.log(`   ⚠️  ${suite.name} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        }
      } catch (error) {
        console.log(`   ❌ ${suite.name} execution error: ${error.message}`);
        if (attempts >= maxAttempts) {
          result = {
            suiteId: suite.id,
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
            tests: [],
            attempts
          };
        }
      }
    }

    const duration = Date.now() - startTime;
    result.duration = duration;
    result.attempts = attempts;

    this.activeExecutions.delete(suite.id);

    // Update metrics
    this.executionMetrics.completedSuites++;
    if (!result.success) {
      this.executionMetrics.failedSuites++;
    }

    // Run monitoring hooks
    for (const hook of this.monitoringHooks) {
      try {
        await hook(suite, result);
      } catch (error) {
        console.warn(`⚠️  Monitoring hook failed: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Run test suite as external process
   */
  async runTestSuiteProcess(suite, options) {
    return new Promise((resolve, reject) => {
      const suitePath = path.join(__dirname, '..', '..', suite.path);
      
      const childProcess = spawn('node', [suitePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: suite.timeout
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        const result = {
          suiteId: suite.id,
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          tests: this.parseTestOutput(stdout),
          error: code !== 0 ? stderr || `Process exited with code ${code}` : null
        };

        // Update test metrics
        if (result.tests) {
          this.executionMetrics.totalTests += result.tests.length;
          this.executionMetrics.passedTests += result.tests.filter(t => t.passed).length;
          this.executionMetrics.failedTests += result.tests.filter(t => !t.passed).length;
        }

        resolve(result);
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Failed to start process: ${error.message}`));
      });

      // Store process reference for potential termination
      this.activeExecutions.get(suite.id).process = childProcess;
    });
  }

  /**
   * Parse test output to extract test results
   */
  parseTestOutput(output) {
    const tests = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Look for test result patterns
      if (line.includes('✅') || line.includes('❌')) {
        const passed = line.includes('✅');
        const testName = line.replace(/[✅❌]/g, '').trim();
        
        if (testName) {
          tests.push({
            name: testName,
            passed,
            duration: 0 // Could be extracted if available
          });
        }
      }
    }

    return tests;
  }

  /**
   * Check if suite dependencies are satisfied
   */
  async checkDependencies(suite, results) {
    if (!suite.dependencies || suite.dependencies.length === 0) {
      return true;
    }

    for (const depId of suite.dependencies) {
      const depResult = results.get(depId);
      if (!depResult || !depResult.success) {
        return false;
      }
    }

    return true;
  }

  /**
   * Remove promise from concurrent list
   */
  removeFromConcurrent(concurrentPromises, promise) {
    const index = concurrentPromises.indexOf(promise);
    if (index > -1) {
      concurrentPromises.splice(index, 1);
    }
  }

  /**
   * Validate quality gates
   */
  async validateQualityGates(suite, result) {
    const gate = this.qualityGates[suite.category];
    if (!gate) return;

    if (gate.required && !result.success) {
      console.warn(`⚠️  Quality gate failure: ${suite.name} (required test failed)`);
    }

    if (result.tests && result.tests.length > 0) {
      const passRate = result.tests.filter(t => t.passed).length / result.tests.length;
      if (passRate < gate.threshold) {
        console.warn(`⚠️  Quality gate failure: ${suite.name} (pass rate ${(passRate * 100).toFixed(1)}% < ${(gate.threshold * 100)}%)`);
      }
    }
  }

  /**
   * Check resource usage during execution
   */
  async checkResourceUsage(suite, result) {
    // Monitor memory and CPU usage
    const usage = process.memoryUsage();
    if (usage.heapUsed > 1024 * 1024 * 1024) { // 1GB
      console.warn(`⚠️  High memory usage: ${(usage.heapUsed / 1024 / 1024).toFixed(0)}MB`);
    }
  }

  /**
   * Generate progress report
   */
  async generateProgressReport(suite, result) {
    const progress = (this.executionMetrics.completedSuites / this.executionMetrics.totalSuites) * 100;
    console.log(`📊 Progress: ${progress.toFixed(1)}% (${this.executionMetrics.completedSuites}/${this.executionMetrics.totalSuites})`);
  }

  /**
   * Update execution metrics
   */
  async updateExecutionMetrics(suite, result) {
    // Metrics are updated in real-time during execution
  }

  /**
   * Generate comprehensive execution report
   */
  async generateExecutionReport(results) {
    console.log('\n📋 Generating Execution Report...\n');

    const report = {
      timestamp: new Date().toISOString(),
      execution: {
        strategy: 'dependency', // Could be parameter
        totalSuites: this.executionMetrics.totalSuites,
        completedSuites: this.executionMetrics.completedSuites,
        failedSuites: this.executionMetrics.failedSuites,
        successRate: this.executionMetrics.completedSuites > 0 ? 
          ((this.executionMetrics.completedSuites - this.executionMetrics.failedSuites) / this.executionMetrics.completedSuites) * 100 : 0
      },
      tests: {
        totalTests: this.executionMetrics.totalTests,
        passedTests: this.executionMetrics.passedTests,
        failedTests: this.executionMetrics.failedTests,
        passRate: this.executionMetrics.totalTests > 0 ? 
          (this.executionMetrics.passedTests / this.executionMetrics.totalTests) * 100 : 0
      },
      timing: {
        totalExecutionTime: this.executionMetrics.totalExecutionTime,
        averageExecutionTime: this.executionMetrics.averageExecutionTime
      },
      suiteResults: Array.from(results.entries()).map(([suiteId, result]) => ({
        suiteId,
        suiteName: this.testSuites.get(suiteId)?.name || suiteId,
        category: this.testSuites.get(suiteId)?.category || 'unknown',
        priority: this.testSuites.get(suiteId)?.priority || 'unknown',
        success: result.success,
        duration: result.duration,
        attempts: result.attempts || 1,
        testCount: result.tests ? result.tests.length : 0,
        testsPassed: result.tests ? result.tests.filter(t => t.passed).length : 0,
        error: result.error || null
      })),
      qualityGateStatus: this.evaluateQualityGates(results),
      recommendations: this.generateRecommendations(results)
    };

    // Save report to file
    const reportDir = path.join(__dirname, '../reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const filename = `test-execution-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(
      path.join(reportDir, filename),
      JSON.stringify(report, null, 2)
    );

    console.log('📈 Test Execution Summary:');
    console.log(`  Total Suites: ${report.execution.totalSuites}`);
    console.log(`  Success Rate: ${report.execution.successRate.toFixed(1)}%`);
    console.log(`  Total Tests: ${report.tests.totalTests}`);
    console.log(`  Test Pass Rate: ${report.tests.passRate.toFixed(1)}%`);
    console.log(`  Execution Time: ${(report.timing.totalExecutionTime / 1000 / 60).toFixed(1)} minutes`);

    if (report.execution.failedSuites > 0) {
      console.log('\n❌ Failed Suites:');
      report.suiteResults
        .filter(suite => !suite.success)
        .forEach(suite => {
          console.log(`  - ${suite.suiteName}: ${suite.error}`);
        });
    }

    console.log(`\n📄 Detailed report saved: ${filename}`);
    return report;
  }

  /**
   * Evaluate overall quality gate status
   */
  evaluateQualityGates(results) {
    const gateResults = {};

    for (const [category, gate] of Object.entries(this.qualityGates)) {
      const categoryResults = Array.from(results.values())
        .filter(result => this.testSuites.get(result.suiteId)?.category === category);
      
      if (categoryResults.length === 0) {
        gateResults[category] = gate.required ? 'missing' : 'skipped';
        continue;
      }

      const successCount = categoryResults.filter(r => r.success).length;
      const passRate = successCount / categoryResults.length;

      gateResults[category] = {
        status: passRate >= gate.threshold ? 'passed' : 'failed',
        passRate: passRate * 100,
        threshold: gate.threshold * 100,
        required: gate.required
      };
    }

    return gateResults;
  }

  /**
   * Generate recommendations based on execution results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check overall success rate
    const overallSuccessRate = this.executionMetrics.completedSuites > 0 ? 
      ((this.executionMetrics.completedSuites - this.executionMetrics.failedSuites) / this.executionMetrics.completedSuites) : 0;

    if (overallSuccessRate < this.config.failureThreshold) {
      recommendations.push({
        type: 'critical',
        title: 'Low Test Success Rate',
        description: `Overall test success rate of ${(overallSuccessRate * 100).toFixed(1)}% is below acceptable threshold`,
        actions: [
          'Review and fix failing test suites',
          'Investigate common failure patterns',
          'Consider adjusting test timeouts or retry logic'
        ]
      });
    }

    // Check for frequently failing tests
    const failedSuites = Array.from(results.values()).filter(r => !r.success);
    if (failedSuites.length > 0) {
      recommendations.push({
        type: 'high',
        title: 'Test Failures Detected',
        description: `${failedSuites.length} test suites failed`,
        actions: [
          'Review failure logs for each failed suite',
          'Address root causes of test failures',
          'Improve test stability and reliability'
        ]
      });
    }

    // Check execution time
    if (this.executionMetrics.totalExecutionTime > 3600000) { // 1 hour
      recommendations.push({
        type: 'medium',
        title: 'Long Execution Time',
        description: `Total execution time of ${(this.executionMetrics.totalExecutionTime / 1000 / 60).toFixed(1)} minutes is lengthy`,
        actions: [
          'Optimize slow-running test suites',
          'Increase parallel execution capacity',
          'Consider test suite splitting'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Terminate all active executions
   */
  async terminateActiveExecutions() {
    console.log('🛑 Terminating active test executions...');

    for (const execution of this.activeExecutions.values()) {
      if (execution.process) {
        execution.process.kill('SIGTERM');
      }
    }

    this.activeExecutions.clear();
  }

  /**
   * Get current execution status
   */
  getExecutionStatus() {
    return {
      activeExecutions: this.activeExecutions.size,
      queuedSuites: this.executionQueue.length - this.executionMetrics.completedSuites,
      completedSuites: this.executionMetrics.completedSuites,
      metrics: this.executionMetrics
    };
  }
}

// Export for use in other modules
module.exports = {
  TestExecutor
};

// Demonstration
if (require.main === module) {
  async function demonstrateTestExecution() {
    const executor = new TestExecutor();
    
    try {
      await executor.initializeTestExecutor();
      
      // Execute a subset of tests for demonstration
      const report = await executor.executeTestSuites('dependency', {
        categoryFilter: ['diagnostics', 'workflows'],
        maxConcurrent: 2
      });
      
      console.log('\n🎉 Test execution demonstration completed');
    } catch (error) {
      console.error('❌ Demonstration failed:', error);
    }
  }

  demonstrateTestExecution().catch(console.error);
}