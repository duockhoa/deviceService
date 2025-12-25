'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add consumable_category_id column
    await queryInterface.addColumn('asset_consumables', 'consumable_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'consumable_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID danh mục vật tư'
    });

    // Add current_quantity column
    await queryInterface.addColumn('asset_consumables', 'current_quantity', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Số lượng hiện tại trong kho'
    });

    // Add min_stock_level column
    await queryInterface.addColumn('asset_consumables', 'min_stock_level', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Ngưỡng tối thiểu cảnh báo'
    });

    // Rename replacement_cycle to replacement_cycle_hours if it exists
    const tableDescription = await queryInterface.describeTable('asset_consumables');
    
    if (tableDescription.replacement_cycle) {
      await queryInterface.renameColumn('asset_consumables', 'replacement_cycle', 'replacement_cycle_hours');
      
      // Update comment for the renamed column
      await queryInterface.changeColumn('asset_consumables', 'replacement_cycle_hours', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Chu kỳ thay thế (giờ hoạt động)'
      });
    } else if (!tableDescription.replacement_cycle_hours) {
      // If neither exists, create replacement_cycle_hours
      await queryInterface.addColumn('asset_consumables', 'replacement_cycle_hours', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Chu kỳ thay thế (giờ hoạt động)'
      });
    }

    // Update specification column comment
    await queryInterface.changeColumn('asset_consumables', 'specification', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Thông số kỹ thuật / Quy cách'
    });

    // Add index for consumable_category_id for better performance
    await queryInterface.addIndex('asset_consumables', ['consumable_category_id'], {
      name: 'idx_asset_consumables_category_id'
    });

    // Add index for low stock queries
    await queryInterface.addIndex('asset_consumables', ['current_quantity', 'min_stock_level'], {
      name: 'idx_asset_consumables_stock_levels'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('asset_consumables', 'idx_asset_consumables_stock_levels');
    await queryInterface.removeIndex('asset_consumables', 'idx_asset_consumables_category_id');

    // Remove added columns
    await queryInterface.removeColumn('asset_consumables', 'min_stock_level');
    await queryInterface.removeColumn('asset_consumables', 'current_quantity');
    await queryInterface.removeColumn('asset_consumables', 'consumable_category_id');

    // Rename replacement_cycle_hours back to replacement_cycle
    const tableDescription = await queryInterface.describeTable('asset_consumables');
    if (tableDescription.replacement_cycle_hours) {
      await queryInterface.renameColumn('asset_consumables', 'replacement_cycle_hours', 'replacement_cycle');
    }
  }
};
