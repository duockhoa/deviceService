const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const AuditLog = sequelize.define('audit_log', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    entity_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    action: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    before_json: {
        type: DataTypes.JSON,
        allowNull: true
    },
    after_json: {
        type: DataTypes.JSON,
        allowNull: true
    },
    reason: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    ip: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    correlation_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
        { fields: ['entity_type', 'entity_id'] },
        { fields: ['action'] },
        { fields: ['user_id', 'created_at'] }
    ]
});

module.exports = { AuditLog };
