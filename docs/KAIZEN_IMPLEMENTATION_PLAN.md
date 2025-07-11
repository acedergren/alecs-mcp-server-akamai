# KAIZEN Implementation Plan for ALECS MCP Server

## Executive Summary

This comprehensive implementation plan applies KAIZEN (continuous improvement) principles to transform the ALECS MCP Server into a best-in-class tool that abstracts Akamai's API complexity while leveraging the full capabilities of the MCP specification (2025-06-18).

## Core Philosophy: User Experience First

Every feature in this plan is designed to:
1. **Reduce friction** - Make complex operations simple
2. **Prevent errors** - Guide users away from mistakes
3. **Provide clarity** - Always explain what's happening and why
4. **Enable success** - Help users achieve their goals quickly

## MCP Specification Alignment

### Server Features (What We Provide)
1. **Tools**: 287+ tools for Akamai operations
2. **Resources**: Configuration files, templates, and documentation
3. **Prompts**: Pre-built workflows for common tasks

### Client Features (What We Can Leverage)
1. **Sampling**: Server-initiated LLM interactions for complex workflows
2. **Roots**: Dynamic discovery of working directories
3. **Elicitation**: Request additional information from users when needed

## Feature Implementation Roadmap

### 0. User Hints System - The Foundation

#### Problem Statement
Users struggle with knowing:
- What parameters are required vs optional
- What values are valid for each parameter
- What to do next after running a tool
- How to recover from errors

#### Implementation

```typescript
// Core hint service that works across ALL domains
export class UserHintService {
  private providers = new Map<string, HintProvider>();
  private userContext = new UserContextTracker();
  
  constructor() {
    // Register hint providers for all 21+ domains
    this.registerProvider('property', new PropertyHintProvider());
    this.registerProvider('dns', new DnsHintProvider());
    this.registerProvider('certificate', new CertificateHintProvider());
    this.registerProvider('fast_purge', new FastPurgeHintProvider());
    this.registerProvider('network_lists', new NetworkListsHintProvider());
    this.registerProvider('reporting', new ReportingHintProvider());
    this.registerProvider('billing', new BillingHintProvider());
    this.registerProvider('gtm', new GTMHintProvider());
    this.registerProvider('edge_workers', new EdgeWorkersHintProvider());
    this.registerProvider('edge_kv', new EdgeKVHintProvider());
    this.registerProvider('cloudlets', new CloudletsHintProvider());
    this.registerProvider('security', new SecurityHintProvider());
    this.registerProvider('image_manager', new ImageManagerHintProvider());
    this.registerProvider('datastream', new DataStreamHintProvider());
    this.registerProvider('diagnostics', new DiagnosticsHintProvider());
    this.registerProvider('siem', new SIEMHintProvider());
    this.registerProvider('site_shield', new SiteShieldHintProvider());
    this.registerProvider('cloud_wrapper', new CloudWrapperHintProvider());
    this.registerProvider('contract', new ContractHintProvider());
    this.registerProvider('iam', new IAMHintProvider());
    this.registerProvider('media', new MediaHintProvider());
  }
  
  async getHints(context: HintContext): Promise<UserHints> {
    const hints: UserHints = {
      before: [],      // What to know before using this tool
      during: [],      // Tips while executing
      after: [],       // What to do next
      common_errors: [], // Common mistakes to avoid
      examples: [],    // Real-world examples
      related_tools: [], // Other tools they might need
      warnings: [],    // Important warnings
      tips: []         // Pro tips for power users
    };
    
    // Get domain-specific hints
    const domain = this.extractDomain(context.tool);
    const provider = this.providers.get(domain);
    
    if (provider) {
      const domainHints = await provider.getHints(context);
      Object.assign(hints, domainHints);
    }
    
    // Add universal hints based on context
    this.addUniversalHints(hints, context);
    
    // Personalize based on user history
    this.personalizeHints(hints, context);
    
    return hints;
  }
  
  private addUniversalHints(hints: UserHints, context: HintContext): void {
    // Contract/Group hints
    if (context.requiresContractId && !context.args.contractId) {
      hints.before.push({
        type: 'info',
        message: "💡 Need a contract ID? Run 'contract_list' to see all available contracts",
        action: 'contract_list'
      });
    }
    
    // Customer context hints
    if (!context.args.customer && context.hasMultipleCustomers) {
      hints.tips.push({
        type: 'tip',
        message: "💡 Working with multiple accounts? Use 'customer' parameter to specify which account"
      });
    }
    
    // Validation hints
    if (context.hasComplexValidation) {
      hints.before.push({
        type: 'validation',
        message: "✅ This tool will validate your inputs before making changes"
      });
    }
    
    // Async operation hints
    if (context.isAsyncOperation) {
      hints.during.push({
        type: 'progress',
        message: "⏳ This operation may take a few minutes. You'll see progress updates..."
      });
    }
  }
  
  private personalizeHints(hints: UserHints, context: HintContext): void {
    const userLevel = this.userContext.getExperienceLevel(context.userId);
    
    if (userLevel === 'beginner') {
      // Add more detailed explanations
      hints.before.unshift({
        type: 'explanation',
        message: this.getToolExplanation(context.tool)
      });
    } else if (userLevel === 'expert') {
      // Add shortcuts and advanced features
      hints.tips.push({
        type: 'shortcut',
        message: this.getExpertTips(context.tool)
      });
    }
    
    // Add hints based on recent errors
    const recentErrors = this.userContext.getRecentErrors(context.userId);
    if (recentErrors.includes('CONTRACT_NOT_FOUND')) {
      hints.warnings.push({
        type: 'warning',
        message: "⚠️ Make sure you're using the correct customer account"
      });
    }
  }
}

// Example hint provider for Property Manager
export class PropertyHintProvider implements HintProvider {
  async getHints(context: HintContext): Promise<DomainHints> {
    const hints: DomainHints = {};
    
    switch (context.tool) {
      case 'property_create':
        hints.before = [
          { type: 'info', message: 'Creating a property will automatically create a CP Code for billing' },
          { type: 'tip', message: 'Use a template to get started quickly: templateName: "Ion Standard"' }
        ];
        hints.after = [
          { type: 'next', message: 'Next: Add rules to your property', action: 'property_rules_update' },
          { type: 'next', message: 'Then: Create an edge hostname', action: 'edge_hostname_create' },
          { type: 'next', message: 'Finally: Activate to staging', action: 'property_activate' }
        ];
        hints.common_errors = [
          { type: 'error', message: 'Missing contractId? Run contract_list first' },
          { type: 'error', message: 'Invalid product? Check available products with product_list' }
        ];
        break;
        
      case 'property_list':
        if (!context.args.contractId || !context.args.groupId) {
          hints.before = [
            { type: 'auto', message: '🔍 Auto-discovering properties across all contracts...' }
          ];
        }
        hints.tips = [
          { type: 'search', message: 'Looking for a specific property? Use property_search instead' }
        ];
        break;
        
      case 'property_activate':
        hints.warnings = [
          { type: 'warning', message: '⚠️ Always test on staging before production' },
          { type: 'time', message: '⏱️ Staging: ~3 minutes, Production: ~15 minutes' }
        ];
        hints.before = [
          { type: 'checklist', message: 'Pre-activation checklist:' },
          { type: 'check', message: '✓ Validated property configuration?' },
          { type: 'check', message: '✓ Created edge hostname?' },
          { type: 'check', message: '✓ Updated DNS records?' }
        ];
        break;
    }
    
    return hints;
  }
}

// Integration into every tool response
export async function enhanceToolResponse(
  tool: string,
  args: any,
  response: MCPToolResponse,
  error?: Error
): Promise<MCPToolResponse> {
  const hintService = getHintService();
  
  const context: HintContext = {
    tool,
    args,
    userId: getCurrentUserId(),
    hasError: !!error,
    error,
    response,
    // ... other context
  };
  
  const hints = await hintService.getHints(context);
  
  // Format hints for display
  let hintText = '';
  
  if (error && hints.common_errors.length > 0) {
    hintText += '\n\n## 💡 Common Solutions\n';
    hints.common_errors.forEach(hint => {
      hintText += `- ${hint.message}\n`;
    });
  }
  
  if (hints.after.length > 0) {
    hintText += '\n\n## 🎯 Next Steps\n';
    hints.after.forEach((hint, index) => {
      hintText += `${index + 1}. ${hint.message}`;
      if (hint.action) {
        hintText += ` \`${hint.action}\``;
      }
      hintText += '\n';
    });
  }
  
  if (hints.tips.length > 0) {
    hintText += '\n\n## 💡 Pro Tips\n';
    hints.tips.forEach(hint => {
      hintText += `- ${hint.message}\n`;
    });
  }
  
  if (hints.related_tools.length > 0) {
    hintText += '\n\n## 🔗 Related Tools\n';
    hintText += hints.related_tools.map(t => `- \`${t.tool}\`: ${t.description}`).join('\n');
  }
  
  // Add hints to response
  return {
    ...response,
    content: [
      ...response.content,
      ...(hintText ? [{ type: 'text', text: hintText }] : [])
    ]
  };
}
```

### 1. Contract/Group Auto-Discovery System

#### Problem Statement
Users cannot list properties without knowing contractId and groupId, but discovering these IDs is circular and confusing.

#### Implementation: Parallel Discovery with Progress

```typescript
class ContractGroupDiscovery {
  private cache = new TTLCache<string, DiscoveryResult>(3600000); // 1 hour
  private progressReporter = new ProgressReporter();
  
  async autoDiscoverPropertyList(args: PropertyListArgs): Promise<MCPToolResponse> {
    // Fast path - direct query if IDs provided
    if (args.contractId && args.groupId) {
      return this.directPropertyList(args);
    }
    
    // Check cache first
    const cacheKey = `${args.customer || 'default'}_all_properties`;
    const cached = this.cache.get(cacheKey);
    if (cached && !args.forceFresh) {
      return this.formatCachedResults(cached);
    }
    
    // Smart discovery with progress reporting
    this.progressReporter.start('Discovering your Akamai properties...');
    
    try {
      // Step 1: Get all contracts (with progress)
      this.progressReporter.update('Step 1/3: Discovering contracts...', 33);
      const contracts = await this.discoverContracts(args.customer);
      
      if (contracts.length === 0) {
        return this.formatNoContractsResponse();
      }
      
      // Step 2: Parallel group discovery
      this.progressReporter.update(
        `Step 2/3: Discovering groups across ${contracts.length} contracts...`, 
        66
      );
      
      const groupPromises = contracts.map(contract => 
        this.discoverGroupsForContract(contract.contractId, args.customer)
          .catch(err => {
            logger.debug(`Failed to get groups for ${contract.contractId}:`, err);
            return [];
          })
      );
      
      const allGroupResults = await Promise.all(groupPromises);
      const allGroups = allGroupResults.flat();
      
      // Step 3: Parallel property listing with smart batching
      this.progressReporter.update(
        `Step 3/3: Loading properties from ${allGroups.length} groups...`, 
        90
      );
      
      // Batch requests to avoid rate limits
      const propertyResults = await this.batchPropertyRequests(allGroups, args.customer);
      
      // Cache results
      this.cache.set(cacheKey, propertyResults);
      
      // Format with hints
      return this.formatDiscoveredProperties(propertyResults, {
        discoveryTime: Date.now() - this.progressReporter.startTime,
        contractCount: contracts.length,
        groupCount: allGroups.length
      });
      
    } finally {
      this.progressReporter.complete();
    }
  }
  
  private async batchPropertyRequests(
    groups: GroupInfo[], 
    customer?: string
  ): Promise<PropertyResult[]> {
    const BATCH_SIZE = 5; // Process 5 groups at a time
    const results: PropertyResult[] = [];
    
    for (let i = 0; i < groups.length; i += BATCH_SIZE) {
      const batch = groups.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(group =>
        this.listPropertiesForGroup(
          group.contractId,
          group.groupId,
          customer
        ).catch(err => {
          logger.debug(`Failed to list properties for group ${group.groupId}:`, err);
          return [];
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
      
      // Update progress
      const progress = 90 + (10 * (i + BATCH_SIZE) / groups.length);
      this.progressReporter.update(
        `Loading properties... (${Math.min(i + BATCH_SIZE, groups.length)}/${groups.length} groups)`,
        Math.min(progress, 100)
      );
    }
    
    return results;
  }
  
  private formatDiscoveredProperties(
    properties: PropertyResult[],
    stats: DiscoveryStats
  ): MCPToolResponse {
    const translator = idTranslator;
    
    let text = '# 📦 Property Discovery Results\n\n';
    
    // Summary with stats
    text += `Found **${properties.length} properties** across ${stats.contractCount} contracts`;
    text += ` and ${stats.groupCount} groups in ${stats.discoveryTime}ms\n\n`;
    
    // Add user hints
    const hints = userHintService.getHints({
      tool: 'property_list',
      discoveryMode: true,
      propertyCount: properties.length
    });
    
    if (hints.tips.length > 0) {
      text += '## 💡 Tips\n';
      hints.tips.forEach(tip => {
        text += `- ${tip.message}\n`;
      });
      text += '\n';
    }
    
    // Group by contract for clarity
    const byContract = this.groupPropertiesByContract(properties);
    
    for (const [contractId, contractProperties] of byContract) {
      const contractName = translator.translateContract(contractId);
      text += `## ${contractName.displayName}\n`;
      text += `Contract ID: \`${contractId}\`\n\n`;
      
      // Sub-group by group
      const byGroup = this.groupPropertiesByGroup(contractProperties);
      
      for (const [groupId, groupProperties] of byGroup) {
        const groupName = translator.translateGroup(groupId);
        text += `### ${groupName.displayName}\n`;
        
        groupProperties.forEach(prop => {
          text += `- **${prop.propertyName}** (\`${prop.propertyId}\`)\n`;
          text += `  - Version: ${prop.latestVersion} | `;
          text += `Production: ${prop.productionVersion || 'Not activated'} | `;
          text += `Staging: ${prop.stagingVersion || 'Not activated'}\n`;
        });
        text += '\n';
      }
    }
    
    // Add next steps
    if (hints.after.length > 0) {
      text += '## 🎯 Next Steps\n';
      hints.after.forEach((hint, index) => {
        text += `${index + 1}. ${hint.message}`;
        if (hint.action) {
          text += ` - Run: \`${hint.action}\``;
        }
        text += '\n';
      });
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }
}
```

### 2. DNS Changelist Abstraction

#### Problem Statement
DNS updates require a complex 5-step changelist workflow that users find confusing and error-prone.

#### Implementation: Smart Batching with Auto-Recovery

```typescript
class DnsChangelistManager {
  private pendingChanges = new Map<string, DnsChange[]>();
  private activeChangelists = new Map<string, ChangelistInfo>();
  
  async updateDnsRecord(args: DnsUpdateArgs): Promise<MCPToolResponse> {
    // Add hints for what's about to happen
    const hints = await userHintService.getHints({
      tool: 'dns_record_update',
      args,
      workflow: 'changelist'
    });
    
    // Show pre-execution hints
    if (hints.before.length > 0) {
      logger.info('DNS Update Process:', hints.before);
    }
    
    try {
      // Smart batching - collect changes for the zone
      this.addPendingChange(args.zone, args);
      
      // Check if we should execute now or wait for more changes
      const shouldExecute = this.shouldExecuteNow(args.zone);
      
      if (shouldExecute) {
        return await this.executeBatch(args.zone, {
          autoRecover: true,
          validateBeforeSubmit: true,
          showProgress: true
        });
      } else {
        // Return batching status
        return this.formatBatchingResponse(args.zone);
      }
      
    } catch (error) {
      // Enhanced error handling with recovery hints
      return this.handleError(error, args, hints);
    }
  }
  
  private async executeBatch(
    zone: string, 
    options: BatchOptions
  ): Promise<MCPToolResponse> {
    const changes = this.pendingChanges.get(zone) || [];
    const progress = new ProgressReporter();
    
    progress.start(`Updating ${changes.length} DNS records in ${zone}`);
    
    try {
      // Step 1: Create changelist
      progress.update('Creating DNS changelist...', 20);
      const changelist = await this.createChangelist(zone);
      this.activeChangelists.set(zone, changelist);
      
      // Step 2: Apply all changes
      progress.update('Applying record changes...', 40);
      for (const change of changes) {
        await this.applyChange(changelist, change);
      }
      
      // Step 3: Validate if requested
      if (options.validateBeforeSubmit) {
        progress.update('Validating changes...', 60);
        const validation = await this.validateChangelist(changelist);
        
        if (!validation.isValid) {
          throw new DnsValidationError(validation);
        }
      }
      
      // Step 4: Submit changelist
      progress.update('Submitting changelist...', 80);
      await this.submitChangelist(changelist);
      
      // Step 5: Activate changelist
      progress.update('Activating changes...', 90);
      const activation = await this.activateChangelist(changelist);
      
      // Clear pending changes
      this.pendingChanges.delete(zone);
      this.activeChangelists.delete(zone);
      
      progress.complete('DNS changes activated successfully!');
      
      // Format success response with hints
      return this.formatSuccessResponse(activation, changes, zone);
      
    } catch (error) {
      if (options.autoRecover) {
        return await this.autoRecover(zone, error, changes);
      }
      throw error;
    }
  }
  
  private async autoRecover(
    zone: string, 
    error: Error, 
    changes: DnsChange[]
  ): Promise<MCPToolResponse> {
    logger.warn(`Auto-recovering from DNS error: ${error.message}`);
    
    // Get recovery hints
    const recoveryHints = await userHintService.getRecoveryHints({
      error,
      context: 'dns_changelist',
      zone
    });
    
    // Try recovery strategies
    if (error instanceof ChangelistExpiredError) {
      // Changelist expired - create new one
      const changelist = this.activeChangelists.get(zone);
      if (changelist) {
        await this.discardChangelist(changelist.id);
      }
      
      // Retry with new changelist
      return this.executeBatch(zone, {
        autoRecover: false, // Prevent infinite recursion
        validateBeforeSubmit: true,
        showProgress: true
      });
      
    } else if (error instanceof DnsValidationError) {
      // Validation failed - show specific issues
      return this.formatValidationError(error, changes, recoveryHints);
      
    } else {
      // Unknown error - provide general recovery guidance
      return this.formatGeneralError(error, recoveryHints);
    }
  }
  
  private formatSuccessResponse(
    activation: ActivationResult,
    changes: DnsChange[],
    zone: string
  ): MCPToolResponse {
    let text = `# ✅ DNS Update Successful\n\n`;
    text += `Zone: **${zone}**\n`;
    text += `Activation ID: \`${activation.activationId}\`\n\n`;
    
    text += `## 📝 Changes Applied\n`;
    changes.forEach(change => {
      text += `- ${change.recordName} ${change.recordType} → ${change.recordData}\n`;
    });
    
    text += `\n## ⏱️ Propagation Status\n`;
    text += `- Akamai Network: Active now\n`;
    text += `- Global DNS: 5-10 minutes\n`;
    
    // Add next steps from hints
    const hints = userHintService.getHints({
      tool: 'dns_record_update',
      phase: 'after',
      zone
    });
    
    if (hints.after.length > 0) {
      text += `\n## 🎯 Next Steps\n`;
      hints.after.forEach((hint, index) => {
        text += `${index + 1}. ${hint.message}\n`;
      });
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }
}

// Seamless integration with existing DNS tools
export const dnsTools = {
  'dns_record_update': {
    description: 'Update DNS records (handles changelist automatically)',
    inputSchema: dnsUpdateSchema,
    handler: async (args) => {
      const manager = new DnsChangelistManager();
      return manager.updateDnsRecord(args);
    }
  },
  
  'dns_bulk_update': {
    description: 'Update multiple DNS records efficiently',
    inputSchema: dnsBulkUpdateSchema,
    handler: async (args) => {
      const manager = new DnsChangelistManager();
      
      // Queue all changes
      for (const record of args.records) {
        await manager.updateDnsRecord({
          zone: args.zone,
          ...record
        });
      }
      
      // Execute batch
      return manager.executeBatch(args.zone, {
        autoRecover: true,
        validateBeforeSubmit: true
      });
    }
  }
};
```

### 3. Multi-Step Workflow Orchestrator

#### Problem Statement
Complex operations like new site deployment require coordination across 5+ Akamai services with proper sequencing and error handling.

#### Implementation: Intelligent Dependency Resolution

```typescript
class WorkflowOrchestrator {
  private registry = new WorkflowRegistry();
  private executor = new ParallelExecutor();
  
  async deployNewSite(args: NewSiteArgs): Promise<MCPToolResponse> {
    // Get workflow template
    const workflow = this.registry.getWorkflow('new_site_deployment');
    
    // Build execution plan with dependencies
    const plan = await this.buildExecutionPlan(workflow, args);
    
    // Show plan to user with hints
    const planResponse = await this.presentPlan(plan, args);
    
    // Execute with progress tracking
    return this.executePlan(plan, {
      parallel: true,
      showProgress: true,
      autoRecover: true
    });
  }
  
  private async buildExecutionPlan(
    workflow: WorkflowTemplate,
    args: any
  ): Promise<ExecutionPlan> {
    const graph = new DependencyGraph();
    
    // Phase 1: Certificate provisioning (can start immediately)
    graph.addTask('certificate', {
      tool: 'certificate_create',
      args: {
        commonName: args.hostname,
        sans: args.additionalHostnames || [],
        validationType: 'dv',
        customer: args.customer
      },
      timeout: 300000,
      retryable: true
    });
    
    // Phase 2: Property creation (can start immediately)
    graph.addTask('property', {
      tool: 'property_create',
      args: {
        propertyName: args.siteName,
        productId: args.productId || 'Ion',
        templateName: args.template || 'Ion Standard',
        customer: args.customer
      },
      timeout: 60000,
      retryable: true
    });
    
    // Phase 3: Edge hostname (depends on property)
    graph.addTask('edgeHostname', {
      tool: 'edge_hostname_create',
      args: {
        domainPrefix: args.hostname.split('.')[0],
        domainSuffix: 'edgekey.net', // Best practice
        productId: 'Ion',
        customer: args.customer
      },
      dependencies: ['property'],
      timeout: 60000
    });
    
    // Phase 4: Property configuration (depends on property)
    graph.addTask('propertyConfig', {
      tool: 'property_update_hostnames',
      args: {
        propertyId: '${property.propertyId}', // Dynamic reference
        hostnames: [args.hostname, ...args.additionalHostnames || []],
        customer: args.customer
      },
      dependencies: ['property', 'edgeHostname'],
      timeout: 60000
    });
    
    // Phase 5: WAF configuration (optional, can run in parallel)
    if (args.enableWAF) {
      graph.addTask('security', {
        tool: 'security_config_create',
        args: {
          configName: `${args.siteName}-security`,
          hostnames: [args.hostname],
          customer: args.customer
        },
        dependencies: ['property'],
        optional: true
      });
    }
    
    // Phase 6: Activation (depends on certificate and config)
    graph.addTask('activation', {
      tool: 'property_activate',
      args: {
        propertyId: '${property.propertyId}',
        network: 'STAGING',
        notes: 'Initial deployment via workflow orchestrator',
        customer: args.customer
      },
      dependencies: ['certificate', 'propertyConfig'],
      timeout: 900000 // 15 minutes
    });
    
    // Phase 7: DNS update (final step)
    graph.addTask('dns', {
      tool: 'dns_record_update',
      args: {
        zone: this.extractZone(args.hostname),
        recordName: args.hostname,
        recordType: 'CNAME',
        recordData: '${edgeHostname.edgeHostname}',
        customer: args.customer
      },
      dependencies: ['activation'],
      critical: true
    });
    
    return {
      graph,
      estimatedTime: this.estimateExecutionTime(graph),
      phases: this.groupIntoPhases(graph)
    };
  }
  
  private async executePlan(
    plan: ExecutionPlan,
    options: ExecutionOptions
  ): Promise<MCPToolResponse> {
    const results = new Map<string, TaskResult>();
    const progress = new ProgressReporter();
    
    progress.start('Deploying new site...');
    
    try {
      // Execute phases
      for (const phase of plan.phases) {
        progress.update(
          `Phase ${phase.number}/${plan.phases.length}: ${phase.description}`,
          (phase.number / plan.phases.length) * 100
        );
        
        // Execute tasks in phase (parallel where possible)
        const phaseResults = await this.executePhase(phase, results, options);
        
        // Merge results
        phaseResults.forEach((result, taskId) => {
          results.set(taskId, result);
        });
        
        // Check for critical failures
        const criticalFailure = Array.from(phaseResults.values())
          .find(r => r.status === 'failed' && r.critical);
          
        if (criticalFailure) {
          throw new WorkflowError('Critical task failed', criticalFailure);
        }
      }
      
      progress.complete('Site deployment completed successfully!');
      
      // Format results with comprehensive summary
      return this.formatWorkflowResults(results, plan);
      
    } catch (error) {
      if (options.autoRecover) {
        return this.attemptRecovery(error, results, plan);
      }
      throw error;
    }
  }
  
  private formatWorkflowResults(
    results: Map<string, TaskResult>,
    plan: ExecutionPlan
  ): MCPToolResponse {
    let text = '# 🚀 New Site Deployment Complete!\n\n';
    
    // Summary
    const successful = Array.from(results.values()).filter(r => r.status === 'success').length;
    const total = results.size;
    
    text += `✅ Successfully completed ${successful}/${total} tasks\n\n`;
    
    // Key outputs
    text += '## 🔑 Important Information\n\n';
    
    const property = results.get('property')?.output;
    const edgeHostname = results.get('edgeHostname')?.output;
    const certificate = results.get('certificate')?.output;
    const activation = results.get('activation')?.output;
    
    if (property) {
      text += `### Property\n`;
      text += `- Name: **${property.propertyName}**\n`;
      text += `- ID: \`${property.propertyId}\`\n`;
      text += `- Version: ${property.propertyVersion}\n\n`;
    }
    
    if (edgeHostname) {
      text += `### Edge Hostname\n`;
      text += `- Hostname: **${edgeHostname.edgeHostname}**\n`;
      text += `- Type: Enhanced TLS (HTTP/2 enabled)\n\n`;
    }
    
    if (certificate) {
      text += `### SSL Certificate\n`;
      text += `- Status: ${certificate.status}\n`;
      text += `- Enrollment ID: \`${certificate.enrollmentId}\`\n\n`;
    }
    
    if (activation) {
      text += `### Activation\n`;
      text += `- Network: ${activation.network}\n`;
      text += `- Status: ${activation.status}\n`;
      text += `- Activation ID: \`${activation.activationId}\`\n\n`;
    }
    
    // Next steps with hints
    const hints = userHintService.getHints({
      tool: 'workflow_new_site',
      phase: 'completed',
      results
    });
    
    text += '## 🎯 Next Steps\n\n';
    text += '1. **Verify DNS propagation**: Use `dns_record_check` to verify DNS is resolving\n';
    text += '2. **Test staging**: Visit your staging URL to test the configuration\n';
    text += '3. **Run diagnostics**: Use `diagnostic_url_health` to check connectivity\n';
    text += '4. **Activate to production**: When ready, run `property_activate` with network="PRODUCTION"\n';
    
    // Add timeline
    text += '\n## ⏱️ Deployment Timeline\n\n';
    plan.phases.forEach(phase => {
      const phaseTasks = Array.from(results.entries())
        .filter(([id]) => phase.taskIds.includes(id));
      
      text += `### ${phase.description}\n`;
      phaseTasks.forEach(([id, result]) => {
        const icon = result.status === 'success' ? '✅' : '❌';
        text += `- ${icon} ${id}: ${result.duration}ms\n`;
      });
      text += '\n';
    });
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }
}

// Pre-built workflow templates
export const workflowTemplates = {
  'new_site_deployment': {
    name: 'New Site Deployment',
    description: 'Complete setup for a new website on Akamai',
    requiredParams: ['hostname', 'siteName'],
    optionalParams: ['enableWAF', 'template', 'productId'],
    estimatedTime: '15-20 minutes'
  },
  
  'ssl_renewal': {
    name: 'SSL Certificate Renewal',
    description: 'Renew expiring SSL certificate with zero downtime',
    requiredParams: ['enrollmentId'],
    estimatedTime: '5-10 minutes'
  },
  
  'emergency_block': {
    name: 'Emergency IP/Country Block',
    description: 'Quickly block malicious traffic',
    requiredParams: ['blockList'],
    optionalParams: ['propertyIds', 'activateImmediately'],
    estimatedTime: '2-3 minutes'
  },
  
  'performance_optimization': {
    name: 'Performance Optimization',
    description: 'Apply performance best practices',
    requiredParams: ['propertyId'],
    optionalParams: ['enableHttp2', 'enableBrotli', 'cacheSettings'],
    estimatedTime: '10-15 minutes'
  }
};
```

### 4. Universal Search with AI Enhancement

#### Problem Statement
Users need to search across 21+ Akamai domains with different ID formats and naming conventions.

#### Implementation: Hybrid Index with Smart Routing

```typescript
class UniversalSearchEngine {
  private index = new SearchIndex();
  private queryAnalyzer = new QueryAnalyzer();
  private router = new SearchRouter();
  
  async search(query: string, options?: SearchOptions): Promise<MCPToolResponse> {
    const startTime = Date.now();
    
    // Analyze query intent
    const analysis = this.queryAnalyzer.analyze(query);
    
    // Add search hints
    const hints = await userHintService.getHints({
      tool: 'universal_search',
      query,
      analysis
    });
    
    try {
      // Route to appropriate search strategy
      let results: SearchResult[];
      
      if (analysis.isId) {
        // Direct ID lookup - fastest path
        results = await this.directIdLookup(analysis.idType, analysis.id);
        
      } else if (analysis.isHostname) {
        // Hostname search across multiple domains
        results = await this.hostnameSearch(query);
        
      } else if (this.index.hasResults(query)) {
        // Use cached results if fresh
        results = await this.index.getResults(query);
        
      } else {
        // Intelligent multi-domain search
        results = await this.intelligentSearch(query, analysis);
      }
      
      // Enhance results with translations
      const enhanced = await this.enhanceResults(results);
      
      // Update index for future searches
      this.index.updateResults(query, enhanced);
      
      // Format with helpful context
      return this.formatSearchResults(enhanced, {
        query,
        searchTime: Date.now() - startTime,
        hints
      });
      
    } catch (error) {
      // Helpful error response
      return this.formatSearchError(error, query, hints);
    }
  }
  
  private async intelligentSearch(
    query: string, 
    analysis: QueryAnalysis
  ): Promise<SearchResult[]> {
    const searchPlan = this.buildSearchPlan(analysis);
    const results: SearchResult[] = [];
    
    // Execute search plan with parallelization
    for (const phase of searchPlan.phases) {
      const phasePromises = phase.domains.map(domain =>
        this.searchDomain(domain, query, phase.options)
          .catch(err => {
            logger.debug(`Search failed for ${domain}:`, err);
            return [];
          })
      );
      
      const phaseResults = await Promise.all(phasePromises);
      results.push(...phaseResults.flat());
      
      // Early termination if we have enough high-quality results
      if (results.filter(r => r.relevance > 0.8).length >= 10) {
        break;
      }
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }
  
  private buildSearchPlan(analysis: QueryAnalysis): SearchPlan {
    const plan = new SearchPlan();
    
    // Phase 1: Most likely domains (parallel)
    plan.addPhase({
      domains: analysis.likelyDomains,
      options: {
        depth: 'shallow',
        timeout: 2000
      },
      parallel: true
    });
    
    // Phase 2: Property bulk search if needed
    if (analysis.mightBeInPropertyRules) {
      plan.addPhase({
        domains: ['property_rules'],
        options: {
          method: 'bulk_search',
          timeout: 5000
        }
      });
    }
    
    // Phase 3: Broader search if needed
    plan.addPhase({
      domains: ['all_remaining'],
      options: {
        depth: 'shallow',
        timeout: 3000
      },
      condition: 'if_few_results'
    });
    
    return plan;
  }
  
  private async searchDomain(
    domain: string, 
    query: string, 
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const domainSearcher = this.router.getSearcher(domain);
    
    if (!domainSearcher) {
      return [];
    }
    
    const results = await domainSearcher.search(query, options);
    
    // Calculate relevance scores
    return results.map(result => ({
      ...result,
      relevance: this.calculateRelevance(result, query),
      domain
    }));
  }
  
  private formatSearchResults(
    results: SearchResult[], 
    context: SearchContext
  ): MCPToolResponse {
    let text = `# 🔍 Search Results for "${context.query}"\n\n`;
    
    if (results.length === 0) {
      text += '## No results found\n\n';
      
      // Add helpful hints
      if (context.hints.suggestions.length > 0) {
        text += '### 💡 Suggestions\n';
        context.hints.suggestions.forEach(suggestion => {
          text += `- ${suggestion}\n`;
        });
      }
      
      return { content: [{ type: 'text', text }] };
    }
    
    // Summary
    text += `Found **${results.length} results** in ${context.searchTime}ms\n\n`;
    
    // Group by domain
    const byDomain = this.groupByDomain(results);
    
    for (const [domain, domainResults] of byDomain) {
      const domainInfo = this.getDomainInfo(domain);
      text += `## ${domainInfo.icon} ${domainInfo.name}\n\n`;
      
      // Show top results for this domain
      const topResults = domainResults.slice(0, 5);
      
      for (const result of topResults) {
        text += `### ${result.name}\n`;
        text += `- Type: ${result.type}\n`;
        text += `- ID: \`${result.id}\`\n`;
        
        // Add translated names
        if (result.translatedName) {
          text += `- Human Name: ${result.translatedName}\n`;
        }
        
        // Add context
        if (result.context) {
          text += `- Context: ${result.context}\n`;
        }
        
        // Add relevance indicator
        const stars = '⭐'.repeat(Math.round(result.relevance * 5));
        text += `- Relevance: ${stars}\n`;
        
        text += '\n';
      }
      
      if (domainResults.length > 5) {
        text += `*... and ${domainResults.length - 5} more results in ${domain}*\n\n`;
      }
    }
    
    // Add action hints
    if (context.hints.actions.length > 0) {
      text += '## 🎯 Suggested Actions\n';
      context.hints.actions.forEach((action, index) => {
        text += `${index + 1}. ${action.description}`;
        if (action.tool) {
          text += ` - Run: \`${action.tool}\``;
        }
        text += '\n';
      });
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }
}

// Enhanced search tools
export const searchTools = {
  'search': {
    description: 'Universal search across all Akamai resources',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      domains: z.array(z.string()).optional().describe('Limit to specific domains'),
      limit: z.number().optional().default(20)
    }),
    handler: async (args) => {
      const engine = new UniversalSearchEngine();
      return engine.search(args.query, {
        domains: args.domains,
        limit: args.limit
      });
    }
  },
  
  'search_by_hostname': {
    description: 'Find all resources related to a hostname',
    inputSchema: z.object({
      hostname: z.string()
    }),
    handler: async (args) => {
      const engine = new UniversalSearchEngine();
      return engine.hostnameSearch(args.hostname);
    }
  }
};
```

### 5. Error Translation and Recovery System

#### Problem Statement
Akamai APIs return cryptic errors that don't guide users toward solutions.

#### Implementation: Contextual Error Recovery Engine

```typescript
class ErrorRecoveryEngine {
  private patterns = new ErrorPatternRegistry();
  private strategies = new RecoveryStrategyRegistry();
  
  async handleError(
    error: any, 
    context: ErrorContext
  ): Promise<MCPToolResponse> {
    // Identify error pattern
    const pattern = this.patterns.identify(error);
    
    // Get recovery strategies
    const strategies = this.strategies.getStrategies(pattern, context);
    
    // Build recovery response
    const recovery = await this.buildRecoveryPlan(
      error,
      pattern,
      strategies,
      context
    );
    
    // Format helpful error response
    return this.formatErrorResponse(recovery);
  }
  
  private async buildRecoveryPlan(
    error: any,
    pattern: ErrorPattern,
    strategies: RecoveryStrategy[],
    context: ErrorContext
  ): Promise<RecoveryPlan> {
    const plan: RecoveryPlan = {
      explanation: this.explainError(pattern, context),
      canAutoRecover: false,
      autoRecoverySteps: [],
      manualSteps: [],
      preventionTips: []
    };
    
    // Check for auto-recovery
    for (const strategy of strategies) {
      if (await strategy.canAutoRecover(error, context)) {
        plan.canAutoRecover = true;
        plan.autoRecoverySteps = await strategy.getAutoSteps(error, context);
        break;
      }
    }
    
    // Build manual recovery steps
    if (!plan.canAutoRecover) {
      plan.manualSteps = await this.buildManualSteps(pattern, context);
    }
    
    // Add prevention tips
    plan.preventionTips = this.getPreventionTips(pattern);
    
    // Add hints from hint service
    const hints = await userHintService.getErrorHints({
      error,
      pattern,
      context
    });
    
    plan.hints = hints;
    
    return plan;
  }
  
  private explainError(pattern: ErrorPattern, context: ErrorContext): string {
    const explanations: Record<string, (p: ErrorPattern, c: ErrorContext) => string> = {
      CONTRACT_GROUP_MISSING: (p, c) => 
        `This operation requires both a contract ID and group ID, but the API doesn't provide an easy way to discover them. Let me help you find them.`,
        
      VERSION_LOCKED: (p, c) =>
        `The property version ${c.version} is currently ${c.status} and cannot be modified. You need to create a new version first.`,
        
      VALIDATION_FAILED: (p, c) =>
        `The ${p.field} value "${p.value}" is invalid. ${p.reason}. Valid options are: ${p.validOptions?.join(', ') || 'check documentation'}.`,
        
      PERMISSION_DENIED: (p, c) =>
        `Your API credentials don't have permission to ${c.action}. This might be because:\n` +
        `1. The resource belongs to a different account (use 'customer' parameter)\n` +
        `2. Your API client lacks the required permissions\n` +
        `3. The operation requires additional authentication`,
        
      RESOURCE_NOT_FOUND: (p, c) =>
        `Cannot find ${c.resourceType} "${c.resourceId}". This could mean:\n` +
        `1. It was deleted\n` +
        `2. You're looking in the wrong account\n` +
        `3. You need to use the correct ID format (${this.getIdFormat(c.resourceType)})`,
        
      RATE_LIMITED: (p, c) =>
        `You've exceeded the API rate limit. Current limit: ${p.limit} requests per ${p.window}. ` +
        `Wait ${p.retryAfter} seconds before retrying.`,
        
      CIRCULAR_DEPENDENCY: (p, c) =>
        `This API has a circular dependency: ${p.dependency}. ` +
        `I'll work around this by discovering the required information through alternative methods.`
    };
    
    const explainFn = explanations[pattern.type] || this.defaultExplanation;
    return explainFn(pattern, context);
  }
  
  private formatErrorResponse(recovery: RecoveryPlan): MCPToolResponse {
    let text = '# ❌ Operation Failed\n\n';
    
    // Clear explanation
    text += `## What happened?\n${recovery.explanation}\n\n`;
    
    // Auto-recovery available?
    if (recovery.canAutoRecover) {
      text += '## 🔧 Auto-Recovery Available\n';
      text += 'I can automatically fix this issue. Here\'s what I\'ll do:\n\n';
      recovery.autoRecoverySteps.forEach((step, index) => {
        text += `${index + 1}. ${step.description}\n`;
      });
      text += '\n*Run the command again with `--auto-recover` to proceed.*\n\n';
    }
    
    // Manual steps
    if (recovery.manualSteps.length > 0) {
      text += '## 🛠️ How to Fix\n';
      recovery.manualSteps.forEach((step, index) => {
        text += `${index + 1}. ${step.description}`;
        if (step.command) {
          text += `\n   \`\`\`\n   ${step.command}\n   \`\`\``;
        }
        text += '\n\n';
      });
    }
    
    // Prevention tips
    if (recovery.preventionTips.length > 0) {
      text += '## 💡 Prevention Tips\n';
      recovery.preventionTips.forEach(tip => {
        text += `- ${tip}\n`;
      });
      text += '\n';
    }
    
    // Hints
    if (recovery.hints) {
      if (recovery.hints.related_tools.length > 0) {
        text += '## 🔗 Related Tools\n';
        recovery.hints.related_tools.forEach(tool => {
          text += `- \`${tool.name}\`: ${tool.description}\n`;
        });
      }
    }
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }
}

// Common error patterns
const commonErrorPatterns = [
  {
    pattern: /contractId.*required/i,
    type: 'CONTRACT_GROUP_MISSING',
    autoRecoverable: true,
    recovery: async (context) => {
      // Auto-discover contracts and groups
      const discovery = new ContractGroupDiscovery();
      return discovery.discover(context.customer);
    }
  },
  {
    pattern: /version.*already.*active/i,
    type: 'VERSION_LOCKED',
    autoRecoverable: true,
    recovery: async (context) => {
      // Create new version automatically
      const propertyClient = context.client;
      return propertyClient.createVersion({
        propertyId: context.propertyId,
        baseVersion: context.version
      });
    }
  },
  {
    pattern: /rate.*limit.*exceeded/i,
    type: 'RATE_LIMITED',
    autoRecoverable: true,
    recovery: async (context) => {
      // Wait and retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, context.retryAfter * 1000));
      return context.retry();
    }
  }
];
```

## Implementation Schedule

### Week 1: Foundation (Immediate Impact)
1. **Day 1-2**: Implement User Hints System
   - Create core service and domain providers
   - Integrate with top 10 most-used tools
   
2. **Day 3-4**: Implement Contract/Group Auto-Discovery
   - Parallel discovery with progress
   - Smart caching
   
3. **Day 5**: Implement DNS Changelist Abstraction
   - Batching and auto-recovery
   - Progress reporting

### Week 2: Core Enhancements
1. **Day 1-2**: Extend User Hints to all domains
   - Create providers for remaining 11+ domains
   - Add personalization logic
   
2. **Day 3-4**: Implement Universal Search Engine
   - Multi-domain search with routing
   - Result enhancement
   
3. **Day 5**: Implement Error Recovery Engine
   - Pattern matching and strategies
   - Auto-recovery capabilities

### Week 3: Advanced Workflows
1. **Day 1-3**: Implement Workflow Orchestrator
   - Dependency resolution
   - Parallel execution
   
2. **Day 4-5**: Create pre-built workflows
   - New site deployment
   - Emergency responses
   - Performance optimization

### Week 4: Polish and Scale
1. **Day 1-2**: Performance optimization
   - Caching strategies
   - Request batching
   
2. **Day 3-4**: Comprehensive testing
   - End-to-end workflows
   - Error scenarios
   
3. **Day 5**: Documentation and release

## Success Metrics

### User Experience Metrics
- Time to first successful API call: <30 seconds (from 5+ minutes)
- Error resolution rate: >80% auto-resolved
- User satisfaction score: >4.5/5
- Support ticket reduction: 50%

### Technical Metrics
- API call reduction: 60% through smart caching and batching
- Parallel execution: 3x faster for multi-step operations
- Error recovery success: 75% of common errors
- Hint coverage: 100% of tools have contextual hints

### Business Impact
- New user onboarding time: 80% reduction
- Power user productivity: 2x improvement
- Documentation lookups: 70% reduction
- Customer retention: 25% improvement

## Continuous Improvement Process

### Daily
- Monitor error patterns and add recovery strategies
- Update hint content based on user feedback
- Optimize frequently used paths

### Weekly
- Review user feedback and adjust workflows
- Add new error patterns and solutions
- Update search index with new patterns

### Monthly
- Analyze usage patterns and add new abstractions
- Create new workflow templates
- Update documentation with real examples

## Conclusion

This KAIZEN implementation plan transforms ALECS from a thin API wrapper into an intelligent assistant that:
1. **Guides users** with contextual hints at every step
2. **Prevents errors** before they happen
3. **Recovers gracefully** when things go wrong
4. **Simplifies complexity** through smart abstractions
5. **Accelerates workflows** through orchestration

The key to success is the User Hints System as the foundation - it ensures every user, regardless of experience level, gets the help they need exactly when they need it. Combined with the other improvements, this creates a tool that truly delights users and makes Akamai's powerful but complex APIs accessible to everyone.