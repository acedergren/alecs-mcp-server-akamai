/**
 * ALECS Workflow Engine - Enterprise-Grade Orchestration
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides state management for complex multi-step workflows
 * - Implements recovery and rollback capabilities
 * - Supports parallel and sequential execution patterns
 * - Enables workflow templates for common operations
 * 
 * This engine coordinates multiple MCP tools to perform complex
 * operations like site migrations, zero-downtime deployments, and
 * multi-property activations.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/pino-logger';
import { AkamaiClient } from '../akamai-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Workflow state definitions
 */
export enum WorkflowState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

export enum StepState {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  tool: string; // MCP tool name
  args: Record<string, any>;
  dependencies?: string[]; // Step IDs that must complete first
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier?: number;
  };
  rollback?: {
    tool: string;
    args: Record<string, any>;
  };
  continueOnError?: boolean;
  timeout?: number; // milliseconds
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  customer?: string;
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
  rollbackStrategy?: 'all' | 'failed' | 'none';
  maxDuration?: number; // milliseconds
}

/**
 * Workflow execution state
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  state: WorkflowState;
  startedAt: Date;
  completedAt?: Date;
  currentStep?: string;
  steps: Map<string, StepExecution>;
  context: Record<string, any>;
  error?: Error;
}

/**
 * Step execution state
 */
export interface StepExecution {
  stepId: string;
  state: StepState;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  result?: any;
  error?: Error;
  rollbackResult?: any;
}

/**
 * Workflow engine events
 */
export interface WorkflowEngineEvents {
  'workflow:started': (execution: WorkflowExecution) => void;
  'workflow:completed': (execution: WorkflowExecution) => void;
  'workflow:failed': (execution: WorkflowExecution, error: Error) => void;
  'workflow:cancelled': (execution: WorkflowExecution) => void;
  'step:started': (execution: WorkflowExecution, step: WorkflowStep) => void;
  'step:completed': (execution: WorkflowExecution, step: WorkflowStep, result: any) => void;
  'step:failed': (execution: WorkflowExecution, step: WorkflowStep, error: Error) => void;
  'step:retry': (execution: WorkflowExecution, step: WorkflowStep, attempt: number) => void;
  'rollback:started': (execution: WorkflowExecution) => void;
  'rollback:completed': (execution: WorkflowExecution) => void;
}

/**
 * Tool executor interface
 */
export interface ToolExecutor {
  execute(toolName: string, args: Record<string, any>): Promise<any>;
}

/**
 * Workflow Engine implementation
 */
export class WorkflowEngine extends EventEmitter {
  private executions: Map<string, WorkflowExecution> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private toolExecutor: ToolExecutor;

  constructor(toolExecutor: ToolExecutor, _client?: AkamaiClient) {
    super();
    this.toolExecutor = toolExecutor;
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    logger.info(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create execution instance
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      state: WorkflowState.PENDING,
      startedAt: new Date(),
      steps: new Map(),
      context: { ...context, customer: workflow.customer || context['customer'] }
    };

    // Initialize step states
    for (const step of workflow.steps) {
      execution.steps.set(step.id, {
        stepId: step.id,
        state: StepState.PENDING,
        attempts: 0
      });
    }

    this.executions.set(execution.id, execution);
    
    // Start execution
    execution.state = WorkflowState.RUNNING;
    this.emit('workflow:started', execution);

    try {
      await this.executeSteps(workflow, execution);
      
      execution.state = WorkflowState.COMPLETED;
      execution.completedAt = new Date();
      this.emit('workflow:completed', execution);
    } catch (error) {
      execution.state = WorkflowState.FAILED;
      execution.error = error as Error;
      execution.completedAt = new Date();
      this.emit('workflow:failed', execution, error as Error);

      // Handle rollback if configured
      if (workflow.rollbackStrategy && workflow.rollbackStrategy !== 'none') {
        await this.rollbackWorkflow(workflow, execution);
      }
    }

    return execution;
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    const completed = new Set<string>();
    const failed = new Set<string>();

    while (completed.size + failed.size < workflow.steps.length) {
      // Find steps ready to execute
      const readySteps = workflow.steps.filter(step => {
        if (completed.has(step.id) || failed.has(step.id)) {
          return false;
        }

        // Check dependencies
        if (step.dependencies) {
          return step.dependencies.every(dep => completed.has(dep));
        }

        return true;
      });

      if (readySteps.length === 0) {
        // Check for deadlock
        const pendingSteps = workflow.steps.filter(
          step => !completed.has(step.id) && !failed.has(step.id)
        );
        
        if (pendingSteps.length > 0) {
          throw new Error(
            `Workflow deadlock: ${pendingSteps.length} steps cannot proceed`
          );
        }
        break;
      }

      // Execute ready steps in parallel
      const stepPromises = readySteps.map(step => 
        this.executeStep(workflow, execution, step)
          .then(() => {
            completed.add(step.id);
          })
          .catch(error => {
            if (!step.continueOnError) {
              throw error;
            }
            failed.add(step.id);
            logger.warn(`Step ${step.id} failed but continuing`, { error });
          })
      );

      await Promise.all(stepPromises);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    _workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<void> {
    const stepExecution = execution.steps.get(step.id)!;
    stepExecution.startedAt = new Date();
    stepExecution.state = StepState.RUNNING;
    execution.currentStep = step.id;

    this.emit('step:started', execution, step);

    const retryPolicy = step.retryPolicy || {
      maxAttempts: 1,
      backoffMs: 1000
    };

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        stepExecution.attempts = attempt;

        if (attempt > 1) {
          this.emit('step:retry', execution, step, attempt);
          const backoff = retryPolicy.backoffMs * 
            Math.pow(retryPolicy.backoffMultiplier || 2, attempt - 2);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }

        // Merge context into step args
        const args = this.interpolateArgs(step.args, execution.context);

        // Execute with timeout if specified
        let result: any;
        if (step.timeout) {
          result = await this.executeWithTimeout(
            this.toolExecutor.execute(step.tool, args),
            step.timeout
          );
        } else {
          result = await this.toolExecutor.execute(step.tool, args);
        }

        // Store result in context for subsequent steps
        execution.context[`${step.id}_result`] = result;
        stepExecution.result = result;
        stepExecution.state = StepState.COMPLETED;
        stepExecution.completedAt = new Date();

        this.emit('step:completed', execution, step, result);
        return;

      } catch (error) {
        lastError = error as Error;
        logger.error(`Step ${step.id} failed (attempt ${attempt})`, { error });
      }
    }

    // All attempts failed
    stepExecution.state = StepState.FAILED;
    stepExecution.error = lastError;
    stepExecution.completedAt = new Date();
    
    this.emit('step:failed', execution, step, lastError!);
    throw lastError;
  }

  /**
   * Rollback a workflow
   */
  private async rollbackWorkflow(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    execution.state = WorkflowState.ROLLING_BACK;
    this.emit('rollback:started', execution);

    try {
      const stepsToRollback = workflow.steps.filter(step => {
        const stepExec = execution.steps.get(step.id)!;
        
        if (workflow.rollbackStrategy === 'all') {
          return stepExec.state === StepState.COMPLETED && step.rollback;
        } else if (workflow.rollbackStrategy === 'failed') {
          return stepExec.state === StepState.FAILED && step.rollback;
        }
        
        return false;
      }).reverse(); // Rollback in reverse order

      for (const step of stepsToRollback) {
        try {
          const args = this.interpolateArgs(
            step.rollback!.args,
            execution.context
          );
          
          const result = await this.toolExecutor.execute(
            step.rollback!.tool,
            args
          );
          
          const stepExec = execution.steps.get(step.id)!;
          stepExec.rollbackResult = result;
          stepExec.state = StepState.ROLLED_BACK;
          
          logger.info(`Rolled back step: ${step.id}`);
        } catch (error) {
          logger.error(`Failed to rollback step: ${step.id}`, { error });
        }
      }

      execution.state = WorkflowState.ROLLED_BACK;
      this.emit('rollback:completed', execution);
    } catch (error) {
      logger.error('Rollback failed', { error });
      execution.state = WorkflowState.FAILED;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  }

  /**
   * Interpolate arguments with context values
   */
  private interpolateArgs(
    args: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Template variable
        const varName = value.slice(2, -1);
        result[key] = this.getContextValue(context, varName);
      } else if (typeof value === 'object' && value !== null) {
        // Recurse into objects
        result[key] = this.interpolateArgs(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get value from context using dot notation
   */
  private getContextValue(context: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.state !== WorkflowState.RUNNING) {
      throw new Error(`Cannot cancel workflow in state: ${execution.state}`);
    }

    execution.state = WorkflowState.CANCELLED;
    execution.completedAt = new Date();
    this.emit('workflow:cancelled', execution);
  }

  /**
   * List all workflow definitions
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * List all executions
   */
  listExecutions(options?: {
    workflowId?: string;
    state?: WorkflowState;
    limit?: number;
  }): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());

    if (options?.workflowId) {
      executions = executions.filter(e => e.workflowId === options.workflowId);
    }

    if (options?.state) {
      executions = executions.filter(e => e.state === options.state);
    }

    // Sort by start time, newest first
    executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (options?.limit) {
      executions = executions.slice(0, options.limit);
    }

    return executions;
  }
}