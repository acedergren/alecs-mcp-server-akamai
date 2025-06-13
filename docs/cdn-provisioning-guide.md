# CDN + HTTPS Provisioning Guide

This guide covers the complete workflow for provisioning Akamai CDN properties with HTTPS support using ALECS.

## Table of Contents
- [Quick Start](#quick-start)
- [Property Management](#property-management)
- [Certificate Management](#certificate-management)
- [DNS Configuration](#dns-configuration)
- [Complete Workflows](#complete-workflows)

## Quick Start

### 1. Create a New CDN Property with HTTPS

```bash
# Step 1: List available groups and contracts
"List my Akamai groups"

# Step 2: Create property
"Create CDN property www.example.com in group grp_12345 with contract ctr_C-1234567"

# Step 3: Create DV certificate
"Create DV certificate for www.example.com with admin contact John Doe john@example.com +1-555-1234"

# Step 4: Create ACME validation records
"Create ACME validation records for enrollment 12345"

# Step 5: Monitor validation
"Monitor certificate validation for enrollment 12345"

# Step 6: Activate to staging
"Activate property prp_12345 to staging"
```

## Property Management

### Property Version Management

**Create a new version:**
```
"Create new version of property prp_12345 with note 'Adding new caching rules'"
```

**List versions:**
```
"Get property prp_12345 details"
```

### Rule Tree Configuration

**Get current rules:**
```
"Get property rules for prp_12345"
```

**Update rules with template:**
```
"Update property prp_12345 rules to add caching for images with 7 day TTL"
```

**Apply a complete rule tree:**
```
"Update property prp_12345 version 3 rules with contract ctr_C-1234567 and group grp_12345"
```

### Edge Hostname Management

**Create edge hostname:**
```
"Create edge hostname www for property prp_12345 with suffix .edgesuite.net"
```

**With HTTPS:**
```
"Create secure edge hostname www for property prp_12345 with certificate enrollment 12345"
```

### Hostname Management

**Add hostname to property:**
```
"Add hostname www.example.com to property prp_12345 using edge hostname www.example.com.edgesuite.net"
```

**Remove hostname:**
```
"Remove hostname old.example.com from property prp_12345"
```

### Property Activation

**Activate to staging:**
```
"Activate property prp_12345 version 3 to staging with note 'Testing new caching rules'"
```

**Activate to production:**
```
"Activate property prp_12345 to production with emails notify@example.com"
```

**Check activation status:**
```
"Get activation status for property prp_12345 activation atv_12345"
```

**List all activations:**
```
"List activations for property prp_12345"
```

## Certificate Management

### Default DV Certificate Enrollment

**Create enrollment with SANs:**
```
"Create DV certificate for example.com with SANs www.example.com, api.example.com 
and admin contact John Doe john@example.com +1-555-1234 
and tech contact Jane Smith jane@example.com +1-555-5678 
with contract ctr_C-1234567"
```

### DNS Validation Automation

**Get validation requirements:**
```
"Get DV validation challenges for enrollment 12345"
```

**Auto-create ACME records:**
```
"Create ACME validation records for enrollment 12345"
```

**Monitor validation progress:**
```
"Monitor certificate validation for enrollment 12345 checking every 30 seconds for up to 30 minutes"
```

### Certificate Status

**Check enrollment status:**
```
"Check DV enrollment status 12345"
```

**List all certificates:**
```
"List certificate enrollments for contract ctr_C-1234567"
```

### Certificate-Property Linking

**Link certificate to property:**
```
"Link certificate 12345 to property prp_12345"
```

## DNS Configuration

### Automatic ACME Record Creation

When you create a DV certificate, ALECS can automatically create the required DNS validation records:

1. **Create certificate enrollment**
2. **Run**: `"Create ACME validation records for enrollment 12345"`
3. **Records are automatically created in EdgeDNS**
4. **Monitor validation progress**

### Manual DNS Record Creation

If needed, you can manually create validation records:

```
"Create TXT record _acme-challenge.www.example.com with value 'validation-token' in zone example.com"
```

## Complete Workflows

### Workflow 1: New Website with HTTPS

```bash
# 1. Get contract and group info
"List my Akamai groups"

# 2. Create property from template
"Create property www.shop.com using static-website template with origin origin.shop.com"

# 3. Create certificate
"Create DV certificate for www.shop.com with admin John Doe john@shop.com +1-555-1234"

# 4. Auto-create validation records
"Create ACME validation records for enrollment 12345"

# 5. Monitor validation
"Monitor certificate validation for enrollment 12345"

# 6. Create edge hostname with certificate
"Create secure edge hostname www for property prp_12345 with certificate 12345"

# 7. Add hostname
"Add hostname www.shop.com to property prp_12345 using edge hostname www.shop.com.edgesuite.net"

# 8. Activate to staging
"Activate property prp_12345 to staging"

# 9. Test, then activate to production
"Activate property prp_12345 to production"
```

### Workflow 2: Add HTTPS to Existing Property

```bash
# 1. Check current property status
"Get property prp_12345"

# 2. Create new version
"Create new version of property prp_12345"

# 3. Create certificate for existing hostname
"Create DV certificate for www.existing.com"

# 4. Auto-validate
"Create ACME validation records for enrollment 12345"
"Monitor certificate validation for enrollment 12345"

# 5. Link certificate
"Link certificate 12345 to property prp_12345"

# 6. Update edge hostname
"Create secure edge hostname www for property prp_12345 with certificate 12345"

# 7. Activate changes
"Activate property prp_12345 to staging"
```

### Workflow 3: Multi-domain Certificate

```bash
# 1. Create certificate with multiple domains
"Create DV certificate for example.com with SANs www.example.com, api.example.com, cdn.example.com"

# 2. Auto-create all validation records
"Create ACME validation records for enrollment 12345 with auto-detect zones"

# 3. Monitor until validated
"Monitor certificate validation for enrollment 12345"

# 4. Use certificate for multiple properties
"Link certificate 12345 to property prp_12345"
"Link certificate 12345 to property prp_67890"
```

## Best Practices

### 1. **Always Test in Staging First**
- Activate to staging before production
- Verify functionality and performance
- Check certificate deployment

### 2. **Use Version Notes**
- Document changes in version notes
- Reference ticket numbers
- Include rollback instructions

### 3. **Certificate Management**
- Use SANs for related domains
- Monitor expiration dates
- Keep contacts updated

### 4. **DNS Validation**
- Use auto-create ACME records feature
- Verify DNS propagation before monitoring
- Keep validation records until cert is active

### 5. **Activation Emails**
- Include relevant team members
- Use distribution lists
- Document who receives notifications

## Troubleshooting

### Certificate Validation Issues

**Problem**: Validation stuck at pending
```
# Check DNS propagation
"List records in zone example.com"

# Verify ACME records exist
"Get record _acme-challenge.www.example.com in zone example.com"

# Re-check validation
"Get DV validation challenges for enrollment 12345"
```

### Activation Failures

**Problem**: Activation fails with errors
```
# Check activation details
"Get activation status for property prp_12345 activation atv_12345"

# Review property rules
"Get property rules for prp_12345"

# Create new version with fixes
"Create new version of property prp_12345"
```

### Edge Hostname Issues

**Problem**: Cannot create edge hostname
```
# Check existing edge hostnames
"Get property prp_12345"

# Verify certificate is active
"Check DV enrollment status 12345"

# Create with specific options
"Create edge hostname www for property prp_12345 with IPv4_IPV6 support"
```

## Advanced Features

### Property Templates

Use pre-built templates for common configurations:

- **Static Website**: Optimized for HTML, CSS, JS delivery
- **Dynamic Web Application**: API backends with caching
- **API Acceleration**: RESTful API optimization

### Rule Tree Customization

Common rule modifications:

```
# Add security headers
"Update property rules to add security headers HSTS, X-Frame-Options, X-Content-Type-Options"

# Configure caching by file type
"Update property rules to cache images for 30 days, CSS/JS for 7 days, HTML for 10 minutes"

# Add compression
"Update property rules to enable gzip compression for text content"
```

### Multi-Customer Support

Specify customer for any operation:

```
"Create property www.customer.com for customer production-account"
"List certificates for customer staging-account"
```

## API Limits and Considerations

- **Activation Time**: Staging (5-10 min), Production (20-30 min)
- **Certificate Validation**: Usually completes within 15 minutes
- **DNS Propagation**: Can take up to 48 hours globally
- **Rate Limits**: Respect Akamai API rate limits

## Next Steps

1. Review [DNS Migration Guide](./dns-migration-guide.md) for DNS setup
2. Check [Property Templates](./property-templates.md) for configuration examples
3. See [Certificate Best Practices](./certificate-management.md) for security guidelines