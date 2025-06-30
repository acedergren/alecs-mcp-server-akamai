# Akamai Property Manager API (PAPI) TypeScript Interfaces

Based on the official Akamai API specifications from https://github.com/akamai/akamai-apis/tree/main/apis/papi/v1

## 1. Property Version Creation

### POST /papi/v1/properties/{propertyId}/versions

**Request:**
```typescript
interface PropertyVersionCreateRequest {
  createFromVersion: number; // minimum: 1
  createFromVersionEtag?: string;
}
```

**Response:**
```typescript
interface PropertyVersionCreateResponse {
  versionLink: string;
}
```

## 2. Property Rules

### GET /papi/v1/properties/{propertyId}/versions/{version}/rules

**Response:**
```typescript
interface PropertyVersionRulesGetResponse {
  accountId?: string;
  contractId?: string;
  etag?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number; // minimum: 1
  ruleFormat?: string;
  rules: RuleTree;
}

interface RuleTree {
  name: string; // Top-level must be "default"
  behaviors: Behavior[];
  options?: {
    is_secure?: boolean;
  };
  advancedOverride?: string;
  children?: RuleTree[];
  comment?: string;
  criteria?: Criterion[];
  criteriaLocked?: boolean; // readOnly
  customOverride?: {
    name: string;
    overrideId: string;
  };
  uuid?: string;
  variables?: Variable[];
}

interface Behavior {
  name: string;
  options: Record<string, any>;
  locked?: string;
  uuid?: string; // readOnly
}

interface Criterion {
  name: string;
  options: Record<string, any>;
  locked?: string;
  uuid?: string; // readOnly
}

interface Variable {
  name: string;
  description?: string;
  value?: string;
  hidden: boolean;
  sensitive: boolean;
}
```

### PUT /papi/v1/properties/{propertyId}/versions/{version}/rules

**Request:**
```typescript
interface PropertyVersionRulesSetRequest {
  rules: RuleTree; // Same structure as above
}
```

## 3. Edge Hostnames

### POST /papi/v1/edgehostnames

**Request:**
```typescript
interface EdgeHostnameCreateRequest {
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  ipVersionBehavior: 'IPV4' | 'IPV6_COMPLIANCE'; // default: 'IPV4'
  certEnrollmentId?: number; // minimum: 1, for Enhanced TLS
  secure?: boolean; // default: false
  secureNetwork?: 'ENHANCED_TLS' | 'STANDARD_TLS' | 'SHARED_CERT';
  slotNumber?: number; // minimum: 1, for ESSL
  useCases?: UseCase[]; // minItems: 0, maxItems: 2
}

interface UseCase {
  type: string;
  useCase: string;
  option: string;
}
```

**Response:**
```typescript
interface EdgeHostnameCreateResponse {
  edgeHostnameLink: string;
}
```

## 4. Property Hostnames

### GET /papi/v1/properties/{propertyId}/versions/{version}/hostnames

**Response:**
```typescript
interface PropertyVersionHostnamesGetResponse {
  accountId?: string;
  contractId?: string;
  etag?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number; // minimum: 1
  hostnames?: {
    items: Hostname[];
  };
}

interface Hostname {
  cnameFrom: string;
  cnameTo?: string;
  cnameType: 'EDGE_HOSTNAME';
  edgeHostnameId: string;
  certProvisioningType: 'CPS_MANAGED' | 'DEFAULT';
  certStatus?: {
    production?: any[];
    staging?: any[];
    validationCname?: any;
  };
}
```

### PUT /papi/v1/properties/{propertyId}/versions/{version}/hostnames

**Request:**
```typescript
type PropertyVersionHostnamesSetRequest = Hostname[]; // Array of Hostname objects
```

## 5. Property Activations

### POST /papi/v1/properties/{propertyId}/activations

**Request:**
```typescript
interface PropertyActivationCreateRequest {
  propertyVersion: number; // minimum: 1
  network: 'STAGING' | 'PRODUCTION';
  notifyEmails: string[]; // minItems: 1
  activationType?: 'ACTIVATE' | 'DEACTIVATE'; // default: 'ACTIVATE'
  acknowledgeAllWarnings?: boolean; // default: false
  acknowledgeWarnings?: string[]; // Array of warning IDs prefixed with 'msg_'
  delayValidations?: boolean | null;
  fastPush?: boolean; // default: true
  ignoreHttpErrors?: boolean; // default: true
  note?: string;
  useFastFallback?: boolean; // default: false
}
```

**Response:**
```typescript
interface PropertyActivationCreateResponse {
  activationLink: string;
}
```

### GET /papi/v1/properties/{propertyId}/activations

**Response:**
```typescript
interface PropertyActivationsGetResponse {
  accountId?: string;
  contractId?: string;
  groupId?: string;
  activations?: {
    items: Activation[];
  };
}

interface Activation {
  activationId: string;
  activationType: 'ACTIVATE' | 'DEACTIVATE';
  network: 'STAGING' | 'PRODUCTION';
  note: string;
  notifyEmails: string[];
  propertyId: string;
  propertyName: string;
  propertyVersion: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ABORTED' | 'FAILED' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING_DEACTIVATION' | 'NEW';
  submitDate: string;
  updateDate: string;
  acknowledgeAllWarnings?: boolean;
  acknowledgeWarnings?: string[];
  delayValidations?: boolean;
  fastPush?: boolean;
  ignoreHttpErrors?: boolean;
  useFastFallback?: boolean;
  fmaActivationState?: string;
  fallbackInfo?: {
    canFallback: boolean;
    fallbackVersion: number;
    fastFallbackAttempted: boolean;
    fastFallbackExpirationTime: string;
    fastFallbackRecoveryState?: string;
    steadyStateTime: string;
  };
}
```

## Common Response Wrapper

Many responses use a common wrapper structure:
```typescript
interface CommonResponse<T> {
  accountId?: string;
  contractId?: string;
  etag?: string;
  groupId?: string;
  [key: string]: T | string | undefined; // The main data is typically in a property matching the resource type
}
```

## Error Responses

All endpoints follow standard HTTP error codes with additional details:
```typescript
interface ErrorResponse {
  type: string; // URL to error documentation
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Array<{
    type: string;
    title: string;
    detail?: string;
    instance?: string;
    behaviorName?: string;
  }>;
}
```

## Important Notes

1. All API endpoints require EdgeGrid authentication
2. Most endpoints support `PAPI-Use-Prefixes: true` header for prefixed IDs
3. Property versions are immutable once created
4. Activations are asynchronous operations that require polling for status
5. Rule format versions affect available behaviors and criteria
6. Enhanced TLS edge hostnames require certificate enrollment IDs
7. All timestamps are in ISO 8601 format

Source: https://github.com/akamai/akamai-apis/tree/main/apis/papi/v1