/**
 * Bug Classification and Prioritization System
 * Classifies bugs by severity and impact for proper prioritization
 */

class BugClassifier {
  constructor(config = {}) {
    this.config = {
      customCriteria: config.customCriteria || {},
      weights: {
        userImpact: config.weights?.userImpact || 0.35,
        businessImpact: config.weights?.businessImpact || 0.30,
        frequency: config.weights?.frequency || 0.20,
        effort: config.weights?.effort || 0.15
      },
      ...config
    };
    
    this.severityDefinitions = this.initializeSeverityDefinitions();
  }

  initializeSeverityDefinitions() {
    return {
      critical: {
        priority: 'P0',
        sla: '4 hours',
        criteria: [
          'Authentication or authorization failures',
          'Data corruption or loss',
          'Security vulnerabilities (injection, XSS, exposed secrets)',
          'Complete service unavailability',
          'Customer data exposure',
          'Financial impact > $10,000',
          'Affects > 50% of users'
        ],
        examples: [
          'Database corruption preventing all operations',
          'Authentication bypass allowing unauthorized access',
          'Memory leak causing service crashes',
          'SQL injection vulnerability in production'
        ]
      },
      
      high: {
        priority: 'P1',
        sla: '24 hours',
        criteria: [
          'Core feature functionality broken',
          'Performance degradation > 50%',
          'Error rates > 5%',
          'Customer workflow interruption',
          'Data inconsistency issues',
          'Integration failures with critical systems',
          'Affects 10-50% of users'
        ],
        examples: [
          'Property activation failing consistently',
          'API response times exceeding SLA',
          'Configuration changes not persisting',
          'Bulk operations timing out'
        ]
      },
      
      medium: {
        priority: 'P2',
        sla: '3 days',
        criteria: [
          'Usability problems affecting productivity',
          'Performance degradation 20-50%',
          'Non-critical feature issues',
          'Documentation gaps causing confusion',
          'Intermittent errors < 5% rate',
          'Workaround available',
          'Affects 5-10% of users'
        ],
        examples: [
          'UI elements not responding correctly',
          'Slow query performance on reports',
          'Validation errors with unclear messages',
          'Missing error handling in edge cases'
        ]
      },
      
      low: {
        priority: 'P3',
        sla: '1 week',
        criteria: [
          'Performance optimizations < 20% improvement',
          'Feature improvements or enhancements',
          'Code quality issues without user impact',
          'Technical debt items',
          'Minor UI/UX improvements',
          'Documentation updates',
          'Affects < 5% of users'
        ],
        examples: [
          'Code refactoring opportunities',
          'Minor UI alignment issues',
          'Outdated dependencies without vulnerabilities',
          'Test coverage improvements'
        ]
      }
    };
  }

  classifyBug(bug) {
    // Start with automatic classification based on bug properties
    let classification = this.automaticClassification(bug);
    
    // Apply custom criteria if provided
    if (this.config.customCriteria) {
      classification = this.applyCustomCriteria(bug, classification);
    }
    
    // Calculate impact scores
    const impactScores = this.calculateImpactScores(bug);
    
    // Final priority calculation
    const finalPriority = this.calculateFinalPriority(classification, impactScores);
    
    return {
      bugId: bug.id,
      severity: classification.severity,
      priority: finalPriority.priority,
      sla: this.severityDefinitions[classification.severity].sla,
      scores: impactScores,
      finalScore: finalPriority.score,
      classification: classification.reasons,
      recommendations: this.generateRecommendations(bug, classification, impactScores)
    };
  }

  automaticClassification(bug) {
    const reasons = [];
    let severity = 'low';
    
    // Check critical patterns
    if (this.matchesCriticalCriteria(bug)) {
      severity = 'critical';
      reasons.push(...this.getCriticalReasons(bug));
    }
    // Check high severity patterns
    else if (this.matchesHighCriteria(bug)) {
      severity = 'high';
      reasons.push(...this.getHighReasons(bug));
    }
    // Check medium severity patterns
    else if (this.matchesMediumCriteria(bug)) {
      severity = 'medium';
      reasons.push(...this.getMediumReasons(bug));
    }
    
    // Override based on specific bug types
    if (bug.type === 'security_vulnerability' || bug.category === 'security') {
      severity = 'critical';
      reasons.push('Security issue automatically classified as critical');
    }
    
    if (bug.type === 'data_corruption') {
      severity = 'critical';
      reasons.push('Data corruption issues are always critical');
    }
    
    return { severity, reasons };
  }

  matchesCriticalCriteria(bug) {
    const criticalIndicators = [
      bug.category === 'security',
      bug.category === 'data' && bug.type.includes('corruption'),
      bug.patterns?.some(p => p.severity === 'critical'),
      bug.userImpact === 'complete_outage',
      bug.affectedUsers > 0.5,
      bug.financialImpact > 10000,
      bug.errorRate > 0.5
    ];
    
    return criticalIndicators.some(indicator => indicator);
  }

  matchesHighCriteria(bug) {
    const highIndicators = [
      bug.category === 'performance' && bug.degradation > 0.5,
      bug.patterns?.some(p => p.severity === 'high'),
      bug.errorRate > 0.05,
      bug.affectedUsers > 0.1,
      bug.type === 'feature_broken',
      bug.reproducible === true && bug.workaround === false
    ];
    
    return highIndicators.some(indicator => indicator);
  }

  matchesMediumCriteria(bug) {
    const mediumIndicators = [
      bug.category === 'performance' && bug.degradation > 0.2,
      bug.category === 'usability',
      bug.errorRate > 0.01,
      bug.affectedUsers > 0.05,
      bug.workaround === true
    ];
    
    return mediumIndicators.some(indicator => indicator);
  }

  getCriticalReasons(bug) {
    const reasons = [];
    
    if (bug.category === 'security') {
      reasons.push(`Security vulnerability: ${bug.type}`);
    }
    if (bug.affectedUsers > 0.5) {
      reasons.push(`Affects ${(bug.affectedUsers * 100).toFixed(0)}% of users`);
    }
    if (bug.errorRate > 0.5) {
      reasons.push(`Error rate: ${(bug.errorRate * 100).toFixed(0)}%`);
    }
    if (bug.userImpact === 'complete_outage') {
      reasons.push('Complete service outage detected');
    }
    
    return reasons;
  }

  getHighReasons(bug) {
    const reasons = [];
    
    if (bug.type === 'feature_broken') {
      reasons.push('Core feature functionality broken');
    }
    if (bug.degradation > 0.5) {
      reasons.push(`Performance degradation: ${(bug.degradation * 100).toFixed(0)}%`);
    }
    if (bug.errorRate > 0.05) {
      reasons.push(`Error rate: ${(bug.errorRate * 100).toFixed(0)}%`);
    }
    if (bug.reproducible && !bug.workaround) {
      reasons.push('Consistently reproducible with no workaround');
    }
    
    return reasons;
  }

  getMediumReasons(bug) {
    const reasons = [];
    
    if (bug.category === 'usability') {
      reasons.push('Usability issue affecting user productivity');
    }
    if (bug.degradation > 0.2) {
      reasons.push(`Performance degradation: ${(bug.degradation * 100).toFixed(0)}%`);
    }
    if (bug.workaround) {
      reasons.push('Workaround available');
    }
    
    return reasons;
  }

  applyCustomCriteria(bug, classification) {
    for (const [severity, criteria] of Object.entries(this.config.customCriteria)) {
      if (criteria.match && criteria.match(bug)) {
        classification.severity = severity;
        classification.reasons.push(`Custom criteria: ${criteria.reason}`);
      }
    }
    
    return classification;
  }

  calculateImpactScores(bug) {
    return {
      userImpact: this.calculateUserImpact(bug),
      businessImpact: this.calculateBusinessImpact(bug),
      frequency: this.calculateFrequency(bug),
      effort: this.estimateEffort(bug)
    };
  }

  calculateUserImpact(bug) {
    let score = 0;
    
    // User percentage affected
    if (bug.affectedUsers) {
      score += bug.affectedUsers * 40;
    }
    
    // Severity of impact on users
    const impactMap = {
      complete_outage: 30,
      major_disruption: 20,
      minor_inconvenience: 10,
      no_impact: 0
    };
    score += impactMap[bug.userImpact] || 0;
    
    // Workflow interruption
    if (bug.workflowInterruption) {
      score += 20;
    }
    
    // Data loss risk
    if (bug.dataLossRisk) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  calculateBusinessImpact(bug) {
    let score = 0;
    
    // Financial impact
    if (bug.financialImpact) {
      if (bug.financialImpact > 100000) score += 40;
      else if (bug.financialImpact > 10000) score += 30;
      else if (bug.financialImpact > 1000) score += 20;
      else score += 10;
    }
    
    // Reputation risk
    const reputationMap = {
      high: 30,
      medium: 20,
      low: 10,
      none: 0
    };
    score += reputationMap[bug.reputationRisk] || 0;
    
    // Compliance/regulatory impact
    if (bug.complianceImpact) {
      score += 20;
    }
    
    // Customer churn risk
    if (bug.churnRisk > 0.1) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  calculateFrequency(bug) {
    let score = 0;
    
    // Occurrence rate
    if (bug.occurrences) {
      if (bug.occurrences > 1000) score += 40;
      else if (bug.occurrences > 100) score += 30;
      else if (bug.occurrences > 10) score += 20;
      else score += 10;
    }
    
    // Reproducibility
    if (bug.reproducible === true) {
      score += 30;
    } else if (bug.reproducible === 'intermittent') {
      score += 15;
    }
    
    // Trend (increasing occurrences)
    if (bug.trend === 'increasing') {
      score += 20;
    } else if (bug.trend === 'stable') {
      score += 10;
    }
    
    // Environment affected
    const envMap = {
      production: 10,
      staging: 5,
      development: 2
    };
    score += envMap[bug.environment] || 0;
    
    return Math.min(score, 100);
  }

  estimateEffort(bug) {
    let score = 100; // Start with max (least effort)
    
    // Complexity
    const complexityMap = {
      trivial: 0,
      simple: 20,
      moderate: 40,
      complex: 60,
      very_complex: 80
    };
    score -= complexityMap[bug.complexity] || 40;
    
    // Dependencies
    if (bug.dependencies) {
      score -= Math.min(bug.dependencies.length * 10, 30);
    }
    
    // Risk of fix
    const riskMap = {
      low: 0,
      medium: 10,
      high: 20
    };
    score -= riskMap[bug.fixRisk] || 0;
    
    // Testing requirements
    if (bug.requiresExtensiveTesting) {
      score -= 10;
    }
    
    return Math.max(score, 0);
  }

  calculateFinalPriority(classification, scores) {
    // Weighted score calculation
    const weightedScore = 
      scores.userImpact * this.config.weights.userImpact +
      scores.businessImpact * this.config.weights.businessImpact +
      scores.frequency * this.config.weights.frequency +
      scores.effort * this.config.weights.effort;
    
    // Map to priority with severity override
    let priority;
    if (classification.severity === 'critical') {
      priority = 'P0';
    } else if (classification.severity === 'high' || weightedScore > 70) {
      priority = 'P1';
    } else if (classification.severity === 'medium' || weightedScore > 40) {
      priority = 'P2';
    } else {
      priority = 'P3';
    }
    
    return {
      priority,
      score: weightedScore,
      breakdown: {
        userImpact: scores.userImpact * this.config.weights.userImpact,
        businessImpact: scores.businessImpact * this.config.weights.businessImpact,
        frequency: scores.frequency * this.config.weights.frequency,
        effort: scores.effort * this.config.weights.effort
      }
    };
  }

  generateRecommendations(bug, classification, scores) {
    const recommendations = [];
    
    // Immediate actions for critical bugs
    if (classification.severity === 'critical') {
      recommendations.push({
        type: 'immediate',
        action: 'Assemble incident response team',
        reason: 'Critical severity requires immediate attention'
      });
      
      if (bug.category === 'security') {
        recommendations.push({
          type: 'immediate',
          action: 'Conduct security assessment and notify security team',
          reason: 'Security vulnerabilities require specialized handling'
        });
      }
    }
    
    // High frequency bugs
    if (scores.frequency > 70) {
      recommendations.push({
        type: 'short-term',
        action: 'Implement monitoring and alerting for this pattern',
        reason: 'High frequency indicates systemic issue'
      });
    }
    
    // High business impact
    if (scores.businessImpact > 70) {
      recommendations.push({
        type: 'communication',
        action: 'Prepare customer communication and support documentation',
        reason: 'High business impact requires proactive communication'
      });
    }
    
    // Low effort fixes
    if (scores.effort > 80 && classification.severity !== 'low') {
      recommendations.push({
        type: 'quick-win',
        action: 'Consider for next sprint or hotfix',
        reason: 'Low effort with meaningful impact'
      });
    }
    
    return recommendations;
  }

  classifyBatch(bugs) {
    const classifications = bugs.map(bug => this.classifyBug(bug));
    
    return {
      classifications,
      summary: this.generateBatchSummary(classifications),
      priorityQueue: this.generatePriorityQueue(classifications)
    };
  }

  generateBatchSummary(classifications) {
    const summary = {
      total: classifications.length,
      byPriority: {},
      bySeverity: {},
      averageScore: 0,
      criticalCount: 0
    };
    
    let totalScore = 0;
    
    for (const classification of classifications) {
      // Priority counts
      summary.byPriority[classification.priority] = 
        (summary.byPriority[classification.priority] || 0) + 1;
      
      // Severity counts
      summary.bySeverity[classification.severity] = 
        (summary.bySeverity[classification.severity] || 0) + 1;
      
      // Score tracking
      totalScore += classification.finalScore;
      
      // Critical tracking
      if (classification.severity === 'critical') {
        summary.criticalCount++;
      }
    }
    
    summary.averageScore = totalScore / classifications.length;
    
    return summary;
  }

  generatePriorityQueue(classifications) {
    // Sort by priority and score
    const queue = [...classifications].sort((a, b) => {
      const priorityOrder = ['P0', 'P1', 'P2', 'P3'];
      const aPriority = priorityOrder.indexOf(a.priority);
      const bPriority = priorityOrder.indexOf(b.priority);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return b.finalScore - a.finalScore;
    });
    
    return queue.map((item, index) => ({
      rank: index + 1,
      bugId: item.bugId,
      priority: item.priority,
      score: item.finalScore,
      sla: item.sla
    }));
  }
}

module.exports = BugClassifier;