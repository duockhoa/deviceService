'use strict';

/**
 * Cập nhật ENUM maintenance_type để chứa đầy đủ các loại:
 * cleaning, inspection, maintenance, corrective, preventive
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('maintenance', 'maintenance_type', {
      type: Sequelize.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'),
      allowNull: false,
      defaultValue: 'maintenance'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Quay về enum cũ (nếu cần) - mặc định chỉ giữ preventive, maintenance
    await queryInterface.changeColumn('maintenance', 'maintenance_type', {
      type: Sequelize.ENUM('cleaning', 'inspection', 'preventive', 'maintenance'),
      allowNull: false,
      defaultValue: 'preventive'
    });
  }
};
