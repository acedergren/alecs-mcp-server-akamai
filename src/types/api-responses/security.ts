/**
 * Application Security API Response Types
 * @see https://techdocs.akamai.com/application-security/reference/api
 */

import { ActivationStatus, NetworkType } from './common';

/**
 * Security configuration
 */
export interface SecurityConfiguration {
  id: number;
  name: string;
  description?: string;
  contractId: string;
  configId: number;
  version: number;
  productionVersion?: number;
  stagingVersion?: number;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  createDate?: string;
  createdBy?: string;
}

/**
 * Response from /appsec/v1/configs
 */
export interface SecurityConfigurationListResponse {
  configurations: SecurityConfiguration[];
}

/**
 * Security policy
 */
export interface SecurityPolicy {
  policyId: string;
  policyName: string;
  policyType?: 'WAF' | 'RATE' | 'CUSTOM';
  hasRatePolicyProtection?: boolean;
  hasSlowPostProtection?: boolean;
  hasApiRequestConstraintsProtection?: boolean;
  hasIpGeoProtection?: boolean;
  hasWafProtection?: boolean;
  hasMalwareProtection?: boolean;
  hasReputationProtection?: boolean;
  securityControls?: {
    applyApiConstraints?: boolean;
    applyApplicationLayerControls?: boolean;
    applyBotmanControls?: boolean;
    applyMalwareControls?: boolean;
    applyNetworkLayerControls?: boolean;
    applyRateLimiting?: boolean;
    applyReputationControls?: boolean;
    applySlowPostControls?: boolean;
  };
}

/**
 * Response from /appsec/v1/configs/{configId}/versions/{version}/security-policies
 */
export interface SecurityPolicyListResponse {
  policies: SecurityPolicy[];
}

/**
 * Match target for security policies
 */
export interface MatchTarget {
  targetId: number;
  isNegativePathMatch?: boolean;
  isNegativeFileExtensionMatch?: boolean;
  defaultFile?: string;
  hostnames?: string[];
  paths?: string[];
  fileExtensions?: string[];
  securityPolicy?: {
    policyId: string;
    policyName?: string;
  };
  bypassNetworkLists?: {
    networkLists?: string[];
  };
}

/**
 * Response from /appsec/v1/configs/{configId}/versions/{version}/match-targets
 */
export interface MatchTargetListResponse {
  matchTargets: {
    websiteTargets?: MatchTarget[];
    apiTargets?: MatchTarget[];
  };
}

/**
 * Rate policy
 */
export interface RatePolicy {
  id: number;
  name: string;
  description?: string;
  averageThreshold?: number;
  burstThreshold?: number;
  burstWindow?: number;
  clientIdentifier?: 'ip' | 'cookie' | 'header';
  matchType?: 'path' | 'cookie' | 'header' | 'postdata' | 'query';
  path?: {
    positiveMatch?: boolean;
    values?: string[];
  };
  pathMatchType?: 'EXACT' | 'PREFIX';
  pathUriPositiveMatch?: boolean;
  requestType?: 'ForwardRequest' | 'ClientRequest' | 'BothRequest';
  sameActionOnIpv6?: boolean;
  type?: 'WAF' | 'RATE' | 'SLOW_POST';
  useXForwardForHeaders?: boolean;
}

/**
 * Response from /appsec/v1/configs/{configId}/versions/{version}/rate-policies
 */
export interface RatePolicyListResponse {
  ratePolicies: RatePolicy[];
}

/**
 * Custom rule
 */
export interface CustomRule {
  id: number;
  name: string;
  description?: string;
  version?: number;
  tag?: string[];
  conditions?: Array<{
    type: string;
    positiveMatch?: boolean;
    name?: string[];
    nameCase?: boolean;
    nameWildcard?: boolean;
    value?: string[];
    valueCase?: boolean;
    valueWildcard?: boolean;
    valueExactMatch?: boolean;
    valueRecursive?: boolean;
  }>;
  ruleActivated?: boolean;
  samplingRate?: number;
  logData?: string;
  operation?: 'AND' | 'OR';
}

/**
 * Response from /appsec/v1/configs/{configId}/versions/{version}/custom-rules
 */
export interface CustomRuleListResponse {
  customRules: CustomRule[];
}

/**
 * IP/Geo control lists
 */
export interface IPGeoLists {
  block?: {
    ipNetworkLists?: {
      networkListId: string;
      networkListName?: string;
    }[];
    geoNetworkLists?: {
      networkListId: string;
      networkListName?: string;
    }[];
  };
  allow?: {
    ipNetworkLists?: {
      networkListId: string;
      networkListName?: string;
    }[];
    geoNetworkLists?: {
      networkListId: string;
      networkListName?: string;
    }[];
  };
}

/**
 * Response from /appsec/v1/configs/{configId}/versions/{version}/security-policies/{policyId}/ip-geo
 */
export interface IPGeoResponse extends IPGeoLists {
  configId: number;
  version: number;
  policyId: string;
}

/**
 * Activation request
 */
export interface SecurityActivationRequest {
  activationConfigs: Array<{
    configId: number;
    configName: string;
    configVersion: number;
    previousVersion?: number;
  }>;
  network: NetworkType;
  note?: string;
  notificationEmails: string[];
  acknowledgeWarnings?: string[];
}

/**
 * Response from POST /appsec/v1/activations
 */
export interface SecurityActivationResponse {
  activationId: number;
  links?: {
    self?: string;
  };
}

/**
 * Response from GET /appsec/v1/activations/{activationId}
 */
export interface SecurityActivationStatusResponse {
  activationId: number;
  createdBy: string;
  createdDate: string;
  network: NetworkType;
  status: ActivationStatus;
  updateDate?: string;
  statusDetail?: string;
  activationConfigs: Array<{
    configId: number;
    configName: string;
    configVersion: number;
    previousVersion?: number;
  }>;
}

/**
 * SIEM events
 */
export interface SIEMEvent {
  attackData: {
    configId: string;
    policyId: string;
    clientIP: string;
    rules?: Array<{
      ruleId: string;
      ruleMessage?: string;
      ruleTag?: string;
      ruleSelector?: string;
    }>;
  };
  httpMessage: {
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    method?: string;
    path?: string;
    query?: string;
    protocol?: string;
    statusCode?: number;
  };
  geo?: {
    country?: string;
    city?: string;
    regionCode?: string;
  };
}

/**
 * Response from /siem/v1/configs/{configId}
 */
export interface SIEMEventsResponse {
  events: SIEMEvent[];
  offset?: number;
  limit?: number;
  total?: number;
}