# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The ALECS team takes security seriously. We appreciate your efforts to responsibly disclose your findings.

### Where to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues via email to: **security@alecs.io**

### What to Include

When reporting a vulnerability, please include:

1. **Description**: Clear description of the vulnerability
2. **Impact**: Potential impact and attack scenarios
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Affected Versions**: Which versions of ALECS are affected
5. **Suggested Fix**: If you have suggestions for fixing the issue

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Assessment**: We'll assess the issue and provide an initial response within 7 days
- **Updates**: We'll keep you informed of our progress
- **Credit**: We'll credit you in the security advisory (unless you prefer to remain anonymous)

## Security Considerations for ALECS

### Credential Management

1. **EdgeRC Files**: 
   - Never commit `.edgerc` files to version control
   - Use appropriate file permissions (600)
   - Rotate credentials regularly

2. **Environment Variables**:
   - Use `EDGERC_SECTION` to specify non-default sections
   - Never log credential values
   - Sanitize error messages

3. **Multi-Customer Setup**:
   - Isolate customer credentials
   - Implement proper access controls
   - Audit credential access

### API Security

1. **Rate Limiting**:
   - Respect Akamai API rate limits
   - Implement exponential backoff
   - Monitor for 429 responses

2. **Input Validation**:
   - Validate all MCP tool inputs
   - Sanitize property names and IDs
   - Prevent injection attacks

3. **Error Handling**:
   - Don't expose internal paths
   - Sanitize Akamai error responses
   - Log security events appropriately

### Docker Security

1. **Container Hardening**:
   - Run as non-root user
   - Minimal base image
   - No unnecessary packages

2. **Secret Management**:
   - Use Docker secrets for credentials
   - Never bake credentials into images
   - Mount `.edgerc` as read-only

## Security Best Practices

### For Users

1. **Credential Security**:
   ```bash
   # Secure your .edgerc file
   chmod 600 ~/.edgerc
   ```

2. **Network Security**:
   - Use HTTPS for all communications
   - Implement network segmentation
   - Monitor for unauthorized access

3. **Access Control**:
   - Use principle of least privilege
   - Audit MCP tool usage
   - Rotate credentials regularly

### For Contributors

1. **Code Security**:
   - Never hardcode credentials
   - Use TypeScript strict mode
   - Implement proper error boundaries

2. **Dependency Security**:
   - Keep dependencies updated
   - Run `npm audit` regularly
   - Review dependency licenses

3. **Testing Security**:
   - Test with mock credentials
   - Include security test cases
   - Validate error handling

## Known Security Considerations

1. **MCP Protocol**: The MCP protocol itself doesn't include authentication. Implement additional security layers as needed.

2. **Akamai API Keys**: These are powerful credentials. Treat them like passwords.

3. **Multi-Customer Mode**: Ensure proper isolation between customer configurations.

## Security Tools

We use the following tools to maintain security:

- **npm audit**: Dependency vulnerability scanning
- **ESLint**: Static code analysis
- **TypeScript**: Type safety
- **Docker Scout**: Container vulnerability scanning

## Disclosure Policy

We follow responsible disclosure practices:

1. Security issues are embargoed until a fix is available
2. We'll coordinate disclosure timing with reporters
3. Security advisories will be published on GitHub

## Contact

For any security-related questions: **security@alecs.io**

For general questions, use GitHub Discussions.