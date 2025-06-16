/**
 * Comprehensive test suite for the Intelligent Bug Analysis & TODO Generator system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/testing-library';

// Since the analyzer is in JavaScript, we'll import it differently
const { 
    IntelligentBugAnalyzer, 
    AnalysisError,
    TestOutputAnalyzer,
    TodoGenerator,
    CustomerExperienceImpactAnalyzer,
    FixStrategyOptimizer 
} = require('../tools/analysis/intelligent-bug-analyzer');

describe('Intelligent Bug Analysis & TODO Generator System', () => {
    let analyzer: any;
    let mockTestOutput: string;
    let mockJestJsonOutput: any;

    beforeEach(() => {
        analyzer = new IntelligentBugAnalyzer({
            enableCxAnalysis: true,
            enableStrategyOptimization: true,
            outputFormat: 'json',
            includeMetrics: true
        });

        // Mock Jest test output (text format)
        mockTestOutput = `
FAIL src/tools/property-tools.test.ts
  ● Property Tools › should handle authentication errors
    
    Error: 401 Unauthorized - Invalid credentials
    
    at PropertyClient.authenticate (/src/akamai-client.ts:45:11)
    at PropertyTools.listProperties (/src/tools/property-tools.ts:123:15)

FAIL src/tools/dns-tools.test.ts
  ● DNS Tools › should create zone successfully
    
    Error: Configuration missing: .edgerc file not found
    
    at EdgeGridClient.loadConfig (/src/utils/edgegrid-client.ts:67:9)

PASS src/tools/cpcode-tools.test.ts
PASS src/utils/formatting.test.ts

Test Suites: 2 failed, 2 passed, 4 total
Tests:       3 failed, 15 passed, 18 total
Snapshots:   0 total
Time:        4.256 s
        `;

        // Mock Jest JSON output
        mockJestJsonOutput = {
            "numTotalTests": 18,
            "numPassedTests": 15,
            "numFailedTests": 3,
            "numSkippedTests": 0,
            "testResults": [
                {
                    "testFilePath": "/src/tools/property-tools.test.ts",
                    "status": "failed",
                    "perfStats": { "runtime": 2145 },
                    "assertionResults": [
                        {
                            "title": "should handle authentication errors",
                            "status": "failed",
                            "failureMessages": [
                                "Error: 401 Unauthorized - Invalid credentials"
                            ]
                        }
                    ]
                },
                {
                    "testFilePath": "/src/tools/dns-tools.test.ts",
                    "status": "failed",
                    "perfStats": { "runtime": 1203 },
                    "assertionResults": [
                        {
                            "title": "should create zone successfully",
                            "status": "failed",
                            "failureMessages": [
                                "Error: Configuration missing: .edgerc file not found"
                            ]
                        }
                    ]
                }
            ]
        };
    });

    describe('TestOutputAnalyzer', () => {
        let outputAnalyzer: any;

        beforeEach(() => {
            outputAnalyzer = new TestOutputAnalyzer();
        });

        it('should parse Jest text output correctly', () => {
            const result = outputAnalyzer.parseTestOutput(mockTestOutput, 'jest');
            
            expect(result.summary.totalTests).toBe(18);
            expect(result.summary.passedTests).toBe(15);
            expect(result.summary.failedTests).toBe(3);
            expect(result.failures).toHaveLength(2);
            expect(result.testSuites).toHaveLength(2);
        });

        it('should parse Jest JSON output correctly', () => {
            const result = outputAnalyzer.parseJestJsonOutput(mockJestJsonOutput);
            
            expect(result.summary.totalTests).toBe(18);
            expect(result.summary.passedTests).toBe(15);
            expect(result.summary.failedTests).toBe(3);
            expect(result.failures).toHaveLength(2);
        });

        it('should categorize errors correctly', () => {
            const authError = outputAnalyzer.categorizeError('401 Unauthorized - Invalid credentials');
            const configError = outputAnalyzer.categorizeError('Configuration missing: .edgerc file not found');
            
            expect(authError).toBe('AUTH_ERROR');
            expect(configError).toBe('CONFIG_ERROR');
        });

        it('should assess error severity correctly', () => {
            const authFailure = {
                message: '401 Unauthorized',
                type: 'test_failure'
            };
            const configFailure = {
                message: 'Configuration missing',
                type: 'suite_error'
            };
            
            const authSeverity = outputAnalyzer.assessErrorSeverity(authFailure, 'AUTH_ERROR');
            const configSeverity = outputAnalyzer.assessErrorSeverity(configFailure, 'CONFIG_ERROR');
            
            expect(authSeverity).toBe('CRITICAL');
            expect(configSeverity).toBe('CRITICAL');
        });

        it('should analyze test results comprehensively', () => {
            const testResults = outputAnalyzer.parseTestOutput(mockTestOutput, 'jest');
            const analysis = outputAnalyzer.analyzeResults(testResults);
            
            expect(analysis).toHaveProperty('overview');
            expect(analysis).toHaveProperty('errorAnalysis');
            expect(analysis).toHaveProperty('patternAnalysis');
            expect(analysis).toHaveProperty('impactAssessment');
            expect(analysis).toHaveProperty('recommendations');
            
            expect(analysis.overview.successRate).toBeCloseTo(83.33, 1);
            expect(analysis.errorAnalysis.categorizedErrors).toBeInstanceOf(Map);
        });

        it('should identify repeating failure patterns', () => {
            const testResults = {
                failures: [
                    { message: 'API call failed with timeout', test: 'test1', suite: 'suite1' },
                    { message: 'API call failed with timeout', test: 'test2', suite: 'suite2' },
                    { message: 'API call failed with timeout', test: 'test3', suite: 'suite3' }
                ]
            };
            
            const analysis = outputAnalyzer.analyzeResults(testResults);
            const patterns = analysis.patternAnalysis.repeatingFailures;
            
            expect(patterns).toHaveLength(1);
            expect(patterns[0].count).toBe(3);
        });
    });

    describe('TodoGenerator', () => {
        let todoGenerator: any;
        let mockAnalysisResults: any;

        beforeEach(() => {
            todoGenerator = new TodoGenerator();
            mockAnalysisResults = {
                overview: {
                    totalTests: 18,
                    passedTests: 15,
                    failedTests: 3,
                    successRate: 83.33
                },
                errorAnalysis: {
                    categorizedErrors: new Map([
                        ['AUTH_ERROR', [{ 
                            message: '401 Unauthorized', 
                            severity: 'CRITICAL',
                            test: 'auth test',
                            suite: 'property-tools'
                        }]],
                        ['CONFIG_ERROR', [{ 
                            message: 'Configuration missing', 
                            severity: 'CRITICAL',
                            test: 'config test',
                            suite: 'dns-tools'
                        }]]
                    ]),
                    rootCauses: new Map([
                        ['configuration', 2],
                        ['authentication', 1]
                    ])
                },
                patternAnalysis: {
                    repeatingFailures: [
                        { pattern: 'api timeout', count: 3, tests: ['test1', 'test2', 'test3'] }
                    ],
                    cascadingFailures: []
                },
                impactAssessment: {
                    businessImpact: { level: 'HIGH', factors: ['Auth failures blocking access'] },
                    technicalImpact: { level: 'HIGH', affectedSystems: ['AUTH_ERROR', 'CONFIG_ERROR'] },
                    customerImpact: { level: 'HIGH', affectedFeatures: 2 }
                },
                recommendations: {
                    immediate: ['Fix authentication configuration'],
                    shortTerm: ['Improve error handling'],
                    longTerm: ['Implement monitoring'],
                    preventive: ['Add health checks']
                }
            };
        });

        it('should generate comprehensive TODO list', () => {
            const todoList = todoGenerator.generateTodoList(mockAnalysisResults);
            
            expect(todoList).toHaveProperty('metadata');
            expect(todoList).toHaveProperty('items');
            expect(todoList).toHaveProperty('priorityGroups');
            expect(todoList).toHaveProperty('quickWins');
            expect(todoList).toHaveProperty('dependencies');
            
            expect(todoList.items.length).toBeGreaterThan(0);
            expect(todoList.metadata.totalItems).toBe(todoList.items.length);
        });

        it('should prioritize critical authentication issues', () => {
            const todoList = todoGenerator.generateTodoList(mockAnalysisResults);
            const authItems = todoList.items.filter(item => 
                item.tags?.includes('authentication') || item.title.toLowerCase().includes('auth')
            );
            
            expect(authItems.length).toBeGreaterThan(0);
            expect(authItems[0].priority).toBe('CRITICAL');
        });

        it('should identify quick wins correctly', () => {
            const todoList = todoGenerator.generateTodoList(mockAnalysisResults);
            const quickWins = todoList.quickWins;
            
            quickWins.forEach(item => {
                expect(item.effort_details.hours).toBeLessThanOrEqual(4);
                expect(item.priority_details.weight).toBeGreaterThanOrEqual(50);
            });
        });

        it('should export TODO list in different formats', () => {
            const todoList = todoGenerator.generateTodoList(mockAnalysisResults);
            
            const jsonExport = todoGenerator.exportTodos(todoList, 'json');
            const markdownExport = todoGenerator.exportTodos(todoList, 'markdown');
            const csvExport = todoGenerator.exportTodos(todoList, 'csv');
            
            expect(typeof jsonExport).toBe('string');
            expect(markdownExport).toContain('# TODO List');
            expect(csvExport).toContain('ID,Title,Priority');
        });

        it('should generate root cause todos for systemic issues', () => {
            const todoList = todoGenerator.generateTodoList(mockAnalysisResults);
            const rootCauseItems = todoList.items.filter(item => 
                item.tags?.includes('root-cause')
            );
            
            expect(rootCauseItems.length).toBeGreaterThan(0);
            expect(rootCauseItems.some(item => item.tags?.includes('configuration'))).toBe(true);
        });
    });

    describe('CustomerExperienceImpactAnalyzer', () => {
        let cxAnalyzer: any;
        let mockTestResults: any;
        let mockAnalysisResults: any;

        beforeEach(() => {
            cxAnalyzer = new CustomerExperienceImpactAnalyzer();
            mockTestResults = {
                summary: { totalTests: 18, passedTests: 15, failedTests: 3 },
                failures: [
                    { 
                        message: '401 Unauthorized - Authentication failed',
                        test: 'should authenticate user',
                        suite: 'api-integration'
                    },
                    {
                        message: 'Property creation failed - validation error',
                        test: 'should create property',
                        suite: 'onboarding'
                    }
                ],
                testSuites: [
                    { name: 'api-integration', status: 'failed' },
                    { name: 'onboarding', status: 'failed' }
                ]
            };
            
            mockAnalysisResults = {
                errorAnalysis: {
                    categorizedErrors: new Map([
                        ['AUTH_ERROR', [{ severity: 'CRITICAL' }]],
                        ['VALIDATION_ERROR', [{ severity: 'MEDIUM' }]]
                    ])
                }
            };
        });

        it('should analyze customer impact comprehensively', () => {
            const impact = cxAnalyzer.analyzeCustomerImpact(mockTestResults, mockAnalysisResults);
            
            expect(impact).toHaveProperty('overview');
            expect(impact).toHaveProperty('personaImpacts');
            expect(impact).toHaveProperty('journeyImpacts');
            expect(impact).toHaveProperty('businessMetrics');
            expect(impact).toHaveProperty('riskAssessment');
            expect(impact).toHaveProperty('recommendations');
        });

        it('should identify affected customer personas', () => {
            const impact = cxAnalyzer.analyzeCustomerImpact(mockTestResults, mockAnalysisResults);
            const affectedPersonas = Object.keys(impact.personaImpacts).filter(
                personaId => impact.personaImpacts[personaId].relevantFailures > 0
            );
            
            expect(affectedPersonas.length).toBeGreaterThan(0);
        });

        it('should calculate customer impact score', () => {
            const score = cxAnalyzer.calculateCustomerImpactScore(mockTestResults, mockAnalysisResults);
            
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(score).toBeLessThan(100); // Should have some impact from failures
        });

        it('should assess business metric impacts', () => {
            const impact = cxAnalyzer.analyzeCustomerImpact(mockTestResults, mockAnalysisResults);
            const metrics = impact.businessMetrics.metrics;
            
            expect(metrics).toHaveProperty('customer_satisfaction');
            expect(metrics).toHaveProperty('time_to_value');
            expect(metrics).toHaveProperty('churn_risk');
            
            // Auth failures should increase churn risk
            expect(metrics.churn_risk.projected).toBeGreaterThan(metrics.churn_risk.baseline);
        });

        it('should generate customer-focused recommendations', () => {
            const impact = cxAnalyzer.analyzeCustomerImpact(mockTestResults, mockAnalysisResults);
            const recommendations = impact.recommendations;
            
            expect(recommendations).toHaveProperty('immediate');
            expect(recommendations).toHaveProperty('customerCommunication');
            expect(recommendations).toHaveProperty('processImprovements');
            expect(recommendations).toHaveProperty('preventive');
            
            // Should have immediate actions for critical issues
            expect(recommendations.immediate.length).toBeGreaterThan(0);
        });
    });

    describe('FixStrategyOptimizer', () => {
        let strategyOptimizer: any;
        let mockTodoList: any;
        let mockAnalysisResults: any;

        beforeEach(() => {
            strategyOptimizer = new FixStrategyOptimizer();
            mockTodoList = {
                items: [
                    {
                        id: 'item1',
                        title: 'Fix Authentication',
                        priority: 'CRITICAL',
                        effort: 'simple',
                        effort_details: { hours: 4 },
                        priority_details: { weight: 100 },
                        type: 'security',
                        tags: ['authentication', 'critical']
                    },
                    {
                        id: 'item2',
                        title: 'Optimize Performance',
                        priority: 'MEDIUM',
                        effort: 'complex',
                        effort_details: { hours: 40 },
                        priority_details: { weight: 50 },
                        type: 'performance',
                        tags: ['performance', 'optimization']
                    }
                ],
                metadata: { estimatedTotalHours: 44 },
                quickWins: []
            };
            
            mockAnalysisResults = {
                errorAnalysis: {
                    categorizedErrors: new Map([['AUTH_ERROR', [{ severity: 'CRITICAL' }]]])
                }
            };
        });

        it('should generate comprehensive fix strategy', () => {
            const strategy = strategyOptimizer.generateFixStrategy(mockAnalysisResults, mockTodoList);
            
            expect(strategy).toHaveProperty('overview');
            expect(strategy).toHaveProperty('quickWins');
            expect(strategy).toHaveProperty('tacticalFixes');
            expect(strategy).toHaveProperty('strategicInitiatives');
            expect(strategy).toHaveProperty('resourceAllocation');
            expect(strategy).toHaveProperty('timeline');
            expect(strategy).toHaveProperty('riskAssessment');
        });

        it('should identify quick wins correctly', () => {
            const strategy = strategyOptimizer.generateFixStrategy(mockAnalysisResults, mockTodoList);
            const quickWins = strategy.quickWins;
            
            expect(quickWins).toHaveProperty('candidates');
            expect(quickWins).toHaveProperty('optimized');
            expect(quickWins).toHaveProperty('estimatedImpact');
        });

        it('should calculate strategic balance', () => {
            const balance = strategyOptimizer.calculateStrategicBalance(mockTodoList);
            
            expect(balance).toHaveProperty('counts');
            expect(balance).toHaveProperty('percentages');
            expect(balance).toHaveProperty('recommendation');
            
            expect(balance.counts.quick_fixes).toBe(1); // 4 hour item
            expect(balance.counts.tactical_fixes).toBe(0);
            expect(balance.counts.strategic_fixes).toBe(1); // 40 hour item
        });

        it('should optimize resource allocation', () => {
            const strategy = strategyOptimizer.generateFixStrategy(mockAnalysisResults, mockTodoList);
            const allocation = strategy.resourceAllocation;
            
            expect(allocation).toHaveProperty('resourceNeeds');
            expect(allocation).toHaveProperty('optimalAllocation');
            expect(allocation).toHaveProperty('utilizationRate');
            expect(allocation).toHaveProperty('costEstimate');
        });

        it('should generate timeline with phases', () => {
            const strategy = strategyOptimizer.generateFixStrategy(mockAnalysisResults, mockTodoList);
            const timeline = strategy.timeline;
            
            expect(timeline).toHaveProperty('phases');
            expect(timeline).toHaveProperty('milestones');
            expect(timeline).toHaveProperty('criticalPath');
            
            const phases = timeline.phases;
            expect(phases.some(phase => phase.name === 'Immediate Response')).toBe(true);
            expect(phases.some(phase => phase.name === 'Strategic Development')).toBe(true);
        });
    });

    describe('IntelligentBugAnalyzer Integration', () => {
        it('should perform complete analysis workflow', async () => {
            const result = await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            
            expect(result).toHaveProperty('analysisId');
            expect(result).toHaveProperty('report');
            expect(result).toHaveProperty('insights');
            expect(result).toHaveProperty('exports');
            
            const report = result.report;
            expect(report).toHaveProperty('metadata');
            expect(report).toHaveProperty('executive_summary');
            expect(report).toHaveProperty('test_analysis');
            expect(report).toHaveProperty('todo_management');
            expect(report).toHaveProperty('customer_impact');
            expect(report).toHaveProperty('fix_strategy');
        });

        it('should generate executive summary with key insights', async () => {
            const result = await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            const summary = result.report.executive_summary;
            
            expect(summary).toHaveProperty('situation');
            expect(summary).toHaveProperty('customer_impact');
            expect(summary).toHaveProperty('recommended_actions');
            expect(summary).toHaveProperty('business_impact');
            expect(summary).toHaveProperty('success_probability');
            
            expect(summary.situation.severity).toBe('MEDIUM'); // Based on failure rate
            expect(summary.success_probability).toBeGreaterThan(0);
            expect(summary.success_probability).toBeLessThanOrEqual(100);
        });

        it('should calculate health score correctly', async () => {
            const result = await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            const healthScore = result.report.test_analysis.health_score;
            
            expect(healthScore).toHaveProperty('overall');
            expect(healthScore).toHaveProperty('success_rate');
            expect(healthScore).toHaveProperty('performance');
            expect(healthScore).toHaveProperty('stability');
            expect(healthScore).toHaveProperty('grade');
            
            expect(healthScore.overall).toBeGreaterThan(0);
            expect(healthScore.overall).toBeLessThanOrEqual(100);
            expect(healthScore.success_rate).toBeCloseTo(83, 0);
        });

        it('should generate exports in multiple formats', async () => {
            const analyzerWithMultipleFormats = new IntelligentBugAnalyzer({
                outputFormat: 'all'
            });
            
            const result = await analyzerWithMultipleFormats.analyzeTestResults(mockTestOutput, 'jest');
            const exports = result.exports;
            
            expect(exports).toHaveProperty('json');
            expect(exports).toHaveProperty('markdown');
            expect(exports).toHaveProperty('csv');
            expect(exports).toHaveProperty('github');
            expect(exports).toHaveProperty('summary');
            
            expect(exports.markdown.content).toContain('# Bug Analysis Report');
            expect(exports.csv.content).toContain('ID,Title,Priority');
        });

        it('should handle analysis errors gracefully', async () => {
            const invalidOutput = "invalid test output";
            
            try {
                await analyzer.analyzeTestResults(invalidOutput, 'jest');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AnalysisError);
                expect(error.message).toContain('Bug analysis failed');
            }
        });

        it('should track analysis history', async () => {
            const initialHistoryLength = analyzer.analysisHistory.length;
            
            await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            
            expect(analyzer.analysisHistory.length).toBe(initialHistoryLength + 1);
            
            const latestAnalysis = analyzer.analysisHistory[analyzer.analysisHistory.length - 1];
            expect(latestAnalysis).toHaveProperty('id');
            expect(latestAnalysis).toHaveProperty('timestamp');
            expect(latestAnalysis).toHaveProperty('summary');
        });

        it('should generate unified recommendations', async () => {
            const result = await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            const recommendations = result.report.recommendations;
            
            expect(recommendations).toHaveProperty('immediate');
            expect(recommendations).toHaveProperty('short_term');
            expect(recommendations).toHaveProperty('long_term');
            expect(recommendations).toHaveProperty('strategic');
            
            // Should have immediate actions for critical issues
            expect(recommendations.immediate.length).toBeGreaterThan(0);
            
            // Each recommendation should have required fields
            recommendations.immediate.forEach(rec => {
                expect(rec).toHaveProperty('action');
                expect(rec).toHaveProperty('reason');
                expect(rec).toHaveProperty('effort');
                expect(rec).toHaveProperty('owner');
                expect(rec).toHaveProperty('timeline');
            });
        });

        it('should provide actionable next steps', async () => {
            const result = await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            const nextSteps = result.report.next_steps;
            
            expect(nextSteps).toHaveProperty('immediate');
            expect(nextSteps).toHaveProperty('short_term');
            expect(nextSteps).toHaveProperty('long_term');
            
            expect(Array.isArray(nextSteps.immediate)).toBe(true);
            expect(nextSteps.immediate.length).toBeGreaterThan(0);
        });

        it('should handle different test output formats', async () => {
            // Test with JSON format
            const jsonResult = await analyzer.analyzeTestResults(
                JSON.stringify(mockJestJsonOutput), 
                'jest'
            );
            
            expect(jsonResult.report.test_analysis.results.summary.totalTests).toBe(18);
            
            // Test with Mocha format (simplified)
            const mochaOutput = `
  ✓ test 1
  ✗ test 2
    Error: Something failed
  
  2 passing
  1 failing
            `;
            
            const mochaResult = await analyzer.analyzeTestResults(mochaOutput, 'mocha');
            expect(mochaResult.report.test_analysis.results).toBeDefined();
        });
    });

    describe('Performance and Scalability', () => {
        it('should complete analysis within reasonable time', async () => {
            const startTime = Date.now();
            
            await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle large test outputs efficiently', async () => {
            // Generate larger test output
            let largeOutput = mockTestOutput;
            for (let i = 0; i < 10; i++) {
                largeOutput += `\nFAIL test-${i}.ts\n  ● Test ${i} failed\n    Error: Test error ${i}`;
            }
            
            const startTime = Date.now();
            const result = await analyzer.analyzeTestResults(largeOutput, 'jest');
            const processingTime = Date.now() - startTime;
            
            expect(result.report.metadata.processingTime).toBeLessThan(10000);
            expect(processingTime).toBeLessThan(10000);
        });

        it('should limit analysis history to prevent memory issues', async () => {
            // Perform multiple analyses to test history limit
            for (let i = 0; i < 55; i++) {
                await analyzer.analyzeTestResults(mockTestOutput, 'jest');
            }
            
            // Should not exceed 50 entries
            expect(analyzer.analysisHistory.length).toBeLessThanOrEqual(50);
        });
    });

    describe('Configuration and Options', () => {
        it('should respect disabled customer experience analysis', async () => {
            const analyzerNoCx = new IntelligentBugAnalyzer({
                enableCxAnalysis: false
            });
            
            const result = await analyzerNoCx.analyzeTestResults(mockTestOutput, 'jest');
            
            expect(result.report.customer_impact).toBeNull();
        });

        it('should respect disabled strategy optimization', async () => {
            const analyzerNoStrategy = new IntelligentBugAnalyzer({
                enableStrategyOptimization: false
            });
            
            const result = await analyzerNoStrategy.analyzeTestResults(mockTestOutput, 'jest');
            
            expect(result.report.fix_strategy).toBeNull();
        });

        it('should handle different output format preferences', async () => {
            const markdownAnalyzer = new IntelligentBugAnalyzer({
                outputFormat: 'markdown'
            });
            
            const result = await markdownAnalyzer.analyzeTestResults(mockTestOutput, 'jest');
            
            expect(result.exports.markdown).toBeDefined();
            expect(result.exports.markdown.content).toContain('# Bug Analysis Report');
        });

        it('should exclude metrics when disabled', async () => {
            const analyzerNoMetrics = new IntelligentBugAnalyzer({
                includeMetrics: false
            });
            
            const result = await analyzerNoMetrics.analyzeTestResults(mockTestOutput, 'jest');
            
            expect(result.report.metrics).toBeNull();
        });
    });
});

describe('Edge Cases and Error Handling', () => {
    let analyzer: any;

    beforeEach(() => {
        analyzer = new IntelligentBugAnalyzer();
    });

    it('should handle empty test output', async () => {
        const result = await analyzer.analyzeTestResults('', 'jest');
        
        expect(result.report.test_analysis.results.summary.totalTests).toBe(0);
        expect(result.report.todo_management.list.items).toHaveLength(0);
    });

    it('should handle malformed JSON output', async () => {
        const malformedJson = '{"invalid": json}';
        
        const result = await analyzer.analyzeTestResults(malformedJson, 'jest');
        
        // Should gracefully fallback to text parsing
        expect(result.report).toBeDefined();
    });

    it('should handle test output with no failures', async () => {
        const passingOutput = `
PASS src/test1.ts
PASS src/test2.ts

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
        `;
        
        const result = await analyzer.analyzeTestResults(passingOutput, 'jest');
        
        expect(result.report.test_analysis.results.summary.failedTests).toBe(0);
        expect(result.report.todo_management.list.items).toHaveLength(0);
        expect(result.report.executive_summary.situation.severity).toBe('NORMAL');
    });

    it('should handle unsupported test format gracefully', async () => {
        const result = await analyzer.analyzeTestResults(mockTestOutput, 'unsupported_format');
        
        // Should default to generic parsing
        expect(result.report).toBeDefined();
    });
});

// Helper to create mock test output
function createMockTestOutput(options: {
    totalTests?: number;
    failedTests?: number;
    errorTypes?: string[];
} = {}) {
    const { totalTests = 10, failedTests = 2, errorTypes = ['auth', 'config'] } = options;
    
    let output = '';
    
    for (let i = 0; i < failedTests; i++) {
        const errorType = errorTypes[i % errorTypes.length];
        output += `FAIL test-${i}.ts\n  ● Test ${i} failed\n    Error: ${errorType} error\n\n`;
    }
    
    const passedTests = totalTests - failedTests;
    output += `Test Suites: ${failedTests} failed, ${passedTests} passed, ${totalTests} total\n`;
    output += `Tests:       ${failedTests} failed, ${passedTests} passed, ${totalTests} total\n`;
    
    return output;
}