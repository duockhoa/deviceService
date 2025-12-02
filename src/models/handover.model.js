const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Handover = sequelize.define('handover', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    handover_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'assets',
            key: 'id'
        }
    },
    asset_code: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    asset_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    from_dept: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Bộ phận bàn giao'
    },
    to_dept: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Bộ phận tiếp nhận'
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Lý do bàn giao'
    },
    items: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Danh sách hạng mục bàn giao'
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'follow_up', 'closed'),
        defaultValue: 'pending',
        comment: 'Trạng thái: chờ tiếp nhận, đã tiếp nhận, đang theo dõi, đã đóng'
    },
    accepted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    accepted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    close_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'handovers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Handover;
