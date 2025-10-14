const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const ConsumableCategories = sequelize.define('ConsumableCategories', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('consumable', 'component'),
        allowNull: false,
        comment: 'Loại: consumable (vật tư tiêu hao), component (linh kiện phụ tùng)'
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Mã danh mục vật tư'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên danh mục vật tư'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả danh mục'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Trạng thái hoạt động'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'consumable_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Bảng danh mục vật tư tiêu hao và linh kiện phụ tùng'
});

module.exports = { ConsumableCategories };