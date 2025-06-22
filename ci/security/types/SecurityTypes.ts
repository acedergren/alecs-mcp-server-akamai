/**
 * Security Testing Type Definitions
 * Alex Rodriguez's Security Fortress Type System
 */

export interface SecurityTestResults {
  timestamp: string;
  testDuration: number;
  overallSecurityScore: number;
  criticalVulnerabilities: SecurityVulnerability[];
  highRiskIssues: SecurityIssue[];
  mediumRiskIssues: SecurityIssue[];
  complianceStatus: ComplianceStatus;
  penetrationTestResults: PenetrationTestResults;
  threatModelValidation: ThreatModelResults;
  recommendations: SecurityRecommendation[];
  alexSecurityAssessment: string;
}

export interface SecurityVulnerability {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: string;
  recommendation: string;
  testCase?: string;
  proof?: any;
}

export interface SecurityIssue {
  id: string;
  category: string;
  description: string;
  riskLevel: string;
  affectedComponents: string[];
  remediation: string;
}

export interface ComplianceStatus {
  [standard: string]: {
    compliant: boolean;
    score: number;
    failedControls: string[];
    passedControls: string[];
  };
}

export interface PenetrationTestResults {
  authenticationTests: AuthenticationTestResults;
  authorizationTests: TestResult;
  inputValidationTests: TestResult;
  sessionManagementTests: TestResult;
  dataProtectionTests: TestResult;
  communicationTests: TestResult;
  businessLogicTests: TestResult;
  overallScore: number;
}

export interface AuthenticationTestResults {
  edgeGridSecurity: TestResult;
  replayProtection: TestResult;
  bruteForceResistance: TestResult;
  sessionSecurity: TestResult;
  tokenSecurity: TestResult;
  overallAuthScore: number;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  score: number;
  vulnerabilities: SecurityVulnerability[];
  recommendation: string;
}

export interface ThreatModelResults {
  identifiedThreats: Threat[];
  attackVectors: AttackVector[];
  assetRisk: AssetValuation[];
  mitigationStrategies: MitigationStrategy[];
  riskMatrix: RiskMatrix;
}

export interface Threat {
  category: 'SPOOFING' | 'TAMPERING' | 'REPUDIATION' | 'INFORMATION_DISCLOSURE' | 'DENIAL_OF_SERVICE' | 'ELEVATION_OF_PRIVILEGE';
  id: string;
  title: string;
  description: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedAssets: string[];
  scenario: string;
  businessImpact: string;
  currentMitigations: string[];
  additionalMitigations: string[];
}

export interface AttackVector {
  id: string;
  name: string;
  description: string;
  entryPoints: string[];
  requiredCapabilities: string[];
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
}

export interface AssetValuation {
  assetName: string;
  assetType: string;
  businessValue: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  dataClassification: string;
  exposureLevel: string;
}

export interface MitigationStrategy {
  threatId: string;
  strategy: string;
  implementationCost: 'LOW' | 'MEDIUM' | 'HIGH';
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
  timeToImplement: string;
}

export interface RiskMatrix {
  critical: Threat[];
  high: Threat[];
  medium: Threat[];
  low: Threat[];
}

export interface ExploitResult {
  successful: boolean;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  evidence: any;
  businessImpact?: string;
  mitigation?: string;
}

export interface IsolationTestResults {
  crossCustomerDataAccess: ExploitResult;
  credentialLeakage: ExploitResult;
  contextSwitchingBypass: ExploitResult;
  sharedResourceAccess: ExploitResult;
  auditTrailContamination: ExploitResult;
  overallIsolationScore: number;
}

export interface VulnerabilityResults {
  staticAnalysis: StaticAnalysisResults;
  dynamicAnalysis: DynamicAnalysisResults;
  dependencyAnalysis: DependencyAnalysisResults;
  configurationAnalysis: ConfigurationAnalysisResults;
  secretsAnalysis: SecretsAnalysisResults;
  summary: VulnerabilitySummary;
}

export interface StaticAnalysisResults {
  vulnerabilities: Vulnerability[];
  codeQualityScore: number;
  securityScore: number;
  coverage: number;
}

export interface Vulnerability {
  type: string;
  severity: string;
  description: string;
  locations: CodeLocation[];
  recommendation: string;
  alexNote?: string;
}

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  context?: string;
}

export interface DynamicAnalysisResults {
  inputValidationSecurity: TestResult;
  memorySecurityLeaks: TestResult;
  concurrencySecurityIssues: TestResult;
  errorHandlingSecurity: TestResult;
  resourceSecurityLimits: TestResult;
  overallDynamicScore: number;
}

export interface DependencyAnalysisResults {
  dependencies: DependencyInfo[];
  vulnerableDependencies: VulnerableDependency[];
  outdatedDependencies: OutdatedDependency[];
  licenseIssues: LicenseIssue[];
  riskAssessment?: DependencyRiskAssessment;
}

export interface DependencyInfo {
  name: string;
  version: string;
  license: string;
  dependencies: string[];
}

export interface VulnerableDependency {
  name: string;
  version: string;
  vulnerabilities: string[];
  severity: string;
  fixedIn?: string;
}

export interface OutdatedDependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  versionsBehind: number;
}

export interface LicenseIssue {
  dependency: string;
  license: string;
  issue: string;
}

export interface DependencyRiskAssessment {
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  criticalDependencies: string[];
  recommendations: string[];
}

export interface ConfigurationAnalysisResults {
  insecureConfigurations: ConfigurationIssue[];
  missingSecurityHeaders: string[];
  weakCryptography: CryptographyIssue[];
  exposedEndpoints: ExposedEndpoint[];
}

export interface ConfigurationIssue {
  component: string;
  issue: string;
  severity: string;
  recommendation: string;
}

export interface CryptographyIssue {
  location: string;
  algorithm: string;
  issue: string;
  recommendation: string;
}

export interface ExposedEndpoint {
  endpoint: string;
  exposure: string;
  risk: string;
}

export interface SecretsAnalysisResults {
  exposedSecrets: ExposedSecret[];
  configurationIssues: ConfigurationIssue[];
  environmentSecurity: EnvironmentSecurityResults;
  overallSecretsScore: number;
}

export interface ExposedSecret {
  type: string;
  severity: string;
  location: string;
  line: number;
  context: string;
  masked: string;
  alexNote?: string;
}

export interface EnvironmentSecurityResults {
  productionSecrets: boolean;
  developmentSecrets: boolean;
  secretsRotation: boolean;
  secretsEncryption: boolean;
}

export interface VulnerabilitySummary {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topRisks: string[];
}

export interface SecurityReport {
  executiveSummary: string;
  criticalFindings: CriticalFinding[];
  riskAssessment: RiskAssessment;
  complianceStatus: ComplianceStatus;
  remediationPlan: RemediationPlan;
  alexSecurityVerdict: string;
  actionItems: ActionItem[];
  securityTrends: SecurityTrends;
}

export interface CriticalFinding {
  id: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM';
}

export interface RiskAssessment {
  overallRisk: string;
  riskScore: number;
  riskFactors: string[];
  mitigationProgress: number;
}

export interface RemediationPlan {
  immediate: RemediationItem[];
  shortTerm: RemediationItem[];
  mediumTerm: RemediationItem[];
  longTerm: RemediationItem[];
}

export interface RemediationItem {
  issue: string;
  action: string;
  owner: string;
  deadline: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ActionItem {
  id: string;
  action: string;
  priority: string;
  assignee: string;
  dueDate: string;
}

export interface SecurityTrends {
  scoreHistory: number[];
  vulnerabilityTrends: TrendData[];
  complianceTrends: TrendData[];
  improvementRate: number;
}

export interface TrendData {
  metric: string;
  values: number[];
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface SecurityRecommendation {
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}