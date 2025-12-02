'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Batch table
    await queryInterface.createTable('maintenance_plan_batches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'partial', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Items table
    await queryInterface.createTable('maintenance_plan_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      batch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'maintenance_plan_batches', key: 'id' },
        onDelete: 'CASCADE'
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'assets', key: 'id' },
        onDelete: 'CASCADE'
      },
      maintenance_type: {
        type: Sequelize.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'),
        allowNull: false,
        defaultValue: 'maintenance'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      estimated_duration: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1
      },
      technician_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reject_reason: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('maintenance_plan_items');
    await queryInterface.dropTable('maintenance_plan_batches');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plan_batches_status\";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plan_items_maintenance_type\";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plan_items_priority\";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plan_items_status\";');
  }
};
