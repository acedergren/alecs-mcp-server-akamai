/**
 * Improvement Tools Module
 * Exports all improvement-related classes and types for easy importing
 */

// Import and export classes
import { AutoRecommender } from './auto-recommender';
import { PatternAnalyzer } from './pattern-analyzer';
import { SuccessMetrics } from './success-metrics';

export { AutoRecommender, PatternAnalyzer, SuccessMetrics };

// Import types that are needed
import type {
  SystemState,
  Recommendation,
  RecommendationReport,
  GenerationOptions,
  ImplementationRoadmap,
  RecommendationMetrics
} from './auto-recommender';

import type {
  Pattern,
  Dataset,
  Analysis,
  AnalysisOptions,
  ActionableInsight,
  AnalysisMetrics
} from './pattern-analyzer';

import type {
  Implementation,
  ImplementationDetails,
  Evaluation,
  MetricImprovement,
  OverallSuccess,
  SuccessRecommendation,
  StatisticalAnalysis,
  Forecast
} from './success-metrics';

// Re-export types
export type {
  Recommendation,
  RecommendationReport,
  SystemState,
  GenerationOptions,
  ImplementationRoadmap,
  RecommendationMetrics,
  Pattern,
  Dataset,
  Analysis,
  AnalysisOptions,
  ActionableInsight,
  AnalysisMetrics,
  Implementation,
  ImplementationDetails,
  Evaluation,
  MetricImprovement,
  OverallSuccess,
  SuccessRecommendation,
  StatisticalAnalysis,
  Forecast
};

// Combined improvement suite for convenience
export class ImprovementSuite {
  readonly autoRecommender: AutoRecommender;
  readonly patternAnalyzer: PatternAnalyzer;
  readonly successMetrics: SuccessMetrics;

  constructor() {
    this.autoRecommender = new AutoRecommender();
    this.patternAnalyzer = new PatternAnalyzer();
    this.successMetrics = new SuccessMetrics();
  }

  /**
   * Initialize all improvement tools
   */
  async initialize(): Promise<void> {
    console.log('\n🚀 Initializing Complete Improvement Suite');
    console.log('==========================================\n');

    await Promise.all([
      this.autoRecommender.initializeAutoRecommender(),
      this.patternAnalyzer.initializePatternAnalyzer(),
      this.successMetrics.initializeSuccessMetrics()
    ]);

    console.log('\n✅ All improvement tools initialized successfully');
  }

  /**
   * Run complete improvement cycle
   */
  async runImprovementCycle(options: {
    analysisTimeWindow?: 'short' | 'medium' | 'long';
    maxRecommendations?: number;
    trackImplementation?: boolean;
  } = {}): Promise<{
    patterns: Analysis;
    recommendations: RecommendationReport;
    status: {
      patternAnalyzer: any;
      autoRecommender: any;
      successMetrics: any;
    };
  }> {
    console.log('\n🔄 Running Complete Improvement Cycle');
    console.log('=====================================\n');

    // Step 1: Analyze patterns
    const patterns = await this.patternAnalyzer.runPatternAnalysis(
      options.analysisTimeWindow || 'medium'
    );

    // Step 2: Generate recommendations based on patterns
    const systemMetrics = this.extractSystemMetrics(patterns);
    const recommendations = await this.autoRecommender.generateRecommendations(
      patterns.insights,
      systemMetrics,
      { maxRecommendations: options.maxRecommendations }
    );

    // Step 3: Track implementation if requested
    if (options.trackImplementation && recommendations.recommendations.length > 0) {
      const topRecommendation = recommendations.recommendations[0];
      await this.successMetrics.trackImprovementImplementation(
        topRecommendation.id || 'demo_implementation',
        {
          title: topRecommendation.title,
          category: topRecommendation.category,
          impact: topRecommendation.impact,
          solutions: topRecommendation.solutions
        }
      );
    }

    // Get status from all tools
    const status = {
      patternAnalyzer: this.patternAnalyzer.getAnalyzerStatus(),
      autoRecommender: this.autoRecommender.getRecommendationStatus(),
      successMetrics: this.successMetrics.getFrameworkStatus()
    };

    return { patterns, recommendations, status };
  }

  /**
   * Extract system metrics from pattern analysis
   */
  private extractSystemMetrics(analysis: Analysis): Partial<SystemState> {
    // Extract relevant metrics from pattern analysis
    // This is a simplified implementation - in production, this would
    // parse actual metrics from the patterns
    return {
      performance: {
        responseTime: 250,
        throughput: 800,
        errorRate: 0.02,
        cpuUsage: 0.65,
        memoryUsage: 0.70
      },
      reliability: {
        availability: 0.995,
        mttr: 400,
        mtbf: 86400,
        errorRecoveryRate: 0.95
      }
    };
  }
}

// Export default instance for convenience
export default new ImprovementSuite();