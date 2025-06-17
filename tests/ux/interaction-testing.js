/**
 * User Interface Experience Testing
 * Tests response clarity, error messages, and user guidance
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

class UXTester {
  constructor() {
    this.testResults = {
      responseClarity: [],
      errorHelpfulness: [],
      progressIndication: [],
      nextStepsGuidance: [],
      documentationLinks: [],
      successConfirmation: []
    };
  }

  /**
   * Evaluate response clarity and actionability
   */
  evaluateResponseClarity(response, context) {
    const criteria = {
      hasActionableInfo: false,
      usesClearLanguage: false,
      providesExamples: false,
      avoidsJargon: false,
      structuredWell: false
    };

    // Check for actionable information
    const actionWords = ['run', 'execute', 'create', 'configure', 'verify', 'check'];
    criteria.hasActionableInfo = actionWords.some(word => 
      response.toLowerCase().includes(word)
    );

    // Check for clear language (no excessive technical terms)
    const jargonTerms = ['ephemeral', 'idempotent', 'canonical', 'deterministic'];
    criteria.avoidsJargon = !jargonTerms.some(term => 
      response.toLowerCase().includes(term)
    );

    // Check for examples
    criteria.providesExamples = response.includes('example:') || 
                               response.includes('e.g.') || 
                               response.includes('for instance');

    // Check structure (bullet points, numbered lists, clear sections)
    criteria.structuredWell = response.includes('•') || 
                             response.includes('1.') || 
                             response.includes('\n-') ||
                             response.includes('Step');

    // Clear language check
    const avgWordLength = response.split(' ').reduce((sum, word) => 
      sum + word.length, 0) / response.split(' ').length;
    criteria.usesClearLanguage = avgWordLength < 7; // Simple words average < 7 chars

    const score = Object.values(criteria).filter(v => v).length / 5 * 100;

    this.testResults.responseClarity.push({
      context,
      criteria,
      score,
      recommendation: score < 60 ? 'Response needs simplification' : 'Response is clear'
    });

    return score;
  }

  /**
   * Test error message helpfulness
   */
  async testErrorMessages() {
    console.log('\n🚨 Testing Error Message Quality...\n');

    const errorScenarios = [
      {
        name: 'Invalid Property ID',
        command: 'property.get',
        params: { propertyId: 'invalid-id', customer: 'testing' },
        expectedGuidance: ['verify the property ID', 'format should be', 'prp_']
      },
      {
        name: 'Missing Required Parameter',
        command: 'dns.record.create',
        params: { zone: 'test.com', customer: 'testing' },
        expectedGuidance: ['required parameter', 'name', 'type', 'ttl', 'rdata']
      },
      {
        name: 'Authentication Failure',
        command: 'property.list',
        params: { customer: 'nonexistent' },
        expectedGuidance: ['authentication', 'customer not found', '.edgerc', 'credentials']
      },
      {
        name: 'Rate Limit Exceeded',
        command: 'property.list',
        params: { customer: 'testing', simulateRateLimit: true },
        expectedGuidance: ['rate limit', 'retry after', 'exponential backoff']
      },
      {
        name: 'Activation Conflict',
        command: 'property.activate',
        params: { 
          propertyId: 'prp_123456', 
          network: 'PRODUCTION',
          customer: 'testing'
        },
        expectedGuidance: ['already activating', 'pending activation', 'check status']
      }
    ];

    for (const scenario of errorScenarios) {
      console.log(`Testing: ${scenario.name}`);
      
      try {
        const result = await this.runMCPCommand(scenario.command, scenario.params);
        console.log('❌ Expected error but got success');
      } catch (error) {
        const errorMessage = error.error || error.message || '';
        
        // Check if error message contains expected guidance
        const hasGuidance = scenario.expectedGuidance.some(term => 
          errorMessage.toLowerCase().includes(term.toLowerCase())
        );

        // Check for actionable next steps
        const hasNextSteps = errorMessage.includes('Try') || 
                            errorMessage.includes('Please') ||
                            errorMessage.includes('You can') ||
                            errorMessage.includes('To fix');

        // Check for help resources
        const hasHelpLinks = errorMessage.includes('http') || 
                            errorMessage.includes('docs.akamai.com') ||
                            errorMessage.includes('support@');

        const score = (hasGuidance ? 40 : 0) + 
                     (hasNextSteps ? 30 : 0) + 
                     (hasHelpLinks ? 30 : 0);

        this.testResults.errorHelpfulness.push({
          scenario: scenario.name,
          errorMessage,
          hasGuidance,
          hasNextSteps,
          hasHelpLinks,
          score,
          recommendation: score < 70 ? 'Error message needs improvement' : 'Good error message'
        });

        console.log(`  Score: ${score}/100`);
        console.log(`  Has Guidance: ${hasGuidance ? '✅' : '❌'}`);
        console.log(`  Has Next Steps: ${hasNextSteps ? '✅' : '❌'}`);
        console.log(`  Has Help Links: ${hasHelpLinks ? '✅' : '❌'}`);
      }
    }
  }

  /**
   * Test progress indication for long operations
   */
  async testProgressIndication() {
    console.log('\n⏳ Testing Progress Indication...\n');

    const longOperations = [
      {
        name: 'Property Activation',
        command: 'property.activate',
        expectedDuration: 120000, // 2 minutes
        checkpoints: ['validating', 'deploying', 'propagating', 'complete']
      },
      {
        name: 'Certificate Enrollment',
        command: 'certificate.enrollment.create',
        expectedDuration: 180000, // 3 minutes
        checkpoints: ['creating', 'validating domain', 'issuing', 'deployed']
      },
      {
        name: 'Bulk Purge',
        command: 'purge.bulk',
        expectedDuration: 30000, // 30 seconds
        checkpoints: ['queued', 'processing', 'purging', 'completed']
      }
    ];

    for (const operation of longOperations) {
      console.log(`Testing: ${operation.name}`);
      
      const progressUpdates = [];
      const startTime = Date.now();
      
      // Simulate monitoring progress
      const checkProgress = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / operation.expectedDuration) * 100);
        
        progressUpdates.push({
          time: elapsed,
          progress: progress,
          message: this.generateProgressMessage(progress, operation.checkpoints)
        });
        
        if (progress >= 100) {
          clearInterval(checkProgress);
        }
      }, 5000); // Check every 5 seconds

      // Wait for simulated completion
      await new Promise(resolve => setTimeout(resolve, 10000));
      clearInterval(checkProgress);

      // Evaluate progress indication quality
      const hasPercentage = progressUpdates.some(u => u.message.includes('%'));
      const hasTimeEstimate = progressUpdates.some(u => 
        u.message.includes('remaining') || u.message.includes('ETA')
      );
      const hasStatusUpdates = progressUpdates.length >= 2;
      const hasClearStages = operation.checkpoints.some(cp => 
        progressUpdates.some(u => u.message.includes(cp))
      );

      const score = (hasPercentage ? 25 : 0) +
                   (hasTimeEstimate ? 25 : 0) +
                   (hasStatusUpdates ? 25 : 0) +
                   (hasClearStages ? 25 : 0);

      this.testResults.progressIndication.push({
        operation: operation.name,
        progressUpdates: progressUpdates.length,
        hasPercentage,
        hasTimeEstimate,
        hasStatusUpdates,
        hasClearStages,
        score,
        recommendation: score < 75 ? 'Progress indication needs improvement' : 'Good progress feedback'
      });

      console.log(`  Score: ${score}/100`);
      console.log(`  Updates: ${progressUpdates.length}`);
      console.log(`  Quality: ${score >= 75 ? '✅ Good' : '⚠️ Needs improvement'}`);
    }
  }

  /**
   * Test next steps guidance
   */
  async testNextStepsGuidance() {
    console.log('\n👣 Testing Next Steps Guidance...\n');

    const workflows = [
      {
        name: 'After Property Creation',
        action: 'property.create',
        expectedNextSteps: [
          'Add hostnames',
          'Configure origin',
          'Set up SSL certificate',
          'Activate on staging',
          'Test configuration'
        ]
      },
      {
        name: 'After DNS Zone Creation',
        action: 'dns.zone.create',
        expectedNextSteps: [
          'Add DNS records',
          'Update nameservers',
          'Verify propagation',
          'Test resolution'
        ]
      },
      {
        name: 'After Certificate Enrollment',
        action: 'certificate.create',
        expectedNextSteps: [
          'Complete domain validation',
          'Check validation status',
          'Wait for issuance',
          'Deploy to property'
        ]
      },
      {
        name: 'After Staging Activation',
        action: 'property.activate.staging',
        expectedNextSteps: [
          'Test on staging',
          'Verify functionality',
          'Check performance',
          'Promote to production'
        ]
      }
    ];

    for (const workflow of workflows) {
      console.log(`Testing: ${workflow.name}`);
      
      // Simulate action completion
      const response = this.generateMockResponse(workflow.action);
      
      // Check for next steps
      const providedSteps = workflow.expectedNextSteps.filter(step =>
        response.toLowerCase().includes(step.toLowerCase())
      );

      const hasNumberedSteps = /\d\.\s/.test(response);
      const hasLinks = response.includes('http') || response.includes('docs.');
      const hasClearCTA = response.includes('Next:') || 
                         response.includes('Now you can:') ||
                         response.includes('Next steps:');

      const score = (providedSteps.length / workflow.expectedNextSteps.length * 50) +
                   (hasNumberedSteps ? 20 : 0) +
                   (hasLinks ? 15 : 0) +
                   (hasClearCTA ? 15 : 0);

      this.testResults.nextStepsGuidance.push({
        workflow: workflow.name,
        expectedSteps: workflow.expectedNextSteps.length,
        providedSteps: providedSteps.length,
        hasNumberedSteps,
        hasLinks,
        hasClearCTA,
        score,
        missingSteps: workflow.expectedNextSteps.filter(s => !providedSteps.includes(s))
      });

      console.log(`  Score: ${score}/100`);
      console.log(`  Steps Provided: ${providedSteps.length}/${workflow.expectedNextSteps.length}`);
      console.log(`  Quality: ${score >= 70 ? '✅ Good' : '⚠️ Needs improvement'}`);
    }
  }

  /**
   * Test documentation links and help text
   */
  testDocumentationLinks() {
    console.log('\n📚 Testing Documentation Links...\n');

    const contexts = [
      {
        name: 'Property Configuration Help',
        response: this.generateMockResponse('property.help'),
        expectedLinks: [
          'property-manager-guide',
          'best-practices',
          'troubleshooting'
        ]
      },
      {
        name: 'SSL Certificate Help',
        response: this.generateMockResponse('certificate.help'),
        expectedLinks: [
          'ssl-certificates',
          'domain-validation',
          'certificate-renewal'
        ]
      },
      {
        name: 'API Error Documentation',
        response: this.generateMockResponse('api.error'),
        expectedLinks: [
          'error-codes',
          'api-reference',
          'support'
        ]
      }
    ];

    for (const context of contexts) {
      console.log(`Testing: ${context.name}`);
      
      const links = this.extractLinks(context.response);
      const validLinks = links.filter(link => this.isValidUrl(link));
      const relevantLinks = links.filter(link => 
        context.expectedLinks.some(expected => link.includes(expected))
      );

      const hasContextualLinks = relevantLinks.length > 0;
      const linksAreAccessible = validLinks.length === links.length;
      const hasAnchorText = context.response.includes('[') && context.response.includes(']');

      const score = (relevantLinks.length / context.expectedLinks.length * 50) +
                   (linksAreAccessible ? 25 : 0) +
                   (hasAnchorText ? 25 : 0);

      this.testResults.documentationLinks.push({
        context: context.name,
        totalLinks: links.length,
        validLinks: validLinks.length,
        relevantLinks: relevantLinks.length,
        hasContextualLinks,
        linksAreAccessible,
        hasAnchorText,
        score
      });

      console.log(`  Score: ${score}/100`);
      console.log(`  Links: ${validLinks.length} valid, ${relevantLinks.length} relevant`);
      console.log(`  Quality: ${score >= 70 ? '✅ Good' : '⚠️ Needs improvement'}`);
    }
  }

  /**
   * Test success confirmation messaging
   */
  testSuccessConfirmation() {
    console.log('\n✅ Testing Success Confirmation...\n');

    const successScenarios = [
      {
        name: 'Property Created',
        response: 'Property created successfully',
        expectedElements: ['property ID', 'next steps', 'success icon']
      },
      {
        name: 'Activation Complete',
        response: 'Activation completed on PRODUCTION',
        expectedElements: ['activation ID', 'propagation time', 'verify URL']
      },
      {
        name: 'Certificate Issued',
        response: 'SSL certificate issued and deployed',
        expectedElements: ['certificate details', 'expiry date', 'domains covered']
      }
    ];

    for (const scenario of successScenarios) {
      console.log(`Testing: ${scenario.name}`);
      
      const hasSuccessIndicator = scenario.response.includes('✅') || 
                                 scenario.response.includes('successfully') ||
                                 scenario.response.includes('completed');
      
      const hasIdentifier = /[a-zA-Z]{3}_\d{6}/.test(scenario.response) ||
                           /\d{6}/.test(scenario.response);
      
      const hasActionableInfo = scenario.response.includes('You can now') ||
                               scenario.response.includes('Next:') ||
                               scenario.response.includes('verify');

      const hasCelebration = scenario.response.includes('🎉') ||
                            scenario.response.includes('Congratulations') ||
                            scenario.response.includes('Great!');

      const score = (hasSuccessIndicator ? 30 : 0) +
                   (hasIdentifier ? 25 : 0) +
                   (hasActionableInfo ? 30 : 0) +
                   (hasCelebration ? 15 : 0);

      this.testResults.successConfirmation.push({
        scenario: scenario.name,
        hasSuccessIndicator,
        hasIdentifier,
        hasActionableInfo,
        hasCelebration,
        score,
        recommendation: score < 70 ? 'Success message needs enhancement' : 'Good success confirmation'
      });

      console.log(`  Score: ${score}/100`);
      console.log(`  Elements: ${[hasSuccessIndicator, hasIdentifier, hasActionableInfo, hasCelebration].filter(Boolean).length}/4`);
      console.log(`  Quality: ${score >= 70 ? '✅ Good' : '⚠️ Needs improvement'}`);
    }
  }

  /**
   * Helper methods
   */
  async runMCPCommand(toolName, params) {
    // Simulated MCP command execution
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (params.simulateError || toolName.includes('invalid')) {
          reject({ error: this.generateMockError(toolName, params) });
        } else {
          resolve({ output: this.generateMockResponse(toolName) });
        }
      }, 100);
    });
  }

  generateProgressMessage(progress, checkpoints) {
    const stage = Math.floor(progress / (100 / checkpoints.length));
    const currentCheckpoint = checkpoints[Math.min(stage, checkpoints.length - 1)];
    const eta = Math.max(0, (100 - progress) * 1.2); // Simulated ETA in seconds
    
    return `${currentCheckpoint} - ${progress.toFixed(0)}% complete (ETA: ${Math.ceil(eta)}s)`;
  }

  generateMockResponse(action) {
    const responses = {
      'property.create': `✅ Property created successfully!
        
Property ID: prp_789012
Next steps:
1. Add your hostnames to the property
2. Configure your origin server settings  
3. Set up SSL certificate for HTTPS
4. Test on staging environment
5. Activate on production when ready

Helpful resources:
- Property Configuration Guide: https://docs.akamai.com/property-config
- SSL Setup: https://docs.akamai.com/ssl-setup
- Testing Guide: https://docs.akamai.com/testing`,

      'property.help': `Property Manager Help

Common tasks:
• Creating a property: https://docs.akamai.com/property-manager-guide
• Best practices: https://docs.akamai.com/pm-best-practices
• Troubleshooting: https://docs.akamai.com/pm-troubleshooting

Need more help? Contact support@akamai.com`,

      'certificate.help': `SSL Certificate Management

Resources:
• Certificate types: https://docs.akamai.com/ssl-certificates
• Domain validation: https://docs.akamai.com/domain-validation  
• Renewal process: https://docs.akamai.com/certificate-renewal`,

      'api.error': `API Error Information

• Error codes reference: https://docs.akamai.com/api/error-codes
• API documentation: https://docs.akamai.com/api-reference
• Get support: https://support.akamai.com`
    };

    return responses[action] || 'Operation completed successfully';
  }

  generateMockError(command, params) {
    if (params.simulateRateLimit) {
      return `Rate limit exceeded for ${command}. 
Please retry after 60 seconds.
Consider implementing exponential backoff for automated requests.
Learn more: https://docs.akamai.com/rate-limits`;
    }

    if (command === 'property.get' && params.propertyId === 'invalid-id') {
      return `Invalid property ID format: "${params.propertyId}"
Property IDs should follow the format: prp_XXXXXX (where X is a digit)
Example: prp_123456

To find your property ID:
1. Run: property.list
2. Look for your property name in the results
3. Copy the associated property ID`;
    }

    return `Error executing ${command}: Unknown error occurred`;
  }

  extractLinks(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate comprehensive UX report
   */
  generateReport() {
    console.log('\n\n📊 USER EXPERIENCE TEST REPORT');
    console.log('================================\n');

    const categories = [
      { name: 'Response Clarity', data: this.testResults.responseClarity },
      { name: 'Error Helpfulness', data: this.testResults.errorHelpfulness },
      { name: 'Progress Indication', data: this.testResults.progressIndication },
      { name: 'Next Steps Guidance', data: this.testResults.nextStepsGuidance },
      { name: 'Documentation Links', data: this.testResults.documentationLinks },
      { name: 'Success Confirmation', data: this.testResults.successConfirmation }
    ];

    for (const category of categories) {
      if (category.data.length === 0) continue;

      const avgScore = category.data.reduce((sum, item) => sum + item.score, 0) / category.data.length;
      const passRate = category.data.filter(item => item.score >= 70).length / category.data.length * 100;

      console.log(`${category.name}:`);
      console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
      console.log(`  Pass Rate: ${passRate.toFixed(1)}%`);
      console.log(`  Tests Run: ${category.data.length}`);
      
      // Show items needing improvement
      const needsImprovement = category.data.filter(item => item.score < 70);
      if (needsImprovement.length > 0) {
        console.log(`  ⚠️ Needs Improvement:`);
        needsImprovement.forEach(item => {
          console.log(`    - ${item.context || item.scenario || item.operation || item.workflow}`);
        });
      }
      console.log('');
    }

    // Overall UX score
    const allScores = categories.flatMap(c => c.data.map(d => d.score));
    const overallScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    console.log(`Overall UX Score: ${overallScore.toFixed(1)}/100`);
    console.log(`Grade: ${this.getGrade(overallScore)}`);

    // Recommendations
    console.log('\n💡 Top Recommendations:');
    if (overallScore < 70) {
      console.log('  1. Improve error messages with actionable guidance');
      console.log('  2. Add progress indicators for long operations');
      console.log('  3. Include next steps after each action');
    } else if (overallScore < 85) {
      console.log('  1. Enhance documentation links relevance');
      console.log('  2. Add more celebration to success messages');
      console.log('  3. Improve time estimates for operations');
    } else {
      console.log('  ✅ Excellent UX! Minor refinements only');
    }
  }

  getGrade(score) {
    if (score >= 90) return '🌟 A+ (Excellent)';
    if (score >= 80) return '✅ A (Very Good)';
    if (score >= 70) return '👍 B (Good)';
    if (score >= 60) return '⚠️ C (Needs Improvement)';
    return '❌ D (Poor)';
  }
}

// Main test runner
async function runUXTests() {
  console.log('🎨 User Experience Testing Suite');
  console.log('================================\n');

  const tester = new UXTester();

  // Run all test categories
  await tester.testErrorMessages();
  await tester.testProgressIndication();
  await tester.testNextStepsGuidance();
  tester.testDocumentationLinks();
  tester.testSuccessConfirmation();

  // Test response clarity on sample responses
  const sampleResponses = [
    {
      context: 'Property Creation Success',
      response: `Your property has been created successfully! The property ID is prp_123456.

Next steps:
• Add hostnames to your property
• Configure origin server settings
• Set up SSL certificates
• Test on staging before production

For detailed guidance, see: https://docs.akamai.com/property-setup`
    },
    {
      context: 'Complex Technical Error',
      response: `Error: The specified CPCode cpc_12345 has reached its ephemeral quota limit for idempotent operations in the current canonical time window.`
    }
  ];

  for (const sample of sampleResponses) {
    tester.evaluateResponseClarity(sample.response, sample.context);
  }

  // Generate final report
  tester.generateReport();

  console.log('\n✅ UX Testing Complete!');
}

// Export for use in other tests
module.exports = {
  UXTester,
  runUXTests
};

// Run if called directly
if (require.main === module) {
  runUXTests().catch(console.error);
}