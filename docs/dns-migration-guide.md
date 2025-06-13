# DNS Migration Guide

Complete guide for migrating DNS zones to Akamai Edge DNS using ALECS.

## Table of Contents
- [Migration Methods](#migration-methods)
- [Cloudflare Migration](#cloudflare-migration)
- [Zone File Import](#zone-file-import)
- [AXFR Transfer](#axfr-transfer)
- [Bulk Record Import](#bulk-record-import)
- [Verification](#verification)
- [Nameserver Migration](#nameserver-migration)

## Migration Methods

ALECS supports multiple DNS migration methods:

1. **Cloudflare API Import** - Direct import from Cloudflare
2. **Zone File Import** - Import standard BIND zone files
3. **AXFR Transfer** - Transfer from existing DNS servers
4. **Bulk Record Import** - Import multiple records at once
5. **Manual Creation** - Create records individually

## Cloudflare Migration

### Prerequisites
- Cloudflare API token with DNS read permissions
- Zone ID (optional, auto-detected if not provided)

### Step 1: Import from Cloudflare

```bash
# Basic import (zone must exist in Akamai)
"Import DNS zone example.com from Cloudflare with token cf_xxxxxxxxxxxx"

# With automatic zone creation
"Import DNS zone example.com from Cloudflare with token cf_xxxxxxxxxxxx 
and create zone with contract ctr_C-1234567 and group grp_12345"

# With specific zone ID
"Import DNS zone example.com from Cloudflare with token cf_xxxxxxxxxxxx 
and zone ID 1234567890abcdef"
```

### Step 2: Review Import Results

The import will show:
- Total records found
- Successfully imported records
- Failed records (if any)
- Skipped records (Cloudflare-specific types)

### Step 3: Get Migration Instructions

```bash
"Get nameserver migration instructions for zone example.com"
```

## Zone File Import

### Preparing Your Zone File

Standard BIND format zone file example:

```bind
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
            2024010101 ; Serial
            3600       ; Refresh
            1800       ; Retry
            604800     ; Expire
            86400 )    ; Minimum TTL

; Nameservers
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; A Records
@       IN  A   192.0.2.1
www     IN  A   192.0.2.2
mail    IN  A   192.0.2.3

; CNAME Records
ftp     IN  CNAME   www.example.com.
cdn     IN  CNAME   cdn.cloudflare.net.

; MX Records
@       IN  MX  10  mail.example.com.
@       IN  MX  20  backup.example.com.

; TXT Records
@       IN  TXT "v=spf1 include:_spf.example.com ~all"
_dmarc  IN  TXT "v=DMARC1; p=reject; rua=mailto:dmarc@example.com"
```

### Import Zone File

```bash
# First, create the zone
"Create PRIMARY DNS zone example.com with contract ctr_C-1234567 and group grp_12345"

# Then import the zone file content
"Import zone file for example.com with content:
$TTL 3600
@ IN SOA ns1.example.com. admin.example.com. (
    2024010101 3600 1800 604800 86400)
@ IN A 192.0.2.1
www IN A 192.0.2.2
mail IN A 192.0.2.3
@ IN MX 10 mail.example.com.
@ IN TXT \"v=spf1 include:_spf.example.com ~all\""
```

### Import from File Path

For large zone files, you can reference a file:

```bash
"Parse zone file content for example.com: [paste zone file content]"
```

## AXFR Transfer

### Prerequisites
- Access to authoritative DNS server
- AXFR allowed from your IP
- Optional: TSIG key for authentication

### Basic AXFR Transfer

```bash
# Without authentication
"Import zone example.com via AXFR from ns1.current-dns.com"

# With TSIG authentication
"Import zone example.com via AXFR from ns1.current-dns.com 
with TSIG key transfer-key algorithm hmac-sha256 secret xxxxxxxxxx"

# With zone creation
"Import zone example.com via AXFR from ns1.current-dns.com 
and create zone with contract ctr_C-1234567 and group grp_12345"
```

### Troubleshooting AXFR

If AXFR fails:
1. Verify AXFR is allowed from your IP
2. Check firewall rules (TCP port 53)
3. Confirm zone exists on source server
4. Verify TSIG key if using authentication

## Bulk Record Import

### Prepare Records for Import

```bash
# Format: Array of record objects
"Import bulk records to zone example.com with records:
[
  {\"name\": \"www\", \"type\": \"A\", \"ttl\": 300, \"rdata\": [\"192.0.2.1\"]},
  {\"name\": \"mail\", \"type\": \"A\", \"ttl\": 300, \"rdata\": [\"192.0.2.2\"]},
  {\"name\": \"@\", \"type\": \"MX\", \"ttl\": 3600, \"rdata\": [\"10 mail.example.com.\"]},
  {\"name\": \"@\", \"type\": \"TXT\", \"ttl\": 3600, \"rdata\": [\"v=spf1 include:_spf.example.com ~all\"]}
]"
```

### Validate Before Import

```bash
"Import bulk records to zone example.com with validate only true and records: [...]"
```

## Hidden Change-List Management

All DNS operations in ALECS automatically manage Akamai's change-list workflow:

1. **Automatic Change-List Creation** - Created when you modify records
2. **Batch Operations** - Multiple changes grouped efficiently
3. **Automatic Submission** - Changes submitted after each operation
4. **No Manual Steps** - Change-lists are completely hidden

This means you can perform CRUD operations naturally:

```bash
# These commands handle change-lists automatically
"Create A record www.example.com with IP 192.0.2.1 in zone example.com"
"Update record www.example.com to IP 192.0.2.2 in zone example.com"
"Delete A record old.example.com from zone example.com"
```

## Verification

### Step 1: Verify All Records Imported

```bash
# List all records
"List DNS records in zone example.com"

# Search for specific records
"List DNS records in zone example.com matching www"

# Filter by type
"List DNS records in zone example.com of types A, CNAME"
```

### Step 2: Test Resolution

Before changing nameservers, test using Akamai's nameservers:

```bash
# The nameserver instructions will include test commands like:
dig @ns1-123.akamaidns.net example.com A +short
dig @ns1-123.akamaidns.net example.com MX +short
dig @ns1-123.akamaidns.net example.com TXT +short
```

### Step 3: Compare with Current DNS

```bash
# Current DNS
dig example.com ANY @8.8.8.8

# Akamai DNS
dig example.com ANY @ns1-123.akamaidns.net
```

## Nameserver Migration

### Step 1: Get Migration Instructions

```bash
"Get nameserver migration instructions for zone example.com"
```

This provides:
- Akamai nameservers for your zone
- Current nameservers (if detectable)
- Step-by-step registrar instructions
- Verification commands
- Rollback procedures

### Step 2: Update at Registrar

The instructions include specific steps for popular registrars:
- GoDaddy
- Namecheap
- Cloudflare Registrar
- Route 53
- Generic instructions

### Step 3: Monitor Propagation

DNS propagation typically takes:
- **Local ISPs**: 1-4 hours
- **Global**: 24-48 hours
- **TTL dependent**: Based on previous NS record TTL

Monitor using:
- `dig example.com NS +short`
- Online tools like whatsmydns.net
- Multiple geographic locations

## Migration Workflows

### Workflow 1: Complete Cloudflare Migration

```bash
# 1. Export from Cloudflare
"Import DNS zone example.com from Cloudflare with token cf_xxxxxxxxxxxx"

# 2. Verify import
"List DNS records in zone example.com"

# 3. Add any missing records
"Create CNAME record shop pointing to shopify.com in zone example.com"

# 4. Get nameserver instructions
"Get nameserver migration instructions for zone example.com"

# 5. Update nameservers at registrar
# 6. Monitor propagation
```

### Workflow 2: Gradual Migration with AXFR

```bash
# 1. Create secondary zone first
"Create SECONDARY DNS zone example.com with masters ns1.current.com, ns2.current.com"

# 2. Verify zone transfer
"Get zone example.com"

# 3. Convert to primary
"Convert zone example.com to PRIMARY"

# 4. Update nameservers gradually
# 5. Remove old nameservers after verification
```

### Workflow 3: Manual Migration with Validation

```bash
# 1. Create zone
"Create PRIMARY DNS zone example.com"

# 2. Import critical records first
"Create A record @ with IP 192.0.2.1 in zone example.com"
"Create A record www with IP 192.0.2.2 in zone example.com"
"Create MX record @ with priority 10 pointing to mail.example.com in zone example.com"

# 3. Import remaining records in bulk
"Import bulk records to zone example.com with records: [...]"

# 4. Validate before switching
"List all DNS records in zone example.com"
```

## Best Practices

### 1. **Pre-Migration Checklist**
- [ ] Document current DNS configuration
- [ ] Note current TTL values
- [ ] List all record types in use
- [ ] Identify critical records (MX, A for main services)
- [ ] Plan maintenance window

### 2. **TTL Management**
- Lower TTL values 24-48 hours before migration
- This speeds up propagation during cutover
- Reset to normal values after migration

### 3. **Testing Strategy**
- Test resolution from multiple locations
- Verify all record types (not just A records)
- Check email flow (MX records)
- Test any DNS-based services (SPF, DKIM, etc.)

### 4. **Rollback Plan**
- Keep original nameserver information
- Document original DNS provider access
- Have support contacts ready
- Monitor for issues actively during migration

### 5. **Special Considerations**

**Email Services:**
- Verify MX records
- Check SPF records
- Test DKIM if used
- Monitor mail flow

**CDN/Proxy Services:**
- Update CNAME targets if needed
- Check for provider-specific records
- Verify SSL certificate DNS validation

**Geographic/Round-Robin DNS:**
- Ensure all IPs are imported
- Verify load balancing behavior
- Test from multiple regions

## Troubleshooting

### Import Failures

**Problem**: Some records fail to import
```bash
# Check specific record format
"Get record www.example.com in zone example.com"

# Try manual creation
"Create A record www.example.com with IP 192.0.2.1 and TTL 300 in zone example.com"
```

**Problem**: Zone file parse errors
- Check for syntax errors
- Ensure proper formatting
- Remove unsupported record types
- Verify character encoding (UTF-8)

### Validation Issues

**Problem**: Records don't resolve
```bash
# Check zone status
"Get zone example.com"

# Verify nameservers
"List DNS zones"

# Check specific record
"List records in zone example.com matching problem-record"
```

### Performance Optimization

**Large Zones (>1000 records):**
- Use bulk import for better performance
- Import in batches of 50-100 records
- Monitor API rate limits

**Complex Records:**
- Import simple records first (A, CNAME)
- Add complex records separately (SRV, CAA)
- Verify each type works correctly

## Advanced Features

### Zone Templates

For multiple similar zones:

```bash
# Export a zone as template
"List all records in zone template.com"

# Modify and import to new zones
"Import bulk records to zone newsite.com with records: [modified template records]"
```

### Automated Validation

After import, automatically verify:

```bash
# Create validation checklist
"List records in zone example.com of types A, MX, TXT"

# Compare with expected values
# Flag any discrepancies
```

### Multi-Zone Migration

For organizations with multiple domains:

```bash
# 1. List all zones to migrate
# 2. Create zones in batches
# 3. Import records using appropriate method
# 4. Verify all zones before nameserver updates
# 5. Coordinate nameserver changes
```

## Support and Resources

- **Akamai Edge DNS Documentation**: Official API documentation
- **DNS Record Types**: Supported types and formats
- **Rate Limits**: Respect API limits during large migrations
- **Support Contacts**: Have Akamai support contact ready

## Next Steps

1. Choose your migration method based on source
2. Plan your migration window
3. Execute migration with verification
4. Update nameservers
5. Monitor for 48 hours post-migration