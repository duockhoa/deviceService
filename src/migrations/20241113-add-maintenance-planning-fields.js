'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('maintenance', 'location', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Địa điểm thực hiện bảo trì'
    });

    await queryInterface.addColumn('maintenance', 'safety_requirements', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Yêu cầu an toàn khi thực hiện bảo trì'
    });

    await queryInterface.addColumn('maintenance', 'tools_required', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Danh sách công cụ cần thiết'
    });

    await queryInterface.addColumn('maintenance', 'measuring_tools', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Danh sách thiết bị đo lường cần thiết'
    });

    await queryInterface.addColumn('maintenance', 'safety_tools', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Danh sách thiết bị an toàn cần thiết'
    });

    await queryInterface.addColumn('maintenance', 'spare_parts', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Danh sách phụ tùng thay thế'
    });

    await queryInterface.addColumn('maintenance', 'consumables', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Danh sách vật tư tiêu hao'
    });

    await queryInterface.addColumn('maintenance', 'estimated_cost', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Ước tính chi phí vật tư và công cụ'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('maintenance', 'location');
    await queryInterface.removeColumn('maintenance', 'safety_requirements');
    await queryInterface.removeColumn('maintenance', 'tools_required');
    await queryInterface.removeColumn('maintenance', 'measuring_tools');
    await queryInterface.removeColumn('maintenance', 'safety_tools');
    await queryInterface.removeColumn('maintenance', 'spare_parts');
    await queryInterface.removeColumn('maintenance', 'consumables');
    await queryInterface.removeColumn('maintenance', 'estimated_cost');
  }
};