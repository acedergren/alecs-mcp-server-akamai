/**
 * Rule Tree Domain Type Definitions
 * 
 * Comprehensive type definitions for Akamai Property Manager Rule Trees
 */

/**
 * Core Rule Tree structure matching Akamai Property Manager API
 */
export interface RuleTreeRule {
  name: string;
  criteria?: RuleCriterion[];
  behaviors?: RuleBehavior[];
  children?: RuleTreeRule[];
  comments?: string;
  uuid?: string;
  templateUuid?: string;
  criteriaMustSatisfy?: 'all' | 'any';
}

/**
 * Rule Tree behavior configuration
 */
export interface RuleBehavior {
  name: string;
  options?: Record<string, unknown>;
  uuid?: string;
  templateUuid?: string;
}

/**
 * Rule Tree criterion for matching conditions
 */
export interface RuleCriterion {
  name: string;
  options?: Record<string, unknown>;
  uuid?: string;
  templateUuid?: string;
}

/**
 * Complete Rule Tree response from API
 */
export interface PropertyRules {
  rules: RuleTreeRule;
  ruleFormat: string;
  etag?: string;
  comments?: string;
  accountId?: string;
  contractId?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number;
}

/**
 * Rule Tree variables for dynamic configuration
 */
export interface RuleTreeVariable {
  name: string;
  value: string | number | boolean;
  description?: string;
  hidden?: boolean;
  sensitive?: boolean;
}

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  warnings: RuleValidationWarning[];
  suggestions: RuleOptimizationSuggestion[];
  performanceScore: number;
  complianceScore: number;
}

/**
 * Rule validation error
 */
export interface RuleValidationError {
  type: 'syntax' | 'logic' | 'reference' | 'compatibility';
  severity: 'critical' | 'error';
  path: string;
  message: string;
  fix?: string;
}

/**
 * Rule validation warning
 */
export interface RuleValidationWarning {
  type: 'performance' | 'security' | 'deprecated' | 'best-practice';
  severity: 'warning' | 'info';
  path: string;
  message: string;
  recommendation: string;
}

/**
 * Rule optimization suggestion
 */
export interface RuleOptimizationSuggestion {
  type: 'consolidation' | 'reordering' | 'caching' | 'security' | 'compression' | 'performance';
  impact: 'high' | 'medium' | 'low';
  path: string;
  description: string;
  implementation: string;
  estimatedImprovement?: string;
}

/**
 * Rule statistics
 */
export interface RuleStatistics {
  totalRules: number;
  totalBehaviors: number;
  totalCriteria: number;
  maxDepth: number;
  complexityScore: number;
  estimatedEvaluationTime: number;
}

/**
 * Rule template definition
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  variables: Record<string, RuleTemplateVariable>;
  ruleTree: RuleTreeRule;
  examples: RuleTemplateExample[];
  compatibility: {
    products: string[];
    ruleFormats: string[];
  };
  version?: string;
  author?: string;
  lastUpdated?: string;
  minRuleFormat?: string;
  requiredBehaviors?: string[];
}

/**
 * Template variable definition
 */
export interface RuleTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: string | number | boolean | unknown[] | Record<string, unknown>;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

/**
 * Template example
 */
export interface RuleTemplateExample {
  name: string;
  description: string;
  variables: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>;
}

/**
 * Rule merge options
 */
export interface RuleMergeOptions {
  strategy: 'merge' | 'override' | 'append';
  conflictResolution: 'source' | 'target' | 'manual';
  preserveOrder: boolean;
  validateResult: boolean;
}

/**
 * Rule merge conflict
 */
export interface RuleMergeConflict {
  path: string;
  type: 'behavior' | 'rule' | 'value';
  resolution: string;
  source?: any;
  target?: any;
}

/**
 * Rule merge result
 */
export interface RuleMergeResult {
  mergedRules: RuleTreeRule;
  conflicts: RuleMergeConflict[];
  rulesFromSource: number;
  rulesFromTarget: number;
  rulesAdded: number;
  conflictsResolved: number;
}

/**
 * Rule performance analysis
 */
export interface RulePerformanceAnalysis {
  overallScore: number;
  categories: {
    caching: PerformanceCategory;
    compression: PerformanceCategory;
    http2: PerformanceCategory;
    images: PerformanceCategory;
    mobile: PerformanceCategory;
  };
  criticalIssues: string[];
  recommendations: RuleOptimizationSuggestion[];
}

/**
 * Performance category analysis
 */
export interface PerformanceCategory {
  score: number;
  status: 'optimal' | 'good' | 'needs-improvement' | 'poor';
  findings: string[];
  improvements: string[];
}

/**
 * Rule conflict detection result
 */
export interface RuleConflict {
  type: 'BEHAVIOR_CONFLICT' | 'CRITERIA_CONFLICT' | 'ORDERING_ISSUE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  path1: string;
  path2: string;
  description: string;
  resolution: string;
}

/**
 * Rule dependency information
 */
export interface RuleDependency {
  behavior: string;
  requires: string[];
  conflicts: string[];
  recommendedOrder?: number;
}

/**
 * Bulk search request
 */
export interface BulkSearchRequest {
  bulkSearchQuery: {
    jsonPath: string;
  };
  network?: 'PRODUCTION' | 'STAGING' | 'LATEST';
  contractIds?: string[];
  groupIds?: string[];
}

/**
 * Bulk search result
 */
export interface BulkSearchResult {
  propertyId: string;
  propertyName: string;
  contractId: string;
  groupId: string;
  propertyVersion: number;
  matchLocations: string[];
}

/**
 * JSON Patch operation
 */
export interface JSONPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

/**
 * Domain validation challenge
 */
export interface DomainValidationChallenge {
  domain: string;
  method: 'HTTP' | 'DNS';
  token?: string;
  recordName?: string;
  recordValue?: string;
  path?: string;
}