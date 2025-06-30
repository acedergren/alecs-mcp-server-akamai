/**
 * MULTI-TENANT CUSTOMER CONTEXT MANAGER
 * 
 * EDGEGRID-BASED AUTHENTICATION ARCHITECTURE:
 * This service manages multi-customer EdgeGrid authentication for MCP deployments,
 * providing secure customer context switching using standard .edgerc configuration.
 * 
 * CUSTOMER MANAGEMENT CAPABILITIES:
 * 🔐 EdgeGrid Authentication: Standard Akamai EdgeGrid authentication
 * 🏢 Multi-Customer Support: Access multiple customer accounts via .edgerc sections
 * 🔄 Context Switching: Switch between customer accounts within sessions
 * 🛡️ Token-Based Authorization: Session-based access control
 * 🔒 Secure Credential Access: Safe EdgeGrid credential management
 * 📊 Audit Logging: Complete audit trail for compliance and monitoring
 * 
 * DEPLOYMENT SCENARIOS:
 * 1. **Local Development**: Direct .edgerc file access
 * 2. **Team Deployment**: Shared .edgerc with multiple customer sections
 * 3. **Enterprise Deployment**: Centralized customer context management
 * 
 * AUTHENTICATION FLOW:
 * 1. Client provides session token for authentication
 * 2. Session includes available customer contexts from .edgerc
 * 3. Client selects customer context for operations
 * 4. All MCP tool calls include session + customer context
 * 5. Authorization checked before accessing customer resources
 * 
 * CUSTOMER CREDENTIAL MANAGEMENT:
 * - Uses standard .edgerc file with multiple customer sections
 * - EdgeGrid authentication per customer context
 * - Secure credential access with session validation
 * 
 * ARCHITECTURE:
 * Local .edgerc → Token sessions → Customer context → EdgeGrid clients
 */

import { AkamaiClient } from '../akamai-client';
import { logger } from '../utils/logger';

// Session token for authentication
interface SessionToken {
  token: string;
  expires_at: Date;
}

interface CustomerContext {
  customerId: string;
  name: string;
  edgeGridSection?: string;
}

interface AuthSession {
  sessionId: string;
  customerId: string;
  userId?: string;
  expiresAt: Date;
  availableContexts: CustomerContext[];
}

interface AuthorizationContext {
  subject: string;
  resource: string;
  action: string;
  context?: any;
  user?: string;
}

interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

interface CredentialRotationSchedule {
  nextRotation: Date;
  frequency: string;
}

interface CustomerIsolationPolicy {
  isolated: boolean;
  level: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface EdgeGridCredentials {
  client_token: string;
  client_secret: string;
  access_token: string;
  host: string;
}

// Simple session management for token-based authentication
class SessionManager {
  private static instance: SessionManager;
  private sessions = new Map<string, AuthSession>();
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new SessionManager();
    }
    return this.instance;
  }
  
  async createSession(sessionId: string, customerId: string, userId?: string): Promise<AuthSession> {
    const session: AuthSession = {
      sessionId,
      customerId,
      userId,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      availableContexts: [{ customerId, name: customerId }]
    };
    this.sessions.set(sessionId, session);
    return session;
  }
  
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }
  
  async switchCustomerContext(sessionId: string, targetCustomerId: string): Promise<AuthSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }
    
    session.customerId = targetCustomerId;
    this.sessions.set(sessionId, session);
    return session;
  }
  
  async revokeSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
  
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

/**
 * Customer switch request
 */
export interface CustomerSwitchRequest {
  sessionId: string;
  targetCustomerId: string;
  reason?: string;
}

/**
 * Customer credential request
 */
export interface CustomerCredentialRequest {
  sessionId: string;
  customerId: string;
  purpose?: string;
}

/**
 * Authorization request
 */
export interface AuthorizationRequest {
  sessionId: string;
  resource: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * CUSTOMER CONTEXT MANAGER IMPLEMENTATION
 * 
 * TOKEN-BASED SESSION ORCHESTRATION:
 * This service orchestrates multi-customer operations using token-based authentication
 * and EdgeGrid credentials from .edgerc configuration.
 * 
 * ARCHITECTURE COMPONENTS:
 * 
 * 1. **Session Manager**: 
 *    - Handles token-based authentication from clients
 *    - Manages session lifecycle and expiration
 *    - Supports customer context switching within sessions
 * 
 * 2. **EdgeGrid Integration**:
 *    - Uses standard .edgerc file with multiple customer sections
 *    - Creates AkamaiClient instances per customer context
 *    - Provides secure credential access via EdgeGrid authentication
 * 
 * CLIENT CONNECTION PATTERNS:
 * - Claude Desktop connects via MCP protocol with session token
 * - All connections support customer context switching
 * - Sessions tied to available .edgerc customer sections
 * 
 * SCALABILITY DESIGN:
 * - Lightweight session management in memory
 * - AkamaiClient instances created per-request for isolation
 * - Standard EdgeGrid authentication per customer
 */
export class CustomerContextManager {
  private static instance: CustomerContextManager;
  
  /**
   * Session Manager: Handles token-based authentication and session management
   * 
   * SESSION INTEGRATION:
   * - Authenticates session tokens from MCP clients
   * - Maintains active sessions with customer context lists
   * - Supports session refresh and customer switching
   * - Maps sessions to available .edgerc customer sections
   */
  private readonly sessionManager: SessionManager;
  
  // Note: AkamaiClient instances are lightweight and created per-request
  // This eliminates the need for client caching and improves security isolation

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CustomerContextManager {
    if (!CustomerContextManager.instance) {
      CustomerContextManager.instance = new CustomerContextManager();
    }
    return CustomerContextManager.instance;
  }

  /**
   * Create authenticated session with token
   */
  async createSession(sessionId: string, customerId: string, userId?: string): Promise<AuthSession> {
    return this.sessionManager.createSession(sessionId, customerId, userId);
  }

  /**
   * CUSTOMER CONTEXT SWITCHING
   * 
   * Allows clients to switch between different customer accounts within
   * their active session, enabling seamless multi-customer operations.
   * 
   * VALIDATION:
   * 1. Validates active session
   * 2. Verifies target customer access
   * 3. Updates session context
   * 4. Logs context switches for audit compliance
   * 
   * CLIENT FLOW:
   * Client → switchCustomer(sessionId, targetCustomerId) → New context
   * Subsequent MCP tool calls use new customer context automatically
   */
  async switchCustomer(request: CustomerSwitchRequest): Promise<CustomerContext> {
    const { sessionId, targetCustomerId, reason } = request;

    // Get and validate session
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Verify access to target customer
    const hasAccess = session.availableContexts.some(ctx => ctx.customerId === targetCustomerId);
    if (!hasAccess) {
      throw new Error(`No access to customer ${targetCustomerId}`);
    }

    // Perform context switch
    const updatedSession = await this.sessionManager.switchCustomerContext(sessionId, targetCustomerId);

    logger.info('Customer context switched', {
      sessionId,
      fromCustomer: session.customerId,
      toCustomer: targetCustomerId,
      userId: session.userId,
      reason,
    });

    return {
      customerId: targetCustomerId,
      name: targetCustomerId,
      edgeGridSection: targetCustomerId
    };
  }

  /**
   * SECURE CUSTOMER CREDENTIAL ACCESS
   * 
   * EDGEGRID AUTHENTICATION:
   * Creates AkamaiClient instances using EdgeGrid authentication from .edgerc
   * configuration, with session validation for secure multi-customer access.
   * 
   * CREDENTIAL SECURITY MODEL:
   * 1. Validates session and customer access rights
   * 2. Creates customer-specific AkamaiClient with EdgeGrid credentials
   * 3. Logs all credential access for compliance and auditing
   * 
   * BENEFITS:
   * - Standard .edgerc credential management
   * - Session-based access control
   * - Complete audit trail of API access per customer
   * 
   * INTEGRATION PATTERN:
   * MCP tool → getEdgeGridClient(sessionId, customerId) → AkamaiClient
   */
  async getEdgeGridClient(request: CustomerCredentialRequest): Promise<AkamaiClient> {
    const { sessionId, customerId, purpose } = request;

    // Get and validate session
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Check if user has access to this customer
    const hasAccess = session.availableContexts.some((ctx) => ctx.customerId === customerId);
    if (!hasAccess) {
      throw new Error(`No access to customer ${customerId}`);
    }

    // Create AkamaiClient with the customer section from .edgerc
    const client = new AkamaiClient(customerId);

    // Note: We don't cache AkamaiClient instances as they are lightweight
    // and the underlying EdgeGrid SDK handles its own connection pooling

    logger.info('EdgeGrid client created for customer', {
      customerId,
      userId: session.userId,
      purpose,
    });

    return client;
  }

  /**
   * Basic authorization check for session-based access
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationDecision> {
    const { sessionId, resource, action, resourceId, metadata } = request;

    // Get and validate session
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return {
        allowed: false,
        reason: 'Invalid or expired session',
      };
    }

    // Basic authorization - allow access if session is valid
    // More sophisticated authorization can be added later
    const allowed = true;

    logger.info('Authorization decision', {
      sessionId,
      resource,
      action,
      resourceId,
      allowed,
    });

    return { allowed };
  }

  /**
   * Get customer contexts for current session
   */
  async getAvailableCustomers(sessionId: string): Promise<CustomerContext[]> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    return session.availableContexts;
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionManager.revokeSession(sessionId);
  }

  /**
   * Clean up expired sessions and resources
   */
  cleanupExpired(): void {
    this.sessionManager.cleanupExpiredSessions();
  }
}
