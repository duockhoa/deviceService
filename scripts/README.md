# RBAC Scripts - Hướng dẫn sử dụng

## Scripts Production

### 1. `reset-to-production.js`
**Mục đích:** Reset hệ thống về trạng thái production - chỉ user 947 là Admin, còn lại là Viewer

**Khi nào dùng:**
- Trước khi đưa lên production lần đầu
- Sau khi test xong muốn reset về mặc định
- Khi cần "làm sạch" tất cả role assignments

**Cách chạy:**
```bash
cd /home/binh/qltb/deviceService
node scripts/reset-to-production.js
```

**Kết quả:**
- User 947 (0947): Admin role → CÓ thể xem menu Phân quyền
- 181 users khác: Viewer role → KHÔNG thể xem menu Phân quyền
- Xóa các test roles (HR Manager, v.v.)

---

### 2. `summary-rbac-access.js`
**Mục đích:** Xem tổng quan ai có quyền truy cập menu Phân quyền

**Khi nào dùng:**
- Kiểm tra xem có bao nhiêu người có quyền quản lý RBAC
- Audit permissions
- Xác nhận sau khi gán/thu hồi quyền

**Cách chạy:**
```bash
cd /home/binh/qltb/deviceService
node scripts/summary-rbac-access.js
```

**Hiển thị:**
- Tổng số users
- Phân bổ roles (Admin, Manager, Technician, Viewer)
- Danh sách users có quyền `rbac.manage`
- Thống kê tổng kết

---

## Workflow Production

### Lần đầu đưa lên production:

1. **Reset về trạng thái production:**
   ```bash
   node scripts/reset-to-production.js
   ```

2. **Kiểm tra:**
   ```bash
   node scripts/summary-rbac-access.js
   ```

3. **Reload PM2:**
   ```bash
   pm2 reload ecosystem.config.js
   ```

4. **Thông báo users:**
   - Tất cả users cần F5/refresh trình duyệt để load permissions mới

---

### Cấp quyền quản lý RBAC cho người khác:

**Cách 1: Qua UI (Khuyến nghị)**
1. Đăng nhập với user 947 (Admin)
2. Vào menu "Phân quyền" (`/rbac`)
3. Tab "User Assignment"
4. Tìm user cần cấp quyền
5. Click "Gán vai trò"
6. Chọn role có permission `rbac.manage` (vd: Admin)
7. Lưu
8. Thông báo user đó F5/refresh trình duyệt

**Cách 2: Script (Nâng cao)**
1. Tạo role mới với permission `rbac.manage`:
   ```javascript
   // Tạo role "HR Manager"
   const role = await Role.create({
       role_name: 'HR Manager',
       description: 'Quản lý nhân sự',
       is_active: true
   });
   
   // Gán permission rbac.manage
   const rbacPerm = await Permission.findOne({ 
       where: { permission_key: 'rbac.manage' } 
   });
   await RolePermission.create({
       role_id: role.id,
       permission_id: rbacPerm.id
   });
   ```

2. Gán role cho user:
   ```javascript
   await UserRole.create({
       user_id: <user_id>,
       role_id: role.id
   });
   ```

---

## Permissions Quan trọng

### `rbac.manage`
- **Mô tả:** Quản lý phân quyền
- **Cho phép:**
  - Xem menu "Phân quyền"
  - Truy cập `/rbac`
  - Tạo/sửa/xóa roles
  - Gán roles cho users
  - Xem danh sách permissions

### Roles mặc định:

| Role | Permissions | Ai nên dùng |
|------|-------------|-------------|
| **Admin** | 44 (tất cả) | Quản trị viên hệ thống |
| **Manager** | 24 (view + approve) | Trưởng phòng, quản lý |
| **Technician** | 24 (view + update + create) | Kỹ thuật viên |
| **Viewer** | 9 (chỉ view) | Nhân viên thông thường |

---

## Lưu ý quan trọng

### 1. DEV_TEAM IDs
User IDs **596** và **947** luôn có full quyền (bypass tất cả permission checks)

### 2. Refresh sau khi gán quyền
Users **BẮT BUỘC** phải F5/refresh trình duyệt sau khi:
- Được gán role mới
- Role của họ được thêm/xóa permissions
- Thay đổi bất kỳ về RBAC

### 3. Backup trước khi reset
Trước khi chạy `reset-to-production.js`, hãy backup database nếu cần giữ lại role assignments hiện tại.

### 4. Script an toàn
Tất cả scripts đều dùng Sequelize models, an toàn với SQL injection.

---

## Troubleshooting

### User không thấy menu sau khi gán quyền?
1. Kiểm tra user có role có permission `rbac.manage`:
   ```bash
   node scripts/summary-rbac-access.js
   ```
2. Yêu cầu user F5/refresh trình duyệt
3. Clear cache trình duyệt
4. Logout và login lại

### Muốn xem permissions của 1 user cụ thể?
```bash
node -e "
const { User, Role, Permission } = require('./src/models');
(async () => {
    const user = await User.findByPk(<user_id>, {
        include: [{
            model: Role,
            as: 'roles',
            include: [{ model: Permission, as: 'permissions' }]
        }]
    });
    console.log('User:', user.name);
    user.roles.forEach(role => {
        console.log('Role:', role.role_name);
        console.log('Permissions:', role.permissions.map(p => p.permission_key).join(', '));
    });
    process.exit(0);
})();
"
```

---

## Liên hệ
Nếu cần hỗ trợ, liên hệ Dev Team (User 596, 947)
