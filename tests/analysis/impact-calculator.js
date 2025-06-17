/**
 * Impact Calculator System
 * Calculates business impact, customer impact, and resource requirements for bug fixes
 */

class ImpactCalculator {
  constructor(config = {}) {
    this.config = {
      // Customer impact weights
      customerWeights: {
        tier1: config.customerWeights?.tier1 || 10,
        tier2: config.customerWeights?.tier2 || 5,
        tier3: config.customerWeights?.tier3 || 2,
        trial: config.customerWeights?.trial || 1
      },
      // Revenue impact thresholds
      revenueThresholds: {
        critical: config.revenueThresholds?.critical || 100000,
        high: config.revenueThresholds?.high || 10000,
        medium: config.revenueThresholds?.medium || 1000
      },
      // SLA penalties
      slaPenalties: {
        availability: config.slaPenalties?.availability || 1000, // per hour
        performance: config.slaPenalties?.performance || 500,   // per hour
        data: config.slaPenalties?.data || 5000                // per incident
      },
      // Development costs
      devCosts: {
        hourlyRate: config.devCosts?.hourlyRate || 150,
        qaMultiplier: config.devCosts?.qaMultiplier || 0.5,
        overheadMultiplier: config.devCosts?.overheadMultiplier || 1.3
      },
      ...config
    };
    
    this.historicalData = [];
  }

  calculateImpact(bug, context = {}) {
    const impact = {
      bugId: bug.id,
      timestamp: new Date().toISOString(),
      customer: this.calculateCustomerImpact(bug, context),
      business: this.calculateBusinessImpact(bug, context),
      technical: this.calculateTechnicalImpact(bug, context),
      resources: this.calculateResourceRequirements(bug, context),
      timeline: this.calculateTimelineImpact(bug, context),
      risk: this.calculateRiskAssessment(bug, context),
      totalScore: 0,
      recommendation: null
    };
    
    // Calculate total impact score
    impact.totalScore = this.calculateTotalScore(impact);
    
    // Generate recommendation
    impact.recommendation = this.generateRecommendation(impact);
    
    // Store for learning
    this.historicalData.push(impact);
    
    return impact;
  }

  calculateCustomerImpact(bug, context) {
    const impact = {
      affectedCustomers: 0,
      score: 0,
      breakdown: {},
      severity: 'low',
      details: []
    };
    
    // Calculate affected customers
    if (context.customers) {
      impact.affectedCustomers = this.countAffectedCustomers(bug, context.customers);
      impact.breakdown = this.categorizeAffectedCustomers(bug, context.customers);
    }
    
    // Calculate impact score based on customer tiers
    impact.score = this.calculateCustomerScore(impact.breakdown);
    
    // Determine severity
    impact.severity = this.determineCustomerSeverity(impact);
    
    // Add specific impact details
    impact.details = this.getCustomerImpactDetails(bug, context);
    
    // User experience impact
    impact.userExperience = this.calculateUserExperienceImpact(bug);
    
    // Customer satisfaction impact
    impact.satisfaction = this.estimateCustomerSatisfactionImpact(bug, context);
    
    return impact;
  }

  countAffectedCustomers(bug, customers) {
    let count = 0;
    
    for (const customer of customers) {
      if (this.isCustomerAffected(bug, customer)) {
        count++;
      }
    }
    
    return count;
  }

  isCustomerAffected(bug, customer) {
    // Check if customer uses affected features
    if (bug.affectedFeatures) {
      const customerFeatures = customer.features || [];
      const hasAffectedFeature = bug.affectedFeatures.some(f => 
        customerFeatures.includes(f)
      );
      if (hasAffectedFeature) return true;
    }
    
    // Check if customer is in affected region
    if (bug.affectedRegions && customer.region) {
      if (bug.affectedRegions.includes(customer.region)) return true;
    }
    
    // Check if customer uses affected API versions
    if (bug.affectedVersions && customer.apiVersion) {
      if (bug.affectedVersions.includes(customer.apiVersion)) return true;
    }
    
    // Check custom criteria
    if (bug.affectedCustomerCriteria) {
      return bug.affectedCustomerCriteria(customer);
    }
    
    return false;
  }

  categorizeAffectedCustomers(bug, customers) {
    const categories = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      trial: 0
    };
    
    for (const customer of customers) {
      if (this.isCustomerAffected(bug, customer)) {
        const tier = customer.tier || 'tier3';
        categories[tier]++;
      }
    }
    
    return categories;
  }

  calculateCustomerScore(breakdown) {
    let score = 0;
    
    for (const [tier, count] of Object.entries(breakdown)) {
      score += count * this.config.customerWeights[tier];
    }
    
    // Normalize to 0-100 scale
    const maxPossibleScore = 100 * this.config.customerWeights.tier1;
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  determineCustomerSeverity(impact) {
    if (impact.score > 80 || impact.breakdown.tier1 > 5) {
      return 'critical';
    } else if (impact.score > 50 || impact.breakdown.tier1 > 2) {
      return 'high';
    } else if (impact.score > 20 || impact.breakdown.tier2 > 5) {
      return 'medium';
    }
    return 'low';
  }

  getCustomerImpactDetails(bug, context) {
    const details = [];
    
    // Feature availability impact
    if (bug.featureAvailability === 'unavailable') {
      details.push({
        type: 'feature_outage',
        description: 'Core feature completely unavailable',
        severity: 'critical'
      });
    } else if (bug.featureAvailability === 'degraded') {
      details.push({
        type: 'feature_degradation',
        description: 'Feature functioning with reduced performance',
        severity: 'high'
      });
    }
    
    // Data impact
    if (bug.dataImpact) {
      details.push({
        type: 'data_impact',
        description: bug.dataImpact,
        severity: bug.dataImpact.includes('loss') ? 'critical' : 'high'
      });
    }
    
    // Workflow impact
    if (bug.workflowImpact) {
      details.push({
        type: 'workflow_disruption',
        description: `${bug.workflowImpact} workflow affected`,
        severity: bug.criticalWorkflow ? 'critical' : 'medium'
      });
    }
    
    return details;
  }

  calculateUserExperienceImpact(bug) {
    const impact = {
      score: 0,
      category: 'minimal',
      metrics: {}
    };
    
    // Response time impact
    if (bug.responseTimeImpact) {
      const degradation = bug.responseTimeImpact;
      if (degradation > 5) {
        impact.score += 40;
        impact.metrics.responseTime = 'severe';
      } else if (degradation > 2) {
        impact.score += 25;
        impact.metrics.responseTime = 'moderate';
      } else if (degradation > 1) {
        impact.score += 10;
        impact.metrics.responseTime = 'minor';
      }
    }
    
    // Error rate impact
    if (bug.errorRate) {
      if (bug.errorRate > 0.1) {
        impact.score += 30;
        impact.metrics.errorRate = 'high';
      } else if (bug.errorRate > 0.05) {
        impact.score += 20;
        impact.metrics.errorRate = 'medium';
      } else if (bug.errorRate > 0.01) {
        impact.score += 10;
        impact.metrics.errorRate = 'low';
      }
    }
    
    // Usability impact
    if (bug.usabilityImpact) {
      const usabilityScores = {
        'complete_blocker': 30,
        'major_hindrance': 20,
        'minor_inconvenience': 10,
        'cosmetic': 5
      };
      impact.score += usabilityScores[bug.usabilityImpact] || 0;
      impact.metrics.usability = bug.usabilityImpact;
    }
    
    // Categorize overall impact
    if (impact.score > 60) {
      impact.category = 'severe';
    } else if (impact.score > 40) {
      impact.category = 'significant';
    } else if (impact.score > 20) {
      impact.category = 'moderate';
    } else if (impact.score > 0) {
      impact.category = 'minor';
    }
    
    return impact;
  }

  estimateCustomerSatisfactionImpact(bug, context) {
    const impact = {
      score: 0,
      churnRisk: 0,
      npsImpact: 0,
      supportTickets: 0
    };
    
    // Historical correlation with satisfaction scores
    if (context.historicalSatisfaction) {
      const similar = this.findSimilarBugs(bug, context.historicalSatisfaction);
      if (similar.length > 0) {
        impact.npsImpact = similar.reduce((sum, s) => sum + s.npsImpact, 0) / similar.length;
      }
    }
    
    // Estimate support ticket volume
    if (bug.visibility === 'high' && bug.affectedCustomers) {
      impact.supportTickets = Math.floor(bug.affectedCustomers * 0.3);
    } else if (bug.visibility === 'medium') {
      impact.supportTickets = Math.floor(bug.affectedCustomers * 0.1);
    }
    
    // Calculate churn risk
    if (bug.severity === 'critical' && bug.frequency === 'frequent') {
      impact.churnRisk = 0.15;
    } else if (bug.severity === 'high' && bug.duration > 24) {
      impact.churnRisk = 0.08;
    } else if (bug.severity === 'medium' && bug.recurring) {
      impact.churnRisk = 0.03;
    }
    
    // Overall satisfaction score
    impact.score = (impact.npsImpact * 0.4) + 
                   (impact.churnRisk * 100 * 0.4) + 
                   (Math.min(impact.supportTickets / 100, 1) * 20);
    
    return impact;
  }

  calculateBusinessImpact(bug, context) {
    const impact = {
      financial: this.calculateFinancialImpact(bug, context),
      reputation: this.calculateReputationImpact(bug, context),
      compliance: this.calculateComplianceImpact(bug, context),
      competitive: this.calculateCompetitiveImpact(bug, context),
      operational: this.calculateOperationalImpact(bug, context),
      score: 0
    };
    
    // Calculate overall business impact score
    impact.score = this.aggregateBusinessImpact(impact);
    
    return impact;
  }

  calculateFinancialImpact(bug, context) {
    const financial = {
      revenue: 0,
      costs: 0,
      penalties: 0,
      total: 0,
      breakdown: {}
    };
    
    // Direct revenue loss
    if (bug.revenueImpact) {
      financial.revenue = bug.revenueImpact;
    } else if (bug.transactionFailureRate && context.avgTransactionValue) {
      const failedTransactions = bug.affectedTransactions * bug.transactionFailureRate;
      financial.revenue = failedTransactions * context.avgTransactionValue;
    }
    financial.breakdown.revenueLoss = financial.revenue;
    
    // SLA penalties
    if (bug.slaViolation) {
      financial.penalties = this.calculateSLAPenalties(bug, context);
      financial.breakdown.slaPenalties = financial.penalties;
    }
    
    // Operational costs
    const operationalCosts = this.calculateOperationalCosts(bug, context);
    financial.costs += operationalCosts;
    financial.breakdown.operational = operationalCosts;
    
    // Support costs
    const supportCosts = this.calculateSupportCosts(bug, context);
    financial.costs += supportCosts;
    financial.breakdown.support = supportCosts;
    
    // Total financial impact
    financial.total = financial.revenue + financial.costs + financial.penalties;
    
    return financial;
  }

  calculateSLAPenalties(bug, context) {
    let penalties = 0;
    
    // Availability SLA
    if (bug.availabilityImpact && bug.duration) {
      const hoursDown = bug.duration / 60; // Convert minutes to hours
      penalties += hoursDown * this.config.slaPenalties.availability;
    }
    
    // Performance SLA
    if (bug.performanceViolation && bug.duration) {
      const hoursViolated = bug.duration / 60;
      penalties += hoursViolated * this.config.slaPenalties.performance;
    }
    
    // Data SLA
    if (bug.dataLoss || bug.dataCorruption) {
      penalties += this.config.slaPenalties.data;
    }
    
    // Customer-specific SLAs
    if (context.customSLAs && bug.affectedCustomers) {
      for (const customer of bug.affectedCustomers) {
        const customSLA = context.customSLAs[customer.id];
        if (customSLA && customSLA.penalty) {
          penalties += customSLA.penalty(bug);
        }
      }
    }
    
    return penalties;
  }

  calculateOperationalCosts(bug, context) {
    let costs = 0;
    
    // Incident response costs
    if (bug.severity === 'critical') {
      costs += 5000; // Average critical incident response cost
    } else if (bug.severity === 'high') {
      costs += 2000;
    }
    
    // Infrastructure costs (scaling, additional resources)
    if (bug.requiredScaling) {
      costs += bug.scalingCost || 1000;
    }
    
    // Emergency fixes
    if (bug.requiresHotfix) {
      costs += 3000; // Average hotfix deployment cost
    }
    
    return costs;
  }

  calculateSupportCosts(bug, context) {
    const avgTicketCost = context.avgTicketCost || 50;
    const estimatedTickets = this.estimateSupportTickets(bug);
    
    return estimatedTickets * avgTicketCost;
  }

  estimateSupportTickets(bug) {
    let baseTickets = 0;
    
    // Based on visibility and customer impact
    if (bug.visibility === 'high') {
      baseTickets = bug.affectedCustomers * 0.5;
    } else if (bug.visibility === 'medium') {
      baseTickets = bug.affectedCustomers * 0.2;
    } else {
      baseTickets = bug.affectedCustomers * 0.05;
    }
    
    // Multiply by frequency
    if (bug.frequency === 'constant') {
      baseTickets *= 3;
    } else if (bug.frequency === 'frequent') {
      baseTickets *= 2;
    }
    
    return Math.ceil(baseTickets);
  }

  calculateReputationImpact(bug, context) {
    const reputation = {
      score: 0,
      publicVisibility: 'low',
      mediaRisk: 'low',
      socialMediaImpact: 0,
      brandDamage: 'minimal'
    };
    
    // Public visibility assessment
    if (bug.publiclyVisible || bug.affectedCustomers > 1000) {
      reputation.publicVisibility = 'high';
      reputation.score += 30;
    } else if (bug.affectedCustomers > 100) {
      reputation.publicVisibility = 'medium';
      reputation.score += 15;
    }
    
    // Media risk
    if (bug.securityBreach || bug.dataLoss) {
      reputation.mediaRisk = 'high';
      reputation.score += 40;
    } else if (bug.severity === 'critical' && reputation.publicVisibility === 'high') {
      reputation.mediaRisk = 'medium';
      reputation.score += 20;
    }
    
    // Social media impact
    if (context.socialMediaMonitoring) {
      const mentions = context.socialMediaMonitoring.getMentions(bug);
      reputation.socialMediaImpact = mentions.negative / mentions.total;
      reputation.score += reputation.socialMediaImpact * 30;
    }
    
    // Brand damage assessment
    if (reputation.score > 70) {
      reputation.brandDamage = 'severe';
    } else if (reputation.score > 40) {
      reputation.brandDamage = 'significant';
    } else if (reputation.score > 20) {
      reputation.brandDamage = 'moderate';
    }
    
    return reputation;
  }

  calculateComplianceImpact(bug, context) {
    const compliance = {
      violations: [],
      riskLevel: 'low',
      potentialFines: 0,
      reportingRequired: false,
      score: 0
    };
    
    // Check for compliance violations
    if (bug.dataPrivacyImpact) {
      compliance.violations.push({
        regulation: 'GDPR',
        severity: 'high',
        potentialFine: 20000000 // Max GDPR fine
      });
      compliance.potentialFines += 20000000;
      compliance.reportingRequired = true;
    }
    
    if (bug.securityBreach && context.regulations?.includes('PCI-DSS')) {
      compliance.violations.push({
        regulation: 'PCI-DSS',
        severity: 'critical',
        potentialFine: 500000
      });
      compliance.potentialFines += 500000;
    }
    
    if (bug.availabilityImpact && context.regulations?.includes('SOC2')) {
      compliance.violations.push({
        regulation: 'SOC2',
        severity: 'medium',
        impact: 'Audit qualification'
      });
    }
    
    // Calculate risk level
    if (compliance.violations.length > 2 || compliance.potentialFines > 1000000) {
      compliance.riskLevel = 'critical';
      compliance.score = 90;
    } else if (compliance.violations.length > 0) {
      compliance.riskLevel = 'high';
      compliance.score = 60;
    } else if (bug.auditTrailImpact) {
      compliance.riskLevel = 'medium';
      compliance.score = 30;
    }
    
    return compliance;
  }

  calculateCompetitiveImpact(bug, context) {
    const competitive = {
      marketAdvantage: 'none',
      customerLossRisk: 0,
      competitorBenefit: 'low',
      score: 0
    };
    
    // Feature parity impact
    if (bug.affectedFeatures?.includes('key-differentiator')) {
      competitive.marketAdvantage = 'lost';
      competitive.score += 40;
    }
    
    // Customer loss risk to competitors
    if (bug.severity === 'critical' && bug.duration > 48) {
      competitive.customerLossRisk = 0.2;
      competitive.score += 30;
    } else if (bug.recurring && bug.customerComplaints > 10) {
      competitive.customerLossRisk = 0.1;
      competitive.score += 20;
    }
    
    // Competitor benefit assessment
    if (context.competitorAnalysis) {
      const competitorStrength = context.competitorAnalysis.getStrengthInArea(
        bug.affectedArea
      );
      if (competitorStrength === 'high') {
        competitive.competitorBenefit = 'high';
        competitive.score += 30;
      }
    }
    
    return competitive;
  }

  calculateOperationalImpact(bug, context) {
    const operational = {
      productivity: 0,
      processDisruption: 'none',
      automationImpact: false,
      teamMorale: 'unaffected',
      score: 0
    };
    
    // Productivity impact
    if (bug.internalToolsAffected) {
      const affectedEmployees = context.employeesUsingTool || 100;
      const productivityLoss = bug.toolDowntimePercent || 0.5;
      operational.productivity = affectedEmployees * productivityLoss * 8 * 150; // hours * rate
      operational.score += 30;
    }
    
    // Process disruption
    if (bug.criticalProcessAffected) {
      operational.processDisruption = 'severe';
      operational.score += 40;
    } else if (bug.processWorkaroundRequired) {
      operational.processDisruption = 'moderate';
      operational.score += 20;
    }
    
    // Automation impact
    if (bug.automationFailure) {
      operational.automationImpact = true;
      operational.score += 25;
    }
    
    // Team morale (based on incident frequency)
    if (context.recentIncidents > 5) {
      operational.teamMorale = 'low';
      operational.score += 15;
    }
    
    return operational;
  }

  aggregateBusinessImpact(impact) {
    // Weighted aggregation of business impacts
    const weights = {
      financial: 0.35,
      reputation: 0.25,
      compliance: 0.20,
      competitive: 0.15,
      operational: 0.05
    };
    
    let totalScore = 0;
    
    // Financial score (normalized)
    const financialScore = Math.min(100, impact.financial.total / 1000);
    totalScore += financialScore * weights.financial;
    
    // Other scores (already 0-100)
    totalScore += impact.reputation.score * weights.reputation;
    totalScore += impact.compliance.score * weights.compliance;
    totalScore += impact.competitive.score * weights.competitive;
    totalScore += impact.operational.score * weights.operational;
    
    return totalScore;
  }

  calculateTechnicalImpact(bug, context) {
    const technical = {
      complexity: this.assessComplexity(bug, context),
      dependencies: this.analyzeDependencies(bug, context),
      techDebt: this.assessTechnicalDebt(bug, context),
      architecture: this.assessArchitecturalImpact(bug, context),
      performance: this.assessPerformanceImpact(bug, context),
      score: 0
    };
    
    technical.score = this.aggregateTechnicalImpact(technical);
    
    return technical;
  }

  assessComplexity(bug, context) {
    const complexity = {
      codeComplexity: 'low',
      integrationComplexity: 'low',
      testingComplexity: 'low',
      deploymentComplexity: 'low',
      score: 0
    };
    
    // Code complexity
    if (bug.affectedFiles > 20 || bug.affectedLines > 1000) {
      complexity.codeComplexity = 'high';
      complexity.score += 30;
    } else if (bug.affectedFiles > 5 || bug.affectedLines > 200) {
      complexity.codeComplexity = 'medium';
      complexity.score += 15;
    }
    
    // Integration complexity
    if (bug.externalDependencies > 3) {
      complexity.integrationComplexity = 'high';
      complexity.score += 25;
    } else if (bug.externalDependencies > 0) {
      complexity.integrationComplexity = 'medium';
      complexity.score += 10;
    }
    
    // Testing complexity
    if (bug.requiresIntegrationTests && bug.requiresPerformanceTests) {
      complexity.testingComplexity = 'high';
      complexity.score += 25;
    } else if (bug.requiresIntegrationTests || bug.affectedFiles > 10) {
      complexity.testingComplexity = 'medium';
      complexity.score += 15;
    }
    
    // Deployment complexity
    if (bug.requiresDatabaseMigration || bug.requiresInfraChange) {
      complexity.deploymentComplexity = 'high';
      complexity.score += 20;
    } else if (bug.requiresConfigChange) {
      complexity.deploymentComplexity = 'medium';
      complexity.score += 10;
    }
    
    return complexity;
  }

  analyzeDependencies(bug, context) {
    const dependencies = {
      internal: [],
      external: [],
      critical: [],
      score: 0
    };
    
    // Internal dependencies
    if (context.dependencyGraph) {
      dependencies.internal = context.dependencyGraph.getDependencies(bug.component);
      dependencies.critical = dependencies.internal.filter(d => 
        context.dependencyGraph.isCritical(d)
      );
    }
    
    // External dependencies
    if (bug.externalServices) {
      dependencies.external = bug.externalServices;
    }
    
    // Calculate score based on dependency complexity
    dependencies.score = 
      (dependencies.internal.length * 2) +
      (dependencies.external.length * 3) +
      (dependencies.critical.length * 5);
    
    return dependencies;
  }

  assessTechnicalDebt(bug, context) {
    const debt = {
      existing: 0,
      added: 0,
      addressed: 0,
      score: 0
    };
    
    // Existing technical debt in affected areas
    if (context.techDebtRegistry) {
      debt.existing = context.techDebtRegistry.getDebtScore(bug.component);
    }
    
    // Debt added by quick fixes
    if (bug.requiresQuickFix) {
      debt.added = 20; // Arbitrary score for quick fixes
    }
    
    // Opportunity to address debt
    if (bug.refactoringOpportunity) {
      debt.addressed = bug.refactoringOpportunity.debtReduction || 10;
    }
    
    // Calculate net debt impact
    debt.score = debt.existing + debt.added - debt.addressed;
    
    return debt;
  }

  assessArchitecturalImpact(bug, context) {
    const architecture = {
      patternViolation: false,
      scalabilityImpact: 'none',
      maintainabilityImpact: 'none',
      designChange: false,
      score: 0
    };
    
    // Check for architectural pattern violations
    if (bug.violatesPattern) {
      architecture.patternViolation = true;
      architecture.score += 30;
    }
    
    // Scalability impact
    if (bug.scalabilityBottleneck) {
      architecture.scalabilityImpact = 'high';
      architecture.score += 25;
    } else if (bug.performanceImpact?.affectsScaling) {
      architecture.scalabilityImpact = 'medium';
      architecture.score += 15;
    }
    
    // Maintainability impact
    if (bug.increasesComplexity || bug.reducesModularity) {
      architecture.maintainabilityImpact = 'high';
      architecture.score += 20;
    }
    
    // Design change requirement
    if (bug.requiresArchitecturalChange) {
      architecture.designChange = true;
      architecture.score += 25;
    }
    
    return architecture;
  }

  assessPerformanceImpact(bug, context) {
    const performance = {
      responseTime: 0,
      throughput: 0,
      resourceUsage: 0,
      scalability: 0,
      score: 0
    };
    
    // Response time impact
    if (bug.responseTimeIncrease) {
      performance.responseTime = bug.responseTimeIncrease;
      performance.score += Math.min(30, bug.responseTimeIncrease);
    }
    
    // Throughput impact
    if (bug.throughputDecrease) {
      performance.throughput = bug.throughputDecrease;
      performance.score += Math.min(25, bug.throughputDecrease * 100);
    }
    
    // Resource usage impact
    if (bug.cpuIncrease || bug.memoryIncrease) {
      performance.resourceUsage = Math.max(
        bug.cpuIncrease || 0,
        bug.memoryIncrease || 0
      );
      performance.score += Math.min(25, performance.resourceUsage);
    }
    
    // Scalability impact
    if (bug.scalabilityImpact) {
      performance.scalability = bug.scalabilityImpact;
      performance.score += Math.min(20, bug.scalabilityImpact * 20);
    }
    
    return performance;
  }

  aggregateTechnicalImpact(technical) {
    // Normalize and weight technical factors
    const weights = {
      complexity: 0.30,
      dependencies: 0.25,
      techDebt: 0.20,
      architecture: 0.15,
      performance: 0.10
    };
    
    let totalScore = 0;
    totalScore += technical.complexity.score * weights.complexity;
    totalScore += Math.min(100, technical.dependencies.score) * weights.dependencies;
    totalScore += Math.min(100, technical.techDebt.score) * weights.techDebt;
    totalScore += technical.architecture.score * weights.architecture;
    totalScore += technical.performance.score * weights.performance;
    
    return totalScore;
  }

  calculateResourceRequirements(bug, context) {
    const resources = {
      development: this.estimateDevelopmentEffort(bug, context),
      testing: this.estimateTestingEffort(bug, context),
      deployment: this.estimateDeploymentEffort(bug, context),
      total: {
        hours: 0,
        cost: 0,
        people: 0
      }
    };
    
    // Calculate totals
    resources.total.hours = 
      resources.development.hours +
      resources.testing.hours +
      resources.deployment.hours;
      
    resources.total.cost =
      resources.development.cost +
      resources.testing.cost +
      resources.deployment.cost;
      
    resources.total.people = Math.max(
      resources.development.people,
      resources.testing.people,
      resources.deployment.people
    );
    
    return resources;
  }

  estimateDevelopmentEffort(bug, context) {
    const effort = {
      hours: 0,
      people: 1,
      skills: [],
      cost: 0
    };
    
    // Base effort estimation
    const complexityHours = {
      trivial: 2,
      simple: 8,
      medium: 24,
      complex: 80,
      very_complex: 200
    };
    
    effort.hours = complexityHours[bug.complexity] || 24;
    
    // Adjust for various factors
    if (bug.requiresArchitecturalChange) {
      effort.hours *= 2;
      effort.people = 2;
      effort.skills.push('architect');
    }
    
    if (bug.affectedFiles > 10) {
      effort.hours *= 1.5;
    }
    
    if (bug.externalDependencies > 0) {
      effort.hours *= 1.3;
      effort.skills.push('integration');
    }
    
    if (bug.requiresResearch) {
      effort.hours += 16;
      effort.skills.push('research');
    }
    
    // Historical adjustment
    if (context.historicalEstimates) {
      const adjustment = this.getHistoricalAdjustment(bug, context.historicalEstimates);
      effort.hours *= adjustment;
    }
    
    // Calculate cost
    effort.cost = effort.hours * this.config.devCosts.hourlyRate * 
                  this.config.devCosts.overheadMultiplier;
    
    return effort;
  }

  estimateTestingEffort(bug, context) {
    const effort = {
      hours: 0,
      people: 1,
      skills: [],
      cost: 0
    };
    
    // Base testing effort (percentage of dev effort)
    const devHours = this.estimateDevelopmentEffort(bug, context).hours;
    effort.hours = devHours * this.config.devCosts.qaMultiplier;
    
    // Additional testing requirements
    if (bug.requiresRegressionTesting) {
      effort.hours += 8;
    }
    
    if (bug.requiresPerformanceTests) {
      effort.hours += 16;
      effort.skills.push('performance');
    }
    
    if (bug.requiresSecurityTesting) {
      effort.hours += 24;
      effort.skills.push('security');
      effort.people = 2;
    }
    
    if (bug.affectedPlatforms > 1) {
      effort.hours *= bug.affectedPlatforms * 0.7;
    }
    
    // Calculate cost
    effort.cost = effort.hours * this.config.devCosts.hourlyRate * 0.8 * 
                  this.config.devCosts.overheadMultiplier;
    
    return effort;
  }

  estimateDeploymentEffort(bug, context) {
    const effort = {
      hours: 2, // Base deployment time
      people: 1,
      skills: ['devops'],
      cost: 0
    };
    
    // Deployment complexity factors
    if (bug.requiresDatabaseMigration) {
      effort.hours += 8;
      effort.skills.push('database');
    }
    
    if (bug.requiresInfraChange) {
      effort.hours += 16;
      effort.people = 2;
      effort.skills.push('infrastructure');
    }
    
    if (bug.requiresCoordination) {
      effort.hours += 4;
      effort.people += 1;
    }
    
    if (bug.requiresDowntime) {
      effort.hours += 6; // Planning and execution
      effort.skills.push('planning');
    }
    
    if (bug.multiRegionDeployment) {
      effort.hours *= 2;
    }
    
    // Calculate cost
    effort.cost = effort.hours * this.config.devCosts.hourlyRate * 1.2 * 
                  this.config.devCosts.overheadMultiplier;
    
    return effort;
  }

  getHistoricalAdjustment(bug, historicalEstimates) {
    // Find similar bugs and their estimate accuracy
    const similarBugs = historicalEstimates.filter(h => 
      h.complexity === bug.complexity &&
      h.category === bug.category
    );
    
    if (similarBugs.length === 0) {
      return 1; // No adjustment
    }
    
    // Calculate average overrun/underrun
    const accuracyRatios = similarBugs.map(h => h.actualHours / h.estimatedHours);
    const avgRatio = accuracyRatios.reduce((a, b) => a + b, 0) / accuracyRatios.length;
    
    // Apply dampened adjustment
    return 1 + (avgRatio - 1) * 0.7;
  }

  calculateTimelineImpact(bug, context) {
    const timeline = {
      fixDuration: 0,
      blockingDuration: 0,
      criticalPath: false,
      dependencies: [],
      milestoneImpact: [],
      score: 0
    };
    
    // Calculate fix duration
    const resources = this.calculateResourceRequirements(bug, context);
    timeline.fixDuration = resources.total.hours / (resources.total.people * 8); // days
    
    // Blocking impact
    if (bug.blocksOtherWork) {
      timeline.blockingDuration = timeline.fixDuration;
      timeline.score += 30;
    }
    
    // Critical path analysis
    if (context.projectSchedule) {
      timeline.criticalPath = context.projectSchedule.isOnCriticalPath(bug.component);
      if (timeline.criticalPath) {
        timeline.score += 40;
      }
    }
    
    // Dependencies
    if (bug.blocksDependencies) {
      timeline.dependencies = bug.blocksDependencies;
      timeline.score += timeline.dependencies.length * 10;
    }
    
    // Milestone impact
    if (context.milestones) {
      for (const milestone of context.milestones) {
        const impact = this.assessMilestoneImpact(bug, milestone, timeline.fixDuration);
        if (impact) {
          timeline.milestoneImpact.push(impact);
          timeline.score += impact.severity === 'high' ? 30 : 15;
        }
      }
    }
    
    return timeline;
  }

  assessMilestoneImpact(bug, milestone, fixDuration) {
    const daysUntilMilestone = (new Date(milestone.date) - new Date()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilMilestone < fixDuration) {
      return {
        milestone: milestone.name,
        date: milestone.date,
        impact: 'at_risk',
        severity: 'high',
        mitigation: 'Consider expedited fix or workaround'
      };
    } else if (daysUntilMilestone < fixDuration * 2) {
      return {
        milestone: milestone.name,
        date: milestone.date,
        impact: 'tight_schedule',
        severity: 'medium',
        mitigation: 'Monitor closely and prioritize'
      };
    }
    
    return null;
  }

  calculateRiskAssessment(bug, context) {
    const risk = {
      probability: this.assessProbability(bug, context),
      severity: this.assessSeverity(bug, context),
      exposure: 0,
      mitigation: [],
      score: 0
    };
    
    // Calculate risk exposure
    risk.exposure = risk.probability * risk.severity;
    
    // Generate mitigation strategies
    risk.mitigation = this.generateMitigationStrategies(bug, risk);
    
    // Calculate risk score
    risk.score = risk.exposure * 20; // Scale to 0-100
    
    return risk;
  }

  assessProbability(bug, context) {
    let probability = 0.5; // Base probability
    
    // Adjust based on bug characteristics
    if (bug.reproducible === true) {
      probability += 0.3;
    } else if (bug.reproducible === 'intermittent') {
      probability += 0.1;
    }
    
    if (bug.frequency === 'constant') {
      probability = 1.0;
    } else if (bug.frequency === 'frequent') {
      probability = Math.max(probability, 0.8);
    }
    
    // Environmental factors
    if (bug.environmentSpecific && context.environments) {
      const affectedEnvs = context.environments.filter(env => 
        bug.affectedEnvironments.includes(env)
      );
      probability *= affectedEnvs.length / context.environments.length;
    }
    
    return Math.min(1.0, probability);
  }

  assessSeverity(bug, context) {
    // Use a combination of customer, business, and technical impacts
    const customerSeverity = bug.customerImpact?.severity === 'critical' ? 5 :
                            bug.customerImpact?.severity === 'high' ? 4 :
                            bug.customerImpact?.severity === 'medium' ? 3 : 2;
                            
    const businessSeverity = bug.businessImpact?.score > 80 ? 5 :
                            bug.businessImpact?.score > 60 ? 4 :
                            bug.businessImpact?.score > 40 ? 3 : 2;
                            
    const technicalSeverity = bug.technicalImpact?.score > 80 ? 5 :
                             bug.technicalImpact?.score > 60 ? 4 :
                             bug.technicalImpact?.score > 40 ? 3 : 2;
    
    // Weighted average
    return (customerSeverity * 0.4 + businessSeverity * 0.4 + technicalSeverity * 0.2);
  }

  generateMitigationStrategies(bug, risk) {
    const strategies = [];
    
    // High probability mitigations
    if (risk.probability > 0.7) {
      strategies.push({
        strategy: 'Immediate fix',
        description: 'High probability requires immediate attention',
        effort: 'high'
      });
      
      if (bug.workaroundAvailable) {
        strategies.push({
          strategy: 'Deploy workaround',
          description: 'Temporary mitigation while permanent fix is developed',
          effort: 'low'
        });
      }
    }
    
    // High severity mitigations
    if (risk.severity > 4) {
      strategies.push({
        strategy: 'Incident response plan',
        description: 'Prepare response procedures for when issue occurs',
        effort: 'medium'
      });
      
      strategies.push({
        strategy: 'Monitoring enhancement',
        description: 'Add specific monitoring for early detection',
        effort: 'low'
      });
    }
    
    // Technical mitigations
    if (bug.category === 'performance') {
      strategies.push({
        strategy: 'Performance optimization',
        description: 'Optimize affected components',
        effort: 'medium'
      });
    }
    
    if (bug.category === 'security') {
      strategies.push({
        strategy: 'Security hardening',
        description: 'Implement additional security controls',
        effort: 'high'
      });
    }
    
    return strategies;
  }

  calculateTotalScore(impact) {
    // Weighted combination of all impact scores
    const weights = {
      customer: 0.35,
      business: 0.30,
      technical: 0.15,
      timeline: 0.10,
      risk: 0.10
    };
    
    return (
      impact.customer.score * weights.customer +
      impact.business.score * weights.business +
      impact.technical.score * weights.technical +
      impact.timeline.score * weights.timeline +
      impact.risk.score * weights.risk
    );
  }

  generateRecommendation(impact) {
    const recommendation = {
      priority: '',
      action: '',
      reasoning: [],
      timeline: '',
      resources: ''
    };
    
    // Determine priority based on total score and specific factors
    if (impact.totalScore > 80 || impact.customer.severity === 'critical') {
      recommendation.priority = 'IMMEDIATE';
      recommendation.action = 'Drop everything and fix now';
      recommendation.timeline = 'Within 4 hours';
    } else if (impact.totalScore > 60 || impact.business.financial.total > 50000) {
      recommendation.priority = 'HIGH';
      recommendation.action = 'Schedule for next sprint';
      recommendation.timeline = 'Within 1 week';
    } else if (impact.totalScore > 40) {
      recommendation.priority = 'MEDIUM';
      recommendation.action = 'Add to backlog with priority';
      recommendation.timeline = 'Within 1 month';
    } else {
      recommendation.priority = 'LOW';
      recommendation.action = 'Add to backlog';
      recommendation.timeline = 'As resources permit';
    }
    
    // Generate reasoning
    if (impact.customer.affectedCustomers > 100) {
      recommendation.reasoning.push(
        `Affects ${impact.customer.affectedCustomers} customers`
      );
    }
    
    if (impact.business.financial.total > 10000) {
      recommendation.reasoning.push(
        `Financial impact: $${impact.business.financial.total.toFixed(0)}`
      );
    }
    
    if (impact.risk.exposure > 4) {
      recommendation.reasoning.push('High risk exposure');
    }
    
    if (impact.timeline.criticalPath) {
      recommendation.reasoning.push('On critical path for project delivery');
    }
    
    // Resource recommendation
    const resources = impact.resources.total;
    recommendation.resources = 
      `${resources.people} people, ${resources.hours} hours, $${resources.cost.toFixed(0)}`;
    
    return recommendation;
  }

  findSimilarBugs(bug, historicalData) {
    return historicalData.filter(historical => {
      let similarity = 0;
      
      if (historical.category === bug.category) similarity += 0.3;
      if (historical.severity === bug.severity) similarity += 0.2;
      if (historical.component === bug.component) similarity += 0.2;
      if (historical.type === bug.type) similarity += 0.3;
      
      return similarity > 0.6;
    });
  }

  generateReport(impacts) {
    const report = {
      summary: {
        total: impacts.length,
        immediate: impacts.filter(i => i.recommendation.priority === 'IMMEDIATE').length,
        high: impacts.filter(i => i.recommendation.priority === 'HIGH').length,
        totalFinancialImpact: 0,
        totalCustomersAffected: 0,
        totalEffortHours: 0
      },
      priorities: this.prioritizeImpacts(impacts),
      insights: this.generateInsights(impacts),
      recommendations: this.consolidateRecommendations(impacts)
    };
    
    // Calculate totals
    for (const impact of impacts) {
      report.summary.totalFinancialImpact += impact.business.financial.total;
      report.summary.totalCustomersAffected += impact.customer.affectedCustomers;
      report.summary.totalEffortHours += impact.resources.total.hours;
    }
    
    return report;
  }

  prioritizeImpacts(impacts) {
    // Sort by total score and create prioritized list
    return impacts
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((impact, index) => ({
        rank: index + 1,
        bugId: impact.bugId,
        score: impact.totalScore,
        priority: impact.recommendation.priority,
        summary: this.createImpactSummary(impact)
      }));
  }

  createImpactSummary(impact) {
    const parts = [];
    
    if (impact.customer.affectedCustomers > 0) {
      parts.push(`${impact.customer.affectedCustomers} customers affected`);
    }
    
    if (impact.business.financial.total > 0) {
      parts.push(`$${impact.business.financial.total.toFixed(0)} financial impact`);
    }
    
    if (impact.resources.total.hours > 0) {
      parts.push(`${impact.resources.total.hours}h to fix`);
    }
    
    return parts.join(', ');
  }

  generateInsights(impacts) {
    const insights = [];
    
    // Customer impact insights
    const totalCustomers = impacts.reduce((sum, i) => sum + i.customer.affectedCustomers, 0);
    const tier1Affected = impacts.some(i => i.customer.breakdown.tier1 > 0);
    
    if (tier1Affected) {
      insights.push({
        type: 'customer',
        severity: 'high',
        message: 'Tier 1 customers affected - requires executive attention'
      });
    }
    
    // Financial insights
    const totalFinancial = impacts.reduce((sum, i) => sum + i.business.financial.total, 0);
    if (totalFinancial > 100000) {
      insights.push({
        type: 'financial',
        severity: 'critical',
        message: `Total financial impact exceeds $${totalFinancial.toFixed(0)}`
      });
    }
    
    // Resource insights
    const totalHours = impacts.reduce((sum, i) => sum + i.resources.total.hours, 0);
    const totalPeople = Math.max(...impacts.map(i => i.resources.total.people));
    
    if (totalHours > 1000) {
      insights.push({
        type: 'resource',
        severity: 'high',
        message: `Significant resource requirement: ${totalHours}h across ${totalPeople} people`
      });
    }
    
    // Risk insights
    const highRiskCount = impacts.filter(i => i.risk.exposure > 4).length;
    if (highRiskCount > impacts.length * 0.3) {
      insights.push({
        type: 'risk',
        severity: 'high',
        message: `${highRiskCount} high-risk bugs require immediate attention`
      });
    }
    
    return insights;
  }

  consolidateRecommendations(impacts) {
    const recommendations = [];
    
    // Group by priority
    const byPriority = {};
    for (const impact of impacts) {
      const priority = impact.recommendation.priority;
      if (!byPriority[priority]) {
        byPriority[priority] = [];
      }
      byPriority[priority].push(impact);
    }
    
    // Generate consolidated recommendations
    for (const [priority, group] of Object.entries(byPriority)) {
      if (group.length > 0) {
        recommendations.push({
          priority,
          count: group.length,
          totalEffort: group.reduce((sum, i) => sum + i.resources.total.hours, 0),
          totalCost: group.reduce((sum, i) => sum + i.resources.total.cost, 0),
          action: this.getConsolidatedAction(priority, group)
        });
      }
    }
    
    return recommendations;
  }

  getConsolidatedAction(priority, impacts) {
    const count = impacts.length;
    
    switch (priority) {
      case 'IMMEDIATE':
        return `Mobilize incident response for ${count} critical bugs`;
      case 'HIGH':
        return `Schedule ${count} high-priority fixes for next sprint`;
      case 'MEDIUM':
        return `Add ${count} medium-priority items to backlog`;
      case 'LOW':
        return `Track ${count} low-priority items for future consideration`;
      default:
        return `Review ${count} items`;
    }
  }
}

module.exports = ImpactCalculator;