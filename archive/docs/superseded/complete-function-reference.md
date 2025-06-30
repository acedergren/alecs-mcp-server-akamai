# Complete Function Reference

This document provides a comprehensive reference for all implemented functions in the ALECS MCP Server.

## Table of Contents

1. [Property Management Functions](#property-management-functions)
2. [DNS Management Functions](#dns-management-functions)
3. [Certificate Management Functions](#certificate-management-functions)
4. [Product and CP Code Functions](#product-and-cp-code-functions)
5. [Secure Property Onboarding Functions](#secure-property-onboarding-functions)

## Property Management Functions

### Core Property Operations

#### list_properties
List all CDN properties with optional filtering.

**Parameters:**
- `contractId` (optional): Filter by contract ID
- `groupId` (optional): Filter by group ID
- `limit` (optional): Maximum number of properties to display (default: 50)
- `customer` (optional): Customer section name from .edgerc

**Example:**
```
"List all properties"
"Show properties in contract ctr_1-ABCDEF"
```

#### get_property
Get detailed information about a specific property.

**Parameters:**
- `propertyId`: Property ID (prp_12345), property name, or hostname
- `customer` (optional): Customer section name from .edgerc

**Example:**
```
"Get details for property example.com"
"Show me property prp_12345"
```

#### create_property
Create a new CDN property.

**Parameters:**
- `propertyName`: Name for the new property
- `productId`: Product ID (e.g., prd_Site_Accel)
- `contractId`: Contract ID for billing
- `groupId`: Group ID for organization
- `ruleFormat` (optional): Rule format version
- `customer` (optional): Customer section name from .edgerc

**Example:**
```
"Create property my-website in group grp_12345 with contract ctr_1-ABCDEF"
```

#### clone_property
Clone an existing property.

**Parameters:**
- `propertyId`: Source property ID to clone from
- `propertyName`: Name for the new cloned property
- `contractId`: Contract ID for the new property
- `groupId`: Group ID for the new property
- `productId` (optional): Product ID for the new property
- `propertyVersion` (optional): Specific version to clone
- `customer` (optional): Customer section name from .edgerc

#### remove_property
Delete a property.

**Parameters:**
- `propertyId`: Property ID to remove
- `contractId`: Contract ID
- `groupId`: Group ID
- `customer` (optional): Customer section name from .edgerc

### Version Management

#### create_property_version
Create a new version of a property.

**Parameters:**
- `propertyId`: Property ID
- `baseVersion` (optional): Version to base the new version on
- `note` (optional): Version notes
- `customer` (optional): Customer section name from .edgerc

#### list_property_versions
List all versions of a property.

**Parameters:**
- `propertyId`: Property ID
- `contractId`: Contract ID
- `groupId`: Group ID
- `limit` (optional): Maximum number of versions to return
- `offset` (optional): Offset for pagination
- `customer` (optional): Customer section name from .edgerc

#### get_property_version
Get details of a specific property version.

**Parameters:**
- `propertyId`: Property ID
- `propertyVersion`: Property version number
- `contractId`: Contract ID
- `groupId`: Group ID
- `customer` (optional): Customer section name from .edgerc

#### get_latest_property_version
Get the latest version of a property.

**Parameters:**
- `propertyId`: Property ID
- `contractId`: Contract ID
- `groupId`: Group ID
- `activatedOn` (optional): Network to get latest activated version from (STAGING or PRODUCTION)
- `customer` (optional): Customer section name from .edgerc

### Rule Management

#### get_property_rules
Get the rule tree for a property version.

**Parameters:**
- `propertyId`: Property ID
- `contractId` (optional): Contract ID
- `groupId` (optional): Group ID
- `version` (optional): Version number (defaults to latest)
- `customer` (optional): Customer section name from .edgerc

#### update_property_rules
Update the rule tree for a property version.

**Parameters:**
- `propertyId`: Property ID
- `contractId`: Contract ID
- `groupId`: Group ID
- `rules`: The complete rule tree
- `version` (optional): Version number
- `note` (optional): Update notes
- `customer` (optional): Customer section name from .edgerc

#### patch_property_rules
Apply JSON patch operations to property rules.

**Parameters:**
- `propertyId`: Property ID
- `propertyVersion`: Property version number
- `contractId`: Contract ID
- `groupId`: Group ID
- `patches`: Array of JSON patch operations
- `validateRules` (optional): Validate rules after patching (default: true)
- `customer` (optional): Customer section name from .edgerc

### Hostname Management

#### create_edge_hostname
Create a new edge hostname.

**Parameters:**
- `propertyId`: Property ID to associate with
- `domainPrefix`: Domain prefix (e.g., "www" for www.example.com.edgesuite.net)
- `domainSuffix` (optional): Domain suffix (defaults to .edgesuite.net)
- `secure` (optional): Enable HTTPS (defaults to true)
- `ipVersion` (optional): IP version support (IPV4, IPV6, IPV4_IPV6)
- `certificateEnrollmentId` (optional): Certificate enrollment ID for HTTPS
- `productId` (optional): Product ID
- `customer` (optional): Customer section name from .edgerc

#### add_property_hostname
Add a hostname to a property.

**Parameters:**
- `propertyId`: Property ID
- `hostname`: Hostname to add (e.g., www.example.com)
- `edgeHostname`: Edge hostname to map to
- `version` (optional): Version number
- `customer` (optional): Customer section name from .edgerc

#### remove_property_hostname
Remove a hostname from a property.

**Parameters:**
- `propertyId`: Property ID
- `hostname`: Hostname to remove
- `version` (optional): Version number
- `customer` (optional): Customer section name from .edgerc

### Activation Management

#### activate_property
Activate a property version to staging or production.

**Parameters:**
- `propertyId`: Property ID
- `network`: Target network (STAGING or PRODUCTION)
- `version` (optional): Version to activate
- `note` (optional): Activation notes
- `notifyEmails` (optional): Email addresses to notify
- `acknowledgeAllWarnings` (optional): Acknowledge all warnings
- `customer` (optional): Customer section name from .edgerc

#### get_activation_status
Get the status of a property activation.

**Parameters:**
- `propertyId`: Property ID
- `activationId`: Activation ID
- `customer` (optional): Customer section name from .edgerc

#### list_property_activations
List activations for a property.

**Parameters:**
- `propertyId`: Property ID
- `network` (optional): Filter by network
- `customer` (optional): Customer section name from .edgerc

#### cancel_property_activation
Cancel a pending property activation.

**Parameters:**
- `propertyId`: Property ID
- `activationId`: Activation ID to cancel
- `contractId`: Contract ID
- `groupId`: Group ID
- `customer` (optional): Customer section name from .edgerc

### Search and Analysis

#### search_properties
Search for properties by various criteria.

**Parameters:**
- `propertyName` (optional): Property name to search for
- `hostname` (optional): Hostname to search for
- `edgeHostname` (optional): Edge hostname to search for
- `contractId` (optional): Filter by contract ID
- `groupId` (optional): Filter by group ID
- `customer` (optional): Customer section name from .edgerc

#### list_all_hostnames
List all hostnames across all properties.

**Parameters:**
- `contractId` (optional): Filter by contract ID
- `groupId` (optional): Filter by group ID
- `options` (optional): Comma-separated list of options
- `customer` (optional): Customer section name from .edgerc

#### get_property_audit_history
Get audit history for a property.

**Parameters:**
- `propertyId`: Property ID
- `contractId`: Contract ID
- `groupId`: Group ID
- `startDate` (optional): Start date for audit history (ISO 8601)
- `endDate` (optional): End date for audit history (ISO 8601)
- `limit` (optional): Maximum number of entries to return
- `offset` (optional): Offset for pagination
- `customer` (optional): Customer section name from .edgerc

## DNS Management Functions

### Core DNS Operations

#### list_zones
List all DNS zones in your account.

**Parameters:**
- `search` (optional): Search for zones by name
- `contractIds` (optional): Filter by contract IDs
- `includeAliases` (optional): Include alias zones
- `customer` (optional): Customer section name from .edgerc

#### get_zone
Get details of a specific DNS zone.

**Parameters:**
- `zone`: Zone name (e.g., example.com)
- `customer` (optional): Customer section name from .edgerc

#### create_zone
Create a new DNS zone.

**Parameters:**
- `zone`: Zone name (e.g., example.com)
- `type`: Zone type (PRIMARY, SECONDARY, or ALIAS)
- `masters` (optional): Master servers (required for SECONDARY zones)
- `target` (optional): Target zone (required for ALIAS zones)
- `comment` (optional): Zone comment
- `contractId` (optional): Contract ID
- `groupId` (optional): Group ID
- `customer` (optional): Customer section name from .edgerc

### Record Management

#### list_records
List DNS records in a zone.

**Parameters:**
- `zone`: Zone name
- `search` (optional): Search for records by name
- `types` (optional): Filter by record types (e.g., ["A", "CNAME"])
- `customer` (optional): Customer section name from .edgerc

#### upsert_record
Create or update a DNS record.

**Parameters:**
- `zone`: Zone name
- `name`: Record name (e.g., www.example.com)
- `type`: Record type (e.g., A, AAAA, CNAME, MX, TXT)
- `ttl`: Time to live in seconds
- `rdata`: Record data (e.g., ["192.0.2.1"] for A record)
- `comment` (optional): Change comment
- `force` (optional): Force discard of existing changelist
- `customer` (optional): Customer section name from .edgerc

#### delete_record
Delete a DNS record.

**Parameters:**
- `zone`: Zone name
- `name`: Record name
- `type`: Record type
- `comment` (optional): Change comment
- `force` (optional): Force discard of existing changelist
- `customer` (optional): Customer section name from .edgerc

#### get_record_set
Get a specific DNS record set.

**Parameters:**
- `zone`: Zone name
- `name`: Record name
- `type`: Record type
- `customer` (optional): Customer section name from .edgerc

#### create_multiple_record_sets
Create multiple DNS records in bulk.

**Parameters:**
- `zone`: Zone name
- `recordSets`: Array of record sets to create
- `comment` (optional): Change comment
- `force` (optional): Force discard of existing changelist
- `customer` (optional): Customer section name from .edgerc

### Advanced DNS Functions

#### get_zones_dnssec_status
Check DNSSEC status for multiple zones.

**Parameters:**
- `zones`: Array of zone names to check
- `customer` (optional): Customer section name from .edgerc

#### get_secondary_zone_transfer_status
Get transfer status for secondary zones.

**Parameters:**
- `zones`: Array of secondary zone names
- `customer` (optional): Customer section name from .edgerc

#### get_zone_contract
Get contract information for zones.

**Parameters:**
- `zone`: Zone name
- `customer` (optional): Customer section name from .edgerc

#### update_tsig_key_for_zones
Update TSIG authentication keys for zones.

**Parameters:**
- `zones`: Array of zone names
- `tsigKey`: TSIG key configuration
  - `name`: Key name
  - `algorithm`: Algorithm (e.g., hmac-sha256)
  - `secret`: Base64 encoded secret
- `customer` (optional): Customer section name from .edgerc

#### submit_bulk_zone_create_request
Create multiple zones in bulk.

**Parameters:**
- `zones`: Array of zone configurations
- `contractId`: Contract ID
- `groupId`: Group ID
- `customer` (optional): Customer section name from .edgerc

### Zone Version Management

#### get_zone_version
Get specific zone version details.

**Parameters:**
- `zone`: Zone name
- `version`: Version ID
- `customer` (optional): Customer section name from .edgerc

#### get_version_record_sets
Get records from a specific zone version.

**Parameters:**
- `zone`: Zone name
- `version`: Version ID
- `customer` (optional): Customer section name from .edgerc

#### reactivate_zone_version
Reactivate a previous zone version.

**Parameters:**
- `zone`: Zone name
- `version`: Version ID to reactivate
- `customer` (optional): Customer section name from .edgerc

#### get_version_master_zone_file
Export zone version as master file.

**Parameters:**
- `zone`: Zone name
- `version`: Version ID
- `customer` (optional): Customer section name from .edgerc

### DNS Migration Functions

#### import_zone_via_axfr
Import a DNS zone via AXFR transfer.

**Parameters:**
- `zone`: Zone to import
- `masterServer`: Master DNS server to transfer from
- `tsigKey` (optional): TSIG key for authentication
- `createZone` (optional): Create zone if it doesn't exist
- `contractId` (optional): Contract ID (required if createZone is true)
- `groupId` (optional): Group ID (required if createZone is true)
- `customer` (optional): Customer section name from .edgerc

#### parse_zone_file
Parse a zone file and cache the records for import.

**Parameters:**
- `zoneFileContent`: The zone file content to parse
- `zone`: Zone name for the records
- `customer` (optional): Customer section name from .edgerc

#### bulk_import_records
Import cached records from a previous parse operation.

**Parameters:**
- `zone`: Zone to import records into
- `batchId`: Batch ID from parse operation
- `clearCache` (optional): Clear cache after import
- `customer` (optional): Customer section name from .edgerc

#### convert_zone_to_primary
Convert a secondary zone to primary.

**Parameters:**
- `zone`: Zone to convert
- `comment` (optional): Conversion comment
- `customer` (optional): Customer section name from .edgerc

#### generate_migration_instructions
Generate DNS migration instructions for a zone.

**Parameters:**
- `zone`: Zone name
- `targetProvider` (optional): Target DNS provider (route53, cloudflare, godaddy, namecheap, generic)
- `customer` (optional): Customer section name from .edgerc

## Certificate Management Functions

#### create_dv_enrollment
Create a new Default DV certificate enrollment.

**Parameters:**
- `commonName`: Primary domain for the certificate
- `adminContact`: Administrative contact information
- `techContact`: Technical contact information
- `contractId`: Contract ID for billing
- `sans` (optional): Additional domains (Subject Alternative Names)
- `enhancedTLS` (optional): Deploy to Enhanced TLS network (default: true)
- `quicEnabled` (optional): Enable QUIC/HTTP3 support
- `customer` (optional): Customer section name from .edgerc

#### get_dv_validation_challenges
Get DV validation challenges for a certificate enrollment.

**Parameters:**
- `enrollmentId`: Certificate enrollment ID
- `customer` (optional): Customer section name from .edgerc

#### check_dv_enrollment_status
Check the status of a DV certificate enrollment.

**Parameters:**
- `enrollmentId`: Certificate enrollment ID
- `customer` (optional): Customer section name from .edgerc

#### list_certificate_enrollments
List all certificate enrollments.

**Parameters:**
- `contractId` (optional): Filter by contract ID
- `customer` (optional): Customer section name from .edgerc

#### link_certificate_to_property
Link a certificate to a property.

**Parameters:**
- `enrollmentId`: Certificate enrollment ID
- `propertyId`: Property ID to link to
- `propertyVersion` (optional): Property version
- `customer` (optional): Customer section name from .edgerc

#### update_property_with_default_dv
Update property with secure edge hostname using Default DV certificate.

**Parameters:**
- `propertyId`: Property ID to update
- `hostname`: Hostname to secure (e.g., www.example.com)
- `version` (optional): Property version
- `ipVersion` (optional): IP version support (defaults to IPV4_IPV6)
- `customer` (optional): Customer section name from .edgerc

#### update_property_with_cps_certificate
Update property with edge hostname secured by CPS-managed certificate.

**Parameters:**
- `propertyId`: Property ID to update
- `hostname`: Hostname to secure
- `certificateEnrollmentId`: CPS certificate enrollment ID
- `version` (optional): Property version
- `ipVersion` (optional): IP version support
- `tlsVersion` (optional): TLS version (STANDARD_TLS or ENHANCED_TLS)
- `customer` (optional): Customer section name from .edgerc

## Product and CP Code Functions

### Product Management

#### list_products
List all products available under a contract.

**Parameters:**
- `contractId`: Contract ID to list products for
- `customer` (optional): Customer section name from .edgerc

#### get_product
Get details about a specific product.

**Parameters:**
- `productId`: Product ID (e.g., prd_Site_Accel)
- `contractId`: Contract ID containing the product
- `customer` (optional): Customer section name from .edgerc

#### list_use_cases
List Akamai-provided use case scenarios for optimal traffic mapping.

**Parameters:**
- `productId`: Product ID to get use cases for
- `contractId` (optional): Contract ID
- `customer` (optional): Customer section name from .edgerc

### CP Code Management

#### list_cpcodes
List all CP Codes in your account.

**Parameters:**
- `contractId` (optional): Filter by contract ID
- `groupId` (optional): Filter by group ID
- `customer` (optional): Customer section name from .edgerc

#### get_cpcode
Get detailed information about a specific CP Code.

**Parameters:**
- `cpcodeId`: CP Code ID (e.g., 12345 or cpc_12345)
- `customer` (optional): Customer section name from .edgerc

#### create_cpcode
Create a new CP Code for traffic reporting and billing analysis.

**Parameters:**
- `cpcodeName`: Name for the new CP Code
- `contractId`: Contract ID for billing
- `groupId`: Group ID for organization
- `productId` (optional): Product ID (default: prd_Site_Accel)
- `timeZone` (optional): Time zone for reporting (default: GMT)
- `customer` (optional): Customer section name from .edgerc

#### search_cpcodes
Search CP Codes by name or ID.

**Parameters:**
- `searchTerm`: Search term (name or ID)
- `contractId` (optional): Filter by contract ID
- `groupId` (optional): Filter by group ID
- `customer` (optional): Customer section name from .edgerc

### Contract and Group Management

#### list_contracts
List all available contracts in your account.

**Parameters:**
- `searchTerm` (optional): Search for contracts by ID or type
- `customer` (optional): Customer section name from .edgerc

#### list_groups
List all available groups and contracts in your account.

**Parameters:**
- `searchTerm` (optional): Search for groups by name or ID
- `customer` (optional): Customer section name from .edgerc

### Edge Hostname Management

#### list_edge_hostnames
List edge hostnames associated with properties.

**Parameters:**
- `contractId`: Contract ID
- `groupId`: Group ID
- `options` (optional): Comma-separated list of options (e.g., "mapDetails")
- `customer` (optional): Customer section name from .edgerc

#### get_edge_hostname
Get details of a specific edge hostname.

**Parameters:**
- `edgeHostnameId`: Edge hostname ID (e.g., ehn_12345)
- `contractId`: Contract ID
- `groupId`: Group ID
- `options` (optional): Comma-separated list of options
- `customer` (optional): Customer section name from .edgerc

## Secure Property Onboarding Functions

#### onboard_secure_property
Complete workflow for onboarding a Secure by Default property with automatic DefaultDV certificate.

**Parameters:**
- `propertyName`: Name for the new property
- `hostnames`: Array of hostnames to be served by this property
- `originHostname`: Origin server hostname
- `contractId`: Contract ID for billing
- `groupId`: Group ID for organization
- `productId` (optional): Product ID (default: prd_Site_Accel)
- `cpCode` (optional): CP Code for reporting
- `notificationEmails` (optional): Email addresses for notifications
- `customer` (optional): Customer section name from .edgerc

#### quick_secure_property_setup
Quick setup for secure property with minimal inputs and sensible defaults.

**Parameters:**
- `domain`: Primary domain (e.g., example.com)
- `originHostname`: Origin server hostname
- `contractId`: Contract ID for billing
- `groupId`: Group ID for organization
- `customer` (optional): Customer section name from .edgerc

#### check_secure_property_status
Check the status of secure property onboarding including certificate validation.

**Parameters:**
- `propertyId`: Property ID to check
- `enrollmentId` (optional): Certificate enrollment ID to check status
- `customer` (optional): Customer section name from .edgerc

#### debug_secure_property_onboarding
Debug version of secure property onboarding with detailed error reporting.

**Parameters:**
- `propertyName`: Name for the new property
- `hostnames`: Array of hostnames
- `originHostname`: Origin server hostname
- `contractId`: Contract ID
- `groupId`: Group ID
- `productId` (optional): Product ID
- `customer` (optional): Customer section name from .edgerc

## Common Behaviors and Rule Management

#### list_available_behaviors
List available behaviors for property rules.

**Parameters:**
- `contractId`: Contract ID
- `groupId`: Group ID
- `productId` (optional): Product ID
- `propertyId` (optional): Property ID for context
- `propertyVersion` (optional): Property version for context
- `ruleFormat` (optional): Rule format version
- `customer` (optional): Customer section name from .edgerc

#### list_available_criteria
List available criteria for property rules.

**Parameters:**
- `contractId`: Contract ID
- `groupId`: Group ID
- `productId` (optional): Product ID
- `propertyId` (optional): Property ID for context
- `propertyVersion` (optional): Property version for context
- `ruleFormat` (optional): Rule format version
- `customer` (optional): Customer section name from .edgerc

## Bulk Operations

#### bulk_search_properties
Initiate a bulk search for properties.

**Parameters:**
- `contractId`: Contract ID
- `groupId`: Group ID
- `customer` (optional): Customer section name from .edgerc

#### get_bulk_search_results
Get results from a bulk property search.

**Parameters:**
- `bulkSearchId`: Bulk search ID
- `contractId`: Contract ID
- `groupId`: Group ID
- `customer` (optional): Customer section name from .edgerc

## Domain Validation

#### generate_domain_validation_challenges
Generate domain validation challenges for certificates.

**Parameters:**
- `enrollmentId`: Certificate enrollment ID
- `contractId`: Contract ID
- `customer` (optional): Customer section name from .edgerc

#### resume_domain_validation
Resume domain validation for certificates.

**Parameters:**
- `enrollmentId`: Certificate enrollment ID
- `contractId`: Contract ID
- `customer` (optional): Customer section name from .edgerc

## Versioning

#### list_property_version_hostnames
List hostnames for a specific property version.

**Parameters:**
- `propertyId`: Property ID
- `propertyVersion`: Property version number
- `contractId`: Contract ID
- `groupId`: Group ID
- `includeCertStatus` (optional): Include certificate status
- `validateHostnames` (optional): Validate hostnames
- `customer` (optional): Customer section name from .edgerc