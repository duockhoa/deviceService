'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('maintenance_consumables', 'asset_consumable_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'asset_consumables',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'ID vật tư của thiết bị (nếu chọn từ asset_consumables)'
        });

        await queryInterface.addColumn('maintenance_consumables', 'item_name', {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Tên vật tư (copy từ asset_consumables hoặc nhập tay)'
        });

        await queryInterface.addColumn('maintenance_consumables', 'specification', {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'Quy cách vật tư (copy từ asset_consumables hoặc nhập tay)'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('maintenance_consumables', 'asset_consumable_id');
        await queryInterface.removeColumn('maintenance_consumables', 'item_name');
        await queryInterface.removeColumn('maintenance_consumables', 'specification');
    }
};
