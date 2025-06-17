# Customer Experience Quality Assurance Testing

This directory contains comprehensive customer experience testing focused on real user scenarios, measuring time-to-value, and ensuring high-quality interactions with the Akamai MCP server.

## 📋 Test Suites

### 1. Customer Personas (`personas/customer-scenarios.js`)
Tests real-world scenarios for different customer types:

- **Enterprise Customer**: Complex multi-domain setups, SSL certificates, WAF policies, content purging at scale
- **Solo Developer**: Simple domain setup, one-click onboarding, minimal configuration
- **Partner/Reseller**: Multi-customer management, bulk operations, white-label configuration

**Metrics Tracked:**
- Time to first success
- Time to production deployment
- Error count
- Help requests
- Completion rate

### 2. User Experience (`ux/interaction-testing.js`)
Evaluates the quality of system responses and user guidance:

- **Response Clarity**: Actionable information, clear language, good structure
- **Error Messages**: Helpful guidance, next steps, documentation links
- **Progress Indication**: Long operation feedback, time estimates, status updates
- **Next Steps**: Clear guidance after each action
- **Documentation**: Relevant links, valid URLs, contextual help
- **Success Confirmation**: Clear success indicators, identifiers, celebration

**Scoring System:**
- Each category scored 0-100
- Overall UX grade (A+ to D)
- Specific recommendations for improvement

### 3. End-to-End Workflows (`integration/end-to-end.js`)
Tests complete customer workflows:

1. **Complete Domain Setup**: DNS + CDN + SSL configuration
2. **Security Deployment**: WAF policies, rate limiting, bot management
3. **Content Lifecycle**: Upload, purge, prefetch, cache management
4. **Certificate Renewal**: Automated renewal process
5. **Performance Optimization**: HTTP/2, adaptive acceleration, caching
6. **Incident Response**: DDoS mitigation, emergency procedures

**Metrics:**
- Steps completed
- Total duration
- Errors encountered
- Workflow success rate

### 4. Support Simulation (`support/troubleshooting.js`)
Tests customer support scenarios:

- **Common Questions**: Setup, troubleshooting, performance, security
- **Debugging Scenarios**: Property activation, DNS, caching, SSL issues
- **Error Reproduction**: Systematic approaches to reproduce customer issues
- **Knowledge Base**: Article relevance, accuracy, link validation
- **Escalation Procedures**: SLA adherence, escalation paths

**Support Metrics:**
- Average resolution time
- Escalation rate
- Knowledge base hit rate
- Customer satisfaction score
- Debug information quality

## 🚀 Running the Tests

### Run All Tests
```bash
# From the tests directory
node run-customer-experience-tests.js

# Or make it executable
chmod +x run-customer-experience-tests.js
./run-customer-experience-tests.js
```

### Run Individual Test Suites
```bash
# Customer Personas
node personas/customer-scenarios.js

# User Experience
node ux/interaction-testing.js

# End-to-End Workflows
node integration/end-to-end.js

# Support Simulation
node support/troubleshooting.js
```

## 📊 Test Reports

Test results are automatically saved to `tests/reports/` with detailed metrics:

- Overall pass rate
- Execution times
- Key findings
- Recommendations
- Detailed results per test suite

Report format: `cx-test-report-YYYY-MM-DD.json`

## 🎯 Success Criteria

### Time-to-Value Metrics
- **Enterprise**: < 30 minutes to production
- **Solo Developer**: < 10 minutes to first success
- **Partner**: < 5 minutes per customer setup

### Quality Metrics
- **UX Score**: > 80/100
- **Support Resolution**: < 5 minutes average
- **Workflow Success Rate**: > 95%
- **Error Message Helpfulness**: > 70/100

### Customer Satisfaction
- **Completion Rate**: > 90%
- **Help Requests**: < 2 per workflow
- **Escalation Rate**: < 10%
- **Knowledge Base Hit Rate**: > 80%

## 🔧 Configuration

### Environment Variables
```bash
# Test environment
export NODE_ENV=test

# Customer context (uses 'testing' section in .edgerc)
export MCP_TEST_CUSTOMER=testing

# Verbose output
export MCP_TEST_VERBOSE=true
```

### Test Data
Test data is anonymized and uses the 'testing' customer context configured in `.edgerc`. Ensure this section exists with appropriate test credentials.

## 📝 Adding New Tests

1. **New Persona**: Add to `personas/customer-scenarios.js`
2. **New UX Criteria**: Add to `ux/interaction-testing.js`
3. **New Workflow**: Add to `integration/end-to-end.js`
4. **New Support Scenario**: Add to `support/troubleshooting.js`

Follow the existing patterns and ensure metrics are tracked consistently.

## 🐛 Troubleshooting

### Common Issues

1. **Server startup timeout**
   - Ensure MCP server is built: `npm run build`
   - Check server logs for errors

2. **Test failures**
   - Verify test customer configuration in `.edgerc`
   - Check network connectivity
   - Review error logs in test output

3. **Slow test execution**
   - Some workflows simulate real operations and take time
   - Use individual test runners for faster feedback

## 📈 Continuous Improvement

1. **Regular Reviews**: Run tests weekly to track improvements
2. **Metric Tracking**: Monitor trends in customer experience metrics
3. **Feedback Loop**: Incorporate real customer feedback into test scenarios
4. **Test Updates**: Keep scenarios current with product changes

## 🤝 Contributing

When adding or modifying tests:

1. Ensure tests represent real customer scenarios
2. Track meaningful metrics
3. Provide clear success/failure criteria
4. Document expected outcomes
5. Include helpful error messages in assertions

---

For questions or issues, contact the development team or refer to the main project documentation.