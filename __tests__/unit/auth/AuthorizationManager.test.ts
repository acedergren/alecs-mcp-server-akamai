/**
 * AuthorizationManager Test Suite
 * Comprehensive tests for RBAC/ABAC authorization and customer-scoped permissions
 */

import { AuthorizationManager } from '@/auth/AuthorizationManager';
import type {
  Permission,
  Role,
  CustomerContext,
  AuthorizationContext,
  AuthorizationDecision,
  CustomerIsolationPolicy,
  ResourceRestriction,
  OAuthProfile,
} from '@/auth/oauth/types';
import { IsolationLevel, PermissionScope, OAuthProvider } from '@/auth/oauth/types';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');

describe('AuthorizationManager', () => {
  let authManager: AuthorizationManager;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (AuthorizationManager as any).instance = undefined;
    authManager = AuthorizationManager.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = AuthorizationManager.getInstance();
      const instance2 = AuthorizationManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with system roles', () => {
      const adminRole = authManager.getRole('system:admin');
      const operatorRole = authManager.getRole('system:operator');
      const developerRole = authManager.getRole('system:developer');
      const viewerRole = authManager.getRole('system:viewer');

      expect(adminRole).toBeDefined();
      expect(operatorRole).toBeDefined();
      expect(developerRole).toBeDefined();
      expect(viewerRole).toBeDefined();

      expect(adminRole?.permissions).toContainEqual(
        expect.objectContaining({
          resource: '*',
          actions: ['*'],
          scope: PermissionScope.GLOBAL,
        }),
      );
    });
  });

  describe('authorize', () => {
    const customerContext: CustomerContext = {
      customerId: 'customer-123',
      customerName: 'Test Customer',
      roles: ['system:viewer'],
      permissions: [],
      isActive: true,
      createdAt: new Date(),
    };

    it('should authorize viewer role for read access', async () => {
      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
      });

      expect(decision.allowed).toBe(true);
      expect(decision.appliedPolicies).toContain('system:viewer');
    });

    it('should deny viewer role for write access', async () => {
      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'create',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('No matching role permissions');
      expect(decision.missingPermissions).toHaveLength(1);
    });

    it('should authorize admin role for any action', async () => {
      const adminContext: CustomerContext = {
        ...customerContext,
        roles: ['system:admin'],
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: adminContext,
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'delete',
      });

      expect(decision.allowed).toBe(true);
      expect(decision.appliedPolicies).toContain('system:admin');
    });

    it('should authorize operator role for property management', async () => {
      const operatorContext: CustomerContext = {
        ...customerContext,
        roles: ['system:operator'],
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: operatorContext,
        permissions: [],
      };

      const decisions = await Promise.all([
        authManager.authorize(context, { resource: 'property', action: 'create' }),
        authManager.authorize(context, { resource: 'property', action: 'update' }),
        authManager.authorize(context, { resource: 'property', action: 'delete' }),
        authManager.authorize(context, { resource: 'property', action: 'activate' }),
        authManager.authorize(context, { resource: 'purge', action: 'create' }),
      ]);

      decisions.forEach((decision) => {
        expect(decision.allowed).toBe(true);
        expect(decision.appliedPolicies).toContain('system:operator');
      });
    });

    it('should enforce developer role constraints', async () => {
      const developerContext: CustomerContext = {
        ...customerContext,
        roles: ['system:developer'],
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: developerContext,
        permissions: [],
      };

      // Should allow staging environment
      const stagingDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'create',
        metadata: { environment: 'staging' },
      });

      expect(stagingDecision.allowed).toBe(true);

      // Should deny production environment
      const productionDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'create',
        metadata: { environment: 'production' },
      });

      expect(productionDecision.allowed).toBe(false);
    });

    it('should evaluate direct permissions before role permissions', async () => {
      const directPermission: Permission = {
        id: 'direct:property:delete',
        resource: 'property',
        actions: ['delete'],
        scope: PermissionScope.CUSTOMER,
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [directPermission],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'delete',
      });

      expect(decision.allowed).toBe(true);
      expect(decision.appliedPolicies).toContain('direct:property:delete');
    });

    it('should handle multiple roles with priority', async () => {
      const multiRoleContext: CustomerContext = {
        ...customerContext,
        roles: ['system:viewer', 'system:developer'],
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: multiRoleContext,
        permissions: [],
      };

      // Developer role should take precedence over viewer
      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'create',
        metadata: { environment: 'staging' },
      });

      expect(decision.allowed).toBe(true);
      expect(decision.appliedPolicies).toContain('system:developer');
    });

    it('should handle authorization errors gracefully', async () => {
      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: null as any, // Invalid context
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('Authorization error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Customer Isolation Policies', () => {
    const customerContext: CustomerContext = {
      customerId: 'customer-123',
      customerName: 'Test Customer',
      roles: ['system:operator'],
      permissions: [],
      isActive: true,
      createdAt: new Date(),
    };

    it('should enforce strict isolation policy', async () => {
      const strictPolicy: CustomerIsolationPolicy = {
        id: 'policy-strict-123',
        customerId: 'customer-123',
        isolationLevel: IsolationLevel.STRICT,
        resourceRestrictions: [
          {
            resourceType: 'property',
            allowedIds: ['prop-1', 'prop-2'],
          },
        ],
      };

      await authManager.setCustomerIsolationPolicy(strictPolicy);

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      // Should allow access to allowed resource
      const allowedDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
        resourceId: 'prop-1',
      });

      expect(allowedDecision.allowed).toBe(true);

      // Should deny access to non-allowed resource
      const deniedDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
        resourceId: 'prop-3',
      });

      expect(deniedDecision.allowed).toBe(false);
      expect(deniedDecision.reason).toBe('Resource not in allowed list');

      // Should deny access to unrestricted resource type in strict mode
      const unrestrictedDecision = await authManager.authorize(context, {
        resource: 'configuration',
        action: 'read',
      });

      expect(unrestrictedDecision.allowed).toBe(false);
      expect(unrestrictedDecision.reason).toBe(
        'Strict isolation - resource not explicitly allowed',
      );
    });

    it('should enforce moderate isolation policy', async () => {
      const moderatePolicy: CustomerIsolationPolicy = {
        id: 'policy-moderate-123',
        customerId: 'customer-123',
        isolationLevel: IsolationLevel.PARTIAL,
        resourceRestrictions: [
          {
            resourceType: 'property',
            deniedIds: ['prop-secret'],
          },
        ],
      };

      await authManager.setCustomerIsolationPolicy(moderatePolicy);

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      // Should allow access to non-denied resource
      const allowedDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
        resourceId: 'prop-1',
      });

      expect(allowedDecision.allowed).toBe(true);

      // Should deny access to explicitly denied resource
      const deniedDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
        resourceId: 'prop-secret',
      });

      expect(deniedDecision.allowed).toBe(false);
      expect(deniedDecision.reason).toBe('Resource explicitly denied by isolation policy');

      // Should allow unrestricted resource types in moderate mode
      const unrestrictedDecision = await authManager.authorize(context, {
        resource: 'configuration',
        action: 'read',
      });

      expect(unrestrictedDecision.allowed).toBe(true);
    });

    it('should evaluate resource restriction conditions', async () => {
      const conditionalPolicy: CustomerIsolationPolicy = {
        id: 'policy-conditional-123',
        customerId: 'customer-123',
        isolationLevel: IsolationLevel.PARTIAL,
        resourceRestrictions: [
          {
            resourceType: 'property',
            conditions: {
              environment: 'production',
              region: 'us-east',
            },
          },
        ],
      };

      await authManager.setCustomerIsolationPolicy(conditionalPolicy);

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      // Should allow when conditions are met
      const matchingDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
        metadata: {
          environment: 'production',
          region: 'us-east',
        },
      });

      expect(matchingDecision.allowed).toBe(true);

      // Should deny when conditions are not met
      const nonMatchingDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
        metadata: {
          environment: 'staging',
          region: 'us-east',
        },
      });

      expect(nonMatchingDecision.allowed).toBe(false);
      expect(nonMatchingDecision.reason).toBe('Resource access conditions not met');
    });

    it('should allow access when no isolation policy exists', async () => {
      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: {
          ...customerContext,
          customerId: 'customer-no-policy',
        },
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
      });

      expect(decision.allowed).toBe(true);
    });
  });

  describe('Role Management', () => {
    it('should create custom role', async () => {
      const customRole: Role = {
        id: 'custom:data-analyst',
        name: 'Data Analyst',
        description: 'Access to reporting and analytics',
        permissions: [
          {
            id: 'reporting:read',
            resource: 'reporting',
            actions: ['read'],
            scope: PermissionScope.CUSTOMER,
          },
          {
            id: 'analytics:read',
            resource: 'analytics',
            actions: ['read', 'export'],
            scope: PermissionScope.CUSTOMER,
          },
        ],
        isSystem: false,
        priority: 50,
      };

      await authManager.createRole(customRole);

      const retrievedRole = authManager.getRole('custom:data-analyst');
      expect(retrievedRole).toEqual(customRole);

      expect(mockLogger.info).toHaveBeenCalledWith('Role created', {
        roleId: 'custom:data-analyst',
        name: 'Data Analyst',
      });
    });

    it('should prevent creating duplicate role', async () => {
      const role: Role = {
        id: 'custom:test',
        name: 'Test Role',
        permissions: [],
        isSystem: false,
        priority: 30,
      };

      await authManager.createRole(role);

      await expect(authManager.createRole(role)).rejects.toThrow(
        'Role custom:test already exists',
      );
    });

    it('should prevent creating system role', async () => {
      const systemRole: Role = {
        id: 'system:custom',
        name: 'Custom System Role',
        permissions: [],
        isSystem: true,
        priority: 90,
      };

      await expect(authManager.createRole(systemRole)).rejects.toThrow(
        'Cannot create system role',
      );
    });

    it('should update custom role', async () => {
      const role: Role = {
        id: 'custom:updatable',
        name: 'Updatable Role',
        permissions: [],
        isSystem: false,
        priority: 40,
      };

      await authManager.createRole(role);

      const updates = {
        name: 'Updated Role',
        permissions: [
          {
            id: 'new:permission',
            resource: 'test',
            actions: ['read'],
            scope: PermissionScope.CUSTOMER,
          },
        ],
        priority: 45,
      };

      await authManager.updateRole('custom:updatable', updates);

      const updatedRole = authManager.getRole('custom:updatable');
      expect(updatedRole?.name).toBe('Updated Role');
      expect(updatedRole?.permissions).toHaveLength(1);
      expect(updatedRole?.priority).toBe(45);

      expect(mockLogger.info).toHaveBeenCalledWith('Role updated', {
        roleId: 'custom:updatable',
      });
    });

    it('should prevent updating system role', async () => {
      await expect(
        authManager.updateRole('system:admin', { name: 'Modified Admin' }),
      ).rejects.toThrow('Cannot update system role');
    });

    it('should prevent updating non-existent role', async () => {
      await expect(
        authManager.updateRole('non-existent', { name: 'Test' }),
      ).rejects.toThrow('Role non-existent not found');
    });

    it('should delete custom role', async () => {
      const role: Role = {
        id: 'custom:deletable',
        name: 'Deletable Role',
        permissions: [],
        isSystem: false,
        priority: 35,
      };

      await authManager.createRole(role);
      await authManager.deleteRole('custom:deletable');

      const deletedRole = authManager.getRole('custom:deletable');
      expect(deletedRole).toBeUndefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Role deleted', {
        roleId: 'custom:deletable',
      });
    });

    it('should prevent deleting system role', async () => {
      await expect(authManager.deleteRole('system:viewer')).rejects.toThrow(
        'Cannot delete system role',
      );
    });

    it('should prevent deleting non-existent role', async () => {
      await expect(authManager.deleteRole('non-existent')).rejects.toThrow(
        'Role non-existent not found',
      );
    });

    it('should list all roles', () => {
      const roles = authManager.listRoles();

      expect(roles.length).toBeGreaterThanOrEqual(4); // At least 4 system roles
      expect(roles).toContainEqual(
        expect.objectContaining({ id: 'system:admin' }),
      );
      expect(roles).toContainEqual(
        expect.objectContaining({ id: 'system:operator' }),
      );
    });
  });

  describe('Permission Evaluation', () => {
    const customerContext: CustomerContext = {
      customerId: 'customer-123',
      customerName: 'Test Customer',
      roles: [],
      permissions: [],
      isActive: true,
      createdAt: new Date(),
    };

    it('should match wildcard resource permissions', async () => {
      const wildcardPermission: Permission = {
        id: 'wildcard:all',
        resource: '*',
        actions: ['read'],
        scope: PermissionScope.CUSTOMER,
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [wildcardPermission],
      };

      const decisions = await Promise.all([
        authManager.authorize(context, { resource: 'property', action: 'read' }),
        authManager.authorize(context, { resource: 'configuration', action: 'read' }),
        authManager.authorize(context, { resource: 'anything', action: 'read' }),
      ]);

      decisions.forEach((decision) => {
        expect(decision.allowed).toBe(true);
      });
    });

    it('should match wildcard action permissions', async () => {
      const wildcardPermission: Permission = {
        id: 'wildcard:actions',
        resource: 'property',
        actions: ['*'],
        scope: PermissionScope.CUSTOMER,
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [wildcardPermission],
      };

      const decisions = await Promise.all([
        authManager.authorize(context, { resource: 'property', action: 'create' }),
        authManager.authorize(context, { resource: 'property', action: 'read' }),
        authManager.authorize(context, { resource: 'property', action: 'update' }),
        authManager.authorize(context, { resource: 'property', action: 'delete' }),
        authManager.authorize(context, { resource: 'property', action: 'anything' }),
      ]);

      decisions.forEach((decision) => {
        expect(decision.allowed).toBe(true);
      });
    });

    it('should evaluate permission constraints', async () => {
      const constrainedPermission: Permission = {
        id: 'constrained:property',
        resource: 'property',
        actions: ['update'],
        scope: PermissionScope.CUSTOMER,
        constraints: {
          environment: 'staging',
          propertyType: 'web',
        },
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [constrainedPermission],
      };

      // Should allow when constraints match
      const matchingDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'update',
        metadata: {
          environment: 'staging',
          propertyType: 'web',
        },
      });

      expect(matchingDecision.allowed).toBe(true);

      // Should deny when constraints don't match
      const nonMatchingDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'update',
        metadata: {
          environment: 'production',
          propertyType: 'web',
        },
      });

      expect(nonMatchingDecision.allowed).toBe(false);
    });

    it('should respect permission scope', async () => {
      const globalPermission: Permission = {
        id: 'global:admin',
        resource: '*',
        actions: ['*'],
        scope: PermissionScope.GLOBAL,
      };

      // Global permission should work even without customer context
      const globalContext: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: { ...customerContext, customerId: '' },
        permissions: [globalPermission],
      };

      const decision = await authManager.authorize(globalContext, {
        resource: 'system',
        action: 'configure',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should provide missing permissions in denial', async () => {
      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'create',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.missingPermissions).toHaveLength(1);
      expect(decision.missingPermissions?.[0]).toMatchObject({
        resource: 'property',
        actions: ['create'],
        scope: PermissionScope.CUSTOMER,
      });
    });
  });

  describe('Complex Authorization Scenarios', () => {
    it('should handle combined role and direct permissions', async () => {
      const customerContext: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Test Customer',
        roles: ['system:viewer'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      const directPermission: Permission = {
        id: 'direct:purge',
        resource: 'purge',
        actions: ['create'],
        scope: PermissionScope.CUSTOMER,
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [directPermission],
      };

      // Should have both viewer (from role) and purge (direct) permissions
      const readDecision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
      });

      const purgeDecision = await authManager.authorize(context, {
        resource: 'purge',
        action: 'create',
      });

      expect(readDecision.allowed).toBe(true);
      expect(readDecision.appliedPolicies).toContain('system:viewer');

      expect(purgeDecision.allowed).toBe(true);
      expect(purgeDecision.appliedPolicies).toContain('direct:purge');
    });

    it('should handle complex isolation policy with multiple restrictions', async () => {
      const complexPolicy: CustomerIsolationPolicy = {
        id: 'policy-complex-123',
        customerId: 'customer-123',
        isolationLevel: IsolationLevel.PARTIAL,
        resourceRestrictions: [
          {
            resourceType: 'property',
            allowedIds: ['prop-1', 'prop-2', 'prop-3'],
            deniedIds: ['prop-2'], // Deny takes precedence
            conditions: {
              accessLevel: 'full',
            },
          },
          {
            resourceType: 'configuration',
            conditions: {
              environment: 'staging',
            },
          },
        ],
      };

      await authManager.setCustomerIsolationPolicy(complexPolicy);

      const customerContext: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Test Customer',
        roles: ['system:operator'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      // Test various scenarios
      const scenarios = [
        {
          // Allowed property with conditions met
          params: {
            resource: 'property',
            action: 'read',
            resourceId: 'prop-1',
            metadata: { accessLevel: 'full' },
          },
          expected: true,
        },
        {
          // Denied property (even though in allowed list)
          params: {
            resource: 'property',
            action: 'read',
            resourceId: 'prop-2',
            metadata: { accessLevel: 'full' },
          },
          expected: false,
        },
        {
          // Allowed property but conditions not met
          params: {
            resource: 'property',
            action: 'read',
            resourceId: 'prop-3',
            metadata: { accessLevel: 'limited' },
          },
          expected: false,
        },
        {
          // Configuration with correct environment
          params: {
            resource: 'configuration',
            action: 'update',
            metadata: { environment: 'staging' },
          },
          expected: true,
        },
        {
          // Configuration with wrong environment
          params: {
            resource: 'configuration',
            action: 'update',
            metadata: { environment: 'production' },
          },
          expected: false,
        },
      ];

      for (const scenario of scenarios) {
        const decision = await authManager.authorize(context, scenario.params);
        expect(decision.allowed).toBe(scenario.expected);
      }
    });

    it('should handle inactive customer context', async () => {
      const inactiveContext: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Inactive Customer',
        roles: ['system:admin'],
        permissions: [],
        isActive: false,
        createdAt: new Date(),
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: inactiveContext,
        permissions: [],
      };

      // Even admin role should be evaluated in inactive context
      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'delete',
      });

      // The authorization should still work based on roles
      // Customer active status should be checked at a higher level
      expect(decision.allowed).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of permissions efficiently', async () => {
      const permissions: Permission[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `perm-${i}`,
          resource: `resource-${i}`,
          actions: ['read', 'write'],
          scope: PermissionScope.CUSTOMER,
        }));

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: {
          customerId: 'customer-123',
          customerName: 'Test Customer',
          roles: [],
          permissions: [],
          isActive: true,
          createdAt: new Date(),
        },
        permissions,
      };

      const start = Date.now();
      const decision = await authManager.authorize(context, {
        resource: 'resource-50',
        action: 'read',
      });
      const duration = Date.now() - start;

      expect(decision.allowed).toBe(true);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle empty permissions and roles', async () => {
      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: {
          customerId: 'customer-123',
          customerName: 'Test Customer',
          roles: [],
          permissions: [],
          isActive: true,
          createdAt: new Date(),
        },
        permissions: [],
      };

      const decision = await authManager.authorize(context, {
        resource: 'property',
        action: 'read',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('No matching permissions');
    });

    it('should handle concurrent authorization requests', async () => {
      const customerContext: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Test Customer',
        roles: ['system:operator'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext,
        permissions: [],
      };

      const requests = Array(20)
        .fill(null)
        .map((_, i) =>
          authManager.authorize(context, {
            resource: 'property',
            action: i % 2 === 0 ? 'read' : 'create',
          }),
        );

      const decisions = await Promise.all(requests);

      expect(decisions).toHaveLength(20);
      decisions.forEach((decision) => {
        expect(decision.allowed).toBe(true);
      });
    });

    it('should handle special characters in resource names', async () => {
      const specialPermission: Permission = {
        id: 'special:chars',
        resource: 'resource/with-special.chars_123',
        actions: ['read'],
        scope: PermissionScope.CUSTOMER,
      };

      const context: AuthorizationContext = {
        user: { sub: 'user-123', provider: OAuthProvider.GOOGLE } as OAuthProfile,
        customerContext: {
          customerId: 'customer-123',
          customerName: 'Test Customer',
          roles: [],
          permissions: [],
          isActive: true,
          createdAt: new Date(),
        },
        permissions: [specialPermission],
      };

      const decision = await authManager.authorize(context, {
        resource: 'resource/with-special.chars_123',
        action: 'read',
      });

      expect(decision.allowed).toBe(true);
    });
  });
});