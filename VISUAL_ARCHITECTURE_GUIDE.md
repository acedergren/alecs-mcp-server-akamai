# Visual Architecture Guide - ALECS MCP Server

## Overview

This guide provides visual representations of the ALECS MCP Server architecture using Mermaid diagrams. These diagrams are designed to be rendered in documentation tools and maintained as code alongside the implementation.

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        CD[Claude Desktop]
        CLI[CLI Tools]
        WEB[Web Interface]
        API[Direct API Clients]
    end
    
    subgraph "Transport Layer"
        WS[WebSocket Transport]
        SSE[SSE Transport]
        STDIO[STDIO Transport]
    end
    
    subgraph "MCP Protocol Layer"
        TR[Tool Registry]
        SR[Service Router]
        EM[Error Mapper]
        PM[Progress Manager]
    end
    
    subgraph "Middleware Stack"
        AUTH[Authentication]
        VAL[Validation]
        RL[Rate Limiting]
        LOG[Logging]
    end
    
    subgraph "Service Layer"
        subgraph "Domain Services"
            PS[Property Service]
            CS[Certificate Service]
            DS[DNS Service]
            SS[Security Service]
            NS[Network List Service]
            FS[Fast Purge Service]
        end
        
        subgraph "Orchestration"
            WO[Workflow Orchestrator]
            DO[Deployment Orchestrator]
            VO[Validation Orchestrator]
        end
    end
    
    subgraph "Infrastructure Layer"
        subgraph "Caching"
            SC[Smart Cache]
            EC[External Cache]
            CF[Cache Factory]
        end
        
        subgraph "HTTP Management"
            CP[Connection Pool]
            HC[HTTP Client]
            RT[Retry Logic]
        end
        
        subgraph "Auth Management"
            ER[EdgeRC Reader]
            AS[Account Switcher]
            TM[Token Manager]
        end
    end
    
    subgraph "Akamai Integration"
        EG[EdgeGrid Client]
        subgraph "Akamai APIs"
            PAPI[Property API]
            CPS[Certificate API]
            DNS[Edge DNS API]
            SEC[Security API]
            NL[Network Lists API]
            FP[Fast Purge API]
        end
    end
    
    CD --> WS
    CLI --> STDIO
    WEB --> SSE
    API --> WS
    
    WS --> TR
    SSE --> TR
    STDIO --> TR
    
    TR --> SR
    SR --> EM
    SR --> PM
    
    SR --> AUTH
    AUTH --> VAL
    VAL --> RL
    RL --> LOG
    
    LOG --> PS
    LOG --> CS
    LOG --> DS
    LOG --> SS
    LOG --> NS
    LOG --> FS
    
    PS --> WO
    CS --> DO
    DS --> VO
    
    PS --> SC
    CS --> SC
    DS --> SC
    
    PS --> CP
    CS --> CP
    DS --> CP
    
    PS --> ER
    CS --> AS
    DS --> TM
    
    CP --> EG
    EG --> PAPI
    EG --> CPS
    EG --> DNS
    EG --> SEC
    EG --> NL
    EG --> FP
    
    style CD fill:#e1f5fe
    style CLI fill:#e1f5fe
    style WEB fill:#e1f5fe
    style API fill:#e1f5fe
    
    style PS fill:#c8e6c9
    style CS fill:#c8e6c9
    style DS fill:#c8e6c9
    style SS fill:#c8e6c9
    
    style SC fill:#fff3e0
    style CP fill:#fff3e0
    style ER fill:#fff3e0
    
    style PAPI fill:#ffcdd2
    style CPS fill:#ffcdd2
    style DNS fill:#ffcdd2
    style SEC fill:#ffcdd2
```

## 2. Request Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant MCP Server
    participant Auth
    participant Service
    participant Cache
    participant Akamai API
    
    User->>Claude: "Create property for example.com"
    Claude->>MCP Server: tool.property.create
    
    MCP Server->>Auth: Validate request
    Auth->>Auth: Load EdgeRC config
    Auth->>Auth: Get account switch key
    Auth-->>MCP Server: Auth context
    
    MCP Server->>Service: Execute property.create
    
    Service->>Cache: Check cache
    Cache-->>Service: Cache miss
    
    Service->>Akamai API: POST /papi/v1/properties
    Note over Akamai API: EdgeGrid Auth Headers
    Akamai API-->>Service: Property created
    
    Service->>Cache: Store result
    Service-->>MCP Server: Property details
    
    MCP Server-->>Claude: Formatted response
    Claude-->>User: "Created property prp_123456"
```

## 3. Multi-Customer Authentication Flow

```mermaid
graph LR
    subgraph "Request"
        REQ[MCP Request]
        CID[Customer ID]
    end
    
    subgraph "EdgeRC Configuration"
        DEFAULT[.edgerc:default]
        PROD[.edgerc:production]
        STG[.edgerc:staging]
        CUSTOM[.edgerc:customer-x]
    end
    
    subgraph "Account Resolution"
        AR[Account Resolver]
        ASK[Account Switch Key]
    end
    
    subgraph "API Request"
        HEADERS[Auth Headers]
        QUERY[Query Params]
        API[Akamai API]
    end
    
    REQ --> CID
    CID --> AR
    
    AR --> DEFAULT
    AR --> PROD
    AR --> STG
    AR --> CUSTOM
    
    AR --> ASK
    ASK --> QUERY
    
    DEFAULT --> HEADERS
    PROD --> HEADERS
    STG --> HEADERS
    CUSTOM --> HEADERS
    
    HEADERS --> API
    QUERY --> API
    
    style CID fill:#e3f2fd
    style ASK fill:#fff3e0
    style API fill:#ffcdd2
```

## 4. Caching Strategy

```mermaid
graph TB
    subgraph "Request Layer"
        R1[Request 1]
        R2[Request 2]
        R3[Request 3]
    end
    
    subgraph "Smart Cache"
        subgraph "Request Coalescing"
            RC[Coalescer]
            PQ[Pending Queue]
        end
        
        subgraph "Cache Storage"
            MEM[In-Memory Store]
            COMP[Compressed Storage]
            TTL[TTL Manager]
        end
        
        subgraph "Features"
            NEG[Negative Cache]
            BLOOM[Bloom Filter]
            SEG[Segmentation]
            EVICT[LRU-K Eviction]
        end
    end
    
    subgraph "External Cache (Optional)"
        REDIS[Redis/Valkey]
        CLUSTER[Cluster Mode]
    end
    
    subgraph "Origin"
        API[Akamai API]
    end
    
    R1 --> RC
    R2 --> RC
    R3 --> RC
    
    RC --> PQ
    PQ --> MEM
    
    MEM --> COMP
    MEM --> TTL
    MEM --> SEG
    
    MEM -.->|miss| API
    MEM -.->|overflow| REDIS
    
    REDIS --> CLUSTER
    
    NEG --> BLOOM
    BLOOM --> MEM
    
    SEG --> EVICT
    
    style R1 fill:#e3f2fd
    style R2 fill:#e3f2fd
    style R3 fill:#e3f2fd
    style API fill:#ffcdd2
    style REDIS fill:#fff3e0
```

## 5. Tool Registration and Discovery

```mermaid
graph LR
    subgraph "Tool Definitions"
        PT[Property Tools]
        CT[Certificate Tools]
        DT[DNS Tools]
        ST[Security Tools]
    end
    
    subgraph "Tool Registry"
        REG[Registry]
        META[Metadata]
        SCHEMA[JSON Schema]
    end
    
    subgraph "MCP Protocol"
        DISC[tools/list]
        EXEC[tools/call]
    end
    
    subgraph "Validation"
        ZOD[Zod Schemas]
        CONV[Schema Converter]
        VAL[Validator]
    end
    
    PT --> REG
    CT --> REG
    DT --> REG
    ST --> REG
    
    REG --> META
    REG --> SCHEMA
    
    DISC --> REG
    EXEC --> VAL
    
    ZOD --> CONV
    CONV --> SCHEMA
    SCHEMA --> VAL
    
    style DISC fill:#c8e6c9
    style EXEC fill:#c8e6c9
    style VAL fill:#fff3e0
```

## 6. Property Activation Workflow

```mermaid
stateDiagram-v2
    [*] --> Created: Create Property
    Created --> Configured: Add Rules
    Configured --> Validated: Validate Rules
    
    Validated --> Activating_Staging: Activate to Staging
    Activating_Staging --> Staging_Active: Activation Complete
    
    Staging_Active --> Testing: Run Tests
    Testing --> Validated_Production: Tests Pass
    Testing --> Configured: Tests Fail
    
    Validated_Production --> Activating_Production: Activate to Production
    Activating_Production --> Production_Active: Activation Complete
    
    Production_Active --> [*]
    
    note right of Activating_Staging
        Takes 5-10 minutes
        Progress reported via MCP
    end note
    
    note right of Activating_Production
        Takes 15-30 minutes
        Requires approval
        Can be cancelled
    end note
```

## 7. Certificate Validation Process

```mermaid
graph TB
    subgraph "Certificate Enrollment"
        ENROLL[Create Enrollment]
        DOMAINS[Add Domains]
        CONTACT[Set Contacts]
    end
    
    subgraph "Validation Methods"
        DV[Domain Validation]
        DNS01[DNS Challenge]
        HTTP01[HTTP Challenge]
        EMAIL[Email Challenge]
    end
    
    subgraph "Automated Validation"
        CHECK[Check Zone Control]
        CREATE[Create TXT Record]
        VERIFY[Verify Propagation]
        TRIGGER[Trigger Validation]
    end
    
    subgraph "Monitoring"
        STATUS[Check Status]
        RETRY[Retry Failed]
        ALERT[Alert on Issues]
    end
    
    subgraph "Deployment"
        READY[Certificate Ready]
        DEPLOY[Deploy to Network]
        LINK[Link to Properties]
    end
    
    ENROLL --> DOMAINS
    DOMAINS --> CONTACT
    CONTACT --> DV
    
    DV --> DNS01
    DV --> HTTP01
    DV --> EMAIL
    
    DNS01 --> CHECK
    CHECK -->|Has Control| CREATE
    CHECK -->|No Control| EMAIL
    
    CREATE --> VERIFY
    VERIFY --> TRIGGER
    
    TRIGGER --> STATUS
    STATUS -->|Failed| RETRY
    STATUS -->|Success| READY
    
    RETRY --> ALERT
    RETRY --> CREATE
    
    READY --> DEPLOY
    DEPLOY --> LINK
    
    style ENROLL fill:#e3f2fd
    style READY fill:#c8e6c9
    style ALERT fill:#ffcdd2
```

## 8. Error Handling Flow

```mermaid
graph TB
    subgraph "Error Sources"
        API[API Error]
        NET[Network Error]
        VAL[Validation Error]
        AUTH[Auth Error]
    end
    
    subgraph "Error Classification"
        CLASS[Classifier]
        RET[Retryable?]
        SEV[Severity]
    end
    
    subgraph "Error Handling"
        MAP[MCP Error Mapper]
        LOG[Logger]
        METRIC[Metrics]
    end
    
    subgraph "Recovery Strategies"
        RETRY[Retry Logic]
        BACK[Backoff]
        CIRCUIT[Circuit Breaker]
        FALLBACK[Fallback]
    end
    
    subgraph "Client Response"
        USER[User Message]
        TECH[Technical Details]
        SUGGEST[Suggestions]
    end
    
    API --> CLASS
    NET --> CLASS
    VAL --> CLASS
    AUTH --> CLASS
    
    CLASS --> RET
    CLASS --> SEV
    
    RET -->|Yes| RETRY
    RET -->|No| MAP
    
    RETRY --> BACK
    BACK --> CIRCUIT
    CIRCUIT -->|Open| FALLBACK
    CIRCUIT -->|Closed| API
    
    MAP --> LOG
    MAP --> METRIC
    
    MAP --> USER
    MAP --> TECH
    MAP --> SUGGEST
    
    style API fill:#ffcdd2
    style NET fill:#ffcdd2
    style VAL fill:#fff3e0
    style AUTH fill:#fff3e0
    style USER fill:#c8e6c9
```

## 9. Service Orchestration

```mermaid
graph TB
    subgraph "User Intent"
        INTENT[Secure my website]
    end
    
    subgraph "Workflow Orchestrator"
        ANALYZE[Analyze Requirements]
        PLAN[Create Plan]
        COORD[Coordinate Services]
    end
    
    subgraph "Service Execution"
        subgraph "Phase 1: Setup"
            PROP[Create Property]
            HOST[Add Hostnames]
            RULES[Configure Rules]
        end
        
        subgraph "Phase 2: Security"
            CERT[Create Certificate]
            VAL[Validate Domains]
            DEPLOY[Deploy Cert]
        end
        
        subgraph "Phase 3: Activation"
            TEST[Test Config]
            STAGE[Activate Staging]
            PROD[Activate Production]
        end
    end
    
    subgraph "Progress Reporting"
        PROG[Progress Manager]
        UPDATE[Status Updates]
        COMPLETE[Completion]
    end
    
    INTENT --> ANALYZE
    ANALYZE --> PLAN
    PLAN --> COORD
    
    COORD --> PROP
    PROP --> HOST
    HOST --> RULES
    
    COORD --> CERT
    CERT --> VAL
    VAL --> DEPLOY
    
    RULES --> TEST
    DEPLOY --> TEST
    TEST --> STAGE
    STAGE --> PROD
    
    PROP --> PROG
    CERT --> PROG
    STAGE --> PROG
    
    PROG --> UPDATE
    UPDATE --> COMPLETE
    
    style INTENT fill:#e3f2fd
    style COMPLETE fill:#c8e6c9
```

## 10. Production Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[AWS ALB / Azure LB]
    end
    
    subgraph "Container Orchestration"
        subgraph "Kubernetes Cluster"
            subgraph "MCP Pods"
                P1[Pod 1]
                P2[Pod 2]
                P3[Pod 3]
            end
            
            SVC[Service]
            ING[Ingress]
            CM[ConfigMap]
            SEC[Secrets]
        end
    end
    
    subgraph "Persistent Storage"
        subgraph "Cache Layer"
            RC[Redis Cluster]
            SENT[Sentinel]
        end
        
        subgraph "Configuration"
            S3[S3 / Blob Storage]
            KV[Key Vault]
        end
    end
    
    subgraph "Monitoring"
        PROM[Prometheus]
        GRAF[Grafana]
        ALERT[AlertManager]
        TRACE[Jaeger]
    end
    
    subgraph "External Services"
        AKAMAI[Akamai APIs]
        AUTH[OAuth Provider]
    end
    
    LB --> ING
    ING --> SVC
    SVC --> P1
    SVC --> P2
    SVC --> P3
    
    P1 --> RC
    P2 --> RC
    P3 --> RC
    
    RC --> SENT
    
    P1 --> S3
    P2 --> KV
    
    P1 --> AKAMAI
    P2 --> AKAMAI
    P3 --> AKAMAI
    
    P1 --> PROM
    P2 --> PROM
    P3 --> PROM
    
    PROM --> GRAF
    PROM --> ALERT
    
    P1 --> TRACE
    
    CM --> P1
    SEC --> P1
    
    style LB fill:#e3f2fd
    style AKAMAI fill:#ffcdd2
    style PROM fill:#c8e6c9
```

## Implementation Notes

### Rendering These Diagrams

1. **In Markdown**: Most modern markdown renderers support Mermaid
2. **In Documentation Sites**: Docusaurus, GitBook, etc. have Mermaid plugins
3. **In GitHub**: GitHub natively renders Mermaid in markdown files
4. **In IDEs**: VS Code extensions like "Markdown Preview Mermaid Support"

### Maintaining Diagrams

1. **Version Control**: Store diagrams as code in the repository
2. **Update Process**: Update diagrams when architecture changes
3. **Review**: Include diagram updates in code reviews
4. **Testing**: Validate diagram syntax in CI/CD

### Creating New Diagrams

```bash
# Template for new architecture diagram
cat > new-diagram.md << 'EOF'
```mermaid
graph TB
    subgraph "Component Name"
        A[Element A]
        B[Element B]
    end
    
    A --> B
    
    style A fill:#e3f2fd
    style B fill:#c8e6c9
```
EOF
```

### Style Guide

- **Blue (#e3f2fd)**: Client/Input elements
- **Green (#c8e6c9)**: Success/Output elements
- **Orange (#fff3e0)**: Processing/Cache elements
- **Red (#ffcdd2)**: External/API elements
- **Purple (#e1bee7)**: Security/Auth elements

## Interactive Visualizations

For more complex visualizations, consider:

1. **D3.js Dashboards**: Real-time metrics and flow visualization
2. **Swagger UI**: Interactive API documentation
3. **Grafana**: Operational dashboards
4. **Draw.io**: Collaborative diagram editing
5. **PlantUML**: More detailed UML diagrams

These visual representations ensure that anyone can understand the ALECS MCP Server architecture at a glance, making onboarding faster and architectural decisions clearer.