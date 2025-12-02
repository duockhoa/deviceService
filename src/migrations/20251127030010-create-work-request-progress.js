'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('work_request_progress', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      work_request_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'work_requests', key: 'id' }, onDelete: 'CASCADE' },
      status: { type: Sequelize.ENUM('new', 'pending', 'assigned', 'in_progress', 'awaiting_confirm', 'closed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
      note: { type: Sequelize.TEXT, allowNull: true },
      images: { type: Sequelize.JSON, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('work_request_progress');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_work_request_progress_status";');
  }
};
