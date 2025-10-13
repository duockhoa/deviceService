const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const SpecificationCategories = sequelize.define('SpecificationCategories', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'AssetSubCategories',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'ID của sub category thiết bị'
    },
    spec_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên thông số kỹ thuật (VD: Công suất, Điện áp, Tốc độ)'
    },
    spec_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Mã thông số kỹ thuật (VD: PWR, VOL, SPD)'
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Đơn vị đo (VD: kW, V, rpm, °C)'
    },
    data_type: {
        type: DataTypes.ENUM('text', 'number', 'select', 'date', 'boolean'),
        allowNull: false,
        defaultValue: 'text',
        comment: 'Kiểu dữ liệu của thông số'
    },
    options: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Các tùy chọn cho kiểu select (JSON format)'
    },
    min_value: {
        type: DataTypes.DECIMAL(15, 4),
        allowNull: true,
        comment: 'Giá trị tối thiểu (cho kiểu number)'
    },
    max_value: {
        type: DataTypes.DECIMAL(15, 4),
        allowNull: true,
        comment: 'Giá trị tối đa (cho kiểu number)'
    },
    is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Bắt buộc nhập hay không'
    },
    display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Thứ tự hiển thị'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết về thông số'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Trạng thái hoạt động'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'Người tạo'
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'Người cập nhật cuối'
    }
}, {
    tableName: 'specification_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['sub_category_id', 'spec_code']
        },
        {
            fields: ['sub_category_id']
        },
        {
            fields: ['spec_name']
        },
        {
            fields: ['status']
        },
        {
            fields: ['display_order']
        }
    ]
});

module.exports = {SpecificationCategories};