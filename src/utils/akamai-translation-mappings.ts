/**
 * Akamai Translation Mappings Utility
 * 
 * Extracted from AkamaiOperation for better maintainability
 * Contains common ID translation patterns used across domains
 */

import type { Translation } from '../services/id-translation-service';

/**
 * Translation mapping configuration
 */
export interface TranslationMapping {
  /** JSON path to the ID field (supports wildcards) */
  path: string;
  /** Type of ID to translate */
  type: Translation['type'];
  /** Whether translation is enabled for this mapping */
  enabled?: boolean;
}

/**
 * Common translation mappings used across domains
 * These patterns automatically translate cryptic IDs to human-readable names
 */
export const COMMON_TRANSLATION_MAPPINGS: Record<string, TranslationMapping[]> = {
  property: [
    { path: 'propertyId', type: 'property' },
    { path: '*.propertyId', type: 'property' },
    { path: 'properties.*.propertyId', type: 'property' },
    { path: 'items.*.propertyId', type: 'property' },
    { path: 'contractId', type: 'contract' },
    { path: '*.contractId', type: 'contract' },
    { path: 'groupId', type: 'group' },
    { path: '*.groupId', type: 'group' },
  ],
  contract: [
    { path: 'contractId', type: 'contract' },
    { path: '*.contractId', type: 'contract' },
    { path: 'contracts.*.contractId', type: 'contract' },
    { path: 'contractIds.*', type: 'contract' },
  ],
  group: [
    { path: 'groupId', type: 'group' },
    { path: '*.groupId', type: 'group' },
    { path: 'groups.*.groupId', type: 'group' },
    { path: 'items.*.groupId', type: 'group' },
  ],
  product: [
    { path: 'productId', type: 'product' },
    { path: '*.productId', type: 'product' },
    { path: 'products.*.productId', type: 'product' },
    { path: 'availableProducts.*.productId', type: 'product' },
  ],
  certificate: [
    { path: 'enrollmentId', type: 'certificate' },
    { path: '*.enrollmentId', type: 'certificate' },
    { path: 'enrollments.*.enrollmentId', type: 'certificate' },
    { path: 'certificateId', type: 'certificate' },
    { path: '*.certificateId', type: 'certificate' },
  ],
  network_list: [
    { path: 'networkListId', type: 'network_list' },
    { path: '*.networkListId', type: 'network_list' },
    { path: 'lists.*.networkListId', type: 'network_list' },
    { path: 'uniqueId', type: 'network_list' },
    { path: '*.uniqueId', type: 'network_list' },
  ],
  cpcode: [
    { path: 'cpcodeId', type: 'cpcode' },
    { path: '*.cpcodeId', type: 'cpcode' },
    { path: 'cpcodes.*.cpcodeId', type: 'cpcode' },
    { path: 'cpCode', type: 'cpcode' },
    { path: '*.cpCode', type: 'cpcode' },
  ],
  all: [
    // Combine all common mappings for comprehensive translation
    { path: '**.propertyId', type: 'property' },
    { path: '**.contractId', type: 'contract' },
    { path: '**.groupId', type: 'group' },
    { path: '**.productId', type: 'product' },
    { path: '**.enrollmentId', type: 'certificate' },
    { path: '**.certificateId', type: 'certificate' },
    { path: '**.networkListId', type: 'network_list' },
    { path: '**.uniqueId', type: 'network_list' },
    { path: '**.cpcodeId', type: 'cpcode' },
    { path: '**.cpCode', type: 'cpcode' },
  ]
};

/**
 * Get translation mappings for a specific domain
 */
export function getTranslationMappings(domain: string): TranslationMapping[] {
  return COMMON_TRANSLATION_MAPPINGS[domain] || COMMON_TRANSLATION_MAPPINGS.all;
}

/**
 * Get all available translation domains
 */
export function getAvailableTranslationDomains(): string[] {
  return Object.keys(COMMON_TRANSLATION_MAPPINGS).filter(key => key !== 'all');
}