/**
 * Root Cause Analysis System
 * Analyzes failures to identify underlying causes and patterns
 */

const path = require('path');
const fs = require('fs').promises;

class RootCauseAnalyzer {
  constructor(config = {}) {
    this.config = {
      correlationThreshold: config.correlationThreshold || 0.7,
      timeWindowMs: config.timeWindowMs || 300000, // 5 minutes
      minSampleSize: config.minSampleSize || 5,
      ...config
    };
    
    this.analysisHistory = [];
    this.knownPatterns = this.initializeKnownPatterns();
  }

  initializeKnownPatterns() {
    return {
      authenticationChain: {
        pattern: ['token_expired', 'auth_failed', 'unauthorized'],
        rootCause: 'Token refresh mechanism failure',
        category: 'authentication',
        solutions: [
          'Implement token refresh before expiration',
          'Add retry logic with fresh tokens',
          'Monitor token lifecycle'
        ]
      },
      
      cascadingTimeout: {
        pattern: ['connection_timeout', 'request_timeout', 'gateway_timeout'],
        rootCause: 'Upstream service degradation causing cascade',
        category: 'performance',
        solutions: [
          'Implement circuit breakers',
          'Add timeout configurations',
          'Enable request hedging'
        ]
      },
      
      resourceExhaustion: {
        pattern: ['connection_pool_exhausted', 'memory_limit', 'too_many_requests'],
        rootCause: 'Resource leak or inadequate capacity',
        category: 'resource',
        solutions: [
          'Fix resource leaks',
          'Implement proper cleanup',
          'Scale resources appropriately'
        ]
      },
      
      configurationDrift: {
        pattern: ['config_not_found', 'invalid_config', 'environment_mismatch'],
        rootCause: 'Configuration management process failure',
        category: 'configuration',
        solutions: [
          'Implement configuration validation',
          'Use configuration as code',
          'Add drift detection'
        ]
      },
      
      dataPipeline: {
        pattern: ['invalid_data', 'parse_error', 'schema_mismatch'],
        rootCause: 'Data contract violation or transformation error',
        category: 'data',
        solutions: [
          'Implement schema validation',
          'Add data quality checks',
          'Version data contracts'
        ]
      }
    };
  }

  async analyzeBug(bug, context = {}) {
    const analysis = {
      bugId: bug.id,
      timestamp: new Date().toISOString(),
      correlations: [],
      timeline: [],
      dependencies: [],
      rootCauses: [],
      contributingFactors: [],
      recommendations: []
    };
    
    // Perform various analyses
    analysis.correlations = await this.findCorrelations(bug, context);
    analysis.timeline = await this.reconstructTimeline(bug, context);
    analysis.dependencies = this.analyzeDependencies(bug, context);
    analysis.codePath = await this.analyzeCodePath(bug, context);
    analysis.configuration = await this.analyzeConfiguration(bug, context);
    
    // Identify root causes based on analyses
    analysis.rootCauses = this.identifyRootCauses(analysis);
    analysis.contributingFactors = this.identifyContributingFactors(analysis);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);
    
    // Store for pattern learning
    this.analysisHistory.push(analysis);
    
    return analysis;
  }

  async findCorrelations(bug, context) {
    const correlations = [];
    
    // Time-based correlation
    if (context.recentEvents) {
      const timeCorrelations = this.findTimeCorrelations(bug, context.recentEvents);
      correlations.push(...timeCorrelations);
    }
    
    // Error pattern correlation
    if (context.errorLogs) {
      const errorCorrelations = this.findErrorCorrelations(bug, context.errorLogs);
      correlations.push(...errorCorrelations);
    }
    
    // Performance correlation
    if (context.metrics) {
      const perfCorrelations = this.findPerformanceCorrelations(bug, context.metrics);
      correlations.push(...perfCorrelations);
    }
    
    // Deployment correlation
    if (context.deployments) {
      const deployCorrelations = this.findDeploymentCorrelations(bug, context.deployments);
      correlations.push(...deployCorrelations);
    }
    
    return correlations.filter(c => c.confidence > this.config.correlationThreshold);
  }

  findTimeCorrelations(bug, events) {
    const correlations = [];
    const bugTime = new Date(bug.timestamp).getTime();
    
    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      const timeDiff = Math.abs(bugTime - eventTime);
      
      if (timeDiff < this.config.timeWindowMs) {
        const confidence = 1 - (timeDiff / this.config.timeWindowMs);
        correlations.push({
          type: 'temporal',
          event: event.type,
          description: event.description,
          timeDifference: timeDiff,
          confidence,
          relationship: timeDiff < 0 ? 'preceded_by' : 'followed_by'
        });
      }
    }
    
    return correlations;
  }

  findErrorCorrelations(bug, errorLogs) {
    const correlations = [];
    const bugPatterns = bug.patterns || [];
    
    // Group errors by type
    const errorGroups = {};
    for (const error of errorLogs) {
      const key = error.type || error.code || 'unknown';
      if (!errorGroups[key]) {
        errorGroups[key] = [];
      }
      errorGroups[key].push(error);
    }
    
    // Look for error spikes
    for (const [errorType, errors] of Object.entries(errorGroups)) {
      if (errors.length >= this.config.minSampleSize) {
        const spike = this.detectSpike(errors, bug.timestamp);
        if (spike) {
          correlations.push({
            type: 'error_spike',
            errorType,
            count: errors.length,
            spikeIntensity: spike.intensity,
            confidence: spike.confidence,
            timeframe: spike.timeframe
          });
        }
      }
    }
    
    // Look for error chains
    const chains = this.detectErrorChains(errorLogs, bug.timestamp);
    correlations.push(...chains);
    
    return correlations;
  }

  findPerformanceCorrelations(bug, metrics) {
    const correlations = [];
    
    // Look for performance degradation
    for (const metric of metrics) {
      const degradation = this.analyzePerformanceTrend(metric.values, bug.timestamp);
      if (degradation && degradation.severity > 0.2) {
        correlations.push({
          type: 'performance_degradation',
          metric: metric.name,
          degradation: degradation.severity,
          trend: degradation.trend,
          confidence: degradation.confidence,
          baseline: degradation.baseline,
          current: degradation.current
        });
      }
    }
    
    // Look for resource saturation
    const saturation = this.detectResourceSaturation(metrics, bug.timestamp);
    if (saturation) {
      correlations.push({
        type: 'resource_saturation',
        resource: saturation.resource,
        utilization: saturation.utilization,
        threshold: saturation.threshold,
        confidence: saturation.confidence
      });
    }
    
    return correlations;
  }

  findDeploymentCorrelations(bug, deployments) {
    const correlations = [];
    const bugTime = new Date(bug.timestamp).getTime();
    
    for (const deployment of deployments) {
      const deployTime = new Date(deployment.timestamp).getTime();
      const timeSinceDeployment = bugTime - deployTime;
      
      // Check if bug appeared after deployment
      if (timeSinceDeployment > 0 && timeSinceDeployment < 24 * 60 * 60 * 1000) { // 24 hours
        const confidence = Math.max(0, 1 - (timeSinceDeployment / (24 * 60 * 60 * 1000)));
        correlations.push({
          type: 'deployment',
          deployment: deployment.id,
          version: deployment.version,
          changes: deployment.changes,
          timeSinceDeployment,
          confidence,
          suspectedCause: this.analyzeDeploymentImpact(deployment, bug)
        });
      }
    }
    
    return correlations;
  }

  detectSpike(errors, bugTimestamp) {
    if (errors.length < this.config.minSampleSize) {
      return null;
    }
    
    // Calculate error rate over time
    const timeWindows = this.createTimeWindows(errors, 60000); // 1-minute windows
    const bugWindow = this.getTimeWindow(bugTimestamp, 60000);
    
    let avgRate = 0;
    let maxRate = 0;
    let bugWindowRate = 0;
    
    for (const [window, windowErrors] of Object.entries(timeWindows)) {
      const rate = windowErrors.length;
      avgRate += rate;
      maxRate = Math.max(maxRate, rate);
      
      if (window === bugWindow) {
        bugWindowRate = rate;
      }
    }
    
    avgRate /= Object.keys(timeWindows).length;
    
    if (bugWindowRate > avgRate * 2) {
      return {
        intensity: bugWindowRate / avgRate,
        confidence: Math.min(0.9, bugWindowRate / maxRate),
        timeframe: bugWindow
      };
    }
    
    return null;
  }

  detectErrorChains(errors, bugTimestamp) {
    const chains = [];
    const sortedErrors = errors.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Look for sequences of related errors
    for (let i = 0; i < sortedErrors.length - 1; i++) {
      const chain = [sortedErrors[i]];
      let j = i + 1;
      
      while (j < sortedErrors.length) {
        const timeDiff = new Date(sortedErrors[j].timestamp) - new Date(sortedErrors[j-1].timestamp);
        if (timeDiff < 5000 && this.areErrorsRelated(sortedErrors[j-1], sortedErrors[j])) {
          chain.push(sortedErrors[j]);
          j++;
        } else {
          break;
        }
      }
      
      if (chain.length >= 3) {
        const chainPattern = this.matchKnownPattern(chain);
        chains.push({
          type: 'error_chain',
          length: chain.length,
          pattern: chain.map(e => e.type || e.code),
          startTime: chain[0].timestamp,
          endTime: chain[chain.length - 1].timestamp,
          knownPattern: chainPattern,
          confidence: chainPattern ? 0.9 : 0.7
        });
        
        i = j - 1; // Skip processed errors
      }
    }
    
    return chains;
  }

  areErrorsRelated(error1, error2) {
    // Check if errors are related based on various criteria
    if (error1.component === error2.component) return true;
    if (error1.user === error2.user) return true;
    if (error1.sessionId === error2.sessionId) return true;
    if (error1.correlationId === error2.correlationId) return true;
    
    // Check for cause-effect relationships
    const causeEffect = {
      'connection_timeout': ['request_failed', 'gateway_timeout'],
      'auth_failed': ['unauthorized', 'forbidden'],
      'rate_limit': ['too_many_requests', 'throttled']
    };
    
    return causeEffect[error1.type]?.includes(error2.type) || false;
  }

  matchKnownPattern(chain) {
    const chainPattern = chain.map(e => e.type || e.code).join(',');
    
    for (const [name, pattern] of Object.entries(this.knownPatterns)) {
      const knownPattern = pattern.pattern.join(',');
      if (chainPattern.includes(knownPattern)) {
        return {
          name,
          ...pattern
        };
      }
    }
    
    return null;
  }

  analyzePerformanceTrend(values, bugTimestamp) {
    if (values.length < this.config.minSampleSize) {
      return null;
    }
    
    // Calculate baseline (median of first half)
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const baseline = this.calculateMedian(firstHalf.map(v => v.value));
    
    // Find values around bug timestamp
    const bugTime = new Date(bugTimestamp).getTime();
    const relevantValues = values.filter(v => {
      const valueTime = new Date(v.timestamp).getTime();
      return Math.abs(valueTime - bugTime) < this.config.timeWindowMs;
    });
    
    if (relevantValues.length === 0) {
      return null;
    }
    
    const current = this.calculateMedian(relevantValues.map(v => v.value));
    const degradation = (current - baseline) / baseline;
    
    if (degradation > 0.1) {
      return {
        severity: degradation,
        trend: 'increasing',
        baseline,
        current,
        confidence: Math.min(0.9, relevantValues.length / 10)
      };
    }
    
    return null;
  }

  detectResourceSaturation(metrics, bugTimestamp) {
    const resourceMetrics = {
      cpu: { threshold: 0.8, metric: 'cpu_usage' },
      memory: { threshold: 0.9, metric: 'memory_usage' },
      disk: { threshold: 0.85, metric: 'disk_usage' },
      connections: { threshold: 0.9, metric: 'connection_pool_usage' }
    };
    
    for (const [resource, config] of Object.entries(resourceMetrics)) {
      const metric = metrics.find(m => m.name === config.metric);
      if (metric) {
        const recent = metric.values.filter(v => {
          const valueTime = new Date(v.timestamp).getTime();
          const bugTime = new Date(bugTimestamp).getTime();
          return Math.abs(valueTime - bugTime) < this.config.timeWindowMs;
        });
        
        if (recent.length > 0) {
          const maxUsage = Math.max(...recent.map(v => v.value));
          if (maxUsage > config.threshold) {
            return {
              resource,
              utilization: maxUsage,
              threshold: config.threshold,
              confidence: 0.8
            };
          }
        }
      }
    }
    
    return null;
  }

  analyzeDeploymentImpact(deployment, bug) {
    const suspects = [];
    
    // Check if deployment touched related components
    if (deployment.components?.includes(bug.component)) {
      suspects.push('Direct component modification');
    }
    
    // Check for configuration changes
    if (deployment.configChanges && bug.category === 'configuration') {
      suspects.push('Configuration change');
    }
    
    // Check for dependency updates
    if (deployment.dependencies && bug.type.includes('compatibility')) {
      suspects.push('Dependency update');
    }
    
    return suspects.length > 0 ? suspects : ['Unknown deployment impact'];
  }

  async reconstructTimeline(bug, context) {
    const timeline = [];
    const bugTime = new Date(bug.timestamp).getTime();
    
    // Add the bug event
    timeline.push({
      timestamp: bug.timestamp,
      event: 'bug_occurrence',
      description: bug.description,
      severity: bug.severity
    });
    
    // Add correlated events
    if (context.recentEvents) {
      for (const event of context.recentEvents) {
        const eventTime = new Date(event.timestamp).getTime();
        if (Math.abs(eventTime - bugTime) < this.config.timeWindowMs * 2) {
          timeline.push({
            timestamp: event.timestamp,
            event: event.type,
            description: event.description,
            correlation: this.calculateEventCorrelation(event, bug)
          });
        }
      }
    }
    
    // Add relevant log entries
    if (context.logs) {
      const relevantLogs = context.logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return Math.abs(logTime - bugTime) < this.config.timeWindowMs;
      });
      
      for (const log of relevantLogs) {
        if (log.level === 'error' || log.level === 'warn') {
          timeline.push({
            timestamp: log.timestamp,
            event: 'log_entry',
            level: log.level,
            message: log.message,
            component: log.component
          });
        }
      }
    }
    
    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Add time differences
    for (let i = 1; i < timeline.length; i++) {
      const timeDiff = new Date(timeline[i].timestamp) - new Date(timeline[i-1].timestamp);
      timeline[i].timeSincePrevious = timeDiff;
    }
    
    return timeline;
  }

  calculateEventCorrelation(event, bug) {
    let score = 0;
    
    // Component match
    if (event.component === bug.component) score += 0.3;
    
    // User/session match
    if (event.userId === bug.userId || event.sessionId === bug.sessionId) score += 0.2;
    
    // Error type similarity
    if (event.errorType && bug.type && event.errorType.includes(bug.type)) score += 0.3;
    
    // Time proximity (within 1 minute)
    const timeDiff = Math.abs(new Date(event.timestamp) - new Date(bug.timestamp));
    if (timeDiff < 60000) {
      score += 0.2 * (1 - timeDiff / 60000);
    }
    
    return score;
  }

  analyzeDependencies(bug, context) {
    const dependencies = [];
    
    // Component dependencies
    if (bug.component && context.componentGraph) {
      const directDeps = context.componentGraph[bug.component] || [];
      dependencies.push({
        type: 'component',
        direct: directDeps,
        transitive: this.getTransitiveDependencies(bug.component, context.componentGraph)
      });
    }
    
    // Service dependencies
    if (bug.service && context.serviceMesh) {
      const serviceDeps = this.analyzeServiceDependencies(bug.service, context.serviceMesh);
      dependencies.push({
        type: 'service',
        ...serviceDeps
      });
    }
    
    // Data dependencies
    if (bug.dataFlow && context.dataLineage) {
      const dataDeps = this.analyzeDataDependencies(bug.dataFlow, context.dataLineage);
      dependencies.push({
        type: 'data',
        ...dataDeps
      });
    }
    
    return dependencies;
  }

  getTransitiveDependencies(component, graph, visited = new Set()) {
    if (visited.has(component)) return [];
    visited.add(component);
    
    const direct = graph[component] || [];
    const transitive = [];
    
    for (const dep of direct) {
      transitive.push(dep);
      transitive.push(...this.getTransitiveDependencies(dep, graph, visited));
    }
    
    return [...new Set(transitive)];
  }

  analyzeServiceDependencies(service, serviceMesh) {
    const dependencies = {
      upstream: [],
      downstream: [],
      criticalPath: []
    };
    
    // Find upstream services (services that this service depends on)
    for (const [svc, deps] of Object.entries(serviceMesh)) {
      if (deps.includes(service)) {
        dependencies.upstream.push(svc);
      }
    }
    
    // Find downstream services (services that depend on this service)
    dependencies.downstream = serviceMesh[service] || [];
    
    // Identify critical path
    dependencies.criticalPath = this.findCriticalPath(service, serviceMesh);
    
    return dependencies;
  }

  findCriticalPath(service, serviceMesh) {
    // Simple critical path: services with no alternatives
    const critical = [];
    const downstream = serviceMesh[service] || [];
    
    for (const dep of downstream) {
      const alternatives = this.findAlternativeServices(dep, service, serviceMesh);
      if (alternatives.length === 0) {
        critical.push(dep);
      }
    }
    
    return critical;
  }

  findAlternativeServices(targetService, excludeService, serviceMesh) {
    const alternatives = [];
    
    for (const [service, deps] of Object.entries(serviceMesh)) {
      if (service !== excludeService && deps.includes(targetService)) {
        alternatives.push(service);
      }
    }
    
    return alternatives;
  }

  analyzeDataDependencies(dataFlow, dataLineage) {
    return {
      sources: dataLineage[dataFlow]?.sources || [],
      transformations: dataLineage[dataFlow]?.transformations || [],
      consumers: dataLineage[dataFlow]?.consumers || [],
      quality: dataLineage[dataFlow]?.quality || 'unknown'
    };
  }

  async analyzeCodePath(bug, context) {
    const analysis = {
      stackTrace: bug.stackTrace,
      affectedFiles: [],
      hotspots: [],
      complexity: null
    };
    
    if (bug.stackTrace) {
      // Extract file paths from stack trace
      const files = this.extractFilesFromStackTrace(bug.stackTrace);
      analysis.affectedFiles = files;
      
      // Analyze code complexity if available
      if (context.codeMetrics) {
        for (const file of files) {
          const metrics = context.codeMetrics[file];
          if (metrics) {
            analysis.hotspots.push({
              file,
              complexity: metrics.complexity,
              churn: metrics.churn,
              bugDensity: metrics.bugDensity
            });
          }
        }
      }
    }
    
    // Check for recent code changes
    if (context.gitHistory && analysis.affectedFiles.length > 0) {
      analysis.recentChanges = await this.analyzeRecentChanges(
        analysis.affectedFiles,
        context.gitHistory,
        bug.timestamp
      );
    }
    
    return analysis;
  }

  extractFilesFromStackTrace(stackTrace) {
    const files = [];
    const lines = stackTrace.split('\n');
    
    for (const line of lines) {
      // Common stack trace patterns
      const patterns = [
        /at .* \((.*?):(\d+):(\d+)\)/,  // Node.js
        /at (.*?):(\d+):(\d+)/,          // Simple format
        /File "(.*?)", line (\d+)/,      // Python
        /([\w\/\.\-]+\.\w+):(\d+)/       // Generic
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const file = match[1];
          if (!files.includes(file)) {
            files.push(file);
          }
          break;
        }
      }
    }
    
    return files;
  }

  async analyzeRecentChanges(files, gitHistory, bugTimestamp) {
    const recentChanges = [];
    const bugTime = new Date(bugTimestamp).getTime();
    
    for (const file of files) {
      const changes = gitHistory[file] || [];
      const relevantChanges = changes.filter(change => {
        const changeTime = new Date(change.timestamp).getTime();
        return bugTime - changeTime < 7 * 24 * 60 * 60 * 1000; // 7 days
      });
      
      if (relevantChanges.length > 0) {
        recentChanges.push({
          file,
          changes: relevantChanges.map(c => ({
            commit: c.commit,
            author: c.author,
            timestamp: c.timestamp,
            message: c.message,
            linesChanged: c.linesChanged
          }))
        });
      }
    }
    
    return recentChanges;
  }

  async analyzeConfiguration(bug, context) {
    const analysis = {
      drift: [],
      missing: [],
      invalid: [],
      recommendations: []
    };
    
    if (bug.category === 'configuration' || bug.type.includes('config')) {
      // Check for configuration drift
      if (context.configHistory) {
        analysis.drift = this.detectConfigurationDrift(context.configHistory, bug.timestamp);
      }
      
      // Check for missing configurations
      if (context.requiredConfigs) {
        analysis.missing = this.findMissingConfigurations(
          context.currentConfig,
          context.requiredConfigs
        );
      }
      
      // Validate configuration values
      if (context.configSchema && context.currentConfig) {
        analysis.invalid = this.validateConfiguration(
          context.currentConfig,
          context.configSchema
        );
      }
    }
    
    return analysis;
  }

  detectConfigurationDrift(configHistory, bugTimestamp) {
    const drift = [];
    const bugTime = new Date(bugTimestamp).getTime();
    
    // Find configuration changes near bug occurrence
    for (const change of configHistory) {
      const changeTime = new Date(change.timestamp).getTime();
      if (Math.abs(changeTime - bugTime) < 24 * 60 * 60 * 1000) { // 24 hours
        drift.push({
          key: change.key,
          oldValue: change.oldValue,
          newValue: change.newValue,
          timestamp: change.timestamp,
          timeDifference: bugTime - changeTime,
          risk: this.assessConfigChangeRisk(change)
        });
      }
    }
    
    return drift;
  }

  assessConfigChangeRisk(change) {
    const highRiskPatterns = [
      /password|secret|key|token/i,
      /url|endpoint|host/i,
      /timeout|limit|threshold/i,
      /enabled|disabled|active/i
    ];
    
    for (const pattern of highRiskPatterns) {
      if (pattern.test(change.key)) {
        return 'high';
      }
    }
    
    return 'medium';
  }

  findMissingConfigurations(current, required) {
    const missing = [];
    
    for (const req of required) {
      if (!this.hasConfiguration(current, req.key)) {
        missing.push({
          key: req.key,
          description: req.description,
          defaultValue: req.defaultValue,
          impact: req.impact || 'unknown'
        });
      }
    }
    
    return missing;
  }

  hasConfiguration(config, key) {
    const keys = key.split('.');
    let current = config;
    
    for (const k of keys) {
      if (!current || !current[k]) {
        return false;
      }
      current = current[k];
    }
    
    return true;
  }

  validateConfiguration(config, schema) {
    const invalid = [];
    
    const validate = (obj, schemaObj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        const schemaRule = schemaObj[key];
        
        if (schemaRule) {
          const validation = this.validateValue(value, schemaRule);
          if (!validation.valid) {
            invalid.push({
              key: fullPath,
              value,
              error: validation.error,
              expected: schemaRule
            });
          }
          
          if (schemaRule.type === 'object' && typeof value === 'object') {
            validate(value, schemaRule.properties || {}, fullPath);
          }
        }
      }
    };
    
    validate(config, schema);
    return invalid;
  }

  validateValue(value, rule) {
    // Type validation
    if (rule.type && typeof value !== rule.type) {
      return {
        valid: false,
        error: `Expected ${rule.type}, got ${typeof value}`
      };
    }
    
    // Range validation
    if (rule.min !== undefined && value < rule.min) {
      return {
        valid: false,
        error: `Value ${value} is below minimum ${rule.min}`
      };
    }
    
    if (rule.max !== undefined && value > rule.max) {
      return {
        valid: false,
        error: `Value ${value} exceeds maximum ${rule.max}`
      };
    }
    
    // Pattern validation
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
      return {
        valid: false,
        error: `Value does not match pattern ${rule.pattern}`
      };
    }
    
    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return {
        valid: false,
        error: `Value must be one of: ${rule.enum.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  identifyRootCauses(analysis) {
    const rootCauses = [];
    
    // Configuration issues
    if (analysis.configuration?.drift?.length > 0) {
      rootCauses.push({
        type: 'configuration_change',
        confidence: 0.8,
        description: 'Recent configuration changes detected',
        evidence: analysis.configuration.drift
      });
    }
    
    // Deployment correlation
    const deploymentCorrelation = analysis.correlations?.find(c => c.type === 'deployment');
    if (deploymentCorrelation && deploymentCorrelation.confidence > 0.7) {
      rootCauses.push({
        type: 'deployment',
        confidence: deploymentCorrelation.confidence,
        description: `Bug appeared after deployment ${deploymentCorrelation.deployment}`,
        evidence: deploymentCorrelation
      });
    }
    
    // Resource saturation
    const resourceCorrelation = analysis.correlations?.find(c => c.type === 'resource_saturation');
    if (resourceCorrelation) {
      rootCauses.push({
        type: 'resource_exhaustion',
        confidence: resourceCorrelation.confidence,
        description: `${resourceCorrelation.resource} saturation detected`,
        evidence: resourceCorrelation
      });
    }
    
    // Error chains
    const errorChains = analysis.correlations?.filter(c => c.type === 'error_chain');
    for (const chain of errorChains || []) {
      if (chain.knownPattern) {
        rootCauses.push({
          type: 'known_pattern',
          confidence: 0.9,
          description: chain.knownPattern.rootCause,
          pattern: chain.knownPattern.name,
          evidence: chain
        });
      }
    }
    
    // Code complexity
    if (analysis.codePath?.hotspots?.some(h => h.complexity > 20)) {
      rootCauses.push({
        type: 'code_complexity',
        confidence: 0.6,
        description: 'High code complexity in affected files',
        evidence: analysis.codePath.hotspots
      });
    }
    
    return rootCauses.sort((a, b) => b.confidence - a.confidence);
  }

  identifyContributingFactors(analysis) {
    const factors = [];
    
    // Performance degradation
    const perfCorrelations = analysis.correlations?.filter(c => c.type === 'performance_degradation');
    for (const perf of perfCorrelations || []) {
      factors.push({
        type: 'performance',
        description: `${perf.metric} degraded by ${(perf.degradation * 100).toFixed(0)}%`,
        impact: perf.degradation > 0.5 ? 'high' : 'medium'
      });
    }
    
    // Error spikes
    const errorSpikes = analysis.correlations?.filter(c => c.type === 'error_spike');
    for (const spike of errorSpikes || []) {
      factors.push({
        type: 'error_rate',
        description: `${spike.errorType} errors spiked ${spike.spikeIntensity.toFixed(1)}x`,
        impact: spike.spikeIntensity > 5 ? 'high' : 'medium'
      });
    }
    
    // Missing configurations
    if (analysis.configuration?.missing?.length > 0) {
      factors.push({
        type: 'configuration',
        description: `${analysis.configuration.missing.length} required configurations missing`,
        impact: 'medium'
      });
    }
    
    // Recent code changes
    if (analysis.codePath?.recentChanges?.length > 0) {
      const totalChanges = analysis.codePath.recentChanges.reduce(
        (sum, file) => sum + file.changes.length, 0
      );
      factors.push({
        type: 'code_changes',
        description: `${totalChanges} recent changes in affected files`,
        impact: totalChanges > 10 ? 'high' : 'medium'
      });
    }
    
    return factors;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Based on root causes
    for (const rootCause of analysis.rootCauses) {
      switch (rootCause.type) {
        case 'configuration_change':
          recommendations.push({
            priority: 'immediate',
            action: 'Review and potentially revert recent configuration changes',
            details: 'Configuration drift detected that correlates with bug occurrence'
          });
          break;
          
        case 'deployment':
          recommendations.push({
            priority: 'immediate',
            action: 'Analyze deployment changes and consider rollback',
            details: `Deployment ${rootCause.evidence.deployment} may have introduced the issue`
          });
          break;
          
        case 'resource_exhaustion':
          recommendations.push({
            priority: 'immediate',
            action: `Increase ${rootCause.evidence.resource} capacity or fix resource leak`,
            details: 'Resource saturation is causing failures'
          });
          break;
          
        case 'known_pattern':
          const pattern = this.knownPatterns[rootCause.pattern];
          if (pattern?.solutions) {
            recommendations.push(...pattern.solutions.map(solution => ({
              priority: 'high',
              action: solution,
              details: `Known pattern: ${pattern.rootCause}`
            })));
          }
          break;
      }
    }
    
    // Based on contributing factors
    const hasPerformanceIssues = analysis.contributingFactors?.some(f => f.type === 'performance');
    if (hasPerformanceIssues) {
      recommendations.push({
        priority: 'medium',
        action: 'Implement performance monitoring and optimization',
        details: 'Performance degradation is contributing to failures'
      });
    }
    
    // General recommendations
    if (analysis.timeline?.length > 10) {
      recommendations.push({
        priority: 'medium',
        action: 'Implement better observability and correlation tracking',
        details: 'Complex event chain makes root cause analysis difficult'
      });
    }
    
    return recommendations;
  }

  createTimeWindows(events, windowSize) {
    const windows = {};
    
    for (const event of events) {
      const window = this.getTimeWindow(event.timestamp, windowSize);
      if (!windows[window]) {
        windows[window] = [];
      }
      windows[window].push(event);
    }
    
    return windows;
  }

  getTimeWindow(timestamp, windowSize) {
    const time = new Date(timestamp).getTime();
    return Math.floor(time / windowSize) * windowSize;
  }

  calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    return sorted[mid];
  }

  async generateReport(analyses) {
    const report = {
      summary: {
        totalAnalyzed: analyses.length,
        rootCausesIdentified: analyses.filter(a => a.rootCauses.length > 0).length,
        patterns: this.summarizePatterns(analyses),
        recommendations: this.consolidateRecommendations(analyses)
      },
      details: analyses,
      insights: this.generateInsights(analyses)
    };
    
    return report;
  }

  summarizePatterns(analyses) {
    const patterns = {};
    
    for (const analysis of analyses) {
      for (const rootCause of analysis.rootCauses) {
        const key = rootCause.type;
        patterns[key] = (patterns[key] || 0) + 1;
      }
    }
    
    return patterns;
  }

  consolidateRecommendations(analyses) {
    const allRecommendations = [];
    
    for (const analysis of analyses) {
      allRecommendations.push(...analysis.recommendations);
    }
    
    // Group by action and count occurrences
    const grouped = {};
    for (const rec of allRecommendations) {
      const key = rec.action;
      if (!grouped[key]) {
        grouped[key] = {
          ...rec,
          occurrences: 0
        };
      }
      grouped[key].occurrences++;
    }
    
    // Sort by priority and occurrences
    return Object.values(grouped).sort((a, b) => {
      const priorityOrder = ['immediate', 'high', 'medium', 'low'];
      const aPriority = priorityOrder.indexOf(a.priority);
      const bPriority = priorityOrder.indexOf(b.priority);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return b.occurrences - a.occurrences;
    });
  }

  generateInsights(analyses) {
    const insights = [];
    
    // Pattern insights
    const patterns = this.summarizePatterns(analyses);
    const topPattern = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0];
    if (topPattern) {
      insights.push({
        type: 'pattern',
        description: `Most common root cause: ${topPattern[0]} (${topPattern[1]} occurrences)`,
        actionable: true
      });
    }
    
    // Timeline insights
    const avgTimelineLength = analyses.reduce((sum, a) => sum + a.timeline.length, 0) / analyses.length;
    if (avgTimelineLength > 20) {
      insights.push({
        type: 'complexity',
        description: 'Complex failure chains detected - consider simplifying system architecture',
        actionable: true
      });
    }
    
    // Correlation insights
    const deploymentCorrelations = analyses.filter(a => 
      a.correlations?.some(c => c.type === 'deployment' && c.confidence > 0.7)
    );
    if (deploymentCorrelations.length > analyses.length * 0.3) {
      insights.push({
        type: 'deployment',
        description: `${((deploymentCorrelations.length / analyses.length) * 100).toFixed(0)}% of bugs correlated with recent deployments`,
        actionable: true,
        recommendation: 'Improve deployment testing and gradual rollout processes'
      });
    }
    
    return insights;
  }
}

module.exports = RootCauseAnalyzer;