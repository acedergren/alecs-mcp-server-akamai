# Akamai API Quick Reference

## 🎯 Essential Endpoints

### Property Manager API (PAPI) v1
```
BASE: https://{host}/papi/v1
AUTH: EdgeGrid + PAPI-Use-Prefixes: true
```

| Method | Endpoint | Purpose | Key Parameters |
|--------|----------|---------|----------------|
| `GET` | `/properties` | List properties | `contractId`, `groupId` |
| `GET` | `/properties/{id}` | Get property | `propertyId` |
| `POST` | `/properties` | Create property | `contractId`, `groupId`, `productId`, `propertyName` |
| `GET` | `/properties/{id}/versions/{ver}/rules` | Get rules | `propertyId`, `version` |
| `PUT` | `/properties/{id}/versions/{ver}/rules` | Update rules | `propertyId`, `version`, rules JSON |
| `POST` | `/properties/{id}/activations` | Activate | `propertyId`, `version`, `network`, `notifyEmails` |
| `GET` | `/groups` | List groups | `contractId` (optional) |
| `GET` | `/contracts` | List contracts | - |

### Edge DNS API v2
```
BASE: https://{host}/config-dns/v2
AUTH: EdgeGrid
```

| Method | Endpoint | Purpose | Key Parameters |
|--------|----------|---------|----------------|
| `GET` | `/zones` | List zones | `contractIds` |
| `POST` | `/zones` | Create zone | `zone`, `type`, `contractId` |
| `POST` | `/changelists` | Create changelist | `zone` |
| `PUT` | `/changelists/{zone}/recordsets/{name}/{type}` | Update record | `zone`, `name`, `type`, `ttl`, `rdata` |
| `POST` | `/changelists/{zone}/submit` | Submit changes | `zone` |
| `GET` | `/zones/{zone}/recordsets` | List records | `zone` |

### Certificate Provisioning (CPS) v2
```
BASE: https://{host}/cps/v2
AUTH: EdgeGrid
```

| Method | Endpoint | Purpose | Key Parameters |
|--------|----------|---------|----------------|
| `GET` | `/enrollments` | List certificates | - |
| `POST` | `/enrollments` | Create certificate | `csr`, `validationType`, `adminContact`, `techContact` |
| `GET` | `/enrollments/{id}` | Get certificate | `enrollmentId` |
| `GET` | `/enrollments/{id}/dv-history` | Get validation | `enrollmentId` |

### Fast Purge (CCU) v3
```
BASE: https://{host}/ccu/v3
AUTH: EdgeGrid
```

| Method | Endpoint | Purpose | Key Parameters |
|--------|----------|---------|----------------|
| `POST` | `/invalidate/url/{network}` | Purge URLs | `network`, `objects[]` |
| `POST` | `/invalidate/cpcode/{network}` | Purge CP codes | `network`, `objects[]` |
| `GET` | `/purge-requests/{id}` | Check status | `purgeId` |

## 🔐 Authentication

### EdgeGrid Headers
```
Authorization: EG1-HMAC-SHA256 client_token={token};access_token={access_token};timestamp={timestamp};nonce={nonce};signature={signature}
```

### Multi-Customer
```
# Use named .edgerc section
customer: "customer1"

# Results in account switching
AKAMAI-ACCOUNT-SWITCH-KEY: {account_key}
```

## 📋 Required Parameters

### Property Creation
✅ **Must Have:**
- `contractId` (ctr_*)
- `groupId` (grp_*)  
- `productId` (prd_*)
- `propertyName`

### Property Activation
✅ **Must Have:**
- `propertyId` (prp_*)
- `version` (integer)
- `network` ("STAGING" | "PRODUCTION")

✅ **Production Only:**
- `notifyEmails` (array)

### DNS Zone Creation
✅ **Must Have:**
- `zone` (hostname)
- `type` ("PRIMARY" | "SECONDARY" | "ALIAS")
- `contractId` (ctr_*)

### DNS Record Operations
✅ **Must Have:**
- `zone` (hostname)
- `name` (record name)
- `type` ("A" | "AAAA" | "CNAME" | "MX" | "TXT" | etc.)
- `ttl` (30-2147483647)
- `rdata` (array of strings)

## ⚠️ Common Gotchas

### ID Formats
- **Property ID:** `prp_123456` (numeric after prp_)
- **Contract ID:** `ctr_C-1FRYVMN` (alphanumeric after ctr_)
- **Group ID:** `grp_68817` (numeric after grp_)

### Rate Limits
- **PAPI:** 200 req/min
- **DNS:** 300 req/min
- **Fast Purge:** 50 req/min
- **Response:** Check `Retry-After` header

### Networks
- **Staging:** Fast activation (~5-10 min), no notifications required
- **Production:** Slower activation (~5-15 min), notifications required

## 🔄 Typical Workflows

### New Property Setup
1. `GET /contracts` → Get `contractId`
2. `GET /groups?contractId={id}` → Get `groupId`
3. `GET /products?contractId={id}` → Get `productId`
4. `POST /properties` → Create property
5. `PUT /properties/{id}/versions/1/rules` → Configure
6. `POST /properties/{id}/activations` → Activate

### DNS Management
1. `POST /zones` → Create zone
2. `POST /changelists` → Start changelist
3. `PUT /changelists/{zone}/recordsets/{name}/{type}` → Add records
4. `POST /changelists/{zone}/submit` → Activate changes

### Certificate + Property
1. `POST /cps/v2/enrollments` → Create certificate
2. Poll `/enrollments/{id}/dv-history` → Wait for challenges
3. Create DNS TXT records for validation
4. Associate certificate with edge hostname
5. Activate property with new hostname

## 🚨 Error Quick Reference

| Code | Meaning | Action |
|------|---------|---------|
| `400` | Bad Request | Fix parameters |
| `401` | Unauthorized | Check credentials |
| `403` | Forbidden | Check permissions |
| `404` | Not Found | Verify resource exists |
| `409` | Conflict | Resource exists or state conflict |
| `422` | Validation Error | Fix data validation issues |
| `429` | Rate Limited | Wait and retry |
| `5xx` | Server Error | Retry with backoff |

## 📞 Support Resources

- **Request ID:** Always included in error responses for support
- **Akamai Support:** Include request ID and full request/response
- **API Documentation:** https://techdocs.akamai.com/
- **Rate Limit Headers:** `X-RateLimit-*` in responses