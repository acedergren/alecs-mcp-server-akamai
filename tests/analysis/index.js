/**
 * Bug Analysis Engine
 * Automated bug detection, classification, root cause analysis, and impact calculation
 */

const BugDetector = require('./bug-detector');
const BugClassifier = require('./bug-classifier');
const RootCauseAnalyzer = require('./root-cause-analyzer');
const ImpactCalculator = require('./impact-calculator');

class BugAnalysisEngine {
  constructor(config = {}) {
    this.config = config;
    
    // Initialize all components
    this.detector = new BugDetector(config.detector);
    this.classifier = new BugClassifier(config.classifier);
    this.analyzer = new RootCauseAnalyzer(config.analyzer);
    this.calculator = new ImpactCalculator(config.calculator);
    
    // Analysis results storage
    this.results = {
      detected: [],
      classified: [],
      analyzed: [],
      impacts: []
    };
  }

  /**
   * Run complete analysis pipeline on test results
   */
  async analyzeTestResults(testResultsPath, context = {}) {
    console.log('Starting bug analysis pipeline...');
    
    try {
      // Phase 1: Bug Detection
      console.log('Phase 1: Detecting bugs...');
      const detectedBugs = await this.detector.analyzeTestResults(testResultsPath);
      this.results.detected = detectedBugs;
      console.log(`Detected ${detectedBugs.length} potential bugs`);
      
      // Phase 2: Bug Classification
      console.log('Phase 2: Classifying bugs...');
      const classificationResults = this.classifier.classifyBatch(detectedBugs);
      this.results.classified = classificationResults.classifications;
      console.log('Classification complete');
      
      // Phase 3: Root Cause Analysis
      console.log('Phase 3: Analyzing root causes...');
      const analyses = [];
      for (const bug of detectedBugs) {
        const analysis = await this.analyzer.analyzeBug(bug, context);
        analyses.push(analysis);
      }
      this.results.analyzed = analyses;
      console.log('Root cause analysis complete');
      
      // Phase 4: Impact Calculation
      console.log('Phase 4: Calculating impacts...');
      const impacts = [];
      for (let i = 0; i < detectedBugs.length; i++) {
        const bug = detectedBugs[i];
        const classification = classificationResults.classifications[i];
        const analysis = analyses[i];
        
        // Enhance bug with classification and analysis data
        const enhancedBug = {
          ...bug,
          ...classification,
          rootCauses: analysis.rootCauses,
          correlations: analysis.correlations
        };
        
        const impact = this.calculator.calculateImpact(enhancedBug, context);
        impacts.push(impact);
      }
      this.results.impacts = impacts;
      console.log('Impact calculation complete');
      
      // Generate comprehensive report
      const report = await this.generateComprehensiveReport();
      
      console.log('Bug analysis pipeline complete');
      return report;
      
    } catch (error) {
      console.error('Error in bug analysis pipeline:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateComprehensiveReport() {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalBugsAnalyzed: this.results.detected.length
      },
      
      summary: this.generateExecutiveSummary(),
      
      detection: await this.detector.generateReport(),
      
      classification: this.results.classified.length > 0 ? 
        this.classifier.generateBatchSummary(this.results.classified) : {},
      
      rootCause: await this.analyzer.generateReport(this.results.analyzed),
      
      impact: this.calculator.generateReport(this.results.impacts),
      
      actionPlan: this.generateActionPlan(),
      
      trends: this.analyzeTrends(),
      
      predictions: this.generatePredictions()
    };
    
    return report;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    const summary = {
      criticalFindings: [],
      keyMetrics: {},
      recommendations: []
    };
    
    // Critical findings
    const criticalBugs = this.results.classified.filter(c => c.severity === 'critical');
    summary.criticalFindings = criticalBugs.map(bug => ({
      id: bug.bugId,
      description: this.results.detected.find(d => d.id === bug.bugId)?.description,
      impact: this.results.impacts.find(i => i.bugId === bug.bugId)?.recommendation.reasoning.join('; ')
    }));
    
    // Key metrics
    summary.keyMetrics = {
      totalBugs: this.results.detected.length,
      criticalBugs: criticalBugs.length,
      totalFinancialImpact: this.results.impacts.reduce((sum, i) => 
        sum + (i.business?.financial?.total || 0), 0
      ),
      totalCustomersAffected: this.results.impacts.reduce((sum, i) => 
        sum + (i.customer?.affectedCustomers || 0), 0
      ),
      totalEffortRequired: this.results.impacts.reduce((sum, i) => 
        sum + (i.resources?.total?.hours || 0), 0
      )
    };
    
    // Top recommendations
    const immediateActions = this.results.impacts
      .filter(i => i.recommendation.priority === 'IMMEDIATE')
      .slice(0, 5);
      
    summary.recommendations = immediateActions.map(impact => ({
      bugId: impact.bugId,
      action: impact.recommendation.action,
      reasoning: impact.recommendation.reasoning[0]
    }));
    
    return summary;
  }

  /**
   * Generate action plan based on analysis
   */
  generateActionPlan() {
    const plan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      preventive: []
    };
    
    // Group impacts by priority
    for (const impact of this.results.impacts) {
      const bugInfo = {
        bugId: impact.bugId,
        description: this.results.detected.find(d => d.id === impact.bugId)?.description,
        effort: impact.resources.total.hours,
        cost: impact.resources.total.cost,
        assignTo: this.suggestAssignment(impact)
      };
      
      switch (impact.recommendation.priority) {
        case 'IMMEDIATE':
          plan.immediate.push({
            ...bugInfo,
            deadline: 'Within 4 hours',
            action: 'Emergency fix and deploy'
          });
          break;
        case 'HIGH':
          plan.shortTerm.push({
            ...bugInfo,
            deadline: 'Within 1 week',
            action: 'Schedule for next sprint'
          });
          break;
        case 'MEDIUM':
          plan.longTerm.push({
            ...bugInfo,
            deadline: 'Within 1 month',
            action: 'Add to backlog'
          });
          break;
      }
    }
    
    // Add preventive measures based on patterns
    const patterns = this.identifyPatterns();
    for (const pattern of patterns) {
      plan.preventive.push({
        pattern: pattern.name,
        occurrences: pattern.count,
        prevention: pattern.prevention,
        effort: pattern.effort
      });
    }
    
    return plan;
  }

  /**
   * Suggest team/person assignment based on bug characteristics
   */
  suggestAssignment(impact) {
    const bug = this.results.detected.find(d => d.id === impact.bugId);
    
    if (bug?.category === 'security') {
      return 'Security Team';
    } else if (bug?.category === 'performance') {
      return 'Performance Team';
    } else if (impact.technical?.complexity?.score > 70) {
      return 'Senior Developer';
    } else if (bug?.category === 'configuration') {
      return 'DevOps Team';
    }
    
    return 'Development Team';
  }

  /**
   * Identify patterns in bugs for preventive measures
   */
  identifyPatterns() {
    const patterns = [];
    const categories = {};
    
    // Count by category
    for (const bug of this.results.detected) {
      categories[bug.category] = (categories[bug.category] || 0) + 1;
    }
    
    // Generate preventive measures for common patterns
    for (const [category, count] of Object.entries(categories)) {
      if (count >= 3) {
        patterns.push(this.getPreventiveMeasure(category, count));
      }
    }
    
    return patterns;
  }

  /**
   * Get preventive measure for a bug category
   */
  getPreventiveMeasure(category, count) {
    const measures = {
      security: {
        name: 'Security vulnerabilities',
        prevention: 'Implement security scanning in CI/CD pipeline',
        effort: 40
      },
      performance: {
        name: 'Performance degradation',
        prevention: 'Add performance testing and monitoring',
        effort: 60
      },
      configuration: {
        name: 'Configuration issues',
        prevention: 'Implement configuration validation and drift detection',
        effort: 30
      },
      resource: {
        name: 'Resource management',
        prevention: 'Add resource monitoring and automatic cleanup',
        effort: 40
      },
      data: {
        name: 'Data integrity',
        prevention: 'Implement data validation and integrity checks',
        effort: 50
      }
    };
    
    return {
      ...measures[category] || {
        name: category,
        prevention: 'Implement better testing and monitoring',
        effort: 30
      },
      count
    };
  }

  /**
   * Analyze trends from historical data
   */
  analyzeTrends() {
    const trends = {
      bugRate: 'stable',
      severityTrend: 'stable',
      categories: {},
      predictions: []
    };
    
    // Analyze historical data if available
    if (this.detector.historicalData && this.detector.historicalData.length > 0) {
      // Bug rate trend
      const recentCount = this.results.detected.length;
      const historicalAvg = this.detector.historicalData.reduce((sum, h) => 
        sum + h.bugCount, 0
      ) / this.detector.historicalData.length;
      
      if (recentCount > historicalAvg * 1.2) {
        trends.bugRate = 'increasing';
      } else if (recentCount < historicalAvg * 0.8) {
        trends.bugRate = 'decreasing';
      }
      
      // Category trends
      for (const bug of this.results.detected) {
        trends.categories[bug.category] = (trends.categories[bug.category] || 0) + 1;
      }
    }
    
    return trends;
  }

  /**
   * Generate predictions based on patterns and trends
   */
  generatePredictions() {
    const predictions = [];
    
    // Performance prediction
    const perfBugs = this.results.detected.filter(b => b.category === 'performance');
    if (perfBugs.length > 3) {
      predictions.push({
        type: 'performance',
        prediction: 'Performance issues likely to increase without optimization',
        confidence: 0.8,
        timeframe: '2 weeks',
        recommendation: 'Schedule performance optimization sprint'
      });
    }
    
    // Resource prediction
    const resourceBugs = this.results.detected.filter(b => b.category === 'resource');
    const hasMemoryLeak = resourceBugs.some(b => b.type === 'memory_leak');
    if (hasMemoryLeak) {
      predictions.push({
        type: 'resource',
        prediction: 'Memory exhaustion likely within operational window',
        confidence: 0.9,
        timeframe: '1 week',
        recommendation: 'Immediate memory leak fix required'
      });
    }
    
    // Security prediction
    const securityBugs = this.results.detected.filter(b => b.category === 'security');
    if (securityBugs.length > 0) {
      predictions.push({
        type: 'security',
        prediction: 'Security vulnerabilities increase attack surface',
        confidence: 1.0,
        timeframe: 'immediate',
        recommendation: 'Security audit and immediate patching'
      });
    }
    
    return predictions;
  }

  /**
   * Export analysis results to various formats
   */
  async exportResults(format = 'json', outputPath = './bug-analysis-report') {
    const report = await this.generateComprehensiveReport();
    
    switch (format) {
      case 'json':
        await this.exportJSON(report, `${outputPath}.json`);
        break;
      case 'html':
        await this.exportHTML(report, `${outputPath}.html`);
        break;
      case 'markdown':
        await this.exportMarkdown(report, `${outputPath}.md`);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export report as JSON
   */
  async exportJSON(report, path) {
    const fs = require('fs').promises;
    await fs.writeFile(path, JSON.stringify(report, null, 2));
    console.log(`Report exported to ${path}`);
  }

  /**
   * Export report as HTML
   */
  async exportHTML(report, path) {
    const html = this.generateHTMLReport(report);
    const fs = require('fs').promises;
    await fs.writeFile(path, html);
    console.log(`Report exported to ${path}`);
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Bug Analysis Report - ${report.metadata.timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2, h3 { color: #333; }
    .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; }
    .critical { color: #d32f2f; font-weight: bold; }
    .metric { display: inline-block; margin: 10px; padding: 10px; background: #e3f2fd; border-radius: 3px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .priority-IMMEDIATE { background-color: #ffebee; }
    .priority-HIGH { background-color: #fff3e0; }
    .priority-MEDIUM { background-color: #f3e5f5; }
  </style>
</head>
<body>
  <h1>Bug Analysis Report</h1>
  <p>Generated: ${report.metadata.timestamp}</p>
  
  <div class="summary">
    <h2>Executive Summary</h2>
    <div>
      <span class="metric">Total Bugs: <strong>${report.summary.keyMetrics.totalBugs}</strong></span>
      <span class="metric critical">Critical Bugs: <strong>${report.summary.keyMetrics.criticalBugs}</strong></span>
      <span class="metric">Financial Impact: <strong>$${report.summary.keyMetrics.totalFinancialImpact.toFixed(0)}</strong></span>
      <span class="metric">Customers Affected: <strong>${report.summary.keyMetrics.totalCustomersAffected}</strong></span>
      <span class="metric">Total Effort: <strong>${report.summary.keyMetrics.totalEffortRequired}h</strong></span>
    </div>
  </div>
  
  <h2>Critical Findings</h2>
  <ul>
    ${report.summary.criticalFindings.map(finding => 
      `<li class="critical">${finding.id}: ${finding.description}</li>`
    ).join('')}
  </ul>
  
  <h2>Action Plan</h2>
  <h3>Immediate Actions</h3>
  <table>
    <tr>
      <th>Bug ID</th>
      <th>Description</th>
      <th>Effort</th>
      <th>Assign To</th>
    </tr>
    ${report.actionPlan.immediate.map(action => `
      <tr class="priority-IMMEDIATE">
        <td>${action.bugId}</td>
        <td>${action.description}</td>
        <td>${action.effort}h</td>
        <td>${action.assignTo}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>Predictions</h2>
  <ul>
    ${report.predictions.map(pred => 
      `<li><strong>${pred.type}:</strong> ${pred.prediction} (confidence: ${(pred.confidence * 100).toFixed(0)}%)</li>`
    ).join('')}
  </ul>
</body>
</html>`;
  }

  /**
   * Export report as Markdown
   */
  async exportMarkdown(report, path) {
    const markdown = this.generateMarkdownReport(report);
    const fs = require('fs').promises;
    await fs.writeFile(path, markdown);
    console.log(`Report exported to ${path}`);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(report) {
    return `# Bug Analysis Report

Generated: ${report.metadata.timestamp}

## Executive Summary

### Key Metrics
- **Total Bugs**: ${report.summary.keyMetrics.totalBugs}
- **Critical Bugs**: ${report.summary.keyMetrics.criticalBugs}
- **Financial Impact**: $${report.summary.keyMetrics.totalFinancialImpact.toFixed(0)}
- **Customers Affected**: ${report.summary.keyMetrics.totalCustomersAffected}
- **Total Effort Required**: ${report.summary.keyMetrics.totalEffortRequired}h

### Critical Findings
${report.summary.criticalFindings.map(finding => 
  `- **${finding.id}**: ${finding.description}`
).join('\n')}

## Action Plan

### Immediate Actions (Within 4 hours)
| Bug ID | Description | Effort | Assign To |
|--------|-------------|--------|-----------|
${report.actionPlan.immediate.map(action => 
  `| ${action.bugId} | ${action.description} | ${action.effort}h | ${action.assignTo} |`
).join('\n')}

### Short Term (Within 1 week)
| Bug ID | Description | Effort | Assign To |
|--------|-------------|--------|-----------|
${report.actionPlan.shortTerm.map(action => 
  `| ${action.bugId} | ${action.description} | ${action.effort}h | ${action.assignTo} |`
).join('\n')}

## Preventive Measures
${report.actionPlan.preventive.map(measure => 
  `- **${measure.pattern}** (${measure.occurrences} occurrences): ${measure.prevention} (${measure.effort}h effort)`
).join('\n')}

## Predictions
${report.predictions.map(pred => 
  `- **${pred.type}**: ${pred.prediction} (${(pred.confidence * 100).toFixed(0)}% confidence)
  - Timeframe: ${pred.timeframe}
  - Recommendation: ${pred.recommendation}`
).join('\n\n')}
`;
  }
}

// Export all components
module.exports = {
  BugAnalysisEngine,
  BugDetector,
  BugClassifier,
  RootCauseAnalyzer,
  ImpactCalculator
};