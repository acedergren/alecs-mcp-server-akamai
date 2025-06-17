# Advanced Property Activation Guide

This guide covers the enhanced property activation features that provide production-ready deployment capabilities with validation, monitoring, and rollback support.

## Overview

The advanced property activation system provides:
- Pre-activation validation with comprehensive health checks
- Real-time progress monitoring during activation
- Automatic rollback capabilities on failure
- Multi-property activation coordination
- Detailed error reporting and recovery suggestions

## New MCP Functions

### 1. validate_property_activation

Validates a property before activation to catch issues early.

**Usage:**
```
validate_property_activation propertyId=prp_12345 network=STAGING
```

**Features:**
- Rule validation with error detection
- Hostname configuration checks
- Certificate status verification
- Concurrent activation detection
- Origin connectivity validation

**Example Response:**
```
# Property Activation Validation

**Property:** example.com (prp_12345)
**Version:** 3
**Target Network:** STAGING

## Validation Result: ✅ PASSED

### Preflight Checks
- ✅ **Hostname Configuration**: 2 hostname(s) configured
- ✅ **HTTPS Certificate Status**: All HTTPS hostname(s) have valid certificates
- ✅ **Origin Connectivity**: Origin configured: origin.example.com
```

### 2. activate_property_with_monitoring

Activates a property with optional validation and progress monitoring.

**Basic Usage:**
```
activate_property_with_monitoring propertyId=prp_12345 network=STAGING
```

**With Options:**
```
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION options.validateFirst=true options.waitForCompletion=true options.rollbackOnFailure=true
```

**Options:**
- `validateFirst`: Run validation before activation (default: false)
- `waitForCompletion`: Wait for activation to complete (default: false)
- `maxWaitTime`: Maximum time to wait in milliseconds (default: 1800000)
- `rollbackOnFailure`: Automatically rollback on failure (default: false)
- `notifyEmails`: Array of emails to notify
- `acknowledgeWarnings`: Acknowledge all warnings (default: true)

**Progress Monitoring:**
When `waitForCompletion` is true, the function provides real-time updates:
- Progressive status updates (PENDING → ZONE_1 → ZONE_2 → ZONE_3 → ACTIVE)
- Percentage completion tracking
- Estimated time remaining
- Automatic error detection and reporting

### 3. get_activation_progress

Get detailed progress information for an ongoing activation.

**Usage:**
```
get_activation_progress propertyId=prp_12345 activationId=atv_789456
```

**Response Includes:**
- Current activation state and zone
- Progress percentage with visual progress bar
- Estimated time remaining
- Error and warning details
- Next recommended steps

**Example Response:**
```
# Activation Progress

**Activation ID:** atv_789456
**Property:** example.com (v3)
**Network:** PRODUCTION
**Status:** ZONE_2 - Deploying to second zone

**Progress:** [██████████░░░░░░░░░░] 50%
**Current Zone:** ZONE_2
**Estimated Time Remaining:** 15 minutes
**Started:** 2024-01-20 10:30:00
**Last Update:** 2024-01-20 10:45:00

### Next Steps
⏳ Activation in progress...
- Continue monitoring this activation
- Check again in a few minutes
```

### 4. cancel_property_activation

Cancel a pending activation that hasn't started deploying yet.

**Usage:**
```
cancel_property_activation propertyId=prp_12345 activationId=atv_789456
```

**Note:** Only activations in PENDING state can be cancelled.

### 5. create_activation_plan

Create a deployment plan for multiple properties with dependency management.

**Usage:**
```
create_activation_plan properties=[{propertyId:"prp_12345",network:"STAGING"},{propertyId:"prp_67890",network:"STAGING"}] strategy=SEQUENTIAL
```

**Strategies:**
- `PARALLEL`: Activate all properties simultaneously
- `SEQUENTIAL`: Activate one after another
- `DEPENDENCY_ORDERED`: Respect property dependencies

**Example Response:**
```
# Activation Plan

**Strategy:** SEQUENTIAL
**Properties:** 2

## Deployment Order
1. **api.example.com** (prp_12345 v3) → STAGING
   ↓
2. **www.example.com** (prp_67890 v5) → STAGING

## Estimated Timeline
- **Total Duration:** 20 minutes
- **Start Time:** Now
- **Completion:** ~10:50 AM
```

## Common Workflows

### 1. Safe Production Deployment

```bash
# Step 1: Validate the property
validate_property_activation propertyId=prp_12345 network=PRODUCTION

# Step 2: If validation passes, activate with monitoring
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION \
  options.validateFirst=true \
  options.waitForCompletion=true \
  options.rollbackOnFailure=true \
  options.notifyEmails=["ops@example.com"]

# Step 3: If needed, check progress separately
get_activation_progress propertyId=prp_12345 activationId=atv_789456
```

### 2. Staged Multi-Property Deployment

```bash
# Step 1: Deploy to staging first
create_activation_plan \
  properties=[
    {propertyId:"prp_12345",network:"STAGING"},
    {propertyId:"prp_67890",network:"STAGING"}
  ] \
  strategy=PARALLEL

# Step 2: After testing, deploy to production sequentially
create_activation_plan \
  properties=[
    {propertyId:"prp_12345",network:"PRODUCTION"},
    {propertyId:"prp_67890",network:"PRODUCTION"}
  ] \
  strategy=SEQUENTIAL
```

### 3. Emergency Rollback

```bash
# If activation fails with rollbackOnFailure=true, it happens automatically
# For manual intervention:

# Step 1: Cancel if still pending
cancel_property_activation propertyId=prp_12345 activationId=atv_789456

# Step 2: Create new version with fixes
create_property_version propertyId=prp_12345 note="Rollback fixes"

# Step 3: Activate the fixed version
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION \
  options.validateFirst=true
```

## Error Handling

The advanced activation system provides detailed error information:

### Validation Errors
- **Rule Errors**: Specific issues with property rules
- **Certificate Issues**: Missing or invalid certificates
- **Hostname Problems**: Configuration mismatches
- **Concurrent Activations**: Another activation in progress

### Activation Errors
- **Zone Failures**: Deployment issues in specific zones
- **Timeout**: Activation taking longer than expected
- **Network Issues**: Connectivity problems
- **Permission Errors**: Insufficient access rights

### Recovery Suggestions
Each error includes:
1. Clear description of the issue
2. Specific resolution steps
3. Alternative approaches
4. Support reference IDs when applicable

## Best Practices

### 1. Always Validate First
```bash
# Good practice
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION \
  options.validateFirst=true
```

### 2. Use Progress Monitoring for Production
```bash
# Monitor production deployments
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION \
  options.waitForCompletion=true \
  options.maxWaitTime=2400000  # 40 minutes
```

### 3. Enable Rollback for Critical Properties
```bash
# Automatic rollback on failure
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION \
  options.rollbackOnFailure=true
```

### 4. Set Up Notifications
```bash
# Notify team members
activate_property_with_monitoring propertyId=prp_12345 network=PRODUCTION \
  options.notifyEmails=["ops@example.com", "dev@example.com"]
```

## Performance Considerations

### Activation Times
- **Staging**: 5-10 minutes typical
- **Production**: 20-30 minutes typical
- **Fast Push**: Can reduce times by 30-50%

### Polling Intervals
The system uses progressive delays to minimize API calls:
- First 2 minutes: 5-second intervals
- Next 5 minutes: 10-second intervals
- Next 10 minutes: 30-second intervals
- After 17 minutes: 60-second intervals

### Rate Limiting
- Maximum 10 concurrent activations per property
- 120 API requests per minute limit
- Automatic retry with exponential backoff

## Troubleshooting

### Common Issues

1. **"Another activation is already in progress"**
   - Wait for current activation to complete
   - Or cancel it if stuck: `cancel_property_activation`

2. **"Certificate not ready for hostname"**
   - Check certificate status: `get_dv_validation_challenges`
   - Complete domain validation if needed

3. **"Validation failed with rule errors"**
   - Get current rules: `get_property_rules`
   - Fix issues and create new version
   - Validate again before activation

4. **"Activation timeout reached"**
   - Check status: `get_activation_progress`
   - Activation may still be progressing
   - Contact support if stuck for >1 hour

### Debug Information

Enable debug mode for detailed logs:
```bash
export DEBUG=1
activate_property_with_monitoring propertyId=prp_12345 network=STAGING
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Deploy to Akamai Staging
  run: |
    alecs activate_property_with_monitoring \
      propertyId=${{ env.PROPERTY_ID }} \
      network=STAGING \
      options.validateFirst=true \
      options.waitForCompletion=true \
      options.maxWaitTime=900000
```

### Jenkins Pipeline
```groovy
stage('Deploy to Production') {
    steps {
        sh '''
            alecs activate_property_with_monitoring \
                propertyId=${PROPERTY_ID} \
                network=PRODUCTION \
                options.validateFirst=true \
                options.rollbackOnFailure=true \
                options.notifyEmails=["${TEAM_EMAIL}"]
        '''
    }
}
```

## Summary

The advanced property activation system provides enterprise-grade deployment capabilities:
- **Safety**: Pre-activation validation catches issues early
- **Visibility**: Real-time progress monitoring
- **Reliability**: Automatic rollback and error recovery
- **Scalability**: Multi-property coordination
- **Integration**: CI/CD friendly with detailed feedback

Use these tools to deploy with confidence while maintaining full control over the activation process.