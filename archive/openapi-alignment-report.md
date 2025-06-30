# OpenAPI Alignment Report

Total OpenAPI Endpoints: 79

## Property Manager Endpoints

### GET /includes/validation-results/{activationId}/properties/{propertyId}/versions/{propertyVersion}
Operation ID: get-include-validation

**Response Schema:**
```typescript
const get-include-validationResponseSchema = z.object({
  messages: z.array(z.object({
  autoIgnored: z.boolean(),
  id: z.string(),
  messageId: z.string(),
  messageParams: z.array(z.object({
  messageType: z.string(),
  node: z.object({
  name: z.string(),
  uuid: z.string(),
});,
  nodeLocation: z.string(),
  nodeType: z.enum(['feature', 'condition', 'rule']),
  parentRule: z.object({
  uuid: z.string(),
});,
  severity: z.string(),
});),
  severity: z.enum(['FATAL', 'ERROR', 'WARNING', 'INFO', 'OK', 'UNKNOWN']),
  source: z.enum(['MUI', 'VALIDATION_ENGINE', 'TOOLKIT', 'LOCK_CONSTRAINTS', 'HOSTNAME_CHECK', 'ORIGIN_ACL', 'API']),
  userHidden: z.boolean(),
  userSignedOff: z.boolean(),
});).optional(),
  result: z.string(),
  stats: z.object({
  elementsPerInclude: z.number(),
  numBehaviors: z.number(),
  numConditions: z.number(),
  numTopLevelChildren: z.number(),
});.optional(),
  validationTag: z.string().optional(),
});
```

### POST /properties
Operation ID: post-properties

**Response Schema:**
```typescript
const post-propertiesResponseSchema = z.object({
  propertyLink: z.string(),
});
```

### GET /properties
Operation ID: get-properties

**Response Schema:**
```typescript
const get-propertiesResponseSchema = z.object({
  properties: z.object({
  items: z.array(z.object({
  accountId: z.string(),
  assetId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  latestVersion: z.number(),
  note: z.string(),
  productId: z.string().optional(),
  productionVersion: z.union([z.union([z.number(), z.null()]), z.null()]),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyType: z.enum(['HOSTNAME_BUCKET', 'TRADITIONAL']).optional(),
  ruleFormat: z.string().optional(),
  stagingVersion: z.union([z.union([z.number(), z.null()]), z.null()]),
});).optional(),
});.optional(),
});
```

### GET /properties/{propertyId}
Operation ID: get-property

**Response Schema:**
```typescript
const get-propertyResponseSchema = z.object({
  properties: z.object({
  items: z.array(z.object({
  accountId: z.string(),
  assetId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  latestVersion: z.number(),
  note: z.string(),
  productId: z.string().optional(),
  productionVersion: z.union([z.union([z.number(), z.null()]), z.null()]),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyType: z.enum(['HOSTNAME_BUCKET', 'TRADITIONAL']).optional(),
  ruleFormat: z.string().optional(),
  stagingVersion: z.union([z.union([z.number(), z.null()]), z.null()]),
});).optional(),
});.optional(),
});
```

### DELETE /properties/{propertyId}
Operation ID: delete-property

**Response Schema:**
```typescript
const delete-propertyResponseSchema = z.object({
  message: z.string(),
});
```

### POST /properties/{propertyId}/activations
Operation ID: post-property-activations

**Response Schema:**
```typescript
const post-property-activationsResponseSchema = z.object({
  activationLink: z.string(),
});
```

### GET /properties/{propertyId}/activations
Operation ID: get-property-activations

**Response Schema:**
```typescript
const get-property-activationsResponseSchema = z.object({
  accountId: z.string().optional(),
  activations: z.object({
  items: z.array(z.object({
  accountId: z.string().optional(),
  activationId: z.string(),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  failureCause: z.object({}).passthrough().optional(),
  fallbackInfo: z.object({
  canFastFallback: z.boolean(),
  fallbackVersion: z.number(),
  fastFallbackAttempted: z.boolean(),
  fastFallbackExpirationTime: z.number(),
  fastFallbackRecoveryState: z.union([z.union([z.string(), z.null()]), z.null()]),
  propertyVersion: z.number().optional(),
  steadyStateTime: z.number(),
});.optional(),
  fmaActivationState: z.enum(['steady', 'received', 'lived', 'deployed', 'cancelling']).optional(),
  groupId: z.string().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string(),
  notifyEmails: z.array(z.string()),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyVersion: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'ABORTED', 'FAILED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'NEW']),
  submitDate: z.string(),
  updateDate: z.string(),
});).optional(),
});.optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});
```

### GET /properties/{propertyId}/activations/{activationId}
Operation ID: get-property-activation

**Response Schema:**
```typescript
const get-property-activationResponseSchema = z.object({
  accountId: z.string().optional(),
  activations: z.object({
  items: z.array(z.object({
  accountId: z.string().optional(),
  activationId: z.string(),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  failureCause: z.object({}).passthrough().optional(),
  fallbackInfo: z.object({
  canFastFallback: z.boolean(),
  fallbackVersion: z.number(),
  fastFallbackAttempted: z.boolean(),
  fastFallbackExpirationTime: z.number(),
  fastFallbackRecoveryState: z.union([z.union([z.string(), z.null()]), z.null()]),
  propertyVersion: z.number().optional(),
  steadyStateTime: z.number(),
});.optional(),
  fmaActivationState: z.enum(['steady', 'received', 'lived', 'deployed', 'cancelling']).optional(),
  groupId: z.string().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string(),
  notifyEmails: z.array(z.string()),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyVersion: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'ABORTED', 'FAILED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'NEW']),
  submitDate: z.string(),
  updateDate: z.string(),
});).optional(),
});.optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});
```

### DELETE /properties/{propertyId}/activations/{activationId}
Operation ID: delete-property-activation

**Response Schema:**
```typescript
const delete-property-activationResponseSchema = z.object({
  accountId: z.string().optional(),
  activations: z.object({
  items: z.array(z.object({
  accountId: z.string().optional(),
  activationId: z.string(),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  failureCause: z.object({}).passthrough().optional(),
  fallbackInfo: z.object({
  canFastFallback: z.boolean(),
  fallbackVersion: z.number(),
  fastFallbackAttempted: z.boolean(),
  fastFallbackExpirationTime: z.number(),
  fastFallbackRecoveryState: z.union([z.union([z.string(), z.null()]), z.null()]),
  propertyVersion: z.number().optional(),
  steadyStateTime: z.number(),
});.optional(),
  fmaActivationState: z.enum(['steady', 'received', 'lived', 'deployed', 'cancelling']).optional(),
  groupId: z.string().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string(),
  notifyEmails: z.array(z.string()),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyVersion: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'ABORTED', 'FAILED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'NEW']),
  submitDate: z.string(),
  updateDate: z.string(),
});).optional(),
});.optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});
```

### GET /properties/{propertyId}/hostname-activations
Operation ID: get-property-hostname-activations

**Response Schema:**
```typescript
const get-property-hostname-activationsResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  currentItemCount: z.number().optional(),
  groupId: z.string().optional(),
  hostnameActivations: z.object({
  currentItemCount: z.number().optional(),
  items: z.array(z.unknown()).optional(),
  nextLink: z.string().optional(),
  previousLink: z.string().optional(),
  totalItems: z.number().optional(),
});.optional(),
  nextLink: z.string().optional(),
  prevLink: z.string().optional(),
  totalItems: z.number().optional(),
});
```

### GET /properties/{propertyId}/hostname-activations/{hostnameActivationId}
Operation ID: get-property-hostname-activation

**Response Schema:**
```typescript
const get-property-hostname-activationResponseSchema = z.object({
  accountId: z.string().optional(),
  activations: z.object({}).passthrough().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  hostnameActivations: z.object({
  currentItemCount: z.number().optional(),
  items: z.array(z.object({
  accountId: z.string().optional(),
  activationId: z.string().optional(),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  fallbackInfo: z.object({
  canFastFallback: z.boolean(),
  fallbackVersion: z.number(),
  fastFallbackAttempted: z.boolean(),
  fastFallbackExpirationTime: z.number(),
  fastFallbackRecoveryState: z.union([z.union([z.string(), z.null()]), z.null()]),
  propertyVersion: z.number().optional(),
  steadyStateTime: z.number(),
});.optional(),
  fmaActivationState: z.enum(['steady', 'received', 'lived', 'deployed', 'cancelling']).optional(),
  groupId: z.string().optional(),
  hostnameActivationId: z.string().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string(),
  notifyEmails: z.array(z.string()),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyVersion: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED', 'FAILED', 'DEACTIVATED', 'PENDING_DEACTIVATION']),
  submitDate: z.string(),
  updateDate: z.string(),
});).optional(),
  nextLink: z.string().optional(),
  previousLink: z.string().optional(),
  totalItems: z.number().optional(),
});.optional(),
});
```

### DELETE /properties/{propertyId}/hostname-activations/{hostnameActivationId}
Operation ID: delete-property-hostname-activations

**Response Schema:**
```typescript
const delete-property-hostname-activationsResponseSchema = z.object({
  accountId: z.string().optional(),
  activations: z.object({}).passthrough().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  hostnameActivations: z.object({
  currentItemCount: z.number().optional(),
  items: z.array(z.object({
  accountId: z.string().optional(),
  activationId: z.string().optional(),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  fallbackInfo: z.object({
  canFastFallback: z.boolean(),
  fallbackVersion: z.number(),
  fastFallbackAttempted: z.boolean(),
  fastFallbackExpirationTime: z.number(),
  fastFallbackRecoveryState: z.union([z.union([z.string(), z.null()]), z.null()]),
  propertyVersion: z.number().optional(),
  steadyStateTime: z.number(),
});.optional(),
  fmaActivationState: z.enum(['steady', 'received', 'lived', 'deployed', 'cancelling']).optional(),
  groupId: z.string().optional(),
  hostnameActivationId: z.string().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string(),
  notifyEmails: z.array(z.string()),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyVersion: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED', 'FAILED', 'DEACTIVATED', 'PENDING_DEACTIVATION']),
  submitDate: z.string(),
  updateDate: z.string(),
});).optional(),
  nextLink: z.string().optional(),
  previousLink: z.string().optional(),
  totalItems: z.number().optional(),
});.optional(),
});
```

### GET /properties/{propertyId}/hostnames
Operation ID: get-property-hostnames

**Response Schema:**
```typescript
const get-property-hostnamesResponseSchema = z.object({
  accountId: z.string().optional(),
  availableSort: z.array(z.enum(['hostname:a', 'hostname:d'])).optional(),
  contractId: z.string().optional(),
  currentSort: z.enum(['hostname:a', 'hostname:d']).optional(),
  defaultSort: z.string().optional(),
  groupId: z.string().optional(),
  hostnames: z.object({
  currentItemCount: z.number(),
  items: z.array(z.unknown()),
  nextLink: z.string().optional(),
  previousLink: z.string().optional(),
  totalItems: z.number(),
});.optional(),
  propertyId: z.string().optional(),
});
```

### PATCH /properties/{propertyId}/hostnames
Operation ID: patch-property-hostnames

**Response Schema:**
```typescript
const patch-property-hostnamesResponseSchema = z.object({
  activationId: z.string(),
  activationLink: z.string(),
  hostnames: z.array(z.object({
  certProvisioningType: z.enum(['CPS_MANAGED', 'DEFAULT']),
  certStatus: z.object({
  production: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  staging: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  validationCname: z.object({
  hostname: z.string(),
  target: z.string(),
});.optional(),
});.optional(),
  cnameFrom: z.string(),
  cnameTo: z.string().optional(),
  cnameType: z.enum(['EDGE_HOSTNAME']),
  edgeHostnameId: z.string(),
});).optional(),
});
```

### GET /properties/{propertyId}/hostnames/diff
Operation ID: get-property-hostnames-diff

**Response Schema:**
```typescript
const get-property-hostnames-diffResponseSchema = z.object({
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  hostnames: z.object({
  currentItemCount: z.number().optional(),
  items: z.array(z.unknown()).optional(),
  nextLink: z.string().optional(),
  previousLink: z.string().optional(),
  totalItems: z.number().optional(),
});.optional(),
  propertyId: z.string(),
});
```

### POST /properties/{propertyId}/versions
Operation ID: post-property-versions

**Response Schema:**
```typescript
const post-property-versionsResponseSchema = z.object({
  versionLink: z.string(),
});
```

### GET /properties/{propertyId}/versions
Operation ID: get-property-versions

**Response Schema:**
```typescript
const get-property-versionsResponseSchema = z.object({
  accountId: z.string().optional(),
  assetId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  propertyId: z.string().optional(),
  propertyName: z.string().optional(),
  versions: z.object({
  items: z.array(z.object({
  etag: z.string(),
  note: z.string(),
  productId: z.string(),
  productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'PENDING_CANCELLATION']),
  propertyVersion: z.number(),
  ruleFormat: z.string().optional(),
  stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'PENDING_CANCELLATION']),
  updatedByUser: z.string(),
  updatedDate: z.string(),
});).optional(),
});.optional(),
});
```

### GET /properties/{propertyId}/versions/latest
Operation ID: get-latest-property-version
### GET /properties/{propertyId}/versions/{propertyVersion}
Operation ID: get-property-version

**Response Schema:**
```typescript
const get-property-versionResponseSchema = z.object({
  accountId: z.string().optional(),
  assetId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  propertyId: z.string().optional(),
  propertyName: z.string().optional(),
  versions: z.object({
  items: z.array(z.object({
  etag: z.string(),
  note: z.string(),
  productId: z.string(),
  productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'PENDING_CANCELLATION']),
  propertyVersion: z.number(),
  ruleFormat: z.string().optional(),
  stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'PENDING_CANCELLATION']),
  updatedByUser: z.string(),
  updatedDate: z.string(),
});).optional(),
});.optional(),
});
```

### GET /properties/{propertyId}/versions/{propertyVersion}/available-behaviors
Operation ID: get-available-behaviors

**Response Schema:**
```typescript
const get-available-behaviorsResponseSchema = z.object({
  behaviors: z.object({
  items: z.array(z.object({
  name: z.string(),
  schemaLink: z.string(),
});).optional(),
});.optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
});
```

### GET /properties/{propertyId}/versions/{propertyVersion}/available-criteria
Operation ID: get-available-criteria

**Response Schema:**
```typescript
const get-available-criteriaResponseSchema = z.object({
  contractId: z.string().optional(),
  criteria: z.object({
  items: z.array(z.object({
  name: z.string(),
  schemaLink: z.string(),
});).optional(),
});.optional(),
  groupId: z.string().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
});
```

### GET /properties/{propertyId}/versions/{propertyVersion}/hostnames
Operation ID: get-property-version-hostnames

**Response Schema:**
```typescript
const get-property-version-hostnamesResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  etag: z.string().optional(),
  groupId: z.string().optional(),
  hostnames: z.object({
  items: z.array(z.object({
  certProvisioningType: z.enum(['CPS_MANAGED', 'DEFAULT']),
  certStatus: z.object({
  production: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  staging: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  validationCname: z.object({
  hostname: z.string(),
  target: z.string(),
});.optional(),
});.optional(),
  cnameFrom: z.string(),
  cnameTo: z.string().optional(),
  cnameType: z.enum(['EDGE_HOSTNAME']),
  edgeHostnameId: z.string(),
});).optional(),
});.optional(),
  propertyId: z.string().optional(),
  propertyVersion: z.number().optional(),
});
```

### PUT /properties/{propertyId}/versions/{propertyVersion}/hostnames
Operation ID: put-property-version-hostnames

**Response Schema:**
```typescript
const put-property-version-hostnamesResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  etag: z.string().optional(),
  groupId: z.string().optional(),
  hostnames: z.object({
  items: z.array(z.object({
  certProvisioningType: z.enum(['CPS_MANAGED', 'DEFAULT']),
  certStatus: z.object({
  production: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  staging: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  validationCname: z.object({
  hostname: z.string(),
  target: z.string(),
});.optional(),
});.optional(),
  cnameFrom: z.string(),
  cnameTo: z.string().optional(),
  cnameType: z.enum(['EDGE_HOSTNAME']),
  edgeHostnameId: z.string(),
});).optional(),
});.optional(),
  propertyId: z.string().optional(),
  propertyVersion: z.number().optional(),
});
```

### PATCH /properties/{propertyId}/versions/{propertyVersion}/hostnames
Operation ID: patch-property-version-hostnames

**Response Schema:**
```typescript
const patch-property-version-hostnamesResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  etag: z.string().optional(),
  groupId: z.string().optional(),
  hostnames: z.object({
  items: z.array(z.object({
  certProvisioningType: z.enum(['CPS_MANAGED', 'DEFAULT']),
  certStatus: z.object({
  production: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  staging: z.array(z.object({
  status: z.enum(['DEPLOYING', 'PENDING', 'NEEDS_ACTIVATION', 'DEPLOYED', 'STALLED', 'PROHIBITED_DOMAIN_FAILURE', 'CAA_MISMATCH_RETRYING', 'CAA_MISMATCH_FAILURE', 'EXPIRING_SOON_NEEDS_VALIDATION', 'EXPIRED_NEEDS_VALIDATION', 'CNAME_MISSING_FAILURE', 'UNKNOWN_FAILURE']).optional(),
});).optional(),
  validationCname: z.object({
  hostname: z.string(),
  target: z.string(),
});.optional(),
});.optional(),
  cnameFrom: z.string(),
  cnameTo: z.string().optional(),
  cnameType: z.enum(['EDGE_HOSTNAME']),
  edgeHostnameId: z.string(),
});).optional(),
});.optional(),
  propertyId: z.string().optional(),
  propertyVersion: z.number().optional(),
});
```

### GET /properties/{propertyId}/versions/{propertyVersion}/includes
Operation ID: get-property-version-includes

**Response Schema:**
```typescript
const get-property-version-includesResponseSchema = z.object({
  includes: z.object({
  items: z.array(z.object({
  accountId: z.string(),
  assetId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  includeId: z.string(),
  includeName: z.string(),
  includeType: z.enum(['COMMON_SETTINGS', 'MICROSERVICES']),
  latestVersion: z.number(),
  note: z.string().optional(),
  productionVersion: z.union([z.number(), z.null()]),
  propertyType: z.enum(['TRADITIONAL', 'HOSTNAME_BUCKET', 'INCLUDE']).optional(),
  stagingVersion: z.union([z.number(), z.null()]),
});).optional(),
});.optional(),
});
```

### GET /properties/{propertyId}/versions/{propertyVersion}/rules
Operation ID: get-property-version-rules
### PUT /properties/{propertyId}/versions/{propertyVersion}/rules
Operation ID: put-property-version-rules
### PATCH /properties/{propertyId}/versions/{propertyVersion}/rules
Operation ID: patch-property-version-rules