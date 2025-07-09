/**
 * Property Manager Billing & Cost Analysis - Template-Based Generation
 * 
 * PHASE 2.2b: Implementing 8+ Billing & Cost Analysis Endpoints
 * 
 * This implements comprehensive billing analysis and cost optimization
 * tools for Property Manager using intelligent templates for financial
 * insights and cost management across multiple customer accounts.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse 
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * Billing & Cost Analysis Schemas
 */
const BillingPeriodSchema = CustomerSchema.extend({
  billingPeriod: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)')
  }),
  currency: z.enum(['USD', 'EUR', 'GBP', 'JPY']).default('USD').describe('Currency for cost reporting'),
  includeEstimates: z.boolean().default(true).describe('Include estimated costs for current period')
});

const PropertyCostAnalysisSchema = CustomerSchema.extend({
  propertyIds: z.array(z.string()).optional().describe('Specific property IDs to analyze (all if not specified)'),
  billingPeriod: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  groupBy: z.enum(['property', 'contract', 'product', 'cpcode']).default('property'),
  includeTrafficMetrics: z.boolean().default(true),
  includeBandwidthCosts: z.boolean().default(true),
  includeRequestCosts: z.boolean().default(true),
  includeStorageCosts: z.boolean().default(false)
});

const UsageOptimizationSchema = CustomerSchema.extend({
  analysisType: z.enum(['bandwidth', 'requests', 'storage', 'features']).describe('Type of usage to optimize'),
  timeRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  threshold: z.object({
    highUsagePercent: z.number().min(50).max(100).default(80).describe('Threshold for high usage alert'),
    lowUsagePercent: z.number().min(0).max(50).default(20).describe('Threshold for low usage alert')
  }),
  includeRecommendations: z.boolean().default(true)
});

const CostForecastSchema = CustomerSchema.extend({
  forecastPeriod: z.object({
    months: z.number().int().min(1).max(12).default(3).describe('Number of months to forecast')
  }),
  basedOnPeriod: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).describe('Historical period to base forecast on'),
  growthAssumptions: z.object({
    trafficGrowthPercent: z.number().min(-50).max(200).default(10),
    newPropertiesCount: z.number().int().min(0).default(0),
    featureUpgrades: z.array(z.string()).optional()
  }).optional(),
  includeSeasonality: z.boolean().default(true),
  confidenceLevel: z.enum(['low', 'medium', 'high']).default('medium')
});

const BillingAlertsSchema = CustomerSchema.extend({
  alertType: z.enum(['budget_threshold', 'usage_spike', 'cost_anomaly', 'billing_discrepancy']),
  thresholds: z.object({
    budgetLimit: z.number().positive().optional().describe('Monthly budget limit'),
    usageIncreasePercent: z.number().min(0).max(1000).default(50).describe('Usage increase threshold'),
    costVariancePercent: z.number().min(0).max(100).default(25).describe('Cost variance threshold')
  }),
  notificationSettings: z.object({
    emailAddresses: z.array(z.string().email()).min(1),
    slackWebhook: z.string().url().optional(),
    frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate')
  })
});

/**
 * Billing & Cost Analysis Template Generator
 */
export class BillingCostAnalysisTemplate {
  private client: AkamaiClient;

  constructor(client: AkamaiClient) {
    this.client = client;
  }

  /**
   * BILLING REPORTS & ANALYSIS
   */
  
  async getBillingUsageReport(args: z.infer<typeof BillingPeriodSchema>): Promise<MCPToolResponse> {
    try {
      const params = BillingPeriodSchema.parse(args);

      // Get billing usage data from PAPI/reporting endpoints
      const usageResponse = await this.client.request({
        path: '/billing/v2/reports/usage',
        method: 'GET',
        queryParams: {
          startDate: params.billingPeriod.startDate,
          endDate: params.billingPeriod.endDate,
          currency: params.currency,
          includeEstimates: String(params.includeEstimates)
        }
      });

      const usage = usageResponse as any;
      
      // Process billing data into structured format
      const billingAnalysis = await this.analyzeBillingData(usage, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Billing usage report generated successfully',
            billingPeriod: params.billingPeriod,
            currency: params.currency,
            summary: {
              totalCost: billingAnalysis.totalCost,
              bandwidth: billingAnalysis.bandwidth,
              requests: billingAnalysis.requests,
              features: billingAnalysis.features,
              estimatedCurrentMonth: billingAnalysis.estimatedCurrentMonth
            },
            breakdown: {
              byContract: billingAnalysis.byContract,
              byProduct: billingAnalysis.byProduct,
              byRegion: billingAnalysis.byRegion
            },
            trends: {
              monthOverMonth: billingAnalysis.monthOverMonth,
              yearOverYear: billingAnalysis.yearOverYear
            },
            nextSteps: [
              'Analyze cost drivers with property.billing.cost-analysis',
              'Set up budget alerts with property.billing.alerts.configure',
              'Review optimization opportunities'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error generating billing usage report: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
  }

  async getPropertyCostAnalysis(args: z.infer<typeof PropertyCostAnalysisSchema>): Promise<MCPToolResponse> {
    try {
      const params = PropertyCostAnalysisSchema.parse(args);

      // Get detailed property cost data
      const costData = await this.client.request({
        path: '/papi/v1/properties/cost-analysis',
        method: 'POST',
        body: {
          propertyIds: params.propertyIds,
          billingPeriod: params.billingPeriod,
          groupBy: params.groupBy,
          includeMetrics: {
            traffic: params.includeTrafficMetrics,
            bandwidth: params.includeBandwidthCosts,
            requests: params.includeRequestCosts,
            storage: params.includeStorageCosts
          }
        }
      });

      const analysis = costData as any;
      const costBreakdown = await this.generateCostBreakdown(analysis, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Property cost analysis completed successfully',
            analysisScope: {
              propertiesAnalyzed: params.propertyIds?.length || 'all',
              billingPeriod: params.billingPeriod,
              groupBy: params.groupBy
            },
            costBreakdown: {
              totalCost: costBreakdown.totalCost,
              averageCostPerProperty: costBreakdown.averageCostPerProperty,
              highestCostProperty: costBreakdown.highestCostProperty,
              lowestCostProperty: costBreakdown.lowestCostProperty
            },
            costDrivers: {
              bandwidth: {
                cost: costBreakdown.bandwidth.cost,
                percentage: costBreakdown.bandwidth.percentage,
                volume: costBreakdown.bandwidth.volume
              },
              requests: {
                cost: costBreakdown.requests.cost,
                percentage: costBreakdown.requests.percentage,
                volume: costBreakdown.requests.volume
              },
              features: {
                cost: costBreakdown.features.cost,
                percentage: costBreakdown.features.percentage,
                activeFeatures: costBreakdown.features.activeFeatures
              }
            },
            recommendations: costBreakdown.recommendations,
            detailedBreakdown: analysis
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error performing property cost analysis: ${error.message}`
        }]
      };
    }
  }

  async getUsageOptimizationReport(args: z.infer<typeof UsageOptimizationSchema>): Promise<MCPToolResponse> {
    try {
      const params = UsageOptimizationSchema.parse(args);

      // Analyze usage patterns and identify optimization opportunities
      const usageData = await this.client.request({
        path: `/reporting/v1/reports/usage-optimization/${params.analysisType}`,
        method: 'GET',
        queryParams: {
          startDate: params.timeRange.startDate,
          endDate: params.timeRange.endDate,
          highThreshold: String(params.threshold.highUsagePercent),
          lowThreshold: String(params.threshold.lowUsagePercent)
        }
      });

      const optimization = await this.generateOptimizationAnalysis(usageData as any, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Usage optimization analysis completed successfully',
            analysisType: params.analysisType,
            timeRange: params.timeRange,
            findings: {
              overutilizedResources: optimization.overutilized,
              underutilizedResources: optimization.underutilized,
              rightsizedResources: optimization.rightsized,
              potentialSavings: optimization.potentialSavings
            },
            recommendations: params.includeRecommendations ? optimization.recommendations : [],
            actionItems: [
              {
                priority: 'high',
                action: 'Review overutilized resources',
                impact: 'Immediate cost reduction',
                resources: optimization.overutilized.length
              },
              {
                priority: 'medium', 
                action: 'Optimize underutilized resources',
                impact: 'Resource efficiency',
                resources: optimization.underutilized.length
              },
              {
                priority: 'low',
                action: 'Monitor rightsized resources',
                impact: 'Maintain efficiency',
                resources: optimization.rightsized.length
              }
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error generating usage optimization report: ${error.message}`
        }]
      };
    }
  }

  async generateCostForecast(args: z.infer<typeof CostForecastSchema>): Promise<MCPToolResponse> {
    try {
      const params = CostForecastSchema.parse(args);

      // Generate cost forecast based on historical data and growth assumptions
      const forecastData = await this.client.request({
        path: '/billing/v2/forecasting/cost-projections',
        method: 'POST',
        body: {
          forecastMonths: params.forecastPeriod.months,
          historicalPeriod: params.basedOnPeriod,
          growthAssumptions: params.growthAssumptions,
          includeSeasonality: params.includeSeasonality,
          confidenceLevel: params.confidenceLevel
        }
      });

      const forecast = await this.processForecastData(forecastData as any, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Cost forecast generated successfully',
            forecastPeriod: `${params.forecastPeriod.months} months`,
            basedOnPeriod: params.basedOnPeriod,
            confidenceLevel: params.confidenceLevel,
            projections: {
              totalForecastCost: forecast.totalCost,
              monthlyAverage: forecast.monthlyAverage,
              forecastAccuracy: forecast.accuracy,
              confidenceInterval: forecast.confidenceInterval
            },
            monthlyBreakdown: forecast.monthlyBreakdown,
            growthFactors: {
              trafficGrowth: params.growthAssumptions?.trafficGrowthPercent || 0,
              newProperties: params.growthAssumptions?.newPropertiesCount || 0,
              seasonalityImpact: forecast.seasonalityImpact
            },
            riskFactors: forecast.riskFactors,
            recommendations: [
              'Monitor actual costs against forecast monthly',
              'Adjust growth assumptions based on business changes',
              'Set up budget alerts based on forecast thresholds'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error generating cost forecast: ${error.message}`
        }]
      };
    }
  }

  async configureBillingAlerts(args: z.infer<typeof BillingAlertsSchema>): Promise<MCPToolResponse> {
    try {
      const params = BillingAlertsSchema.parse(args);

      // Configure billing alerts and notifications
      const alertConfig = await this.client.request({
        path: '/billing/v2/alerts/configurations',
        method: 'POST',
        body: {
          alertType: params.alertType,
          thresholds: params.thresholds,
          notifications: params.notificationSettings
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Billing alerts configured successfully',
            alertId: (alertConfig as any).alertId,
            alertType: params.alertType,
            configuration: {
              thresholds: params.thresholds,
              notifications: {
                emailCount: params.notificationSettings.emailAddresses.length,
                slackEnabled: !!params.notificationSettings.slackWebhook,
                frequency: params.notificationSettings.frequency
              }
            },
            status: 'active',
            nextSteps: [
              'Test alert configuration with property.billing.alerts.test',
              'Monitor alert activity in billing dashboard',
              'Adjust thresholds based on alert frequency'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error configuring billing alerts: ${error.message}`
        }]
      };
    }
  }

  /**
   * Helper methods for billing analysis
   */

  private async analyzeBillingData(usage: any, _params: any): Promise<any> {
    // Enterprise billing analysis logic
    return {
      totalCost: usage.totalCost || 0,
      bandwidth: {
        cost: usage.bandwidthCost || 0,
        volume: usage.bandwidthVolume || 0,
        unit: 'TB'
      },
      requests: {
        cost: usage.requestsCost || 0,
        volume: usage.requestsVolume || 0,
        unit: 'millions'
      },
      features: {
        cost: usage.featuresCost || 0,
        activeFeatures: usage.activeFeatures || []
      },
      estimatedCurrentMonth: usage.estimatedCurrentMonth || 0,
      byContract: usage.contractBreakdown || {},
      byProduct: usage.productBreakdown || {},
      byRegion: usage.regionBreakdown || {},
      monthOverMonth: usage.monthOverMonth || {},
      yearOverYear: usage.yearOverYear || {}
    };
  }

  private async generateCostBreakdown(analysis: any, _params: any): Promise<any> {
    const total = analysis.totalCost || 0;
    const properties = analysis.properties || [];
    
    return {
      totalCost: total,
      averageCostPerProperty: properties.length > 0 ? total / properties.length : 0,
      highestCostProperty: properties.reduce((max: any, prop: any) => 
        prop.cost > max.cost ? prop : max, { cost: 0, name: 'none' }),
      lowestCostProperty: properties.reduce((min: any, prop: any) => 
        prop.cost < min.cost ? prop : min, { cost: Infinity, name: 'none' }),
      bandwidth: {
        cost: analysis.bandwidthCost || 0,
        percentage: total > 0 ? Math.round((analysis.bandwidthCost / total) * 100) : 0,
        volume: analysis.bandwidthVolume || 0
      },
      requests: {
        cost: analysis.requestsCost || 0,
        percentage: total > 0 ? Math.round((analysis.requestsCost / total) * 100) : 0,
        volume: analysis.requestsVolume || 0
      },
      features: {
        cost: analysis.featuresCost || 0,
        percentage: total > 0 ? Math.round((analysis.featuresCost / total) * 100) : 0,
        activeFeatures: analysis.activeFeatures || []
      },
      recommendations: this.generateCostRecommendations(analysis)
    };
  }

  private async generateOptimizationAnalysis(usageData: any, params: any): Promise<any> {
    const resources = usageData.resources || [];
    const highThreshold = params.threshold.highUsagePercent;
    const lowThreshold = params.threshold.lowUsagePercent;

    const overutilized = resources.filter((r: any) => r.utilizationPercent > highThreshold);
    const underutilized = resources.filter((r: any) => r.utilizationPercent < lowThreshold);
    const rightsized = resources.filter((r: any) => 
      r.utilizationPercent >= lowThreshold && r.utilizationPercent <= highThreshold);

    return {
      overutilized,
      underutilized,
      rightsized,
      potentialSavings: this.calculatePotentialSavings(overutilized, underutilized),
      recommendations: this.generateOptimizationRecommendations(overutilized, underutilized)
    };
  }

  private async processForecastData(forecastData: any, _params: any): Promise<any> {
    return {
      totalCost: forecastData.projectedCost || 0,
      monthlyAverage: forecastData.monthlyAverage || 0,
      accuracy: forecastData.accuracy || 'medium',
      confidenceInterval: forecastData.confidenceInterval || {},
      monthlyBreakdown: forecastData.monthlyBreakdown || [],
      seasonalityImpact: forecastData.seasonalityImpact || 0,
      riskFactors: forecastData.riskFactors || []
    };
  }

  private generateCostRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (analysis.bandwidthCost > analysis.totalCost * 0.6) {
      recommendations.push('High bandwidth costs detected - consider optimizing content delivery');
    }
    
    if (analysis.requestsCost > analysis.totalCost * 0.4) {
      recommendations.push('High request costs detected - review caching strategies');
    }
    
    if (analysis.featuresCost > analysis.totalCost * 0.3) {
      recommendations.push('High feature costs detected - audit active features for necessity');
    }

    return recommendations;
  }

  private calculatePotentialSavings(overutilized: any[], underutilized: any[]): number {
    const overSavings = overutilized.reduce((sum, r) => sum + (r.cost * 0.15), 0); // 15% savings from right-sizing
    const underSavings = underutilized.reduce((sum, r) => sum + (r.cost * 0.25), 0); // 25% savings from optimization
    return overSavings + underSavings;
  }

  private generateOptimizationRecommendations(overutilized: any[], underutilized: any[]): string[] {
    const recommendations = [];
    
    if (overutilized.length > 0) {
      recommendations.push(`${overutilized.length} resources are overutilized - consider upgrading or load balancing`);
    }
    
    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} resources are underutilized - consider consolidation or downsizing`);
    }

    return recommendations;
  }

  /**
   * Get all billing & cost analysis tools (8 total)
   */
  getBillingCostAnalysisTools(): Record<string, any> {
    return {
      // Billing Reports (3 tools)
      'property.billing.usage-report': {
        description: 'Generate comprehensive billing usage report with cost breakdown',
        inputSchema: BillingPeriodSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getBillingUsageReport(args)
      },
      'property.billing.cost-analysis': {
        description: 'Analyze property costs with detailed breakdowns and trends',
        inputSchema: PropertyCostAnalysisSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getPropertyCostAnalysis(args)
      },
      'property.billing.invoice-details': {
        description: 'Get detailed invoice information and line items',
        inputSchema: BillingPeriodSchema.extend({
          invoiceId: z.string().optional().describe('Specific invoice ID to retrieve')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.getInvoiceDetails(args)
      },

      // Usage Optimization (2 tools)
      'property.billing.usage-optimization': {
        description: 'Analyze usage patterns and identify optimization opportunities',
        inputSchema: UsageOptimizationSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getUsageOptimizationReport(args)
      },
      'property.billing.rightsizing-recommendations': {
        description: 'Get resource rightsizing recommendations for cost optimization',
        inputSchema: CustomerSchema.extend({
          resourceType: z.enum(['bandwidth', 'storage', 'compute', 'features']).describe('Type of resource to analyze'),
          timeWindow: z.enum(['7d', '30d', '90d']).default('30d').describe('Analysis time window')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.getRightsizingRecommendations(args)
      },

      // Forecasting & Planning (2 tools)
      'property.billing.cost-forecast': {
        description: 'Generate cost forecasts based on historical usage and growth assumptions',
        inputSchema: CostForecastSchema,
        handler: async (_client: AkamaiClient, args: any) => this.generateCostForecast(args)
      },
      'property.billing.budget-planning': {
        description: 'Create budget plans and cost projections for financial planning',
        inputSchema: CustomerSchema.extend({
          planningPeriod: z.object({
            quarters: z.number().int().min(1).max(8).default(4).describe('Number of quarters to plan')
          }),
          budgetConstraints: z.object({
            maxQuarterlyBudget: z.number().positive().optional(),
            growthLimits: z.object({
              maxTrafficGrowth: z.number().min(0).max(100).default(25),
              maxCostGrowth: z.number().min(0).max(100).default(20)
            }).optional()
          }).optional()
        }),
        handler: async (_client: AkamaiClient, args: any) => this.createBudgetPlan(args)
      },

      // Alerts & Monitoring (1 tool)
      'property.billing.alerts.configure': {
        description: 'Configure billing alerts and cost monitoring notifications',
        inputSchema: BillingAlertsSchema,
        handler: async (_client: AkamaiClient, args: any) => this.configureBillingAlerts(args)
      }
    };
  }

  // Additional helper methods for the remaining tools
  private async getInvoiceDetails(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/billing/v2/invoices${args.invoiceId ? `/${args.invoiceId}` : ''}`,
        method: 'GET',
        queryParams: {
          startDate: args.billingPeriod?.startDate,
          endDate: args.billingPeriod?.endDate
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Invoice details retrieved successfully',
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving invoice details: ${error.message}`
        }]
      };
    }
  }

  private async getRightsizingRecommendations(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/optimization/v1/rightsizing/${args.resourceType}`,
        method: 'GET',
        queryParams: {
          timeWindow: args.timeWindow
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Rightsizing recommendations generated successfully',
            resourceType: args.resourceType,
            timeWindow: args.timeWindow,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error generating rightsizing recommendations: ${error.message}`
        }]
      };
    }
  }

  private async createBudgetPlan(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: '/billing/v2/budget-planning',
        method: 'POST',
        body: args
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Budget plan created successfully',
            planningPeriod: args.planningPeriod,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating budget plan: ${error.message}`
        }]
      };
    }
  }
}

/**
 * Export billing & cost analysis tools for ALECSCore integration
 */
export const billingCostAnalysisTools = (client: AkamaiClient) => 
  new BillingCostAnalysisTemplate(client).getBillingCostAnalysisTools();