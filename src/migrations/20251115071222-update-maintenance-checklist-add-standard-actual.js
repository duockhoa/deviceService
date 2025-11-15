'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_checklist', 'check_item', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Hạng mục kiểm tra',
      after: 'task_name'
    });

    await queryInterface.addColumn('maintenance_checklist', 'standard_value', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Tiêu chuẩn OK (giá trị chuẩn)',
      after: 'check_item'
    });

    await queryInterface.addColumn('maintenance_checklist', 'actual_value', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Số liệu thực tế (nhân viên nhập)',
      after: 'standard_value'
    });

    await queryInterface.addColumn('maintenance_checklist', 'result', {
      type: Sequelize.ENUM('OK', 'NG', 'N/A'),
      allowNull: true,
      comment: 'Kết quả đánh giá (OK/NG/N/A)',
      after: 'actual_value'
    });

    await queryInterface.addColumn('maintenance_checklist', 'check_method', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Phương pháp kiểm tra',
      after: 'result'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('maintenance_checklist', 'check_method');
    await queryInterface.removeColumn('maintenance_checklist', 'result');
    await queryInterface.removeColumn('maintenance_checklist', 'actual_value');
    await queryInterface.removeColumn('maintenance_checklist', 'standard_value');
    await queryInterface.removeColumn('maintenance_checklist', 'check_item');
  }
};
