const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Assets = sequelize.define('assets', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    sub_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false, // Bắt buộc vì đây là quan hệ chính
        references: {
            model: 'asset_sub_categories',
            key: 'id'
        },
        comment: 'Loại thiết bị phụ thuộc'
    },
    team_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: {
            model: 'teams',
            key: 'name'
        }
    },
    area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'areas',
            key: 'id'
        }
    },
    asset_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Trạng thái hoạt động của thiết bị'
    },
    image: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL của hình ảnh tài sản (Cloudinary URL)'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
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
    tableName: 'assets',
    timestamps: false,
    hooks: {
        beforeUpdate: (instance) => {
            instance.updated_at = new Date();
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['asset_code']
        },
        // Bỏ index cho category_id
        // {
        //     fields: ['category_id']
        // },
        {
            fields: ['sub_category_id']
        },
        {
            fields: ['team_id']
        },
        {
            fields: ['area_id']
        },
        {
            fields: ['created_by']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = {
    Assets
};