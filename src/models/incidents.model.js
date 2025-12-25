const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize/index');

const Incidents = sequelize.define('incidents', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    incident_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Mã sự cố'
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID thiết bị gặp sự cố (có thể trống cho yêu cầu không gắn thiết bị)'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
    },
    status: {
        type: DataTypes.ENUM('reported', 'triaged', 'out_of_service', 'assigned', 'in_progress', 'post_fix_check', 'resolved', 'closed', 'cancelled'),
        defaultValue: 'reported'
    },
    is_isolated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Thiết bị đã được cô lập (out of service)'
    },
    isolated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời điểm cô lập thiết bị'
    },
    isolation_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú về việc cô lập'
    },
    post_fix_result: {
        type: DataTypes.ENUM('pass', 'fail', 'pending'),
        allowNull: true,
        defaultValue: 'pending',
        comment: 'Kết quả kiểm tra sau sửa chữa'
    },
    downtime_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Thời gian downtime tính bằng phút'
    },
    capa_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Có yêu cầu CAPA hay không'
    },
    capa_actions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Danh sách hành động CAPA (JSON array)'
    },
    triaged_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời điểm phân loại'
    },
    triaged_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID người phân loại'
    },
    post_fix_checked_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời điểm kiểm tra sau sửa chữa'
    },
    post_fix_checked_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID người kiểm tra sau sửa chữa'
    },
    reported_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reported_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    started_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resolved_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    closed_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    impact: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    root_cause: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    solution: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    prevention_measures: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    images: {
        type: DataTypes.TEXT('medium'),
        allowNull: true
    },
    attachments: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    downtime_hours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Đánh giá & phương án
    assessment_status: {
        type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'none'
    },
    assessment_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    solution_plan: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    device_status: {
        type: DataTypes.ENUM('operational', 'limited', 'down'),
        allowNull: true
    },
    handover_required: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    handover_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    maintenance_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Lệnh bảo trì được tạo sau khi duyệt phương án'
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'incidents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Incidents;
