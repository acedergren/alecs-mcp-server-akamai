# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with ALECS.

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Authentication Problems](#authentication-problems)
- [API Errors](#api-errors)
- [Performance Issues](#performance-issues)
- [Debug Mode](#debug-mode)
- [FAQ](#faq)

## Quick Diagnostics

### Health Check
```bash
# Check if ALECS is running
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "version": "1.4.0",
  "uptime": 3600
}
```

### Test Connection
```bash
# Test Akamai API connection
alecs test-connection

# Or via MCP:
"Test Akamai API connectivity"
```

### Check Logs
```bash
# View recent logs
tail -f ~/.alecs/logs/alecs.log

# Search for errors
grep ERROR ~/.alecs/logs/alecs.log | tail -20
```

## Common Issues

### 1. ALECS Won't Start

**Symptom:** Server fails to start or crashes immediately

**Diagnosis:**
```bash
# Check for port conflicts
lsof -i :3000

# Check Node.js version
node --version  # Should be 18+

# Check for missing dependencies
npm list
```

**Solutions:**
- Kill process using port 3000
- Update Node.js: `nvm install 18`
- Reinstall dependencies: `npm install`

### 2. "Cannot find module" Error

**Symptom:** Module not found errors

**Solutions:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Check TypeScript compilation
npm run typecheck
```

### 3. Memory Issues

**Symptom:** Out of memory errors or slow performance

**Solutions:**
```bash
# Increase memory allocation
NODE_OPTIONS="--max-old-space-size=4096" alecs

# Monitor memory usage
ps aux | grep alecs

# Enable garbage collection logs
NODE_OPTIONS="--trace-gc" alecs
```

## Authentication Problems

### 1. "Invalid Credentials" Error

**Symptom:** Authentication fails with Akamai APIs

**Diagnosis:**
```bash
# Check .edgerc file exists
ls -la ~/.edgerc

# Verify permissions
stat ~/.edgerc  # Should be 600

# Test credentials
akamai property list --section default
```

**Solutions:**
- Fix permissions: `chmod 600 ~/.edgerc`
- Verify credentials in Akamai Control Center
- Check credential format:
  ```ini
  [default]
  client_secret = xxx
  host = xxx.luna.akamaiapis.net
  access_token = xxx
  client_token = xxx
  ```

### 2. "Token Invalid or Expired"

**Symptom:** API token authentication fails

**Solutions:**
```bash
# List tokens
alecs token list

# Generate new token
alecs token generate --description "New token"

# Check token in request
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/health
```

### 3. "Permission Denied" Errors

**Symptom:** 403 errors from Akamai APIs

**Diagnosis:**
- Check API permissions in Akamai Control Center
- Verify contract and group IDs
- Check credential scope

**Solutions:**
- Update API client permissions
- Use correct contract/group IDs
- Contact Akamai administrator

## API Errors

### 1. Rate Limiting (429 Errors)

**Symptom:** "Too Many Requests" errors

**Diagnosis:**
```bash
# Check rate limit headers
curl -i -H "Authorization: Bearer TOKEN" http://localhost:3000/jsonrpc

# Look for:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 50
X-RateLimit-Reset: 1234567890
```

**Solutions:**
- Reduce request frequency
- Implement exponential backoff
- Increase rate limits (config)
- Use batch operations

### 2. Timeout Errors

**Symptom:** Operations timing out

**Solutions:**
```bash
# Increase timeout
TIMEOUT=60000 alecs

# For specific operations
{
  "timeout": 60000,
  "propertyId": "prp_123"
}
```

### 3. "Property Not Found" Errors

**Symptom:** 404 errors for resources

**Diagnosis:**
```bash
# List available properties
"List all properties"

# Check property ID format
# Should be: prp_123456
```

**Solutions:**
- Verify resource exists
- Check ID format
- Ensure correct account/contract

## Performance Issues

### 1. Slow Response Times

**Diagnosis:**
```bash
# Enable timing logs
LOG_LEVEL=debug alecs

# Monitor response times
time curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/jsonrpc \
  -d '{"method":"list-properties"}'
```

**Solutions:**
- Enable caching: `CACHE_ENABLED=true`
- Reduce response size with filters
- Use pagination for large results
- Check network latency to Akamai

### 2. High CPU Usage

**Diagnosis:**
```bash
# Monitor CPU
top -p $(pgrep -f alecs)

# Profile CPU usage
NODE_OPTIONS="--inspect" alecs
```

**Solutions:**
- Limit concurrent operations
- Enable request queuing
- Scale horizontally

## Debug Mode

### Enable Verbose Logging

```bash
# Maximum verbosity
LOG_LEVEL=debug alecs

# With timestamps
LOG_TIMESTAMPS=true LOG_LEVEL=debug alecs
```

### Debug Specific Components

```bash
# Debug authentication only
DEBUG=alecs:auth alecs

# Debug Akamai API calls
DEBUG=alecs:api alecs

# Debug everything
DEBUG=alecs:* alecs
```

### Trace HTTP Requests

```bash
# Log all HTTP traffic
NODE_TLS_REJECT_UNAUTHORIZED=0 \
NODE_DEBUG=http,https \
alecs
```

## FAQ

### Q: How do I reset ALECS completely?

```bash
# Stop ALECS
pkill -f alecs

# Clear cache and tokens
rm -rf ~/.alecs/cache
rm -rf .tokens

# Reinstall
npm install -g alecs-mcp-server-akamai
```

### Q: Can I run multiple instances?

Yes, use different ports:
```bash
# Instance 1
PORT=3000 alecs

# Instance 2
PORT=3001 alecs
```

### Q: How do I migrate from v1.x to v2.x?

1. Backup configuration
2. Update: `npm update -g alecs-mcp-server-akamai`
3. Migrate tokens if needed
4. Test thoroughly

### Q: Where are logs stored?

Default locations:
- Development: `./logs/`
- Production: `~/.alecs/logs/`
- Docker: `/var/log/alecs/`

### Q: How do I report bugs?

1. Check existing issues
2. Collect:
   - ALECS version
   - Error messages
   - Logs (sanitized)
   - Steps to reproduce
3. Open issue on GitHub

### Q: Can I use ALECS with proxies?

Yes, configure proxy:
```bash
HTTP_PROXY=http://proxy:8080 \
HTTPS_PROXY=http://proxy:8080 \
alecs
```

## Getting Help

### Resources
- [GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- [Discussions](https://github.com/acedergren/alecs-mcp-server-akamai/discussions)
- [Wiki](https://github.com/acedergren/alecs-mcp-server-akamai/wiki)

### Emergency Support
For critical issues:
1. Check [[Security & Authentication]] for security issues
2. Email security@alecs.io for vulnerabilities
3. Join community discussions

---

Still having issues? [Open a GitHub issue](https://github.com/acedergren/alecs-mcp-server-akamai/issues/new/choose) with debug logs.