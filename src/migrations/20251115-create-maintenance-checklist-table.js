'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('maintenance_checklist', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      maintenance_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'maintenance',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID của lịch bảo trì'
      },
      task_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Tên công việc cần thực hiện'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết công việc'
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Trạng thái hoàn thành'
      },
      completed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID người hoàn thành'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Thời gian hoàn thành'
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Thứ tự hiển thị'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Ghi chú'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('maintenance_checklist', ['maintenance_id']);
    await queryInterface.addIndex('maintenance_checklist', ['is_completed']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('maintenance_checklist');
  }
};
