'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('asset_consumables', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'assets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID của thiết bị'
      },
      item_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Tên vật tư tiêu hao'
      },
      specification: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Thông số kỹ thuật'
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Đơn vị tính (lít, ml, kg, g, cái, bộ...)'
      },
      replacement_cycle: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Chu kỳ thay thế (số giờ hoạt động)'
      },
      unit_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Đơn giá (VNĐ)'
      },
      supplier: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Nhà cung cấp'
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Ghi chú'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      comment: 'Bảng lưu vật tư tiêu hao của từng thiết bị'
    });

    // Tạo index
    await queryInterface.addIndex('asset_consumables', ['asset_id'], {
      name: 'idx_asset_consumables_asset_id'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('asset_consumables');
  }
};
