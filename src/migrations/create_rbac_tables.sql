-- Migration: Create RBAC tables (roles, permissions, role_permissions, user_roles)
-- Created: 2025-01-XX
-- Description: Database-driven Role-Based Access Control system

-- Table: roles
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_role_name` (`role_name`),
    INDEX `idx_is_active` (`is_active`),
    
    CONSTRAINT `fk_roles_created_by` 
        FOREIGN KEY (`created_by`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: permissions
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `permission_key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'e.g. assets.view, maintenance.create',
    `permission_name` VARCHAR(255) NOT NULL COMMENT 'Tên hiển thị',
    `module` VARCHAR(50) NOT NULL COMMENT 'assets, maintenance, calibration, etc.',
    `description` TEXT,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_permission_key` (`permission_key`),
    INDEX `idx_module` (`module`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: role_permissions (junction table)
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY `unique_role_permission` (`role_id`, `permission_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_permission_id` (`permission_id`),
    
    CONSTRAINT `fk_role_permissions_role` 
        FOREIGN KEY (`role_id`) 
        REFERENCES `roles` (`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT `fk_role_permissions_permission` 
        FOREIGN KEY (`permission_id`) 
        REFERENCES `permissions` (`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_roles (junction table)
CREATE TABLE IF NOT EXISTS `user_roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `role_id` INT NOT NULL,
    `assigned_by` INT COMMENT 'ID của người gán role',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY `unique_user_role` (`user_id`, `role_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_assigned_by` (`assigned_by`),
    
    CONSTRAINT `fk_user_roles_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT `fk_user_roles_role` 
        FOREIGN KEY (`role_id`) 
        REFERENCES `roles` (`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT `fk_user_roles_assigned_by` 
        FOREIGN KEY (`assigned_by`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions
INSERT INTO `permissions` (`permission_key`, `permission_name`, `module`, `description`, `is_active`) VALUES
-- Assets module
('assets.view', 'Xem thiết bị', 'assets', 'Xem danh sách và chi tiết thiết bị', 1),
('assets.create', 'Tạo thiết bị', 'assets', 'Thêm thiết bị mới vào hệ thống', 1),
('assets.update', 'Sửa thiết bị', 'assets', 'Chỉnh sửa thông tin thiết bị', 1),
('assets.delete', 'Xóa thiết bị', 'assets', 'Xóa thiết bị khỏi hệ thống', 1),

-- Maintenance module
('maintenance.view', 'Xem bảo trì', 'maintenance', 'Xem kế hoạch và lịch sử bảo trì', 1),
('maintenance.create', 'Tạo lịch bảo trì', 'maintenance', 'Lập kế hoạch bảo trì mới', 1),
('maintenance.update', 'Cập nhật bảo trì', 'maintenance', 'Cập nhật tiến độ bảo trì', 1),
('maintenance.approve', 'Phê duyệt bảo trì', 'maintenance', 'Phê duyệt kế hoạch bảo trì', 1),
('maintenance.report', 'Xem báo cáo bảo trì', 'maintenance', 'Truy cập báo cáo bảo trì', 1),

-- Calibration module
('calibration.view', 'Xem hiệu chuẩn', 'calibration', 'Xem lịch hiệu chuẩn', 1),
('calibration.create', 'Tạo lịch hiệu chuẩn', 'calibration', 'Tạo kế hoạch hiệu chuẩn', 1),
('calibration.update', 'Cập nhật hiệu chuẩn', 'calibration', 'Cập nhật kết quả hiệu chuẩn', 1),

-- Handover module
('handover.view', 'Xem bàn giao', 'handover', 'Xem phiếu bàn giao thiết bị', 1),
('handover.create', 'Tạo bàn giao', 'handover', 'Tạo phiếu bàn giao mới', 1),
('handover.approve', 'Phê duyệt bàn giao', 'handover', 'Phê duyệt bàn giao thiết bị', 1),

-- Checklist module
('checklist.view', 'Xem checklist', 'checklist', 'Xem mẫu checklist', 1),
('checklist.manage', 'Quản lý checklist', 'checklist', 'Tạo và sửa mẫu checklist', 1),

-- Work Requests module
('work_requests.view', 'Xem yêu cầu xử lý', 'work_requests', 'Xem danh sách yêu cầu xử lý', 1),
('work_requests.create', 'Tạo yêu cầu xử lý', 'work_requests', 'Tạo yêu cầu xử lý mới', 1),
('work_requests.update', 'Cập nhật yêu cầu', 'work_requests', 'Cập nhật trạng thái yêu cầu', 1),
('work_requests.approve', 'Phê duyệt yêu cầu', 'work_requests', 'Phê duyệt/từ chối yêu cầu', 1),
('work_requests.assign', 'Gán người xử lý', 'work_requests', 'Gán yêu cầu cho người xử lý', 1),

-- Incidents module
('incidents.view', 'Xem sự cố', 'incidents', 'Xem danh sách sự cố', 1),
('incidents.create', 'Báo cáo sự cố', 'incidents', 'Tạo báo cáo sự cố mới', 1),
('incidents.update', 'Cập nhật sự cố', 'incidents', 'Cập nhật thông tin sự cố', 1),
('incidents.resolve', 'Xử lý sự cố', 'incidents', 'Đánh dấu sự cố đã xử lý', 1),

-- Dashboard module
('dashboard.view', 'Xem dashboard', 'dashboard', 'Truy cập trang tổng quan', 1),

-- Reports module
('reports.view', 'Xem báo cáo', 'reports', 'Xem các báo cáo thống kê', 1),
('reports.export', 'Xuất báo cáo', 'reports', 'Xuất báo cáo ra file', 1),

-- RBAC module
('rbac.manage', 'Quản lý phân quyền', 'rbac', 'Quản lý roles và permissions', 1);

-- Insert default roles
INSERT INTO `roles` (`role_name`, `description`, `is_active`) VALUES
('Admin', 'Quản trị viên - Toàn quyền hệ thống', 1),
('Manager', 'Quản lý - Xem và phê duyệt', 1),
('Technician', 'Kỹ thuật viên - Thực hiện bảo trì', 1),
('Viewer', 'Người xem - Chỉ xem dữ liệu', 1);

-- Assign ALL permissions to Admin (role_id = 1)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM `permissions`;

-- Assign view + approve + report permissions to Manager (role_id = 2)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, id FROM `permissions` 
WHERE `permission_key` LIKE '%.view' 
   OR `permission_key` LIKE '%.approve'
   OR `permission_key` LIKE '%.report'
   OR `permission_key` LIKE '%.export'
   OR `permission_key` LIKE '%.assign'
   OR `permission_key` LIKE '%.resolve';

-- Assign view + update permissions to Technician (role_id = 3)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 3, id FROM `permissions` 
WHERE `permission_key` LIKE '%.view' 
   OR `permission_key` IN ('maintenance.update', 'calibration.update', 'checklist.view',
                           'work_requests.create', 'work_requests.update',
                           'incidents.create', 'incidents.update');

-- Assign only view permissions to Viewer (role_id = 4)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 4, id FROM `permissions` 
WHERE `permission_key` LIKE '%.view';

-- Automatically assign Admin role to DEV_TEAM users (id 596 and 947)
INSERT INTO `user_roles` (`user_id`, `role_id`, `assigned_by`)
VALUES 
(596, 1, NULL),  -- user_id 596 = Admin role
(947, 1, NULL);  -- user_id 947 = Admin role

-- Migration complete
-- Next steps:
-- 1. Run this migration: mysql -u root -p qltb < this_file.sql
-- 2. Call POST /api/v1/rbac/seed to verify (optional, data already seeded above)
-- 3. Update frontend AccessControl page to use RBAC API
-- 4. Create permissionGuard middleware to replace departmentGuard
