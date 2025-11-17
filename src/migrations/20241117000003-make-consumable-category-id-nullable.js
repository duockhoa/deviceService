'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Drop existing foreign key constraint
        await queryInterface.removeConstraint(
            'maintenance_consumables',
            'maintenance_consumables_ibfk_2'
        );

        // Modify column to allow NULL
        await queryInterface.changeColumn('maintenance_consumables', 'consumable_category_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'ID danh mục vật tư tiêu hao (optional nếu dùng asset_consumable_id)'
        });

        // Re-add foreign key with SET NULL on delete
        await queryInterface.addConstraint('maintenance_consumables', {
            fields: ['consumable_category_id'],
            type: 'foreign key',
            name: 'maintenance_consumables_ibfk_2',
            references: {
                table: 'consumable_categories',
                field: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeConstraint(
            'maintenance_consumables',
            'maintenance_consumables_ibfk_2'
        );

        await queryInterface.changeColumn('maintenance_consumables', 'consumable_category_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: 'ID danh mục vật tư tiêu hao'
        });

        await queryInterface.addConstraint('maintenance_consumables', {
            fields: ['consumable_category_id'],
            type: 'foreign key',
            name: 'maintenance_consumables_ibfk_2',
            references: {
                table: 'consumable_categories',
                field: 'id'
            }
        });
    }
};
