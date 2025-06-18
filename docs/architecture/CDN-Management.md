# CDN Management Guide

Comprehensive guide for managing CDN properties, configurations, and deployments using ALECS.

## Table of Contents
- [Overview](#overview)
- [Property Lifecycle](#property-lifecycle)
- [Configuration Management](#configuration-management)
- [Rule Configuration](#rule-configuration)
- [Hostname Management](#hostname-management)
- [Deployment Strategies](#deployment-strategies)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

CDN management in ALECS covers the complete lifecycle of content delivery properties:

- Creating and configuring properties
- Managing versions and rules
- Deploying to staging and production
- Monitoring and optimization

## Property Lifecycle

### 1. Property Creation

Start with understanding your requirements:

```
# List available contracts and groups
List my Akamai groups and contracts

# Create property with appropriate template
Create property www.example.com in group grp_12345 using static website template
```

### 2. Initial Configuration

Properties are created with default configurations based on templates:

- **Static Website**: Optimized for HTML, CSS, JS, images
- **Dynamic Application**: API paths, session handling
- **API Acceleration**: No caching, rate limiting

### 3. Version Management

Properties use versioning for safe updates:

```
# Create new version
Create new version of property prp_12345

# Always work on latest editable version
Get property prp_12345 details to see current versions
```

### 4. Activation Workflow

```
Development → Staging → Production
     ↓           ↓           ↓
   Test       Validate    Deploy
```

## Configuration Management

### Understanding Rule Trees

Properties use a hierarchical rule structure:

```
Default Rule
├── Performance Rules
│   ├── Caching
│   ├── Compression
│   └── HTTP/2
├── Offload Rules
│   ├── CSS/JS
│   ├── Images
│   └── Static Content
└── Features
    ├── Real User Monitoring
    └── Edge Redirector
```

### Viewing Current Configuration

```
# Get complete rule tree
Get rules for property prp_12345

# Get specific version
Get rules for property prp_12345 version 5
```

### Updating Configuration

```
# Basic update
Update rules for property prp_12345 with enhanced caching

# Custom rules
Update property prp_12345 rules with:
- Cache images for 30 days
- Cache CSS/JS for 7 days
- No cache for /api/*
- Enable Brotli compression
```

## Rule Configuration

### Common Rule Patterns

#### 1. Caching Strategy

```json
{
  "name": "Caching",
  "criteria": [{
    "name": "fileExtension",
    "options": {
      "matchOperator": "IS_ONE_OF",
      "values": ["jpg", "jpeg", "png", "gif", "webp"]
    }
  }],
  "behaviors": [{
    "name": "caching",
    "options": {
      "behavior": "MAX_AGE",
      "ttl": "30d"
    }
  }]
}
```

#### 2. Performance Optimization

```json
{
  "name": "Performance",
  "behaviors": [
    {
      "name": "http2",
      "options": { "enabled": true }
    },
    {
      "name": "gzipResponse",
      "options": { "behavior": "ALWAYS" }
    },
    {
      "name": "brotli",
      "options": { "enabled": true }
    }
  ]
}
```

#### 3. Security Headers

```json
{
  "name": "Security",
  "behaviors": [
    {
      "name": "modifyOutgoingResponseHeader",
      "options": {
        "action": "ADD",
        "standardHeaderName": "X_CONTENT_TYPE_OPTIONS",
        "headerValue": "nosniff"
      }
    }
  ]
}
```

### Path-Based Rules

Configure different behaviors for different paths:

```
Update property prp_12345 with path-based rules:
- /api/* - No caching, pass all headers
- /static/* - Cache for 1 year
- /uploads/* - Cache for 1 hour
- /* - Default caching
```

### Dynamic Content Handling

For applications with user-specific content:

```
Configure property prp_12345 for dynamic content:
- Honor Cache-Control headers
- Forward all cookies for /account/*
- Vary on Accept-Encoding
- Enable connection coalescing
```

## Hostname Management

### Adding Hostnames

#### 1. Create Edge Hostname

```
Create edge hostname www.example.com.edgesuite.net with Enhanced TLS
```

#### 2. Add to Property

```
Add hostname www.example.com to property prp_12345 using edge hostname ehn_12345
```

#### 3. Multiple Hostnames

```
Add these hostnames to property prp_12345:
- www.example.com
- example.com
- api.example.com
- cdn.example.com
```

### Hostname Best Practices

1. **Use Enhanced TLS** for HTTP/2 and better security
2. **Plan hostname structure** before creation
3. **Consider wildcard certificates** for subdomains
4. **Test with staging hostnames** first

### Edge Hostname Types

- **Standard TLS**: Basic HTTPS support
- **Enhanced TLS**: HTTP/2, OCSP stapling, better performance
- **Shared Certificate**: Multiple domains on one cert
- **Custom Certificate**: Your own certificate

## Deployment Strategies

### Blue-Green Deployment

Maintain two properties for zero-downtime updates:

```
1. Create property www.example.com-blue (active)
2. Create property www.example.com-green (staging)
3. Update and test green
4. Switch DNS to green
5. Green becomes new blue
```

### Canary Deployment

Test changes with partial traffic:

```
1. Create property www.example.com-canary
2. Configure 10% traffic split
3. Monitor performance
4. Gradually increase traffic
5. Full deployment when stable
```

### Staged Rollout

Deploy changes progressively:

```
Stage 1: Static assets only
Stage 2: API endpoints
Stage 3: Dynamic pages
Stage 4: Full site
```

### Emergency Rollback

Quick rollback procedure:

```
# Check current active version
List activations for property prp_12345

# Activate previous version
Activate property prp_12345 version 3 to PRODUCTION with note "Emergency rollback"
```

## Performance Optimization

### Caching Optimization

#### 1. Analyze Current Performance

```
Get cache statistics for property prp_12345
```

#### 2. Optimize Cache Keys

```
Configure cache key for property prp_12345:
- Include: Path, Query strings (sorted)
- Exclude: Marketing parameters (utm_*, fbclid)
- Normalize: Case insensitive
```

#### 3. Tiered Caching

```
Enable tiered distribution for property prp_12345
```

### Compression Settings

```
Configure compression for property prp_12345:
- Enable Brotli (level 5)
- Enable Gzip (level 6)
- Minimum size: 1KB
- Include: text/*, application/json, application/javascript
```

### Image Optimization

```
Enable Image Manager for property prp_12345 with:
- Automatic format selection (WebP/AVIF)
- Responsive images
- Quality: 85
- Lazy loading hints
```

### Prefetching and Preloading

```
Configure resource hints for property prp_12345:
- Prefetch: Critical resources
- Preconnect: Third-party origins
- DNS-prefetch: External domains
```

## Monitoring and Analytics

### Real User Monitoring (RUM)

```
Enable RUM for property prp_12345 with:
- Sample rate: 10%
- Custom dimensions: Page type, User segment
- Performance budgets: LCP < 2.5s, FID < 100ms
```

### Log Delivery

```
Configure log delivery for property prp_12345:
- Destination: S3 bucket
- Format: JSON
- Fields: All available
- Frequency: Every 30 minutes
```

### Alerts and Notifications

```
Set up alerts for property prp_12345:
- Origin errors > 1%
- Cache hit ratio < 80%
- 4xx errors > 5%
- 5xx errors > 0.1%
```

## Troubleshooting

### Common Issues

#### 1. Activation Failures

**Error**: "Validation failed"

**Debug**:
```
Get detailed activation status for property prp_12345 activation atv_12345
```

**Common causes**:
- Invalid rule syntax
- Missing required behaviors
- Incompatible settings

#### 2. Origin Errors

**Error**: "Origin connection failed"

**Debug**:
```
Test origin connectivity for property prp_12345
```

**Solutions**:
- Verify origin hostname
- Check firewall rules
- Validate SSL certificates

#### 3. Cache Misses

**Symptom**: Low cache hit ratio

**Debug**:
```
Analyze cache headers for property prp_12345 URL https://example.com/test
```

**Common causes**:
- Cookies preventing caching
- Vary headers too broad
- Short TTLs

### Debug Headers

Enable debug headers for troubleshooting:

```
Enable Akamai debug headers for property prp_12345
```

Use with curl:
```bash
curl -H "Pragma: akamai-x-cache-on, akamai-x-cache-remote-on" https://example.com/
```

### Testing Tools

1. **Staging Network**:
   ```
   Test property prp_12345 on staging network
   ```

2. **Cache Inspector**:
   ```
   Check cache status for https://example.com/image.jpg
   ```

3. **Rule Tester**:
   ```
   Test rules for property prp_12345 with URL /api/users
   ```

## Best Practices

### 1. Version Control

- Document changes in activation notes
- Keep 3-5 recent versions
- Tag versions for major releases

### 2. Testing Protocol

- Always test in staging first
- Use automated tests for validation
- Monitor for 24 hours post-deployment

### 3. Change Management

- Schedule maintenance windows
- Notify stakeholders
- Have rollback plan ready

### 4. Documentation

- Document custom rules
- Maintain runbooks
- Track performance baselines

## Advanced Topics

### Custom Variables

```
Define custom variables for property prp_12345:
- PMUSER_ENVIRONMENT: production
- PMUSER_VERSION: 2.1.0
- PMUSER_REGION: us-east
```

### Edge Workers

```
Deploy Edge Worker to property prp_12345:
- Bundle: hello-world.js
- Resource tier: Dynamic Compute
- Memory: 128MB
```

### API Prioritization

```
Configure API Gateway for property prp_12345:
- Rate limiting by API key
- Request prioritization
- Circuit breaker patterns
```

## Next Steps

- Learn about [Certificate Management](./Certificate-Management.md)
- Explore [DNS Operations](./DNS-Operations.md)
- Read about [Migration Strategies](./Migration-Guides.md)

---

*Last Updated: January 2025*