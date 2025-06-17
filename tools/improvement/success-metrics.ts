/**
 * Success Measurement Framework
 * Tracks and measures the effectiveness of implemented improvements and recommendations
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Interfaces and Types
export interface MetricsConfig {
  measurementInterval: number;
  baselinePeriod: number;
  evaluationPeriod: number;
  significanceThreshold: number;
  confidenceLevel: number;
}

export interface MeasurementMap {
  baseline: Map<string, BaselineMeasurement>;
  current: Map<string, CurrentMeasurement>;
  improvements: Map<string, any>;
  trends: Map<string, any>;
}

export interface BaselineMeasurement {
  value: number;
  timestamp: number;
  samples: number[];
  confidence: number;
  source: string;
  capturedAt?: string;
}

export interface CurrentMeasurement {
  value: number;
  samples: number[];
  confidence: number;
  measuredAt: string;
  trend: string;
}

export interface SuccessMetric {
  name: string;
  unit: string;
  target: 'increase' | 'decrease';
  weight: number;
  threshold: number;
}

export interface ImprovementTracking {
  implementations: Map<string, Implementation>;
  measurements: Map<string, any>;
  evaluations: Map<string, Evaluation>;
  reports: any[];
}

export interface Implementation {
  id: string;
  implementedAt: string;
  details: ImplementationDetails;
  expectedMetrics: string[];
  measurementPlan: MeasurementPlan;
  status: string;
  results: {
    baseline: Record<string, BaselineMeasurement>;
    current: Record<string, CurrentMeasurement>;
    improvement: Record<string, MetricImprovement>;
  };
  lastEvaluation?: string;
}

export interface ImplementationDetails {
  title: string;
  category?: string;
  impact?: string;
  solutions?: string[];
  expectedMetrics?: string[];
}

export interface MeasurementPlan {
  metrics: MetricPlan[];
  frequency: string;
  duration: number;
  milestones: Milestone[];
}

export interface MetricPlan {
  id: string;
  name: string;
  target: string;
  threshold: number;
  weight: number;
}

export interface Milestone {
  day: number;
  description: string;
}

export interface MetricImprovement {
  metricName: string;
  baseline: number;
  current: number;
  absoluteChange: number;
  percentageChange: number;
  direction: string;
  isImprovement: boolean;
  isSignificant: boolean;
  confidenceScore: number;
  weight: number;
  target: string;
  threshold: number;
}

export interface AnalysisConfig {
  trendAnalysis: {
    shortTerm: number;
    mediumTerm: number;
    longTerm: number;
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivity: number;
    minDataPoints: number;
  };
  forecasting: {
    enabled: boolean;
    horizon: number;
    method: string;
  };
}

export interface MeasurementOptions {
  evaluationPeriod?: number;
  includeForecasting?: boolean;
  generateReport?: boolean;
}

export interface Evaluation {
  id: string;
  implementationId: string;
  timestamp: string;
  measurements: Record<string, CurrentMeasurement>;
  improvements: Record<string, MetricImprovement>;
  statisticalAnalysis: StatisticalAnalysis;
  forecasts: Record<string, Forecast> | null;
  overallSuccess: OverallSuccess;
  recommendations: SuccessRecommendation[];
}

export interface StatisticalAnalysis {
  totalMetrics: number;
  improvedMetrics: number;
  significantImprovements: number;
  weightedImprovementScore: number;
  confidenceScore: number;
  varianceAnalysis: any;
  correlationAnalysis: any;
  improvementRate?: number;
  significanceRate?: number;
}

export interface Forecast {
  metricName: string;
  currentValue: number;
  projectedValue: number;
  projectedImprovement: number;
  confidence: number;
  assumptions: string[];
}

export interface OverallSuccess {
  score: number;
  category: string;
  significantImprovements: number;
  improvementRate?: number;
  significanceRate?: number;
}

export interface SuccessRecommendation {
  type: string;
  priority: string;
  title: string;
  description: string;
  actions: string[];
  metric?: string;
}

export interface ImprovementCalculation {
  absoluteChange: number;
  percentageChange: number;
  direction: 'increase' | 'decrease' | 'stable';
  isImprovement: boolean;
  isSignificant: boolean;
}

export interface SuccessReport {
  title: string;
  timestamp: string;
  implementationId: string;
  executive_summary: {
    overall_success: OverallSuccess;
    key_findings: string[];
    recommendations: SuccessRecommendation[];
  };
  detailed_analysis: {
    metric_improvements: Record<string, MetricImprovement>;
    statistical_analysis: StatisticalAnalysis;
    forecasts: Record<string, Forecast> | null;
  };
  appendix: {
    methodology: string;
    measurement_period: string;
    confidence_level: number;
  };
}

export interface TrendProjection {
  projectedImprovement: number;
  confidence: number;
  assumptions: string[];
}

export class SuccessMetrics {
  private metricsConfig: MetricsConfig;
  private measurements: MeasurementMap;
  private successMetrics: Record<string, SuccessMetric>;
  private improvementTracking: ImprovementTracking;
  private analysisConfig: AnalysisConfig;

  constructor() {
    this.metricsConfig = {
      measurementInterval: 24 * 60 * 60 * 1000, // 24 hours
      baselinePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      evaluationPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      significanceThreshold: 0.05, // 5% improvement threshold
      confidenceLevel: 0.95
    };

    this.measurements = {
      baseline: new Map(),
      current: new Map(),
      improvements: new Map(),
      trends: new Map()
    };

    this.successMetrics = {
      // Performance metrics
      response_time: {
        name: 'API Response Time',
        unit: 'ms',
        target: 'decrease',
        weight: 0.25,
        threshold: 0.1 // 10% improvement
      },
      throughput: {
        name: 'System Throughput',
        unit: 'rps',
        target: 'increase',
        weight: 0.2,
        threshold: 0.15 // 15% improvement
      },
      error_rate: {
        name: 'Error Rate',
        unit: 'ratio',
        target: 'decrease',
        weight: 0.3,
        threshold: 0.2 // 20% reduction
      },
      
      // Reliability metrics
      availability: {
        name: 'System Availability',
        unit: 'ratio',
        target: 'increase',
        weight: 0.25,
        threshold: 0.001 // 0.1% improvement
      },
      mttr: {
        name: 'Mean Time To Recovery',
        unit: 'seconds',
        target: 'decrease',
        weight: 0.2,
        threshold: 0.2 // 20% reduction
      },
      
      // User experience metrics
      user_satisfaction: {
        name: 'User Satisfaction',
        unit: 'score',
        target: 'increase',
        weight: 0.15,
        threshold: 0.05 // 5% improvement
      },
      task_completion_rate: {
        name: 'Task Completion Rate',
        unit: 'ratio',
        target: 'increase',
        weight: 0.15,
        threshold: 0.03 // 3% improvement
      },
      
      // Business metrics
      deployment_frequency: {
        name: 'Deployment Frequency',
        unit: 'per_day',
        target: 'increase',
        weight: 0.1,
        threshold: 0.1 // 10% increase
      },
      lead_time: {
        name: 'Lead Time',
        unit: 'hours',
        target: 'decrease',
        weight: 0.1,
        threshold: 0.15 // 15% reduction
      },
      
      // Cost metrics
      infrastructure_cost: {
        name: 'Infrastructure Cost',
        unit: 'currency',
        target: 'decrease',
        weight: 0.05,
        threshold: 0.05 // 5% reduction
      }
    };

    this.improvementTracking = {
      implementations: new Map(),
      measurements: new Map(),
      evaluations: new Map(),
      reports: []
    };

    this.analysisConfig = {
      trendAnalysis: {
        shortTerm: 7,   // days
        mediumTerm: 30, // days
        longTerm: 90    // days
      },
      anomalyDetection: {
        enabled: true,
        sensitivity: 2.0, // standard deviations
        minDataPoints: 10
      },
      forecasting: {
        enabled: true,
        horizon: 30, // days
        method: 'linear_regression'
      }
    };
  }

  /**
   * Initialize the success metrics framework
   */
  async initializeSuccessMetrics(): Promise<void> {
    console.log('\n📊 Initializing Success Measurement Framework');
    console.log('==============================================\n');

    // Load historical measurements
    await this.loadHistoricalMeasurements();

    // Initialize baseline measurements
    await this.initializeBaselineMeasurements();

    // Setup measurement collection
    await this.setupMeasurementCollection();

    // Load improvement tracking data
    await this.loadImprovementTracking();

    console.log('✅ Success Metrics framework initialized');
  }

  /**
   * Load historical measurements
   */
  async loadHistoricalMeasurements(): Promise<void> {
    console.log('📈 Loading historical measurements...\n');

    try {
      const historyFile = path.join(__dirname, 'metrics-history.json');
      
      try {
        const historyData = await fs.readFile(historyFile, 'utf8');
        const parsedHistory = JSON.parse(historyData);
        
        // Rebuild measurement maps
        if (parsedHistory.baseline) {
          for (const [metric, data] of Object.entries(parsedHistory.baseline)) {
            this.measurements.baseline.set(metric, data as BaselineMeasurement);
          }
        }
        if (parsedHistory.current) {
          for (const [metric, data] of Object.entries(parsedHistory.current)) {
            this.measurements.current.set(metric, data as CurrentMeasurement);
          }
        }
        if (parsedHistory.trends) {
          for (const [metric, data] of Object.entries(parsedHistory.trends)) {
            this.measurements.trends.set(metric, data);
          }
        }

        console.log(`📊 Loaded historical data:`);
        console.log(`  - Baseline metrics: ${this.measurements.baseline.size}`);
        console.log(`  - Current metrics: ${this.measurements.current.size}`);
        console.log(`  - Trend data: ${this.measurements.trends.size}`);
      } catch (fileError) {
        console.log('📝 No existing metrics history found, starting fresh');
      }
    } catch (error: any) {
      console.warn(`⚠️  Failed to load historical measurements: ${error.message}`);
    }
  }

  /**
   * Initialize baseline measurements
   */
  async initializeBaselineMeasurements(): Promise<void> {
    console.log('\n📏 Initializing baseline measurements...\n');

    const currentTime = Date.now();
    const baselineData: Record<string, BaselineMeasurement> = {};

    // Collect current metrics as baseline if no baseline exists
    for (const [metricId, metricConfig] of Object.entries(this.successMetrics)) {
      if (!this.measurements.baseline.has(metricId)) {
        const currentValue = await this.collectMetricValue(metricId);
        
        baselineData[metricId] = {
          value: currentValue,
          timestamp: currentTime,
          samples: [currentValue],
          confidence: 0.8,
          source: 'system_measurement'
        };
        
        this.measurements.baseline.set(metricId, baselineData[metricId]);
        console.log(`  📊 ${metricConfig.name}: ${currentValue} ${metricConfig.unit}`);
      }
    }

    console.log(`\n✅ Baseline established for ${Object.keys(baselineData).length} new metrics`);
  }

  /**
   * Setup measurement collection
   */
  async setupMeasurementCollection(): Promise<void> {
    console.log('\n🔄 Setting up measurement collection...\n');

    // In a real implementation, this would set up automated collection
    // For demonstration, we'll simulate measurement collection
    console.log('⚙️  Measurement collection configured for automated updates');
  }

  /**
   * Load improvement tracking data
   */
  async loadImprovementTracking(): Promise<void> {
    console.log('\n📋 Loading improvement tracking data...\n');

    try {
      const trackingFile = path.join(__dirname, 'improvement-tracking.json');
      
      try {
        const trackingData = await fs.readFile(trackingFile, 'utf8');
        const parsedTracking = JSON.parse(trackingData);
        
        if (parsedTracking.implementations) {
          for (const [id, impl] of Object.entries(parsedTracking.implementations)) {
            this.improvementTracking.implementations.set(id, impl as Implementation);
          }
        }
        if (parsedTracking.measurements) {
          for (const [id, measurement] of Object.entries(parsedTracking.measurements)) {
            this.improvementTracking.measurements.set(id, measurement);
          }
        }
        if (parsedTracking.evaluations) {
          for (const [id, evaluation] of Object.entries(parsedTracking.evaluations)) {
            this.improvementTracking.evaluations.set(id, evaluation as Evaluation);
          }
        }

        console.log(`📈 Loaded improvement tracking:`);
        console.log(`  - Implementations: ${this.improvementTracking.implementations.size}`);
        console.log(`  - Measurements: ${this.improvementTracking.measurements.size}`);
        console.log(`  - Evaluations: ${this.improvementTracking.evaluations.size}`);
      } catch (fileError) {
        console.log('📝 No existing improvement tracking found, starting fresh');
      }
    } catch (error: any) {
      console.warn(`⚠️  Failed to load improvement tracking: ${error.message}`);
    }
  }

  /**
   * Track improvement implementation
   */
  async trackImprovementImplementation(
    recommendationId: string,
    implementationDetails: ImplementationDetails
  ): Promise<Implementation> {
    console.log(`\n🚀 Tracking improvement implementation: ${recommendationId}`);
    console.log('====================================================\n');

    const implementation: Implementation = {
      id: recommendationId,
      implementedAt: new Date().toISOString(),
      details: implementationDetails,
      expectedMetrics: implementationDetails.expectedMetrics || [],
      measurementPlan: await this.createMeasurementPlan(implementationDetails),
      status: 'measuring',
      results: {
        baseline: {},
        current: {},
        improvement: {}
      }
    };

    // Capture baseline measurements
    await this.captureBaselineMeasurements(implementation);

    this.improvementTracking.implementations.set(recommendationId, implementation);

    console.log(`📊 Implementation tracking started for: ${implementationDetails.title}`);
    console.log(`📏 Baseline captured for ${Object.keys(implementation.results.baseline).length} metrics`);
    console.log(`⏱️  Measurement period: ${this.metricsConfig.evaluationPeriod / (24 * 60 * 60 * 1000)} days`);

    return implementation;
  }

  /**
   * Create measurement plan for implementation
   */
  async createMeasurementPlan(implementationDetails: ImplementationDetails): Promise<MeasurementPlan> {
    const plan: MeasurementPlan = {
      metrics: [],
      frequency: 'daily',
      duration: this.metricsConfig.evaluationPeriod,
      milestones: []
    };

    // Determine relevant metrics based on implementation type
    const relevantMetrics = this.identifyRelevantMetrics(implementationDetails);
    
    for (const metricId of relevantMetrics) {
      const metricConfig = this.successMetrics[metricId];
      if (metricConfig) {
        plan.metrics.push({
          id: metricId,
          name: metricConfig.name,
          target: metricConfig.target,
          threshold: metricConfig.threshold,
          weight: metricConfig.weight
        });
      }
    }

    // Set measurement milestones
    plan.milestones = [
      { day: 1, description: 'Initial post-implementation measurement' },
      { day: 7, description: 'Week 1 assessment' },
      { day: 14, description: 'Week 2 assessment' },
      { day: 30, description: 'Final evaluation' }
    ];

    return plan;
  }

  /**
   * Identify relevant metrics for implementation
   */
  identifyRelevantMetrics(implementationDetails: ImplementationDetails): string[] {
    const metrics: string[] = [];
    const impact = implementationDetails.impact || '';
    const category = implementationDetails.category || '';
    const solutions = implementationDetails.solutions || [];

    // Map impact areas to metrics
    const impactMetricMap: Record<string, string[]> = {
      'user_experience': ['response_time', 'user_satisfaction', 'task_completion_rate'],
      'system_reliability': ['availability', 'error_rate', 'mttr'],
      'performance': ['response_time', 'throughput', 'error_rate'],
      'scalability': ['throughput', 'response_time'],
      'cost_optimization': ['infrastructure_cost'],
      'developer_productivity': ['deployment_frequency', 'lead_time']
    };

    // Add metrics based on impact
    if (impactMetricMap[impact]) {
      metrics.push(...impactMetricMap[impact]);
    }

    // Add metrics based on category
    const categoryMetricMap: Record<string, string[]> = {
      'performance': ['response_time', 'throughput', 'error_rate'],
      'reliability': ['availability', 'mttr', 'error_rate'],
      'security': ['error_rate'], // Security improvements often reduce error rates
      'usability': ['user_satisfaction', 'task_completion_rate'],
      'efficiency': ['infrastructure_cost', 'deployment_frequency']
    };

    if (categoryMetricMap[category]) {
      metrics.push(...categoryMetricMap[category]);
    }

    // Add metrics based on solutions
    const solutionMetricMap: Record<string, string[]> = {
      'caching': ['response_time', 'throughput'],
      'load_balancing': ['throughput', 'availability'],
      'monitoring_alerts': ['mttr'],
      'error_handling': ['error_rate', 'user_satisfaction'],
      'automated_testing': ['deployment_frequency', 'error_rate']
    };

    for (const solution of solutions) {
      if (solutionMetricMap[solution]) {
        metrics.push(...solutionMetricMap[solution]);
      }
    }

    // Remove duplicates and return
    return [...new Set(metrics)];
  }

  /**
   * Capture baseline measurements
   */
  async captureBaselineMeasurements(implementation: Implementation): Promise<void> {
    console.log('📏 Capturing baseline measurements...\n');

    for (const metricPlan of implementation.measurementPlan.metrics) {
      const metricId = metricPlan.id;
      
      // Get historical data for baseline
      const historicalValues = await this.getHistoricalValues(metricId, this.metricsConfig.baselinePeriod);
      const baselineValue = this.calculateBaseline(historicalValues);
      
      implementation.results.baseline[metricId] = {
        value: baselineValue,
        samples: historicalValues,
        confidence: this.calculateConfidence(historicalValues),
        capturedAt: new Date().toISOString(),
        timestamp: Date.now(),
        source: 'historical_data'
      };
      
      console.log(`  📊 ${metricPlan.name}: ${baselineValue} (${historicalValues.length} samples)`);
    }
  }

  /**
   * Measure improvement success
   */
  async measureImprovementSuccess(
    implementationId: string,
    options: MeasurementOptions = {}
  ): Promise<Evaluation> {
    console.log(`\n📊 Measuring Improvement Success: ${implementationId}`);
    console.log('===============================================\n');

    const implementation = this.improvementTracking.implementations.get(implementationId);
    if (!implementation) {
      throw new Error(`Implementation not found: ${implementationId}`);
    }

    const measurementOptions: MeasurementOptions = {
      evaluationPeriod: options.evaluationPeriod || this.metricsConfig.evaluationPeriod,
      includeForecasting: options.includeForecasting !== false,
      generateReport: options.generateReport !== false,
      ...options
    };

    try {
      // Collect current measurements
      const currentMeasurements = await this.collectCurrentMeasurements(implementation);
      
      // Calculate improvements
      const improvements = await this.calculateImprovements(implementation, currentMeasurements);
      
      // Perform statistical analysis
      const statisticalAnalysis = await this.performStatisticalAnalysis(improvements);
      
      // Generate forecasts if requested
      let forecasts = null;
      if (measurementOptions.includeForecasting) {
        forecasts = await this.generateForecasts(implementation, improvements);
      }
      
      // Create evaluation report
      const evaluation: Evaluation = {
        id: `eval_${implementationId}_${Date.now()}`,
        implementationId,
        timestamp: new Date().toISOString(),
        measurements: currentMeasurements,
        improvements,
        statisticalAnalysis,
        forecasts,
        overallSuccess: this.calculateOverallSuccess(improvements),
        recommendations: this.generateSuccessRecommendations(improvements, statisticalAnalysis)
      };

      // Store evaluation
      this.improvementTracking.evaluations.set(evaluation.id, evaluation);
      
      // Update implementation status
      implementation.status = 'evaluated';
      implementation.lastEvaluation = evaluation.timestamp;
      implementation.results.current = currentMeasurements;
      implementation.results.improvement = improvements;

      // Generate report if requested
      if (measurementOptions.generateReport) {
        await this.generateSuccessReport(evaluation);
      }

      console.log('\n📈 Success Measurement Summary:');
      console.log(`  Evaluation ID: ${evaluation.id}`);
      console.log(`  Overall Success Score: ${(evaluation.overallSuccess.score * 100).toFixed(1)}%`);
      console.log(`  Significant Improvements: ${evaluation.overallSuccess.significantImprovements}`);
      console.log(`  Metrics Measured: ${Object.keys(improvements).length}`);

      return evaluation;

    } catch (error) {
      console.error('❌ Success measurement failed:', error);
      throw error;
    }
  }

  /**
   * Collect current measurements
   */
  async collectCurrentMeasurements(implementation: Implementation): Promise<Record<string, CurrentMeasurement>> {
    console.log('📊 Collecting current measurements...\n');

    const measurements: Record<string, CurrentMeasurement> = {};

    for (const metricPlan of implementation.measurementPlan.metrics) {
      const metricId = metricPlan.id;
      
      // Collect recent values
      const recentValues = await this.getRecentValues(metricId, this.metricsConfig.evaluationPeriod);
      const currentValue = this.calculateCurrentValue(recentValues);
      
      measurements[metricId] = {
        value: currentValue,
        samples: recentValues,
        confidence: this.calculateConfidence(recentValues),
        measuredAt: new Date().toISOString(),
        trend: this.calculateTrend(recentValues)
      };
      
      console.log(`  📈 ${metricPlan.name}: ${currentValue} (trend: ${measurements[metricId].trend})`);
    }

    return measurements;
  }

  /**
   * Calculate improvements
   */
  async calculateImprovements(
    implementation: Implementation,
    currentMeasurements: Record<string, CurrentMeasurement>
  ): Promise<Record<string, MetricImprovement>> {
    console.log('\n📊 Calculating improvements...\n');

    const improvements: Record<string, MetricImprovement> = {};

    for (const metricPlan of implementation.measurementPlan.metrics) {
      const metricId = metricPlan.id;
      const metricConfig = this.successMetrics[metricId];
      
      const baseline = implementation.results.baseline[metricId];
      const current = currentMeasurements[metricId];
      
      if (!baseline || !current) {
        console.warn(`⚠️  Missing data for metric: ${metricId}`);
        continue;
      }

      const improvement = this.calculateMetricImprovement(
        baseline.value,
        current.value,
        metricConfig
      );

      improvements[metricId] = {
        metricName: metricConfig.name,
        baseline: baseline.value,
        current: current.value,
        absoluteChange: improvement.absoluteChange,
        percentageChange: improvement.percentageChange,
        direction: improvement.direction,
        isImprovement: improvement.isImprovement,
        isSignificant: improvement.isSignificant,
        confidenceScore: Math.min(baseline.confidence, current.confidence),
        weight: metricConfig.weight,
        target: metricConfig.target,
        threshold: metricConfig.threshold
      };
      
      const status = improvement.isSignificant ? 
        (improvement.isImprovement ? '📈 IMPROVED' : '📉 DECLINED') : 
        '➡️  NO CHANGE';
      
      console.log(`  ${status} ${metricConfig.name}: ${improvement.percentageChange.toFixed(1)}%`);
    }

    return improvements;
  }

  /**
   * Calculate metric improvement
   */
  calculateMetricImprovement(baseline: number, current: number, metricConfig: SuccessMetric): ImprovementCalculation {
    const absoluteChange = current - baseline;
    const percentageChange = baseline !== 0 ? (absoluteChange / baseline) * 100 : 0;
    
    // Determine direction (positive change is improvement for 'increase' targets)
    const direction: 'increase' | 'decrease' | 'stable' = 
      absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decrease' : 'stable';
    
    // Determine if change is an improvement based on target
    const isImprovement = (metricConfig.target === 'increase' && direction === 'increase') ||
                         (metricConfig.target === 'decrease' && direction === 'decrease');
    
    // Check if improvement is significant
    const isSignificant = Math.abs(percentageChange / 100) >= metricConfig.threshold;
    
    return {
      absoluteChange,
      percentageChange,
      direction,
      isImprovement,
      isSignificant
    };
  }

  /**
   * Perform statistical analysis
   */
  async performStatisticalAnalysis(improvements: Record<string, MetricImprovement>): Promise<StatisticalAnalysis> {
    console.log('\n📊 Performing statistical analysis...\n');

    const analysis: StatisticalAnalysis = {
      totalMetrics: Object.keys(improvements).length,
      improvedMetrics: 0,
      significantImprovements: 0,
      weightedImprovementScore: 0,
      confidenceScore: 0,
      varianceAnalysis: {},
      correlationAnalysis: {}
    };

    let totalWeight = 0;
    let totalConfidence = 0;

    for (const [metricId, improvement] of Object.entries(improvements) as [string, MetricImprovement][]) {
      if (improvement.isImprovement) {
        analysis.improvedMetrics++;
      }
      
      if (improvement.isSignificant && improvement.isImprovement) {
        analysis.significantImprovements++;
      }
      
      // Calculate weighted improvement score
      const improvementScore = improvement.isImprovement ? 
        Math.min(Math.abs(improvement.percentageChange) / 100, 1) : 0;
      
      analysis.weightedImprovementScore += improvementScore * improvement.weight;
      totalWeight += improvement.weight;
      
      totalConfidence += improvement.confidenceScore;
    }

    // Normalize scores
    analysis.weightedImprovementScore = totalWeight > 0 ? analysis.weightedImprovementScore / totalWeight : 0;
    analysis.confidenceScore = analysis.totalMetrics > 0 ? totalConfidence / analysis.totalMetrics : 0;

    // Calculate improvement rate
    analysis.improvementRate = analysis.totalMetrics > 0 ? 
      analysis.improvedMetrics / analysis.totalMetrics : 0;
    
    analysis.significanceRate = analysis.totalMetrics > 0 ? 
      analysis.significantImprovements / analysis.totalMetrics : 0;

    console.log(`📈 Statistical Analysis Results:`);
    console.log(`  Improvement Rate: ${(analysis.improvementRate * 100).toFixed(1)}%`);
    console.log(`  Significance Rate: ${(analysis.significanceRate * 100).toFixed(1)}%`);
    console.log(`  Weighted Score: ${(analysis.weightedImprovementScore * 100).toFixed(1)}%`);
    console.log(`  Confidence: ${(analysis.confidenceScore * 100).toFixed(1)}%`);

    return analysis;
  }

  /**
   * Generate forecasts
   */
  async generateForecasts(
    implementation: Implementation,
    improvements: Record<string, MetricImprovement>
  ): Promise<Record<string, Forecast>> {
    console.log('\n🔮 Generating forecasts...\n');

    const forecasts: Record<string, Forecast> = {};

    for (const [metricId, improvement] of Object.entries(improvements)) {
      if (improvement.isImprovement && improvement.isSignificant) {
        const trend = this.calculateTrendProjection(improvement);
        
        forecasts[metricId] = {
          metricName: improvement.metricName,
          currentValue: improvement.current,
          projectedValue: this.projectFutureValue(improvement, 30), // 30 days
          projectedImprovement: trend.projectedImprovement,
          confidence: trend.confidence,
          assumptions: trend.assumptions
        };
        
        console.log(`  📊 ${improvement.metricName}: ${forecasts[metricId].projectedImprovement.toFixed(1)}% further improvement expected`);
      }
    }

    return forecasts;
  }

  /**
   * Calculate overall success
   */
  calculateOverallSuccess(improvements: Record<string, MetricImprovement>): OverallSuccess {
    const metrics = Object.values(improvements);
    const totalMetrics = metrics.length;
    
    if (totalMetrics === 0) {
      return { score: 0, category: 'insufficient_data', significantImprovements: 0 };
    }

    const improvedMetrics = metrics.filter(m => m.isImprovement).length;
    const significantImprovements = metrics.filter(m => m.isSignificant && m.isImprovement).length;
    
    // Calculate weighted success score
    let weightedScore = 0;
    let totalWeight = 0;
    
    for (const improvement of metrics) {
      const metricScore = improvement.isImprovement ? 
        (improvement.isSignificant ? 1 : 0.5) : 0;
      
      weightedScore += metricScore * improvement.weight;
      totalWeight += improvement.weight;
    }
    
    const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    // Determine success category
    let category: string;
    if (normalizedScore >= 0.8) category = 'excellent';
    else if (normalizedScore >= 0.6) category = 'good';
    else if (normalizedScore >= 0.4) category = 'moderate';
    else if (normalizedScore >= 0.2) category = 'limited';
    else category = 'poor';

    return {
      score: normalizedScore,
      category,
      significantImprovements,
      improvementRate: improvedMetrics / totalMetrics,
      significanceRate: significantImprovements / totalMetrics
    };
  }

  /**
   * Generate success recommendations
   */
  generateSuccessRecommendations(
    improvements: Record<string, MetricImprovement>,
    analysis: StatisticalAnalysis
  ): SuccessRecommendation[] {
    const recommendations: SuccessRecommendation[] = [];

    // High-level recommendations based on overall success
    if (analysis.significanceRate && analysis.significanceRate < 0.3) {
      recommendations.push({
        type: 'measurement',
        priority: 'high',
        title: 'Extend Measurement Period',
        description: 'Low significance rate suggests more time needed to see meaningful improvements',
        actions: [
          'Continue measuring for additional 30 days',
          'Increase measurement frequency',
          'Verify implementation completeness'
        ]
      });
    }

    if (analysis.improvementRate && analysis.improvementRate < 0.5) {
      recommendations.push({
        type: 'implementation',
        priority: 'high',
        title: 'Review Implementation Effectiveness',
        description: 'Low improvement rate indicates implementation may need adjustment',
        actions: [
          'Review implementation against original plan',
          'Identify potential optimization opportunities',
          'Consider additional complementary improvements'
        ]
      });
    }

    // Metric-specific recommendations
    for (const [metricId, improvement] of Object.entries(improvements)) {
      if (!improvement.isImprovement) {
        recommendations.push({
          type: 'metric_specific',
          priority: 'medium',
          title: `Address ${improvement.metricName} Decline`,
          description: `${improvement.metricName} has declined by ${Math.abs(improvement.percentageChange).toFixed(1)}%`,
          metric: metricId,
          actions: [
            `Investigate causes of ${improvement.metricName} decline`,
            'Consider corrective measures',
            'Monitor closely for further changes'
          ]
        });
      } else if (improvement.isSignificant) {
        recommendations.push({
          type: 'amplification',
          priority: 'low',
          title: `Amplify ${improvement.metricName} Success`,
          description: `${improvement.metricName} improved significantly, consider scaling approach`,
          metric: metricId,
          actions: [
            'Document successful implementation approach',
            'Apply similar improvements to related areas',
            'Share learnings with team'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * Utility methods for data collection and calculation
   */
  async collectMetricValue(metricId: string): Promise<number> {
    // Simulate metric collection - in real implementation, this would integrate with actual systems
    const simulatedValues: Record<string, number> = {
      response_time: 220 + Math.random() * 50,
      throughput: 800 + Math.random() * 200,
      error_rate: 0.015 + Math.random() * 0.01,
      availability: 0.996 + Math.random() * 0.003,
      mttr: 350 + Math.random() * 100,
      user_satisfaction: 0.75 + Math.random() * 0.15,
      task_completion_rate: 0.82 + Math.random() * 0.1,
      deployment_frequency: 1.5 + Math.random() * 0.5,
      lead_time: 48 + Math.random() * 24,
      infrastructure_cost: 5000 + Math.random() * 1000
    };
    
    return simulatedValues[metricId] || 0;
  }

  async getHistoricalValues(metricId: string, timeWindowMs: number): Promise<number[]> {
    // Simulate historical data collection
    const values: number[] = [];
    const sampleCount = Math.floor(timeWindowMs / (24 * 60 * 60 * 1000)); // Daily samples
    
    for (let i = 0; i < sampleCount; i++) {
      const baseValue = await this.collectMetricValue(metricId);
      // Add some variation
      const variation = baseValue * (0.9 + Math.random() * 0.2);
      values.push(variation);
    }
    
    return values;
  }

  async getRecentValues(metricId: string, timeWindowMs: number): Promise<number[]> {
    // For demonstration, simulate post-improvement values
    const values = await this.getHistoricalValues(metricId, timeWindowMs);
    
    // Apply simulated improvement
    const improvementFactor = 0.85 + Math.random() * 0.3; // Random improvement
    const metricConfig = this.successMetrics[metricId];
    
    if (metricConfig?.target === 'decrease') {
      return values.map(v => v * improvementFactor);
    } else {
      return values.map(v => v * (2 - improvementFactor));
    }
  }

  calculateBaseline(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  calculateCurrentValue(values: number[]): number {
    if (values.length === 0) return 0;
    // Use recent average (last 30% of samples)
    const recentCount = Math.max(1, Math.floor(values.length * 0.3));
    const recentValues = values.slice(-recentCount);
    return recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
  }

  calculateConfidence(values: number[]): number {
    if (values.length < 3) return 0.5;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Higher confidence for lower variation
    return Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));
  }

  calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  calculateTrendProjection(improvement: MetricImprovement): TrendProjection {
    const currentChange = improvement.percentageChange / 100;
    const projectedImprovement = currentChange * 0.5; // Assume 50% continued improvement
    
    return {
      projectedImprovement: projectedImprovement * 100,
      confidence: improvement.confidenceScore * 0.7, // Lower confidence for projections
      assumptions: ['Current trend continues', 'No external factors change', 'Implementation remains effective']
    };
  }

  projectFutureValue(improvement: MetricImprovement, days: number): number {
    const dailyImprovement = improvement.percentageChange / 30; // Assume measurement over 30 days
    const projectedChange = dailyImprovement * days;
    
    return improvement.current * (1 + projectedChange / 100);
  }

  /**
   * Generate success report
   */
  async generateSuccessReport(evaluation: Evaluation): Promise<SuccessReport> {
    console.log('\n📄 Generating success report...\n');

    const report: SuccessReport = {
      title: 'Improvement Success Evaluation Report',
      timestamp: evaluation.timestamp,
      implementationId: evaluation.implementationId,
      executive_summary: {
        overall_success: evaluation.overallSuccess,
        key_findings: this.generateKeyFindings(evaluation),
        recommendations: evaluation.recommendations.slice(0, 5) // Top 5 recommendations
      },
      detailed_analysis: {
        metric_improvements: evaluation.improvements,
        statistical_analysis: evaluation.statisticalAnalysis,
        forecasts: evaluation.forecasts
      },
      appendix: {
        methodology: 'Baseline vs current measurement with statistical significance testing',
        measurement_period: `${this.metricsConfig.evaluationPeriod / (24 * 60 * 60 * 1000)} days`,
        confidence_level: this.metricsConfig.confidenceLevel
      }
    };

    // Save report
    try {
      const reportsDir = path.join(__dirname, '../reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `success-evaluation-${evaluation.implementationId}-${Date.now()}.json`;
      await fs.writeFile(
        path.join(reportsDir, filename),
        JSON.stringify(report, null, 2)
      );

      console.log(`📊 Success report generated: ${filename}`);
      return report;
    } catch (error: any) {
      console.error('❌ Failed to save success report:', error.message);
      throw error;
    }
  }

  generateKeyFindings(evaluation: Evaluation): string[] {
    const findings: string[] = [];
    const improvements = Object.values(evaluation.improvements);
    
    // Overall success finding
    const successCategory = evaluation.overallSuccess.category;
    findings.push(`Overall implementation success rated as "${successCategory}" with ${(evaluation.overallSuccess.score * 100).toFixed(1)}% effectiveness`);
    
    // Significant improvements finding
    if (evaluation.overallSuccess.significantImprovements > 0) {
      findings.push(`${evaluation.overallSuccess.significantImprovements} metrics showed statistically significant improvements`);
    }
    
    // Best performing metric
    const bestMetric = improvements
      .filter(m => m.isImprovement)
      .sort((a, b) => b.percentageChange - a.percentageChange)[0];
    
    if (bestMetric) {
      findings.push(`Best improvement: ${bestMetric.metricName} improved by ${bestMetric.percentageChange.toFixed(1)}%`);
    }
    
    // Concerning metrics
    const decliningMetrics = improvements.filter(m => !m.isImprovement && m.isSignificant);
    if (decliningMetrics.length > 0) {
      findings.push(`${decliningMetrics.length} metrics showed concerning declines requiring attention`);
    }

    return findings;
  }

  /**
   * Save metrics data
   */
  async saveMetricsData(): Promise<void> {
    try {
      // Save metrics history
      const historyData = {
        lastUpdated: new Date().toISOString(),
        baseline: Object.fromEntries(this.measurements.baseline),
        current: Object.fromEntries(this.measurements.current),
        trends: Object.fromEntries(this.measurements.trends)
      };

      const historyFile = path.join(__dirname, 'metrics-history.json');
      await fs.writeFile(historyFile, JSON.stringify(historyData, null, 2));

      // Save improvement tracking
      const trackingData = {
        lastUpdated: new Date().toISOString(),
        implementations: Object.fromEntries(this.improvementTracking.implementations),
        measurements: Object.fromEntries(this.improvementTracking.measurements),
        evaluations: Object.fromEntries(this.improvementTracking.evaluations)
      };

      const trackingFile = path.join(__dirname, 'improvement-tracking.json');
      await fs.writeFile(trackingFile, JSON.stringify(trackingData, null, 2));

      console.log('💾 Metrics data saved successfully');
    } catch (error: any) {
      console.error('❌ Failed to save metrics data:', error.message);
    }
  }

  /**
   * Get framework status
   */
  getFrameworkStatus(): {
    initialized: boolean;
    baselineMetrics: number;
    trackedImplementations: number;
    completedEvaluations: number;
    availableMetrics: number;
    lastUpdate: string;
  } {
    return {
      initialized: true,
      baselineMetrics: this.measurements.baseline.size,
      trackedImplementations: this.improvementTracking.implementations.size,
      completedEvaluations: this.improvementTracking.evaluations.size,
      availableMetrics: Object.keys(this.successMetrics).length,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Demonstration
if (require.main === module) {
  (async function demonstrateSuccessMetrics(): Promise<void> {
    const metrics = new SuccessMetrics();
    
    try {
      await metrics.initializeSuccessMetrics();
      
      // Simulate tracking an improvement
      const implementationDetails: ImplementationDetails = {
        title: 'API Response Time Optimization',
        category: 'performance',
        impact: 'user_experience',
        solutions: ['caching', 'database_optimization'],
        expectedMetrics: ['response_time', 'throughput', 'user_satisfaction']
      };

      console.log('\n🚀 Tracking improvement implementation...');
      const implementation = await metrics.trackImprovementImplementation('test_improvement_001', implementationDetails);
      
      // Simulate measuring success after implementation
      console.log('\n⏱️  Simulating measurement period...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause for demonstration
      
      console.log('\n📊 Measuring improvement success...');
      const evaluation = await metrics.measureImprovementSuccess('test_improvement_001');
      
      // Save data
      await metrics.saveMetricsData();
      
      console.log('\n🎉 Success Metrics demonstration completed');
      console.log(`📈 Overall success: ${(evaluation.overallSuccess.score * 100).toFixed(1)}%`);
    } catch (error) {
      console.error('❌ Demonstration failed:', error);
    }
  })().catch(console.error);
}