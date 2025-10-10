const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const AssetAttachment = sequelize.define('asset_attachments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Liên kết đến tài sản'
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên tệp'
    },
    file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Đường dẫn lưu tệp (hoặc URL)'
    },
    file_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Loại tệp (pdf, docx, jpg,...)'
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Kích thước file (bytes)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả file (nếu có)'
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID người tải lên'
    },
    uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Thời điểm tải lên'
    }
}, {
    tableName: 'asset_attachments',
    timestamps: false,
    indexes: [
        {
            fields: ['asset_id']
        },
        {
            fields: ['file_type']
        },
        {
            fields: ['uploaded_by']
        },
        {
            fields: ['uploaded_at']
        }
    ]
});

module.exports = {
    AssetAttachment
};