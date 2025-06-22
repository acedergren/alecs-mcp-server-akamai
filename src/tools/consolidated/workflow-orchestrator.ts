/**
 * Workflow Orchestrator
 * Central orchestration engine for multi-step workflows and tool coordination
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger';
import { WorkflowContextManager } from './workflow-context-manager';
import { IntelligentToolSuggester } from './intelligent-tool-suggester';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  preconditions?: WorkflowCondition[];
  onSuccess?: WorkflowAction[];
  onFailure?: WorkflowAction[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  tool: string;
  description?: string;
  parameters: Record<string, any>;
  conditions?: WorkflowCondition[];
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
  errorHandling?: 'fail' | 'continue' | 'retry';
  timeout?: number;
}

export interface WorkflowCondition {
  type: 'value' | 'exists' | 'regex' | 'custom';
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'matches' | 'exists';
  value?: any;
  customValidator?: (context: any) => boolean;
}

export interface WorkflowAction {
  type: 'notify' | 'log' | 'setVariable' | 'runWorkflow';
  parameters: Record<string, any>;
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  steps: WorkflowStepExecution[];
  variables: Record<string, any>;
  error?: string;
}

export interface WorkflowStepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  attempts: number;
}

export class WorkflowOrchestrator {
  private static instance: WorkflowOrchestrator;
  private workflows: Map<string, WorkflowDefinition>;
  private executions: Map<string, WorkflowExecution>;
  private contextManager: WorkflowContextManager;
  private toolSuggester: IntelligentToolSuggester;
  
  private constructor() {
    this.workflows = new Map();
    this.executions = new Map();
    this.contextManager = WorkflowContextManager.getInstance();
    this.toolSuggester = IntelligentToolSuggester.getInstance();
    this.initializeBuiltInWorkflows();
  }
  
  static getInstance(): WorkflowOrchestrator {
    if (!WorkflowOrchestrator.instance) {
      WorkflowOrchestrator.instance = new WorkflowOrchestrator();
    }
    return WorkflowOrchestrator.instance;
  }
  
  /**
   * Initialize built-in workflows
   */
  private initializeBuiltInWorkflows(): void {
    // Property onboarding workflow
    this.registerWorkflow({
      id: 'property-onboarding',
      name: 'Property Onboarding',
      description: 'Complete property setup from creation to production',
      category: 'property',
      steps: [
        {
          id: 'validate-prerequisites',
          name: 'Validate Prerequisites',
          tool: 'list_contracts',
          parameters: {
            customer: '${customer}',
          },
        },
        {
          id: 'create-property',
          name: 'Create Property',
          tool: 'create_property',
          parameters: {
            propertyName: '${propertyName}',
            contractId: '${contractId}',
            groupId: '${groupId}',
            productId: '${productId}',
            customer: '${customer}',
          },
        },
        {
          id: 'add-hostnames',
          name: 'Add Hostnames',
          tool: 'add_property_hostname',
          parameters: {
            propertyId: '${steps.create-property.result.propertyId}',
            hostnames: '${hostnames}',
            customer: '${customer}',
          },
        },
        {
          id: 'configure-security',
          name: 'Configure Security',
          tool: 'update_property_rules',
          parameters: {
            propertyId: '${steps.create-property.result.propertyId}',
            rules: '${securityRules}',
            customer: '${customer}',
          },
        },
        {
          id: 'activate-staging',
          name: 'Activate to Staging',
          tool: 'activate_property',
          parameters: {
            propertyId: '${steps.create-property.result.propertyId}',
            version: 1,
            network: 'staging',
            customer: '${customer}',
          },
        },
        {
          id: 'validate-staging',
          name: 'Validate Staging',
          tool: 'get_activation_status',
          parameters: {
            propertyId: '${steps.create-property.result.propertyId}',
            activationId: '${steps.activate-staging.result.activationId}',
            customer: '${customer}',
          },
          conditions: [
            {
              type: 'value',
              field: 'steps.activate-staging.result.status',
              operator: 'equals',
              value: 'ACTIVATED',
            },
          ],
        },
      ],
    });
    
    // SSL certificate deployment workflow
    this.registerWorkflow({
      id: 'ssl-deployment',
      name: 'SSL Certificate Deployment',
      description: 'Deploy SSL certificate to property',
      category: 'certificate',
      steps: [
        {
          id: 'validate-domains',
          name: 'Validate Domains',
          tool: 'validate_hostnames_bulk',
          parameters: {
            hostnames: '${hostnames}',
          },
        },
        {
          id: 'create-enrollment',
          name: 'Create Certificate Enrollment',
          tool: 'create_enrollment',
          parameters: {
            contractId: '${contractId}',
            domains: '${hostnames}',
            validationType: 'dv',
          },
        },
        {
          id: 'complete-validation',
          name: 'Complete Domain Validation',
          tool: 'complete_dv_validation',
          parameters: {
            enrollmentId: '${steps.create-enrollment.result.enrollmentId}',
          },
        },
        {
          id: 'deploy-certificate',
          name: 'Deploy Certificate',
          tool: 'deploy_certificate',
          parameters: {
            enrollmentId: '${steps.create-enrollment.result.enrollmentId}',
            propertyId: '${propertyId}',
          },
        },
      ],
    });
    
    // Performance optimization workflow
    this.registerWorkflow({
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Analyze and optimize property performance',
      category: 'performance',
      steps: [
        {
          id: 'analyze-current',
          name: 'Analyze Current Performance',
          tool: 'analyze_performance',
          parameters: {
            propertyId: '${propertyId}',
            duration: '7d',
          },
        },
        {
          id: 'identify-issues',
          name: 'Identify Performance Issues',
          tool: 'identify_performance_issues',
          parameters: {
            metrics: '${steps.analyze-current.result}',
          },
        },
        {
          id: 'generate-recommendations',
          name: 'Generate Recommendations',
          tool: 'generate_performance_recommendations',
          parameters: {
            issues: '${steps.identify-issues.result}',
            propertyId: '${propertyId}',
          },
        },
        {
          id: 'apply-optimizations',
          name: 'Apply Optimizations',
          tool: 'apply_performance_optimizations',
          parameters: {
            propertyId: '${propertyId}',
            recommendations: '${steps.generate-recommendations.result}',
          },
        },
      ],
    });
  }
  
  /**
   * Register a workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    logger.info(`Registered workflow: ${workflow.name}`);
  }
  
  /**
   * List available workflows
   */
  listWorkflows(category?: string): WorkflowDefinition[] {
    const workflows = Array.from(this.workflows.values());
    if (category) {
      return workflows.filter(w => w.category === category);
    }
    return workflows;
  }
  
  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | null {
    return this.workflows.get(workflowId) || null;
  }
  
  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    variables: Record<string, any>,
    options?: {
      dryRun?: boolean;
      stepCallback?: (step: WorkflowStepExecution) => void;
    }
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    // Create execution record
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: WorkflowExecution = {
      workflowId,
      executionId,
      status: 'pending',
      startTime: new Date(),
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
        attempts: 0,
      })),
      variables: { ...workflow.variables, ...variables },
    };
    
    this.executions.set(executionId, execution);
    
    // Set active workflow in context
    this.contextManager.setActiveWorkflow(
      workflow.name,
      workflow.steps.map(s => s.name)
    );
    
    try {
      // Check preconditions
      if (workflow.preconditions) {
        const preconditionsMet = await this.checkConditions(
          workflow.preconditions,
          execution
        );
        if (!preconditionsMet) {
          throw new Error('Workflow preconditions not met');
        }
      }
      
      // Execute workflow
      execution.status = 'running';
      
      if (options?.dryRun) {
        // Dry run - just return the plan
        execution.status = 'completed';
        return execution;
      }
      
      // Execute each step
      for (const step of workflow.steps) {
        const stepExecution = execution.steps.find(s => s.stepId === step.id)!;
        
        try {
          // Check step conditions
          if (step.conditions) {
            const conditionsMet = await this.checkConditions(
              step.conditions,
              execution
            );
            if (!conditionsMet) {
              stepExecution.status = 'skipped';
              continue;
            }
          }
          
          // Execute step
          execution.currentStep = step.id;
          const result = await this.executeStep(step, execution);
          
          stepExecution.status = 'completed';
          stepExecution.result = result;
          
          // Update context
          this.contextManager.advanceWorkflowStep();
          
          // Call step callback
          if (options?.stepCallback) {
            options.stepCallback(stepExecution);
          }
          
        } catch (error) {
          stepExecution.status = 'failed';
          stepExecution.error = error instanceof Error ? error.message : String(error);
          
          if (step.errorHandling === 'continue') {
            logger.warn(`Step ${step.id} failed but continuing`, error);
          } else {
            throw error;
          }
        }
      }
      
      // Workflow completed successfully
      execution.status = 'completed';
      execution.endTime = new Date();
      
      // Execute success actions
      if (workflow.onSuccess) {
        await this.executeActions(workflow.onSuccess, execution);
      }
      
    } catch (error) {
      // Workflow failed
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : String(error);
      
      // Execute failure actions
      if (workflow.onFailure) {
        await this.executeActions(workflow.onFailure, execution);
      }
      
      throw error;
      
    } finally {
      // Complete workflow in context
      this.contextManager.completeWorkflow();
    }
    
    return execution;
  }
  
  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    const stepExecution = execution.steps.find(s => s.stepId === step.id)!;
    stepExecution.status = 'running';
    stepExecution.startTime = new Date();
    stepExecution.attempts++;
    
    try {
      // Resolve parameters
      const resolvedParams = this.resolveParameters(
        step.parameters,
        execution
      );
      
      // Execute tool
      const result = await this.executeTool(
        step.tool,
        resolvedParams,
        step.timeout
      );
      
      stepExecution.endTime = new Date();
      
      // Store result in execution context
      this.setExecutionVariable(execution, `steps.${step.id}.result`, result);
      
      return result;
      
    } catch (error) {
      stepExecution.endTime = new Date();
      
      // Handle retry
      if (step.retryPolicy && stepExecution.attempts < step.retryPolicy.maxAttempts) {
        logger.warn(`Step ${step.id} failed, retrying...`, error);
        await this.sleep(step.retryPolicy.backoffMs * stepExecution.attempts);
        return this.executeStep(step, execution);
      }
      
      throw error;
    }
  }
  
  /**
   * Execute a tool
   */
  private async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    timeout?: number
  ): Promise<any> {
    // This would integrate with the actual tool execution
    // For now, simulate tool execution
    logger.info(`Executing tool: ${toolName}`, parameters);
    
    // Record operation in context
    this.contextManager.updateFromOperation({
      timestamp: new Date(),
      tool: toolName,
      operation: toolName,
      parameters,
      success: true,
    });
    
    // Simulate async operation
    await this.sleep(100);
    
    return {
      success: true,
      toolName,
      parameters,
      result: 'Mock result',
    };
  }
  
  /**
   * Check conditions
   */
  private async checkConditions(
    conditions: WorkflowCondition[],
    execution: WorkflowExecution
  ): Promise<boolean> {
    for (const condition of conditions) {
      const value = this.getExecutionVariable(execution, condition.field);
      
      switch (condition.type) {
        case 'value':
          switch (condition.operator) {
            case 'equals':
              if (value !== condition.value) return false;
              break;
            case 'notEquals':
              if (value === condition.value) return false;
              break;
            case 'contains':
              if (!String(value).includes(String(condition.value))) return false;
              break;
          }
          break;
          
        case 'exists':
          if (condition.operator === 'exists' && value === undefined) return false;
          break;
          
        case 'regex':
          if (condition.operator === 'matches') {
            const regex = new RegExp(condition.value);
            if (!regex.test(String(value))) return false;
          }
          break;
          
        case 'custom':
          if (condition.customValidator && !condition.customValidator(execution)) {
            return false;
          }
          break;
      }
    }
    
    return true;
  }
  
  /**
   * Execute workflow actions
   */
  private async executeActions(
    actions: WorkflowAction[],
    execution: WorkflowExecution
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'log':
          logger.info('Workflow action:', action.parameters);
          break;
          
        case 'setVariable':
          this.setExecutionVariable(
            execution,
            action.parameters.name,
            action.parameters.value
          );
          break;
          
        case 'runWorkflow':
          await this.executeWorkflow(
            action.parameters.workflowId,
            action.parameters.variables || {}
          );
          break;
      }
    }
  }
  
  /**
   * Resolve parameters with variable substitution
   */
  private resolveParameters(
    parameters: Record<string, any>,
    execution: WorkflowExecution
  ): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Variable reference
        const varName = value.slice(2, -1);
        resolved[key] = this.getExecutionVariable(execution, varName);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveParameters(value, execution);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }
  
  /**
   * Get variable from execution context
   */
  private getExecutionVariable(
    execution: WorkflowExecution,
    path: string
  ): any {
    const parts = path.split('.');
    let value: any = execution.variables;
    
    for (const part of parts) {
      if (part === 'steps') {
        // Special handling for step results
        value = execution;
      } else if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * Set variable in execution context
   */
  private setExecutionVariable(
    execution: WorkflowExecution,
    path: string,
    value: any
  ): void {
    const parts = path.split('.');
    let target: any = execution.variables;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === 'steps') {
        target = execution;
      } else {
        if (!target[part]) {
          target[part] = {};
        }
        target = target[part];
      }
    }
    
    target[parts[parts.length - 1]] = value;
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get execution status
   */
  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }
  
  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      return true;
    }
    return false;
  }
}