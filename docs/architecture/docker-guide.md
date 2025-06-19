# Docker Guide for ALECS

This guide covers running ALECS MCP Server in Docker containers.

## Quick Start

### Prerequisites
- Docker installed
- Docker Compose (optional)
- `.edgerc` file with Akamai credentials

### Run with Docker

```bash
# Build the image
docker build -t alecs-mcp-server-akamai .

# Run the container
docker run -it --rm \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

### Run with Docker Compose

```bash
# Start the service
docker-compose up alecs

# Run in background
docker-compose up -d alecs

# View logs
docker-compose logs -f alecs

# Stop the service
docker-compose down
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EDGERC_PATH` | Path to .edgerc file | `/home/alecs/.edgerc` |
| `DEFAULT_CUSTOMER` | Default customer section | `default` |
| `DEBUG` | Enable debug logging | `0` |

### Volume Mounts

#### Required: .edgerc File

```bash
# Mount from home directory
-v ~/.edgerc:/home/alecs/.edgerc:ro

# Mount from custom location
-v /path/to/.edgerc:/home/alecs/.edgerc:ro
```

#### Optional: Custom Configuration

```bash
# Mount entire .akamai directory
-v ~/.akamai:/home/alecs/.akamai:ro
```

## Docker Compose Services

### Production Service

```yaml
docker-compose up alecs
```

Features:
- Optimized image size
- Non-root user
- Resource limits
- Automatic restart

### Development Service

```yaml
docker-compose up alecs-dev
```

Features:
- Hot reload
- Source code mounting
- Development tools
- Debug logging

### Test Service

```yaml
docker-compose up alecs-test
```

Features:
- Runs test suite
- Coverage reports
- CI/CD ready

## Integration with Claude Desktop

### macOS/Linux

1. Create a wrapper script:

```bash
cat > ~/bin/alecs-docker << 'EOF'
#!/bin/bash
docker run -i --rm \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
EOF

chmod +x ~/bin/alecs-docker
```

2. Update Claude Desktop config:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "/Users/username/bin/alecs-docker",
      "args": [],
      "env": {}
    }
  }
}
```

### Windows

1. Create a batch file `alecs-docker.bat`:

```batch
@echo off
docker run -i --rm ^
  -v %USERPROFILE%\.edgerc:/home/alecs/.edgerc:ro ^
  alecs-mcp-server-akamai
```

2. Update Claude Desktop config:

```json
{
  "mcpServers": {
    "alecs": {
      "command": "C:\\path\\to\\alecs-docker.bat",
      "args": [],
      "env": {}
    }
  }
}
```

## Building Images

### Production Build

```bash
# Build production image
docker build -t alecs-mcp-server-akamai:latest .

# Build with specific version
docker build -t alecs-mcp-server-akamai:1.0.0 .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 \
  -t alecs-mcp-server-akamai:latest .
```

### Development Build

```bash
# Build development image
docker build -f Dockerfile.dev -t alecs-mcp-server-akamai:dev .
```

## Running Different Configurations

### With Custom .edgerc Location

```bash
docker run -it --rm \
  -e EDGERC_PATH=/custom/.edgerc \
  -v /path/to/custom/.edgerc:/custom/.edgerc:ro \
  alecs-mcp-server-akamai
```

### With Specific Customer

```bash
docker run -it --rm \
  -e DEFAULT_CUSTOMER=production \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

### With Debug Logging

```bash
docker run -it --rm \
  -e DEBUG=1 \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

## Security Considerations

### Non-Root User

The container runs as user `alecs` (UID 1001) for security:
- Cannot modify system files
- Limited permissions
- Follows security best practices

### Read-Only Mounts

Mount sensitive files as read-only:
```bash
-v ~/.edgerc:/home/alecs/.edgerc:ro
```

### Resource Limits

Docker Compose sets resource limits:
- CPU: 1 core max, 0.5 core reserved
- Memory: 512MB max, 256MB reserved

## Troubleshooting

### Container Exits Immediately

Check if .edgerc is mounted:
```bash
docker run -it --rm \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai ls -la /home/alecs/.edgerc
```

### Permission Denied

Ensure .edgerc is readable:
```bash
chmod 644 ~/.edgerc
```

### Cannot Find .edgerc

Check the mount path:
```bash
# Verify local file exists
ls -la ~/.edgerc

# Test with absolute path
docker run -it --rm \
  -v /Users/username/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

### Debug Mode

Enable debug output:
```bash
docker run -it --rm \
  -e DEBUG=1 \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

## Advanced Usage

### Custom Entrypoint

Override for debugging:
```bash
docker run -it --rm \
  --entrypoint /bin/sh \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

### Network Isolation

Create isolated network:
```bash
docker network create alecs-net
docker run -it --rm \
  --network alecs-net \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

### Volume Persistence

For logs or state:
```bash
docker volume create alecs-data
docker run -it --rm \
  -v alecs-data:/app/data \
  -v ~/.edgerc:/home/alecs/.edgerc:ro \
  alecs-mcp-server-akamai
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run ALECS Tests
  run: |
    docker build -t alecs-test .
    docker run --rm alecs-test npm test
```

### GitLab CI

```yaml
test:
  script:
    - docker build -t alecs-test .
    - docker run --rm alecs-test npm test
```

## Maintenance

### Cleanup

```bash
# Remove containers
docker-compose down

# Remove images
docker rmi alecs-mcp-server-akamai:latest
docker rmi alecs-mcp-server-akamai:dev

# Remove volumes
docker volume prune
```

### Updates

```bash
# Pull latest code
git pull

# Rebuild images
docker-compose build

# Restart services
docker-compose up -d
```

## Best Practices

1. **Always mount .edgerc as read-only**
2. **Use specific image tags in production**
3. **Set resource limits**
4. **Enable health checks for production**
5. **Use Docker secrets for sensitive data**
6. **Regular security updates**

## Next Steps

- Configure Claude Desktop to use Docker
- Set up automated builds
- Deploy to container orchestration platform
- Monitor container health