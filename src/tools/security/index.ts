/**
 * Security Domain Exports
 * 
 * Unified exports for all security-related tools, including AppSec and Network Lists.
 */

import { networkListOperations } from './network-lists';
// Future import for appsec operations:
// import { appsecOperations } from './appsec';

export const securityOperations = {
  ...networkListOperations,
  // ...appsecOperations,
};