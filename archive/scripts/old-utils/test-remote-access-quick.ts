#!/usr/bin/env tsx
/**
 * Quick validation script for remote access security implementation
 */

import { TokenManager } from '../src/auth/TokenManager';
import { SecurityMiddleware } from '../src/middleware/security';
import { AuthenticationMiddleware } from '../src/middleware/authentication';
import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

// Test results tracking
let passedTests = 0;
let failedTests = 0;

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testPassed(testName: string) {
  passedTests++;
  log(`✅ ${testName}`, colors.green);
}

function testFailed(testName: string, error: any) {
  failedTests++;
  log(`❌ ${testName}`, colors.red);
  log(`   Error: ${error.message || error}`, colors.red);
}

// Test 1: Token Generation and Management
async function testTokenGeneration() {
  log('\n📝 Testing Token Generation and Management', colors.blue);
  
  try {
    const tokenManager = TokenManager.getInstance();
    
    // Generate a token
    const token1 = await tokenManager.generateToken({
      description: 'Test token 1',
      expiresInDays: 1,
    });
    
    if (!token1.token || !token1.tokenId) {
      throw new Error('Token generation failed');
    }
    testPassed('Token generation');
    
    // Validate the token
    const validation = await tokenManager.validateToken(token1.token);
    if (!validation.valid || validation.tokenId !== token1.tokenId) {
      throw new Error('Token validation failed');
    }
    testPassed('Token validation');
    
    // List tokens
    const tokens = await tokenManager.listTokens();
    const foundToken = tokens.find(t => t.tokenId === token1.tokenId);
    if (!foundToken) {
      throw new Error('Token not found in list');
    }
    testPassed('Token listing');
    
    // Rotate token
    const rotationResult = await tokenManager.rotateToken(token1.tokenId);
    if (!rotationResult.success || !rotationResult.newToken) {
      throw new Error('Token rotation failed');
    }
    
    // Verify old token is revoked
    const oldValidation = await tokenManager.validateToken(token1.token);
    if (oldValidation.valid) {
      throw new Error('Old token should be revoked after rotation');
    }
    
    // Verify new token works
    const newValidation = await tokenManager.validateToken(rotationResult.newToken.token);
    if (!newValidation.valid) {
      throw new Error('New token should be valid after rotation');
    }
    testPassed('Token rotation');
    
    // Revoke token
    const revoked = await tokenManager.revokeToken(rotationResult.newToken.tokenId);
    if (!revoked) {
      throw new Error('Token revocation failed');
    }
    
    const revokedValidation = await tokenManager.validateToken(rotationResult.newToken.token);
    if (revokedValidation.valid) {
      throw new Error('Revoked token should not be valid');
    }
    testPassed('Token revocation');
    
  } catch (error) {
    testFailed('Token management', error);
  }
}

// Test 2: Security Middleware
async function testSecurityMiddleware() {
  log('\n🔐 Testing Security Middleware', colors.blue);
  
  try {
    const securityMiddleware = new SecurityMiddleware({
      windowMs: 1000, // 1 second window for testing
      maxRequests: 3,  // 3 requests per second
    });
    
    // Create mock request and response
    const mockReq = new IncomingMessage(new Socket());
    mockReq.headers = { 'x-real-ip': '10.0.0.1' };
    mockReq.url = '/test';
    
    const mockRes = {
      setHeader: () => {},
      writeHead: () => {},
      end: () => {},
    } as any;
    
    // Test rate limiting
    let passed = 0;
    for (let i = 0; i < 5; i++) {
      const result = await securityMiddleware.applyRateLimit(mockReq, mockRes);
      if (result) passed++;
    }
    
    if (passed !== 3) {
      throw new Error(`Expected 3 passed requests, got ${passed}`);
    }
    testPassed('Rate limiting enforcement');
    
    // Test security event logging
    const events = securityMiddleware.getSecurityEvents();
    const rateLimitEvent = events.find(e => e.type === 'RATE_LIMIT_EXCEEDED');
    if (!rateLimitEvent) {
      throw new Error('Rate limit event not logged');
    }
    testPassed('Security event logging');
    
    securityMiddleware.destroy();
    
  } catch (error) {
    testFailed('Security middleware', error);
  }
}

// Test 3: Authentication Middleware
async function testAuthenticationMiddleware() {
  log('\n🔒 Testing Authentication Middleware', colors.blue);
  
  try {
    const tokenManager = TokenManager.getInstance();
    const authMiddleware = new AuthenticationMiddleware({
      enabled: true,
      publicPaths: ['/health'],
    });
    
    // Generate a test token
    const testToken = await tokenManager.generateToken({
      description: 'Auth test token',
    });
    
    // Create mock request and response
    const createMockReq = (headers: any = {}, url: string = '/test') => {
      const req = new IncomingMessage(new Socket());
      req.headers = headers;
      req.url = url;
      (req.socket as any).remoteAddress = '127.0.0.1';
      return req;
    };
    
    const createMockRes = () => ({
      setHeader: () => {},
      writeHead: () => {},
      end: () => {},
    } as any);
    
    // Test: No auth header
    const noAuthReq = createMockReq();
    const noAuthRes = createMockRes();
    const noAuthResult = await authMiddleware.authenticate(noAuthReq, noAuthRes);
    
    if (noAuthResult.authenticated) {
      throw new Error('Should reject request without auth header');
    }
    testPassed('Reject unauthenticated requests');
    
    // Test: Valid token
    const validReq = createMockReq({ authorization: `Bearer ${testToken.token}` });
    const validRes = createMockRes();
    const validResult = await authMiddleware.authenticate(validReq, validRes);
    
    if (!validResult.authenticated || validResult.tokenId !== testToken.tokenId) {
      throw new Error('Should accept valid token');
    }
    testPassed('Accept valid token');
    
    // Test: Public path
    const publicReq = createMockReq({}, '/health');
    const publicRes = createMockRes();
    const publicResult = await authMiddleware.authenticate(publicReq, publicRes);
    
    if (!publicResult.authenticated) {
      throw new Error('Should allow public paths without auth');
    }
    testPassed('Allow public paths');
    
    // Clean up
    await tokenManager.revokeToken(testToken.tokenId);
    
  } catch (error) {
    testFailed('Authentication middleware', error);
  }
}

// Test 4: Token Tools
async function testTokenTools() {
  log('\n🛠️  Testing Token Management Tools', colors.blue);
  
  try {
    // Import token tool handlers
    const {
      handleGenerateApiToken,
      handleListApiTokens,
      handleValidateApiToken,
      handleRotateApiToken,
      handleRevokeApiToken,
    } = await import('../src/tools/token-tools');
    
    // Test generate token tool
    const generateResult = await handleGenerateApiToken({
      description: 'Tool test token',
      expiresInDays: 7,
    });
    
    const tokenMatch = generateResult.content[0].text.match(/```\n(.+)\n```/);
    if (!tokenMatch) {
      throw new Error('Token not found in generate response');
    }
    const token = tokenMatch[1];
    
    const tokenIdMatch = generateResult.content[0].text.match(/\*\*Token ID:\*\* (tok_\w+)/);
    if (!tokenIdMatch) {
      throw new Error('Token ID not found in generate response');
    }
    const tokenId = tokenIdMatch[1];
    
    testPassed('Token tool: Generate');
    
    // Test list tokens tool
    const listResult = await handleListApiTokens({});
    if (!listResult.content[0].text.includes(tokenId)) {
      throw new Error('Generated token not in list');
    }
    testPassed('Token tool: List');
    
    // Test validate token tool
    const validateResult = await handleValidateApiToken({ token });
    if (!validateResult.content[0].text.includes('✅ Token is valid')) {
      throw new Error('Token validation failed');
    }
    testPassed('Token tool: Validate');
    
    // Test revoke token tool
    const revokeResult = await handleRevokeApiToken({ tokenId });
    if (!revokeResult.content[0].text.includes('✅')) {
      throw new Error('Token revocation failed');
    }
    testPassed('Token tool: Revoke');
    
  } catch (error) {
    testFailed('Token tools', error);
  }
}

// Main test runner
async function runAllTests() {
  log('🧪 ALECS Remote Access Security Validation (Quick)', colors.yellow);
  log('=' .repeat(50), colors.yellow);
  
  try {
    await testTokenGeneration();
    await testSecurityMiddleware();
    await testAuthenticationMiddleware();
    await testTokenTools();
  } catch (error) {
    log('\n❌ Test suite error:', colors.red);
    console.error(error);
  }
  
  // Summary
  log('\n' + '='.repeat(50), colors.yellow);
  log('📊 Test Summary', colors.yellow);
  log(`✅ Passed: ${passedTests}`, colors.green);
  log(`❌ Failed: ${failedTests}`, colors.red);
  
  const totalTests = passedTests + failedTests;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
  
  if (failedTests === 0) {
    log(`\n🎉 All tests passed! (${successRate}% success rate)`, colors.green);
  } else {
    log(`\n⚠️  Some tests failed (${successRate}% success rate)`, colors.red);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);