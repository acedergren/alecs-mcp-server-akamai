# ALECS Production Deployment Guide

**Complete guide for deploying ALECS to production environments**

## 🎯 Deployment Overview

ALECS supports multiple deployment patterns optimized for different use cases:

- **Local Development**: Direct Node.js with stdio transport
- **Cloud Deployment**: Docker containers with HTTP transport
- **Enterprise**: Kubernetes with service mesh and monitoring
- **Edge Deployment**: CDN integration with edge computing

## 🏗️ Infrastructure Requirements

### Minimum Requirements

| Component | Specification | Notes |
|-----------|---------------|--------|
| **CPU** | 2 vCPU | 4+ vCPU recommended for production |
| **Memory** | 2GB RAM | 4GB+ recommended for high load |
| **Storage** | 10GB | Logs and cache storage |
| **Network** | 1Gbps | Outbound to `*.luna.akamaiapis.net` |
| **Node.js** | 18.0+ | LTS version recommended |

### Production Requirements

| Component | Specification | Notes |
|-----------|---------------|--------|
| **CPU** | 4+ vCPU | Auto-scaling based on load |
| **Memory** | 8GB RAM | With connection pooling and cache |
| **Storage** | 50GB SSD | Fast I/O for cache and logs |
| **Network** | 10Gbps | High-throughput API operations |
| **Load Balancer** | L7 capable | HTTP/2 and WebSocket support |

## 🐳 Docker Deployment

### Official Images

```bash
# Full server with all tools
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:latest

# Optimized variants
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:streamable-http
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:websocket
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:modular
```

### Basic Docker Deployment

```bash
# Create environment file
cat > .env << EOF
# Transport Configuration
MCP_TRANSPORT=streamable-http
HTTP_PORT=8080
HTTP_HOST=0.0.0.0
CORS_ENABLED=true

# Performance Configuration
CACHE_ENABLED=true
CACHE_MAX_SIZE=10000
CACHE_DEFAULT_TTL=300
CONNECTION_POOL_SIZE=50

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true

# Security
AUTH_TYPE=token
RATE_LIMIT_ENABLED=true
EOF

# Run container
docker run -d \
  --name alecs-server \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  -v ~/.edgerc:/app/.edgerc:ro \
  -v alecs-logs:/app/logs \
  ghcr.io/acedergren/alecs-mcp-server-akamai:latest
```

### Docker Compose (Recommended)

```yaml
# docker-compose.yml
version: '3.8'

services:
  alecs:
    image: ghcr.io/acedergren/alecs-mcp-server-akamai:latest
    container_name: alecs-server
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - MCP_TRANSPORT=streamable-http
      - HTTP_PORT=8080
      - HTTP_HOST=0.0.0.0
      - CORS_ENABLED=true
      - CACHE_ENABLED=true
      - LOG_LEVEL=info
      - METRICS_ENABLED=true
    volumes:
      - ~/.edgerc:/app/.edgerc:ro
      - alecs-logs:/app/logs
      - alecs-cache:/app/cache
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - alecs-network

  # Optional: Redis for distributed caching
  redis:
    image: redis:7-alpine
    container_name: alecs-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - alecs-network
    command: redis-server --appendonly yes

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: alecs-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - alecs
    networks:
      - alecs-network

volumes:
  alecs-logs:
  alecs-cache:
  redis-data:

networks:
  alecs-network:
    driver: bridge
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream alecs {
        server alecs:8080;
        keepalive 32;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        # ALECS proxy
        location / {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://alecs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Health check endpoint
        location /health {
            proxy_pass http://alecs/health;
            access_log off;
        }
    }
}
```

## ☸️ Kubernetes Deployment

### Complete Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: alecs
  labels:
    app: alecs
    version: v1.7.4

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alecs-config
  namespace: alecs
data:
  MCP_TRANSPORT: "streamable-http"
  HTTP_PORT: "8080"
  HTTP_HOST: "0.0.0.0"
  CORS_ENABLED: "true"
  CACHE_ENABLED: "true"
  LOG_LEVEL: "info"
  METRICS_ENABLED: "true"

---
# secret.yaml (create with kubectl create secret)
apiVersion: v1
kind: Secret
metadata:
  name: alecs-credentials
  namespace: alecs
type: Opaque
data:
  edgerc: |
    # Base64 encoded .edgerc content
    # echo -n "$(cat ~/.edgerc)" | base64

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alecs-server
  namespace: alecs
  labels:
    app: alecs
    version: v1.7.4
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: alecs
  template:
    metadata:
      labels:
        app: alecs
        version: v1.7.4
    spec:
      containers:
      - name: alecs
        image: ghcr.io/acedergren/alecs-mcp-server-akamai:1.7.4
        ports:
        - containerPort: 8080
          name: http
        envFrom:
        - configMapRef:
            name: alecs-config
        volumeMounts:
        - name: edgerc
          mountPath: /app/.edgerc
          subPath: edgerc
          readOnly: true
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
      volumes:
      - name: edgerc
        secret:
          secretName: alecs-credentials
      terminationGracePeriodSeconds: 30

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: alecs-service
  namespace: alecs
  labels:
    app: alecs
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: alecs

---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alecs-hpa
  namespace: alecs
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alecs-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alecs-ingress
  namespace: alecs
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - alecs.your-domain.com
    secretName: alecs-tls
  rules:
  - host: alecs.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: alecs-service
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Create namespace and deploy
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml

# Create secret with credentials
kubectl create secret generic alecs-credentials \
  --from-file=edgerc=$HOME/.edgerc \
  --namespace=alecs

# Deploy application
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml

# Verify deployment
kubectl get pods -n alecs
kubectl get svc -n alecs
kubectl logs -f deployment/alecs-server -n alecs
```

## 🚀 Cloud Provider Deployments

### AWS ECS Deployment

```json
{
  "family": "alecs-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/alecsTaskRole",
  "containerDefinitions": [
    {
      "name": "alecs",
      "image": "ghcr.io/acedergren/alecs-mcp-server-akamai:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "MCP_TRANSPORT", "value": "streamable-http"},
        {"name": "HTTP_PORT", "value": "8080"},
        {"name": "CACHE_ENABLED", "value": "true"}
      ],
      "secrets": [
        {
          "name": "EDGERC_CONTENT",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:alecs/edgerc"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alecs-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Google Cloud Run

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: alecs-server
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/cpu-throttling: "false"
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu: "2"
        run.googleapis.com/memory: "4Gi"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: ghcr.io/acedergren/alecs-mcp-server-akamai:latest
        ports:
        - containerPort: 8080
        env:
        - name: MCP_TRANSPORT
          value: streamable-http
        - name: HTTP_PORT
          value: "8080"
        - name: CACHE_ENABLED
          value: "true"
        - name: EDGERC_CONTENT
          valueFrom:
            secretKeyRef:
              name: alecs-credentials
              key: edgerc
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
          requests:
            cpu: "1"
            memory: "2Gi"
```

Deploy with:
```bash
gcloud run services replace cloudrun.yaml --region=us-central1
```

### Azure Container Instances

```yaml
# azure-container.yaml
apiVersion: 2019-12-01
location: eastus
name: alecs-server
properties:
  containers:
  - name: alecs
    properties:
      image: ghcr.io/acedergren/alecs-mcp-server-akamai:latest
      ports:
      - port: 8080
        protocol: TCP
      environmentVariables:
      - name: MCP_TRANSPORT
        value: streamable-http
      - name: HTTP_PORT
        value: "8080"
      - name: CACHE_ENABLED
        value: "true"
      - name: EDGERC_CONTENT
        secureValue: "[base64-encoded-edgerc-content]"
      resources:
        requests:
          cpu: 1.0
          memoryInGB: 2.0
        limits:
          cpu: 2.0
          memoryInGB: 4.0
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - protocol: TCP
      port: 8080
tags:
  environment: production
  application: alecs
```

## 🔐 Security Configuration

### TLS/SSL Setup

```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Production: Use Let's Encrypt with cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.11.0/cert-manager.yaml

# ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@your-domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Network Security

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: alecs-network-policy
  namespace: alecs
spec:
  podSelector:
    matchLabels:
      app: alecs
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS to Akamai APIs
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

### RBAC Configuration

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alecs-service-account
  namespace: alecs

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: alecs-role
  namespace: alecs
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: alecs-role-binding
  namespace: alecs
subjects:
- kind: ServiceAccount
  name: alecs-service-account
  namespace: alecs
roleRef:
  kind: Role
  name: alecs-role
  apiGroup: rbac.authorization.k8s.io
```

## 📊 Monitoring and Observability

### Prometheus Metrics

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: alecs-metrics
  namespace: alecs
  labels:
    app: alecs
spec:
  selector:
    matchLabels:
      app: alecs
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "ALECS MCP Server Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(alecs_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(alecs_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(alecs_cache_hits_total[5m]) / rate(alecs_cache_requests_total[5m])",
            "legendFormat": "Hit Rate"
          }
        ]
      }
    ]
  }
}
```

### Logging Configuration

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/alecs*.log
      pos_file /var/log/fluentd-alecs.log.pos
      tag kubernetes.alecs
      format json
      time_key time
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </source>
    
    <filter kubernetes.alecs>
      @type parser
      key_name log
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </filter>
    
    <match kubernetes.alecs>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name alecs-logs
      type_name _doc
    </match>
```

## 🔄 CI/CD Pipeline

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: alecs-server
        IMAGE_TAG: ${{ github.ref_name }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
    
    - name: Deploy to ECS
      run: |
        aws ecs update-service \
          --cluster production \
          --service alecs-server \
          --force-new-deployment
```

## 🚨 Backup and Disaster Recovery

### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh

# Backup Kubernetes configurations
kubectl get all -n alecs -o yaml > alecs-backup-$(date +%Y%m%d).yaml

# Backup secrets (encrypted)
kubectl get secrets -n alecs -o yaml | \
  gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
      --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
      --symmetric --output alecs-secrets-$(date +%Y%m%d).gpg

# Upload to S3
aws s3 cp alecs-backup-$(date +%Y%m%d).yaml s3://alecs-backups/
aws s3 cp alecs-secrets-$(date +%Y%m%d).gpg s3://alecs-backups/
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 15 minutes
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Daily automated backups
4. **Testing**: Monthly DR drills

**Recovery Steps**:
```bash
# 1. Restore from backup
kubectl apply -f alecs-backup-YYYYMMDD.yaml

# 2. Restore secrets
gpg --decrypt alecs-secrets-YYYYMMDD.gpg | kubectl apply -f -

# 3. Verify deployment
kubectl get pods -n alecs
kubectl logs -f deployment/alecs-server -n alecs

# 4. Run health checks
curl -f https://alecs.your-domain.com/health
```

## 📈 Performance Tuning

### Container Optimization

```dockerfile
# Optimized production Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs && \
    adduser -S alecs -u 1001
WORKDIR /app
COPY --from=builder --chown=alecs:nodejs /app/node_modules ./node_modules
COPY --chown=alecs:nodejs dist ./dist
COPY --chown=alecs:nodejs package.json ./

USER alecs
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
```

### Resource Limits

```yaml
# Production resource configuration
resources:
  requests:
    cpu: 1000m      # 1 CPU core minimum
    memory: 2Gi     # 2GB memory minimum
  limits:
    cpu: 4000m      # 4 CPU cores maximum
    memory: 8Gi     # 8GB memory maximum
```

## 🔍 Health Checks and Monitoring

### Health Check Endpoints

```bash
# Basic health check
curl -f http://localhost:8080/health

# Detailed health check
curl -s http://localhost:8080/health/detailed | jq

# Metrics endpoint
curl -s http://localhost:8080/metrics
```

### Alerting Rules

```yaml
# alerting-rules.yaml
groups:
- name: alecs.rules
  rules:
  - alert: ALECSHighErrorRate
    expr: rate(alecs_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: ALECSHighLatency
    expr: histogram_quantile(0.95, rate(alecs_request_duration_seconds_bucket[5m])) > 5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
```

---

This deployment guide provides comprehensive coverage for taking ALECS from development to production across multiple environments and deployment patterns. Follow the configuration examples and best practices to ensure reliable, scalable, and secure deployments.