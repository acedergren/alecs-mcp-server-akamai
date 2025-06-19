# Akamai Property Manager API - Activation Research

## API Endpoints for Property Activation

### 1. Create Activation
**Endpoint**: `POST /papi/v1/properties/{propertyId}/activations`

**Request Body**:
```json
{
  "propertyVersion": 1,
  "network": "STAGING" | "PRODUCTION",
  "note": "Activation notes",
  "notifyEmails": ["email@example.com"],
  "acknowledgeAllWarnings": true,
  "fastPush": true,
  "useFastFallback": false
}
```

**Response**:
- Returns 201 Created with activation link
- Headers include `Location` with activation URL

### 2. Get Activation Status
**Endpoint**: `GET /papi/v1/properties/{propertyId}/activations/{activationId}`

**Response Fields**:
- `status`: ACTIVE, PENDING, ZONE_1, ZONE_2, ZONE_3, ABORTED, FAILED, DEACTIVATED
- `propertyVersion`: Version being activated
- `network`: Target network
- `submitDate`: ISO 8601 timestamp
- `updateDate`: Last status change
- `note`: Activation notes
- `fatalError`: Critical error details
- `errors[]`: Non-fatal errors
- `warnings[]`: Activation warnings

### 3. List Activations
**Endpoint**: `GET /papi/v1/properties/{propertyId}/activations`

**Query Parameters**:
- `contractId`: Filter by contract
- `groupId`: Filter by group

### 4. Cancel Activation
**Endpoint**: `DELETE /papi/v1/properties/{propertyId}/activations/{activationId}`

**Requirements**:
- Can only cancel PENDING activations
- Returns 204 No Content on success

## Activation State Machine

```
PENDING → ZONE_1 → ZONE_2 → ZONE_3 → ACTIVE
    ↓         ↓        ↓        ↓
  FAILED   FAILED   FAILED   FAILED
    ↓         ↓        ↓        ↓
  ABORTED  ABORTED  ABORTED  ABORTED
```

## Status Polling Strategy

### Recommended Intervals
1. First 2 minutes: Poll every 5 seconds
2. Next 5 minutes: Poll every 10 seconds
3. Next 10 minutes: Poll every 30 seconds
4. After 17 minutes: Poll every 60 seconds

### Typical Activation Times
- **Staging**: 5-10 minutes
- **Production**: 20-30 minutes
- **Fast Push**: Can reduce by 30-50%

## Error Handling

### Common Errors
1. **400 Bad Request**
   - Invalid property version
   - Missing required fields
   - Validation errors

2. **401 Unauthorized**
   - Invalid credentials
   - Expired token

3. **403 Forbidden**
   - No permission for network
   - Contract/group access denied

4. **409 Conflict**
   - Concurrent activation in progress
   - Version already active

5. **429 Too Many Requests**
   - Rate limit exceeded
   - Retry-After header provided

## Pre-Activation Validation

### Rule Validation
**Endpoint**: `GET /papi/v1/properties/{propertyId}/versions/{version}/rules/errors`

**Response**:
```json
{
  "errors": [{
    "type": "error",
    "errorLocation": "/rules/behaviors/0",
    "detail": "Missing required behavior"
  }],
  "warnings": [{
    "type": "warning",
    "errorLocation": "/rules/criteria/0",
    "detail": "Deprecated criteria"
  }]
}
```

### Hostname Validation
- Check all hostnames have valid edge hostnames
- Verify certificate status for HTTPS
- Confirm DNS CNAME configuration

## Authentication Requirements

### EdgeGrid Headers
- `Authorization`: EdgeGrid signature
- `Content-Type`: application/json
- `Accept`: application/json

### Account Switching
- Add `?accountSwitchKey={key}` to all requests
- Key obtained from Control Center or .edgerc

## Rate Limiting

### Limits
- 120 requests per minute per client
- 10 concurrent activations per property
- 50 activations per hour per contract

### Best Practices
- Implement exponential backoff
- Honor Retry-After headers
- Use bulk operations where possible

## Dependencies Check

### Required Python Packages
```python
# For EdgeGrid authentication
akamai-edgegrid==1.3.1
requests>=2.28.0
```

### Node.js (Current Implementation)
```javascript
// Already installed
"akamai-edgegrid": "^3.4.0"
```

## Integration Points

### 1. Pre-Activation
- Validate rules
- Check hostname configuration
- Verify certificate readiness
- Test origin connectivity

### 2. Activation
- Create activation request
- Handle warnings appropriately
- Set proper email notifications

### 3. Post-Activation
- Monitor status progression
- Handle errors and rollbacks
- Update DNS if needed
- Clear cache if required

## Security Considerations

1. **Credential Storage**
   - Use .edgerc file (already implemented)
   - Never log credentials
   - Rotate keys regularly

2. **API Communication**
   - Always use HTTPS
   - Validate SSL certificates
   - Implement request signing

3. **Error Messages**
   - Sanitize error outputs
   - Don't expose internal IDs
   - Log security events