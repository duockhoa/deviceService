'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('maintenance_images', {
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
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'URL của hình ảnh'
      },
      image_type: {
        type: Sequelize.ENUM('before', 'during', 'after'),
        allowNull: false,
        defaultValue: 'during',
        comment: 'Loại hình ảnh: before (trước), during (trong quá trình), after (sau)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mô tả hình ảnh'
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID người upload'
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Thời gian upload'
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
    await queryInterface.addIndex('maintenance_images', ['maintenance_id']);
    await queryInterface.addIndex('maintenance_images', ['image_type']);
    await queryInterface.addIndex('maintenance_images', ['uploaded_by']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('maintenance_images');
  }
};
