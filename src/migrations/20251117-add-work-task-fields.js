'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('maintenance_work_tasks', 'started_at', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Thời gian bắt đầu công việc'
        });

        await queryInterface.addColumn('maintenance_work_tasks', 'image_before', {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'URL ảnh trước khi thực hiện'
        });

        await queryInterface.addColumn('maintenance_work_tasks', 'image_after', {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'URL ảnh sau khi hoàn thành'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('maintenance_work_tasks', 'started_at');
        await queryInterface.removeColumn('maintenance_work_tasks', 'image_before');
        await queryInterface.removeColumn('maintenance_work_tasks', 'image_after');
    }
};
