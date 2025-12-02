'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('work_requests', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      request_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      asset_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'assets', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      type: { type: Sequelize.ENUM('support', 'inspection', 'cleaning', 'repair_request', 'other'), allowNull: false, defaultValue: 'support' },
      priority: { type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium' },
      status: { type: Sequelize.ENUM('new', 'pending', 'assigned', 'in_progress', 'awaiting_confirm', 'closed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
      requester_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      technician_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      due_date: { type: Sequelize.DATE, allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      images: { type: Sequelize.JSON, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      incident_id: { type: Sequelize.INTEGER, allowNull: true },
      maintenance_id: { type: Sequelize.INTEGER, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('work_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_work_requests_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_work_requests_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_work_requests_status";');
  }
};
