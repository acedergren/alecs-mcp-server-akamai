# Troubleshooting ALECS

Common issues and solutions for ALECS MCP Server.

## Installation Issues

### Package Installation Fails

**Problem**: `npm install -g alecs-mcp-server-akamai` fails

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Use Node 18+ 
node --version

# Install with verbose output
npm install -g alecs-mcp-server-akamai --verbose
```

### Missing Dependencies

**Problem**: Command not found or missing modules

**Solutions**:
```bash
# Reinstall with force
npm install -g alecs-mcp-server-akamai --force

# Check global install location
npm list -g --depth=0

# Verify PATH includes npm global bin
echo $PATH
```

## Authentication Issues

### Invalid EdgeGrid Credentials

**Problem**: `401 Unauthorized` or `403 Forbidden` errors

**Solutions**:

1. **Check `.edgerc` format**:
   ```ini
   [default]
   client_secret = your_secret_here
   host = your_host.luna.akamaiapis.net
   access_token = your_token_here
   client_token = your_client_token_here
   ```

2. **Test credentials**:
   ```bash
   # Test basic connectivity
   curl -H "Authorization: EG1-HMAC-SHA256 ..." \
        https://your_host.luna.akamaiapis.net/papi/v1/contracts
   ```

3. **Verify file permissions**:
   ```bash
   chmod 600 ~/.edgerc
   ```

### Customer Context Issues

**Problem**: Customer not found or access denied

**Solutions**:
- Verify customer name in `.edgerc`
- Check if account switching key is correct
- Ensure API client has proper permissions

## MCP Integration Issues

### Claude Desktop Not Detecting ALECS

**Problem**: Tools not available in Claude Desktop

**Solutions**:

1. **Check Claude Desktop config**:
   ```bash
   # macOS location
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Windows location
   ls -la %APPDATA%/Claude/claude_desktop_config.json
   ```

2. **Verify config format**:
   ```json
   {
     "mcpServers": {
       "alecs-akamai": {
         "command": "alecs",
         "args": [],
         "env": {
           "MCP_TRANSPORT": "stdio"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop** after config changes

### Connection Timeouts

**Problem**: Requests timeout or hang

**Solutions**:
```bash
# Check ALECS is running
ps aux | grep alecs

# Test connectivity
alecs --version

# Run with debug output
DEBUG=* alecs

# Check network connectivity
ping your_host.luna.akamaiapis.net
```

## API Errors

### Rate Limiting

**Problem**: `429 Too Many Requests`

**Solutions**:
- Wait 60 seconds before retrying
- Implement request batching
- Contact Akamai to increase rate limits

### Property Not Found

**Problem**: `404 Property not found`

**Solutions**:
- Verify property ID format (`prp_123456`)
- Check customer context
- Ensure property exists in specified account

### Activation Failures

**Problem**: Activations fail or get stuck

**Solutions**:
```bash
# Check activation status
# Via ALECS: "Check activation status for property-name"

# Verify network (staging vs production)
# Ensure property has valid configuration
# Check for validation errors
```

## Transport Issues

### WebSocket Connection Fails

**Problem**: WebSocket transport not working

**Solutions**:
```bash
# Try different transport
export MCP_TRANSPORT=stdio

# Check port availability
netstat -an | grep 8080

# Test with curl
curl -H "Upgrade: websocket" http://localhost:8080/mcp
```

### CORS Errors in Browser

**Problem**: CORS errors when using HTTP transport

**Solutions**:
```bash
# Enable CORS
export CORS_ENABLED=true

# Set specific origins
export CORS_ORIGINS="https://your-domain.com"

# Use streamable-http transport
export MCP_TRANSPORT=streamable-http
```

## Performance Issues

### Slow Response Times

**Problem**: API calls take too long

**Solutions**:
- Check network latency to Akamai
- Enable caching: `export CACHE_ENABLED=true`
- Use batch operations when possible
- Monitor memory usage

### Memory Leaks

**Problem**: ALECS memory usage grows over time

**Solutions**:
```bash
# Monitor memory
top -p $(pgrep alecs)

# Restart service periodically
# Clear cache: "Clear all caches"

# Update to latest version
npm update -g alecs-mcp-server-akamai
```

## Debugging

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Enable all debugging
export DEBUG=*

# ALECS-specific debugging
export DEBUG=alecs:*

# Save logs to file
alecs 2>&1 | tee alecs.log
```

### Common Log Locations

```bash
# System logs
tail -f /var/log/system.log

# ALECS logs (if configured)
tail -f ~/.alecs/logs/alecs.log

# NPM logs
npm config get cache
ls -la $(npm config get cache)/_logs/
```

## Getting Help

### Before Reporting Issues

1. **Check versions**:
   ```bash
   node --version      # Should be 18+
   npm --version       # Should be 8+
   alecs --version     # Latest version
   ```

2. **Collect debug info**:
   ```bash
   # Environment info
   env | grep -E "(NODE|NPM|ALECS|MCP)"
   
   # Test basic functionality
   alecs --test-auth
   ```

3. **Minimal reproduction**:
   - Clear steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs

### Support Channels

- **GitHub Issues**: [Report bugs](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- **Discussions**: [Ask questions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions)
- **Akamai Support**: For API-specific issues

### Useful Commands for Support

```bash
# System information
uname -a
node --version
npm --version

# ALECS diagnostics
alecs --diagnostic
alecs --test-connectivity

# Network diagnostics
nslookup your_host.luna.akamaiapis.net
traceroute your_host.luna.akamaiapis.net
```

## FAQ

**Q: Can I use ALECS with multiple Akamai accounts?**
A: Yes, configure multiple sections in `.edgerc` and use the `customer` parameter.

**Q: Does ALECS work with all Akamai products?**
A: ALECS supports Property Manager, Edge DNS, CPS, Network Lists, Fast Purge, and AppSec. More products coming soon.

**Q: Can I run ALECS in production?**
A: Yes, ALECS is production-ready. Use Docker or PM2 for deployment.

**Q: How do I update ALECS?**
A: `npm update -g alecs-mcp-server-akamai` or use your preferred package manager.

**Q: Is ALECS officially supported by Akamai?**
A: ALECS is a community project. For official support, use Akamai's APIs directly.