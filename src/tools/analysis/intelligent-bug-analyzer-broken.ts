/**
 * Intelligent Bug Analysis & TODO Generator System
 *
 * Main integration file this._options = {
      enableCxAnalysis: _options.enableCxAnalysis !== false,
      enableStrategyOptimization: _options.enableStrategyOptimization !== false,
      outputFormat: _options.outputFormat || 'json',
      includeMetrics: _options.includeMetrics !== false,
      ..._options};

    this.outputAnalyzer = new TestOutputAnalyzer();
    this.todoGenerator = new TodoGenerator();
    this.cxAnalyzer = new CustomerExperienceImpactAnalyzer();
    this.strategyOptimizer = new FixStrategyOptimizer();

    this.analysisHistory = [];
    this.benchmarks = this.initializeBenchmarks();
  }

  /**
   * Perform complete bug analysis workflow
   */
  async analyzeTestResults(
    testOutput: string | TestResults,
    format = 'jest',
    _options: Record<string, any> = {},
  ): Promise<AnalysisResult> {
    const analysisId = this.generateAnalysisId();
    const startTime = Date.now();

    try {
      // Phase 1: Parse and analyze test output
      console.log(`[${analysisId}] Starting test output analysis...`);
      const testResults = this.outputAnalyzer.parseTestOutput(testOutput, format);
      const _testAnalysis = this.outputAnalyzer.analyzeResults(testResults);

      // Phase 2: Generate TODO list
      console.log(`[${analysisId}] Generating TODO list...`);
      const todoList = this.todoGenerator.generateTodoList(_testAnalysis, _options);

      // Phase 3: Customer experience analysis (if enabled)
      let customerImpact: CustomerImpact | null = null;
      if (thi_options.enableCxAnalysis) {
        console.log(`[${analysisId}] Analyzing customer experience impact...`);
        customerImpact = this.cxAnalyzer.analyzeCustomerImpact(testResults, _testAnalysis);
      }

      // Phase 4: Fix strategy optimization (if enabled)
      let fixStrategy: FixStrategy | null = null;
      if (thi_options.enableStrategyOptimization) {
        console.log(`[${analysisId}] Optimizing fix strategy...`);
        fixStrategy = this.strategyOptimizer.generateFixStrategy(_testAnalysis, todoList, _options);
      }

      // Phase 5: Generate comprehensive report
      const analysisReport = this.generateAnalysisReport({
        analysisId
        })
        testResults
        })
        testAnalysis
        todoList
        })
        customerImpact
        })
        fixStrategy
        })
        processingTime: Date.now() - startTime
        })
     ..._options
    });

      // Phase 6: Store analysis for historical tracking
      this.storeAnalysis(analysisReport);

      // Phase 7: Generate insights and recommendations
      const insights = this.generateInsights(analysisReport);

      console.log(`[${analysisId}] Analysis complete in ${Date.now() - startTime}ms`);

      return {
        analysisId
        })
        report: analysisReport
    })
        insights: insights
    })
        exports: this.generateExports(analysisReport, thi_options.outputFormat!)
    };
    } catch (_error) {
      console.error("[Error]:", _error);
      throw new AnalysisError(`Bug analysis failed: ${(_error as Error).message}`, {
        analysisId
        })
        phase: 'unknown'
        })
        originalError: _error as Error
    }); }

  /**
   * Generate comprehensive analysis report
   */
  private generateAnalysisReport(data: {,
      analysisId: string;
    testResults: TestResults;,
      testAnalysis: TestAnalysis;
    todoList: TodoList;,
      customerImpact: CustomerImpact | null;
    fixStrategy: FixStrategy | null;,
      processingTime: number;
 ..._options: Record<string, any>;
  }): AnalysisReport {
    const {
      analysisId
        })
      testResults
        })
      testAnalysis
      todoList
        })
      customerImpact
        })
      fixStrategy
        })
      processingTime
        })
   ..._options
    } = data;

    const report: AnalysisReport = {
      metadata: {
        analysisId,
        timestamp: new Date().toISOString(),
        processingTime,
        version: '1.0.0',
        _options: this.sanitizeOptions(_options)},
      executive_summary: this.generateExecutiveSummary({
        testAnalysis: _testAnalysis,
        todoList,
        customerImpact,
        fixStrategy}),
      test_analysis: {
        results: testResults,
        analysis: _testAnalysis,
        health_score: this.calculateHealthScore(testResults, _testAnalysis),
        trends: this.analyzeTrends(testResults, _testAnalysis)},
      todo_management: {
        list: todoList,
        prioritization: this.enhancePrioritization(todoList),
        execution_plan: this.createExecutionPlan(todoList)},
      customer_impact: customerImpact,
      fix_strategy: fixStrategy,
      recommendations: this.generateUnifiedRecommendations({
        testAnalysis: _testAnalysis,
        todoList,
        customerImpact,
        fixStrategy}),
      metrics: this._options.includeMetrics ? this.calculateMetrics(data) : null,
      next_steps: this.defineNextSteps(data)};

    return report;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(data: {,
      testAnalysis: TestAnalysis;
    todoList: TodoList;,
      customerImpact: CustomerImpact | null;
    fixStrategy: FixStrategy | null;
  }): ExecutiveSummary {
    const { testAnalysis, todoList, customerImpact, fixStrategy } = data;

    const testOverview = _testAnalysis.overview;
    const criticalIssues =
      todoList.items?.filter((item) => item.priority === 'CRITICAL').length || 0;
    const _quickWins = todoList.quickWins?.length || 0;
    const _estimatedHours = todoList.metadata?.estimatedTotalHours || 0;

    const summary: ExecutiveSummary = {,
      situation: this.generateSituationSummary(testOverview, criticalIssues)
        })
      customer_impact: this.generateCustomerImpactSummary(customerImpact)
        })
      recommended_actions: this.generateActionSummary(todoList, fixStrategy)
        })
      resource_requirements: this.generateResourceSummary(fixStrategy)
        })
      timeline: this.generateTimelineSummary(fixStrategy)
        })
      business_impact: this.generateBusinessImpactSummary(customerImpact)
        })
      risk_assessment: this.generateRiskSummary(testAnalysis, customerImpact, fixStrategy)
        })
      success_probability: this.calculateSuccessProbability(data)
    };

    return summary;
  }

  /**
   * Generate situation summary
   */
  private generateSituationSummary(
    testOverview: TestAnalysis['overview']
        })
    criticalIssues: number
    })
  ): SituationSummary {
    const successRate = testOverview?.successRate || 0;
    const health = testOverview?.health || 'UNKNOWN';

    let severity: SituationSummary['severity'] = 'NORMAL';
    let description = 'Test suite is performing well';

    if (criticalIssues > 0) {
      severity = 'CRITICAL';
      description = `${criticalIssues} critical issues detected requiring immediate attention`;
    } else if (health === 'POOR' || successRate < 70) {
      severity = 'HIGH';
      description = `Test suite health is poor (${successRate.toFixed(1)}% success rate)`;
    } else if (health === 'FAIR' || successRate < 85) {
      severity = 'MEDIUM';
      description = `Test suite needs improvement (${successRate.toFixed(1)}% success rate)`;
    } else if (successRate >= 95) {
      description = `Test suite is healthy (${successRate.toFixed(1)}% success rate)`;
    }

    return {
      severity
        })
      description
        })
      success_rate: successRate
    })
      health_status: health
    })
      critical_issues: criticalIssues
    })
      total_tests: testOverview?.totalTests || 0
        })
      failed_tests: testOverview?.failedTests || 0
    };
  }

  /**
   * Generate customer impact summary
   */
  private generateCustomerImpactSummary(
    customerImpact: CustomerImpact | null
        })
  ): CustomerImpactSummary {
    if (!customerImpact) {
      return {
        level: 'UNKNOWN'
        })
        description: 'Customer impact analysis not performed'
        })
        affected_personas: 0
    })
        affected_journeys: 0
    };
    }

    const overview = customerImpact.overview;
    return {
      level: overview?.riskLevel || 'LOW'
        })
      description: this.getCustomerImpactDescription(overview)
        })
      impact_score: overview?.customerImpactScore || 0
        })
      affected_personas: overview?.affectedPersonas?.length || 0
        })
      affected_journeys: overview?.affectedJourneys?.length || 0
        })
      estimated_customers_affected: overview?.estimatedCustomersAffected || 'MINIMAL'
    };
  }

  /**
   * Get customer impact description
   */
  private getCustomerImpactDescription(overview: CustomerImpact['overview']): string {
    const score = overview?.customerImpactScore || 0;
    const affected = overview?.estimatedCustomersAffected || 'MINIMAL';

    if (score < 60 && affected !== 'MINIMAL') {
      return 'Significant customer experience degradation detected';
    } else if (score < 80) {
      return 'Moderate customer impact identified';
    } else if (score < 90) {
      return 'Minor customer experience issues detected';
    } else {
      return 'Minimal customer impact expected'; }

  /**
   * Generate unified recommendations
   */
  private generateUnifiedRecommendations(data: {,
      testAnalysis: TestAnalysis;
    todoList: TodoList;,
      customerImpact: CustomerImpact | null;
    fixStrategy: FixStrategy | null;
  }): Recommendations {
    const { _testAnalysis, todoList, customerImpact, fixStrategy } = data;

    const recommendations: Recommendations = {,
      immediate: []
        })
      short_term: []
        })
      long_term: []
        })
      strategic: []
    };

    // Critical and immediate actions
    const criticalItems = todoList.items?.filter((item) => item.priority === 'CRITICAL') || [];
    criticalItems.forEach((item) => {
      recommendations.immediate.push({
        action: item.title
        })
        reason: 'Critical issue requiring immediate attention'
        })
        effort: item.effort_details?.label || 'Unknown'
        })
        owner: this.assignOwner(item)
        })
        timeline: '< 24 hours'
    });
    });

    // Quick wins
    const _quickWins = todoList.quickWins || [];
    _quickWins.slice(0, 3).forEach((item) => {
      recommendations.immediate.push({
        action: item.title
        })
        reason: 'Quick win for immediate impact'
        })
        effort: item.effort_details?.label || 'Unknown'
        })
        owner: this.assignOwner(item)
        })
        timeline: '< 1 week'
    });
    });

    // Customer impact mitigation
    if (customerImpact?.overview?.riskLevel === "CRITICAL") {
      recommendations.immediate.push({
        action: 'Activate customer communication protocol'
        })
        reason: 'Critical customer impact detected'
        })
        effort: 'Quick Fix'
        })
        owner: 'Customer Success Team'
        })
        timeline: '< 4 hours'
    });
    }

    // Strategic initiatives from fix strategy
    if (fixStrategy?.strategicInitiatives?.initiatives) {
      fixStrategy.strategicInitiatives.initiatives.slice(0, 2).forEach((initiative) => {
        recommendations.strategic.push({
          action: initiative.name
        })
          reason: initiative.description
        })
          effort: `${initiative.estimatedEffort} hours`
        })
          owner: 'Engineering Team'
        })
          timeline: this.estimateInitiativeTimeline(initiative)
    });
      });
    }

    // Process improvements
    recommendations.long_term.push({
      action: 'Implement continuous quality monitoring'
        })
      reason: 'Prevent similar issues in the future'
        })
      effort: 'Moderate Task'
        })
      owner: 'DevOps Team'
        })
      timeline: '2-4 weeks'
    });

    return recommendations;
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(testResults: TestResults, _testAnalysis: TestAnalysis): HealthScore {
    const successRate = _testAnalysis.overview?.successRate || 0;
    const criticalFailures =
      _testAnalysis.errorAnalysis?.categorizedErrors?.get('AUTH_ERROR')?.length || 0;
    const performanceScore = this.calculatePerformanceScore(testResults);
    const stabilityScore = this.calculateStabilityScore(testAnalysis);

    const healthScore =
      successRate * 0.4 +
      Math.max(0, 100 - criticalFailures * 20) * 0.3 +
      performanceScore * 0.2 +
      stabilityScore * 0.1;

    return {
      overall: Math.round(healthScore)
        })
      success_rate: Math.round(successRate)
        })
      performance: Math.round(performanceScore)
        })
      stability: Math.round(stabilityScore)
        })
      critical_failures: criticalFailures
    })
      grade: this.getHealthGrade(healthScore)
    };
  }

  /**
   * Get health grade
   */
  private getHealthGrade(score: number): string {
          if (score >= 95) {
return 'A+';
}
          if (score >= 90) {
        return "A";
}
    if (score >= 85) {
return 'B+';
}
    if (score >= 80) {
return 'B';
}
    if (score >= 75) {
return 'C+';
}
    if (score >= 70) {
return 'C';
}
    if (score >= 60) {
return 'D';
}
    return 'F';
  }

  /**
   * Generate exports in various formats
   */
  private generateExports(_report: AnalysisReport, format: string): Record<string, ExportItem> {
    const exports: Record<string, ExportItem> = {};

    // JSON export (always available)
    exports.json = {
      filename: `bug-analysis-${_report.metadata.analysisId}.json`
        })
      content: JSON.stringify(report, null, 2)
    };

    // Markdown export
    if (format === 'markdown' || format === 'all') {
      exports.markdown = {
        filename: `bug-analysis-${_report.metadata.analysisId}.md`
        })
        content: this.generateMarkdownReport(report)
    };
    }

    // CSV export for TODO items
    if (format === 'csv' || format === 'all') {
      exports.csv = {
        filename: `todo-items-${_report.metadata.analysisId}.csv`
        })
        content: this.todoGenerator.exportTodos(_report.todo_management.list, 'csv')
    };
    }

    // GitHub Issues export
    if (format === 'github' || format === 'all') {
      exports.github = {
        filename: `github-issues-${_report.metadata.analysisId}.json`
        })
        content: this.todoGenerator.exportTodos(_report.todo_management.list, 'github')
    };
    }

    // Executive summary export
    exports.summary = {
      filename: `executive-summary-${_report.metadata.analysisId}.json`
        })
      content: JSON.stringify(_report.executive_summary, null, 2)
    };

    return exports;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(_report: AnalysisReport): string {
    const { metadata, executive_summary, test_analysis, todo_management } = report;

    let markdown = '# Bug Analysis Report\n\n';
    markdown += `**Analysis ID**: ${metadata.analysisId}\n`;
    markdown += `**Generated**: ${metadata.timestamp}\n`;
    markdown += `**Processing Time**: ${metadata.processingTime}ms\n\n`;

    // Executive Summary
    markdown += '## 📋 Executive Summary\n\n';
    markdown += '### Situation\n';
    markdown += `- **Severity**: ${executive_summary.situation.severity}\n`;
    markdown += `- **Description**: ${executive_summary.situation.description}\n`;
    markdown += `- **Success Rate**: ${executive_summary.situation.success_rate.toFixed(1)}%\n`;
    markdown += `- **Health Status**: ${executive_summary.situation.health_status}\n\n`;

    // Health Score
    if (test_analysis.health_score) {
      markdown += `### 🏥 Health Score: ${test_analysis.health_score.grade} (${test_analysis.health_score.overall}/100)\n\n`;
      markdown += `- **Success Rate**: ${test_analysis.health_score.success_rate}%\n`;
      markdown += `- **Performance**: ${test_analysis.health_score.performance}%\n`;
      markdown += `- **Stability**: ${test_analysis.health_score.stability}%\n`;
      markdown += `- **Critical Failures**: ${test_analysis.health_score.critical_failures}\n\n`;
    }

    // TODO List Summary
    markdown += '## ✅ TODO Summary\n\n';
    markdown += `- **Total Items**: ${todo_management.list.metadata.totalItems}\n`;
    markdown += `- **Critical**: ${todo_management.list.metadata.criticalCount}\n`;
    markdown += `- **High Priority**: ${todo_management.list.metadata.highCount}\n`;
    markdown += `- **Estimated Hours**: ${todo_management.list.metadata.estimatedTotalHours}\n\n`;

    // Quick Wins
    if (todo_management.list.quickWins && todo_management.list.quickWins.length > 0) {
      markdown += '### 🚀 Quick Wins\n\n';
      todo_management.list.quickWins.forEach((item) => {
        markdown += `- **${item.title}** (${item.effort_details?.hours}h) - ${item.description}\n`;
      });
      markdown += '\n';
    }

    // Critical Items
    const criticalItems = todo_management.list.priorityGroups?.CRITICAL || [];
    if (criticalItems.length > 0) {
      markdown += '### 🚨 Critical Items\n\n';
      criticalItems.forEach((item) => {
        markdown += `#### ${item.type_details?.icon} ${item.title}\n`;
        markdown += `${item.description}\n\n`;
        markdown += `**Effort**: ${item.effort_details?.label} (${item.effort_details?.hours}h)\n`;
        markdown += `**Type**: ${item.type_details?.category}\n\n`;
      });
    }

    // Recommendations
    if (_report.recommendations) {
      markdown += '## 💡 Recommendations\n\n';

      if (_report.recommendations.immediate?.length > 0) {
        markdown += '### Immediate Actions\n';
        _report.recommendations.immediate.forEach((rec) => {
          markdown += `- **${rec.action}** (${rec.effort}) - ${rec.reason}\n`;
        });
        markdown += '\n'; }

    return markdown;
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(_report: AnalysisReport): any {
    const insights = {
      patterns: this.identifyPatterns(report)
        })
      trends: this.identifyTrends(report)
        })
      recommendations: this.generateActionableInsights(report)
        })
      predictions: this.generatePredictions(report)
        })
      comparisons: this.generateComparisons(report)
    };

    return insights;
  }

  /**
   * Store analysis for historical tracking
   */
  private storeAnalysis(_report: AnalysisReport): void {
    this.analysisHistory.push({
      id: _report.metadata.analysisId
        })
      timestamp: _report.metadata.timestamp
        })
      summary: _report.executive_summary
        })
      metrics: _report.metrics
        })
      health_score: _report.test_analysis.health_score
    });

    // Keep only last 50 analyses
    if (this.analysisHistory.length > 50) {
      this.analysisHistory = this.analysisHistory.slice(-50); }

  /**
   * Helper methods
   */
  private generateAnalysisId(): string {
    return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeOption..._options: Record<string, any>): Partial<AnalyzerOptions> {
    return {
      enableCxAnalysis_options.enableCxAnalysis
        })
      enableStrategyOptimization_options.enableStrategyOptimization
        })
      outputFormat_options.outputFormat
        })
      includeMetrics_options.includeMetrics
    };
  }

  private assignOwner(item: TodoItem): string {
    const category = item.type;
    const ownerMap: Record<string, string> = {
      security: 'Security Team'
        })
      infrastructure: 'DevOps Team'
        })
      performance: 'Engineering Team'
        })
      configuration: 'DevOps Team'
        })
      bug_fix: 'Engineering Team'
        })
      testing: 'QA Team'
        })
      documentation: 'Technical Writing Team'
        })
      monitoring: 'DevOps Team'
    };

    return ownerMap[category] || 'Engineering Team';
  }

  private estimateInitiativeTimeline(initiative: { estimatedEffort: number
    }): string {
    const hours = initiative.estimatedEffort || 0;
    if (hours < 40) {
        return "1-2 weeks";
}
    if (hours < 160) {
return '3-4 weeks';
}
    if (hours < 320) {
return '6-8 weeks';
}
    return '2-3 months';
  }

  private calculatePerformanceScore(testResults: TestResults): number {
    const avgRuntime =
      (testResults.testSuites?.reduce((sum, suite) => sum + (suite.runtime || 0), 0) || 0) /
      (testResults.testSuites?.length || 1);

    // Score based on average test runtime (lower is better)
    if (avgRuntime < 1000) {
return 100;
}
    if (avgRuntime < 5000) {
return 90;
}
    if (avgRuntime < 10000) {
return 80;
}
    if (avgRuntime < 30000) {
return 70;
}
    return 60;
  }

  private calculateStabilityScore(_testAnalysis: TestAnalysis): number {
    const repeatingFailures = _testAnalysis.patternAnalysis?.repeatingFailures?.length || 0;
    const cascadingFailures = _testAnalysis.patternAnalysis?.cascadingFailures?.length || 0;

    const stabilityIssues = repeatingFailures + cascadingFailures;
    return Math.max(0, 100 - stabilityIssues * 10);
  }

  private calculateSuccessProbability(data: {,
      testAnalysis: TestAnalysis;
    todoList: TodoList;,
      customerImpact: CustomerImpact | null;
    fixStrategy: FixStrategy | null;
  }): number {
    // Simplified success probability calculation
    const { _testAnalysis, todoList, customerImpact, _fixStrategy } = data;

    let probability = 85; // Base probability

    // Adjust based on critical issues
    const criticalIssues =
      todoList.items?.filter((item) => item.priority === 'CRITICAL').length || 0;
    probability -= criticalIssues * 5;

    // Adjust based on customer impact
    if (customerImpact?.overview?.riskLevel === "CRITICAL") {
        probability -= 15;
      } else if (customerImpact?.overview?.riskLevel === "HIGH") {
                probability -= 10;
}

    // Adjust based on total effort
    const totalHours = todoList.metadata?.estimatedTotalHours || 0;
    if (totalHours > 500) {
                probability -= 10;
      } else if (totalHours > 200) {
        probability -= 5;
}

    return Math.max(10, Math.min(95, probability));
  }

  private initializeBenchmarks(): Benchmarks {
    return {
      successRate: { excellent: 95, good: 85, fair: 70, poor: 50
    }testRuntime: { excellent: 1000, good: 5000, fair: 15000, poor: 30000
    }customerImpactScore: { excellent: 90, good: 80, fair: 70, poor: 60
    };
  }

  // Placeholder methods for future implementation
  private analyzeTrends(_testResults: TestResults, _testAnalysis: TestAnalysis): any {
    return { message: 'Trend analysis requires historical data' };
  }

  private enhancePrioritization(_todoList: TodoList): any {
    return { message: 'Enhanced prioritization applied' };
  }

  private createExecutionPlan(_todoList: TodoList): any {
    return { message: 'Execution plan created based on dependencies and resources' };
  }

  private calculateMetrics(data: any): any {
    return {
      analysis_metrics: {,
      processing_time: data.processingTime
        })
        items_analyzed: data.todoList.items?.length || 0
        })
        patterns_identified: data._testAnalysis.patternAnalysis?.repeatingFailures?.length || 0
    };
  }

  private defineNextSteps(_data: any): NextSteps {
    return {
      immediate: ['Review critical items', 'Assign owners', 'Start quick wins']
        })
      short_term: ['Execute tactical fixes', 'Monitor progress', 'Update stakeholders']
        })
      long_term: ['Implement strategic initiatives', 'Measure success', 'Iterate and improve']
    };
  }

  private generateActionSummary(_todoList: TodoList, _fixStrategy: FixStrategy | null): any {
    return { message: 'Action summary generated from todo list and fix strategy' };
  }

  private generateResourceSummary(_fixStrategy: FixStrategy | null): any {
    return { message: 'Resource requirements calculated from fix strategy' };
  }

  private generateTimelineSummary(_fixStrategy: FixStrategy | null): any {
    return { message: 'Timeline estimates based on fix strategy' };
  }

  private generateBusinessImpactSummary(_customerImpact: CustomerImpact | null): any {
    return { message: 'Business impact assessment based on customer analysis' };
  }

  private generateRiskSummary(
    _testAnalysis: TestAnalysis
    })
    _customerImpact: CustomerImpact | null
        })
    _fixStrategy: FixStrategy | null
        })
  ): any {
    return { message: 'Risk assessment based on comprehensive analysis' };
  }

  private identifyPatterns(_report: AnalysisReport): any {
    return { message: 'Pattern identification based on historical analysis' };
  }

  private identifyTrends(_report: AnalysisReport): any {
    return { message: 'Trend identification requires multiple analysis runs' };
  }

  private generateActionableInsights(_report: AnalysisReport): any {
    return { message: 'Actionable insights generated from analysis data' };
  }

  private generatePredictions(_report: AnalysisReport): any {
    return { message: 'Predictions based on current analysis and historical patterns' };
  }

  private generateComparisons(_report: AnalysisReport): any {
    return { message: 'Comparisons with previous analysis runs and benchmarks' }; }

/**
 * Custom error class for analysis failures
 */
export class AnalysisError extends Error {
  public _context: AnalysisErrorContext;
  public timestamp: string;

  constructor(message: string, _context: Partial<AnalysisErrorContext> = {}) {
    super(message);
    this.name = 'AnalysisError';
    this._context = {
      analysisId: __context.analysisId || ''
        })
      phase: __context.phase || 'unknown'
        })
      originalError: __context.originalError || new Error('Unknown error')
    };
    this.timestamp = new Date().toISOString(); }

// Re-export the imported classes for convenience
export {
  TestOutputAnalyzer
        })
  TodoGenerator
        })
  CustomerExperienceImpactAnalyzer
        })
  FixStrategyOptimizer
    };

// Default export for CommonJS compatibility
export default IntelligentBugAnalyzer;

// CommonJS module exports
module.exports = {
  IntelligentBugAnalyzer
        })
  AnalysisError
        })
  TestOutputAnalyzer
        })
  TodoGenerator
        })
  CustomerExperienceImpactAnalyzer
        })
  FixStrategyOptimizer
    };
