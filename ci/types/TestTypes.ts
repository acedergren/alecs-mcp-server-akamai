/**
 * 🎯 TEST TYPE DEFINITIONS
 * Alex Rodriguez: "Strong types make strong tests!"
 */

export interface ToolAnalysis {
  name: string;
  description: string;
  schema: any;
  category: ToolCategory;
  requiredParams: string[];
  optionalParams: string[];
  exampleUsage: string[];
  riskLevel: RiskLevel;
  testComplexity: TestComplexity;
  lastModified: string;
  testDataSets?: TestDataSet[];
}

export type ToolCategory = 
  | 'property-management'
  | 'property-deployment'
  | 'dns-management'
  | 'certificate-management'
  | 'security-management'
  | 'content-management'
  | 'reporting'
  | 'general';

export type RiskLevel = 'low' | 'medium' | 'high';
export type TestComplexity = 'simple' | 'moderate' | 'complex';

export interface TestDataSet {
  name: string;
  description: string;
  data: Record<string, any>;
  expectedOutcome: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  priority: TestPriority;
  userIntent: string;
  expectedWorkflow: string[];
  validationCriteria: string[];
  testData: Record<string, any>;
  uxChecks?: UXCheck[];
}

export type TestCategory = 
  | 'happy-path' 
  | 'error-handling' 
  | 'edge-case' 
  | 'ux-validation' 
  | 'safety' 
  | 'performance';

export type TestPriority = 'low' | 'medium' | 'high' | 'critical';

export interface UXCheck {
  aspect: string;
  criterion: string;
  severity: 'minor' | 'major' | 'critical';
}

export interface TestSuite {
  toolName: string;
  category: ToolCategory;
  description: string;
  generatedAt: string;
  generatedBy: string;
  tests: TestCase[];
}

export interface ToolModification {
  toolName: string;
  changes: string[];
  changeDescription: string;
  oldAnalysis: ToolAnalysis;
  newAnalysis: ToolAnalysis;
}

export class DetectedChanges {
  newTools: ToolAnalysis[] = [];
  modifiedTools: ToolModification[] = [];
  removedTools: ToolAnalysis[] = [];
  detectionTime: number = 0;

  hasChanges(): boolean {
    return this.newTools.length > 0 || 
           this.modifiedTools.length > 0 || 
           this.removedTools.length > 0;
  }

  getTotalChangeCount(): number {
    return this.newTools.length + this.modifiedTools.length + this.removedTools.length;
  }

  getSummary(): string {
    const parts = [];
    if (this.newTools.length > 0) {
      parts.push(`${this.newTools.length} new`);
    }
    if (this.modifiedTools.length > 0) {
      parts.push(`${this.modifiedTools.length} modified`);
    }
    if (this.removedTools.length > 0) {
      parts.push(`${this.removedTools.length} removed`);
    }
    return parts.length > 0 ? parts.join(', ') + ' tools' : 'No changes';
  }
}

export interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  uxIssues?: UXIssue[];
  suggestions?: string[];
}

export interface UXIssue {
  severity: 'minor' | 'major' | 'critical';
  description: string;
  recommendation: string;
}

export interface TestSuiteResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  duration: number;
  testResults: TestResult[];
  uxIssues: UXIssue[];
  criticalIssues: CriticalIssue[];
  coverage: TestCoverage;
}

export interface CriticalIssue {
  toolName: string;
  issue: string;
  impact: string;
  recommendation: string;
}

export interface TestCoverage {
  totalTools: number;
  testedTools: number;
  coveragePercentage: number;
  untestablTools: string[];
  categoryCoverage: Record<ToolCategory, number>;
}

export interface ComprehensiveReport {
  summary: string;
  testResults: TestSuiteResults;
  detectedChanges: DetectedChanges;
  performance: PerformanceMetrics;
  recommendations: string[];
  alexCommentary: string;
  generatedAt: string;
}

export interface PerformanceMetrics {
  executionTime: number;
  testsPerSecond: number;
  changeDetectionTime: number;
}

export interface MCPCapabilities {
  tools: MCPTool[];
  resources: any[];
  prompts: any[];
  metadata: {
    discoveredAt: string;
    serverVersion: string;
    commitHash: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  analysis: ToolAnalysis;
}