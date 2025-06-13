# Multi-Customer Implementation Example

## .edgerc Configuration
```ini
[default]
client_secret = xxxx
host = akaa-xxxx.luna.akamaiapis.net
access_token = akab-xxxx
client_token = akab-xxxx

[acme-corp]
client_secret = yyyy
host = akaa-yyyy.luna.akamaiapis.net
access_token = akab-yyyy
client_token = akab-yyyy
account-switch-key = ABC-123456

[globex-inc]
client_secret = zzzz
host = akaa-zzzz.luna.akamaiapis.net
access_token = akab-zzzz
client_token = akab-zzzz
account-switch-key = DEF-789012
```

## MCP Tool Usage Examples

### Property Management
```typescript
// List properties for specific customer
{
  "tool": "property.list",
  "arguments": {
    "customer": "acme-corp"
  }
}

// Activate property to staging
{
  "tool": "property.activate", 
  "arguments": {
    "customer": "acme-corp",
    "propertyId": "prp_123456",
    "version": 5,
    "network": "STAGING",
    "notes": "Testing new cache rules"
  }
}

// Promote to production
{
  "tool": "property.activate",
  "arguments": {
    "customer": "acme-corp", 
    "propertyId": "prp_123456",
    "version": 5,
    "network": "PRODUCTION",
    "notes": "Promoted from staging after testing"
  }
}
```

### Certificate Management (Default DV Only)
```typescript
// Create Default DV certificate
{
  "tool": "certificate.dv.create",
  "arguments": {
    "customer": "globex-inc",
    "domains": ["www.globex.com", "api.globex.com"],
    "enhancedTls": true,
    "sni": true
  }
}

// Check certificate status
{
  "tool": "certificate.dv.status",
  "arguments": {
    "customer": "globex-inc",
    "enrollmentId": "123456"
  }
}
```

### Edge DNS Management
```typescript
// Create DNS zone
{
  "tool": "dns.zone.create",
  "arguments": {
    "customer": "acme-corp",
    "zone": "acme.com",
    "type": "PRIMARY",
    "masters": []
  }
}

// Add DNS record
{
  "tool": "dns.record.add",
  "arguments": {
    "customer": "acme-corp",
    "zone": "acme.com",
    "name": "www",
    "type": "CNAME",
    "target": "acme.com.edgesuite.net",
    "ttl": 300
  }
}
```

### Network Lists
```typescript
// Create IP blocklist
{
  "tool": "networklist.create",
  "arguments": {
    "customer": "acme-corp",
    "name": "Blocked_IPs_Prod",
    "type": "IP",
    "items": ["192.168.1.1", "10.0.0.0/8"]
  }
}

// Create geographic allowlist
{
  "tool": "networklist.create",
  "arguments": {
    "customer": "globex-inc",
    "name": "Allowed_Countries",
    "type": "GEO",
    "items": ["US", "CA", "GB", "DE", "FR"]
  }
}

// Activate network list
{
  "tool": "networklist.activate",
  "arguments": {
    "customer": "acme-corp",
    "listId": "12345_BLOCKED_IPS",
    "network": "PRODUCTION"
  }
}
```

### Fast Purge
```typescript
// Purge URLs
{
  "tool": "purge.url",
  "arguments": {
    "customer": "acme-corp",
    "urls": [
      "https://www.acme.com/index.html",
      "https://www.acme.com/products/*"
    ]
  }
}
```

### Reporting
```typescript
// Get traffic report
{
  "tool": "report.traffic",
  "arguments": {
    "customer": "globex-inc",
    "propertyId": "prp_789012",
    "startDate": "2024-01-01",
    "endDate": "2024-01-07",
    "interval": "DAY"
  }
}
```

## Implementation Notes

1. **Customer Validation**: Always validate customer exists in .edgerc
2. **Network Validation**: Only accept "STAGING" or "PRODUCTION"
3. **Error Handling**: Return clear errors for invalid customers
4. **Async Operations**: Handle activation status polling
5. **Rate Limiting**: Respect API limits per customer account