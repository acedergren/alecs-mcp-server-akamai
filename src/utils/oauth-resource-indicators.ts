/**
 * OAuth 2.0 Resource Indicators (RFC 8707) Implementation
 * Handles validation and processing of resource indicators
 */

import { ResourceUri } from '@/services/oauth-resource-server';
import {
  type OAuthResourceIndicator,
  type OAuthResourceType,
  type OAuthProtectedResource,
  OAuthResourceType as ResourceType,
} from '@/types/oauth';

/**
 * Resource indicator validation result
 */
export interface ResourceIndicatorValidation {
  /** Whether validation passed */
  valid: boolean;
  /** Validated resources */
  resources?: ValidatedResource[];
  /** Validation errors */
  errors?: string[];
  /** Warnings (non-fatal issues) */
  warnings?: string[];
}

/**
 * Validated resource with parsed metadata
 */
export interface ValidatedResource {
  /** Original resource indicator */
  indicator: string;
  /** Parsed resource URI */
  uri: ResourceUri;
  /** Resource type */
  type: OAuthResourceType;
  /** Required scopes for this resource */
  requiredScopes: string[];
  /** Resource metadata if available */
  metadata?: Record<string, unknown>;
}

/**
 * Resource indicator validator
 */
export class ResourceIndicatorValidator {
  private readonly validationRules: Map<OAuthResourceType, ResourceValidationRule>;

  constructor(
    private readonly config: {
      /** Allowed resource types */
      allowedResourceTypes: OAuthResourceType[];
      /** Maximum number of resources per request */
      maxResourcesPerRequest: number;
      /** Whether to allow wildcard resources */
      allowWildcards: boolean;
      /** Custom validation rules */
      customRules?: Map<OAuthResourceType, ResourceValidationRule>;
    },
  ) {
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Initialize validation rules for each resource type
   */
  private initializeValidationRules(): Map<OAuthResourceType, ResourceValidationRule> {
    const rules = new Map<OAuthResourceType, ResourceValidationRule>();

    // Property validation rules
    rules.set(ResourceType.PROPERTY, {
      validateResourceId: (id: string) => /^prp_\d+$/.test(id),
      validateAccountId: (id: string) => /^(acc_|ctr_)\d+$/.test(id),
      requiredScopes: ['property:read'],
      allowSubPaths: true,
      subPathPattern: /^(versions|rules|hostnames|activations)\/?.*/,
    });

    // DNS Zone validation rules
    rules.set(ResourceType.DNS_ZONE, {
      validateResourceId: (id: string) => /^[a-zA-Z0-9.-]+\.(com|org|net|io|dev|edu|gov)$/.test(id),
      validateAccountId: (id: string) => /^(acc_|ctr_)\d+$/.test(id),
      requiredScopes: ['dns:read'],
      allowSubPaths: true,
      subPathPattern: /^(records|versions)\/?.*/,
    });

    // Certificate validation rules
    rules.set(ResourceType.CERTIFICATE, {
      validateResourceId: (id: string) => /^\d+$/.test(id),
      validateAccountId: (id: string) => /^acc_\d+$/.test(id),
      requiredScopes: ['certificate:read'],
      allowSubPaths: false,
    });

    // Network List validation rules
    rules.set(ResourceType.NETWORK_LIST, {
      validateResourceId: (id: string) => /^\d+_[A-Z]+$/.test(id),
      validateAccountId: (id: string) => /^acc_\d+$/.test(id),
      requiredScopes: ['network_list:read'],
      allowSubPaths: true,
      subPathPattern: /^(elements|activations)\/?.*/,
    });

    // Apply custom rules if provided
    if (this.config.customRules) {
      this.config.customRules.forEach((rule, type) => {
        rules.set(type, rule);
      });
    }

    return rules;
  }

  /**
   * Validate resource indicators
   */
  validate(indicators: OAuthResourceIndicator): ResourceIndicatorValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedResources: ValidatedResource[] = [];

    // Normalize resource array
    const resources = Array.isArray(indicators.resource)
      ? indicators.resource
      : [indicators.resource];

    // Check resource count
    if (resources.length > this.config.maxResourcesPerRequest) {
      errors.push(
        `Too many resources specified. Maximum allowed: ${this.config.maxResourcesPerRequest}`,
      );
      return { valid: false, errors };
    }

    // Validate each resource
    for (const resource of resources) {
      const validation = this.validateSingleResource(resource, indicators.resource_type);

      if (validation.error) {
        errors.push(validation.error);
      } else if (validation.warning) {
        warnings.push(validation.warning);
      }

      if (validation.resource) {
        validatedResources.push(validation.resource);
      }
    }

    // Validate scope consistency
    if (indicators.scope) {
      const scopeValidation = this.validateScopeConsistency(
        indicators.scope,
        validatedResources,
      );

      if (scopeValidation.errors) {
        errors.push(...scopeValidation.errors);
      }
      if (scopeValidation.warnings) {
        warnings.push(...scopeValidation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      resources: validatedResources,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate a single resource indicator
   */
  private validateSingleResource(
    resource: string,
    typeHint?: OAuthResourceType,
  ): {
    resource?: ValidatedResource;
    error?: string;
    warning?: string;
  } {
    // Handle wildcard resources
    if (resource === '*' || resource.includes('*')) {
      if (!this.config.allowWildcards) {
        return { error: `Wildcard resources not allowed: ${resource}` };
      }
      return { warning: `Wildcard resource specified: ${resource}` };
    }

    // Parse resource URI
    let uri: ResourceUri;
    try {
      uri = ResourceUri.parse(resource);
    } catch (error) {
      return { error: `Invalid resource URI format: ${resource}` };
    }

    // Validate resource type
    if (!this.config.allowedResourceTypes.includes(uri.resourceType)) {
      return { error: `Resource type not allowed: ${uri.resourceType}` };
    }

    // Check type hint consistency
    if (typeHint && typeHint !== uri.resourceType) {
      return { error: `Resource type mismatch: expected ${typeHint}, got ${uri.resourceType}` };
    }

    // Get validation rule for resource type
    const rule = this.validationRules.get(uri.resourceType);
    if (!rule) {
      return { error: `No validation rule for resource type: ${uri.resourceType}` };
    }

    // Validate resource ID
    if (!rule.validateResourceId(uri.resourceId)) {
      return { error: `Invalid resource ID format: ${uri.resourceId}` };
    }

    // Validate account ID
    if (!rule.validateAccountId(uri.accountId)) {
      return { error: `Invalid account ID format: ${uri.accountId}` };
    }

    // Validate sub-path if present
    if (uri.subPath) {
      if (!rule.allowSubPaths) {
        return { error: `Sub-paths not allowed for resource type: ${uri.resourceType}` };
      }

      if (rule.subPathPattern && !rule.subPathPattern.test(uri.subPath)) {
        return { error: `Invalid sub-path format: ${uri.subPath}` };
      }
    }

    // Create validated resource
    const validatedResource: ValidatedResource = {
      indicator: resource,
      uri,
      type: uri.resourceType,
      requiredScopes: rule.requiredScopes,
      metadata: {
        hasSubPath: !!uri.subPath,
        validated: new Date().toISOString(),
      },
    };

    return { resource: validatedResource };
  }

  /**
   * Validate scope consistency with resources
   */
  private validateScopeConsistency(
    requestedScope: string,
    resources: ValidatedResource[],
  ): {
    errors?: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requestedScopes = requestedScope.split(' ');

    for (const resource of resources) {
      // Check if requested scopes include required scopes for resource
      const missingRequired = resource.requiredScopes.filter(
        scope => !requestedScopes.includes(scope) && !this.hasWildcardScope(requestedScopes, scope),
      );

      if (missingRequired.length > 0) {
        warnings.push(
          `Resource ${resource.indicator} requires scopes: ${missingRequired.join(', ')}`,
        );
      }

      // Check for resource-specific scopes
      const resourceSpecificScopes = requestedScopes.filter(scope =>
        scope.includes(resource.uri.resourceId),
      );

      if (resourceSpecificScopes.length === 0) {
        warnings.push(
          `No resource-specific scopes requested for ${resource.indicator}`,
        );
      }
    }

    return {
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Check if a wildcard scope covers a specific scope
   */
  private hasWildcardScope(scopes: string[], targetScope: string): boolean {
    const scopeParts = targetScope.split(':');
    if (scopeParts.length < 2) {
      return false;
    }

    // Check for exact wildcard match (e.g., property:*)
    const wildcardScope = `${scopeParts[0]}:*`;
    if (scopes.includes(wildcardScope)) {
      return true;
    }

    // Check for higher-level wildcards (e.g., akamai:*)
    if (scopes.includes('akamai:*') || scopes.includes('*')) {
      return true;
    }

    return false;
  }

  /**
   * Generate resource-specific scopes for validated resources
   */
  generateResourceScopes(resources: ValidatedResource[]): string[] {
    const scopes = new Set<string>();

    for (const resource of resources) {
      // Add base required scopes
      resource.requiredScopes.forEach(scope => scopes.add(scope));

      // Generate resource-specific scopes
      const resourceScopes = this.generateResourceSpecificScopes(resource);
      resourceScopes.forEach(scope => scopes.add(scope));
    }

    return Array.from(scopes);
  }

  /**
   * Generate resource-specific scopes
   */
  private generateResourceSpecificScopes(resource: ValidatedResource): string[] {
    const scopes: string[] = [];
    const operations = ['read', 'write', 'delete'];

    // Generate scopes for each operation
    for (const operation of operations) {
      // Resource-specific scope
      scopes.push(`${resource.type}:${resource.uri.resourceId}:${operation}`);

      // Sub-path specific scope if applicable
      if (resource.uri.subPath) {
        const subPathScope = `${resource.type}:${resource.uri.resourceId}:${resource.uri.subPath}:${operation}`;
        scopes.push(subPathScope);
      }
    }

    // Add type-specific scopes
    switch (resource.type) {
      case ResourceType.PROPERTY:
        scopes.push(`property:${resource.uri.resourceId}:activate`);
        break;
      case ResourceType.CERTIFICATE:
        scopes.push(`certificate:${resource.uri.resourceId}:renew`);
        scopes.push(`certificate:${resource.uri.resourceId}:revoke`);
        break;
      case ResourceType.NETWORK_LIST:
        scopes.push(`network_list:${resource.uri.resourceId}:activate`);
        break;
    }

    return scopes;
  }
}

/**
 * Resource validation rule interface
 */
interface ResourceValidationRule {
  /** Validate resource ID format */
  validateResourceId: (id: string) => boolean;
  /** Validate account ID format */
  validateAccountId: (id: string) => boolean;
  /** Required base scopes */
  requiredScopes: string[];
  /** Whether sub-paths are allowed */
  allowSubPaths: boolean;
  /** Sub-path validation pattern */
  subPathPattern?: RegExp;
}

/**
 * Create default resource indicator validator
 */
export function createDefaultResourceIndicatorValidator(): ResourceIndicatorValidator {
  return new ResourceIndicatorValidator({
    allowedResourceTypes: Object.values(ResourceType),
    maxResourcesPerRequest: 10,
    allowWildcards: false,
  });
}

/**
 * Parse resource indicators from token request
 */
export function parseResourceIndicators(
  request: Record<string, unknown>,
): OAuthResourceIndicator | undefined {
  if (!request.resource) {
    return undefined;
  }

  const indicator: OAuthResourceIndicator = {
    resource: request.resource as string | string[],
  };

  if (request.resource_type) {
    indicator.resource_type = request.resource_type as OAuthResourceType;
  }

  if (request.scope) {
    indicator.scope = request.scope as string;
  }

  return indicator;
}

/**
 * Format resource indicators for token response
 */
export function formatResourceIndicators(
  resources: ValidatedResource[],
): string[] {
  return resources.map(r => r.indicator);
}
