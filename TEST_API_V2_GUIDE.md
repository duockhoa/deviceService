# SAP PM-lite Core - API V2 Testing Guide

## 🎯 Có 2 Cách Test API V2

### Cách 1: REST Client (VSCode Extension)

1. **Cài extension "REST Client"** trong VSCode
2. **Mở file** `test-api-v2.http`
3. **Thay token**: Tìm dòng `@token = YOUR_TOKEN_HERE` và thay bằng token thật
4. **Click "Send Request"** trên mỗi endpoint để test

### Cách 2: Automated Test Script

```bash
# Chạy toàn bộ test suite tự động
cd /home/binh/qltb/deviceService

# Set token và chạy
TOKEN="your_jwt_token_here" node test-api-v2-automated.js

# Hoặc với custom config
TOKEN="token" \
INCIDENT_ID=123 \
MAINTENANCE_ID=456 \
ASSET_ID=789 \
node test-api-v2-automated.js
```

## 📋 Test Cases Included

### Incidents V2 (7 tests)
1. ✓ Triage - Set notification_type (M1/M2/M3/M4)
2. ✓ Isolate - M1 → Asset DOWN
3. ✓ Assign to technician
4. ✓ Start work
5. ✓ Resolve incident
6. ✓ Close (M1 requires downtime_minutes)
7. ✓ Get status with asset context

### Maintenance V2 (7 tests)
8. ✓ Release - REL status (scope locked)
9. ✓ Start - Asset → MNTC
10. ✓ TECO - Cost locked
11. ✓ Close - Asset → AVLB
12. ✓ Get status with gates
13. ✓ Test scope lock enforcement (should fail)
14. ✓ Test cost lock enforcement (should fail)

### Reports V2 (5 tests)
15. ✓ MTBF/MTTR - M1 only
16. ✓ Availability - Uptime %
17. ✓ Planned vs Unplanned ratio
18. ✓ Backlog analysis
19. ✓ Complete KPI dashboard

### Backward Compatibility (2 tests)
20. ✓ V1 incidents API still works
21. ✓ V1 maintenance API still works

## 🔑 Lấy JWT Token

```bash
# Login để lấy token
curl -X POST http://localhost:3009/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# Copy token từ response
```

## 🧪 Test Flow Example

### Scenario: M1 Breakdown → Maintenance → Close

```bash
# 1. Triage as M1
POST /api/v2/incidents/1/triage
{ "notification_type": "M1", "severity": "critical" }
→ incident.notification_type = M1

# 2. Isolate (Asset → DOWN)
POST /api/v2/incidents/1/isolate
{ "downtime_minutes": 120 }
→ asset.operational_status = DOWN

# 3. Create maintenance work order
POST /api/v1/maintenance (use existing V1)

# 4. Release work order (REL → scope locked)
POST /api/v2/maintenance/1/release
→ maintenance.system_status = REL
→ scope_locked_at = now

# 5. Start work (Asset → MNTC)
POST /api/v2/maintenance/1/start
→ asset.operational_status = MNTC

# 6. Complete work (TECO → cost locked)
POST /api/v2/maintenance/1/teco
{ "actual_cost": 5000000 }
→ maintenance.system_status = TECO
→ cost_locked_at = now

# 7. Close work order (Asset → AVLB)
POST /api/v2/maintenance/1/close
→ asset.operational_status = AVLB

# 8. Check KPIs
GET /api/v2/reports/mtbf-mttr?asset_id=1
→ Only counts M1 incidents
```

## 📊 Expected Results

### Success Response Example
```json
{
  "success": true,
  "message": "Work order released successfully. Scope is now locked.",
  "data": {
    "maintenance": { ... },
    "transition": {
      "from_state": { "status": "approved", "system_status": "CRTD" },
      "to_state": { "status": "scheduled", "system_status": "REL" },
      "system_status": "REL",
      "side_effects": []
    },
    "gates": {
      "scope_locked": true,
      "scope_locked_at": "2025-12-25T10:30:00Z",
      "locked_fields": ["asset_id", "plan_id", "planned_date", "assigned_to"]
    }
  }
}
```

### Error Response Example (Gate Enforcement)
```json
{
  "success": false,
  "message": "Cannot modify scope fields (asset_id, plan_id, planned_date, assigned_to) after REL status. Scope is locked.",
  "locked_fields": ["asset_id", "plan_id", "planned_date", "assigned_to"],
  "system_status": "REL"
}
```

## 🐛 Troubleshooting

### Token Invalid
```bash
# Error: 401 Unauthorized
# Solution: Login lại để lấy token mới
```

### Entity Not Found
```bash
# Error: 404 Not Found
# Solution: Tạo test data trước hoặc đổi ID trong test
```

### Migration Not Run
```bash
# Error: Column 'notification_type' doesn't exist
# Solution: Chạy migrations
npx sequelize-cli db:migrate
```

### Service Not Running
```bash
# Error: ECONNREFUSED
# Solution: Start service
pm2 start deviceService
pm2 logs deviceService
```

## 📝 Notes

- **V1 API vẫn hoạt động** - backward compatible
- **V2 API yêu cầu auth** - phải có JWT token
- **Gates chỉ enforce cho records mới** - is_migrated_record=false
- **M1 only cho MTBF/MTTR** - M2/M3/M4 không tính
- **Side effects tự động** - asset status thay đổi khi transition

## 🚀 Quick Start

```bash
# 1. Login và lấy token
TOKEN=$(curl -s -X POST http://localhost:3009/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

# 2. Chạy automated tests
cd /home/binh/qltb/deviceService
TOKEN=$TOKEN node test-api-v2-automated.js

# 3. Xem kết quả
# ✓ Passed: 12
# ✗ Failed: 0
# Total: 12
```

Chúc test thành công! 🎉
