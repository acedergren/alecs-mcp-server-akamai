# Secure Property Onboarding Analysis and Improvements

## Current Workflow Analysis

### Workflow Steps
1. **Product Selection** - Auto-selects Ion (prd_fresca) when no product specified ✅
2. **Property Creation** - Creates new property with selected product
3. **Edge Hostname Creation** - Creates Secure by Default edge hostname:
   - Uses `.edgekey.net` suffix
   - Sets `secure: true` and `secureNetwork: 'ENHANCED_TLS'`
   - Omits `certificateEnrollmentId` to trigger DefaultDV
4. **Property Rules Configuration** - Applies secure settings
5. **Hostname Addition** - Adds customer hostnames to property
6. **Ready for Activation** - Property is ready to activate

### Issues Identified

#### 1. Error Handling
- **Issue**: No rollback if steps fail partway through
- **Impact**: Can leave orphaned properties
- **Solution**: Implement transaction-like behavior with rollback

#### 2. CP Code Management
- **Issue**: Hardcoded default CP code (12345) may not be valid
- **Impact**: Property activation could fail
- **Solution**: Auto-create CP code if not provided

#### 3. Edge Hostname Verification
- **Issue**: No verification that edge hostname was created successfully
- **Impact**: Hostname addition could fail silently
- **Solution**: Add verification step and retry logic

#### 4. Origin Validation
- **Issue**: No validation that origin hostname is reachable
- **Impact**: Site won't work after activation
- **Solution**: Add optional origin connectivity check

#### 5. Certificate Status
- **Issue**: No verification that DefaultDV certificate is ready
- **Impact**: HTTPS might not work immediately
- **Solution**: Add certificate status check

## Simulation of Current Workflow

```typescript
// Step 1: Create property
POST /papi/v1/properties?contractId=ctr_123&groupId=grp_456
{
  "productId": "prd_fresca",
  "propertyName": "my-secure-site"
}
// Returns: propertyId = prp_789

// Step 2: Create Secure by Default edge hostname
POST /papi/v1/edgehostnames?contractId=ctr_123&groupId=grp_456
{
  "productId": "prd_fresca",
  "domainPrefix": "my-secure-site",
  "domainSuffix": "edgekey.net",
  "secure": true,
  "secureNetwork": "ENHANCED_TLS",
  "ipVersionBehavior": "IPV4_IPV6",
  // certificateEnrollmentId is intentionally omitted
  "useCases": [{
    "useCase": "Download_Mode",
    "option": "BACKGROUND",
    "type": "GLOBAL"
  }]
}
// Returns: edgeHostnameId = ehn_101112

// Step 3: Configure property rules
PUT /papi/v1/properties/prp_789/versions/1/rules
{
  "rules": {
    "name": "default",
    "behaviors": [
      {
        "name": "origin",
        "options": {
          "hostname": "origin.example.com",
          "forwardHostHeader": "REQUEST_HOST_HEADER",
          "httpPort": 80,
          "httpsPort": 443
        }
      },
      {
        "name": "cpCode",
        "options": {
          "value": {
            "id": 12345, // This could be invalid!
            "name": "my-secure-site"
          }
        }
      },
      // Other security behaviors...
    ]
  }
}

// Step 4: Add hostnames
PUT /papi/v1/properties/prp_789/versions/1/hostnames
{
  "add": [
    {
      "cnameFrom": "www.example.com",
      "cnameTo": "my-secure-site.edgekey.net",
      "cnameType": "EDGE_HOSTNAME"
    }
  ]
}

// Step 5: Ready for activation
// User needs to activate manually
```

## Enhanced Workflow Proposal

### Pre-flight Checks
1. Validate contract and group exist
2. Verify origin hostname format
3. Check product availability
4. Validate CP code or prepare to create one

### Enhanced Steps
1. **Create Property with Transaction ID**
   - Track all created resources
   - Enable rollback on failure

2. **Ensure CP Code**
   - Check if provided CP code exists
   - Create new CP code if needed
   - Verify CP code is valid for product

3. **Create and Verify Edge Hostname**
   - Create Secure by Default edge hostname
   - Poll for creation completion
   - Verify DefaultDV certificate is provisioned

4. **Configure with Validation**
   - Apply secure rules
   - Validate rule format
   - Check for conflicts

5. **Add Hostnames with DNS Check**
   - Add hostnames
   - Optionally verify DNS delegation readiness

6. **Final Verification**
   - Check all components are properly linked
   - Provide clear next steps

### Recovery Mechanisms
- Track all created resources
- Implement rollback for failed steps
- Provide manual recovery instructions
- Log detailed error information

## Test Cases

### Test 1: Happy Path
- Valid inputs
- All resources create successfully
- Verify property is ready for activation

### Test 2: Invalid Contract
- Provide non-existent contract ID
- Should fail with clear error message
- No resources should be created

### Test 3: CP Code Creation
- Don't provide CP code
- Should auto-create CP code
- Verify CP code is linked to property

### Test 4: Partial Failure Recovery
- Simulate failure after property creation
- Verify rollback removes property
- Check error message provides recovery steps

### Test 5: Edge Hostname Conflict
- Try to create duplicate edge hostname
- Should handle gracefully
- Provide alternative suggestions

## Implementation Recommendations

1. **Add Progress Tracking**
   - Use progress indicators for long operations
   - Show which step is currently executing
   - Estimate time remaining

2. **Implement Dry Run Mode**
   - Validate all inputs without creating resources
   - Show what would be created
   - Identify potential issues early

3. **Enhanced Error Messages**
   - Include specific error codes
   - Provide actionable solutions
   - Link to relevant documentation

4. **Status Dashboard**
   - Show all resources created
   - Display current status of each component
   - Highlight any issues or warnings

5. **Automated Testing**
   - Create integration tests for each step
   - Test error scenarios
   - Verify rollback mechanisms

## Property Search Enhancement Requirements

### Current Limitations
- `searchProperties` only accepts `searchTerm` parameter
- Must iterate through all properties (slow)
- Limited filtering options

### Enhanced Search Features
1. **Multiple Search Criteria**
   - Property name (partial match)
   - Hostname (exact or wildcard)
   - Edge hostname
   - Contract ID
   - Group ID
   - Product ID
   - Activation status

2. **Performance Optimizations**
   - Use PAPI search endpoint when available
   - Implement caching for repeated searches
   - Parallel search across groups
   - Progress indication for long searches

3. **Advanced Filtering**
   - Combine multiple criteria (AND/OR)
   - Exclude patterns
   - Regular expression support
   - Date range filters

4. **Output Formats**
   - Table view (default)
   - JSON export
   - CSV export
   - Detailed view with hostnames

## Next Steps

1. **Implement Enhanced Secure Onboarding**
   - Add pre-flight validation
   - Implement CP code auto-creation
   - Add progress tracking
   - Create rollback mechanism

2. **Deploy Enhanced Property Search**
   - Add multi-criteria search
   - Implement performance optimizations
   - Add export capabilities

3. **Create Comprehensive Tests**
   - Unit tests for each component
   - Integration tests for full workflow
   - Error scenario testing

4. **Update Documentation**
   - API usage examples
   - Troubleshooting guide
   - Best practices