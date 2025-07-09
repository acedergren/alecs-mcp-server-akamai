# ALECS Operations Runbook

**Production Operations and Incident Response Guide**

## 🚨 Emergency Procedures

### Incident Response Escalation

**Severity Levels:**
- **P0 (Critical)**: Complete service outage, data loss
- **P1 (High)**: Major functionality impaired, significant user impact
- **P2 (Medium)**: Minor functionality issues, limited user impact
- **P3 (Low)**: Non-critical issues, minimal user impact

**Response Times:**
- P0: 15 minutes
- P1: 1 hour
- P2: 4 hours
- P3: 24 hours

### P0 Critical Incident Response

```bash
# 1. Immediate Assessment
kubectl get pods -n alecs -o wide
kubectl get events -n alecs --sort-by='.lastTimestamp'
kubectl logs -f deployment/alecs-server -n alecs --tail=100

# 2. Quick Recovery Actions
# Scale up replicas
kubectl scale deployment alecs-server --replicas=5 -n alecs

# Restart pods if necessary
kubectl rollout restart deployment/alecs-server -n alecs

# Check external dependencies
curl -f https://test-host.luna.akamaiapis.net/papi/v1/contracts

# 3. Communication
# Post in incident channel
# Update status page
# Notify stakeholders
```

## 📊 Monitoring and Alerting

### Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold | Critical Threshold |
|--------|--------|-----------------|-------------------|
| **Uptime** | 99.9% | < 99.5% | < 99% |
| **Response Time (p95)** | < 500ms | > 1s | > 3s |
| **Error Rate** | < 0.1% | > 0.5% | > 1% |
| **Cache Hit Rate** | > 80% | < 70% | < 50% |
| **Memory Usage** | < 70% | > 80% | > 90% |
| **CPU Usage** | < 60% | > 70% | > 85% |

### Health Check Endpoints

```bash
# Basic health check
curl -f https://alecs.your-domain.com/health

# Detailed health with dependencies
curl -s https://alecs.your-domain.com/health/detailed | jq

# Metrics for Prometheus
curl -s https://alecs.your-domain.com/metrics

# Tool validation status
curl -s https://alecs.your-domain.com/tools/validate
```

### Alert Configurations

**Prometheus Alerting Rules:**
```yaml
groups:
- name: alecs.alerts
  rules:
  - alert: ALECSDown
    expr: up{job="alecs"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "ALECS service is down"
      description: "ALECS service has been down for more than 1 minute"
      
  - alert: ALECSHighErrorRate
    expr: rate(alecs_requests_total{status=~"5.."}[5m]) > 0.01
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"
      
  - alert: ALECSHighLatency
    expr: histogram_quantile(0.95, rate(alecs_request_duration_seconds_bucket[5m])) > 3
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "95th percentile latency is {{ $value }}s"
      
  - alert: ALECSLowCacheHitRate
    expr: rate(alecs_cache_hits_total[5m]) / rate(alecs_cache_requests_total[5m]) < 0.5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Low cache hit rate"
      description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

## 🔧 Common Operations

### Deployment Operations

**Rolling Update:**
```bash
# Update image version
kubectl set image deployment/alecs-server alecs=ghcr.io/acedergren/alecs-mcp-server-akamai:1.7.5 -n alecs

# Monitor rollout
kubectl rollout status deployment/alecs-server -n alecs

# Verify health after deployment
kubectl exec -it deployment/alecs-server -n alecs -- curl -f http://localhost:8080/health
```

**Rollback Deployment:**
```bash
# Check rollout history
kubectl rollout history deployment/alecs-server -n alecs

# Rollback to previous version
kubectl rollout undo deployment/alecs-server -n alecs

# Rollback to specific revision
kubectl rollout undo deployment/alecs-server --to-revision=2 -n alecs
```

### Scaling Operations

**Manual Scaling:**
```bash
# Scale up for high load
kubectl scale deployment alecs-server --replicas=10 -n alecs

# Scale down during low traffic
kubectl scale deployment alecs-server --replicas=3 -n alecs

# Check current scaling
kubectl get hpa -n alecs
```

**Auto-Scaling Configuration:**
```yaml
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
  maxReplicas: 20
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
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Configuration Management

**Update Configuration:**
```bash
# Update ConfigMap
kubectl patch configmap alecs-config -n alecs -p '{"data":{"LOG_LEVEL":"debug"}}'

# Restart pods to pick up new config
kubectl rollout restart deployment/alecs-server -n alecs

# Update secrets
kubectl create secret generic alecs-credentials \
  --from-file=edgerc=.edgerc \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Environment Variables:**
```bash
# Common configuration updates
kubectl set env deployment/alecs-server CACHE_ENABLED=true -n alecs
kubectl set env deployment/alecs-server LOG_LEVEL=info -n alecs
kubectl set env deployment/alecs-server RATE_LIMIT_ENABLED=true -n alecs
```

## 🔍 Troubleshooting Guide

### Common Issues and Solutions

#### Issue: High Memory Usage

**Symptoms:**
- Memory usage > 90%
- OOMKilled events in pod logs
- Slow response times

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods -n alecs

# Check for memory leaks
kubectl exec -it deployment/alecs-server -n alecs -- node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"

# Review heap dump (if available)
kubectl exec -it deployment/alecs-server -n alecs -- node -e "require('v8').writeHeapSnapshot('./heap.snapshot')"
```

**Solutions:**
```bash
# Immediate: Increase memory limits
kubectl patch deployment alecs-server -n alecs -p '{"spec":{"template":{"spec":{"containers":[{"name":"alecs","resources":{"limits":{"memory":"8Gi"}}}]}}}}'

# Long-term: Optimize cache settings
kubectl set env deployment/alecs-server CACHE_MAX_SIZE=5000 -n alecs
kubectl set env deployment/alecs-server CACHE_TTL=300 -n alecs

# Restart to clear memory
kubectl rollout restart deployment/alecs-server -n alecs
```

#### Issue: High CPU Usage

**Symptoms:**
- CPU usage > 85%
- CPU throttling events
- Slow response times

**Diagnosis:**
```bash
# Check CPU usage
kubectl top pods -n alecs

# Check for CPU throttling
kubectl describe pods -n alecs | grep -A 5 -B 5 "cpu"

# Profile application (if profiling enabled)
curl -s http://alecs-service/debug/pprof/profile?seconds=30 > cpu.prof
```

**Solutions:**
```bash
# Scale horizontally
kubectl scale deployment alecs-server --replicas=6 -n alecs

# Increase CPU limits
kubectl patch deployment alecs-server -n alecs -p '{"spec":{"template":{"spec":{"containers":[{"name":"alecs","resources":{"limits":{"cpu":"4000m"}}}]}}}}'

# Enable request coalescing
kubectl set env deployment/alecs-server COALESCING_ENABLED=true -n alecs
```

#### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Timeout errors
- Authentication failures

**Diagnosis:**
```bash
# Test connection from pod
kubectl exec -it deployment/alecs-server -n alecs -- curl -f https://test-host.luna.akamaiapis.net/papi/v1/contracts

# Check DNS resolution
kubectl exec -it deployment/alecs-server -n alecs -- nslookup test-host.luna.akamaiapis.net

# Verify credentials
kubectl get secret alecs-credentials -n alecs -o yaml | base64 -d
```

**Solutions:**
```bash
# Restart pods to refresh connections
kubectl rollout restart deployment/alecs-server -n alecs

# Update connection pool settings
kubectl set env deployment/alecs-server CONNECTION_POOL_SIZE=20 -n alecs
kubectl set env deployment/alecs-server CONNECTION_TIMEOUT=30000 -n alecs

# Rotate credentials if needed
kubectl create secret generic alecs-credentials \
  --from-file=edgerc=.edgerc \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### Issue: Cache Performance Problems

**Symptoms:**
- Low cache hit rate (< 50%)
- Slow response times
- High API request volume

**Diagnosis:**
```bash
# Check cache metrics
curl -s http://alecs-service/metrics | grep cache

# Review cache configuration
kubectl describe configmap alecs-config -n alecs

# Check cache size and eviction
kubectl logs deployment/alecs-server -n alecs | grep cache
```

**Solutions:**
```bash
# Optimize cache settings
kubectl set env deployment/alecs-server CACHE_MAX_SIZE=20000 -n alecs
kubectl set env deployment/alecs-server CACHE_DEFAULT_TTL=600 -n alecs

# Enable distributed caching
kubectl apply -f redis-deployment.yaml
kubectl set env deployment/alecs-server REDIS_URL=redis://redis:6379 -n alecs

# Clear cache if corrupted
kubectl exec -it deployment/alecs-server -n alecs -- curl -X POST http://localhost:8080/admin/cache/clear
```

### Log Analysis

**Common Log Patterns:**
```bash
# Error rate analysis
kubectl logs deployment/alecs-server -n alecs | grep ERROR | tail -20

# Performance analysis
kubectl logs deployment/alecs-server -n alecs | grep "duration=" | awk '{print $NF}' | sort -n

# Authentication issues
kubectl logs deployment/alecs-server -n alecs | grep "401\|403"

# Cache performance
kubectl logs deployment/alecs-server -n alecs | grep "cache_hit\|cache_miss"
```

**Log Aggregation Queries (if using ELK/Splunk):**
```
# Error rate by endpoint
source="alecs" level="error" | stats count by endpoint

# Average response time by tool
source="alecs" tool=* | stats avg(duration) by tool

# Cache hit rate
source="alecs" cache_hit=* | stats count by cache_hit
```

## 🔄 Maintenance Procedures

### Regular Maintenance Tasks

**Daily:**
```bash
#!/bin/bash
# daily-maintenance.sh

# Check service health
kubectl get pods -n alecs
kubectl get events -n alecs --sort-by='.lastTimestamp' | tail -20

# Review error logs
kubectl logs deployment/alecs-server -n alecs | grep ERROR | tail -10

# Check resource usage
kubectl top pods -n alecs
kubectl top nodes

# Verify external connectivity
kubectl exec -it deployment/alecs-server -n alecs -- curl -f https://test-host.luna.akamaiapis.net/papi/v1/contracts
```

**Weekly:**
```bash
#!/bin/bash
# weekly-maintenance.sh

# Update dependencies
kubectl set image deployment/alecs-server alecs=ghcr.io/acedergren/alecs-mcp-server-akamai:latest -n alecs

# Clean up old logs
kubectl delete pods -n alecs --field-selector=status.phase=Succeeded

# Review and clean up unused resources
kubectl get pv | grep Released
kubectl get events -n alecs --sort-by='.lastTimestamp'

# Security scan
kubectl exec -it deployment/alecs-server -n alecs -- npm audit
```

**Monthly:**
```bash
#!/bin/bash
# monthly-maintenance.sh

# Rotate credentials
kubectl create secret generic alecs-credentials-new \
  --from-file=edgerc=.edgerc \
  --dry-run=client -o yaml | kubectl apply -f -

# Update TLS certificates
kubectl get certificates -n alecs
kubectl describe certificate alecs-tls -n alecs

# Performance review
kubectl get hpa -n alecs -o wide
kubectl describe hpa alecs-hpa -n alecs

# Disaster recovery test
kubectl create backup alecs-backup-$(date +%Y%m%d)
```

### Backup and Recovery

**Backup Procedures:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/alecs-$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Kubernetes configurations
kubectl get all -n alecs -o yaml > $BACKUP_DIR/alecs-resources.yaml
kubectl get configmaps -n alecs -o yaml > $BACKUP_DIR/configmaps.yaml
kubectl get ingress -n alecs -o yaml > $BACKUP_DIR/ingress.yaml

# Backup secrets (encrypted)
kubectl get secrets -n alecs -o yaml | \
  gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
      --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
      --symmetric --output $BACKUP_DIR/secrets.gpg

# Backup application logs
kubectl logs deployment/alecs-server -n alecs --since=24h > $BACKUP_DIR/application.log

# Upload to S3/GCS
aws s3 sync $BACKUP_DIR s3://alecs-backups/$DATE/
```

**Recovery Procedures:**
```bash
#!/bin/bash
# recover.sh

BACKUP_DATE=$1
BACKUP_PATH="/backups/alecs-$BACKUP_DATE"

# Restore namespace
kubectl apply -f $BACKUP_PATH/alecs-resources.yaml

# Restore secrets
gpg --decrypt $BACKUP_PATH/secrets.gpg | kubectl apply -f -

# Restore configurations
kubectl apply -f $BACKUP_PATH/configmaps.yaml
kubectl apply -f $BACKUP_PATH/ingress.yaml

# Verify restoration
kubectl get pods -n alecs
kubectl logs deployment/alecs-server -n alecs
curl -f https://alecs.your-domain.com/health
```

## 📈 Performance Optimization

### Performance Tuning Checklist

**Application Level:**
- ✅ Enable caching with appropriate TTL
- ✅ Configure request coalescing
- ✅ Optimize connection pool size
- ✅ Enable compression for large responses
- ✅ Implement circuit breaker pattern

**Infrastructure Level:**
- ✅ Right-size resource requests/limits
- ✅ Configure horizontal pod autoscaling
- ✅ Use appropriate storage classes
- ✅ Optimize network policies
- ✅ Enable resource quotas

**Monitoring Level:**
- ✅ Set up comprehensive metrics
- ✅ Configure meaningful alerts
- ✅ Implement distributed tracing
- ✅ Enable log aggregation
- ✅ Set up dashboards

### Performance Monitoring

```bash
# Real-time performance monitoring
watch -n 5 'kubectl top pods -n alecs'

# Application metrics
curl -s http://alecs-service/metrics | grep -E "(alecs_request_duration|alecs_cache_hit_rate|alecs_requests_total)"

# Resource utilization trends
kubectl get events -n alecs --sort-by='.lastTimestamp' | grep -E "(FailedScheduling|OutOfmemory|Unhealthy)"
```

## 🚨 Security Operations

### Security Monitoring

**Daily Security Checks:**
```bash
# Check for security vulnerabilities
kubectl exec -it deployment/alecs-server -n alecs -- npm audit --audit-level moderate

# Verify TLS certificates
kubectl get certificates -n alecs
kubectl describe certificate alecs-tls -n alecs

# Check for unauthorized access attempts
kubectl logs deployment/alecs-server -n alecs | grep -E "(401|403|429)"

# Review network policies
kubectl get networkpolicies -n alecs
```

**Security Incident Response:**
```bash
# Immediate isolation
kubectl patch networkpolicy alecs-network-policy -n alecs -p '{"spec":{"ingress":[]}}'

# Rotate all credentials
kubectl delete secret alecs-credentials -n alecs
kubectl create secret generic alecs-credentials --from-file=edgerc=.edgerc.new -n alecs

# Scale down to investigate
kubectl scale deployment alecs-server --replicas=1 -n alecs

# Collect forensic data
kubectl logs deployment/alecs-server -n alecs --since=1h > incident-logs.txt
kubectl get events -n alecs --sort-by='.lastTimestamp' > incident-events.txt
```

## 📞 Support and Escalation

### Contact Information

**Internal Escalation:**
- **L1 Support**: On-call rotation
- **L2 Engineering**: Development team
- **L3 Architecture**: Senior engineers
- **Management**: Engineering managers

**External Dependencies:**
- **Akamai Support**: support.akamai.com
- **Cloud Provider**: AWS/GCP/Azure support
- **Kubernetes**: Community forums

### Runbook Updates

This runbook should be updated:
- After each incident (lessons learned)
- When new features are deployed
- When infrastructure changes occur
- Monthly review and validation

**Update Process:**
1. Document changes in Git
2. Review with team
3. Test procedures in staging
4. Update training materials
5. Communicate changes to operations team

---

This operations runbook provides comprehensive guidance for maintaining ALECS in production environments. Regular review and practice of these procedures ensures rapid incident response and reliable service operation.