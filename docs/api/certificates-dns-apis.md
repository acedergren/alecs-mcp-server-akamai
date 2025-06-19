# Akamai Default DV Certificates and Edge DNS APIs

## Certificate Provisioning System (CPS) v2 - Default DV Certificates

### Overview
The Akamai Certificate Provisioning System (CPS) API v2 provides programmatic access to manage SSL/TLS certificates, with specific support for Default DV (Domain Validated) certificates, also known as "Secure by Default" certificates.

### Default DV Certificate Characteristics
- **Validation Type**: "dv" (Domain Validated)
- **Validation Level**: Lowest level of validation where the CA validates that you have control of the domain
- **Let's Encrypt Support**: CPS supports DV certificates issued by Let's Encrypt, a free, automated, and open Certificate Authority

### Key API Endpoints

#### Enrollment Management
- `POST /enrollments` - Create a new certificate enrollment
- `GET /enrollments` - List existing enrollments
- `GET /enrollments/{enrollmentId}` - Retrieve specific enrollment details
- `PUT /enrollments/{enrollmentId}` - Update enrollment configuration
- `DELETE /enrollments/{enrollmentId}` - Delete an enrollment

### Enhanced TLS Network Deployment

#### Network Configuration
- **Recommended Network**: "enhanced-tls"
- **Architecture**: SNI-only configuration support
- **Protocol Support**: 
  - QUIC protocol configuration
  - Customizable cipher preferences
  - Ability to disallow specific TLS versions

#### Key Features
- Modern TLS stack with enhanced security
- Optimized for performance and security
- Support for latest TLS protocols and features

### Required Parameters for DV Enrollment

1. **Common Name (CN)** - Primary domain for the certificate
2. **Certificate Type** - Set to "dv" for Domain Validated
3. **Change Management** - Flag for change tracking
4. **Network Configuration** - Specify "enhanced-tls"
5. **Registration Authority (RA)** - Certificate authority selection
6. **Validation Type** - Must be "dv" for Default DV certificates

### Example DV Enrollment Structure
```json
{
  "certificateType": "dv",
  "networkConfiguration": {
    "network": "enhanced-tls",
    "sniOnly": true,
    "quic": {
      "enabled": true
    },
    "disallowedTlsVersions": ["TLSv1", "TLSv1_1"]
  },
  "validationType": "dv",
  "commonName": "example.com",
  "sans": ["www.example.com", "api.example.com"]
}
```

## Edge DNS API v2

### Overview
The Akamai Edge DNS API v2 provides comprehensive DNS zone management capabilities with a change-list based workflow for safe and controlled DNS modifications.

### Core Capabilities

#### 1. DNS Zone Management
- **Zone Types Supported**:
  - PRIMARY - Akamai hosts the authoritative zone
  - SECONDARY - Akamai acts as secondary DNS
  - ALIAS - Zone aliasing capabilities

#### 2. Change Management Workflow
The API uses a change list approach for DNS modifications:
1. Create a change list for a zone
2. Add modifications (ADD, EDIT, DELETE operations)
3. Review changes
4. Submit changes with safety checks

### Key API Endpoints

#### Zone and Change Management
- `GET /changelists` - List all change lists
- `POST /changelists/{zone}` - Create new change list for a zone
- `GET /changelists/{zone}` - Get current change list details
- `DELETE /changelists/{zone}` - Delete a change list

#### Record Set CRUD Operations
- `GET /changelists/{zone}/recordsets` - List record sets in change list
- `POST /changelists/{zone}/recordsets` - Add new record set
- `PUT /changelists/{zone}/recordsets/{name}/{type}` - Update record set
- `DELETE /changelists/{zone}/recordsets/{name}/{type}` - Delete record set

#### Bulk Operations
- `POST /changelists/{zone}/master-zone-file` - Upload master zone file for bulk updates
- `GET /changelists/{zone}/diff` - View differences between zone versions

#### Zone Submission
- `POST /changelists/{zone}/submit` - Submit zone changes for activation
- Includes validation and safety checks before applying changes

### Supported DNS Record Types
The API supports all standard DNS record types including:
- A, AAAA (IPv4/IPv6 addresses)
- CNAME (Canonical names)
- MX (Mail exchange)
- TXT (Text records)
- NS (Name servers)
- SOA (Start of Authority)
- SRV (Service records)
- CAA (Certificate Authority Authorization)
- And many more specialized types

### Authentication and Authorization

#### Requirements
- **Contract-based Access**: Operations require appropriate contract permissions
- **Permission Levels**:
  - READ - View zone and record data
  - WRITE - Modify existing records
  - ADD - Create new zones/records

#### Account Management
- Support for account switch keys (`accountSwitchKey` parameter)
- Multi-account management capabilities
- Contract-scoped operations

### Integration Patterns with Property Manager

#### 1. Edge Hostname Integration
- DNS records can point to Akamai edge hostnames
- Automatic CNAME creation for property activations
- Coordination between DNS and CDN configurations

#### 2. Certificate Domain Validation
- DNS record creation for DV certificate validation
- TXT record management for domain ownership verification
- Automated validation record cleanup

#### 3. Common Integration Workflows

##### Certificate Provisioning Flow
1. Create DV certificate enrollment via CPS API
2. Retrieve DNS validation requirements
3. Create TXT validation records via Edge DNS API
4. Monitor validation status
5. Clean up validation records post-issuance

##### Property Activation Flow
1. Create/update property configuration
2. Obtain edge hostname from Property Manager
3. Create/update CNAME record via Edge DNS API
4. Activate property configuration

### Best Practices

#### For Certificate Management
1. Use Let's Encrypt DV certificates for cost-effective SSL/TLS
2. Deploy on Enhanced TLS network for optimal security
3. Automate renewal processes using CPS API
4. Monitor certificate expiration dates

#### For DNS Management
1. Always use change lists for modifications
2. Review diffs before submitting changes
3. Implement proper error handling for API calls
4. Use bulk operations for large-scale updates
5. Maintain DNS record documentation

### Example DNS Record Creation
```json
{
  "name": "www.example.com",
  "type": "CNAME",
  "ttl": 300,
  "rdata": ["example.com.edgekey.net"]
}
```

### Example Integration Code Pattern
```python
# Pseudo-code for certificate provisioning with DNS validation
def provision_dv_certificate(domain):
    # 1. Create DV enrollment
    enrollment = cps_api.create_enrollment({
        "certificateType": "dv",
        "commonName": domain,
        "networkConfiguration": {"network": "enhanced-tls"}
    })
    
    # 2. Get validation requirements
    validation = cps_api.get_validation_requirements(enrollment.id)
    
    # 3. Create DNS validation record
    dns_api.create_change_list(domain)
    dns_api.add_record({
        "name": validation.record_name,
        "type": "TXT",
        "rdata": [validation.record_value]
    })
    dns_api.submit_changes(domain)
    
    # 4. Wait for validation
    wait_for_validation(enrollment.id)
    
    # 5. Clean up validation record
    dns_api.create_change_list(domain)
    dns_api.delete_record(validation.record_name, "TXT")
    dns_api.submit_changes(domain)
```

## Summary

The combination of Akamai's CPS API for Default DV certificates and Edge DNS API provides a complete solution for:
- Automated SSL/TLS certificate provisioning
- DNS-based domain validation
- Comprehensive DNS zone management
- Integration with Akamai's CDN and security services

The Enhanced TLS network deployment ensures optimal performance and security for Default DV certificates, while the Edge DNS API's change-list workflow provides safe and controlled DNS management capabilities.