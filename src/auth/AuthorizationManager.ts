/**
 * Authorization Manager
 * Implements RBAC/ABAC for customer-scoped permissions
 */

import {
  Permission,
  Role,
  CustomerContext,
  AuthorizationContext,
  AuthorizationDecision,
  CustomerIsolationPolicy,
  IsolationLevel,
  PermissionScope,
} from './oauth/types';

import { logger } from '@/utils/logger';

/**
 * Permission evaluation result
 */
interface PermissionEvaluation {
  permission: Permission;
  allowed: boolean;
  reason?: string;
}

/**
 * Policy evaluation _context
 */
interface PolicyContext {
  resource: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Authorization manager for handling customer-scoped permissions
 */
export class AuthorizationManager {
  private static instance: AuthorizationManager;
  private roles: Map<string, Role> = new Map();
  private isolationPolicies: Map<string, CustomerIsolationPolicy> = new Map();
  private systemRoles: Map<string, Role> = new Map();

  private constructor() {
    this.initializeSystemRoles();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthorizationManager {
    if (!AuthorizationManager.instance) {
      AuthorizationManager.instance = new AuthorizationManager();
    }
    return AuthorizationManager.instance;
  }

  /**
   * Initialize system-defined roles
   */
  private initializeSystemRoles(): void {
    // Admin role
    const adminRole: Role = {
      id: 'system:admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        {
          id: 'admin:all',
          resource: '*',
          actions: ['*'],
          scope: PermissionScope.GLOBAL,
        },
      ],
      isSystem: true,
      priority: 100,
    };

    // Operator role
    const operatorRole: Role = {
      id: 'system:operator',
      name: 'Operator',
      description: 'Manage configurations and deployments',
      permissions: [
        {
          id: 'property:manage',
          resource: 'property',
          actions: ['create', 'read', 'update', 'delete', 'activate'],
          scope: PermissionScope.CUSTOMER,
        },
        {
          id: 'configuration:manage',
          resource: 'configuration',
          actions: ['create', 'read', 'update', 'delete'],
          scope: PermissionScope.CUSTOMER,
        },
        {
          id: 'purge:execute',
          resource: 'purge',
          actions: ['create', 'read'],
          scope: PermissionScope.CUSTOMER,
        },
      ],
      isSystem: true,
      priority: 80,
    };

    // Developer role
    const developerRole: Role = {
      id: 'system:developer',
      name: 'Developer',
      description: 'Develop and test configurations',
      permissions: [
        {
          id: 'property:develop',
          resource: 'property',
          actions: ['create', 'read', 'update'],
          scope: PermissionScope.CUSTOMER,
          constraints: {
            environment: 'staging',
          },
        },
        {
          id: 'configuration:develop',
          resource: 'configuration',
          actions: ['create', 'read', 'update'],
          scope: PermissionScope.CUSTOMER,
        },
        {
          id: 'purge:staging',
          resource: 'purge',
          actions: ['create'],
          scope: PermissionScope.CUSTOMER,
          constraints: {
            environment: 'staging',
          },
        },
      ],
      isSystem: true,
      priority: 60,
    };

    // Viewer role
    const viewerRole: Role = {
      id: 'system:viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        {
          id: 'readonly:all',
          resource: '*',
          actions: ['read'],
          scope: PermissionScope.CUSTOMER,
        },
      ],
      isSystem: true,
      priority: 20,
    };

    // Store system roles
    this.systemRoles.set(adminRole.id, adminRole);
    this.systemRoles.set(operatorRole.id, operatorRole);
    this.systemRoles.set(developerRole.id, developerRole);
    this.systemRoles.set(viewerRole.id, viewerRole);

    // Copy to main roles map
    this.systemRoles.forEach((role, id) => {
      this.roles.set(id, role);
    });
  }

  /**
   * Authorize action based on _context
   */
  async authorize(
    _context: AuthorizationContext,
    policyContext: PolicyContext,
  ): Promise<AuthorizationDecision> {
    try {
      // Check isolation policy first
      const isolationCheck = await this.checkIsolationPolicy(
        _context.customerContext,
        policyContext,
      );

      if (!isolationCheck.allowed) {
        return isolationCheck;
      }

      // Evaluate direct permissions first
      if (_context.permissions && _context.permissions.length > 0) {
        const permissionCheck = await this.evaluatePermissions(
          _context.permissions,
          policyContext,
          _context.customerContext,
        );

        if (permissionCheck.allowed) {
          return permissionCheck;
        }
      }

      // Check role-based permissions
      const roleCheck = await this.evaluateRolePermissions(
        _context.customerContext.roles,
        policyContext,
        _context.customerContext,
      );

      return roleCheck;
    } catch (error) {
      logger.error('Authorization failed', {
        _context,
        policyContext,
        _error,
      });

      return {
        allowed: false,
        reason: 'Authorization error',
      };
    }
  }

  /**
   * Check customer isolation policy
   */
  private async checkIsolationPolicy(
    customerContext: CustomerContext,
    policyContext: PolicyContext,
  ): Promise<AuthorizationDecision> {
    const policy = this.isolationPolicies.get(customerContext.customerId);

    if (!policy) {
      // No isolation policy - allow by default
      return { allowed: true };
    }

    // Check resource restrictions
    const resourceRestriction = policy.resourceRestrictions.find(
      (r) => r.resourceType === policyContext.resource,
    );

    if (!resourceRestriction) {
      // No specific restriction for this resource type
      return policy.isolationLevel === IsolationLevel.STRICT
        ? { allowed: false, reason: 'Strict isolation - resource not explicitly allowed' }
        : { allowed: true };
    }

    // Check allowed/denied resources
    if (policyContext.resourceId) {
      if (resourceRestriction.deniedIds?.includes(policyContext.resourceId)) {
        return {
          allowed: false,
          reason: 'Resource explicitly denied by isolation policy',
        };
      }

      if (
        resourceRestriction.allowedIds &&
        !resourceRestriction.allowedIds.includes(policyContext.resourceId)
      ) {
        return {
          allowed: false,
          reason: 'Resource not in allowed list',
        };
      }
    }

    // Check conditions
    if (resourceRestriction.conditions) {
      const conditionsMet = this.evaluateConditions(
        resourceRestriction.conditions,
        policyContext.metadata || {},
      );

      if (!conditionsMet) {
        return {
          allowed: false,
          reason: 'Resource access conditions not met',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluate permissions
   */
  private async evaluatePermissions(
    permissions: Permission[],
    policyContext: PolicyContext,
    customerContext: CustomerContext,
  ): Promise<AuthorizationDecision> {
    const evaluations: PermissionEvaluation[] = [];

    for (const permission of permissions) {
      const evaluation = this.evaluatePermission(
        permission,
        policyContext,
        customerContext,
      );
      evaluations.push(evaluation);

      if (evaluation.allowed) {
        // Found matching permission
        return {
          allowed: true,
          appliedPolicies: [permission.id],
        };
      }
    }

    // No matching permissions
    const missingPermissions = this.getMissingPermissions(policyContext);

    return {
      allowed: false,
      reason: 'No matching direct permissions',
      missingPermissions,
    };
  }

  /**
   * Evaluate single permission
   */
  private evaluatePermission(
    permission: Permission,
    policyContext: PolicyContext,
    customerContext: CustomerContext,
  ): PermissionEvaluation {
    // Check resource match
    if (permission.resource !== '*' && permission.resource !== policyContext.resource) {
      return {
        permission,
        allowed: false,
        reason: 'Resource mismatch',
      };
    }

    // Check action match
    if (
      !permission.actions.includes('*') &&
      !permission.actions.includes(policyContext.action)
    ) {
      return {
        permission,
        allowed: false,
        reason: 'Action not allowed',
      };
    }

    // Check scope
    if (!this.checkPermissionScope(permission, customerContext)) {
      return {
        permission,
        allowed: false,
        reason: 'Permission scope mismatch',
      };
    }

    // Check constraints
    if (permission.constraints) {
      const constraintsMet = this.evaluateConditions(
        permission.constraints,
        policyContext.metadata || {},
      );

      if (!constraintsMet) {
        return {
          permission,
          allowed: false,
          reason: 'Permission constraints not met',
        };
      }
    }

    return {
      permission,
      allowed: true,
    };
  }

  /**
   * Check permission scope
   */
  private checkPermissionScope(
    permission: Permission,
    customerContext: CustomerContext,
  ): boolean {
    switch (permission.scope) {
      case PermissionScope.GLOBAL:
        // Global permissions apply to all customers
        return true;
      case PermissionScope.CUSTOMER:
        // Customer permissions apply within customer _context
        return !!customerContext.customerId;
      case PermissionScope.RESOURCE:
        // Resource permissions require specific resource access
        return true;
      default:
        return false;
    }
  }

  /**
   * Evaluate role-based permissions
   */
  private async evaluateRolePermissions(
    roleIds: string[],
    policyContext: PolicyContext,
    customerContext: CustomerContext,
  ): Promise<AuthorizationDecision> {
    // Get all permissions from roles
    const allPermissions: Permission[] = [];
    const appliedRoles: string[] = [];

    for (const roleId of roleIds) {
      const role = this.roles.get(roleId) || this.systemRoles.get(roleId);
      if (role) {
        allPermissions.push(...role.permissions);
        appliedRoles.push(roleId);
      }
    }

    // Sort by role priority
    const sortedRoles = appliedRoles
      .map((id) => this.roles.get(id) || this.systemRoles.get(id))
      .filter((role): role is Role => !!role)
      .sort((a, b) => b.priority - a.priority);

    // Evaluate permissions from highest priority role first
    for (const role of sortedRoles) {
      for (const permission of role.permissions) {
        const evaluation = this.evaluatePermission(
          permission,
          policyContext,
          customerContext,
        );

        if (evaluation.allowed) {
          return {
            allowed: true,
            appliedPolicies: [role.id, permission.id],
          };
        }
      }
    }

    return {
      allowed: false,
      reason: roleIds.length === 0 ? 'No matching permissions' : 'No matching role permissions',
      missingPermissions: this.getMissingPermissions(policyContext),
    };
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    conditions: Record<string, unknown>,
    metadata: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get missing permissions for action
   */
  private getMissingPermissions(policyContext: PolicyContext): Permission[] {
    return [
      {
        id: `required:${policyContext.resource}:${policyContext.action}`,
        resource: policyContext.resource,
        actions: [policyContext.action],
        scope: PermissionScope.CUSTOMER,
      },
    ];
  }

  /**
   * Create custom role
   */
  async createRole(role: Role): Promise<void> {
    if (this.roles.has(role.id)) {
      throw new Error(`Role ${role.id} already exists`);
    }

    if (role.isSystem) {
      throw new Error('Cannot create system role');
    }

    this.roles.set(role.id, role);

    logger.info('Role created', { roleId: role.id, name: role.name });
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (role.isSystem) {
      throw new Error('Cannot update system role');
    }

    const updatedRole = { ...role, ...updates, id: roleId, isSystem: false };
    this.roles.set(roleId, updatedRole);

    logger.info('Role updated', { roleId });
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    this.roles.delete(roleId);

    logger.info('Role deleted', { roleId });
  }

  /**
   * Set customer isolation policy
   */
  async setCustomerIsolationPolicy(policy: CustomerIsolationPolicy): Promise<void> {
    this.isolationPolicies.set(policy.customerId, policy);

    logger.info('Customer isolation policy set', {
      customerId: policy.customerId,
      isolationLevel: policy.isolationLevel,
    });
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId) || this.systemRoles.get(roleId);
  }

  /**
   * List all roles
   */
  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get customer isolation policy
   */
  getCustomerIsolationPolicy(customerId: string): CustomerIsolationPolicy | undefined {
    return this.isolationPolicies.get(customerId);
  }
}
