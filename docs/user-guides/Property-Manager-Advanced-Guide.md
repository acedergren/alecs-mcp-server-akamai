# Property Manager Advanced Features Guide

## Overview

This guide covers the advanced Property Manager features added in v1.2.0, including comprehensive version management, rule tree optimization, and bulk operations.

## Enhanced Version Management

### 1. **Version Comparison**
Compare two property versions to identify differences.

```json
{
  "propertyId": "prp_12345",
  "version1": 5,
  "version2": 7,
  "compareType": "all",
  "includeDetails": true
}
```

**Features:**
- Rule tree differences with path tracking
- Hostname changes detection
- Metadata comparison
- Change summary statistics

### 2. **Version Timeline**
Track property version history with comprehensive event tracking.

```json
{
  "propertyId": "prp_12345",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "includeChanges": true
}
```

**Tracks:**
- Version creation events
- Modifications with change counts
- Activation/deactivation history
- User attribution

### 3. **Version Rollback**
Safely rollback to previous versions with validation.

```json
{
  "propertyId": "prp_12345",
  "targetVersion": 5,
  "preserveHostnames": true,
  "createBackup": true
}
```

**Safety Features:**
- Automatic backup creation
- Hostname preservation option
- Pre-rollback validation
- Rollback notes

### 4. **Batch Version Operations**
Create versions across multiple properties simultaneously.

```json
{
  "properties": [
    {"propertyId": "prp_12345", "note": "Security update"},
    {"propertyId": "prp_67890", "note": "Security update"}
  ],
  "defaultNote": "Batch security update"
}
```

## Rule Tree Management

### 1. **Rule Tree Validation**
Comprehensive validation with performance scoring.

```json
{
  "propertyId": "prp_12345",
  "version": 7,
  "includeOptimizations": true,
  "includeStatistics": true
}
```

**Validation Checks:**
- Syntax errors
- Logic conflicts
- Reference validation
- Compatibility issues
- Performance scoring
- Security compliance

### 2. **Rule Tree Templates**
Create rules from predefined templates.

```json
{
  "templateId": "mobile-optimization",
  "propertyId": "prp_12345",
  "variables": {
    "cacheTimeout": 3600,
    "compressionLevel": "high"
  }
}
```

**Template Features:**
- Variable substitution
- Category organization
- Compatibility checking
- Example configurations

### 3. **Rule Tree Optimization**
Analyze and optimize rule performance.

```json
{
  "propertyId": "prp_12345",
  "categories": ["caching", "compression", "http2"],
  "applyOptimizations": false
}
```

**Optimization Areas:**
- Caching efficiency
- Compression settings
- HTTP/2 adoption
- Image optimization
- Mobile performance

### 4. **Rule Tree Merging**
Merge rules between properties or versions.

```json
{
  "sourcePropertyId": "prp_12345",
  "sourceVersion": 5,
  "targetPropertyId": "prp_67890",
  "targetVersion": 3,
  "strategy": "merge",
  "conflictResolution": "manual"
}
```

## Bulk Operations

### 1. **Bulk Property Cloning**
Clone a property to multiple targets.

```json
{
  "sourcePropertyId": "prp_12345",
  "targetNames": ["site-v2", "site-v3"],
  "contractId": "ctr_12345",
  "groupId": "grp_12345",
  "cloneHostnames": true,
  "activateImmediately": true,
  "network": "STAGING"
}
```

### 2. **Bulk Activations**
Activate multiple properties simultaneously.

```json
{
  "propertyIds": ["prp_12345", "prp_67890"],
  "network": "PRODUCTION",
  "acknowledgeAllWarnings": true,
  "waitForCompletion": true,
  "maxWaitTime": 3600000
}
```

### 3. **Bulk Rule Updates**
Apply rule changes across multiple properties.

```json
{
  "propertyIds": ["prp_12345", "prp_67890"],
  "rulePatches": [
    {
      "op": "replace",
      "path": "/rules/behaviors/0/options/caching",
      "value": {"behavior": "MAX_AGE", "ttl": "1d"}
    }
  ],
  "createNewVersion": true,
  "validateChanges": true
}
```

### 4. **Bulk Hostname Management**
Add or remove hostnames across properties.

```json
{
  "operations": [
    {
      "propertyId": "prp_12345",
      "action": "add",
      "hostnames": [
        {"hostname": "www.example.com", "edgeHostname": "www.example.com.edgekey.net"}
      ]
    }
  ],
  "validateDNS": true,
  "createNewVersion": true
}
```

## Advanced Search

### 1. **Multi-Criteria Search**
Search properties with complex criteria.

```json
{
  "criteria": {
    "name": "prod-",
    "activationStatus": "production",
    "lastModifiedAfter": "2024-01-01T00:00:00Z",
    "hasErrors": false,
    "productId": "prd_Site_Accel"
  },
  "includeDetails": true,
  "sortBy": "lastModified"
}
```

### 2. **Property Comparison**
Compare two properties in detail.

```json
{
  "propertyIdA": "prp_12345",
  "propertyIdB": "prp_67890",
  "compareRules": true,
  "compareHostnames": true,
  "compareBehaviors": true
}
```

### 3. **Health Checks**
Comprehensive property health analysis.

```json
{
  "propertyId": "prp_12345",
  "includePerformance": true,
  "includeSecurity": true
}
```

### 4. **Drift Detection**
Detect configuration drift from baseline.

```json
{
  "propertyId": "prp_12345",
  "baselineVersion": 5,
  "compareVersion": 7,
  "checkBehaviors": true,
  "checkHostnames": true
}
```

## Performance Considerations

### Rate Limiting
- Bulk operations implement intelligent throttling
- Concurrent operations respect API limits
- Automatic retry with exponential backoff

### Progress Tracking
- Real-time progress for long-running operations
- Cancellation support for bulk operations
- Detailed error reporting per item

### Best Practices
1. Use bulk operations for related changes
2. Validate changes before production activation
3. Monitor operation progress for large batches
4. Implement proper error handling
5. Use templates for consistent configurations