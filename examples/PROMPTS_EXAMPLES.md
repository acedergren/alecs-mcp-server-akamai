# Akamai MCP Server - Comprehensive Prompt Examples

This document provides comprehensive examples of prompts that the Akamai MCP Server can execute, organized by category.

## Table of Contents
1. [Property Management](#property-management)
2. [DNS Operations](#dns-operations)
3. [Certificate Management](#certificate-management)
4. [Content Purging](#content-purging)
5. [Security Configuration](#security-configuration)
6. [Reporting and Analytics](#reporting-and-analytics)
7. [Bulk Operations](#bulk-operations)
8. [Onboarding Workflows](#onboarding-workflows)

---

## Property Management

### List All Properties
```
List all my properties
```

### Get Property Details
```
Show me details for property prp_123456
```

### Search for Properties
```
Find all properties with "example.com" in the name
```

### Create New Property
```
Create a new property named "my-website" using product SPM and contract ctr-123456 in group grp-123456
```

### Property Version Management
```
Create a new version of property prp_123456 based on version 3
```

### Get Property Rules
```
Show me the rules for property prp_123456 version 5
```

### Update Property Rules
```
Add a caching behavior to property prp_123456 with 1 hour TTL
```

### Activate Property
```
Activate property prp_123456 version 5 to staging network
```

```
Activate property prp_123456 version 5 to production with notification to team@example.com
```

### Property Activation Status
```
Check activation status for property prp_123456
```

### Diff Property Versions
```
Compare version 3 and version 5 of property prp_123456
```

---

## DNS Operations

### List DNS Zones
```
List all DNS zones
```

### Search DNS Zones
```
Find DNS zones containing "example.com"
```

### Create DNS Zone
```
Create a primary DNS zone for example.com in contract ctr-123456
```

### List DNS Records
```
Show all records in zone example.com
```

### Create DNS Records
```
Add an A record for www.example.com pointing to 192.0.2.1 with TTL 300
```

```
Create a CNAME record for blog.example.com pointing to blog.cdn.example.com
```

### Update DNS Records
```
Update the A record for www.example.com to point to 192.0.2.2
```

### Delete DNS Records
```
Delete the CNAME record for old.example.com
```

### Activate DNS Changes
```
Activate pending changes for zone example.com
```

---

## Certificate Management

### List Certificates
```
List all SSL certificates
```

### Get Certificate Details
```
Show details for certificate enrollment 123456
```

### Create Certificate Enrollment
```
Create a DV certificate for www.example.com with admin contact admin@example.com
```

```
Create an EV certificate for secure.example.com with organization "Example Inc"
```

### Add Domains to Certificate
```
Add api.example.com and app.example.com to certificate enrollment 123456
```

### Check Certificate Status
```
Check validation status for certificate enrollment 123456
```

### Deploy Certificate
```
Deploy certificate 123456 to production network
```

---

## Content Purging

### Purge by URL
```
Purge https://www.example.com/images/logo.png
```

### Purge Multiple URLs
```
Purge these URLs:
- https://www.example.com/page1.html
- https://www.example.com/page2.html
- https://www.example.com/assets/style.css
```

### Purge by CP Code
```
Purge all content for CP code 12345
```

### Purge by Cache Tag
```
Purge all content with cache tag "homepage"
```

### Check Purge Status
```
Check status of purge request purge_123456
```

---

## Security Configuration

### Create Network List
```
Create a network list named "Blocked IPs" with description "Known malicious IPs"
```

### Add IPs to Network List
```
Add these IPs to network list "Blocked IPs":
- 192.0.2.100
- 192.0.2.101
- 192.0.2.102
```

### Add CIDR Blocks
```
Add CIDR block 192.0.2.0/24 to network list "Allowed Partners"
```

### Activate Network List
```
Activate network list 12345 to production
```

### Create Security Policy
```
Create a security policy named "API Protection" for configuration 123456
```

### Add Rate Limiting
```
Add rate limiting of 100 requests per minute to security policy "API Protection"
```

---

## Reporting and Analytics

### Traffic Report
```
Show traffic report for property prp_123456 for the last 7 days
```

### Bandwidth Usage
```
Get bandwidth usage for all properties in the last month
```

### Cache Hit Ratio
```
Show cache hit ratio for property prp_123456 today
```

### Error Rate Report
```
Get error rate statistics for property prp_123456 in the last 24 hours
```

### Top URLs Report
```
Show top 10 most requested URLs for property prp_123456
```

---

## Bulk Operations

### Bulk Property Activation
```
Activate these properties to staging:
- prp_123456 version 3
- prp_789012 version 5
- prp_345678 version 2
```

### Bulk DNS Updates
```
Update TTL to 600 for all A records in zone example.com
```

### Bulk Certificate Operations
```
Check validation status for all pending certificates
```

### Bulk Purge
```
Purge all images under https://www.example.com/images/
```

---

## Onboarding Workflows

### Complete Property Onboarding
```
Onboard a new property for www.example.com with origin server origin.example.com
```

### Property Onboarding with Specific Settings
```
Create a property for api.example.com with:
- Origin: api-origin.example.com
- Caching: 5 minutes for JSON responses
- CORS enabled
- Gzip compression
```

### DNS and Property Setup
```
Set up both DNS and CDN for new domain shop.example.com with origin at origin-shop.example.com
```

### Full Site Migration
```
Migrate existing site www.oldsite.com to Akamai with:
- Import current DNS records
- Create property with same URL structure
- Set up SSL certificate
- Configure caching rules
```

### API Endpoint Configuration
```
Configure API endpoint api.example.com with:
- No caching for POST/PUT/DELETE
- 5 minute cache for GET requests
- Rate limiting at 1000 req/min
- CORS for specific domains
```

---

## Advanced Examples

### Complex Rule Configuration
```
Add a rule to property prp_123456 that:
- Matches path /api/*
- Sets cache TTL to 0
- Adds header X-API-Version: v2
- Enables gzip compression
```

### Conditional Activation
```
If staging activation succeeds for property prp_123456, activate to production
```

### Multi-Step Workflow
```
For new customer example.com:
1. Create DNS zone
2. Add A records for www and @
3. Create property with standard template
4. Create DV certificate
5. Activate everything to staging
```

### Debugging and Troubleshooting
```
Why is property prp_123456 showing 503 errors?
```

```
Check if origin server origin.example.com is reachable from Akamai edge
```

```
Show me recent changes to property prp_123456 that might cause issues
```

---

## Tips for Effective Prompts

1. **Be Specific**: Include property IDs, version numbers, and exact domain names
2. **Use Proper IDs**: Akamai IDs typically follow patterns like prp_123456, ctr_123456, grp_123456
3. **Specify Networks**: Always specify "staging" or "production" for activations
4. **Include Context**: Provide email addresses for notifications, descriptions for new resources
5. **Batch Operations**: Group similar operations together for efficiency

## Error Handling

The MCP server will provide helpful error messages if:
- Required parameters are missing
- IDs are not found
- Permissions are insufficient
- API limits are reached

Always check the response for suggestions on how to fix any issues.