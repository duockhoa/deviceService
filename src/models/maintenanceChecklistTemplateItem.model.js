const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceChecklistTemplateItem = sequelize.define('maintenance_checklist_template_item', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'maintenance_checklist_templates',
            key: 'id'
        }
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
    is_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Bắt buộc hay không'
    },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Thứ tự sắp xếp'
    }
}, {
    tableName: 'maintenance_checklist_template_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['template_id']
        }
    ]
});

module.exports = { MaintenanceChecklistTemplateItem };
