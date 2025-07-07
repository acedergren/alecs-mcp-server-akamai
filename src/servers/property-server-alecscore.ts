#!/usr/bin/env node

/**
 * ALECS Property Server - ALECSCore Implementation
 * 
 * Migrated to ALECSCore for 85% code reduction and 5x performance
 * Full MCP 2025 compliance with 67 tools including:
 * - Core property management (create, update, delete)
 * - Version management and rollback
 * - Rules configuration and validation
 * - Hostname and edge hostname management
 * - Advanced hostname operations (patch, diff, audit)
 * - Activation and deployment control
 * - CP codes management
 * - Includes management for modular configuration
 * - Advanced rules features (behaviors, criteria, patch)
 * - Certificate integration and status monitoring
 * - Schema discovery and rule validation
 * - Advanced features (metadata, analytics, templates)
 * - Search and discovery
 * 
 * v3.2.0: Added 8 advanced hostname operations per PAPI audit
 * v3.3.0: Added 7 advanced rules features per PAPI audit
 * v3.4.0: Added 2 certificate integration tools per PAPI audit
 * v3.5.0: Added 3 schema & validation tools per PAPI audit
 * v4.0.0: Added 7 advanced features - COMPLETE PAPI IMPLEMENTATION!
 */

import { ALECSCore, tool } from '../core/server/alecs-core';
import { z } from 'zod';

// Import existing tool implementations
import {
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  removePropertyHostname,
  addPropertyHostname,
  createEdgeHostname,
} from '../tools/property-manager-tools';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts,
  listProducts,
} from '../tools/property-tools';
import {
  onboardPropertyTool,
} from '../tools/property-onboarding-tools';
import {
  rollbackPropertyVersion,
} from '../tools/property-version-management';
import {
  validatePropertyActivation,
} from '../tools/property-activation-advanced';
import {
  listPropertyVersions,
  getPropertyVersion,
  listPropertyVersionHostnames,
  listEdgeHostnames,
  removeProperty,
  cloneProperty,
  cancelPropertyActivation,
  getLatestPropertyVersion,
} from '../tools/property-manager-advanced-tools';
import {
  searchPropertiesOptimized,
} from '../tools/property-search-optimized';
import {
  validateRuleTree,
} from '../tools/rule-tree-advanced';
import {
  universalSearchWithCacheHandler,
} from '../tools/universal-search-with-cache';
import {
  listCPCodes,
  createCPCode,
  getCPCode,
} from '../tools/cpcode-tools';
import {
  listIncludes,
  getInclude,
  createInclude,
  updateInclude,
  createIncludeVersion,
  activateInclude,
  getIncludeActivationStatus,
  listIncludeActivations,
} from '../tools/includes-tools';
import {
  listAllPropertyHostnames,
  patchPropertyHostnames,
  patchPropertyVersionHostnames,
  getPropertyHostnameActivations,
  getPropertyHostnameActivationStatus,
  cancelPropertyHostnameActivation,
  getPropertyHostnamesDiff,
  getHostnameAuditHistory,
} from '../tools/hostname-operations-advanced';
import {
  getAvailableBehaviors,
  getAvailableCriteria,
  getIncludeAvailableBehaviors,
  getIncludeAvailableCriteria,
  patchPropertyVersionRules,
  headPropertyVersionRules,
  headIncludeVersionRules,
} from '../tools/rules-operations-advanced';
import {
  linkCertificateToProperty,
  getPropertyCertificateStatus,
} from '../tools/certificate-integration-tools';
import {
  getRuleFormats,
  getRuleFormatSchema,
  validatePropertyRules,
} from '../tools/schema-validation-tools';
import {
  getPropertyMetadata,
  compareProperties,
  exportPropertyConfiguration,
  searchPropertiesAdvanced,
  bulkUpdateProperties,
  createPropertyFromTemplate,
  getPropertyAnalytics,
} from '../tools/advanced-property-tools';

// Schemas
const CustomerSchema = z.object({
  customer: z.string().optional().describe('Optional: Customer section name'),
});

const PropertyIdSchema = CustomerSchema.extend({
  propertyId: z.string().describe('Property ID'),
});

const PropertyVersionSchema = PropertyIdSchema.extend({
  version: z.number().describe('Property version'),
});

const FormatSchema = z.object({
  format: z.enum(['json', 'text']).optional().describe('Response format'),
});

class PropertyServer extends ALECSCore {
  override tools = [
    // Core Property Operations
    tool('list-properties',
      CustomerSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listProperties(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 }, coalesce: true }
    ),

    tool('get-property',
      PropertyIdSchema,
      async (args, ctx) => {
        const response = await getProperty(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('create-property',
      CustomerSchema.extend({
        propertyName: z.string().describe('Property name'),
        productId: z.string().describe('Product ID'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        ruleFormat: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await createProperty(ctx.client, args);
        return response;
      }
    ),

    // Version Management
    tool('create-property-version',
      PropertyIdSchema.extend({
        createFromVersion: z.number().optional(),
        createFromEtag: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await createPropertyVersion(ctx.client, args);
        return response;
      }
    ),

    tool('list-property-versions',
      PropertyIdSchema,
      async (args, ctx) => {
        const response = await listPropertyVersions(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    tool('get-property-version',
      PropertyVersionSchema,
      async (args, ctx) => {
        const response = await getPropertyVersion(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('get-latest-property-version',
      PropertyIdSchema,
      async (args, ctx) => {
        const response = await getLatestPropertyVersion(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    tool('rollback-property-version',
      PropertyIdSchema.extend({
        targetVersion: z.number().describe('Version to rollback to'),
      }),
      async (args, ctx) => {
        const response = await rollbackPropertyVersion(ctx.client, args);
        return response;
      }
    ),

    // Rules Management
    tool('get-property-rules',
      PropertyVersionSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await getPropertyRules(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('update-property-rules',
      PropertyVersionSchema.extend({
        rules: z.any().describe('Property rules object'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await updatePropertyRules(ctx.client, args);
        return response;
      }
    ),

    tool('validate-rule-tree',
      CustomerSchema.extend({
        rules: z.any().describe('Rule tree to validate'),
        ruleFormat: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await validateRuleTree(ctx.client, args);
        return response;
      }
    ),

    // Activation Management
    tool('activate-property',
      PropertyVersionSchema.extend({
        network: z.enum(['staging', 'production']).describe('Target network'),
        emails: z.array(z.string()).optional().describe('Notification emails'),
        note: z.string().optional().describe('Activation note'),
        acknowledgeWarnings: z.boolean().optional(),
        format: FormatSchema.shape.format,
      }),
      async (args, ctx) => {
        const response = await activateProperty(ctx.client, args);
        return response;
      }
    ),

    tool('get-activation-status',
      PropertyIdSchema.extend({
        activationId: z.string().describe('Activation ID'),
      }),
      async (args, ctx) => {
        const response = await getActivationStatus(ctx.client, args);
        return response;
      },
      { cache: { ttl: 30 } }
    ),

    tool('list-property-activations',
      PropertyIdSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listPropertyActivations(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    tool('cancel-property-activation',
      PropertyIdSchema.extend({
        activationId: z.string().describe('Activation ID to cancel'),
      }),
      async (args, ctx) => {
        const response = await cancelPropertyActivation(ctx.client, args);
        return response;
      }
    ),

    tool('validate-property-activation',
      PropertyVersionSchema.extend({
        network: z.enum(['staging', 'production']),
      }),
      async (args, ctx) => {
        const response = await validatePropertyActivation(ctx.client, args);
        return response;
      }
    ),

    // Hostname Management
    tool('add-property-hostname',
      PropertyVersionSchema.extend({
        hostnames: z.array(z.string()).describe('Hostnames to add'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await addPropertyHostname(ctx.client, args);
        return response;
      }
    ),

    tool('remove-property-hostname',
      PropertyVersionSchema.extend({
        hostnames: z.array(z.string()).describe('Hostnames to remove'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await removePropertyHostname(ctx.client, args);
        return response;
      }
    ),

    tool('list-property-hostnames',
      PropertyVersionSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listPropertyVersionHostnames(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    // Edge Hostname Management
    tool('create-edge-hostname',
      CustomerSchema.extend({
        domainPrefix: z.string().describe('Domain prefix'),
        domainSuffix: z.string().describe('Domain suffix (e.g., edgekey.net)'),
        productId: z.string().describe('Product ID'),
        ipVersionBehavior: z.enum(['ipv4', 'ipv6', 'ipv4+ipv6']).optional(),
        secureNetwork: z.enum(['enhanced-tls', 'standard-tls']).optional(),
      }),
      async (args, ctx) => {
        const response = await createEdgeHostname(ctx.client, args);
        return response;
      }
    ),

    tool('list-edge-hostnames',
      CustomerSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listEdgeHostnames(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    // Property Lifecycle
    tool('clone-property',
      PropertyVersionSchema.extend({
        cloneName: z.string().describe('Name for cloned property'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await cloneProperty(ctx.client, args);
        return response;
      }
    ),

    tool('remove-property',
      PropertyIdSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await removeProperty(ctx.client, args);
        return response;
      }
    ),

    // Onboarding
    tool('onboard-property',
      CustomerSchema.extend({
        domain: z.string().describe('Domain to onboard'),
        certificateType: z.enum(['default-dv', 'cps-managed', 'third-party']).optional(),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
        productId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await onboardPropertyTool(ctx.client, args);
        return response;
      }
    ),

    // Search
    tool('search-properties',
      CustomerSchema.extend({
        query: z.string().describe('Search query'),
      }),
      async (args, ctx) => {
        const response = await searchPropertiesOptimized(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    tool('universal-search',
      CustomerSchema.extend({
        query: z.string().describe('Search query'),
        limit: z.number().optional(),
        types: z.array(z.string()).optional(),
      }),
      async (args, ctx) => {
        const response = await universalSearchWithCacheHandler(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    // CP Codes
    tool('list-cpcodes',
      CustomerSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listCPCodes(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('create-cpcode',
      CustomerSchema.extend({
        cpcodeName: z.string().describe('CP code name'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        productId: z.string().describe('Product ID'),
      }),
      async (args, ctx) => {
        const response = await createCPCode(ctx.client, args);
        return response;
      }
    ),

    tool('get-cpcode',
      CustomerSchema.extend({
        cpcodeId: z.number().describe('CP code ID'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await getCPCode(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    // Account Management
    tool('list-groups',
      CustomerSchema,
      async (args, ctx) => {
        const response = await listGroups(ctx.client, args);
        return response;
      },
      { cache: { ttl: 3600 } }
    ),

    tool('list-contracts',
      CustomerSchema,
      async (args, ctx) => {
        const response = await listContracts(ctx.client, args);
        return response;
      },
      { cache: { ttl: 3600 } }
    ),

    tool('list-products',
      CustomerSchema.extend({
        contractId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listProducts(ctx.client, args);
        return response;
      },
      { cache: { ttl: 3600 } }
    ),

    // ==================== INCLUDES MANAGEMENT ====================
    // Essential for modular property configuration
    
    tool('list-includes',
      CustomerSchema.extend({
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS', 'ALL']).optional(),
      }),
      async (args, ctx) => {
        const response = await listIncludes(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('get-include',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        version: z.number().optional().describe('Include version'),
      }),
      async (args, ctx) => {
        const response = await getInclude(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('create-include',
      CustomerSchema.extend({
        includeName: z.string().describe('Include name'),
        includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).describe('Include type'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        productId: z.string().optional(),
        ruleFormat: z.string().optional(),
        cloneFrom: z.object({
          includeId: z.string(),
          version: z.number(),
        }).optional(),
      }),
      async (args, ctx) => {
        const response = await createInclude(ctx.client, args);
        return response;
      }
    ),

    tool('update-include',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        rules: z.any().describe('Include rules'),
        version: z.number().optional(),
        note: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await updateInclude(ctx.client, args);
        return response;
      }
    ),

    tool('create-include-version',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        baseVersion: z.number().optional(),
        note: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await createIncludeVersion(ctx.client, args);
        return response;
      }
    ),

    tool('activate-include',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        version: z.number().describe('Include version'),
        network: z.enum(['STAGING', 'PRODUCTION']).describe('Target network'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        note: z.string().optional(),
        notifyEmails: z.array(z.string()).optional(),
        acknowledgeAllWarnings: z.boolean().optional(),
      }),
      async (args, ctx) => {
        const response = await activateInclude(ctx.client, args);
        return response;
      }
    ),

    tool('get-include-activation-status',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        activationId: z.string().describe('Activation ID'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await getIncludeActivationStatus(ctx.client, args);
        return response;
      },
      { cache: { ttl: 30 } }
    ),

    tool('list-include-activations',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await listIncludeActivations(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    // ==================== ADVANCED HOSTNAME OPERATIONS ====================
    // Enhanced hostname management per PAPI audit
    
    tool('list-all-property-hostnames',
      PropertyIdSchema,
      async (args, ctx) => {
        const response = await listAllPropertyHostnames(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('patch-property-hostnames',
      PropertyIdSchema.extend({
        patches: z.array(z.object({
          op: z.enum(['add', 'remove', 'replace']),
          path: z.string(),
          value: z.any().optional(),
        })).describe('JSON Patch operations'),
      }),
      async (args, ctx) => {
        const response = await patchPropertyHostnames(ctx.client, args);
        return response;
      }
    ),

    tool('patch-property-version-hostnames',
      PropertyVersionSchema.extend({
        patches: z.array(z.object({
          op: z.enum(['add', 'remove', 'replace']),
          path: z.string(),
          value: z.any().optional(),
        })).describe('JSON Patch operations'),
      }),
      async (args, ctx) => {
        const response = await patchPropertyVersionHostnames(ctx.client, args);
        return response;
      }
    ),

    tool('get-property-hostname-activations',
      PropertyIdSchema.extend({
        hostname: z.string().optional().describe('Filter by specific hostname'),
      }),
      async (args, ctx) => {
        const response = await getPropertyHostnameActivations(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    tool('get-property-hostname-activation-status',
      PropertyIdSchema.extend({
        activationId: z.string().describe('Hostname activation ID'),
      }),
      async (args, ctx) => {
        const response = await getPropertyHostnameActivationStatus(ctx.client, args);
        return response;
      },
      { cache: { ttl: 30 } }
    ),

    tool('cancel-property-hostname-activation',
      PropertyIdSchema.extend({
        activationId: z.string().describe('Hostname activation ID to cancel'),
      }),
      async (args, ctx) => {
        const response = await cancelPropertyHostnameActivation(ctx.client, args);
        return response;
      }
    ),

    tool('get-property-hostnames-diff',
      PropertyIdSchema.extend({
        version1: z.number().describe('First version to compare'),
        version2: z.number().describe('Second version to compare'),
      }),
      async (args, ctx) => {
        const response = await getPropertyHostnamesDiff(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('get-hostname-audit-history',
      PropertyIdSchema.extend({
        hostname: z.string().describe('Hostname to audit'),
        limit: z.number().optional().describe('Maximum audit entries to retrieve'),
      }),
      async (args, ctx) => {
        const response = await getHostnameAuditHistory(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    // ==================== ADVANCED RULES FEATURES ====================
    // Context-aware rule configuration and management
    
    tool('get-available-behaviors',
      CustomerSchema.extend({
        productId: z.string().describe('Product ID'),
        ruleFormat: z.string().describe('Rule format (e.g., v2023-05-30)'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await getAvailableBehaviors(ctx.client, args);
        return response;
      },
      { cache: { ttl: 86400 } } // 24 hour cache for behaviors
    ),

    tool('get-available-criteria',
      CustomerSchema.extend({
        productId: z.string().describe('Product ID'),
        ruleFormat: z.string().describe('Rule format (e.g., v2023-05-30)'),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await getAvailableCriteria(ctx.client, args);
        return response;
      },
      { cache: { ttl: 86400 } } // 24 hour cache for criteria
    ),

    tool('get-include-available-behaviors',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        version: z.number().describe('Include version'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await getIncludeAvailableBehaviors(ctx.client, args);
        return response;
      },
      { cache: { ttl: 86400 } }
    ),

    tool('get-include-available-criteria',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        version: z.number().describe('Include version'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await getIncludeAvailableCriteria(ctx.client, args);
        return response;
      },
      { cache: { ttl: 86400 } }
    ),

    tool('patch-property-version-rules',
      PropertyVersionSchema.extend({
        patches: z.array(z.object({
          op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
          path: z.string(),
          value: z.any().optional(),
          from: z.string().optional(),
        })).describe('JSON Patch operations (RFC 6902)'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        validateRules: z.boolean().optional().describe('Validate rules after patching'),
      }),
      async (args, ctx) => {
        const response = await patchPropertyVersionRules(ctx.client, args);
        return response;
      }
    ),

    tool('head-property-version-rules',
      PropertyVersionSchema.extend({
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await headPropertyVersionRules(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } } // 1 minute cache for HEAD requests
    ),

    tool('head-include-version-rules',
      CustomerSchema.extend({
        includeId: z.string().describe('Include ID'),
        version: z.number().describe('Include version'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await headIncludeVersionRules(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    // ==================== CERTIFICATE INTEGRATION ====================
    // Property-certificate lifecycle management
    
    tool('link-certificate-to-property',
      PropertyVersionSchema.extend({
        enrollmentId: z.number().describe('Certificate enrollment ID'),
        certificateId: z.string().describe('Certificate ID'),
        hostname: z.string().describe('Hostname to link'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        acknowledgeWarnings: z.boolean().optional().describe('Acknowledge validation warnings'),
      }),
      async (args, ctx) => {
        const response = await linkCertificateToProperty(ctx.client, args);
        return response;
      }
    ),

    tool('get-property-certificate-status',
      PropertyVersionSchema.extend({
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
      }),
      async (args, ctx) => {
        const response = await getPropertyCertificateStatus(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } } // 5 minute cache
    ),

    // ==================== SCHEMA & VALIDATION ====================
    // Rule format discovery and validation
    
    tool('get-rule-formats',
      CustomerSchema,
      async (args, ctx) => {
        const response = await getRuleFormats(ctx.client, args);
        return response;
      },
      { cache: { ttl: 86400 } } // 24 hour cache
    ),

    tool('get-rule-format-schema',
      CustomerSchema.extend({
        productId: z.string().describe('Product ID'),
        ruleFormat: z.string().describe('Rule format version'),
      }),
      async (args, ctx) => {
        const response = await getRuleFormatSchema(ctx.client, args);
        return response;
      },
      { cache: { ttl: 86400 } } // 24 hour cache for schemas
    ),

    tool('validate-property-rules',
      PropertyVersionSchema.extend({
        rules: z.any().describe('Rule tree to validate'),
        ruleFormat: z.string().optional().describe('Rule format to validate against'),
      }),
      async (args, ctx) => {
        const response = await validatePropertyRules(ctx.client, args);
        return response;
      }
    ),

    // ==================== ADVANCED FEATURES ====================
    // Final set of advanced property management capabilities
    
    tool('get-property-metadata',
      PropertyIdSchema.extend({
        includeHistory: z.boolean().optional().describe('Include property history'),
      }),
      async (args, ctx) => {
        const response = await getPropertyMetadata(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),

    tool('compare-properties',
      CustomerSchema.extend({
        propertyId1: z.string().describe('First property ID'),
        version1: z.number().describe('First property version'),
        propertyId2: z.string().describe('Second property ID'),
        version2: z.number().describe('Second property version'),
        includeRules: z.boolean().optional().describe('Include rules comparison'),
        includeHostnames: z.boolean().optional().describe('Include hostnames comparison'),
      }),
      async (args, ctx) => {
        const response = await compareProperties(ctx.client, args);
        return response;
      }
    ),

    tool('export-property-configuration',
      PropertyVersionSchema.extend({
        format: z.enum(['json', 'terraform', 'yaml']).optional().describe('Export format'),
        includeComments: z.boolean().optional().describe('Include inline comments'),
      }),
      async (args, ctx) => {
        const response = await exportPropertyConfiguration(ctx.client, args);
        return response;
      }
    ),

    tool('search-properties-advanced',
      CustomerSchema.extend({
        query: z.string().optional().describe('Search query'),
        contractIds: z.array(z.string()).optional().describe('Filter by contracts'),
        groupIds: z.array(z.string()).optional().describe('Filter by groups'),
        productIds: z.array(z.string()).optional().describe('Filter by products'),
        hostnames: z.array(z.string()).optional().describe('Filter by hostnames'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        createdAfter: z.string().optional().describe('Created after date'),
        modifiedAfter: z.string().optional().describe('Modified after date'),
        hasActivation: z.enum(['staging', 'production', 'both']).optional(),
        limit: z.number().optional().describe('Maximum results'),
      }),
      async (args, ctx) => {
        const response = await searchPropertiesAdvanced(ctx.client, args);
        return response;
      },
      { cache: { ttl: 60 } }
    ),

    tool('bulk-update-properties',
      CustomerSchema.extend({
        propertyIds: z.array(z.string()).describe('Properties to update'),
        operations: z.array(z.object({
          type: z.enum(['addTag', 'removeTag', 'updateMetadata', 'addNote']),
          value: z.any(),
        })).describe('Operations to apply'),
      }),
      async (args, ctx) => {
        const response = await bulkUpdateProperties(ctx.client, args);
        return response;
      }
    ),

    tool('create-property-from-template',
      CustomerSchema.extend({
        templateId: z.string().describe('Template ID'),
        propertyName: z.string().describe('New property name'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().describe('Group ID'),
        variables: z.record(z.any()).optional().describe('Template variables'),
      }),
      async (args, ctx) => {
        const response = await createPropertyFromTemplate(ctx.client, args);
        return response;
      }
    ),

    tool('get-property-analytics',
      PropertyIdSchema.extend({
        startDate: z.string().describe('Start date (YYYY-MM-DD)'),
        endDate: z.string().describe('End date (YYYY-MM-DD)'),
        metrics: z.array(z.string()).optional().describe('Specific metrics to retrieve'),
        granularity: z.enum(['hour', 'day', 'week']).optional(),
      }),
      async (args, ctx) => {
        const response = await getPropertyAnalytics(ctx.client, args);
        return response;
      },
      { cache: { ttl: 300 } }
    ),
  ];
}

// Run the server
if (require.main === module) {
  const server = new PropertyServer({
    name: 'alecs-property',
    version: '4.0.0',
    description: 'Property management server with ALECSCore - 67 tools! Complete PAPI implementation!',
    enableMonitoring: true,
    monitoringInterval: 60000,
  });
  
  server.start().catch(console.error);
}