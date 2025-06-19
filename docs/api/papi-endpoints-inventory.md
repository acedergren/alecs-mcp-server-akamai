# PAPI (Property Manager API) Endpoints Inventory

## Overview
This document inventories the Property Manager API endpoints for implementation in ALECS MCP Server.

## Priority 1: Core Property Management (Partially Implemented)
- ✅ `GET /papi/v1/properties` - List properties
- ✅ `GET /papi/v1/properties/{propertyId}` - Get property details
- ✅ `POST /papi/v1/properties` - Create property
- ✅ `GET /papi/v1/groups` - List groups
- ⏳ `DELETE /papi/v1/properties/{propertyId}` - Delete property

## Priority 2: Version Management
- ⏳ `GET /papi/v1/properties/{propertyId}/versions` - List versions
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/{versionId}` - Get version details
- ⏳ `POST /papi/v1/properties/{propertyId}/versions` - Create new version
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/latest` - Get latest version

## Priority 3: Rule Management
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/{versionId}/rules` - Get rule tree
- ⏳ `PUT /papi/v1/properties/{propertyId}/versions/{versionId}/rules` - Update rule tree
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/{versionId}/rules/formats` - Get rule formats

## Priority 4: Activation Management
- ⏳ `POST /papi/v1/properties/{propertyId}/activations` - Activate property
- ⏳ `GET /papi/v1/properties/{propertyId}/activations` - List activations
- ⏳ `GET /papi/v1/properties/{propertyId}/activations/{activationId}` - Get activation status
- ⏳ `DELETE /papi/v1/properties/{propertyId}/activations/{activationId}` - Cancel activation

## Priority 5: Hostnames
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/{versionId}/hostnames` - List hostnames
- ⏳ `PUT /papi/v1/properties/{propertyId}/versions/{versionId}/hostnames` - Update hostnames

## Priority 6: Edge Hostnames
- ⏳ `GET /papi/v1/edgehostnames` - List edge hostnames
- ⏳ `POST /papi/v1/edgehostnames` - Create edge hostname
- ⏳ `GET /papi/v1/edgehostnames/{edgehostnameId}` - Get edge hostname details

## Priority 7: Products and CP Codes
- ⏳ `GET /papi/v1/products` - List products
- ⏳ `GET /papi/v1/cpcodes` - List CP codes
- ⏳ `POST /papi/v1/cpcodes` - Create CP code

## Priority 8: Advanced Features
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/{versionId}/comments` - Get version comments
- ⏳ `POST /papi/v1/properties/{propertyId}/versions/{versionId}/clone` - Clone version
- ⏳ `GET /papi/v1/properties/{propertyId}/versions/{versionId}/diff` - Version diff
- ⏳ `GET /papi/v1/schemas/products/{productId}/{ruleFormat}` - Get product rule schema

## Implementation Notes
1. All endpoints require EdgeGrid authentication
2. Support multi-customer via account_key header
3. Handle async operations (activations) with polling
4. Respect rate limits (varies by endpoint)
5. Use PAPI v1 with JSON format

## Next Steps
1. Implement Priority 2 (Version Management)
2. Add rule tree visualization/editing capabilities
3. Implement activation workflow with status tracking
4. Add hostname management with SSL certificate integration