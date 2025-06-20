/**
 * Customer Experience Impact Analyzer
 *
 * Maps failures to customer journeys, analyzes persona-specific impact,
 * and calculates business metrics related to customer experience.
 */

interface CustomerPersona {
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  painPoints: string[];
  journeySteps: string[];
  businessValue: number;
  description: string;
}

interface JourneyStep {
  step: string;
  weight: number;
  critical: boolean;
}

interface CustomerJourney {
  name: string;
  steps: JourneyStep[];
  businessImpact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface BusinessMetric {
  weight: number;
  baseline: number;
  target: number;
}

interface TestFailure {
  message?: string;
  test?: string;
  suite?: string;
}

interface TestResults {
  summary?: {
    failedTests?: number;
    totalTests?: number;
  };
  failures?: TestFailure[];
  testSuites?: Array<{
    name?: string;
    tests?: any[];
  }>;
}

interface PersonaImpact {
  persona: string;
  description: string;
  priority: string;
  businessValue: number;
  impactScore: number;
  riskLevel: string;
  relevantFailures: number;
  impactedPainPoints: string[];
  affectedJourneySteps: any[];
  recommendations: any[];
  estimatedAffectedUsers: string;
}

interface JourneyImpact {
  journey: string;
  description: string;
  businessImpact: string;
  impactScore: number;
  riskLevel: string;
  relevantFailures: number;
  affectedSteps: number;
  criticalStepsAffected: number;
  totalSteps: number;
  completionRisk: number;
  recommendations: any[];
}

interface MetricImpact {
  name: string;
  baseline: number;
  target: number;
  projected: number;
  impact: number;
  weight: number;
  riskLevel: string;
}

interface Risk {
  type: string;
  description: string;
  impact: string;
  affectedCustomers: string;
  mitigationTime: string;
}

interface Recommendation {
  action: string;
  reason: string;
  owner: string;
  timeline: string;
  channels?: string[];
}

interface Action {
  id: string;
  description: string;
  failure: TestFailure;
  customerImpact: string;
  businessValue: string;
  urgency: string;
  priority: number;
  estimatedEffort: number;
  affectedPersonas: string[];
  affectedJourneys: string[];
}

export class CustomerExperienceImpactAnalyzer {
  private customerPersonas: Record<string, CustomerPersona>;
  private customerJourneys: Record<string, CustomerJourney>;
  private businessMetrics: Record<string, BusinessMetric>;
  private impactMultipliers: Record<string, number>;

  constructor() {
    this.customerPersonas = {
      developer: {
        name: 'Developer',
        priority: 'HIGH',
        painPoints: ['api_failures', 'authentication_issues', 'documentation_gaps'],
        journeySteps: [
          'authentication',
          'api_discovery',
          'implementation',
          'testing',
          'deployment',
        ],
        businessValue: 0.8,
        description: 'Developers integrating with Akamai services',
      },
      devops_engineer: {
        name: 'DevOps Engineer',
        priority: 'CRITICAL',
        painPoints: ['deployment_failures', 'configuration_issues', 'monitoring_gaps'],
        journeySteps: ['configuration', 'deployment', 'monitoring', 'scaling', 'troubleshooting'],
        businessValue: 0.9,
        description: 'Engineers managing CDN infrastructure',
      },
      security_admin: {
        name: 'Security Administrator',
        priority: 'CRITICAL',
        painPoints: ['security_misconfigurations', 'certificate_issues', 'access_control_failures'],
        journeySteps: [
          'security_setup',
          'certificate_management',
          'policy_configuration',
          'compliance_monitoring',
        ],
        businessValue: 0.95,
        description: 'Admins managing security configurations',
      },
      content_manager: {
        name: 'Content Manager',
        priority: 'MEDIUM',
        painPoints: ['content_deployment_issues', 'cache_problems', 'performance_degradation'],
        journeySteps: [
          'content_upload',
          'cache_configuration',
          'performance_monitoring',
          'content_optimization',
        ],
        businessValue: 0.7,
        description: 'Users managing content delivery',
      },
      site_admin: {
        name: 'Site Administrator',
        priority: 'HIGH',
        painPoints: [
          'site_availability_issues',
          'performance_problems',
          'configuration_complexity',
        ],
        journeySteps: ['site_setup', 'domain_configuration', 'performance_tuning', 'monitoring'],
        businessValue: 0.85,
        description: 'Admins managing website operations',
      },
    };

    this.customerJourneys = {
      onboarding: {
        name: 'Customer Onboarding',
        steps: [
          { step: 'account_setup', weight: 0.9, critical: true },
          { step: 'authentication_setup', weight: 0.95, critical: true },
          { step: 'first_property_creation', weight: 0.8, critical: true },
          { step: 'basic_configuration', weight: 0.7, critical: false },
          { step: 'first_deployment', weight: 0.85, critical: true },
        ],
        businessImpact: 'HIGH',
        description: 'New customer getting started with Akamai services',
      },
      daily_operations: {
        name: 'Daily Operations',
        steps: [
          { step: 'monitoring_check', weight: 0.6, critical: false },
          { step: 'configuration_updates', weight: 0.7, critical: false },
          { step: 'content_management', weight: 0.5, critical: false },
          { step: 'performance_optimization', weight: 0.6, critical: false },
          { step: 'issue_resolution', weight: 0.8, critical: true },
        ],
        businessImpact: 'MEDIUM',
        description: 'Regular day-to-day operations and maintenance',
      },
      incident_response: {
        name: 'Incident Response',
        steps: [
          { step: 'issue_detection', weight: 0.9, critical: true },
          { step: 'diagnosis', weight: 0.85, critical: true },
          { step: 'mitigation', weight: 0.95, critical: true },
          { step: 'resolution', weight: 0.9, critical: true },
          { step: 'post_incident_analysis', weight: 0.6, critical: false },
        ],
        businessImpact: 'CRITICAL',
        description: 'Responding to service incidents and outages',
      },
      feature_adoption: {
        name: 'Feature Adoption',
        steps: [
          { step: 'feature_discovery', weight: 0.5, critical: false },
          { step: 'documentation_review', weight: 0.6, critical: false },
          { step: 'testing_implementation', weight: 0.8, critical: true },
          { step: 'production_deployment', weight: 0.85, critical: true },
          { step: 'optimization', weight: 0.6, critical: false },
        ],
        businessImpact: 'MEDIUM',
        description: 'Adopting new features and capabilities',
      },
      scaling_operations: {
        name: 'Scaling Operations',
        steps: [
          { step: 'capacity_planning', weight: 0.7, critical: false },
          { step: 'configuration_scaling', weight: 0.8, critical: true },
          { step: 'performance_testing', weight: 0.85, critical: true },
          { step: 'deployment_scaling', weight: 0.9, critical: true },
          { step: 'monitoring_adjustment', weight: 0.6, critical: false },
        ],
        businessImpact: 'HIGH',
        description: 'Scaling operations for growth',
      },
    };

    this.businessMetrics = {
      customer_satisfaction: { weight: 0.25, baseline: 4.2, target: 4.5 },
      time_to_value: { weight: 0.2, baseline: 7, target: 3 }, // days
      adoption_rate: { weight: 0.15, baseline: 0.65, target: 0.8 },
      support_ticket_volume: { weight: 0.15, baseline: 100, target: 60 }, // per month
      churn_risk: { weight: 0.1, baseline: 0.05, target: 0.02 },
      feature_utilization: { weight: 0.1, baseline: 0.4, target: 0.7 },
      api_success_rate: { weight: 0.05, baseline: 0.95, target: 0.99 },
    };

    this.impactMultipliers = {
      onboarding: 2.5, // Onboarding issues have high impact
      critical_path: 2.0, // Critical path issues
      security: 1.8, // Security issues
      performance: 1.5, // Performance issues
      usability: 1.3, // Usability issues
      documentation: 1.2, // Documentation issues
    };
  }

  /**
   * Analyze customer experience impact from test failures
   */
  analyzeCustomerImpact(testResults: TestResults, _analysisResults: any) {
    const impact = {
      overview: this.generateImpactOverview(testResults, _analysisResults),
      personaImpacts: this.analyzePersonaImpacts(testResults, _analysisResults),
      journeyImpacts: this.analyzeJourneyImpacts(testResults, _analysisResults),
      businessMetrics: this.calculateBusinessMetrics(testResults, _analysisResults),
      riskAssessment: this.assessCustomerRisks(testResults, _analysisResults),
      recommendations: this.generateCustomerRecommendations(testResults, _analysisResults),
      prioritizedActions: this.prioritizeByCustomerImpact(testResults, _analysisResults),
    };

    return impact;
  }

  /**
   * Generate overall impact overview
   */
  generateImpactOverview(testResults: TestResults, _analysisResults: any) {
    const totalFailures = testResults.summary?.failedTests || 0;
    const totalTests = testResults.summary?.totalTests || 1;
    const failureRate = totalFailures / totalTests;

    const criticalFailures = this.identifyCriticalFailures(testResults, _analysisResults);
    const customerFacingFailures = this.identifyCustomerFacingFailures(testResults);

    return {
      overallHealth: this.calculateOverallHealth(failureRate, criticalFailures.length),
      customerImpactScore: this.calculateCustomerImpactScore(testResults, _analysisResults),
      affectedPersonas: this.getAffectedPersonas(testResults, _analysisResults),
      affectedJourneys: this.getAffectedJourneys(testResults, _analysisResults),
      criticalFailures: criticalFailures.length,
      customerFacingFailures: customerFacingFailures.length,
      riskLevel: this.calculateRiskLevel(failureRate, criticalFailures.length),
      estimatedCustomersAffected: this.estimateAffectedCustomers(testResults, _analysisResults),
    };
  }

  /**
   * Calculate overall customer experience health
   */
  calculateOverallHealth(failureRate: number, criticalFailures: number): string {
    if (criticalFailures > 0 || failureRate > 0.3) {
return 'POOR';
}
    if (failureRate > 0.15) {
return 'FAIR';
}
    if (failureRate > 0.05) {
return 'GOOD';
}
    return 'EXCELLENT';
  }

  /**
   * Calculate customer impact score (0-100)
   */
  calculateCustomerImpactScore(testResults: TestResults, _analysisResults: any): number {
    let score = 100;
    const failures = testResults.failures || [];

    failures.forEach((failure) => {
      const impactWeight = this.getFailureImpactWeight(failure);
      const personaMultiplier = this.getPersonaMultiplier(failure);
      const journeyMultiplier = this.getJourneyMultiplier(failure);

      const impactReduction = impactWeight * personaMultiplier * journeyMultiplier;
      score -= impactReduction;
    });

    return Math.max(0, score);
  }

  /**
   * Get impact weight for a specific failure
   */
  getFailureImpactWeight(failure: TestFailure): number {
    const message = failure.message?.toLowerCase() || '';

    // Critical authentication/security issues
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 15;
    }

    // API connectivity issues
    if (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('timeout')
    ) {
      return 12;
    }

    // Configuration issues
    if (message.includes('config') || message.includes('setup') || message.includes('missing')) {
      return 10;
    }

    // Validation/data issues
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('bad request')
    ) {
      return 8;
    }

    // Performance issues
    if (
      message.includes('slow') ||
      message.includes('performance') ||
      message.includes('timeout')
    ) {
      return 6;
    }

    // Default impact
    return 5;
  }

  /**
   * Get persona multiplier based on which personas are affected
   */
  getPersonaMultiplier(failure: TestFailure): number {
    const message = failure.message?.toLowerCase() || '';
    const testName = (failure.test || '').toLowerCase();

    // Security-related failures heavily impact security admins
    if (
      message.includes('security') ||
      message.includes('certificate') ||
      testName.includes('security')
    ) {
      return 1.5;
    }

    // API failures heavily impact developers
    if (message.includes('api') || testName.includes('api') || testName.includes('integration')) {
      return 1.4;
    }

    // Configuration failures impact DevOps engineers
    if (
      message.includes('config') ||
      message.includes('deployment') ||
      testName.includes('config')
    ) {
      return 1.3;
    }

    return 1.0;
  }

  /**
   * Get journey multiplier based on which customer journeys are affected
   */
  getJourneyMultiplier(failure: TestFailure): number {
    const message = failure.message?.toLowerCase() || '';
    const testName = (failure.test || '').toLowerCase();

    // Onboarding-related failures
    if (testName.includes('onboard') || testName.includes('setup') || testName.includes('first')) {
      return 2.0;
    }

    // Authentication setup failures
    if (message.includes('auth') && (testName.includes('setup') || testName.includes('config'))) {
      return 1.8;
    }

    // Critical operations failures
    if (testName.includes('critical') || testName.includes('production')) {
      return 1.6;
    }

    return 1.0;
  }

  /**
   * Analyze impact on specific customer personas
   */
  analyzePersonaImpacts(
    testResults: TestResults,
    _analysisResults: any,
  ): Record<string, PersonaImpact> {
    const personaImpacts: Record<string, PersonaImpact> = {};

    Object.entries(this.customerPersonas).forEach(([_personaId, persona]) => {
      const impact = this.calculatePersonaImpact(_personaId, persona, testResults, _analysisResults);
      personaImpacts[personaId] = impact;
    });

    return personaImpacts;
  }

  /**
   * Calculate impact for a specific persona
   */
  calculatePersonaImpact(
    _personaId: string,
    persona: CustomerPersona,
    testResults: TestResults,
    _analysisResults: any,
  ): PersonaImpact {
    const relevantFailures = this.getPersonaRelevantFailures(_personaId, testResults);
    const impactedPainPoints = this.getImpactedPainPoints(_personaId, relevantFailures);
    const affectedJourneySteps = this.getAffectedJourneySteps(_personaId, relevantFailures);

    const impactScore = this.calculatePersonaImpactScore(relevantFailures, persona);
    const riskLevel = this.assessPersonaRisk(impactScore, impactedPainPoints.length);

    return {
      persona: persona.name,
      description: persona.description,
      priority: persona.priority,
      businessValue: persona.businessValue,
      impactScore: impactScore,
      riskLevel: riskLevel,
      relevantFailures: relevantFailures.length,
      impactedPainPoints: impactedPainPoints,
      affectedJourneySteps: affectedJourneySteps,
      recommendations: this.generatePersonaRecommendations(_personaId, relevantFailures),
      estimatedAffectedUsers: this.estimatePersonaAffectedUsers(_personaId, impactScore),
    };
  }

  /**
   * Get failures relevant to a specific persona
   */
  getPersonaRelevantFailures(_personaId: string, testResults: TestResults): TestFailure[] {
    const persona = this.customerPersonas[personaId];
    if (!persona) {
return [];
}

    const failures = testResults.failures || [];

    return failures.filter((failure) => {
      const message = failure.message?.toLowerCase() || '';
      const testName = (failure.test || '').toLowerCase();
      const suite = (failure.suite || '').toLowerCase();

      // Check if failure relates to persona's pain points
      return persona.painPoints.some((painPoint) => {
        switch (painPoint) {
          case 'api_failures':
            return message.includes('api') || testName.includes('api') || suite.includes('api');
          case 'authentication_issues':
            return message.includes('auth') || testName.includes('auth');
          case 'documentation_gaps':
            return testName.includes('doc') || message.includes('documentation');
          case 'deployment_failures':
            return (
              message.includes('deploy') ||
              testName.includes('deploy') ||
              testName.includes('activation')
            );
          case 'configuration_issues':
            return (
              message.includes('config') ||
              testName.includes('config') ||
              testName.includes('setup')
            );
          case 'monitoring_gaps':
            return testName.includes('monitor') || testName.includes('health');
          case 'security_misconfigurations':
            return (
              message.includes('security') ||
              testName.includes('security') ||
              message.includes('certificate')
            );
          case 'certificate_issues':
            return (
              message.includes('certificate') || message.includes('ssl') || message.includes('tls')
            );
          case 'access_control_failures':
            return (
              message.includes('unauthorized') ||
              message.includes('forbidden') ||
              message.includes('access')
            );
          case 'content_deployment_issues':
            return testName.includes('content') || testName.includes('property');
          case 'cache_problems':
            return message.includes('cache') || testName.includes('cache');
          case 'performance_degradation':
            return (
              message.includes('timeout') ||
              message.includes('slow') ||
              testName.includes('performance')
            );
          case 'site_availability_issues':
            return (
              message.includes('unavailable') ||
              message.includes('down') ||
              testName.includes('availability')
            );
          case 'performance_problems':
            return (
              message.includes('performance') ||
              message.includes('slow') ||
              message.includes('timeout')
            );
          case 'configuration_complexity':
            return (
              message.includes('complex') ||
              testName.includes('advanced') ||
              message.includes('validation')
            );
          default:
            return false;
        }
      });
    });
  }

  /**
   * Analyze impact on customer journeys
   */
  analyzeJourneyImpacts(
    testResults: TestResults,
    _analysisResults: any,
  ): Record<string, JourneyImpact> {
    const journeyImpacts: Record<string, JourneyImpact> = {};

    Object.entries(this.customerJourneys).forEach(([journeyId, journey]) => {
      const impact = this.calculateJourneyImpact(journeyId, journey, testResults, _analysisResults);
      journeyImpacts[journeyId] = impact;
    });

    return journeyImpacts;
  }

  /**
   * Calculate impact for a specific customer journey
   */
  calculateJourneyImpact(
    journeyId: string,
    journey: CustomerJourney,
    testResults: TestResults,
    _analysisResults: any,
  ): JourneyImpact {
    const relevantFailures = this.getJourneyRelevantFailures(journeyId, testResults);
    const affectedSteps = this.getAffectedJourneyStepsForJourney(journeyId, relevantFailures);
    const criticalStepsAffected = affectedSteps.filter((step) => step.critical).length;

    const impactScore = this.calculateJourneyImpactScore(relevantFailures, journey);
    const riskLevel = this.assessJourneyRisk(impactScore, criticalStepsAffected);

    return {
      journey: journey.name,
      description: journey.description,
      businessImpact: journey.businessImpact,
      impactScore: impactScore,
      riskLevel: riskLevel,
      relevantFailures: relevantFailures.length,
      affectedSteps: affectedSteps.length,
      criticalStepsAffected: criticalStepsAffected,
      totalSteps: journey.steps.length,
      completionRisk: this.calculateCompletionRisk(affectedSteps, journey.steps),
      recommendations: this.generateJourneyRecommendations(journeyId, relevantFailures),
    };
  }

  /**
   * Get failures relevant to a specific customer journey
   */
  getJourneyRelevantFailures(journeyId: string, testResults: TestResults): TestFailure[] {
    const journey = this.customerJourneys[journeyId];
    if (!journey) {
return [];
}

    const failures = testResults.failures || [];
    const stepNames = journey.steps.map((s) => s.step);

    return failures.filter((failure) => {
      const message = failure.message?.toLowerCase() || '';
      const testName = (failure.test || '').toLowerCase();
      const suite = (failure.suite || '').toLowerCase();

      // Check if failure relates to journey steps
      return stepNames.some((stepName) => {
        return (
          testName.includes(stepName.replace('_', '')) ||
          suite.includes(stepName.replace('_', '')) ||
          this.matchesJourneyContext(journeyId, stepName, message, testName, suite)
        );
      });
    });
  }

  /**
   * Match failure to journey context
   */
  matchesJourneyContext(
    journeyId: string,
    stepName: string,
    message: string,
    testName: string,
    suite: string,
  ): boolean {
    const contextMappings: Record<string, Record<string, string[]>> = {
      onboarding: {
        account_setup: ['setup', 'account', 'initial', 'first'],
        authentication_setup: ['auth', 'credential', 'login', 'token'],
        first_property_creation: ['property', 'create', 'new', 'onboard'],
        basic_configuration: ['config', 'basic', 'setup'],
        first_deployment: ['deploy', 'activate', 'first', 'initial'],
      },
      daily_operations: {
        monitoring_check: ['monitor', 'health', 'status', 'check'],
        configuration_updates: ['config', 'update', 'modify', 'change'],
        content_management: ['content', 'manage', 'upload', 'publish'],
        performance_optimization: ['performance', 'optimize', 'speed'],
        issue_resolution: ['issue', 'problem', 'error', 'resolve'],
      },
      incident_response: {
        issue_detection: ['detect', 'alert', 'issue', 'problem'],
        diagnosis: ['diagnose', 'analyze', 'investigate'],
        mitigation: ['mitigate', 'workaround', 'temporary'],
        resolution: ['resolve', 'fix', 'solution'],
        post_incident_analysis: ['analysis', 'review', 'postmortem'],
      },
    };

    const journeyMappings = contextMappings[journeyId];
    if (!journeyMappings?.[stepName]) {
return false;
}

    const keywords = journeyMappings[stepName];
    return keywords.some(
      (keyword) =>
        message.includes(keyword) || testName.includes(keyword) || suite.includes(keyword),
    );
  }

  /**
   * Calculate business metrics impact
   */
  calculateBusinessMetrics(testResults: TestResults, _analysisResults: any) {
    const metrics: Record<string, MetricImpact> = {};
    const impactMultiplier = this.getOverallImpactMultiplier(testResults, _analysisResults);

    Object.entries(this.businessMetrics).forEach(([metricName, metricConfig]) => {
      const impactedValue = this.calculateMetricImpact(
        metricName,
        metricConfig,
        impactMultiplier,
        testResults,
        _analysisResults,
      );

      metrics[metricName] = {
        name: metricName,
        baseline: metricConfig.baseline,
        target: metricConfig.target,
        projected: impactedValue,
        impact: this.calculateMetricImpactPercentage(metricConfig.baseline, impactedValue),
        weight: metricConfig.weight,
        riskLevel: this.assessMetricRisk(metricConfig, impactedValue),
      };
    });

    // Calculate overall business impact score
    const overallImpact = this.calculateOverallBusinessImpact(metrics);

    return {
      metrics: metrics,
      overallImpact: overallImpact,
      estimatedRevenueLoss: this.estimateRevenueLoss(overallImpact),
      customerChurnRisk: this.estimateChurnRisk(metrics),
      timeToRecovery: this.estimateTimeToRecovery(testResults, _analysisResults),
    };
  }

  /**
   * Calculate metric impact based on test failures
   */
  calculateMetricImpact(
    metricName: string,
    metricConfig: BusinessMetric,
    impactMultiplier: number,
    testResults: TestResults,
    _analysisResults: any,
  ): number {
    const baselineValue = metricConfig.baseline;
    let impactFactor = 1.0;

    switch (metricName) {
      case 'customer_satisfaction': {
        // Authentication and onboarding failures heavily impact satisfaction
        const authFailures = this.countFailuresByType(testResults, 'auth');
        const onboardingFailures = this.countFailuresByType(testResults, 'onboard');
        impactFactor = 1 - (authFailures * 0.15 + onboardingFailures * 0.2) * impactMultiplier;
        break;
      }

      case 'time_to_value': {
        // Setup and configuration failures increase time to value
        const setupFailures = this.countFailuresByType(testResults, 'setup');
        const configFailures = this.countFailuresByType(testResults, 'config');
        impactFactor = 1 + (setupFailures * 0.3 + configFailures * 0.25) * impactMultiplier;
        break;
      }

      case 'adoption_rate': {
        // API and feature failures reduce adoption
        const apiFailures = this.countFailuresByType(testResults, 'api');
        const featureFailures = this.countFailuresByType(testResults, 'feature');
        impactFactor = 1 - (apiFailures * 0.1 + featureFailures * 0.15) * impactMultiplier;
        break;
      }

      case 'support_ticket_volume': {
        // All failures potentially increase support tickets
        const totalFailures = testResults.summary?.failedTests || 0;
        impactFactor = 1 + totalFailures * 0.05 * impactMultiplier;
        break;
      }

      case 'churn_risk': {
        // Critical failures increase churn risk
        const criticalFailures = this.identifyCriticalFailures(testResults, _analysisResults);
        impactFactor = 1 + criticalFailures.length * 0.02 * impactMultiplier;
        break;
      }

      case 'feature_utilization': {
        // Feature-related failures reduce utilization
        const utilizationFailures = this.countFailuresByType(testResults, 'utilization');
        impactFactor = 1 - utilizationFailures * 0.1 * impactMultiplier;
        break;
      }

      case 'api_success_rate': {
        // API failures directly impact success rate
        const apiErrorRate = this.calculateApiErrorRate(testResults);
        impactFactor = 1 - apiErrorRate * impactMultiplier;
        break;
      }

      default:
        impactFactor = 1 - 0.05 * impactMultiplier;
    }

    return baselineValue * Math.max(0.1, impactFactor);
  }

  /**
   * Count failures by type
   */
  countFailuresByType(testResults: TestResults, type: string): number {
    const failures = testResults.failures || [];
    return failures.filter((failure) => {
      const message = failure.message?.toLowerCase() || '';
      const testName = (failure.test || '').toLowerCase();
      const suite = (failure.suite || '').toLowerCase();

      return message.includes(type) || testName.includes(type) || suite.includes(type);
    }).length;
  }

  /**
   * Calculate API error rate
   */
  calculateApiErrorRate(testResults: TestResults): number {
    const apiTests =
      this.countFailuresByType(testResults, 'api') + this.countTestsByType(testResults, 'api');
    const apiFailures = this.countFailuresByType(testResults, 'api');

    return apiTests > 0 ? apiFailures / apiTests : 0;
  }

  /**
   * Count tests by type
   */
  countTestsByType(testResults: TestResults, type: string): number {
    const allTests = testResults.testSuites || [];
    let count = 0;

    allTests.forEach((suite) => {
      if (suite.name?.toLowerCase().includes(type)) {
        count += suite.tests?.length || 0;
      }
    });

    return count;
  }

  /**
   * Assess customer risks
   */
  assessCustomerRisks(testResults: TestResults, _analysisResults: any) {
    const risks = {
      immediate: [] as Risk[],
      shortTerm: [] as Risk[],
      longTerm: [] as Risk[],
      overallRiskScore: 0,
    };

    // Immediate risks (critical failures affecting customer operations)
    const criticalFailures = this.identifyCriticalFailures(testResults, _analysisResults);
    criticalFailures.forEach((failure) => {
      risks.immediate.push({
        type: 'critical_failure',
        description: `Critical failure in ${failure.suite}: ${failure.test}`,
        impact: 'HIGH',
        affectedCustomers: this.estimateAffectedCustomers(testResults, _analysisResults, failure),
        mitigationTime: '< 4 hours',
      });
    });

    // Authentication risks
    const authFailures = this.countFailuresByType(testResults, 'auth');
    if (authFailures > 0) {
      risks.immediate.push({
        type: 'authentication_risk',
        description: `${authFailures} authentication failures preventing customer access`,
        impact: 'CRITICAL',
        affectedCustomers: 'ALL',
        mitigationTime: '< 2 hours',
      });
    }

    // Short-term risks (affecting customer adoption and satisfaction)
    const onboardingFailures = this.countFailuresByType(testResults, 'onboard');
    if (onboardingFailures > 0) {
      risks.shortTerm.push({
        type: 'onboarding_risk',
        description: `${onboardingFailures} onboarding failures affecting new customer acquisition`,
        impact: 'HIGH',
        affectedCustomers: 'NEW_CUSTOMERS',
        mitigationTime: '< 1 week',
      });
    }

    // Performance risks
    const performanceFailures = this.countFailuresByType(testResults, 'performance');
    if (performanceFailures > 0) {
      risks.shortTerm.push({
        type: 'performance_risk',
        description: `${performanceFailures} performance issues affecting user experience`,
        impact: 'MEDIUM',
        affectedCustomers: 'POWER_USERS',
        mitigationTime: '< 2 weeks',
      });
    }

    // Long-term risks (affecting business growth and retention)
    const featureFailures = this.countFailuresByType(testResults, 'feature');
    if (featureFailures > 0) {
      risks.longTerm.push({
        type: 'feature_adoption_risk',
        description: `${featureFailures} feature failures limiting platform adoption`,
        impact: 'MEDIUM',
        affectedCustomers: 'GROWTH_SEGMENT',
        mitigationTime: '< 1 month',
      });
    }

    // Calculate overall risk score
    risks.overallRiskScore = this.calculateOverallRiskScore(risks);

    return risks;
  }

  /**
   * Generate customer-focused recommendations
   */
  generateCustomerRecommendations(testResults: TestResults, _analysisResults: any) {
    const recommendations = {
      immediate: [] as Recommendation[],
      customerCommunication: [] as Recommendation[],
      processImprovements: [] as Recommendation[],
      preventive: [] as Recommendation[],
    };

    const criticalFailures = this.identifyCriticalFailures(testResults, _analysisResults);
    const authFailures = this.countFailuresByType(testResults, 'auth');
    const onboardingFailures = this.countFailuresByType(testResults, 'onboard');

    // Immediate actions
    if (criticalFailures.length > 0) {
      recommendations.immediate.push({
        action: 'Activate incident response protocol',
        reason: `${criticalFailures.length} critical failures detected`,
        owner: 'Engineering Team',
        timeline: 'Immediate',
      });
    }

    if (authFailures > 0) {
      recommendations.immediate.push({
        action: 'Fix authentication system immediately',
        reason: 'Authentication failures block all customer access',
        owner: 'Security Team',
        timeline: '< 2 hours',
      });
    }

    // Customer communication
    if (criticalFailures.length > 0 || authFailures > 0) {
      recommendations.customerCommunication.push({
        action: 'Notify affected customers proactively',
        reason: 'Critical issues may impact customer operations',
        owner: 'Customer Success Team',
        timeline: '< 1 hour',
        channels: ['email', 'status_page', 'support_portal'],
      });
    }

    if (onboardingFailures > 0) {
      recommendations.customerCommunication.push({
        action: 'Provide alternative onboarding guidance',
        reason: 'New customers may experience setup difficulties',
        owner: 'Customer Success Team',
        timeline: '< 4 hours',
        channels: ['documentation', 'support_chat'],
      });
    }

    // Process improvements
    recommendations.processImprovements.push({
      action: 'Implement customer impact assessment in CI/CD',
      reason: 'Prevent customer-impacting issues from reaching production',
      owner: 'DevOps Team',
      timeline: '< 1 week',
    });

    recommendations.processImprovements.push({
      action: 'Create customer journey monitoring',
      reason: 'Track customer experience metrics in real-time',
      owner: 'Product Team',
      timeline: '< 2 weeks',
    });

    // Preventive measures
    recommendations.preventive.push({
      action: 'Establish customer experience KPIs',
      reason: 'Measure and track customer impact continuously',
      owner: 'Product Team',
      timeline: '< 1 month',
    });

    recommendations.preventive.push({
      action: 'Implement customer feedback loop',
      reason: 'Get early warning of customer experience issues',
      owner: 'Customer Success Team',
      timeline: '< 2 weeks',
    });

    return recommendations;
  }

  /**
   * Prioritize actions by customer impact
   */
  prioritizeByCustomerImpact(testResults: TestResults, _analysisResults: any) {
    const actions: Action[] = [];

    // Extract all potential actions from analysis
    const failures = testResults.failures || [];

    failures.forEach((failure) => {
      const customerImpact = this.assessFailureCustomerImpact(failure);
      const businessValue = this.assessFailureBusinessValue(failure);
      const urgency = this.assessFailureUrgency(failure);

      actions.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: `Fix: ${failure.test || 'Unknown test'}`,
        failure: failure,
        customerImpact: customerImpact,
        businessValue: businessValue,
        urgency: urgency,
        priority: this.calculateActionPriority(customerImpact, businessValue, urgency),
        estimatedEffort: this.estimateFixEffort(failure),
        affectedPersonas: this.getFailureAffectedPersonas(failure),
        affectedJourneys: this.getFailureAffectedJourneys(failure),
      });
    });

    // Sort by priority score
    actions.sort((a, b) => b.priority - a.priority);

    return {
      actions: actions.slice(0, 20), // Top 20 prioritized actions
      topQuickWins: actions.filter((a) => a.estimatedEffort <= 4 && a.priority > 70).slice(0, 5),
      criticalActions: actions.filter((a) => a.urgency === 'CRITICAL').slice(0, 10),
      highImpactActions: actions.filter((a) => a.customerImpact === 'HIGH').slice(0, 10),
    };
  }

  /**
   * Helper methods for calculations
   */
  identifyCriticalFailures(testResults: TestResults, _analysisResults: any): TestFailure[] {
    const failures = testResults.failures || [];
    return failures.filter((failure) => {
      const message = failure.message?.toLowerCase() || '';
      const testName = (failure.test || '').toLowerCase();

      return (
        message.includes('critical') ||
        message.includes('fatal') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        testName.includes('critical') ||
        testName.includes('auth')
      );
    });
  }

  identifyCustomerFacingFailures(testResults: TestResults): TestFailure[] {
    const failures = testResults.failures || [];
    return failures.filter((failure) => {
      const testName = (failure.test || '').toLowerCase();
      const suite = (failure.suite || '').toLowerCase();

      return (
        testName.includes('customer') ||
        testName.includes('user') ||
        testName.includes('api') ||
        testName.includes('onboard') ||
        suite.includes('integration') ||
        suite.includes('e2e')
      );
    });
  }

  getAffectedPersonas(testResults: TestResults, _analysisResults: any) {
    const personaImpacts = this.analyzePersonaImpacts(testResults, _analysisResults);
    return Object.entries(personaImpacts)
      .filter(([, impact]) => impact.relevantFailures > 0)
      .map(([_personaId, impact]) => ({
        id: _personaId,
        name: impact.persona,
        impactScore: impact.impactScore,
        riskLevel: impact.riskLevel,
      }));
  }

  getAffectedJourneys(testResults: TestResults, _analysisResults: any) {
    const journeyImpacts = this.analyzeJourneyImpacts(testResults, _analysisResults);
    return Object.entries(journeyImpacts)
      .filter(([, impact]) => impact.relevantFailures > 0)
      .map(([journeyId, impact]) => ({
        id: journeyId,
        name: impact.journey,
        impactScore: impact.impactScore,
        riskLevel: impact.riskLevel,
      }));
  }

  calculateRiskLevel(failureRate: number, criticalFailures: number): string {
    if (criticalFailures > 0 || failureRate > 0.3) {
return 'CRITICAL';
}
    if (failureRate > 0.15) {
return 'HIGH';
}
    if (failureRate > 0.05) {
return 'MEDIUM';
}
    return 'LOW';
  }

  estimateAffectedCustomers(
    testResults: TestResults,
    _analysisResults: any,
    _specificFailure?: TestFailure,
  ): string {
    // This would typically connect to customer data
    // For now, provide estimates based on failure types
    const criticalFailures = this.identifyCriticalFailures(testResults, _analysisResults);
    const authFailures = this.countFailuresByType(testResults, 'auth');

    if (authFailures > 0) {
return 'ALL';
}
    if (criticalFailures.length > 2) {
return 'MAJORITY';
}
    if (criticalFailures.length > 0) {
return 'SUBSET';
}
    return 'MINIMAL';
  }

  // Additional helper methods would be implemented here...
  // Due to length constraints, including key calculation methods

  calculateActionPriority(_customerImpact: string, businessValue: string, urgency: string): number {
    const weights = { customerImpact: 0.4, businessValue: 0.3, urgency: 0.3 };
    const scores = {
      customerImpact: this.mapImpactToScore(customerImpact),
      businessValue: this.mapValueToScore(businessValue),
      urgency: this.mapUrgencyToScore(urgency),
    };

    return Object.entries(weights).reduce(
      (total, [key, weight]) => total + scores[key as keyof typeof scores] * weight,
      0,
    );
  }

  mapImpactToScore(impact: string): number {
    const mapping: Record<string, number> = { CRITICAL: 100, HIGH: 80, MEDIUM: 60, LOW: 40 };
    return mapping[impact] || 40;
  }

  mapValueToScore(value: string): number {
    const mapping: Record<string, number> = { HIGH: 100, MEDIUM: 70, LOW: 40 };
    return mapping[value] || 40;
  }

  mapUrgencyToScore(urgency: string): number {
    const mapping: Record<string, number> = { CRITICAL: 100, HIGH: 80, MEDIUM: 60, LOW: 40 };
    return mapping[urgency] || 40;
  }

  assessFailureCustomerImpact(failure: TestFailure): string {
    const message = failure.message?.toLowerCase() || '';
    if (message.includes('auth') || message.includes('critical')) {
return 'CRITICAL';
}
    if (message.includes('api') || message.includes('onboard')) {
return 'HIGH';
}
    if (message.includes('config') || message.includes('setup')) {
return 'MEDIUM';
}
    return 'LOW';
  }

  assessFailureBusinessValue(failure: TestFailure): string {
    const testName = (failure.test || '').toLowerCase();
    if (testName.includes('critical') || testName.includes('revenue')) {
return 'HIGH';
}
    if (testName.includes('customer') || testName.includes('user')) {
return 'MEDIUM';
}
    return 'LOW';
  }

  assessFailureUrgency(failure: TestFailure): string {
    const message = failure.message?.toLowerCase() || '';
    if (message.includes('critical') || message.includes('fatal')) {
return 'CRITICAL';
}
    if (message.includes('auth') || message.includes('security')) {
return 'HIGH';
}
    if (message.includes('performance') || message.includes('timeout')) {
return 'MEDIUM';
}
    return 'LOW';
  }

  estimateFixEffort(failure: TestFailure): number {
    const message = failure.message?.toLowerCase() || '';
    if (message.includes('config') || message.includes('validation')) {
return 2;
}
    if (message.includes('api') || message.includes('auth')) {
return 4;
}
    if (message.includes('complex') || message.includes('architecture')) {
return 16;
}
    return 8;
  }

  getFailureAffectedPersonas(failure: TestFailure): string[] {
    // Simplified mapping - would be more sophisticated in practice
    const message = failure.message?.toLowerCase() || '';
    const personas: string[] = [];

    if (message.includes('api')) {
personas.push('developer');
}
    if (message.includes('config') || message.includes('deploy')) {
personas.push('devops_engineer');
}
    if (message.includes('security') || message.includes('cert')) {
personas.push('security_admin');
}
    if (message.includes('content') || message.includes('performance')) {
personas.push('content_manager');
}
    if (message.includes('site') || message.includes('domain')) {
personas.push('site_admin');
}

    return personas.length > 0 ? personas : ['developer']; // Default to developer
  }

  getFailureAffectedJourneys(failure: TestFailure): string[] {
    // Simplified mapping - would be more sophisticated in practice
    const testName = (failure.test || '').toLowerCase();
    const journeys: string[] = [];

    if (testName.includes('onboard') || testName.includes('setup')) {
journeys.push('onboarding');
}
    if (testName.includes('daily') || testName.includes('monitor')) {
journeys.push('daily_operations');
}
    if (testName.includes('incident') || testName.includes('critical')) {
journeys.push('incident_response');
}
    if (testName.includes('feature') || testName.includes('new')) {
journeys.push('feature_adoption');
}
    if (testName.includes('scale') || testName.includes('performance')) {
journeys.push('scaling_operations');
}

    return journeys.length > 0 ? journeys : ['daily_operations']; // Default
  }

  // Stub methods that need implementation
  private getImpactedPainPoints(_personaId: string, _failures: TestFailure[]): string[] {
    // Implementation would analyze failures and map to pain points
    return [];
  }

  private getAffectedJourneySteps(_personaId: string, _failures: TestFailure[]): any[] {
    // Implementation would map failures to journey steps
    return [];
  }

  private calculatePersonaImpactScore(_failures: TestFailure[], _persona: CustomerPersona): number {
    // Implementation would calculate score based on failures and persona
    return 100 - _failures.length * 10;
  }

  private assessPersonaRisk(impactScore: number, painPointsCount: number): string {
    if (impactScore < 50 || painPointsCount > 3) {
return 'CRITICAL';
}
    if (impactScore < 70 || painPointsCount > 2) {
return 'HIGH';
}
    if (impactScore < 85 || painPointsCount > 1) {
return 'MEDIUM';
}
    return 'LOW';
  }

  private generatePersonaRecommendations(_personaId: string, _failures: TestFailure[]): any[] {
    // Implementation would generate specific recommendations
    return [];
  }

  private estimatePersonaAffectedUsers(_personaId: string, impactScore: number): string {
    if (impactScore < 50) {
return 'ALL';
}
    if (impactScore < 70) {
return 'MAJORITY';
}
    if (impactScore < 85) {
return 'SUBSET';
}
    return 'MINIMAL';
  }

  private getAffectedJourneyStepsForJourney(
    journeyId: string,
    _failures: TestFailure[],
  ): JourneyStep[] {
    const journey = this.customerJourneys[journeyId];
    if (!journey) {
return [];
}

    // Implementation would analyze failures and map to journey steps
    return [];
  }

  private calculateJourneyImpactScore(_failures: TestFailure[], _journey: CustomerJourney): number {
    // Implementation would calculate score based on failures and journey
    return 100 - _failures.length * 5;
  }

  private assessJourneyRisk(impactScore: number, criticalStepsAffected: number): string {
    if (impactScore < 50 || criticalStepsAffected > 2) {
return 'CRITICAL';
}
    if (impactScore < 70 || criticalStepsAffected > 1) {
return 'HIGH';
}
    if (impactScore < 85 || criticalStepsAffected > 0) {
return 'MEDIUM';
}
    return 'LOW';
  }

  private calculateCompletionRisk(affectedSteps: JourneyStep[], allSteps: JourneyStep[]): number {
    if (allSteps.length === 0) {
return 0;
}
    return (affectedSteps.length / allSteps.length) * 100;
  }

  private generateJourneyRecommendations(_journeyId: string, _failures: TestFailure[]): any[] {
    // Implementation would generate specific recommendations
    return [];
  }

  private getOverallImpactMultiplier(testResults: TestResults, _analysisResults: any): number {
    const failureRate =
      (testResults.summary?.failedTests || 0) / (testResults.summary?.totalTests || 1);
    return Math.min(2.0, 1 + failureRate);
  }

  private calculateMetricImpactPercentage(baseline: number, projected: number): number {
    if (baseline === 0) {
return 0;
}
    return ((projected - baseline) / baseline) * 100;
  }

  private assessMetricRisk(metric: BusinessMetric, projectedValue: number): string {
    const targetDiff = Math.abs(projectedValue - metric.target);
    const baselineDiff = Math.abs(projectedValue - metric.baseline);

    if (targetDiff > baselineDiff * 2) {
return 'CRITICAL';
}
    if (targetDiff > baselineDiff * 1.5) {
return 'HIGH';
}
    if (targetDiff > baselineDiff) {
return 'MEDIUM';
}
    return 'LOW';
  }

  private calculateOverallBusinessImpact(metrics: Record<string, MetricImpact>): number {
    let totalImpact = 0;
    let totalWeight = 0;

    Object.values(metrics).forEach((metric) => {
      totalImpact += metric.impact * metric.weight;
      totalWeight += metric.weight;
    });

    return totalWeight > 0 ? totalImpact / totalWeight : 0;
  }

  private estimateRevenueLoss(overallImpact: number): string {
    // Simplified calculation - would use actual business metrics
    if (Math.abs(overallImpact) > 50) {
return '$100K+';
}
    if (Math.abs(overallImpact) > 30) {
return '$50K-$100K';
}
    if (Math.abs(overallImpact) > 15) {
return '$10K-$50K';
}
    if (Math.abs(overallImpact) > 5) {
return '$1K-$10K';
}
    return '<$1K';
  }

  private estimateChurnRisk(metrics: Record<string, MetricImpact>): number {
    const churnMetric = metrics['churn_risk'];
    if (!churnMetric) {
return 0;
}

    return churnMetric.projected;
  }

  private estimateTimeToRecovery(testResults: TestResults, _analysisResults: any): string {
    const criticalFailures = this.identifyCriticalFailures(testResults, _analysisResults);
    const totalFailures = testResults.summary?.failedTests || 0;

    if (criticalFailures.length > 5) {
return '1-2 weeks';
}
    if (criticalFailures.length > 2) {
return '3-5 days';
}
    if (totalFailures > 10) {
return '2-3 days';
}
    if (totalFailures > 5) {
return '1-2 days';
}
    return '< 1 day';
  }

  private calculateOverallRiskScore(risks: {
    immediate: Risk[];
    shortTerm: Risk[];
    longTerm: Risk[];
  }): number {
    let score = 0;

    // Weight immediate risks heavily
    score += risks.immediate.length * 30;

    // Short-term risks
    score += risks.shortTerm.length * 15;

    // Long-term risks
    score += risks.longTerm.length * 5;

    return Math.min(100, score);
  }
}

export default CustomerExperienceImpactAnalyzer;
