---
name: "MCP UX: Rollback Tools"
about: Add undo/rollback capabilities for destructive operations
title: "Implement rollback capabilities for critical operations"
labels: enhancement, safety, priority:critical
assignees: ''

---

## Description
Add undo/rollback tools for all destructive or state-changing operations to improve safety and user confidence.

## Requirements

### Property Rollback
- [ ] `property.rollback` - Revert property to previous version
  ```typescript
  {
    "propertyId": "prp_123456",
    "targetVersion": 5,  // optional, defaults to previous
    "customer": "production"
  }
  ```

### DNS Rollback
- [ ] `dns.rollback` - Undo recent DNS changes
  ```typescript
  {
    "zone": "example.com",
    "targetVersion": "2.0.0",  // optional
    "recordTypes": ["A", "CNAME"],  // optional filter
    "customer": "production"
  }
  ```

### Activation Control
- [ ] `activation.cancel` - Cancel in-progress activations
  ```typescript
  {
    "activationId": "atv_5678",
    "type": "property",  // or "dns"
    "reason": "Found configuration error",
    "customer": "production"
  }
  ```

### Network List Restore
- [ ] `network-list.restore` - Restore previous network list state
  ```typescript
  {
    "networkListId": "12345_IPBLOCKLIST",
    "targetVersion": 3,
    "customer": "production"
  }
  ```

### Certificate Rollback
- [ ] `certificate.rollback` - Revert certificate deployment
  ```typescript
  {
    "enrollmentId": 12345,
    "targetVersion": 2,
    "customer": "production"
  }
  ```

## Safety Features
- [ ] Audit trail for all rollbacks
- [ ] Dry-run mode to preview changes
- [ ] Time limits (e.g., can only rollback within 24 hours)
- [ ] Clear indication of non-reversible operations
- [ ] Confirmation with change summary

## Implementation Notes
```typescript
// Example rollback response
{
  "success": true,
  "rollbackDetails": {
    "from": { "version": 7, "activatedAt": "2024-01-15T10:00:00Z" },
    "to": { "version": 5, "activatedAt": "2024-01-14T15:00:00Z" },
    "changes": [
      "- Removed caching rule for /api/*",
      "- Restored origin timeout to 30s",
      "+ Re-enabled compression"
    ],
    "newVersion": 8,  // Rollback creates new version
    "status": "pending_activation"
  }
}
```

## Rollback Limitations
- Some operations cannot be rolled back (document clearly)
- DNS changes propagate globally (rollback creates new forward change)
- Certificate rollbacks only for Enhanced TLS
- Rate limits still apply to rollback operations

## Acceptance Criteria
- [ ] All major state changes can be rolled back
- [ ] Rollback operations are atomic (all or nothing)
- [ ] Clear feedback on what was rolled back
- [ ] Rollback history is tracked
- [ ] Cannot rollback a rollback (prevent loops)