/**
 * Test Output Parser and Analyzer
 *
 * Parses test results, extracts errors, recognizes patterns, and assesses impact.
 * Supports Jest, Mocha, and custom test frameworks.
 */

// Type definitions for error patterns and configurations
interface _ErrorPattern {
  name: string;
  pattern: RegExp;
}

interface SeverityWeights {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

interface TestCategory {
  weight: number;
  scope: 'component' | 'service' | 'system';
}

interface TestCategories {
  unit: TestCategory;
  integration: TestCategory;
  e2e: TestCategory;
  performance: TestCategory;
  security: TestCategory;
}

// Types for test results
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'unknown';
  runtime: number;
}

interface TestSuite {
  name: string;
  status: 'pass' | 'fail' | 'unknown';
  runtime: number;
  tests: TestResult[];
  errors: string[];
}

interface TestFailure {
  suite: string;
  test?: string;
  message: string;
  location?: string | null;
}

interface TestError {
  suite: string;
  message: string;
  type: string;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  runtime?: number;
}

interface ParsedTestResults {
  summary: TestSummary;
  testSuites: TestSuite[];
  failures: TestFailure[];
  errors: TestError[];
  coverage?: any;
}

// Types for Jest-specific output
interface JestAssertionResult {
  title?: string;
  fullName?: string;
  status: string;
  failureMessages?: string[];
  location?: string;
}

interface JestTestSuite {
  testFilePath?: string;
  name?: string;
  status?: string;
  message?: string;
  perfStats?: {
    runtime: number;
  };
  assertionResults?: JestAssertionResult[];
}

interface JestJsonOutput {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numSkippedTests?: number;
  testResults?: JestTestSuite[];
  coverageMap?: any;
}

// Types for analysis results
interface Overview {
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  successRate: number;
  totalRuntime: number;
  averageTestTime: number;
  health: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
}

interface CategorizedError extends TestFailure {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface ErrorAnalysis {
  categorizedErrors: Map<string, CategorizedError[]>;
  errorFrequency: Map<string, number>;
  severityDistribution: Map<string, number>;
  rootCauses: Map<string, number>;
}

interface RepeatingFailure {
  pattern: string;
  count: number;
  tests: string[];
  message: string;
}

interface CascadingFailure {
  type: string;
  description: string;
  count: number;
  affected: string[];
}

interface PatternAnalysis {
  repeatingFailu_res: RepeatingFailure[];
  cascadingFailu_res: CascadingFailure[];
  timeBasedPatterns: TimeBasedPattern;
  suitePatterns: SuitePattern;
}

interface TimeBasedPattern {
  averageTestTime: number;
  totalRuntime: number;
  performanceIssues: string[];
}

interface SuiteStat {
  name: string;
  status: string;
  runtime: number;
  testCount: number;
  failureCount: number;
}

interface SuitePattern {
  slowestSuites: SuiteStat[];
  mostFailures: SuiteStat[];
  suiteStats: SuiteStat[];
}

interface ImpactLevel {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors: string[];
}

interface BusinessImpact extends ImpactLevel {
  impact: number;
}

interface TechnicalImpact extends ImpactLevel {
  affectedSystems: string[];
}

interface CustomerImpact extends ImpactLevel {
  affectedFeatu_res: number;
  customerFailureRate: number;
}

interface ImpactAssessment {
  businessImpact: BusinessImpact;
  technicalImpact: TechnicalImpact;
  customerImpact: CustomerImpact;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Recommendations {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  preventive: string[];
}

interface TrendSnapshot {
  timestamp: string;
  successRate: number;
  totalTests: number;
  failedTests: number;
}

interface TrendAnalysis {
  currentSnapshot: TrendSnapshot;
  recommendations: string[];
}

interface AnalysisResult {
  overview: Overview;
  errorAnalysis: ErrorAnalysis;
  patternAnalysis: PatternAnalysis;
  impactAssessment: ImpactAssessment;
  recommendations: Recommendations;
  trends: TrendAnalysis;
}

export class TestOutputAnalyzer {
  private errorPatterns: Map<string, RegExp>;
  private severityWeights: SeverityWeights;
  private testCategories: TestCategories;

  constructor() {
    this.errorPatterns = new Map<string, RegExp>([
      // Network/Connection Errors
      [
        'NETWORK_ERROR',
        /(?:ECONNREFUSED|ENOTFOUND|TIMEOUT|Connection.*refused|Network.*unreachable)/i,
      ],
      [
        'AUTH_ERROR',
        /(?:401|403|Unauthorized|Forbidden|Authentication.*failed|Invalid.*credentials)/i,
      ],
      ['RATE_LIMIT', /(?:429|Too.*many.*requests|Rate.*limit|Throttled)/i],

      // API/Service Errors
      [
        'API_ERROR',
        /(?:500|502|503|504|Internal.*server.*error|Bad.*gateway|Service.*unavailable)/i,
      ],
      [
        'VALIDATION_ERROR',
        /(?:400|Bad.*request|Validation.*failed|Invalid.*parameter|Missing.*required)/i,
      ],
      ['NOT_FOUND', /(?:404|Not.*found|Resource.*not.*found|Property.*not.*found)/i],

      // Configuration Errors
      [
        'CONFIG_ERROR',
        /(?:Configuration.*error|Missing.*config|Invalid.*config|\.edgerc.*not.*found)/i,
      ],
      ['CERT_ERROR', /(?:Certificate.*error|SSL.*error|TLS.*error|Certificate.*expired)/i],
      ['DNS_ERROR', /(?:DNS.*resolution.*failed|NXDOMAIN|DNS.*timeout)/i],

      // Test Framework Errors
      ['ASSERTION_ERROR', /(?:AssertionError|expect.*to.*equal|should.*equal|Test.*failed)/i],
      ['TIMEOUT_ERROR', /(?:Test.*timeout|Exceeded.*timeout|Operation.*timed.*out)/i],
      ['DEPENDENCY_ERROR', /(?:Module.*not.*found|Cannot.*resolve|Dependency.*missing)/i],

      // Akamai-specific Errors
      [
        'PROPERTY_ERROR',
        /(?:Property.*validation.*failed|Rule.*tree.*error|Edge.*hostname.*error)/i,
      ],
      ['ACTIVATION_ERROR', /(?:Activation.*failed|Cannot.*activate|Deployment.*error)/i],
      ['ZONE_ERROR', /(?:Zone.*not.*found|DNS.*zone.*error|Record.*creation.*failed)/i],
    ]);

    this.severityWeights = {
      CRITICAL: 10,
      HIGH: 7,
      MEDIUM: 4,
      LOW: 1,
    };

    this.testCategories = {
      unit: { weight: 1, scope: 'component' },
      integration: { weight: 3, scope: 'service' },
      e2e: { weight: 5, scope: 'system' },
      performance: { weight: 4, scope: 'system' },
      security: { weight: 8, scope: 'system' },
    };
  }

  /**
   * Parse test output from various formats
   */
  public parseTestOutput(
    output: string,
    format = 'jest',
  ): ParsedTestResults | { success: false; error: string; results: [] } {
    try {
      switch (format.toLowerCase()) {
        case 'jest':
          return this.parseJestOutput(output);
        case 'mocha':
          return this.parseMochaOutput(output);
        case 'json':
          return this.parseJsonOutput(output);
        default:
          return this.parseGenericOutput(output);
      }
    } catch (_error) {
      return {
        success: false,
        error: `Failed to parse ${format} output: ${(_error as Error).message}`,
        results: [],
      };
    }
  }

  /**
   * Parse Jest test output
   */
  private parseJestOutput(_output: string): ParsedTestResults {
    const _results: ParsedTestResults = {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      },
      testSuites: [],
      failures: [],
      errors: [],
      coverage: null,
    };

    try {
      // Try to parse as JSON first (Jest --json output)
      const jsonOutput: JestJsonOutput = JSON.parse(_output);
      return this.parseJestJsonOutput(jsonOutput);
    } catch {
      // Parse text output
      return this.parseJestTextOutput(_output);
    }
  }

  /**
   * Parse Jest JSON output
   */
  private parseJestJsonOutput(jsonOutput: JestJsonOutput): ParsedTestResults {
    const results: ParsedTestResults = {
      summary: {
        totalTests: jsonOutput.numTotalTests || 0,
        passedTests: jsonOutput.numPassedTests || 0,
        failedTests: jsonOutput.numFailedTests || 0,
        skippedTests: jsonOutput.numSkippedTests || 0,
        runtime:
          jsonOutput.testResults?.reduce(
            (sum, suite) => sum + (suite.perfStats?.runtime || 0),
            0,
          ) || 0,
      },
      testSuites: [],
      failures: [],
      errors: [],
      coverage: jsonOutput.coverageMap || null,
    };

    // Process test suites
    if (jsonOutput.testResults) {
      jsonOutput.testResults.forEach((suite) => {
        const suiteResult: TestSuite = {
          name: suite.testFilePath || suite.name || 'Unknown',
          status: (suite.status || 'unknown') as 'pass' | 'fail' | 'unknown',
          runtime: suite.perfStats?.runtime || 0,
          tests: (suite.assertionResults || []).map((test) => ({
            name: test.title || test.fullName || 'Unknown',
            status: test.status as 'passed' | 'failed' | 'skipped' | 'unknown',
            runtime: 0,
          })),
          errors: suite.message ? [suite.message] : [],
        };

        results.testSuites.push(suiteResult);

        // Extract failures and errors
        if (suite.assertionResults) {
          suite.assertionResults.forEach((test) => {
            if (test.status === 'failed') {
              results.failures.push({
                suite: suiteResult.name,
                test: test.title || test.fullName,
                message: test.failureMessages?.join('\n') || 'Unknown failure',
                location: test.location || null,
              });
            }
          });
        }

        if (suite.message && suite.status === 'failed') {
          results.errors.push({
            suite: suiteResult.name,
            message: suite.message,
            type: 'suite_error',
          });
        }
      });
    }

    return results;
  }

  /**
   * Parse Jest text output
   */
  private parseJestTextOutput(_output: string): ParsedTestResults {
    const lines = _output.split('\n');
    const results: ParsedTestResults = {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      },
      testSuites: [],
      failures: [],
      errors: [],
    };

    let currentSuite: TestSuite | null = null;
    let inFailureSection = false;
    let currentFailure: TestFailure | null = null;

    for (const line of lines) {
      // Parse summary statistics
      const summaryMatch = line.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (summaryMatch) {
        results.summary = {
          failedTests: parseInt(summaryMatch[1]),
          passedTests: parseInt(summaryMatch[2]),
          totalTests: parseInt(summaryMatch[3]),
          skippedTests: 0,
        };
        continue;
      }

      // Parse test suite starts
      const suiteMatch = line.match(/^\s*(PASS|FAIL)\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)\s*s\))?$/);
      if (suiteMatch) {
        if (currentSuite) {
          results.testSuites.push(currentSuite);
        }
        currentSuite = {
          name: suiteMatch[2],
          status: suiteMatch[1].toLowerCase() as 'pass' | 'fail',
          runtime: suiteMatch[3] ? parseFloat(suiteMatch[3]) * 1000 : 0,
          tests: [],
          errors: [],
        };
        continue;
      }

      // Parse individual test results
      const testMatch = line.match(/^\s*[[EMOJI][EMOJI]×]\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/);
      if (testMatch && currentSuite) {
        currentSuite.tests.push({
          name: testMatch[1],
          status: line.includes('[EMOJI]') ? 'passed' : 'failed',
          runtime: testMatch[2] ? parseInt(testMatch[2]) : 0,
        });
        continue;
      }

      // Parse failure details
      if (line.includes('FAIL') && line.includes('[EMOJI]')) {
        inFailureSection = true;
        currentFailure = {
          test: line.replace(/^\s*[EMOJI]\s*/, '').trim(),
          message: '',
          suite: currentSuite?.name || 'Unknown',
        };
        continue;
      }

      if (inFailureSection && currentFailure) {
        if (line.trim() === '' && currentFailure.message.trim() !== '') {
          results.failures.push(currentFailure);
          currentFailure = null;
          inFailureSection = false;
        } else if (line.trim() !== '') {
          currentFailure.message += line + '\n';
        }
      }
    }

    // Add the last suite
    if (currentSuite) {
      results.testSuites.push(currentSuite);
    }

    // Add the last failure
    if (currentFailure) {
      results.failures.push(currentFailure);
    }

    return results;
  }

  /**
   * Parse Mocha output (placeholder implementation)
   */
  private parseMochaOutput(_output: string): ParsedTestResults {
    // This would be implemented based on Mocha output format
    return this.parseGenericOutput(_output);
  }

  /**
   * Parse JSON output
   */
  private parseJsonOutput(_output: string): ParsedTestResults {
    try {
      const json = JSON.parse(_output);
      // Convert generic JSON to ParsedTestResults format
      return {
        summary: json.summary || {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
        },
        testSuites: json.testSuites || [],
        failures: json.failures || [],
        errors: json.errors || [],
      };
    } catch {
      return this.parseGenericOutput(_output);
    }
  }

  /**
   * Parse generic test output
   */
  private parseGenericOutput(_output: string): ParsedTestResults {
    // Basic parsing for unknown formats
    return {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      },
      testSuites: [],
      failures: [],
      errors: [],
    };
  }

  /**
   * Analyze test results and extract insights
   */
  public analyzeResults(testResults: ParsedTestResults): AnalysisResult {
    const analysis: AnalysisResult = {
      overview: this.generateOverview(testResults),
      errorAnalysis: this.analyzeErrors(testResults),
      patternAnalysis: this.analyzePatterns(testResults),
      impactAssessment: this.assessImpact(testResults),
      recommendations: this.generateRecommendations(testResults),
      trends: this.analyzeTrends(testResults),
    };

    return analysis;
  }

  /**
   * Generate test results overview
   */
  private generateOverview(testResults: ParsedTestResults): Overview {
    const overview: Overview = {
      totalSuites: testResults.testSuites?.length || 0,
      totalTests: testResults.summary?.totalTests || 0,
      passedTests: testResults.summary?.passedTests || 0,
      failedTests: testResults.summary?.failedTests || 0,
      skippedTests: testResults.summary?.skippedTests || 0,
      successRate: 0,
      totalRuntime: 0,
      averageTestTime: 0,
      health: 'CRITICAL',
    };

    if (overview.totalTests > 0) {
      overview.successRate = (overview.passedTests / overview.totalTests) * 100;
    }

    // Calculate runtime statistics
    if (testResults.testSuites) {
      overview.totalRuntime = testResults.testSuites.reduce(
        (sum, suite) => sum + (suite.runtime || 0),
        0,
      );
      overview.averageTestTime =
        overview.totalTests > 0 ? overview.totalRuntime / overview.totalTests : 0;
    }

    // Health assessment
    overview.health = this.assessTestHealth(overview);

    return overview;
  }

  /**
   * Assess overall test health
   */
  private assessTestHealth(
    overview: Overview,
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    if (overview.successRate >= 95) {
      return 'EXCELLENT';
    }
    if (overview.successRate >= 90) {
      return 'GOOD';
    }
    if (overview.successRate >= 80) {
      return 'FAIR';
    }
    if (overview.successRate >= 70) {
      return 'POOR';
    }
    return 'CRITICAL';
  }

  /**
   * Analyze errors and categorize them
   */
  private analyzeErrors(testResults: ParsedTestResults): ErrorAnalysis {
    const errorAnalysis: ErrorAnalysis = {
      categorizedErrors: new Map(),
      errorFrequency: new Map(),
      severityDistribution: new Map(),
      rootCauses: new Map(),
    };

    // Process failures and errors
    const allErrors = [
      ...(testResults.failures || []).map((f) => ({ ...f, type: 'test_failure' })),
      ...(testResults.errors || []).map((e) => ({ ...e, type: 'suite_error' })),
    ];

    allErrors.forEach((_error) => {
      const category = this.categorizeError(_error.message);
      const severity = this.assessErrorSeverity(_error, category);

      // Update categorized errors
      if (!errorAnalysis.categorizedErrors.has(category)) {
        errorAnalysis.categorizedErrors.set(category, []);
      }
      errorAnalysis.categorizedErrors.get(category)!.push({
        ...(_error as TestFailure),
        severity,
        category,
      });

      // Update frequency tracking
      errorAnalysis.errorFrequency.set(
        category,
        (errorAnalysis.errorFrequency.get(category) || 0) + 1,
      );

      // Update severity distribution
      errorAnalysis.severityDistribution.set(
        severity,
        (errorAnalysis.severityDistribution.get(severity) || 0) + 1,
      );

      // Identify root causes
      const rootCause = this.identifyRootCause(_error.message, category);
      errorAnalysis.rootCauses.set(rootCause, (errorAnalysis.rootCauses.get(rootCause) || 0) + 1);
    });

    return errorAnalysis;
  }

  /**
   * Categorize error based on message content
   */
  private categorizeError(message: string): string {
    for (const [category, pattern] of this.errorPatterns) {
      if (pattern.test(message)) {
        return category;
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Assess error severity
   */
  private assessErrorSeverity(
    _error: any,
    category: string,
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Critical severity indicators
    if (category === 'AUTH_ERROR' || category === 'CONFIG_ERROR') {
      return 'CRITICAL';
    }
    if (_error.message.includes('CRITICAL') || _error.message.includes('FATAL')) {
      return 'CRITICAL';
    }

    // High severity indicators
    if (category === 'API_ERROR' || category === 'ACTIVATION_ERROR') {
      return 'HIGH';
    }
    if (_error.message.includes('HIGH') || _error.message.includes('SEVERE')) {
      return 'HIGH';
    }
    if (_error.type === 'suite_error') {
      return 'HIGH';
    }

    // Medium severity indicators
    if (category === 'VALIDATION_ERROR' || category === 'TIMEOUT_ERROR') {
      return 'MEDIUM';
    }
    if (_error.message.includes('MEDIUM') || _error.message.includes('WARNING')) {
      return 'MEDIUM';
    }

    // Default to LOW
    return 'LOW';
  }

  /**
   * Identify root cause of error
   */
  private identifyRootCause(message: string, _category: string): string {
    const rootCausePatterns: Record<string, RegExp> = {
      configuration: /config|setup|environment|credentials|missing|not found/i,
      network: /network|connection|timeout|refused|unreachable/i,
      authentication: /auth|unauthorized|forbidden|credentials|token/i,
      validation: /validation|invalid|bad request|malformed/i,
      service_unavailable: /unavailable|down|maintenance|overloaded/i,
      rate_limiting: /rate|throttle|limit|quota/i,
      resource_not_found: /not found|missing|does not exist/i,
      dependency: /dependency|module|import|require/i,
      logicerror: /assertion|expect|should|logic/i,
      performance: /timeout|slow|performance|memory/i,
    };

    for (const [cause, pattern] of Object.entries(rootCausePatterns)) {
      if (pattern.test(message)) {
        return cause;
      }
    }

    return 'unknown';
  }

  /**
   * Analyze patterns in test failures
   */
  private analyzePatterns(testResults: ParsedTestResults): PatternAnalysis {
    const patterns: PatternAnalysis = {
      repeatingFailu_res: this.findRepeatingFailures(testResults),
      cascadingFailu_res: this.findCascadingFailures(testResults),
      timeBasedPatterns: this.findTimeBasedPatterns(testResults),
      suitePatterns: this.findSuitePatterns(testResults),
    };

    return patterns;
  }

  /**
   * Find repeating failure patterns
   */
  private findRepeatingFailures(testResults: ParsedTestResults): RepeatingFailure[] {
    const failureMap = new Map<string, { count: number; tests: string[]; message: string }>();

    (testResults.failures || []).forEach((failure) => {
      const key = this.normalizeFailureMessage(failure.message);
      if (!failureMap.has(key)) {
        failureMap.set(key, { count: 0, tests: [], message: failure.message });
      }
      const data = failureMap.get(key)!;
      data.count++;
      data.tests.push(`${failure.suite} > ${failure.test || 'Unknown'}`);
    });

    return Array.from(failureMap.entries())
      .filter(([, data]) => data.count > 1)
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Normalize failure message for pattern matching
   */
  private normalizeFailureMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/"[^"]*"/g, 'STRING') // Replace strings
      .replace(/\w+\.\w+\.\w+/g, 'URL') // Replace URLs/paths
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase()
      .trim();
  }

  /**
   * Find cascading failures
   */
  private findCascadingFailures(testResults: ParsedTestResults): CascadingFailure[] {
    // Identify tests that fail due to dependencies
    const cascading: CascadingFailure[] = [];
    const setupFailures = (testResults.failures || []).filter(
      (f) =>
        f.test?.toLowerCase().includes('setup') ||
        f.test?.toLowerCase().includes('before') ||
        f.message.includes('setup'),
    );

    if (setupFailures.length > 0) {
      cascading.push({
        type: 'setup_failure',
        description: 'Setup failures may cause subsequent test failures',
        count: setupFailures.length,
        affected: setupFailures.map((f) => f.suite),
      });
    }

    return cascading;
  }

  /**
   * Find time-based patterns
   */
  private findTimeBasedPatterns(testResults: ParsedTestResults): TimeBasedPattern {
    const overview = this.generateOverview(testResults);

    return {
      averageTestTime: overview.averageTestTime,
      totalRuntime: overview.totalRuntime,
      performanceIssues:
        overview.averageTestTime > 5000 ? ['Tests are running slower than expected'] : [],
    };
  }

  /**
   * Find suite-level patterns
   */
  private findSuitePatterns(testResults: ParsedTestResults): SuitePattern {
    const suiteStats: SuiteStat[] = (testResults.testSuites || []).map((suite) => ({
      name: suite.name,
      status: suite.status,
      runtime: suite.runtime || 0,
      testCount: suite.tests?.length || 0,
      failureCount: suite.tests?.filter((t) => t.status === 'failed').length || 0,
    }));

    return {
      slowestSuites: [...suiteStats].sort((a, b) => b.runtime - a.runtime).slice(0, 5),
      mostFailures: [...suiteStats].sort((a, b) => b.failureCount - a.failureCount).slice(0, 5),
      suiteStats,
    };
  }

  /**
   * Assess impact of test failures
   */
  private assessImpact(testResults: ParsedTestResults): ImpactAssessment {
    const impact: ImpactAssessment = {
      businessImpact: this.assessBusinessImpact(testResults),
      technicalImpact: this.assessTechnicalImpact(testResults),
      customerImpact: this.assessCustomerImpact(testResults),
      riskLevel: 'LOW',
    };

    // Calculate overall risk level
    const impacts = [
      impact.businessImpact.level,
      impact.technicalImpact.level,
      impact.customerImpact.level,
    ];
    if (impacts.includes('CRITICAL')) {
      impact.riskLevel = 'CRITICAL';
    } else if (impacts.includes('HIGH')) {
      impact.riskLevel = 'HIGH';
    } else if (impacts.includes('MEDIUM')) {
      impact.riskLevel = 'MEDIUM';
    }

    return impact;
  }

  /**
   * Assess business impact
   */
  private assessBusinessImpact(testResults: ParsedTestResults): BusinessImpact {
    const failureRate =
      (testResults.summary?.failedTests || 0) / (testResults.summary?.totalTests || 1);
    const criticalFailures = (testResults.failures || []).filter(
      (f) =>
        f.message.includes('production') ||
        f.message.includes('critical') ||
        f.message.includes('security'),
    ).length;

    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const factors: string[] = [];

    if (failureRate > 0.3) {
      level = 'HIGH';
      factors.push('High failure rate may indicate system instability');
    } else if (failureRate > 0.1) {
      level = 'MEDIUM';
      factors.push('Moderate failure rate requires attention');
    }

    if (criticalFailures > 0) {
      level = 'CRITICAL';
      factors.push(`${criticalFailures} critical system failures detected`);
    }

    return { level, factors, impact: failureRate };
  }

  /**
   * Assess technical impact
   */
  private assessTechnicalImpact(testResults: ParsedTestResults): TechnicalImpact {
    const errorCategories = this.analyzeErrors(testResults).categorizedErrors;
    const factors: string[] = [];
    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Check for infrastructure issues
    if (errorCategories.has('NETWORK_ERROR') || errorCategories.has('CONFIG_ERROR')) {
      level = 'HIGH';
      factors.push('Infrastructure configuration issues detected');
    }

    // Check for API/Service issues
    if (errorCategories.has('API_ERROR') || errorCategories.has('AUTH_ERROR')) {
      level = 'MEDIUM';
      factors.push('API integration issues may affect functionality');
    }

    // Check for dependency issues
    if (errorCategories.has('DEPENDENCY_ERROR')) {
      level = 'MEDIUM';
      factors.push('Dependency issues may affect build/deployment');
    }

    return { level, factors, affectedSystems: Array.from(errorCategories.keys()) };
  }

  /**
   * Assess customer impact
   */
  private assessCustomerImpact(testResults: ParsedTestResults): CustomerImpact {
    const customerFacingTests = (testResults.testSuites || []).filter(
      (suite) =>
        suite.name.includes('e2e') ||
        suite.name.includes('integration') ||
        suite.name.includes('api') ||
        suite.name.includes('user'),
    );

    const failedCustomerTests = customerFacingTests.filter(
      (suite) => suite.status === 'fail',
    ).length;
    const totalCustomerTests = customerFacingTests.length;

    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const factors: string[] = [];

    if (totalCustomerTests > 0) {
      const customerFailureRate = failedCustomerTests / totalCustomerTests;

      if (customerFailureRate > 0.2) {
        level = 'HIGH';
        factors.push('Multiple customer-facing features may be affected');
      } else if (customerFailureRate > 0.1) {
        level = 'MEDIUM';
        factors.push('Some customer-facing features may be affected');
      }
    }

    // Check for authentication/security failures
    const securityFailures = (testResults.failures || []).filter(
      (f) =>
        f.message.includes('auth') ||
        f.message.includes('security') ||
        f.message.includes('unauthorized'),
    );

    if (securityFailures.length > 0) {
      level = 'CRITICAL';
      factors.push('Security-related failures may affect customer data protection');
    }

    return {
      level,
      factors,
      affectedFeatu_res: failedCustomerTests,
      customerFailureRate: totalCustomerTests > 0 ? failedCustomerTests / totalCustomerTests : 0,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(testResults: ParsedTestResults): Recommendations {
    const recommendations: Recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      preventive: [],
    };

    const errorAnalysis = this.analyzeErrors(testResults);
    const overview = this.generateOverview(testResults);

    // Immediate actions
    if (overview.health === 'CRITICAL') {
      recommendations.immediate.push('Stop deployments until critical test failures are resolved');
    }

    if (errorAnalysis.categorizedErrors.has('AUTH_ERROR')) {
      recommendations.immediate.push('Verify authentication configuration and credentials');
    }

    if (errorAnalysis.categorizedErrors.has('CONFIG_ERROR')) {
      recommendations.immediate.push('Review and fix configuration issues');
    }

    // Short-term improvements
    if (overview.successRate < 90) {
      recommendations.shortTerm.push('Improve test stability and reliability');
      recommendations.shortTerm.push('Review and update flaky tests');
    }

    if (errorAnalysis.categorizedErrors.has('TIMEOUT_ERROR')) {
      recommendations.shortTerm.push('Optimize test performance and timeout settings');
    }

    // Long-term strategies
    if (overview.totalTests < 100) {
      recommendations.longTerm.push('Increase test coverage to improve confidence');
    }

    if (errorAnalysis.errorFrequency.size > 5) {
      recommendations.longTerm.push('Implement better error handling and recovery mechanisms');
    }

    // Preventive measures
    recommendations.preventive.push('Implement test result monitoring and alerting');
    recommendations.preventive.push('Set up automated test failure analysis');
    recommendations.preventive.push('Regular review of test health metrics');

    return recommendations;
  }

  /**
   * Analyze trends (placeholder for historical data)
   */
  private analyzeTrends(testResults: ParsedTestResults): TrendAnalysis {
    // This would typically analyze historical test data
    // For now, provide current snapshot analysis
    return {
      currentSnapshot: {
        timestamp: new Date().toISOString(),
        successRate: this.generateOverview(testResults).successRate,
        totalTests: testResults.summary?.totalTests || 0,
        failedTests: testResults.summary?.failedTests || 0,
      },
      recommendations: [
        'Implement historical test result storage',
        'Track test performance trends over time',
        'Set up regression detection',
      ],
    };
  }
}

// Export the class as default for CommonJS compatibility
export default TestOutputAnalyzer;
