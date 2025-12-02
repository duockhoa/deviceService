'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('incidents', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      incident_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      asset_id: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      severity: { type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      status: { type: Sequelize.ENUM('reported', 'investigating', 'in_progress', 'resolved', 'closed'), defaultValue: 'reported' },
      reported_by: { type: Sequelize.INTEGER, allowNull: false },
      assigned_to: { type: Sequelize.INTEGER, allowNull: true },
      reported_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      started_date: { type: Sequelize.DATE, allowNull: true },
      resolved_date: { type: Sequelize.DATE, allowNull: true },
      closed_date: { type: Sequelize.DATE, allowNull: true },
      impact: { type: Sequelize.TEXT, allowNull: true },
      root_cause: { type: Sequelize.TEXT, allowNull: true },
      solution: { type: Sequelize.TEXT, allowNull: true },
      prevention_measures: { type: Sequelize.TEXT, allowNull: true },
      images: { type: Sequelize.TEXT('medium'), allowNull: true },
      attachments: { type: Sequelize.TEXT, allowNull: true },
      downtime_hours: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      assessment_status: { type: Sequelize.ENUM('none', 'pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'none' },
      assessment_notes: { type: Sequelize.TEXT, allowNull: true },
      solution_plan: { type: Sequelize.TEXT, allowNull: true },
      device_status: { type: Sequelize.ENUM('operational', 'limited', 'down'), allowNull: true },
      handover_required: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      handover_notes: { type: Sequelize.TEXT, allowNull: true },
      maintenance_id: { type: Sequelize.INTEGER, allowNull: true },
      approved_by: { type: Sequelize.INTEGER, allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('incidents');
  }
};
