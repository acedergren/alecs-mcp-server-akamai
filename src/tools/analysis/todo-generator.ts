/**
 * Smart TODO List Generator
 *
 * Generates actionable TODO items with priority categorization, effort estimation,
 * and dependency sequencing based on test analysis results.
 */

// Interfaces for type definitions
export interface PriorityConfig {
  weight: number;
  urgency: string;
  color: string;
}

export interface EffortEstimate {
  hours: number;
  confidence: number;
  label: string;
}

export interface TaskType {
  category: string;
  icon: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  effort: string;
  tags: string[];
  details: TodoDetails;
  effort_details?: EffortEstimate;
  priority_details?: PriorityConfig;
  type_details?: TaskType;
  createdAt?: string;
}

export interface TodoDetails {
  errorCount?: number;
  affectedTests?: string[];
  suggestedActions: string[];
  pattern?: string;
  occurrences?: number;
  cascadeType?: string;
  affectedCount?: number;
  affectedSuites?: string[];
  slowSuites?: Array<{ name: string; runtime: number }>;
  impactLevel?: string;
  factors?: string[];
  affectedFeatures?: string[];
  failureRate?: number;
  affectedSystems?: string[];
  recommendationType?: string;
  rootCause?: string;
}

export interface TodoMetadata {
  generatedAt: string;
  analysisSource: string;
  totalItems: number;
  estimatedTotalHours: number;
  criticalCount: number;
  highCount: number;
}

export interface TodoDependency {
  prerequisite: string;
  dependent: string;
  reason: string;
}

export interface TodoList {
  metadata: TodoMetadata;
  items: TodoItem[];
  priorityGroups: Record<string, TodoItem[]>;
  dependencies: TodoDependency[];
  recommendations: string[];
  quickWins: TodoItem[];
  longTermGoals: Array<TodoItem & { milestone: string; deliverables: string[] }>;
}

export interface GenerateOptions {
  // Add specific options here as needed
}

export interface ErrorItem {
  test?: string;
  suite?: string;
  severity?: string;
}

export interface ErrorAnalysis {
  categorizedErrors: Map<string, ErrorItem[]>;
  rootCauses: Map<string, number>;
}

export interface PatternItem {
  pattern: string;
  count: number;
  tests: string[];
}

export interface CascadeItem {
  type: string;
  count: number;
  affected: string[];
}

export interface SuiteItem {
  name: string;
  runtime: number;
}

export interface PatternAnalysis {
  repeatingFailures?: PatternItem[];
  cascadingFailures?: CascadeItem[];
  suitePatterns?: {
    slowestSuites?: SuiteItem[];
  };
}

export interface ImpactLevel {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors?: string[];
  affectedFeatures?: string[];
  customerFailureRate?: number;
  affectedSystems?: string[];
}

export interface ImpactAssessment {
  businessImpact: ImpactLevel;
  customerImpact: ImpactLevel;
  technicalImpact: ImpactLevel;
}

export interface Recommendations {
  immediate?: string[];
  shortTerm?: string[];
  longTerm?: string[];
  preventive?: string[];
}

export interface Trends {
  recommendations?: string[];
}

export interface AnalysisResults {
  errorAnalysis: ErrorAnalysis;
  patternAnalysis: PatternAnalysis;
  impactAssessment: ImpactAssessment;
  recommendations: Recommendations;
  trends: Trends;
}

export interface RootCauseConfig {
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  effort: string;
  actions: string[];
}

export class TodoGenerator {
  private readonly priorityMatrix: Record<string, PriorityConfig> = {
    CRITICAL: { weight: 100, urgency: 'immediate', color: '#FF0000' },
    HIGH: { weight: 75, urgency: 'within 24h', color: '#FF6600' },
    MEDIUM: { weight: 50, urgency: 'within week', color: '#FFAA00' },
    LOW: { weight: 25, urgency: 'within month', color: '#00AA00' },
  };

  private readonly effortEstimates: Record<string, EffortEstimate> = {
    quick_fix: { hours: 1, confidence: 0.9, label: 'Quick Fix' },
    simple: { hours: 4, confidence: 0.8, label: 'Simple Task' },
    moderate: { hours: 16, confidence: 0.7, label: 'Moderate Task' },
    complex: { hours: 40, confidence: 0.6, label: 'Complex Task' },
    major: { hours: 80, confidence: 0.4, label: 'Major Project' },
  };

  private readonly taskTypes: Record<string, TaskType> = {
    bug_fix: { category: 'Bug Fix', icon: '🐛' },
    configuration: { category: 'Configuration', icon: '⚙️' },
    infrastructure: { category: 'Infrastructure', icon: '🏗️' },
    security: { category: 'Security', icon: '🔒' },
    performance: { category: 'Performance', icon: '⚡' },
    testing: { category: 'Testing', icon: '🧪' },
    documentation: { category: 'Documentation', icon: '📚' },
    monitoring: { category: 'Monitoring', icon: '📊' },
    maintenance: { category: 'Maintenance', icon: '🔧' },
    improvement: { category: 'Improvement', icon: '✨' },
    enhancement: { category: 'Enhancement', icon: '🚀' },
  };

  /**
   * Generate comprehensive TODO list from test analysis
   */
  public generateTodoList(
    analysisResults: AnalysisResults,
    options: GenerateOptions = {},
  ): TodoList {
    const todos: TodoList = {
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisSource: 'test_output_analysis',
        totalItems: 0,
        estimatedTotalHours: 0,
        criticalCount: 0,
        highCount: 0,
      },
      items: [],
      priorityGroups: {},
      dependencies: [],
      recommendations: [],
      quickWins: [],
      longTermGoals: [],
    };

    // Generate TODO items from different analysis aspects
    this.generateErrorBasedTodos(analysisResults.errorAnalysis, todos);
    this.generatePatternBasedTodos(analysisResults.patternAnalysis, todos);
    this.generateImpactBasedTodos(analysisResults.impactAssessment, todos);
    this.generateRecommendationBasedTodos(analysisResults.recommendations, todos);
    this.generateTrendBasedTodos(analysisResults.trends, todos);

    // Process and organize todos
    this.processTodos(todos, options);
    this.identifyDependencies(todos);
    this.identifyQuickWins(todos);
    this.generateLongTermGoals(todos);

    return todos;
  }

  /**
   * Generate TODOs based on error analysis
   */
  private generateErrorBasedTodos(errorAnalysis: ErrorAnalysis, todos: TodoList): void {
    // Process categorized errors
    for (const [category, errors] of Array.from(errorAnalysis.categorizedErrors)) {
      const categoryTodos = this.generateCategoryTodos(category, errors);
      todos.items.push(...categoryTodos);
    }

    // Process root causes
    for (const [rootCause, count] of Array.from(errorAnalysis.rootCauses)) {
      if (count > 1) {
        const rootCauseTodo = this.generateRootCauseTodo(rootCause, count);
        if (rootCauseTodo) {
          todos.items.push(rootCauseTodo);
        }
      }
    }
  }

  /**
   * Generate TODOs for specific error categories
   */
  private generateCategoryTodos(category: string, errors: ErrorItem[]): TodoItem[] {
    const categoryTodos: TodoItem[] = [];
    const highestSeverity = this.getHighestSeverity(errors);

    switch (category) {
      case 'AUTH_ERROR':
        categoryTodos.push({
          id: `auth-fix-${Date.now()}`,
          title: 'Fix Authentication Configuration',
          description: `Resolve ${errors.length} authentication error(s) preventing test execution`,
          priority: 'CRITICAL',
          type: 'security',
          effort: 'simple',
          tags: ['authentication', 'security', 'blocker'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Verify .edgerc file exists and has correct permissions',
              'Check API credentials are valid and not expired',
              'Validate account-switch-key if using multi-customer setup',
              'Test authentication with a simple API call',
            ],
          },
        });
        break;

      case 'CONFIG_ERROR':
        categoryTodos.push({
          id: `config-fix-${Date.now()}`,
          title: 'Fix Configuration Issues',
          description: `Resolve ${errors.length} configuration error(s) affecting test environment`,
          priority: 'HIGH',
          type: 'configuration',
          effort: 'moderate',
          tags: ['configuration', 'environment', 'setup'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Review environment configuration files',
              'Validate all required environment variables are set',
              'Check file paths and permissions',
              'Verify service dependencies are available',
            ],
          },
        });
        break;

      case 'NETWORK_ERROR':
        categoryTodos.push({
          id: `network-fix-${Date.now()}`,
          title: 'Resolve Network Connectivity Issues',
          description: `Fix ${errors.length} network-related error(s) blocking API communication`,
          priority: 'HIGH',
          type: 'infrastructure',
          effort: 'moderate',
          tags: ['network', 'connectivity', 'infrastructure'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Check network connectivity to Akamai APIs',
              'Verify firewall and proxy settings',
              'Test DNS resolution for API endpoints',
              'Review timeout configurations',
            ],
          },
        });
        break;

      case 'API_ERROR':
        categoryTodos.push({
          id: `api-fix-${Date.now()}`,
          title: 'Fix API Integration Issues',
          description: `Resolve ${errors.length} API error(s) affecting service integration`,
          priority: this.mapSeverityToPriority(highestSeverity),
          type: 'bug_fix',
          effort: 'moderate',
          tags: ['api', 'integration', 'service'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Review API request/response formats',
              'Check API endpoint URLs and versions',
              'Validate request parameters and headers',
              'Implement proper error handling and retries',
            ],
          },
        });
        break;

      case 'VALIDATION_ERROR':
        categoryTodos.push({
          id: `validation-fix-${Date.now()}`,
          title: 'Fix Data Validation Issues',
          description: `Resolve ${errors.length} validation error(s) in request/response handling`,
          priority: 'MEDIUM',
          type: 'bug_fix',
          effort: 'simple',
          tags: ['validation', 'data', 'api'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Review data validation rules',
              'Check required vs optional parameters',
              'Validate data types and formats',
              'Update API request schemas',
            ],
          },
        });
        break;

      case 'TIMEOUT_ERROR':
        categoryTodos.push({
          id: `timeout-fix-${Date.now()}`,
          title: 'Optimize Test Performance',
          description: `Fix ${errors.length} timeout error(s) and improve test execution speed`,
          priority: 'MEDIUM',
          type: 'performance',
          effort: 'moderate',
          tags: ['performance', 'timeout', 'optimization'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Increase timeout values for slow operations',
              'Optimize API call efficiency',
              'Implement proper async/await patterns',
              'Add test parallelization where appropriate',
            ],
          },
        });
        break;

      case 'ASSERTION_ERROR':
        categoryTodos.push({
          id: `assertion-fix-${Date.now()}`,
          title: 'Fix Test Assertions',
          description: `Update ${errors.length} failing test assertion(s) to match expected behavior`,
          priority: 'MEDIUM',
          type: 'testing',
          effort: 'simple',
          tags: ['testing', 'assertions', 'expectations'],
          details: {
            errorCount: errors.length,
            affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
            suggestedActions: [
              'Review test expectations and assertions',
              'Update test data to match current API responses',
              'Fix flaky or unreliable test conditions',
              'Improve test isolation and cleanup',
            ],
          },
        });
        break;

      default:
        if (errors.length > 0) {
          categoryTodos.push({
            id: `generic-fix-${category}-${Date.now()}`,
            title: `Investigate ${category.replace('_', ' ').toLowerCase()} Issues`,
            description: `Analyze and resolve ${errors.length} ${category.toLowerCase()} error(s)`,
            priority: this.mapSeverityToPriority(highestSeverity),
            type: 'bug_fix',
            effort: 'moderate',
            tags: [category.toLowerCase(), 'investigation'],
            details: {
              errorCount: errors.length,
              affectedTests: errors.map((e) => e.test || e.suite || '').slice(0, 5),
              suggestedActions: [
                'Analyze error patterns and root causes',
                'Review related code and configurations',
                'Implement appropriate fixes',
                'Add tests to prevent regression',
              ],
            },
          });
        }
    }

    return categoryTodos;
  }

  /**
   * Generate TODO for root cause issues
   */
  private generateRootCauseTodo(rootCause: string, count: number): TodoItem | null {
    const rootCauseConfigs: Record<string, RootCauseConfig> = {
      configuration: {
        title: 'Improve Configuration Management',
        description: `Address ${count} configuration-related issues across multiple tests`,
        priority: 'HIGH',
        type: 'configuration',
        effort: 'complex',
        actions: [
          'Implement configuration validation',
          'Create configuration templates',
          'Add configuration health checks',
          'Document configuration requirements',
        ],
      },
      network: {
        title: 'Enhance Network Reliability',
        description: `Resolve ${count} network-related issues affecting test stability`,
        priority: 'HIGH',
        type: 'infrastructure',
        effort: 'complex',
        actions: [
          'Implement network retry mechanisms',
          'Add connection pooling',
          'Improve error handling for network failures',
          'Set up network monitoring',
        ],
      },
      authentication: {
        title: 'Strengthen Authentication Handling',
        description: `Fix ${count} authentication-related issues across test suite`,
        priority: 'CRITICAL',
        type: 'security',
        effort: 'moderate',
        actions: [
          'Implement robust credential management',
          'Add authentication retry logic',
          'Improve error messages for auth failures',
          'Set up credential validation checks',
        ],
      },
      validation: {
        title: 'Improve Data Validation',
        description: `Address ${count} validation issues in API interactions`,
        priority: 'MEDIUM',
        type: 'bug_fix',
        effort: 'moderate',
        actions: [
          'Implement comprehensive input validation',
          'Add schema validation for API requests',
          'Improve error handling for validation failures',
          'Create validation utility functions',
        ],
      },
    };

    const config = rootCauseConfigs[rootCause];
    if (!config) {
return null;
}

    return {
      id: `root-cause-${rootCause}-${Date.now()}`,
      title: config.title,
      description: config.description,
      priority: config.priority,
      type: config.type,
      effort: config.effort,
      tags: ['root-cause', rootCause, 'systemic'],
      details: {
        affectedCount: count,
        rootCause: rootCause,
        suggestedActions: config.actions,
      },
    };
  }

  /**
   * Generate TODOs based on pattern analysis
   */
  private generatePatternBasedTodos(patternAnalysis: PatternAnalysis, todos: TodoList): void {
    // Handle repeating failures
    if (patternAnalysis.repeatingFailures?.length) {
      patternAnalysis.repeatingFailures.forEach((pattern) => {
        if (pattern.count > 2) {
          todos.items.push({
            id: `pattern-fix-${Date.now()}`,
            title: 'Fix Repeating Test Pattern',
            description: `Resolve pattern appearing in ${pattern.count} different tests`,
            priority: pattern.count > 5 ? 'HIGH' : 'MEDIUM',
            type: 'testing',
            effort: 'moderate',
            tags: ['pattern', 'repetitive', 'stability'],
            details: {
              pattern: pattern.pattern,
              occurrences: pattern.count,
              affectedTests: pattern.tests.slice(0, 5),
              suggestedActions: [
                'Identify common root cause',
                'Create shared utility functions',
                'Implement pattern-specific error handling',
                'Add comprehensive logging',
              ],
            },
          });
        }
      });
    }

    // Handle cascading failures
    if (patternAnalysis.cascadingFailures?.length) {
      patternAnalysis.cascadingFailures.forEach((cascade) => {
        todos.items.push({
          id: `cascade-fix-${Date.now()}`,
          title: 'Fix Cascading Test Failures',
          description: `Resolve ${cascade.type} causing multiple downstream failures`,
          priority: 'HIGH',
          type: 'testing',
          effort: 'complex',
          tags: ['cascade', 'dependencies', 'setup'],
          details: {
            cascadeType: cascade.type,
            affectedCount: cascade.count,
            affectedSuites: cascade.affected,
            suggestedActions: [
              'Fix root cause in setup/teardown',
              'Improve test isolation',
              'Add proper error boundaries',
              'Implement graceful failure handling',
            ],
          },
        });
      });
    }

    // Handle suite patterns
    if (patternAnalysis.suitePatterns?.slowestSuites?.length) {
      const slowSuites = patternAnalysis.suitePatterns.slowestSuites.slice(0, 3);
      if (slowSuites.some((suite) => suite.runtime > 30000)) {
        todos.items.push({
          id: `performance-optimization-${Date.now()}`,
          title: 'Optimize Slow Test Suites',
          description: `Improve performance of ${slowSuites.length} slow-running test suites`,
          priority: 'MEDIUM',
          type: 'performance',
          effort: 'complex',
          tags: ['performance', 'optimization', 'runtime'],
          details: {
            slowSuites: slowSuites.map((s) => ({ name: s.name, runtime: s.runtime })),
            suggestedActions: [
              'Profile test execution bottlenecks',
              'Implement test parallelization',
              'Optimize setup and teardown processes',
              'Consider test data optimization',
            ],
          },
        });
      }
    }
  }

  /**
   * Generate TODOs based on impact assessment
   */
  private generateImpactBasedTodos(impactAssessment: ImpactAssessment, todos: TodoList): void {
    // Business impact todos
    if (impactAssessment.businessImpact.level === 'CRITICAL') {
      todos.items.push({
        id: `business-critical-${Date.now()}`,
        title: 'Address Critical Business Impact',
        description: 'Resolve issues with critical business impact immediately',
        priority: 'CRITICAL',
        type: 'bug_fix',
        effort: 'complex',
        tags: ['business-critical', 'urgent', 'stability'],
        details: {
          impactLevel: impactAssessment.businessImpact.level,
          factors: impactAssessment.businessImpact.factors || [],
          suggestedActions: [
            'Identify and fix critical system failures',
            'Implement emergency rollback procedures',
            'Set up immediate monitoring and alerting',
            'Conduct post-incident review',
          ],
        },
      });
    }

    // Customer impact todos
    if (impactAssessment.customerImpact.level !== 'LOW') {
      todos.items.push({
        id: `customer-impact-${Date.now()}`,
        title: 'Minimize Customer Impact',
        description: `Address ${impactAssessment.customerImpact.level.toLowerCase()} customer impact issues`,
        priority: impactAssessment.customerImpact.level,
        type: 'bug_fix',
        effort: 'moderate',
        tags: ['customer-facing', 'user-experience'],
        details: {
          impactLevel: impactAssessment.customerImpact.level,
          affectedFeatures: impactAssessment.customerImpact.affectedFeatures || [],
          failureRate: impactAssessment.customerImpact.customerFailureRate,
          suggestedActions: [
            'Prioritize customer-facing functionality fixes',
            'Implement graceful degradation',
            'Add customer impact monitoring',
            'Prepare customer communication if needed',
          ],
        },
      });
    }

    // Technical impact todos
    if (impactAssessment.technicalImpact.level !== 'LOW') {
      todos.items.push({
        id: `technical-impact-${Date.now()}`,
        title: 'Resolve Technical Infrastructure Issues',
        description: `Fix ${impactAssessment.technicalImpact.level.toLowerCase()} technical impact issues`,
        priority: impactAssessment.technicalImpact.level,
        type: 'infrastructure',
        effort: 'complex',
        tags: ['infrastructure', 'technical', 'systems'],
        details: {
          impactLevel: impactAssessment.technicalImpact.level,
          affectedSystems: impactAssessment.technicalImpact.affectedSystems || [],
          suggestedActions: [
            'Address infrastructure configuration issues',
            'Improve system reliability and resilience',
            'Implement comprehensive monitoring',
            'Plan system architecture improvements',
          ],
        },
      });
    }
  }

  /**
   * Generate TODOs based on recommendations
   */
  private generateRecommendationBasedTodos(
    recommendations: Recommendations,
    todos: TodoList,
  ): void {
    // Immediate recommendations
    recommendations.immediate?.forEach((rec, index) => {
      todos.items.push({
        id: `immediate-${Date.now()}-${index}`,
        title: `Immediate Action: ${rec}`,
        description: rec,
        priority: 'CRITICAL',
        type: 'bug_fix',
        effort: 'simple',
        tags: ['immediate', 'critical', 'action-required'],
        details: {
          recommendationType: 'immediate',
          suggestedActions: [rec],
        },
      });
    });

    // Short-term recommendations
    recommendations.shortTerm?.forEach((rec, index) => {
      todos.items.push({
        id: `short-term-${Date.now()}-${index}`,
        title: `Short-term Improvement: ${rec}`,
        description: rec,
        priority: 'HIGH',
        type: 'improvement',
        effort: 'moderate',
        tags: ['short-term', 'improvement', 'stability'],
        details: {
          recommendationType: 'short-term',
          suggestedActions: [rec],
        },
      });
    });

    // Long-term recommendations
    recommendations.longTerm?.forEach((rec, index) => {
      todos.items.push({
        id: `long-term-${Date.now()}-${index}`,
        title: `Long-term Goal: ${rec}`,
        description: rec,
        priority: 'MEDIUM',
        type: 'enhancement',
        effort: 'major',
        tags: ['long-term', 'strategic', 'enhancement'],
        details: {
          recommendationType: 'long-term',
          suggestedActions: [rec],
        },
      });
    });

    // Preventive recommendations
    recommendations.preventive?.forEach((rec, index) => {
      todos.items.push({
        id: `preventive-${Date.now()}-${index}`,
        title: `Preventive Measure: ${rec}`,
        description: rec,
        priority: 'LOW',
        type: 'monitoring',
        effort: 'moderate',
        tags: ['preventive', 'monitoring', 'proactive'],
        details: {
          recommendationType: 'preventive',
          suggestedActions: [rec],
        },
      });
    });
  }

  /**
   * Generate TODOs based on trend analysis
   */
  private generateTrendBasedTodos(trends: Trends, todos: TodoList): void {
    if (trends.recommendations?.length) {
      trends.recommendations.forEach((rec, index) => {
        todos.items.push({
          id: `trend-${Date.now()}-${index}`,
          title: `Trend Analysis: ${rec}`,
          description: rec,
          priority: 'LOW',
          type: 'monitoring',
          effort: 'moderate',
          tags: ['trends', 'analysis', 'metrics'],
          details: {
            recommendationType: 'trend-based',
            suggestedActions: [rec],
          },
        });
      });
    }
  }

  /**
   * Process and organize todos
   */
  private processTodos(todos: TodoList, options: GenerateOptions): void {
    // Remove duplicates
    todos.items = this.removeDuplicateTodos(todos.items);

    // Sort by priority and then by effort
    todos.items.sort((a, b) => {
      const priorityDiff =
        this.priorityMatrix[b.priority].weight - this.priorityMatrix[a.priority].weight;
      if (priorityDiff !== 0) {
return priorityDiff;
}

      return this.effortEstimates[a.effort].hours - this.effortEstimates[b.effort].hours;
    });

    // Add metadata
    todos.metadata.totalItems = todos.items.length;
    todos.metadata.estimatedTotalHours = todos.items.reduce(
      (sum, item) => sum + this.effortEstimates[item.effort].hours,
      0,
    );
    todos.metadata.criticalCount = todos.items.filter(
      (item) => item.priority === 'CRITICAL',
    ).length;
    todos.metadata.highCount = todos.items.filter((item) => item.priority === 'HIGH').length;

    // Group by priority
    todos.priorityGroups = this.groupTodosByPriority(todos.items);

    // Add effort and timeline information
    todos.items.forEach((item) => {
      item.effort_details = this.effortEstimates[item.effort];
      item.priority_details = this.priorityMatrix[item.priority];
      item.type_details = this.taskTypes[item.type];
      item.createdAt = new Date().toISOString();
    });
  }

  /**
   * Remove duplicate todos
   */
  private removeDuplicateTodos(items: TodoItem[]): TodoItem[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.title}-${item.type}-${item.priority}`;
      if (seen.has(key)) {
return false;
}
      seen.add(key);
      return true;
    });
  }

  /**
   * Group todos by priority
   */
  private groupTodosByPriority(items: TodoItem[]): Record<string, TodoItem[]> {
    const groups: Record<string, TodoItem[]> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };

    items.forEach((item) => {
      if (groups[item.priority]) {
        groups[item.priority].push(item);
      }
    });

    return groups;
  }

  /**
   * Identify dependencies between todos
   */
  private identifyDependencies(todos: TodoList): void {
    const dependencies: TodoDependency[] = [];

    // Configuration fixes should come before other fixes
    const configTodos = todos.items.filter((item) => item.type === 'configuration');
    const otherTodos = todos.items.filter((item) => item.type !== 'configuration');

    configTodos.forEach((configTodo) => {
      otherTodos.forEach((otherTodo) => {
        if (this.hasDependency(configTodo, otherTodo)) {
          dependencies.push({
            prerequisite: configTodo.id,
            dependent: otherTodo.id,
            reason: 'Configuration must be fixed before other issues can be resolved',
          });
        }
      });
    });

    // Authentication fixes should come before API fixes
    const authTodos = todos.items.filter((item) => item.tags?.includes('authentication'));
    const apiTodos = todos.items.filter((item) => item.tags?.includes('api'));

    authTodos.forEach((authTodo) => {
      apiTodos.forEach((apiTodo) => {
        dependencies.push({
          prerequisite: authTodo.id,
          dependent: apiTodo.id,
          reason: 'Authentication must work before API calls can succeed',
        });
      });
    });

    todos.dependencies = dependencies;
  }

  /**
   * Check if one todo depends on another
   */
  private hasDependency(prerequisite: TodoItem, dependent: TodoItem): boolean {
    interface DependencyRule {
      prereq: string;
      dep: string[];
    }

    const dependencyRules: DependencyRule[] = [
      { prereq: 'configuration', dep: ['bug_fix', 'testing', 'performance'] },
      { prereq: 'security', dep: ['bug_fix', 'testing'] },
      { prereq: 'infrastructure', dep: ['performance', 'testing'] },
    ];

    return dependencyRules.some(
      (rule) => prerequisite.type === rule.prereq && rule.dep.includes(dependent.type),
    );
  }

  /**
   * Identify quick wins
   */
  private identifyQuickWins(todos: TodoList): void {
    todos.quickWins = todos.items
      .filter((item) => {
        const effort = this.effortEstimates[item.effort];
        const priority = this.priorityMatrix[item.priority];

        // Quick wins are low effort, high impact
        return effort.hours <= 4 && priority.weight >= 50;
      })
      .slice(0, 5);
  }

  /**
   * Generate long-term goals
   */
  private generateLongTermGoals(todos: TodoList): void {
    const longTermItems = todos.items.filter(
      (item) => item.effort === 'major' || item.tags?.includes('long-term'),
    );

    todos.longTermGoals = longTermItems.map((item) => ({
      ...item,
      milestone: this.generateMilestone(item),
      deliverables: this.generateDeliverables(item),
    }));
  }

  /**
   * Generate milestone for long-term goal
   */
  private generateMilestone(item: TodoItem): string {
    const milestones: Record<string, string> = {
      infrastructure: 'Stable and resilient infrastructure',
      monitoring: 'Comprehensive monitoring and alerting',
      testing: 'Robust and reliable test suite',
      performance: 'Optimized system performance',
      security: 'Enhanced security posture',
    };

    return milestones[item.type] || 'Improved system quality';
  }

  /**
   * Generate deliverables for long-term goal
   */
  private generateDeliverables(item: TodoItem): string[] {
    const baseDeliverables = item.details?.suggestedActions || [];
    return [
      ...baseDeliverables,
      'Documentation updates',
      'Test coverage improvements',
      'Monitoring and alerting setup',
    ];
  }

  /**
   * Get highest severity from error list
   */
  private getHighestSeverity(errors: ErrorItem[]): string {
    const severities = errors.map((e) => e.severity || 'LOW');
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const severity of severityOrder) {
      if (severities.includes(severity)) {
        return severity;
      }
    }
    return 'LOW';
  }

  /**
   * Map severity to priority
   */
  private mapSeverityToPriority(severity: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const mapping: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
    };
    return mapping[severity] || 'LOW';
  }

  /**
   * Export todos in various formats
   */
  public exportTodos(todos: TodoList, format = 'json'): string {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(todos, null, 2);
      case 'markdown':
        return this.exportToMarkdown(todos);
      case 'csv':
        return this.exportToCSV(todos);
      case 'github':
        return this.exportToGitHubIssues(todos);
      default:
        return JSON.stringify(todos, null, 2);
    }
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(todos: TodoList): string {
    let markdown = `# TODO List - Generated ${new Date().toISOString()}\n\n`;

    markdown += '## Summary\n';
    markdown += `- **Total Items**: ${todos.metadata.totalItems}\n`;
    markdown += `- **Critical**: ${todos.metadata.criticalCount}\n`;
    markdown += `- **High Priority**: ${todos.metadata.highCount}\n`;
    markdown += `- **Estimated Hours**: ${todos.metadata.estimatedTotalHours}\n\n`;

    // Quick Wins
    if (todos.quickWins.length > 0) {
      markdown += '## 🚀 Quick Wins\n\n';
      todos.quickWins.forEach((item) => {
        markdown += `- **${item.title}** (${item.effort_details?.hours}h) - ${item.description}\n`;
      });
      markdown += '\n';
    }

    // By Priority
    Object.entries(todos.priorityGroups).forEach(([priority, items]) => {
      if (items.length > 0) {
        const emoji =
          priority === 'CRITICAL'
            ? '🚨'
            : priority === 'HIGH'
              ? '⚠️'
              : priority === 'MEDIUM'
                ? '📋'
                : '📝';
        markdown += `## ${emoji} ${priority} Priority\n\n`;

        items.forEach((item) => {
          markdown += `### ${item.type_details?.icon} ${item.title}\n`;
          markdown += `**Priority**: ${item.priority} | **Effort**: ${item.effort_details?.label} (${item.effort_details?.hours}h) | **Type**: ${item.type_details?.category}\n\n`;
          markdown += `${item.description}\n\n`;

          if (item.details?.suggestedActions) {
            markdown += '**Suggested Actions**:\n';
            item.details.suggestedActions.forEach((action) => {
              markdown += `- ${action}\n`;
            });
            markdown += '\n';
          }

          if (item.tags?.length > 0) {
            markdown += `**Tags**: ${item.tags.map((tag) => `\`${tag}\``).join(', ')}\n\n`;
          }

          markdown += '---\n\n';
        });
      }
    });

    return markdown;
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(todos: TodoList): string {
    const headers = ['ID', 'Title', 'Priority', 'Type', 'Effort (hours)', 'Description', 'Tags'];
    const rows = [headers.join(',')];

    todos.items.forEach((item) => {
      const row = [
        item.id,
        `"${item.title}"`,
        item.priority,
        item.type_details?.category || '',
        item.effort_details?.hours || '',
        `"${item.description}"`,
        `"${item.tags?.join(';') || ''}"`,
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Export to GitHub Issues format
   */
  private exportToGitHubIssues(todos: TodoList): string {
    interface GitHubIssue {
      title: string;
      body: string;
      labels: string[];
    }

    const issues: GitHubIssue[] = todos.items.map((item) => ({
      title: `${item.type_details?.icon} ${item.title}`,
      body: this.generateGitHubIssueBody(item),
      labels: this.generateGitHubLabels(item),
    }));

    return JSON.stringify(issues, null, 2);
  }

  /**
   * Generate GitHub issue body
   */
  private generateGitHubIssueBody(item: TodoItem): string {
    let body = `## Description\n${item.description}\n\n`;

    body += '## Details\n';
    body += `- **Priority**: ${item.priority}\n`;
    body += `- **Type**: ${item.type_details?.category}\n`;
    body += `- **Estimated Effort**: ${item.effort_details?.label} (${item.effort_details?.hours} hours)\n`;
    body += `- **Confidence**: ${((item.effort_details?.confidence || 0) * 100).toFixed(0)}%\n\n`;

    if (item.details?.suggestedActions) {
      body += '## Suggested Actions\n';
      item.details.suggestedActions.forEach((action) => {
        body += `- [ ] ${action}\n`;
      });
      body += '\n';
    }

    if (item.details?.affectedTests?.length) {
      body += '## Affected Tests\n';
      item.details.affectedTests.forEach((test) => {
        body += `- ${test}\n`;
      });
      body += '\n';
    }

    body += '## Generated Information\n';
    body += `- **Created**: ${item.createdAt}\n`;
    body += '- **Generator**: Intelligent Bug Analysis System\n';

    return body;
  }

  /**
   * Generate GitHub labels
   */
  private generateGitHubLabels(item: TodoItem): string[] {
    const labels = [
      `priority-${item.priority.toLowerCase()}`,
      `type-${item.type}`,
      `effort-${item.effort}`,
    ];

    if (item.tags) {
      labels.push(...item.tags.map((tag) => `tag-${tag}`));
    }

    return labels;
  }
}

export default TodoGenerator;
