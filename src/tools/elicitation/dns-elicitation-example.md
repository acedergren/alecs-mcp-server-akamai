# DNS Elicitation Tool - Usage Examples

The DNS Elicitation Tool provides a guided, user-friendly experience for managing DNS records. It asks clear questions and provides helpful feedback throughout the process.

## Getting Started

To begin, simply call the tool without any parameters to see available operations:

```json
{
  "tool": "dns-elicitation"
}
```

## Common Scenarios

### 1. Creating an A Record

The tool will guide you step by step:

```json
// Step 1: Specify operation
{
  "tool": "dns-elicitation",
  "operation": "create"
}

// Step 2: Add zone
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com"
}

// Step 3: Add record name
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com",
  "recordName": "www"
}

// Step 4: Add record type
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com",
  "recordName": "www",
  "recordType": "A"
}

// Step 5: Add record value
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com",
  "recordName": "www",
  "recordType": "A",
  "recordValue": "192.0.2.1"
}

// Step 6: Confirm action
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com",
  "recordName": "www",
  "recordType": "A",
  "recordValue": "192.0.2.1",
  "confirmAction": true
}
```

### 2. Setting Up Email (MX Records)

```json
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com",
  "recordName": "@",
  "recordType": "MX",
  "recordValue": "mail.example.com",
  "priority": 10,
  "confirmAction": true
}
```

### 3. Adding TXT Records for Email Security

```json
{
  "tool": "dns-elicitation",
  "operation": "create",
  "zone": "example.com",
  "recordName": "@",
  "recordType": "TXT",
  "recordValue": "v=spf1 include:_spf.google.com ~all",
  "confirmAction": true
}
```

### 4. Checking DNS Status

```json
{
  "tool": "dns-elicitation",
  "operation": "check-status",
  "zone": "example.com"
}
```

### 5. Listing All Records

```json
{
  "tool": "dns-elicitation",
  "operation": "list",
  "zone": "example.com"
}
```

### 6. Deleting a Record

```json
{
  "tool": "dns-elicitation",
  "operation": "delete",
  "zone": "example.com",
  "recordName": "old-subdomain",
  "recordType": "A",
  "confirmAction": true
}
```

## Key Features

1. **Guided Experience**: If you omit required fields, the tool will ask for them with clear explanations
2. **Validation**: The tool validates inputs (e.g., zone format) and provides helpful error messages
3. **Safety Checks**: Destructive operations require explicit confirmation
4. **Status Updates**: Clear feedback about what's happening at each stage
5. **Next Steps**: After operations, the tool suggests what to do next

## Handling Pending Changes

If there are existing pending changes, the tool will:
1. Inform you about the pending changes
2. Suggest checking the status
3. Allow you to force new changes if needed

## Error Handling

The tool provides user-friendly error messages:
- Invalid zone format: Clear explanation of correct format
- Missing permissions: Guidance on access requirements
- Pending changes: Options for handling existing changelists