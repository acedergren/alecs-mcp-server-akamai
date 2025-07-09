# ALECS MCP Server Architecture Flowchart

## High-Level Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CLAUDE DESKTOP / MCP CLIENT                            │
│                                   (External Interface)                              │
└───────────────────────────────────┬─────────────────────────────────────────────────┘
                                    │ MCP Protocol (stdio/websocket)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    INDEX.TS                                         │
│                              (Entry Point & Router)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  1. Detects transport type (stdio for Claude Desktop)                       │  │
│  │  2. Routes to appropriate domain server based on configuration              │  │
│  │  3. Initializes selected server with transport                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN SERVERS (ALECSCore)                             │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │    DNS     │  │  Property  │  │   Certs  │  │  FastPurge  │  │   Security   │ │
│  │   Server   │  │   Server   │  │  Server  │  │    Server   │  │    Server    │ │
│  └─────┬──────┘  └─────┬──────┘  └────┬─────┘  └──────┬──────┘  └──────┬───────┘ │
│        │               │              │                │                 │         │
│        └───────────────┴──────────────┴────────────────┴─────────────────┘         │
│                                       │                                             │
│                          All extend ALECSCore base class                            │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   ALECS CORE                                        │
│                          (Core MCP Server Framework)                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  Core Features:                                                              │  │
│  │  • MCP Protocol Handler (handles all MCP communication)                     │  │
│  │  • Tool Registration System (simple tool() helper)                          │  │
│  │  • Context Injection (provides client, cache, formatting to tools)          │  │
│  │  • Performance Layer (caching, request coalescing, connection pooling)      │  │
│  │  • Transport Abstraction (stdio, websocket, SSE support)                    │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────┬────────────────────────────────────────┬────────────────────────┘
                    │                                        │
                    ▼                                        ▼
┌─────────────────────────────────────┐    ┌─────────────────────────────────────────┐
│          TOOL EXECUTION             │    │            CONTEXT CREATION             │
│  ┌─────────────────────────────┐   │    │  ┌─────────────────────────────────┐   │
│  │ 1. Validate tool name       │   │    │  │ 1. Extract customer parameter  │   │
│  │ 2. Parse arguments w/ Zod   │   │    │  │ 2. Create AkamaiClient         │   │
│  │ 3. Apply context            │   │    │  │ 3. Setup cache instance        │   │
│  │ 4. Execute tool handler     │   │    │  │ 4. Configure formatters        │   │
│  │ 5. Format response          │   │    │  │ 5. Inject into tool context    │   │
│  └─────────────────────────────┘   │    │  └─────────────────────────────────┘   │
└────────────────────┬───────────────┘    └──────────────┬───────────────────────────┘
                     │                                    │
                     └────────────────┬───────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CONSOLIDATED TOOLS                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  DNS Tools  │  │  Property   │  │Certificate  │  │  Security   │              │
│  │            │  │   Tools     │  │   Tools     │  │   Tools     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                │                      │
│         └────────────────┴────────────────┴────────────────┘                      │
│                                   │                                                │
│                      All tools receive context object                              │
└───────────────────────────────────┬─────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               AKAMAI CLIENT                                         │
│                        (API Communication Layer)                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  Features:                                                                   │  │
│  │  • EdgeGrid Authentication (using official Akamai SDK)                      │  │
│  │  • Multi-Customer Support (account switching via headers)                   │  │
│  │  • Connection Pooling (HTTP agent with keep-alive)                          │  │
│  │  • Timeout Management (configurable per-request timeouts)                   │  │
│  │  • Error Standardization (RFC 7807 Problem Details format)                  │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION LAYER                                      │
│  ┌──────────────────────────┐              ┌───────────────────────────────────┐  │
│  │    EnhancedEdgeGrid      │              │      Auth Middleware            │  │
│  │  ┌────────────────────┐  │              │  ┌─────────────────────────────┐ │  │
│  │  │ • Circuit Breaker  │  │              │  │ • Customer Validation     │ │  │
│  │  │ • Keep-Alive       │  │◄─────────────┤  │ • Credential Loading      │ │  │
│  │  │ • Performance Mon. │  │              │  │ • Account Switch Headers  │ │  │
│  │  │ • Request Signing  │  │              │  │ • Permission Checks       │ │  │
│  │  └────────────────────┘  │              │  └─────────────────────────────┘ │  │
│  └──────────────────────────┘              └───────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              UTILITY LAYER                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Caching   │  │   Error     │  │ Validation  │  │Performance  │              │
│  │  Service    │  │  Handling   │  │   (Zod)     │  │  Monitor    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Formatters │  │   Logger    │  │  Timeout    │  │  Customer   │              │
│  │             │  │   (Pino)    │  │  Handler    │  │   Config    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            AKAMAI EDGE NETWORK                                      │
│                         (External API Endpoints)                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

## Request Flow Example: DNS Zone Creation

1. Claude Desktop → MCP Request: "dns.zone.create" with arguments
2. Index.ts → Routes to DNS Server (ALECSCore instance)
3. ALECSCore → Validates tool exists and parses arguments with Zod
4. ALECSCore → Creates context with AkamaiClient for customer
5. DNS Tool Handler → Receives validated args and context
6. AkamaiClient → Prepares request with EdgeGrid authentication
7. EnhancedEdgeGrid → Signs request and adds account-switch headers
8. HTTP Request → Sent to Akamai Edge Network
9. Response → Flows back through the same path
10. ALECSCore → Formats response according to MCP protocol
11. Claude Desktop → Receives formatted result

## Key Architectural Patterns

### 1. Tool Registration Pattern
```
server.tool({
  name: 'dns.zone.create',
  schema: zod.schema,
  handler: async (args, context) => {
    // Tool implementation using context.client
  }
})
```

### 2. Context Injection Pattern
```
Every tool receives:
{
  client: AkamaiClient,      // Authenticated API client
  cache: CacheService,       // Performance optimization
  formatter: Formatter,      // Output formatting
  logger: Logger,           // Structured logging
  customer: string          // Current customer context
}
```

### 3. Error Handling Pattern
```
Tool → Throws typed error
ALECSCore → Catches and converts to MCP error format
Client → Receives standardized error response
```

### 4. Multi-Customer Pattern
```
Request includes customer parameter
→ AkamaiClient loads customer credentials
→ EnhancedEdgeGrid adds account-switch headers
→ API request executed in customer context
```

## Performance Optimizations

1. **Caching Layer**: Reduces API calls for repeated requests
2. **Request Coalescing**: Prevents duplicate concurrent requests
3. **Connection Pooling**: Reuses HTTP connections across requests
4. **Circuit Breaker**: Prevents cascading failures
5. **Smart Formatting**: Optimizes output based on use case

## Security Considerations

1. **Credential Isolation**: Each customer's credentials are isolated
2. **Input Validation**: All inputs validated with Zod schemas
3. **Error Sanitization**: Sensitive data removed from error messages
4. **Authentication**: EdgeGrid signature on every request
5. **Account Switching**: Secure header-based customer context