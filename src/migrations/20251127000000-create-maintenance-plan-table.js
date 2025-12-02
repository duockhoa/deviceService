'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('maintenance_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'assets', key: 'id' },
        onDelete: 'CASCADE',
      },
      maintenance_type: {
        type: Sequelize.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'),
        allowNull: false,
        defaultValue: 'maintenance',
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      estimated_duration: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1,
      },
      technician_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      safety_requirements: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tools_required: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      measuring_tools: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      safety_tools: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('maintenance_plans');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plans_maintenance_type\";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plans_priority\";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_maintenance_plans_status\";');
  },
};
