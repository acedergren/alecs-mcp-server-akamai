# Quick Start Tutorial

Learn how to use ALECS to deploy your first CDN property with HTTPS in under 10 minutes.

## Table of Contents
- [Overview](#overview)
- [Step 1: Verify Installation](#step-1-verify-installation)
- [Step 2: Create Your First Property](#step-2-create-your-first-property)
- [Step 3: Configure DNS](#step-3-configure-dns)
- [Step 4: Enable HTTPS](#step-4-enable-https)
- [Step 5: Activate to Production](#step-5-activate-to-production)
- [Next Steps](#next-steps)

## Overview

In this tutorial, you'll:
- Create a CDN property for a website
- Set up DNS records
- Provision an SSL certificate
- Deploy to Akamai's global network

We'll use `example.com` as our domain. Replace it with your actual domain.

## Step 1: Verify Installation

First, let's make sure ALECS is working:

```
List my Akamai groups and contracts
```

You should see your available contracts and groups. Note the group ID (like `grp_12345`) for the next step.

## Step 2: Create Your First Property

### Create the Property

```
Create a new CDN property named example.com in group grp_12345 using the static website template
```

ALECS will:
- Create a new property
- Apply optimized settings for static content
- Generate an edge hostname

Note the property ID (like `prp_12345`) from the response.

### View Property Details

```
Show me the details of property prp_12345
```

## Step 3: Configure DNS

### Create DNS Zone

If you don't have a zone yet:

```
Create a PRIMARY DNS zone for example.com
```

### Add Essential Records

```
Add these DNS records to example.com:
- A record for @ pointing to 192.0.2.1
- A record for www pointing to 192.0.2.1
- CNAME record for cdn pointing to example.com.edgesuite.net
```

### Verify DNS Setup

```
List all DNS records in zone example.com
```

## Step 4: Enable HTTPS

### Create SSL Certificate

```
Create a DV certificate for example.com and www.example.com
```

Note the enrollment ID (like `12345`) from the response.

### Complete DNS Validation

ALECS will show you the required DNS validation records:

```
Create the ACME validation records for certificate enrollment 12345
```

This automatically adds the validation records to your DNS zone.

### Monitor Validation

```
Monitor certificate validation for enrollment 12345
```

Wait for the status to show "VALIDATED" (usually 5-10 minutes).

### Link Certificate to Property

```
Link certificate enrollment 12345 to property prp_12345
```

## Step 5: Activate to Production

### Test in Staging First

```
Activate property prp_12345 to STAGING with note "Initial deployment"
```

### Check Activation Status

```
Check activation status for property prp_12345
```

Wait for "ACTIVE" status (usually 5-10 minutes).

### Test Your Staging Configuration

Before going to production, test using Akamai's staging network:

1. Find your staging hostname from the activation details
2. Test using curl with staging headers:

```bash
curl -H "Host: example.com" https://example.com.edgesuite-staging.net/
```

### Deploy to Production

Once staging tests pass:

```
Activate property prp_12345 to PRODUCTION with note "Go live"
```

### Update DNS to Use Akamai

Final step - point your domain to Akamai:

```
Update the A record for www.example.com to use CNAME www.example.com.edgesuite.net
```

## Verification Checklist

✅ Property created and configured
✅ DNS zone created with records
✅ SSL certificate provisioned
✅ Certificate linked to property
✅ Property activated to staging and tested
✅ Property activated to production
✅ DNS pointing to Akamai edge hostname

## Complete Example Workflow

Here's the entire process in one conversation:

```
1. "Create a CDN property named example.com in group grp_12345"
2. "Create a PRIMARY DNS zone for example.com"
3. "Add A record for www.example.com pointing to 192.0.2.1"
4. "Create a DV certificate for example.com and www.example.com"
5. "Create ACME validation records for enrollment 12345"
6. "Monitor certificate validation for enrollment 12345"
7. "Link certificate 12345 to property prp_12345"
8. "Activate property prp_12345 to STAGING"
9. "Check activation status for property prp_12345"
10. "Activate property prp_12345 to PRODUCTION"
11. "Update www.example.com to CNAME www.example.com.edgesuite.net"
```

## Common Issues and Solutions

### Certificate Validation Stuck

If validation doesn't complete:
```
Show me the validation challenges for enrollment 12345
List DNS records in example.com matching _acme-challenge
```

### Activation Failed

Check for errors:
```
Show me the latest activation details for property prp_12345
```

### DNS Not Resolving

Verify nameservers:
```
Get nameserver migration instructions for example.com
```

## Next Steps

Now that you have a basic CDN property running:

1. **Optimize Performance**: [CDN Optimization Guide](./CDN-Management.md#optimization)
2. **Add More Domains**: [Multi-Domain Setup](./Certificate-Management.md#multi-domain)
3. **Configure Caching**: [Cache Configuration](./CDN-Management.md#caching)
4. **Set Up Purging**: [Fast Purge Guide](../modules/Fast-Purge.md)
5. **Monitor Traffic**: [Reporting Guide](../modules/Reporting.md)

## Advanced Scenarios

### Import Existing Site

```
Import DNS zone example.com from Cloudflare with token cf_xxxxx
```

### Use Custom Rules

```
Get the rule tree for property prp_12345
Update property rules for prp_12345 with custom caching for /api/* paths
```

### Multiple Environments

```
Create property example-staging.com for staging environment
Create property example.com for production environment
```

## Getting Help

- Review [Common Errors](../technical-reference/Error-Handling.md)
- Check [FAQ](./FAQ.md)
- Ask in [Discussions](https://github.com/your-org/alecs/discussions)

---

*Congratulations! You've successfully deployed your first CDN property with ALECS.*

*Last Updated: January 2025*