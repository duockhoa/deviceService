const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const HandoverFollowUp = sequelize.define('handover_follow_up', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    handover_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'handovers',
            key: 'id'
        }
    },
    actual_condition: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Tình trạng thực tế sau tiếp nhận'
    },
    issues: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Vấn đề phát hiện'
    },
    action_taken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Hành động đã thực hiện'
    },
    completion_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày hoàn thành xử lý'
    },
    qa_review: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Đánh giá QA/QC'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú bổ sung'
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
    tableName: 'handover_follow_ups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = HandoverFollowUp;
