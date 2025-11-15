'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('maintenance_progress', {
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
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID người cập nhật'
      },
      progress_percentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Phần trăm hoàn thành (0-100)'
      },
      work_description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mô tả công việc đã thực hiện'
      },
      time_spent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Thời gian đã dùng (giờ)'
      },
      materials_used: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Danh sách vật tư đã sử dụng'
      },
      issues_found: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Các vấn đề phát hiện'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Ghi chú khác'
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
    await queryInterface.addIndex('maintenance_progress', ['maintenance_id']);
    await queryInterface.addIndex('maintenance_progress', ['updated_by']);
    await queryInterface.addIndex('maintenance_progress', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('maintenance_progress');
  }
};
