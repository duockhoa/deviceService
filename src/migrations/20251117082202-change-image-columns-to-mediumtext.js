'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('maintenance_work_tasks', 'image_before', {
            type: Sequelize.MEDIUMTEXT,
            allowNull: true
        });
        
        await queryInterface.changeColumn('maintenance_work_tasks', 'image_after', {
            type: Sequelize.MEDIUMTEXT,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('maintenance_work_tasks', 'image_before', {
            type: Sequelize.TEXT,
            allowNull: true
        });
        
        await queryInterface.changeColumn('maintenance_work_tasks', 'image_after', {
            type: Sequelize.TEXT,
            allowNull: true
        });
    }
};
