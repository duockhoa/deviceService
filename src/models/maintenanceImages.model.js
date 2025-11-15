const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceImages = sequelize.define('maintenance_images', {
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
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'URL của hình ảnh'
    },
    image_type: {
        type: DataTypes.ENUM('before', 'during', 'after'),
        allowNull: false,
        defaultValue: 'during',
        comment: 'Loại hình ảnh: before (trước), during (trong quá trình), after (sau)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả hình ảnh'
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID người upload'
    },
    uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Thời gian upload'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'maintenance_images',
    indexes: [
        {
            fields: ['maintenance_id']
        },
        {
            fields: ['image_type']
        },
        {
            fields: ['uploaded_by']
        }
    ]
});

module.exports = { MaintenanceImages };
