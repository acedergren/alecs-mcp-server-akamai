# Akamai API Documentation: Purge, Security, and Network Lists

This document provides comprehensive information about three key Akamai APIs: Fast Purge API v3, Application Security API, and Network Lists API v2, including their features, endpoints, and activation dependencies.

## Table of Contents
1. [Fast Purge API v3](#fast-purge-api-v3)
2. [Application Security API](#application-security-api)
3. [Network Lists API v2](#network-lists-api-v2)
4. [Activation Dependencies](#activation-dependencies)

---

## Fast Purge API v3

### Overview
The Fast Purge API (formerly Content Control Utility or CCU) provides programmatic content purging capabilities with requests completing within approximately 5 seconds.

### Repository Structure
- **GitHub**: https://github.com/akamai/akamai-apis/tree/main/apis/ccu/v3
- **Files**: `delete.yaml`, `invalidate.yaml`, `openapi.json`
- **Subdirectories**: `examples/`, `parameters/`, `schemas/`

### Key Features
1. **Fast Performance**: Completes purge requests within ~5 seconds
2. **Supported Products**: Ion, Adaptive Media Delivery, Dynamic Delivery, Dynamic Site Accelerator
3. **Flexible Purging**: Supports URLs, ARLs, cache tags, and CP codes

### Purge Actions
- **Invalidate** (Recommended): Treats content as expired, triggers If-Modified-Since requests
- **Delete**: Completely removes content from servers (for compliance/copyright)

### Content Purge Options
1. **URLs and ARLs**: Direct purging of specific URLs or Akamai Resource Locators
2. **Cache Tags**: Single Edge-Cache-Tag response header (comma-delimited, max 128 bytes)
3. **CP Codes**: Content provider codes for grouped content

### Rate Limits
- Object rate limit: 200 URLs per second
- Headers: `X-Ratelimit-Limit-Per-Second-Objects`

### Authentication
- Uses EdgeGrid authentication
- API endpoint format: `POST /ccu/v3/{delete|invalidate}/{url|cpcode|tag}`

### Documentation
- Main API docs: https://developer.akamai.com/api/core_features/fast_purge/v3.html
- Technical docs: https://techdocs.akamai.com/purge-cache/reference/api

---

## Application Security API

### Overview
The Application Security API enables creation, updating, activation, and export of security configurations for website and API protection.

### Repository Structure
- **GitHub**: https://github.com/akamai/akamai-apis/tree/main/apis/appsec/v1
- **Key Files**: Configuration, Security Policies, Evaluation Mode, Activation/Exports
- **Subdirectories**: `errors/`, `examples/`, `headers/`, `parameters/`, `paths/`, `schemas/`

### Main Features
1. **Security Configuration Management**: Create and manage security policies
2. **API Endpoint Protection**: Register and manage API endpoints
3. **Custom Rules**: Add, modify, and delete custom security rules
4. **Match Targets**: Determine which policies apply to APIs, hostnames, or paths

### CLI Tool (cli-appsec)
Key commands include:
- `activate` - Activate a version
- `activation` - Get activation status
- `activation-history` - List activation history
- `create-match-target` - Create new match targets
- `account-protection-transactional-endpoint` - Manage transactional endpoints

### API Endpoints
Format: `https://{hostname}/appsec/v1/configs/{configId}/versions/{versionNumber}/security-policies/{policyId}/api-endpoints`

### Activation Process
1. **Requirements**: Configuration ID, network designation, version, and note
2. **Networks**: STAGING or PRODUCTION
3. **Versioning**: Latest version must be editable (not currently or previously active)

### Example Activation (Terraform)
```terraform
resource "akamai_appsec_activations" "my-activation" {
  config_id = "12345"
  network = "STAGING"
  note = "Testing configuration activation"
  notification_emails = ["admin@example.com"]
  version = "latest"
}
```

### Authentication
- Credentials stored in `~/.edgerc` file
- Default section: `appsec` or `default`
- Can specify section with `--section` option

### Product Compatibility
- App & API Protector
- Advanced Security Module
- Kona Site Defender
- Web Application Protector

---

## Network Lists API v2

### Overview
The Network Lists API v2 provides fast activation capabilities (typically <10 minutes) for managing IP and geographic-based access control lists.

### Repository Structure
- **GitHub**: https://github.com/akamai/akamai-apis/tree/main/apis/network-lists/v2
- **Files**: `network-lists.yaml`, `activations.yaml`, `notifications.yaml`, `openapi.json`
- **Subdirectories**: `examples/`, `parameters/`, `responses/`, `schemas/`

### List Types
1. **IP Lists**: Contains IP addresses and CIDR blocks
2. **GEO Lists**: Geographic-based lists for location-based access control

### Key Endpoints
- List all network lists: `GET /network-list/v2/network-lists`
- Get specific list: `GET /network-list/v2/network-lists/{networkListId}`
- Activate list: `POST /network-list/v2/network-lists/{networkListId}/environments/{environment}/activate`
- Check status: `GET /network-list/v2/network-lists/{networkListId}/environments/{environment}/status`

### Activation Process
1. **Environments**: STAGING or PRODUCTION
2. **Version**: Uses most recent syncPoint version
3. **Time**: Typically completes in less than 10 minutes

### Example Activation (Terraform)
```terraform
resource "akamai_networklist_activations" "activation" {
  network_list_id = "123456_MYNETWORKLIST"
  network = "staging"
  notes = "Testing network list deployment"
  notification_emails = ["netops@example.com"]
}
```

### Integration with AppSec
Network lists can be used in Application Security configurations as:
- `geo_network_lists` - Geographic access control
- `ip_network_lists` - IP-based access control
- `exception_ip_network_lists` - IP exceptions to security rules

---

## Activation Dependencies

### Overview
Understanding the relationships and dependencies between these APIs is crucial for proper implementation and activation sequencing.

### Dependency Chain

#### 1. Network Lists → Application Security
- Network lists must be activated before being referenced in AppSec policies
- IP/GEO lists are used for access control in security configurations
- Changes to network lists require reactivation of dependent security configs

#### 2. Application Security → Fast Purge
- Security configuration changes may require content purging
- New security rules might necessitate cache invalidation
- Activation of security policies should be followed by targeted purges

### Activation Sequence Best Practices

1. **Initial Setup**
   ```
   Network Lists (IP/GEO) → Application Security Config → Fast Purge (if needed)
   ```

2. **Updates to Network Lists**
   ```
   1. Update Network List
   2. Activate Network List (STAGING → PRODUCTION)
   3. Reactivate dependent AppSec configurations
   4. Purge affected content if caching rules changed
   ```

3. **Security Policy Changes**
   ```
   1. Update AppSec configuration
   2. Activate to STAGING for testing
   3. Validate functionality
   4. Activate to PRODUCTION
   5. Fast Purge if content security headers changed
   ```

### Environment Progression
All three APIs support staged deployment:
- **STAGING**: Test environment for validation
- **PRODUCTION**: Live environment serving traffic

### Timing Considerations
- **Network Lists**: <10 minutes activation
- **AppSec**: Variable (depends on configuration size)
- **Fast Purge**: ~5 seconds completion

### Common Integration Patterns

#### 1. Geographic Restrictions
```
1. Create/Update GEO list in Network Lists API
2. Reference in AppSec policy for geo-blocking
3. Activate both in sequence
4. Purge geo-specific content if needed
```

#### 2. IP Allowlisting
```
1. Maintain IP list via Network Lists API
2. Configure as exception_ip_network_lists in AppSec
3. Coordinate activation across environments
```

#### 3. Security Header Updates
```
1. Update AppSec configuration with new headers
2. Activate configuration
3. Use Fast Purge to invalidate content with old headers
```

### API Authentication
All three APIs use EdgeGrid authentication with credentials typically stored in `~/.edgerc`:
```ini
[default]
host = xxxx.purge.akamaiapis.net
client_token = xxxx
client_secret = xxxx
access_token = xxxx
```

### Monitoring and Validation
- Check activation status endpoints for each API
- Validate changes in STAGING before PRODUCTION
- Monitor activation completion times
- Use notification emails for activation tracking

---

## Additional Resources

### Official Documentation
- Fast Purge: https://techdocs.akamai.com/purge-cache/docs
- Application Security: https://techdocs.akamai.com/application-security/docs
- Network Lists: https://techdocs.akamai.com/network-lists/docs

### API References
- Fast Purge API Reference: https://techdocs.akamai.com/purge-cache/reference/api
- AppSec API Reference: https://techdocs.akamai.com/application-security/reference/api
- Network Lists API Reference: https://techdocs.akamai.com/network-lists/reference/api

### Tools and CLIs
- Akamai CLI: https://developer.akamai.com/cli
- AppSec CLI: https://github.com/akamai/cli-appsec
- Terraform Provider: https://registry.terraform.io/providers/akamai/akamai/latest/docs