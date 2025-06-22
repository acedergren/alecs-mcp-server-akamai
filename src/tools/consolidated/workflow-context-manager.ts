/**
 * Workflow Context Manager
 * Maintains context across tool operations for intelligent assistance
 */

import { logger } from '../../utils/logger';

export interface WorkflowOperation {
  timestamp: Date;
  tool: string;
  operation: string;
  parameters: Record<string, any>;
  result?: any;
  success: boolean;
}

export interface WorkflowContext {
  // Current context
  customer?: string;
  propertyId?: string;
  propertyName?: string;
  contractId?: string;
  groupId?: string;
  environment?: 'staging' | 'production';
  
  // Recent operations
  recentOperations: WorkflowOperation[];
  
  // Current workflow
  activeWorkflow?: {
    name: string;
    steps: string[];
    currentStep: number;
    startTime: Date;
  };
  
  // User preferences
  preferences: {
    defaultEnvironment?: 'staging' | 'production';
    autoActivateStaging?: boolean;
    requireApproval?: boolean;
    verboseOutput?: boolean;
  };
}

export class WorkflowContextManager {
  private static instance: WorkflowContextManager;
  private context: WorkflowContext;
  private readonly MAX_OPERATIONS = 50;
  
  private constructor() {
    this.context = {
      recentOperations: [],
      preferences: {},
    };
  }
  
  static getInstance(): WorkflowContextManager {
    if (!WorkflowContextManager.instance) {
      WorkflowContextManager.instance = new WorkflowContextManager();
    }
    return WorkflowContextManager.instance;
  }
  
  /**
   * Update context from operation
   */
  updateFromOperation(operation: WorkflowOperation): void {
    // Extract context from parameters
    const params = operation.parameters;
    
    if (params.customer) this.context.customer = params.customer;
    if (params.propertyId) this.context.propertyId = params.propertyId;
    if (params.propertyName) this.context.propertyName = params.propertyName;
    if (params.contractId) this.context.contractId = params.contractId;
    if (params.groupId) this.context.groupId = params.groupId;
    if (params.network) this.context.environment = params.network;
    
    // Add to recent operations
    this.context.recentOperations.unshift(operation);
    
    // Limit operation history
    if (this.context.recentOperations.length > this.MAX_OPERATIONS) {
      this.context.recentOperations = this.context.recentOperations.slice(0, this.MAX_OPERATIONS);
    }
    
    logger.debug('Context updated:', this.context);
  }
  
  /**
   * Get current context
   */
  getContext(): WorkflowContext {
    return { ...this.context };
  }
  
  /**
   * Set active workflow
   */
  setActiveWorkflow(name: string, steps: string[]): void {
    this.context.activeWorkflow = {
      name,
      steps,
      currentStep: 0,
      startTime: new Date(),
    };
  }
  
  /**
   * Advance workflow step
   */
  advanceWorkflowStep(): void {
    if (this.context.activeWorkflow) {
      this.context.activeWorkflow.currentStep++;
    }
  }
  
  /**
   * Complete workflow
   */
  completeWorkflow(): void {
    this.context.activeWorkflow = undefined;
  }
  
  /**
   * Infer missing parameters from context
   */
  inferParameters(requiredParams: string[]): Record<string, any> {
    const inferred: Record<string, any> = {};
    
    for (const param of requiredParams) {
      switch (param) {
        case 'customer':
          if (this.context.customer) {
            inferred.customer = this.context.customer;
          }
          break;
          
        case 'propertyId':
          if (this.context.propertyId) {
            inferred.propertyId = this.context.propertyId;
          }
          break;
          
        case 'contractId':
          if (this.context.contractId) {
            inferred.contractId = this.context.contractId;
          } else if (this.context.customer) {
            // Try to infer from recent operations
            const contractOp = this.findRecentOperation('list_contracts');
            if (contractOp?.result?.contracts?.[0]) {
              inferred.contractId = contractOp.result.contracts[0].contractId;
            }
          }
          break;
          
        case 'groupId':
          if (this.context.groupId) {
            inferred.groupId = this.context.groupId;
          } else {
            // Try to infer from recent operations
            const groupOp = this.findRecentOperation('list_groups');
            if (groupOp?.result?.groups?.[0]) {
              inferred.groupId = groupOp.result.groups[0].groupId;
            }
          }
          break;
          
        case 'network':
        case 'environment':
          inferred[param] = this.context.environment || 
                           this.context.preferences.defaultEnvironment || 
                           'staging';
          break;
      }
    }
    
    return inferred;
  }
  
  /**
   * Suggest next actions based on context
   */
  suggestNextActions(): string[] {
    const suggestions: string[] = [];
    const lastOp = this.context.recentOperations[0];
    
    if (!lastOp) {
      // No recent operations - suggest starting points
      return [
        'List properties to see what you have',
        'Create a new property',
        'Search for a specific property',
      ];
    }
    
    // Context-aware suggestions
    switch (lastOp.operation) {
      case 'create_property':
        suggestions.push(
          'Add hostnames to the new property',
          'Configure property rules',
          'Activate property to staging',
        );
        break;
        
      case 'list_properties':
        suggestions.push(
          'Get details for a specific property',
          'Create a new property version',
          'Search for properties by hostname',
        );
        break;
        
      case 'activate_property':
        if (lastOp.parameters.network === 'staging') {
          suggestions.push(
            'Check activation status',
            'Test the staging deployment',
            'Activate to production',
          );
        } else {
          suggestions.push(
            'Monitor production activation',
            'Check for any errors',
            'View activation history',
          );
        }
        break;
        
      case 'add_property_hostname':
        suggestions.push(
          'Update DNS records for the hostname',
          'Add more hostnames',
          'Activate property with new hostnames',
        );
        break;
        
      case 'update_property_rules':
        suggestions.push(
          'Validate the updated rules',
          'Create a new property version',
          'Activate the changes',
        );
        break;
    }
    
    // Add workflow-specific suggestions
    if (this.context.activeWorkflow) {
      const currentStep = this.context.activeWorkflow.currentStep;
      const nextStep = this.context.activeWorkflow.steps[currentStep];
      if (nextStep) {
        suggestions.unshift(`Continue workflow: ${nextStep}`);
      }
    }
    
    return suggestions;
  }
  
  /**
   * Find recent operation by tool name
   */
  private findRecentOperation(tool: string): WorkflowOperation | undefined {
    return this.context.recentOperations.find(op => op.tool === tool);
  }
  
  /**
   * Analyze patterns in recent operations
   */
  analyzePatterns(): {
    commonOperations: string[];
    typicalWorkflow: string[];
    frequentErrors: string[];
  } {
    const operationCounts = new Map<string, number>();
    const errorMessages = new Map<string, number>();
    const sequences: string[][] = [];
    
    // Count operations and errors
    for (const op of this.context.recentOperations) {
      const key = op.operation;
      operationCounts.set(key, (operationCounts.get(key) || 0) + 1);
      
      if (!op.success && op.result?.error) {
        const error = op.result.error;
        errorMessages.set(error, (errorMessages.get(error) || 0) + 1);
      }
    }
    
    // Find common operation sequences
    let currentSequence: string[] = [];
    for (let i = this.context.recentOperations.length - 1; i >= 0; i--) {
      const op = this.context.recentOperations[i];
      currentSequence.push(op.operation);
      
      // Break sequence on long gaps or failures
      if (i > 0) {
        const prevOp = this.context.recentOperations[i - 1];
        const timeDiff = prevOp.timestamp.getTime() - op.timestamp.getTime();
        if (timeDiff > 300000 || !op.success) { // 5 minutes or failure
          if (currentSequence.length > 1) {
            sequences.push([...currentSequence]);
          }
          currentSequence = [];
        }
      }
    }
    
    // Get most common operations
    const commonOperations = Array.from(operationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([op]) => op);
    
    // Get most common sequence
    const sequenceCounts = new Map<string, number>();
    for (const seq of sequences) {
      const key = seq.join(' -> ');
      sequenceCounts.set(key, (sequenceCounts.get(key) || 0) + 1);
    }
    
    const typicalWorkflow = Array.from(sequenceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([seq]) => seq.split(' -> '))[0] || [];
    
    // Get frequent errors
    const frequentErrors = Array.from(errorMessages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([error]) => error);
    
    return {
      commonOperations,
      typicalWorkflow,
      frequentErrors,
    };
  }
  
  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {
      recentOperations: [],
      preferences: this.context.preferences, // Preserve preferences
    };
  }
  
  /**
   * Set user preference
   */
  setPreference(key: keyof WorkflowContext['preferences'], value: any): void {
    this.context.preferences[key] = value;
  }
}