# Akamai Property Manager API with Multi-Customer Support

## Overview

The Akamai Property Manager API (PAPI) provides a programmatic interface to manage how Akamai edge servers process requests, responses, and objects served over the Akamai platform. This guide focuses on implementing multi-customer support using EdgeGrid authentication with account switching capabilities.

## Table of Contents

1. [EdgeGrid Authentication](#edgegrid-authentication)
2. [Account Switching for Multi-Customer Management](#account-switching-for-multi-customer-management)
3. [.edgerc File Structure](#edgerc-file-structure)
4. [Property Versioning and Promotion](#property-versioning-and-promotion)
5. [Network Activation (Staging & Production)](#network-activation-staging--production)
6. [Sample Code for Multi-Customer Context Switching](#sample-code-for-multi-customer-context-switching)
7. [Best Practices](#best-practices)

## EdgeGrid Authentication

EdgeGrid is Akamai's custom HTTP request signing protocol required for all API interactions. It uses a set of tokens tied to your Akamai account:

### Required Credentials
- **Client Token**: Identifies the API client
- **Access Token**: Grants access to specific APIs
- **Client Secret**: Used to sign requests
- **Host**: Unique hostname (format: `xxxxx.luna.akamaiapis.net`)

### Authentication Header Format
EdgeGrid authentication requires constructing a special `Authorization` header containing:
- Signature algorithm
- Client token
- Access token
- Timestamp
- Nonce
- Request signature

## Account Switching for Multi-Customer Management

The `accountSwitchKey` parameter enables managing multiple customer accounts through a single API client.

### Key Features
- Allows API calls to be executed in different account contexts
- Supports multiple account IDs separated by colons
- Format: `A-CCT1234:A-CCT5432`

### Usage in API Requests
Add the `accountSwitchKey` as a query parameter:
```
GET /papi/v1/properties?accountSwitchKey=A-CCT1234:A-CCT5432
```

### Requirements and Limitations
1. Requires special API client configuration
2. Not supported by all Akamai APIs (e.g., DataStream 2, SIEM Integration)
3. Not available with service account API clients
4. User must have access to target accounts in Control Center

## .edgerc File Structure

The `.edgerc` file stores authentication credentials in INI format, supporting multiple sections for different environments and customers.

### Basic Structure
```ini
[default]
client_secret = abcdEcSnaAt123FNkBxy456z25qx9Yp5CPUxlEfQeTDkfh4QA=I
host = akab-lmn789n2k53w7qrs10cxy-nfkxaa4lfk3kd6ym.luna.akamaiapis.net
access_token = akab-zyx987xa6osbli4k-e7jf5ikib5jknes3
client_token = akab-nomoflavjuc4422-fa2xznerxrm3teg7
```

### Multi-Customer Configuration
```ini
[default]
client_secret = defaultSecret123456789=
host = akab-default-host.luna.akamaiapis.net
access_token = akab-default-access-token
client_token = akab-default-client-token

[customer1]
client_secret = customer1Secret123456789=
host = akab-customer1-host.luna.akamaiapis.net
access_token = akab-customer1-access-token
client_token = akab-customer1-client-token
account_key = B-C-CUST1:1-8BYUX

[customer2]
client_secret = customer2Secret123456789=
host = akab-customer2-host.luna.akamaiapis.net
access_token = akab-customer2-access-token
client_token = akab-customer2-client-token
account_key = B-C-CUST2:1-9CZVY

[staging]
client_secret = stagingSecret123456789=
host = akab-staging-host.luna.akamaiapis.net
access_token = akab-staging-access-token
client_token = akab-staging-client-token
account_key = B-C-STAGE:1-7AXWZ
```

### Section Naming Conventions
- Use lowercase letters
- Allowed characters: dashes, underscores, spaces
- Common names: `default`, `papi`, `staging`, `production`, `customer-name`

## Property Versioning and Promotion

### Version Management
- Properties cannot be edited while active on staging or production
- New versions must be created to make changes
- Version numbers increment automatically
- Each version maintains its own rule tree and configuration

### Version Workflow
1. **Create New Version**: Clone from existing active version
2. **Edit Configuration**: Modify rules, behaviors, and criteria
3. **Save Changes**: Persist modifications to the version
4. **Test on Staging**: Activate on staging network for validation
5. **Promote to Production**: Activate on production after testing

### API Endpoints for Versioning
```
# Get latest version
GET /papi/v1/properties/{propertyId}/versions/latest

# Create new version
POST /papi/v1/properties/{propertyId}/versions
{
  "createFromVersion": 3,
  "createFromVersionEtag": "etag-value"
}

# Get specific version
GET /papi/v1/properties/{propertyId}/versions/{versionId}
```

## Network Activation (Staging & Production)

### Network Types
1. **Staging Network (ESN)**
   - Used for testing and validation
   - Activation time: ~3 minutes
   - Accessible via modified hosts file or staging hostnames

2. **Production Network**
   - Live customer-facing environment
   - Activation time: ~15 minutes
   - Phased deployment for safety

### Activation Process
1. **Validation**: System checks configuration for errors
2. **Safety Checks**: Monitors error rates during deployment
3. **Phased Rollout**: Gradual deployment across edge servers
4. **Completion**: Full network propagation

### Activation API Example
```
POST /papi/v1/properties/{propertyId}/activations
{
  "propertyVersion": 4,
  "network": "STAGING",
  "notes": "Testing new caching rules",
  "notifyEmails": ["admin@example.com"],
  "acknowledgeAllWarnings": true
}
```

### Safety Features
- Automatic cancellation on high error rates
- Error thresholds:
  - 2xx success rate < 90%
  - 4xx/5xx errors increase > 10x
- Fast Fallback option for quick reversion

## Sample Code for Multi-Customer Context Switching

### Python Example with EdgeGrid
```python
from akamai.edgegrid import EdgeGridAuth, EdgeRc
import requests
from urllib.parse import urljoin

class AkamaiMultiCustomerClient:
    def __init__(self, edgerc_path='~/.edgerc'):
        self.edgerc = EdgeRc(edgerc_path)
        
    def get_session(self, section='default'):
        """Create authenticated session for specific customer section"""
        base_url = 'https://%s/' % self.edgerc.get(section, 'host')
        session = requests.Session()
        session.auth = EdgeGridAuth.from_edgerc(self.edgerc, section)
        # Set max body size for PAPI
        session.auth.max_body = 131072
        return session, base_url
    
    def get_properties(self, customer_section='default', account_switch_key=None):
        """Get properties for a specific customer"""
        session, base_url = self.get_session(customer_section)
        url = urljoin(base_url, '/papi/v1/properties')
        
        params = {'groupId': 'grp_12345'}
        if account_switch_key:
            params['accountSwitchKey'] = account_switch_key
            
        response = session.get(url, params=params)
        return response.json()
    
    def activate_property(self, property_id, version, network='STAGING', 
                         customer_section='default', account_switch_key=None):
        """Activate property version on specified network"""
        session, base_url = self.get_session(customer_section)
        url = urljoin(base_url, f'/papi/v1/properties/{property_id}/activations')
        
        params = {}
        if account_switch_key:
            params['accountSwitchKey'] = account_switch_key
            
        data = {
            "propertyVersion": version,
            "network": network.upper(),
            "notes": f"Activation via API - {customer_section}",
            "notifyEmails": ["admin@example.com"],
            "acknowledgeAllWarnings": True
        }
        
        response = session.post(url, json=data, params=params)
        return response.json()

# Usage example
client = AkamaiMultiCustomerClient()

# Get properties for customer1
properties = client.get_properties(customer_section='customer1')

# Activate property for customer2 with account switching
activation = client.activate_property(
    property_id='prp_123456',
    version=5,
    network='STAGING',
    customer_section='customer2',
    account_switch_key='B-C-CUST2:1-9CZVY'
)
```

### JavaScript/Node.js Example
```javascript
const EdgeGrid = require('akamai-edgegrid');
const fs = require('fs');
const path = require('path');

class AkamaiMultiCustomerClient {
    constructor(edgercPath = '~/.edgerc') {
        this.edgercPath = edgercPath.replace('~', process.env.HOME);
        this.clients = {};
    }
    
    getClient(section = 'default') {
        if (!this.clients[section]) {
            this.clients[section] = new EdgeGrid({
                path: this.edgercPath,
                section: section
            });
        }
        return this.clients[section];
    }
    
    async getProperties(customerSection = 'default', accountSwitchKey = null) {
        const eg = this.getClient(customerSection);
        
        let url = '/papi/v1/properties';
        const params = new URLSearchParams({ groupId: 'grp_12345' });
        
        if (accountSwitchKey) {
            params.append('accountSwitchKey', accountSwitchKey);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        return new Promise((resolve, reject) => {
            eg.auth({
                path: url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            eg.send((error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }
    
    async activateProperty(propertyId, version, network = 'STAGING', 
                          customerSection = 'default', accountSwitchKey = null) {
        const eg = this.getClient(customerSection);
        
        let url = `/papi/v1/properties/${propertyId}/activations`;
        const params = new URLSearchParams();
        
        if (accountSwitchKey) {
            params.append('accountSwitchKey', accountSwitchKey);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const body = {
            propertyVersion: version,
            network: network.toUpperCase(),
            notes: `Activation via API - ${customerSection}`,
            notifyEmails: ['admin@example.com'],
            acknowledgeAllWarnings: true
        };
        
        return new Promise((resolve, reject) => {
            eg.auth({
                path: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            eg.send((error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }
}

// Usage example
async function main() {
    const client = new AkamaiMultiCustomerClient();
    
    try {
        // Get properties for customer1
        const properties = await client.getProperties('customer1');
        console.log('Customer 1 properties:', properties);
        
        // Activate property for customer2 with account switching
        const activation = await client.activateProperty(
            'prp_123456',
            5,
            'STAGING',
            'customer2',
            'B-C-CUST2:1-9CZVY'
        );
        console.log('Activation response:', activation);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
```

### CLI Usage for Multi-Customer Operations
```bash
# Using different sections from .edgerc
akamai property-manager list-properties -s customer1
akamai property-manager list-properties -s customer2

# Using account switch key
akamai property-manager list-properties -a "B-C-CUST1:1-8BYUX"

# Activate property for specific customer
akamai property-manager activate -p prp_123456 -n staging -s customer1

# Create new version for customer2
akamai property-manager new-version -p prp_789012 -s customer2
```

## Best Practices

### 1. Security
- Store `.edgerc` file with restricted permissions (600)
- Never commit credentials to version control
- Rotate API credentials regularly
- Use environment-specific sections in `.edgerc`

### 2. Multi-Customer Management
- Create dedicated sections for each customer
- Use descriptive section names
- Maintain separate account switch keys
- Implement proper error handling for account access

### 3. Version Control
- Tag versions with meaningful descriptions
- Test all changes on staging first
- Maintain version history documentation
- Use rule format freezing for consistency

### 4. Activation Workflow
- Always validate on staging before production
- Monitor activation progress
- Set up notification emails
- Implement rollback procedures

### 5. API Usage
- Respect rate limits
- Use bulk operations where available
- Cache responses when appropriate
- Implement retry logic with exponential backoff

### 6. Error Handling
- Check for account access permissions
- Validate account switch keys
- Handle activation failures gracefully
- Monitor error rates post-activation

## Conclusion

The Akamai Property Manager API with EdgeGrid authentication provides robust support for multi-customer management through account switching capabilities. By properly structuring your `.edgerc` file and implementing the account switch key parameter, you can efficiently manage multiple customer properties from a single codebase while maintaining security and separation of concerns.

For production implementations, always follow Akamai's best practices for authentication, version management, and activation workflows to ensure reliable and secure property management across your customer base.