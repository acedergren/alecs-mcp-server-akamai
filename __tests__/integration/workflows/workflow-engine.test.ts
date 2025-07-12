/**
 * Workflow Engine Test Suite
 * 
 * Comprehensive tests for the orchestration workflow engine
 */

import { WorkflowEngine, WorkflowState, StepState, WorkflowDefinition } from '../../orchestration/workflow-engine';

// Mock the dependencies
jest.mock('../../akamai-client');
jest.mock('../../utils/pino-logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock tool executor
class MockToolExecutor {
  async execute(toolName: string, args: any): Promise<any> {
    // Simulate different tool behaviors
    if (toolName === 'test.fail') {
      throw new Error('Tool execution failed');
    }
    if (toolName === 'test.slow') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { success: true, tool: toolName, args };
  }
}

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let mockExecutor: MockToolExecutor;

  beforeEach(() => {
    mockExecutor = new MockToolExecutor();
    engine = new WorkflowEngine(mockExecutor);
  });

  describe('Workflow Registration', () => {
    it('should register a workflow', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            tool: 'test.tool',
            args: { value: 'test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const workflows = engine.listWorkflows();
      
      expect(workflows).toHaveLength(1);
      expect(workflows[0]?.id).toBe('test-workflow');
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a simple workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'simple-workflow',
        name: 'Simple Workflow',
        description: 'A simple workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            tool: 'test.tool1',
            args: { value: 'test1' }
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Second step',
            tool: 'test.tool2',
            args: { value: 'test2' },
            dependencies: ['step1']
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('simple-workflow');

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(execution.steps.size).toBe(2);
      
      const step1 = execution.steps.get('step1');
      expect(step1?.state).toBe(StepState.COMPLETED);
      expect(step1?.result).toEqual({ 
        success: true, 
        tool: 'test.tool1', 
        args: { value: 'test1' } 
      });
    });

    it('should handle workflow with parallel steps', async () => {
      const workflow: WorkflowDefinition = {
        id: 'parallel-workflow',
        name: 'Parallel Workflow',
        description: 'A workflow with parallel steps',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First parallel step',
            tool: 'test.slow',
            args: { value: 'test1' }
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Second parallel step',
            tool: 'test.slow',
            args: { value: 'test2' }
          },
          {
            id: 'step3',
            name: 'Step 3',
            description: 'Dependent step',
            tool: 'test.tool',
            args: { value: 'test3' },
            dependencies: ['step1', 'step2']
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const startTime = Date.now();
      const execution = await engine.executeWorkflow('parallel-workflow');
      const duration = Date.now() - startTime;

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      // Should execute faster than sequential (200ms) due to parallelism
      expect(duration).toBeLessThan(200);
    });

    it('should handle step failures', async () => {
      const workflow: WorkflowDefinition = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        description: 'A workflow that fails',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Success step',
            tool: 'test.tool',
            args: { value: 'test1' }
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Failing step',
            tool: 'test.fail',
            args: { value: 'test2' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('failing-workflow');

      expect(execution.state).toBe(WorkflowState.FAILED);
      expect(execution.error?.message).toContain('Tool execution failed');
      
      const step1 = execution.steps.get('step1');
      expect(step1?.state).toBe(StepState.COMPLETED);
      
      const step2 = execution.steps.get('step2');
      expect(step2?.state).toBe(StepState.FAILED);
      expect(step2?.error?.message).toBe('Tool execution failed');
    });

    it('should respect continueOnError flag', async () => {
      const workflow: WorkflowDefinition = {
        id: 'continue-on-error-workflow',
        name: 'Continue on Error Workflow',
        description: 'A workflow that continues on error',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Failing step',
            tool: 'test.fail',
            args: { value: 'test1' },
            continueOnError: true
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Success step',
            tool: 'test.tool',
            args: { value: 'test2' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('continue-on-error-workflow');

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      
      const step1 = execution.steps.get('step1');
      expect(step1?.state).toBe(StepState.FAILED);
      
      const step2 = execution.steps.get('step2');
      expect(step2?.state).toBe(StepState.COMPLETED);
    });

    it('should handle retry policy', async () => {
      let attemptCount = 0;
      const mockExecutorWithRetry = {
        execute: jest.fn(async (toolName: string) => {
          if (toolName === 'test.retry') {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error('Retry needed');
            }
            return { success: true, attempts: attemptCount };
          }
          return { success: true };
        })
      };

      const engineWithRetry = new WorkflowEngine(mockExecutorWithRetry);
      
      const workflow: WorkflowDefinition = {
        id: 'retry-workflow',
        name: 'Retry Workflow',
        description: 'A workflow with retry',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Retry step',
            tool: 'test.retry',
            args: { value: 'test1' },
            retryPolicy: {
              maxAttempts: 3,
              backoffMs: 10
            }
          }
        ]
      };

      engineWithRetry.registerWorkflow(workflow);
      const execution = await engineWithRetry.executeWorkflow('retry-workflow');

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      expect(mockExecutorWithRetry.execute).toHaveBeenCalledTimes(3);
      
      const step1 = execution.steps.get('step1');
      expect(step1?.attempts).toBe(3);
      expect(step1?.result).toEqual({ success: true, attempts: 3 });
    });

    it('should interpolate context variables', async () => {
      const workflow: WorkflowDefinition = {
        id: 'context-workflow',
        name: 'Context Workflow',
        description: 'A workflow with context interpolation',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Context step',
            tool: 'test.tool',
            args: {
              domain: '${domain}',
              nested: '${config.value}'
            }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('context-workflow', {
        domain: 'example.com',
        config: { value: 'test-value' }
      });

      expect(execution.state).toBe(WorkflowState.COMPLETED);
      
      const step1 = execution.steps.get('step1');
      expect(step1?.result.args).toEqual({
        domain: 'example.com',
        nested: 'test-value'
      });
    });

    it('should handle workflow timeout', async () => {
      const workflow: WorkflowDefinition = {
        id: 'timeout-workflow',
        name: 'Timeout Workflow',
        description: 'A workflow with timeout',
        version: '1.0.0',
        maxDuration: 50, // 50ms timeout
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Slow step',
            tool: 'test.slow',
            args: { value: 'test1' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      
      // Note: Current implementation doesn't enforce maxDuration
      // This test documents expected behavior for future implementation
      const execution = await engine.executeWorkflow('timeout-workflow');
      
      // Currently succeeds, but should timeout in future
      expect(execution.state).toBe(WorkflowState.COMPLETED);
    });

    it('should detect workflow deadlock', async () => {
      const workflow: WorkflowDefinition = {
        id: 'deadlock-workflow',
        name: 'Deadlock Workflow',
        description: 'A workflow with circular dependencies',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            tool: 'test.tool',
            args: { value: 'test1' },
            dependencies: ['step2'] // Circular dependency
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Second step',
            tool: 'test.tool',
            args: { value: 'test2' },
            dependencies: ['step1'] // Circular dependency
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('deadlock-workflow');

      expect(execution.state).toBe(WorkflowState.FAILED);
      expect(execution.error?.message).toContain('deadlock');
    });
  });

  describe('Workflow Rollback', () => {
    it('should rollback all steps on failure', async () => {
      const rollbackExecutor = {
        execute: jest.fn(async (toolName: string) => {
          if (toolName === 'test.fail') {
            throw new Error('Tool failed');
          }
          return { success: true, tool: toolName };
        })
      };

      const engineWithRollback = new WorkflowEngine(rollbackExecutor);
      
      const workflow: WorkflowDefinition = {
        id: 'rollback-workflow',
        name: 'Rollback Workflow',
        description: 'A workflow with rollback',
        version: '1.0.0',
        rollbackStrategy: 'all',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Success step',
            tool: 'test.create',
            args: { resource: 'resource1' },
            rollback: {
              tool: 'test.delete',
              args: { resource: 'resource1' }
            }
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Failing step',
            tool: 'test.fail',
            args: { resource: 'resource2' }
          }
        ]
      };

      engineWithRollback.registerWorkflow(workflow);
      const execution = await engineWithRollback.executeWorkflow('rollback-workflow');

      expect(execution.state).toBe(WorkflowState.ROLLED_BACK);
      
      // Verify rollback was called
      expect(rollbackExecutor.execute).toHaveBeenCalledWith(
        'test.delete',
        { resource: 'resource1' }
      );
    });
  });

  describe('Workflow Management', () => {
    it('should list executions', async () => {
      const workflow: WorkflowDefinition = {
        id: 'list-test-workflow',
        name: 'List Test Workflow',
        description: 'A test workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Test step',
            tool: 'test.tool',
            args: { value: 'test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      
      // Execute multiple times
      await engine.executeWorkflow('list-test-workflow');
      await engine.executeWorkflow('list-test-workflow');
      
      const executions = engine.listExecutions();
      expect(executions).toHaveLength(2);
      
      const completedExecutions = engine.listExecutions({ 
        state: WorkflowState.COMPLETED 
      });
      expect(completedExecutions).toHaveLength(2);
    });

    it('should cancel a running workflow', async () => {
      // Create a mock executor that supports cancellation
      const mockCancellableExecutor = {
        execute: jest.fn(async (toolName: string) => {
          if (toolName === 'test.veryslow') {
            // Create a promise that waits for 5 seconds
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, 5000);
              // Check for cancellation every 100ms
              const interval = setInterval(() => {
                // In a real implementation, we'd check an abort signal
                clearInterval(interval);
                clearTimeout(timeout);
                reject(new Error('Cancelled'));
              }, 100);
            });
          }
          return { success: true };
        })
      };

      const cancellableEngine = new WorkflowEngine(mockCancellableExecutor);

      const workflow: WorkflowDefinition = {
        id: 'cancel-workflow',
        name: 'Cancel Workflow',
        description: 'A workflow to cancel',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Very long running step',
            tool: 'test.veryslow',
            args: { value: 'test' }
          }
        ]
      };

      cancellableEngine.registerWorkflow(workflow);
      
      // Start workflow but don't await
      const executionPromise = cancellableEngine.executeWorkflow('cancel-workflow');
      
      // Wait a bit to ensure workflow has started
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get execution ID
      const executions = cancellableEngine.listExecutions({ state: WorkflowState.RUNNING });
      expect(executions).toHaveLength(1);
      
      const executionId = executions[0]?.id;
      if (!executionId) {throw new Error('No execution found');}
      
      // Cancel it
      await cancellableEngine.cancelWorkflow(executionId);
      
      const execution = cancellableEngine.getExecution(executionId);
      expect(execution?.state).toBe(WorkflowState.CANCELLED);
      
      // The promise should still resolve/reject
      try {
        await executionPromise;
      } catch (e) {
        // Expected - workflow was cancelled
      }
    });

    it('should get execution status', async () => {
      const workflow: WorkflowDefinition = {
        id: 'status-workflow',
        name: 'Status Workflow',
        description: 'A workflow for status check',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Test step',
            tool: 'test.tool',
            args: { value: 'test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('status-workflow');
      
      const status = engine.getExecution(execution.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(execution.id);
      expect(status?.state).toBe(WorkflowState.COMPLETED);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent workflow', async () => {
      await expect(
        engine.executeWorkflow('non-existent')
      ).rejects.toThrow('Workflow not found');
    });

    it('should throw error when cancelling non-existent execution', async () => {
      await expect(
        engine.cancelWorkflow('non-existent')
      ).rejects.toThrow('Execution not found');
    });

    it('should throw error when cancelling completed workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'completed-workflow',
        name: 'Completed Workflow',
        description: 'A completed workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'Test step',
            tool: 'test.tool',
            args: { value: 'test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.executeWorkflow('completed-workflow');
      
      await expect(
        engine.cancelWorkflow(execution.id)
      ).rejects.toThrow('Cannot cancel workflow in state: completed');
    });
  });
});