# CRUD Test Guide for DNS and Certificate Operations

## 🎯 Overview

This guide provides comprehensive instructions for running live CRUD (Create, Read, Update, Delete) tests against Akamai's DNS and Certificate APIs to guarantee full functionality.

## ✅ Test Coverage

### DNS Operations
- **Zone Management**
  - ✓ Create primary DNS zone with TSIG authentication
  - ✓ Read zone details and list all zones
  - ✓ Update zone SOA parameters
  - ✓ Delete zone with force option

- **Record Management**
  - ✓ Create records: A, AAAA, CNAME, TXT, MX
  - ✓ Read and list all record types
  - ✓ Update record data and TTL values
  - ✓ Delete individual records

- **Advanced Features**
  - ✓ Bulk record creation
  - ✓ Changelist workflow (create, add changes, submit)
  - ✓ Zone search and filtering
  - ✓ Record validation

### Certificate Operations
- **Enrollment Management**
  - ✓ Create Default DV certificate enrollment
  - ✓ Read enrollment status and details
  - ✓ Update contact information and settings
  - ✓ Monitor certificate lifecycle

- **Validation Process**
  - ✓ Retrieve DNS validation challenges
  - ✓ Check domain validation status
  - ✓ Monitor validation progress
  - ✓ Track certificate issuance

- **Integration Features**
  - ✓ Property Manager integration
  - ✓ Network deployment configuration
  - ✓ Certificate monitoring
  - ✓ Auto-renewal settings

## 🚀 Running the Tests

### Prerequisites

1. **Configure `.edgerc` file** with a testing section:
```ini
[testing]
client_secret = your-client-secret
host = your-host.luna.akamaiapis.net
access_token = your-access-token
client_token = your-client-token
account_switch_key = your-account-key # Optional
```

2. **Update test configuration** in test files:
```typescript
const TEST_CONFIG = {
  customer: 'testing',
  contractId: 'ctr_YOUR_CONTRACT',
  groupId: 'grp_YOUR_GROUP',
  propertyId: 'prp_YOUR_TEST_PROPERTY', // For cert tests
};
```

3. **Ensure you have**:
   - DNS API permissions
   - CPS API permissions
   - A test contract/group
   - DNS zone creation rights

### Run Individual Test Suites

```bash
# Run DNS CRUD tests only
npm run build
npx tsx test-dns-crud-live.ts

# Run Certificate CRUD tests only
npx tsx test-certificate-crud-live.ts

# Run all tests with comprehensive reporting
npx tsx test-all-crud-live.ts
```

### Environment Variables (Optional)

```bash
# Override .edgerc location
export AKAMAI_EDGERC_FILE=/path/to/.edgerc
export AKAMAI_EDGERC_SECTION=testing
```

## 📊 Test Output

### Successful Test Run
```
🚀 Starting DNS CRUD Live Test Suite
Test Zone: test-1703123456789.akamai-lab.com

📝 TEST: Create DNS Zone
✅ Zone created successfully

📝 TEST: Create DNS Records
  Creating A record...
  ✅ A record created
  Creating AAAA record...
  ✅ AAAA record created
  ...

🔍 TEST: Read DNS Zone
  ✅ Zone found in list
  ✅ Zone details retrieved

✅ All DNS CRUD tests completed successfully!
```

### Test Report Summary
```
📊 COMPREHENSIVE TEST REPORT
============================

📈 Summary:
  Total Suites: 2
  ✅ Passed: 2
  ❌ Failed: 0
  ⏱️ Total Duration: 45.32s

🔍 Operation Coverage:
  DNS: 100% (All CRUD operations verified)
  Certificates: 100% (All lifecycle operations tested)

🎉 ALL TESTS PASSED - CRUD OPERATIONS VERIFIED!
✅ The MCP server is ready for production use
```

## ⚠️ Important Notes

### DNS Testing
- Test zones are created with unique timestamps to avoid conflicts
- All test records use RFC-compliant test IP addresses
- Zones are automatically cleaned up after tests
- DNS propagation delays are accounted for

### Certificate Testing
- Certificates **cannot be deleted** via API (only deactivated)
- Test enrollments remain in your account after testing
- DNS validation requires actual DNS record creation
- Property integration tests are simulated to avoid production changes

### Safety Measures
- All tests use dedicated test domains
- Cleanup procedures run even on test failure
- No production resources are modified
- Clear logging of all operations

## 🐛 Troubleshooting

### Common Issues

1. **Permission Errors (403)**
   - Verify API credentials have necessary permissions
   - Check contract/group access rights
   - Ensure account switching is configured if needed

2. **Zone Creation Fails**
   - Verify the test domain is not already in use
   - Check DNS zone creation limits
   - Ensure contract has DNS service

3. **Certificate Validation Issues**
   - DNS records must be publicly resolvable
   - Allow time for DNS propagation
   - Check firewall rules for validation servers

4. **Timeout Errors**
   - Increase delays between operations
   - Check API rate limits
   - Verify network connectivity

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npx tsx test-all-crud-live.ts
```

## 🔒 Security Considerations

- **Never run tests in production** environments
- Use dedicated test contracts/groups
- Rotate test credentials regularly
- Monitor test resource usage
- Clean up test resources promptly

## 📚 Additional Resources

- [Akamai DNS API Documentation](https://techdocs.akamai.com/edge-dns/reference)
- [Akamai CPS API Documentation](https://techdocs.akamai.com/cps/reference)
- [Property Manager API Documentation](https://techdocs.akamai.com/property-mgr/reference)

---

*Last Updated: 2025-06-28*
*CODE KAI Compliant - Snow Leopard Quality Assured*