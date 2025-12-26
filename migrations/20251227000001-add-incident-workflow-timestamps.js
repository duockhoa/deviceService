'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add timestamp columns for tracking incident workflow
    await queryInterface.addColumn('incidents', 'triaged_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm phân loại sự cố'
    });

    await queryInterface.addColumn('incidents', 'assigned_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm phân công kỹ thuật viên'
    });

    await queryInterface.addColumn('incidents', 'started_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm bắt đầu xử lý'
    });

    await queryInterface.addColumn('incidents', 'submitted_for_check_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm gửi kiểm tra'
    });

    await queryInterface.addColumn('incidents', 'post_fix_status', {
      type: Sequelize.ENUM('pass', 'fail'),
      allowNull: true,
      comment: 'Kết quả kiểm tra sau sửa chữa'
    });

    // Add indexes for reporting
    await queryInterface.addIndex('incidents', ['triaged_at'], {
      name: 'idx_incidents_triaged_at'
    });

    await queryInterface.addIndex('incidents', ['assigned_at'], {
      name: 'idx_incidents_assigned_at'
    });

    await queryInterface.addIndex('incidents', ['started_at'], {
      name: 'idx_incidents_started_at'
    });

    await queryInterface.addIndex('incidents', ['resolved_date'], {
      name: 'idx_incidents_resolved_date'
    });

    console.log('✅ Added timestamp columns for incident workflow tracking');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('incidents', 'triaged_at');
    await queryInterface.removeColumn('incidents', 'assigned_at');
    await queryInterface.removeColumn('incidents', 'started_at');
    await queryInterface.removeColumn('incidents', 'submitted_for_check_at');
    await queryInterface.removeColumn('incidents', 'post_fix_status');
  }
};
