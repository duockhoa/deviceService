'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('maintenance_consumables', {
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
        onDelete: 'CASCADE'
      },
      consumable_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'consumable_categories',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      quantity_required: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1
      },
      quantity_used: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      unit_cost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('planned', 'ordered', 'received', 'used'),
        allowNull: false,
        defaultValue: 'planned'
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

    // Thêm indexes
    await queryInterface.addIndex('maintenance_consumables', ['maintenance_id']);
    await queryInterface.addIndex('maintenance_consumables', ['consumable_category_id']);
    await queryInterface.addIndex('maintenance_consumables', ['status']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('maintenance_consumables');
  }
};
