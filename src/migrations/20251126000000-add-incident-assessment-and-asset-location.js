'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.addColumn('assets', 'location', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Vị trí đặt thiết bị'
      }),
      queryInterface.addColumn('incidents', 'assessment_status', {
        type: Sequelize.ENUM('none', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'none'
      }),
      queryInterface.addColumn('incidents', 'assessment_notes', {
        type: Sequelize.TEXT,
        allowNull: true
      }),
      queryInterface.addColumn('incidents', 'solution_plan', {
        type: Sequelize.TEXT,
        allowNull: true
      }),
      queryInterface.addColumn('incidents', 'device_status', {
        type: Sequelize.ENUM('operational', 'limited', 'down'),
        allowNull: true
      }),
      queryInterface.addColumn('incidents', 'handover_required', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }),
      queryInterface.addColumn('incidents', 'handover_notes', {
        type: Sequelize.TEXT,
        allowNull: true
      }),
      queryInterface.addColumn('incidents', 'maintenance_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      }),
      queryInterface.addColumn('incidents', 'approved_by', {
        type: Sequelize.INTEGER,
        allowNull: true
      }),
      queryInterface.addColumn('incidents', 'approved_at', {
        type: Sequelize.DATE,
        allowNull: true
      })
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.removeColumn('assets', 'location'),
      queryInterface.removeColumn('incidents', 'assessment_status'),
      queryInterface.removeColumn('incidents', 'assessment_notes'),
      queryInterface.removeColumn('incidents', 'solution_plan'),
      queryInterface.removeColumn('incidents', 'device_status'),
      queryInterface.removeColumn('incidents', 'handover_required'),
      queryInterface.removeColumn('incidents', 'handover_notes'),
      queryInterface.removeColumn('incidents', 'maintenance_id'),
      queryInterface.removeColumn('incidents', 'approved_by'),
      queryInterface.removeColumn('incidents', 'approved_at')
    ]);
  }
};
