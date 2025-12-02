const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Maintenance = sequelize.define('maintenance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    maintenance_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id'
        }
    },
    maintenance_type: {
        type: DataTypes.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'),
        allowNull: false,
        defaultValue: 'maintenance',
        comment: 'Loại bảo trì: vệ sinh, kiểm tra, bảo trì định kỳ, sửa chữa'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Mức độ ưu tiên của công việc bảo trì'
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'awaiting_approval', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Trạng thái của công việc bảo trì: pending (chờ xử lý), in_progress (đang thực hiện), awaiting_approval (chờ phê duyệt), completed (hoàn thành), cancelled (đã hủy)'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tiêu đề công việc bảo trì'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết công việc cần thực hiện'
    },
    scheduled_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Ngày dự kiến thực hiện bảo trì'
    },
    actual_start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày bắt đầu thực tế'
    },
    actual_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày hoàn thành thực tế'
    },
    estimated_duration: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Thời gian ước tính (giờ)'
    },
    actual_duration: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Thời gian thực tế (giờ)'
    },
    technician_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID của kỹ thuật viên phụ trách'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID của người tạo lịch bảo trì'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú bổ sung'
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Chi phí bảo trì'
    },
    parts_used: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Danh sách linh kiện đã sử dụng (JSON format)'
    },
    // Các trường mới cho maintenance planning
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Địa điểm thực hiện bảo trì'
    },
    safety_requirements: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Yêu cầu an toàn khi thực hiện bảo trì'
    },
    tools_required: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Danh sách công cụ cần thiết'
    },
    measuring_tools: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Danh sách thiết bị đo lường cần thiết'
    },
    safety_tools: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Danh sách thiết bị an toàn cần thiết'
    },
    spare_parts: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Danh sách phụ tùng thay thế'
    },
    consumables: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Danh sách ID vật tư tiêu hao cần thiết (JSON array of consumable category IDs)'
    },
    estimated_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Ước tính tổng chi phí bảo trì'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'maintenance',
    timestamps: false,
    hooks: {
        beforeUpdate: (instance) => {
            instance.updated_at = new Date();
        }
    },
    indexes: [
        {
            fields: ['asset_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['technician_id']
        },
        {
            fields: ['scheduled_date']
        },
        {
            fields: ['maintenance_type']
        },
        {
            fields: ['priority']
        }
    ]
});

module.exports = {
    Maintenance
};
