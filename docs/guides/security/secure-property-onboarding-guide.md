# Secure-by-Default Property Onboarding Guide

This guide explains how to use ALECS to onboard a secure property with Default DV certificates, following Akamai's best practices.

## Overview

The secure-by-default property onboarding process creates a complete CDN configuration with:
- HTTPS-enabled property with secure settings
- Default DV (Domain Validated) SSL certificate
- Enhanced TLS network deployment
- IPv4 and IPv6 support
- HTTP/2 enabled
- Optimized caching and performance settings

## Prerequisites

Before starting, you'll need:
1. Valid Akamai API credentials in your `.edgerc` file
2. Contract ID and Group ID (use `list_groups` to find these)
3. Origin server hostname
4. Domain names you want to serve

## Quick Start

### Option 1: Quick Setup (Recommended for Single Domain)

For a simple setup with one domain:

```
"Quick secure property setup for example.com with origin origin.example.com in contract ctr_C-1234567 group grp_12345"
```

This will:
- Create property named "example-com"
- Set up both example.com and www.example.com
- Create DV certificate for both hostnames
- Configure secure edge hostname
- Apply optimized settings

### Option 2: Full Onboarding (Multiple Domains)

For complete control over the setup:

```
"Onboard secure property my-website with hostnames example.com, www.example.com, blog.example.com using origin origin.example.com in contract ctr_C-1234567 group grp_12345"
```

## Step-by-Step Process

### 1. Property Creation

The tool automatically creates a new property with:
- Appropriate product ID (defaults to Ion Standard)
- Latest rule format
- Secure configuration template

### 2. Certificate Enrollment

A Default DV certificate is created with:
- **Common Name (CN)**: Primary hostname
- **SANs**: All additional hostnames (including www variants)
- **Network**: Enhanced TLS for better security
- **Validation**: DNS-based (ACME DNS-01)
- **Features**: 
  - TLS 1.3 support
  - QUIC/HTTP3 enabled
  - Clone DNS names for easy migration

### 3. Edge Hostname Configuration

A secure edge hostname is created:
- **Domain**: `[property-name].edgekey.net`
- **Type**: Enhanced TLS
- **IP Version**: Dual-stack (IPv4 + IPv6)
- **Certificate**: Linked to the DV enrollment

### 4. Property Rules Configuration

The property is configured with secure defaults:

```javascript
{
  behaviors: [
    // Origin configuration
    {
      name: 'origin',
      options: {
        hostname: 'your-origin.com',
        httpsPort: 443,
        originSni: true,
        verificationMode: 'PLATFORM_SETTINGS'
      }
    },
    // Performance optimizations
    {
      name: 'http2',
      options: { enabled: true }
    },
    {
      name: 'sureRoute',
      options: { enabled: true }
    },
    {
      name: 'tieredDistribution',
      options: { enabled: true }
    },
    // Security settings
    {
      name: 'allowPut',
      options: { enabled: false }
    },
    {
      name: 'allowDelete', 
      options: { enabled: false }
    }
  ]
}
```

### 5. Hostname Addition

All specified hostnames are added to the property and linked to the secure edge hostname.

### 6. DNS Validation Setup

ACME validation records are automatically created in your Akamai DNS zones (if they exist).

## Post-Onboarding Steps

### 1. Verify Certificate Validation

Check the certificate status:
```
"Check DV certificate status for enrollment 12345"
```

DNS validation typically completes within 5-15 minutes.

### 2. Create DNS CNAMEs

For each hostname, create a CNAME record:
```
example.com → example-com.edgekey.net
www.example.com → example-com.edgekey.net
blog.example.com → example-com.edgekey.net
```

### 3. Activate to Staging

Test your configuration:
```
"Activate property prp_12345 to staging"
```

### 4. Test on Staging

Verify your site works correctly:
- https://example.com.edgesuite-staging.net
- Check SSL certificate
- Test functionality

### 5. Activate to Production

Once verified:
```
"Activate property prp_12345 to production"
```

## Monitoring Status

Check the complete status anytime:
```
"Check secure property status for prp_12345 with enrollment 12345"
```

This shows:
- Property activation status
- Certificate validation progress
- Configured hostnames
- Next recommended actions

## Best Practices

### 1. Hostname Planning
- Always include both www and non-www versions
- Add all subdomains upfront to avoid certificate reissuance

### 2. Origin Configuration
- Use HTTPS for origin connections
- Enable origin SNI for proper SSL handshake
- Configure origin certificate verification

### 3. Testing
- Always test on staging first
- Verify SSL labs score (should be A+)
- Check HTTP/2 and IPv6 functionality

### 4. Security Headers
After onboarding, consider adding:
- Strict-Transport-Security (HSTS)
- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options

## Troubleshooting

### Certificate Validation Fails

If DNS validation doesn't complete:
1. Check DNS propagation: `dig _acme-challenge.example.com TXT`
2. Ensure records were created correctly
3. Wait for TTL expiration if records were recently changed

### Activation Errors

Common issues:
- **Missing edge hostname**: Ensure edge hostname was created
- **Hostname conflicts**: Check hostname isn't used elsewhere
- **Certificate not ready**: Wait for validation to complete

### Origin Connection Issues

Verify:
- Origin server is accessible
- Firewall allows Akamai IPs
- SSL certificate on origin is valid

## Advanced Configuration

### Custom CP Codes

Specify a CP code for detailed reporting:
```
"Onboard secure property with CP code 12345..."
```

### Product Selection

Use specific Akamai products:
- `prd_Site_Accel` - Ion Standard (default)
- `prd_Web_Accel` - Web Application Accelerator
- `prd_Dynamic_Site_Accel` - Dynamic Site Accelerator

### Notification Emails

Add email notifications:
```
"Onboard secure property with notification emails admin@example.com, tech@example.com..."
```

## Example Workflows

### E-commerce Site

```
"Onboard secure property ecommerce-prod with hostnames shop.example.com, www.shop.example.com, checkout.example.com, api.example.com using origin origin-prod.example.com in contract ctr_C-1234567 group grp_12345"
```

### Corporate Website

```
"Quick secure property setup for example.com with origin origin.example.com in contract ctr_C-1234567 group grp_12345"
```

### Multi-brand Setup

```
"Onboard secure property multi-brand with hostnames brand1.com, www.brand1.com, brand2.com, www.brand2.com using origin shared-origin.example.com in contract ctr_C-1234567 group grp_12345"
```

## Next Steps

After successful onboarding:

1. **Performance Tuning**: Adjust caching rules for your content
2. **Security Policies**: Add WAF rules if needed
3. **Monitoring**: Set up alerts and reporting
4. **Optimization**: Enable Image & Video Manager for media optimization

## Related Commands

- `list_groups` - Find contract and group IDs
- `get_property` - View property details
- `check_dv_enrollment_status` - Monitor certificate status
- `activate_property` - Deploy changes
- `update_property_rules` - Modify configuration