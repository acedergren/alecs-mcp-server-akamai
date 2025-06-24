# Customer Section Override Feature

By default, ALECS uses the EdgeRC section selected at server startup for all operations. This ensures consistent authentication throughout your session.

## Default Behavior

- Server uses the `default` section from `.edgerc` unless specified at startup
- All tool operations use the same section selected at startup
- The `customer` parameter in tool calls is ignored

## Enabling Customer Override

To enable per-tool customer section override, set the environment variable:

```bash
export ALECS_ENABLE_CUSTOMER_OVERRIDE=true
```

Or start the server with:

```bash
ALECS_ENABLE_CUSTOMER_OVERRIDE=true npm start
```

## When Customer Override is Enabled

When enabled, each tool call can specify a different EdgeRC section:

```json
{
  "tool": "list-properties",
  "arguments": {
    "customer": "production",  // Uses [production] section from .edgerc
    "limit": 10
  }
}
```

## Security Considerations

- Customer override is disabled by default for security
- When enabled, ensure all EdgeRC sections are properly secured
- Consider the security implications of allowing runtime section switching

## Other Configuration Options

```bash
# Enable property cache (default: true when Valkey/Redis available)
ALECS_ENABLE_PROPERTY_CACHE=true

# Enable verbose logging (default: false)
ALECS_VERBOSE=true

# Set default customer section (default: "default")
ALECS_CUSTOMER_SECTION=production
```

## Example .edgerc File

```ini
[default]
client_secret = xxx
host = akaa-xxx.luna.akamaiapis.net
access_token = akab-xxx
client_token = akab-xxx

[production]
client_secret = yyy
host = akaa-yyy.luna.akamaiapis.net
access_token = akab-yyy
client_token = akab-yyy
account-switch-key = ABC-123

[staging]
client_secret = zzz
host = akaa-zzz.luna.akamaiapis.net
access_token = akab-zzz
client_token = akab-zzz
```