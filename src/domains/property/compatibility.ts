/**
 * Property Domain - Backwards Compatibility Layer
 * 
 * CODE KAI: Provides seamless migration path from old scattered functions
 * to new consolidated API without breaking existing code.
 * 
 * This file creates wrapper functions that maintain the exact same
 * signatures as the original functions while delegating to the new API.
 */

import type { AkamaiClient } from '../../akamai-client';
import { property } from './index';
import { deprecationWarning } from '../../core/compatibility';

/**
 * Legacy function signatures maintained for compatibility
 */

// From property-tools.ts
export async function listProperties(
  client: AkamaiClient,
  contractId?: string,
  groupId?: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'listProperties',
    'property.list',
    'import { property } from "../domains/property"; await property.list(client, { contractId, groupId, customer })'
  );
  
  const response = await property.list(client, { contractId, groupId, customer });
  return response.properties;
}

export async function getProperty(
  client: AkamaiClient,
  propertyId: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'getProperty',
    'property.get',
    'import { property } from "../domains/property"; await property.get(client, { propertyId, customer })'
  );
  
  return property.get(client, { propertyId, customer });
}

// From property-manager-tools.ts
export async function createPropertyVersion(
  client: AkamaiClient,
  propertyId: string,
  createFromVersion?: number,
  createFromEtag?: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'createPropertyVersion',
    'property.version.create',
    'import { property } from "../domains/property"; await property.version.create(client, { propertyId, createFromVersion, createFromEtag, customer })'
  );
  
  return property.version.create(client, {
    propertyId,
    createFromVersion,
    createFromEtag,
    customer,
  });
}

export async function getPropertyVersion(
  client: AkamaiClient,
  propertyId: string,
  version: number,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'getPropertyVersion',
    'property.version.get',
    'import { property } from "../domains/property"; await property.version.get(client, { propertyId, version, customer })'
  );
  
  return property.version.get(client, { propertyId, version, customer });
}

export async function listPropertyVersions(
  client: AkamaiClient,
  propertyId: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'listPropertyVersions',
    'property.version.list',
    'import { property } from "../domains/property"; await property.version.list(client, { propertyId, customer })'
  );
  
  return property.version.list(client, { propertyId, customer });
}

// From property-manager.ts
export async function getPropertyRules(
  client: AkamaiClient,
  propertyId: string,
  version: number,
  contractId?: string,
  groupId?: string,
  validateRules?: boolean,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'getPropertyRules',
    'property.rules.get',
    'import { property } from "../domains/property"; await property.rules.get(client, { propertyId, version, validateRules, customer })'
  );
  
  return property.rules.get(client, {
    propertyId,
    version,
    validateRules,
    customer,
  });
}

export async function updatePropertyRules(
  client: AkamaiClient,
  propertyId: string,
  version: number,
  rules: any,
  contractId?: string,
  groupId?: string,
  validateRules?: boolean,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'updatePropertyRules',
    'property.rules.update',
    'import { property } from "../domains/property"; await property.rules.update(client, { propertyId, version, rules, validateRules, customer })'
  );
  
  return property.rules.update(client, {
    propertyId,
    version,
    rules,
    validateRules,
    customer,
  });
}

// From property-activation-advanced.ts
export async function activateProperty(
  client: AkamaiClient,
  propertyId: string,
  version: number,
  network: 'staging' | 'production',
  note?: string,
  emails?: string[],
  acknowledgeWarnings?: boolean,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'activateProperty',
    'property.activation.create',
    'import { property } from "../domains/property"; await property.activation.create(client, { propertyId, version, network, note, emails, acknowledgeWarnings, customer })'
  );
  
  return property.activation.create(client, {
    propertyId,
    version,
    network,
    note,
    emails,
    acknowledgeWarnings,
    customer,
  });
}

export async function getActivationStatus(
  client: AkamaiClient,
  propertyId: string,
  activationId: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'getActivationStatus',
    'property.activation.status',
    'import { property } from "../domains/property"; await property.activation.status(client, { propertyId, activationId, customer })'
  );
  
  return property.activation.status(client, {
    propertyId,
    activationId,
    customer,
  });
}

export async function listPropertyActivations(
  client: AkamaiClient,
  propertyId: string,
  contractId?: string,
  groupId?: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'listPropertyActivations',
    'property.activation.list',
    'import { property } from "../domains/property"; await property.activation.list(client, { propertyId, customer })'
  );
  
  return property.activation.list(client, { propertyId, customer });
}

export async function cancelPropertyActivation(
  client: AkamaiClient,
  propertyId: string,
  activationId: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'cancelPropertyActivation',
    'property.activation.cancel',
    'import { property } from "../domains/property"; await property.activation.cancel(client, { propertyId, activationId, customer })'
  );
  
  return property.activation.cancel(client, {
    propertyId,
    activationId,
    customer,
  });
}

// From property-tools.ts
export async function removeProperty(
  client: AkamaiClient,
  propertyId: string,
  contractId?: string,
  groupId?: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'removeProperty',
    'property.delete',
    'import { property } from "../domains/property"; await property.delete(client, { propertyId, customer })'
  );
  
  return property.delete(client, { propertyId, customer });
}

export async function createProperty(
  client: AkamaiClient,
  propertyName: string,
  productId: string,
  contractId: string,
  groupId: string,
  ruleFormat?: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'createProperty',
    'property.create',
    'import { property } from "../domains/property"; await property.create(client, { propertyName, productId, contractId, groupId, ruleFormat, customer })'
  );
  
  return property.create(client, {
    propertyName,
    productId,
    contractId,
    groupId,
    ruleFormat,
    customer,
  });
}

// From property-manager-tools.ts (supporting resources)
export async function listContracts(
  client: AkamaiClient,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'listContracts',
    'property.contracts.list',
    'import { property } from "../domains/property"; await property.contracts.list(client, { customer })'
  );
  
  return property.contracts.list(client, { customer });
}

export async function listGroups(
  client: AkamaiClient,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'listGroups',
    'property.groups.list',
    'import { property } from "../domains/property"; await property.groups.list(client, { customer })'
  );
  
  return property.groups.list(client, { customer });
}

export async function listProducts(
  client: AkamaiClient,
  contractId: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'listProducts',
    'property.products.list',
    'import { property } from "../domains/property"; await property.products.list(client, { contractId, customer })'
  );
  
  return property.products.list(client, { contractId, customer });
}

/**
 * Additional legacy signatures from various property files
 */

// From property-tools-paginated.ts
export async function listPropertiesPaginated(
  client: AkamaiClient,
  options: {
    contractId?: string;
    groupId?: string;
    customer?: string;
    limit?: number;
    offset?: number;
  }
): Promise<any> {
  deprecationWarning(
    'listPropertiesPaginated',
    'property.list',
    'import { property } from "../domains/property"; await property.list(client, options)'
  );
  
  return property.list(client, options);
}

// From property-search-optimized.ts
export async function searchProperties(
  client: AkamaiClient,
  propertyName: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'searchProperties',
    'property.list',
    'import { property } from "../domains/property"; // Use property.list with filtering'
  );
  
  // Simulate search by listing all and filtering
  const response = await property.list(client, { customer });
  const searchTerm = propertyName.toLowerCase();
  
  return {
    properties: {
      items: response.properties.items.filter(p =>
        p.propertyName.toLowerCase().includes(searchTerm)
      ),
    },
  };
}

// From property-error-handling-tools.ts
export async function getPropertyWithErrorHandling(
  client: AkamaiClient,
  propertyId: string,
  customer?: string
): Promise<any> {
  deprecationWarning(
    'getPropertyWithErrorHandling',
    'property.get',
    'import { property } from "../domains/property"; // Error handling is now built-in'
  );
  
  // The new API already has comprehensive error handling
  return property.get(client, { propertyId, customer });
}

/**
 * Export namespace for grouped compatibility
 * This allows existing code using imports like:
 * import * as propertyTools from './property-tools'
 */
export const propertyTools = {
  listProperties,
  getProperty,
  createProperty,
  removeProperty,
};

export const propertyManager = {
  createPropertyVersion,
  getPropertyVersion,
  listPropertyVersions,
  getPropertyRules,
  updatePropertyRules,
};

export const propertyActivation = {
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  cancelPropertyActivation,
};

export const propertySupport = {
  listContracts,
  listGroups,
  listProducts,
};