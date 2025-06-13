# Multi-Customer Usage Examples

## How account-switch-key Works

The Akamai MCP server now supports multi-customer configurations through the `.edgerc` file. Here's how it works:

### 1. Configure .edgerc with Multiple Customers

Each customer gets their own section in your `~/.edgerc` file:

```ini
# Default account (your primary account)
[default]
client_secret = xxxx
host = akaa-xxxx.luna.akamaiapis.net
access_token = akab-xxxx
client_token = akab-xxxx

# Customer account with account switching
[customer-acme]
client_secret = yyyy
host = akaa-yyyy.luna.akamaiapis.net
access_token = akab-yyyy
client_token = akab-yyyy
account-switch-key = ABC-123456

# Another customer account
[customer-globex]
client_secret = zzzz
host = akaa-zzzz.luna.akamaiapis.net
access_token = akab-zzzz
client_token = akab-zzzz
account-switch-key = DEF-789012
```

### 2. Using the MCP Tools with Different Customers

The MCP server automatically reads the `account-switch-key` from the .edgerc file when you specify a customer section.

#### List properties for default account:
```json
{
  "tool": "list_properties",
  "arguments": {}
}
```

#### List properties for a specific customer:
```json
{
  "tool": "list_properties",
  "arguments": {
    "customer": "customer-acme"
  }
}
```

#### Create property for a customer account:
```json
{
  "tool": "create_property",
  "arguments": {
    "customer": "customer-globex",
    "propertyName": "globex-website",
    "productId": "prd_Web_Accel",
    "contractId": "ctr_C-1234567",
    "groupId": "grp_123456"
  }
}
```

### 3. How It Works Internally

1. When you specify a `customer` parameter, the MCP server:
   - Creates an AkamaiClient instance for that specific section
   - Reads the credentials from that section in .edgerc
   - Automatically extracts the `account-switch-key` if present
   - Uses the account-switch-key as a query parameter (`accountSwitchKey`) in all API calls

2. The account-switch-key is passed to all Akamai API endpoints as a query parameter, allowing you to manage resources in the customer's account while using your own API credentials.

3. Each customer section maintains its own client instance, so switching between customers is seamless.

### 4. Benefits

- **Single .edgerc file**: Manage all customer credentials in one place
- **Automatic account switching**: No need to manually handle account-switch-keys
- **Customer isolation**: Each customer uses separate API credentials and account context
- **Backwards compatible**: If no customer is specified, uses the default section

### 5. Troubleshooting

If account switching isn't working:

1. Check that the `account-switch-key` is correctly formatted in .edgerc
2. Verify you have permission to switch to that account
3. Check the console output - the MCP server logs when it finds an account-switch-key
4. Ensure the API credentials in that section are valid

### 6. Example Claude Prompts

When using Claude with this MCP server:

- "List all properties for customer-acme"
- "Show me the CDN configuration for customer-globex"  
- "Create a new property called 'api-gateway' for customer-acme in group grp_123456"
- "List all properties" (uses default account)