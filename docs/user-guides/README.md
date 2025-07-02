# ALECS User Guides

## Quick Links

- [Property Management Guide](#property-management)
- [DNS Operations Guide](#dns-operations)
- [Fast Purge Guide](#fast-purge)
- [Network Lists Guide](#network-lists)
- [Secure Onboarding Guide](#secure-onboarding)

## Property Management

### Basic Operations
```
"List all my properties"
"Show me property details for my-website"
"Create a new property called api-gateway"
```

### Advanced Configuration
```
"Show me the caching rules for my-website"
"Add a new behavior to cache all images for 7 days"
"Set up origin failover for my-api property"
```

### Activation & Deployment
```
"Activate my-website to staging"
"What's the activation status for my-api?"
"Deploy my-website to production with email notifications"
```

## DNS Operations

### Zone Management
```
"List all my DNS zones"
"Create a new zone for example.com"
"Show all records in example.com"
```

### Record Management
```
"Add an A record for www pointing to 192.0.2.1"
"Create a CNAME for blog pointing to blog.example.net"
"Add MX records for Google Workspace"
"Update the TTL for all A records to 300 seconds"
```

### Bulk Operations
```
"Import DNS records from this zone file"
"Add these 10 A records to my zone"
"Migrate example.com from Cloudflare"
```

## Fast Purge

### URL-Based Purging
```
"Purge https://example.com/index.html"
"Invalidate all pages under /blog/"
"Clear cache for these 5 URLs"
```

### CP Code Purging
```
"Purge all content for CP code 12345"
"Show me all my CP codes"
"Clear everything in the Images CP code"
```

### Tag-Based Purging
```
"Purge all content tagged with 'homepage'"
"Invalidate product-page and shopping-cart tags"
```

## Network Lists

### IP Lists
```
"Create a blocklist with these IP addresses"
"Add 192.0.2.0/24 to my allowlist"
"Remove these IPs from the blocklist"
```

### Geographic Lists
```
"Create a list blocking China and Russia"
"Add European countries to my allowlist"
"Show me all available country codes"
```

### List Management
```
"Activate my-blocklist to production"
"Merge blocklist-1 and blocklist-2"
"Export my-allowlist to CSV"
```

## Secure Onboarding

### Complete Property Setup
```
"Onboard www.example.com with HTTPS"
"Set up example.com with Enhanced TLS"
"Create a secure property for my API"
```

### Certificate Management
```
"Create a DV certificate for www.example.com"
"Check certificate validation status"
"Add www2.example.com to my certificate"
```

### Multi-Step Workflows
```
"Help me migrate example.com from another CDN"
"Set up a new property with WAF protection"
"Configure a property for optimal performance"
```

## Best Practices

### 1. Always Verify Before Production
```
"Activate to staging first"
"Test configuration in staging"
"Check activation status before proceeding"
```

### 2. Use Descriptive Names
```
Good: "my-company-website", "api-gateway-prod"
Bad: "test1", "property2"
```

### 3. Batch Operations When Possible
```
"Add these 5 hostnames to my property"
"Create records for www, api, and blog"
"Purge these 10 URLs"
```

### 4. Monitor Activations
```
"Check activation status"
"Show me recent activations"
"List failed activations"
```

## Common Workflows

### New Website Onboarding
1. "Create property my-website for web delivery"
2. "Create edge hostname for my-website"
3. "Add www.example.com to my-website"
4. "Create DV certificate for www.example.com"
5. "Configure caching rules for my-website"
6. "Activate my-website to staging"
7. "Test in staging"
8. "Activate my-website to production"

### DNS Migration
1. "Show current DNS records for example.com"
2. "Create zone example.com in Akamai"
3. "Import records from current provider"
4. "Verify all records are correct"
5. "Update nameservers at registrar"

### Emergency Cache Clear
1. "Purge https://example.com/breaking-news.html"
2. "Check purge status"
3. "Purge all content tagged 'news'"
4. "Verify content is refreshed"

## Multi-Customer Operations

If you manage multiple Akamai accounts:

```
"List properties for customer acme"
"Create zone example.com for customer staging"
"Purge content for customer production"
```

## Getting Help

- For syntax help: "How do I create a property?"
- For status: "What's the status of my activation?"
- For troubleshooting: "Why did my activation fail?"
- For discovery: "What properties do I have?"