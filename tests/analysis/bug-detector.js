/**
 * Automated Bug Detection System
 * Identifies patterns and anomalies that indicate potential bugs
 */

const fs = require('fs').promises;
const path = require('path');

class BugDetector {
  constructor(config = {}) {
    this.config = {
      performanceThreshold: config.performanceThreshold || 1000, // ms
      errorRateThreshold: config.errorRateThreshold || 0.05, // 5%
      memoryLeakThreshold: config.memoryLeakThreshold || 100 * 1024 * 1024, // 100MB
      ...config
    };
    
    this.detectedBugs = [];
    this.patterns = this.initializePatterns();
  }

  initializePatterns() {
    return {
      authenticationFailures: {
        patterns: [
          /401|403|unauthorized|forbidden/i,
          /authentication failed|auth error/i,
          /invalid credentials|token expired/i,
          /EAUTH|EPERM/i
        ],
        severity: 'critical',
        category: 'security'
      },
      
      performanceIssues: {
        patterns: [
          /timeout|timed out/i,
          /slow response|performance degradation/i,
          /exceeded.*limit/i,
          /ETIMEDOUT|ECONNRESET/i
        ],
        severity: 'high',
        category: 'performance'
      },
      
      apiCompatibility: {
        patterns: [
          /deprecated|obsolete/i,
          /version mismatch|incompatible/i,
          /missing required|invalid parameter/i,
          /schema validation failed/i
        ],
        severity: 'high',
        category: 'compatibility'
      },
      
      configurationDrift: {
        patterns: [
          /config.*not found|missing configuration/i,
          /invalid.*config|configuration error/i,
          /environment.*mismatch/i,
          /ENOENT.*config/i
        ],
        severity: 'medium',
        category: 'configuration'
      },
      
      resourceLeaks: {
        patterns: [
          /memory leak|heap.*exhausted/i,
          /too many.*connections|connection pool/i,
          /file descriptor.*limit/i,
          /EMFILE|ENFILE|ENOSPC/i
        ],
        severity: 'critical',
        category: 'resource'
      },
      
      securityVulnerabilities: {
        patterns: [
          /injection|xss|csrf/i,
          /insecure|vulnerability/i,
          /exposed.*secret|hardcoded.*credential/i,
          /unencrypted|plaintext.*password/i
        ],
        severity: 'critical',
        category: 'security'
      },
      
      dataCorruption: {
        patterns: [
          /corrupt|corrupted|malformed/i,
          /invalid.*data|data.*integrity/i,
          /checksum.*fail|hash.*mismatch/i,
          /EINTEGRITY|ECORRUPT/i
        ],
        severity: 'critical',
        category: 'data'
      },
      
      raceConditions: {
        patterns: [
          /race condition|concurrent.*modification/i,
          /deadlock|mutex.*timeout/i,
          /synchronization.*error/i,
          /EDEADLK|EBUSY/i
        ],
        severity: 'high',
        category: 'concurrency'
      }
    };
  }

  async analyzeTestResults(testResultsPath) {
    try {
      const results = await this.loadTestResults(testResultsPath);
      const bugs = [];

      // Analyze test failures
      if (results.failures) {
        bugs.push(...this.analyzeFailures(results.failures));
      }

      // Analyze performance metrics
      if (results.performance) {
        bugs.push(...this.analyzePerformance(results.performance));
      }

      // Analyze error logs
      if (results.logs) {
        bugs.push(...this.analyzeLogs(results.logs));
      }

      // Analyze resource usage
      if (results.resources) {
        bugs.push(...this.analyzeResources(results.resources));
      }

      this.detectedBugs = bugs;
      return bugs;
    } catch (error) {
      console.error('Error analyzing test results:', error);
      throw error;
    }
  }

  analyzeFailures(failures) {
    const bugs = [];
    
    for (const failure of failures) {
      const detectedPatterns = this.detectPatterns(failure.message || failure.error);
      
      if (detectedPatterns.length > 0) {
        bugs.push({
          id: this.generateBugId(),
          type: 'test_failure',
          patterns: detectedPatterns,
          severity: this.calculateSeverity(detectedPatterns),
          category: detectedPatterns[0].category,
          description: failure.message || failure.error,
          testName: failure.testName,
          timestamp: failure.timestamp || new Date().toISOString(),
          stackTrace: failure.stack,
          reproducible: true,
          metadata: {
            file: failure.file,
            line: failure.line,
            column: failure.column
          }
        });
      }
    }
    
    return bugs;
  }

  analyzePerformance(performanceData) {
    const bugs = [];
    
    // Check for performance regressions
    for (const metric of performanceData) {
      if (metric.duration > this.config.performanceThreshold) {
        bugs.push({
          id: this.generateBugId(),
          type: 'performance_regression',
          severity: this.getPerformanceSeverity(metric.duration),
          category: 'performance',
          description: `Performance regression detected: ${metric.name} took ${metric.duration}ms (threshold: ${this.config.performanceThreshold}ms)`,
          metric: metric.name,
          duration: metric.duration,
          threshold: this.config.performanceThreshold,
          timestamp: metric.timestamp || new Date().toISOString(),
          impact: this.calculatePerformanceImpact(metric)
        });
      }
      
      // Check for performance trend
      if (metric.trend && metric.trend.degradation > 0.2) {
        bugs.push({
          id: this.generateBugId(),
          type: 'performance_trend',
          severity: 'medium',
          category: 'performance',
          description: `Performance degradation trend: ${metric.name} degraded by ${(metric.trend.degradation * 100).toFixed(2)}%`,
          metric: metric.name,
          trend: metric.trend,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return bugs;
  }

  analyzeLogs(logs) {
    const bugs = [];
    const errorCounts = {};
    
    for (const log of logs) {
      // Pattern detection
      const detectedPatterns = this.detectPatterns(log.message);
      
      if (detectedPatterns.length > 0) {
        const patternKey = detectedPatterns.map(p => p.name).join('_');
        errorCounts[patternKey] = (errorCounts[patternKey] || 0) + 1;
        
        // Only report if error occurs frequently
        if (errorCounts[patternKey] === 5) {
          bugs.push({
            id: this.generateBugId(),
            type: 'error_pattern',
            patterns: detectedPatterns,
            severity: this.calculateSeverity(detectedPatterns),
            category: detectedPatterns[0].category,
            description: `Recurring error pattern detected: ${log.message}`,
            occurrences: errorCounts[patternKey],
            timestamp: log.timestamp || new Date().toISOString(),
            firstOccurrence: log.timestamp,
            sample: log
          });
        }
      }
      
      // Check error rates
      if (log.level === 'error') {
        const errorRate = this.calculateErrorRate(logs);
        if (errorRate > this.config.errorRateThreshold) {
          bugs.push({
            id: this.generateBugId(),
            type: 'high_error_rate',
            severity: 'high',
            category: 'reliability',
            description: `High error rate detected: ${(errorRate * 100).toFixed(2)}% (threshold: ${(this.config.errorRateThreshold * 100).toFixed(2)}%)`,
            errorRate,
            threshold: this.config.errorRateThreshold,
            timestamp: new Date().toISOString()
          });
          break; // Only report once
        }
      }
    }
    
    return bugs;
  }

  analyzeResources(resources) {
    const bugs = [];
    
    // Memory leak detection
    if (resources.memory) {
      const memoryTrend = this.analyzeMemoryTrend(resources.memory);
      if (memoryTrend.isLeaking) {
        bugs.push({
          id: this.generateBugId(),
          type: 'memory_leak',
          severity: 'critical',
          category: 'resource',
          description: `Memory leak detected: ${(memoryTrend.leakRate / 1024 / 1024).toFixed(2)} MB/hour`,
          memoryUsage: resources.memory[resources.memory.length - 1],
          leakRate: memoryTrend.leakRate,
          trend: memoryTrend,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Connection pool exhaustion
    if (resources.connections) {
      const maxConnections = Math.max(...resources.connections.map(c => c.active));
      if (maxConnections > resources.connectionLimit * 0.9) {
        bugs.push({
          id: this.generateBugId(),
          type: 'connection_pool_exhaustion',
          severity: 'high',
          category: 'resource',
          description: `Connection pool near exhaustion: ${maxConnections}/${resources.connectionLimit} connections`,
          maxConnections,
          limit: resources.connectionLimit,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // File descriptor limits
    if (resources.fileDescriptors) {
      const fdUsage = resources.fileDescriptors.used / resources.fileDescriptors.limit;
      if (fdUsage > 0.8) {
        bugs.push({
          id: this.generateBugId(),
          type: 'file_descriptor_exhaustion',
          severity: 'high',
          category: 'resource',
          description: `File descriptor usage critical: ${(fdUsage * 100).toFixed(2)}%`,
          used: resources.fileDescriptors.used,
          limit: resources.fileDescriptors.limit,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return bugs;
  }

  detectPatterns(text) {
    const detected = [];
    
    for (const [name, pattern] of Object.entries(this.patterns)) {
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          detected.push({
            name,
            ...pattern,
            matchedPattern: regex.toString()
          });
          break;
        }
      }
    }
    
    return detected;
  }

  analyzeMemoryTrend(memoryData) {
    if (memoryData.length < 3) {
      return { isLeaking: false };
    }
    
    // Simple linear regression to detect memory growth
    const n = memoryData.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = memoryData.map(m => m.heapUsed);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Consider it a leak if memory grows consistently
    const growthRate = slope * 3600; // bytes per hour
    const isLeaking = growthRate > this.config.memoryLeakThreshold;
    
    return {
      isLeaking,
      leakRate: growthRate,
      slope,
      intercept,
      r2: this.calculateR2(y, x.map(xi => slope * xi + intercept))
    };
  }

  calculateR2(actual, predicted) {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssTotal = actual.reduce((total, y) => total + Math.pow(y - mean, 2), 0);
    const ssResidual = actual.reduce((total, y, i) => total + Math.pow(y - predicted[i], 2), 0);
    return 1 - (ssResidual / ssTotal);
  }

  calculateErrorRate(logs) {
    const errors = logs.filter(l => l.level === 'error').length;
    return errors / logs.length;
  }

  calculateSeverity(patterns) {
    const severities = ['low', 'medium', 'high', 'critical'];
    const maxSeverity = patterns.reduce((max, pattern) => {
      const index = severities.indexOf(pattern.severity);
      const maxIndex = severities.indexOf(max);
      return index > maxIndex ? pattern.severity : max;
    }, 'low');
    
    return maxSeverity;
  }

  getPerformanceSeverity(duration) {
    const ratio = duration / this.config.performanceThreshold;
    if (ratio > 10) return 'critical';
    if (ratio > 5) return 'high';
    if (ratio > 2) return 'medium';
    return 'low';
  }

  calculatePerformanceImpact(metric) {
    return {
      userExperience: metric.duration > 3000 ? 'severe' : metric.duration > 1000 ? 'moderate' : 'minimal',
      throughput: metric.throughput ? (100 - metric.throughput) / 100 : null,
      availability: metric.errorRate || 0
    };
  }

  generateBugId() {
    return `BUG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async loadTestResults(resultsPath) {
    try {
      const data = await fs.readFile(resultsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading test results:', error);
      return {};
    }
  }

  async generateReport() {
    const report = {
      summary: {
        total: this.detectedBugs.length,
        bySeverity: this.groupBySeverity(),
        byCategory: this.groupByCategory(),
        timestamp: new Date().toISOString()
      },
      bugs: this.detectedBugs,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  groupBySeverity() {
    return this.detectedBugs.reduce((acc, bug) => {
      acc[bug.severity] = (acc[bug.severity] || 0) + 1;
      return acc;
    }, {});
  }

  groupByCategory() {
    return this.detectedBugs.reduce((acc, bug) => {
      acc[bug.category] = (acc[bug.category] || 0) + 1;
      return acc;
    }, {});
  }

  generateRecommendations() {
    const recommendations = [];
    const severityCounts = this.groupBySeverity();
    
    if (severityCounts.critical > 0) {
      recommendations.push({
        priority: 'immediate',
        action: 'Address critical bugs immediately - they pose security or stability risks'
      });
    }
    
    const categoryCounts = this.groupByCategory();
    if (categoryCounts.performance > 3) {
      recommendations.push({
        priority: 'high',
        action: 'Conduct performance optimization sprint - multiple performance issues detected'
      });
    }
    
    if (categoryCounts.resource > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Review resource management - potential leaks detected'
      });
    }
    
    return recommendations;
  }
}

module.exports = BugDetector;