# LLM Compatibility Guide

This guide verifies that all ALECS functionality can be handled through natural language input from an LLM.

## Overview

ALECS is designed to be fully controllable through natural language commands. Every feature has been optimized for LLM interaction with:

- Clear, descriptive tool names
- Natural language parameter descriptions
- Flexible input handling
- Helpful error messages
- Guided workflows

## Verified LLM Commands

### Property Management ✅

**Natural Language Support:**
```
"List all my CDN properties"
"Show me properties in group grp_12345"
"Get details for property prp_12345"
"Create a new property called www.example.com"
```

**LLM-Friendly Features:**
- Automatic ID detection (finds property IDs from context)
- Smart defaults (latest version, default customer)
- Clear next steps in responses
- Error suggestions

### DNS Management ✅

**Natural Language Support:**
```
"List all DNS zones"
"Create a new DNS zone for example.com"
"Add an A record for www pointing to 192.0.2.1"
"Delete the old mail server record"
"Show all records in example.com zone"
```

**LLM-Friendly Features:**
- Automatic zone detection from domain names
- Record type inference
- TTL defaults
- Hidden change-list complexity

### Certificate Management ✅

**Natural Language Support:**
```
"Create a DV certificate for www.example.com"
"Add additional domains api.example.com and cdn.example.com to the certificate"
"Check if my certificate is validated"
"Create the DNS validation records automatically"
```

**LLM-Friendly Features:**
- Contact information formatting
- Automatic Enhanced TLS selection
- Progress monitoring
- Automated DNS validation

### DNS Migration ✅

**Natural Language Support:**
```
"Import DNS from Cloudflare for example.com"
"Parse this zone file and import it"
"Transfer zone via AXFR from ns1.oldprovider.com"
"Show me how to update nameservers at GoDaddy"
```

**LLM-Friendly Features:**
- Provider detection
- Automatic zone creation options
- Progress tracking
- Step-by-step instructions

## Complex Workflow Examples

### Complete CDN Setup with HTTPS

LLM can guide through entire workflow:

```
User: "I need to set up www.shop.com with HTTPS on Akamai"

LLM: "I'll help you set up www.shop.com with HTTPS. Let me start by checking your available groups and contracts."
[Executes: list_groups]

LLM: "I see you have group grp_12345. Now I'll create the property."
[Executes: create_property with parameters parsed from context]

LLM: "Property created! Now let's set up the SSL certificate. Who should be the admin contact?"

User: "John Doe, john@shop.com, 555-1234"

LLM: "Creating the DV certificate now."
[Executes: create_dv_enrollment with parsed contact info]

LLM: "Certificate enrollment created. Let me automatically create the DNS validation records."
[Executes: create_acme_validation_records]

[Continues through complete workflow...]
```

### DNS Migration from Cloudflare

```
User: "Migrate example.com from Cloudflare to Akamai"

LLM: "I'll help you migrate example.com from Cloudflare. Do you have your Cloudflare API token?"

User: "Yes, it's cf_xxxxxxxxxxxx"

LLM: "Perfect! I'll import the DNS zone now. Should I create the zone in Akamai first?"
[Executes: import_from_cloudflare with appropriate parameters]

LLM: "Successfully imported 47 records. Here's what was migrated:
- 15 A records
- 8 CNAME records
- 3 MX records
...

Now I'll generate the nameserver migration instructions for you."
[Executes: get_nameserver_instructions]
```

## Parameter Handling

### Flexible Input Recognition

ALECS handles various natural language patterns:

**IP Addresses:**
- "192.0.2.1" ✅
- "the IP 192.0.2.1" ✅
- "point it to 192.0.2.1" ✅

**Domain Names:**
- "www.example.com" ✅
- "for domain www.example.com" ✅
- "the website www.example.com" ✅

**IDs:**
- "prp_12345" ✅
- "property prp_12345" ✅
- "property ID prp_12345" ✅

**Boolean Values:**
- "yes" → true ✅
- "enable" → true ✅
- "no" → false ✅
- "disable" → false ✅

### Contact Information Parsing

LLM can parse various contact formats:

```
"John Doe, john@example.com, 555-1234"
"John Doe (john@example.com) at 555-1234"
"Contact: John Doe, Email: john@example.com, Phone: 555-1234"
```

All parsed correctly into structured format.

### Multi-line Input

LLM can handle complex multi-line inputs:

```
"Import these DNS records:
www A 192.0.2.1
mail A 192.0.2.2
@ MX 10 mail.example.com"
```

## Error Handling for LLMs

### Helpful Error Messages

All errors include:
1. What went wrong
2. Why it happened
3. How to fix it
4. Example of correct usage

Example:
```
Error: Zone example.com not found

This zone doesn't exist in your account. To create it:
"Create PRIMARY DNS zone example.com with contract ctr_C-1234567 and group grp_12345"

Or import it from another provider:
"Import DNS zone example.com from Cloudflare with token cf_xxxx"
```

### Validation Feedback

Clear validation messages:
```
"Invalid IP address format. Please use format like 192.0.2.1"
"Certificate enrollment 12345 not found. List all certificates with: List certificate enrollments"
"TTL must be a number in seconds (e.g., 300 for 5 minutes)"
```

## Workflow Optimization

### Intelligent Defaults

- Latest version used automatically
- Default customer selection
- Common TTL values (300 for validation, 3600 for normal)
- Enhanced TLS by default for certificates

### Context Awareness

LLM can maintain context across commands:
```
"Create property www.example.com" 
[Returns: Created property prp_12345]

"Now create a certificate for it"
[LLM knows to use www.example.com from context]

"Activate it to staging"
[LLM knows to use prp_12345 from context]
```

### Progress Indicators

All long operations show progress:
- Property activation: Shows zones deploying
- Certificate validation: Shows domain validation status
- DNS import: Shows record count progress

## Best Practices for LLM Integration

### 1. Use Natural Language

Instead of:
```
execute: create_property args: {propertyName: "www.example.com", productId: "prd_Web_Accel"}
```

Use:
```
"Create a new CDN property for www.example.com using Web Accelerator product"
```

### 2. Ask for Clarification

LLM should ask when needed:
```
User: "Create a certificate"
LLM: "I'll help you create a certificate. What domain should it be for?"
```

### 3. Provide Options

When multiple choices exist:
```
LLM: "I found 3 properties. Which one would you like to activate?
1. www.example.com (prp_12345)
2. api.example.com (prp_12346)
3. cdn.example.com (prp_12347)"
```

### 4. Confirm Dangerous Operations

Before production changes:
```
LLM: "You're about to activate property prp_12345 to PRODUCTION. This will affect live traffic. Should I proceed?"
```

## Testing LLM Compatibility

### Test Commands

All these natural language commands work:

✅ "Show me all my Akamai properties"
✅ "Create a new website configuration for shop.example.com"
✅ "Set up HTTPS for www.example.com"
✅ "Import DNS records from Cloudflare"
✅ "Check if my certificate is ready"
✅ "Add www.example.com to property prp_12345"
✅ "Deploy the changes to staging"
✅ "Create an A record pointing to 192.0.2.1"
✅ "Migrate example.com DNS from my current provider"
✅ "Show me the nameservers for example.com"

### Edge Cases Handled

✅ Missing parameters - Asks for them
✅ Invalid values - Provides format help
✅ Multiple matches - Shows options
✅ Long operations - Shows progress
✅ Errors - Explains solutions

## Conclusion

ALECS is fully compatible with LLM interaction. Every feature can be accessed through natural language commands, making it ideal for AI-assisted infrastructure management. The system handles:

- Natural language parsing
- Context maintenance
- Progress tracking
- Error guidance
- Workflow automation

This design ensures that LLMs can effectively manage Akamai infrastructure without requiring users to understand API specifics or complex parameters.