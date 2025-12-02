'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cập nhật enum maintenance_type để bổ sung corrective/preventive/cleaning/inspection/maintenance
    await queryInterface.changeColumn('maintenance', 'maintenance_type', {
      type: Sequelize.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'),
      allowNull: false,
      defaultValue: 'maintenance'
    });

    // Đảm bảo status có awaiting_approval
    await queryInterface.changeColumn('maintenance', 'status', {
      type: Sequelize.ENUM('pending', 'in_progress', 'awaiting_approval', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  async down(queryInterface, Sequelize) {
    // Không rollback enum vì dễ mất dữ liệu; giữ nguyên
  }
};
