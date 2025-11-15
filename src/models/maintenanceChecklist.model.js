const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceChecklist = sequelize.define('maintenance_checklist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    maintenance_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'maintenance',
            key: 'id'
        },
        comment: 'ID của lịch bảo trì'
    },
    task_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên công việc cần thực hiện'
    },
    check_item: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hạng mục kiểm tra'
    },
    standard_value: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Tiêu chuẩn OK (giá trị chuẩn)'
    },
    actual_value: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Số liệu thực tế (nhân viên nhập)'
    },
    result: {
        type: DataTypes.ENUM('OK', 'NG', 'N/A'),
        allowNull: true,
        comment: 'Kết quả đánh giá (OK/NG/N/A)'
    },
    check_method: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Phương pháp kiểm tra'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết công việc'
    },
    is_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Trạng thái hoàn thành'
    },
    completed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID người hoàn thành'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời gian hoàn thành'
    },
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Thứ tự hiển thị'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'maintenance_checklist',
    indexes: [
        {
            fields: ['maintenance_id']
        },
        {
            fields: ['is_completed']
        }
    ]
});

module.exports = { MaintenanceChecklist };
