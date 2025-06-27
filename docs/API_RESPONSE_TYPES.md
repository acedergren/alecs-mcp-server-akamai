# Akamai API Response Types Documentation

This document provides a comprehensive list of all response types used in the Akamai MCP server, organized by API endpoint. These types were derived from analyzing actual client.request calls throughout the codebase.

## Table of Contents

1. [Property Manager API (PAPI)](#property-manager-api-papi)
2. [Edge DNS API](#edge-dns-api)
3. [Certificate Provisioning System (CPS)](#certificate-provisioning-system-cps)
4. [Network Lists](#network-lists)
5. [Fast Purge](#fast-purge)
6. [Application Security](#application-security)
7. [Reporting API](#reporting-api)
8. [Common Types](#common-types)

## Property Manager API (PAPI)

### Groups Endpoint
**Endpoint:** `/papi/v1/groups`  
**Response Properties Accessed:**
- `groups.items[]` - Array of group objects
- `groups.items[].groupId` - Unique group identifier
- `groups.items[].groupName` - Human-readable group name
- `groups.items[].parentGroupId` - Parent group ID for hierarchy
- `groups.items[].contractIds[]` - Associated contract IDs

### Properties Endpoint
**Endpoint:** `/papi/v1/properties`  
**Response Properties Accessed:**
- `properties.items[]` - Array of property objects
- `properties.items[].propertyId` - Unique property identifier
- `properties.items[].propertyName` - Property name
- `properties.items[].contractId` - Associated contract
- `properties.items[].groupId` - Associated group
- `properties.items[].assetId` - Asset identifier
- `properties.items[].productId` - Product being used
- `properties.items[].latestVersion` - Most recent version number
- `properties.items[].productionVersion` - Version in production
- `properties.items[].stagingVersion` - Version in staging
- `properties.items[].productionStatus` - Production activation status
- `properties.items[].stagingStatus` - Staging activation status
- `properties.items[].note` - Property notes

### Property Versions Endpoint
**Endpoint:** `/papi/v1/properties/{propertyId}/versions/{version}`  
**Response Properties Accessed:**
- `versions.items[].propertyVersion` - Version number
- `versions.items[].updatedByUser` - User who made updates
- `versions.items[].updatedDate` - Last update timestamp
- `versions.items[].note` - Version notes

### Property Hostnames Endpoint
**Endpoint:** `/papi/v1/properties/{propertyId}/versions/{version}/hostnames`  
**Response Properties Accessed:**
- `hostnames.items[].cnameFrom` - Customer hostname
- `hostnames.items[].cnameTo` - Edge hostname
- `hostnames.items[].certStatus.status` - Certificate status

### Contracts Endpoint
**Endpoint:** `/papi/v1/contracts`  
**Response Properties Accessed:**
- `contracts.items[].contractId` - Contract identifier
- `contracts.items[].contractTypeName` - Type of contract
- `contracts.items[].status` - Contract status

### Products Endpoint
**Endpoint:** `/papi/v1/products`  
**Response Properties Accessed:**
- `products.items[].productId` - Product identifier
- `products.items[].productName` - Product name

### Activations Endpoint
**Endpoint:** `/papi/v1/properties/{propertyId}/activations`  
**Response Properties Accessed:**
- `activationLink` - Link to activation resource
- `activationId` - Unique activation identifier
- `status` - Activation status
- `network` - Target network (STAGING/PRODUCTION)
- `propertyName` - Property being activated
- `propertyId` - Property identifier
- `propertyVersion` - Version being activated
- `note` - Activation notes
- `notifyEmails[]` - Notification recipients
- `submitter` - User who submitted activation
- `submitterDate` - Submission timestamp
- `updateDate` - Last update timestamp

## Edge DNS API

### DNS Zones List Endpoint
**Endpoint:** `/config-dns/v2/zones`  
**Response Properties Accessed:**
- `zones[]` - Array of zone objects
- `zones[].zone` - Zone name (domain)
- `zones[].type` - Zone type (PRIMARY/SECONDARY/ALIAS)
- `zones[].comment` - Zone description
- `zones[].signAndServe` - DNSSEC enabled flag
- `zones[].masters[]` - Master servers for secondary zones

### DNS Records Endpoint
**Endpoint:** `/config-dns/v2/zones/{zone}/recordsets`  
**Response Properties Accessed:**
- `recordsets[]` - Array of DNS records
- `recordsets[].name` - Record name
- `recordsets[].type` - Record type (A, AAAA, CNAME, etc.)
- `recordsets[].ttl` - Time to live
- `recordsets[].rdata[]` - Record data values

### DNS Changelist Endpoint
**Endpoint:** `/config-dns/v2/changelists/{zone}`  
**Response Properties Accessed:**
- `zone` - Zone name
- `lastModifiedDate` - Last modification timestamp
- `lastModifiedBy` - User who last modified
- `recordSets[]` - Array of pending record changes

### DNS Submit Endpoint
**Endpoint:** `/config-dns/v2/changelists/{zone}/submit`  
**Response Properties Accessed:**
- `requestId` - Submission request identifier
- `expiryDate` - Expiration date for request
- `validationResult.errors[]` - Validation errors
- `validationResult.warnings[]` - Validation warnings

### DNS Zone Status Endpoint
**Endpoint:** `/config-dns/v2/zones/{zone}/status`  
**Response Properties Accessed:**
- `activationState` - Current activation state
- `lastActivationTime` - Last activation timestamp
- `propagationStatus.percentage` - Propagation percentage
- `propagationStatus.serversUpdated` - Servers updated count
- `propagationStatus.totalServers` - Total server count

## Certificate Provisioning System (CPS)

### CPS Enrollments List Endpoint
**Endpoint:** `/cps/v2/enrollments`  
**Response Properties Accessed:**
- `enrollments[]` - Array of certificate enrollments
- `enrollments[].location` - Enrollment URL
- `enrollments[].ra` - Registration authority
- `enrollments[].validationType` - Validation type (DV/OV/EV)
- `enrollments[].certificateType` - Certificate type
- `enrollments[].csr.cn` - Common name
- `enrollments[].csr.sans[]` - Subject alternative names
- `enrollments[].pendingChanges[]` - Pending changes

### CPS Enrollment Status Endpoint
**Endpoint:** `/cps/v2/enrollments/{enrollmentId}`  
**Response Properties Accessed:**
- `enrollmentId` - Enrollment identifier
- `status` - Current enrollment status
- `autoRenewalStartTime` - Auto-renewal start time
- `certificateType` - Type of certificate
- `validationType` - Validation type
- `ra` - Registration authority
- `allowedDomains[]` - Array of domains
- `allowedDomains[].name` - Domain name
- `allowedDomains[].status` - Domain status
- `allowedDomains[].validationStatus` - Validation status
- `allowedDomains[].validationDetails.challenges[]` - Validation challenges
- `allowedDomains[].validationDetails.challenges[].type` - Challenge type
- `allowedDomains[].validationDetails.challenges[].status` - Challenge status
- `allowedDomains[].validationDetails.challenges[].token` - Challenge token
- `allowedDomains[].validationDetails.challenges[].responseBody` - Expected response

### CPS Create Enrollment Endpoint
**Endpoint:** `/cps/v2/enrollments`  
**Response Properties Accessed:**
- `enrollment` - Enrollment resource path containing ID

## Network Lists

### Network Lists Endpoint
**Endpoint:** `/network-list/v2/network-lists`  
**Response Properties Accessed:**
- `networkLists[]` - Array of network lists
- `networkLists[].uniqueId` - List identifier
- `networkLists[].name` - List name
- `networkLists[].type` - List type (IP/GEO/ASN)
- `networkLists[].elementCount` - Number of elements
- `networkLists[].description` - Description
- `networkLists[].createDate` - Creation date
- `networkLists[].createdBy` - Creator
- `networkLists[].updateDate` - Last update date
- `networkLists[].updatedBy` - Last updater
- `networkLists[].productionStatus` - Production status
- `networkLists[].stagingStatus` - Staging status
- `networkLists[].shared` - Shared flag
- `networkLists[].list[]` - Array of list elements (when includeElements=true)

### Network List Detail Endpoint
**Endpoint:** `/network-list/v2/network-lists/{uniqueId}`  
**Response Properties Accessed:**
- All properties from list endpoint plus:
- `contractId` - Associated contract
- `groupId` - Associated group
- `syncPoint` - Synchronization point

## Fast Purge

### Fast Purge Submit Endpoint
**Endpoints:** 
- `/ccu/v3/invalidate/url/{network}`
- `/ccu/v3/invalidate/cpcode/{network}`
- `/ccu/v3/invalidate/tag/{network}`

**Response Properties Accessed:**
- `purgeId` - Purge request identifier
- `supportId` - Support ticket ID
- `detail` - Operation details
- `estimatedSeconds` - Estimated completion time
- `httpStatus` - HTTP status code
- `title` - Response title
- `pingAfterSeconds` - Suggested wait time

### Fast Purge Status Endpoint
**Endpoint:** `/ccu/v3/purges/{purgeId}`  
**Response Properties Accessed:**
- `purgeId` - Purge identifier
- `status` - Current status
- `submittedBy` - Submitter
- `submittedTime` - Submission time
- `completionTime` - Completion time
- `estimatedSeconds` - Estimated duration
- `purgedCount` - Number of objects purged
- `supportId` - Support reference

## Application Security

### AppSec Configurations List Endpoint
**Endpoint:** `/appsec/v1/configs`  
**Response Properties Accessed:**
- `configurations[]` - Array of security configs
- `configurations[].id` - Config identifier
- `configurations[].name` - Config name
- `configurations[].description` - Description
- `configurations[].latestVersion` - Latest version
- `configurations[].productionVersion` - Production version
- `configurations[].stagingVersion` - Staging version

### AppSec Configuration Detail Endpoint
**Endpoint:** `/appsec/v1/configs/{configId}`  
**Response Properties Accessed:**
- All list properties plus additional configuration details

### AppSec Create Policy Endpoint
**Endpoint:** `/appsec/v1/configs/{configId}/versions/{version}/security-policies`  
**Response Properties Accessed:**
- `policyId` - Created policy ID
- `policyName` - Policy name
- `policyMode` - Policy mode

### AppSec Security Events Endpoint
**Endpoint:** `/appsec/v1/configs/{configId}/security-events`  
**Response Properties Accessed:**
- `totalEvents` - Total event count
- `securityEvents[]` - Array of security events
- `securityEvents[].timestamp` - Event timestamp
- `securityEvents[].httpMessage.start` - Request start time
- `securityEvents[].httpMessage.host` - Target hostname
- `securityEvents[].httpMessage.requestUri` - Request URI
- `securityEvents[].clientIP` - Client IP address
- `securityEvents[].ruleId` - Triggered rule ID
- `securityEvents[].attackGroup` - Attack category
- `securityEvents[].action` - Action taken

### AppSec Activation Endpoint
**Endpoint:** `/appsec/v1/configs/{configId}/versions/{version}/activations`  
**Response Properties Accessed:**
- `activationId` - Activation identifier
- `status` - Activation status
- `network` - Target network
- `configId` - Configuration ID
- `version` - Version being activated

## Reporting API

### Reporting Metrics Endpoints
**Various endpoints for different metrics**  
**Response Properties Accessed:**
- `data[]` - Array of metric data points
- `data[].timestamp` - Data point timestamp
- `data[].value` - Metric value
- `data[].unit` - Unit of measurement
- `data[].dimensions` - Additional dimensions
- `metadata.name` - Metric name
- `metadata.description` - Metric description
- `metadata.unit` - Default unit
- `metadata.aggregationType` - How data is aggregated

## Common Types

### Error Responses
All APIs may return error responses with these properties:
- `type` - Error type URI
- `title` - Error title
- `detail` - Detailed error message
- `instance` - Instance identifier
- `status` - HTTP status code
- `errors[]` - Array of detailed errors
- `warnings[]` - Array of warnings

### Rate Limit Headers
Response headers that may be included:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp
- `Retry-After` - Seconds to wait before retry

## Usage Notes

1. **Response Validation**: Always validate responses before accessing nested properties to avoid runtime errors.

2. **Optional Properties**: Many properties are optional and may not be present in all responses. Use optional chaining or null checks.

3. **Array Handling**: Most list endpoints return data in an array within a wrapper object (e.g., `properties.items[]`).

4. **Status Enums**: Status fields typically use uppercase values (ACTIVE, INACTIVE, PENDING, etc.).

5. **Date Formats**: Timestamps are typically in ISO 8601 format.

6. **ID Formats**: Many IDs have specific prefixes:
   - Properties: `prp_`
   - Groups: `grp_`
   - Contracts: `ctr_`
   - CP Codes: `cpc_`

7. **Network Values**: Network parameters use STAGING or PRODUCTION (uppercase).

8. **Error Handling**: All endpoints may return error responses following the RFC 7807 Problem Details format.