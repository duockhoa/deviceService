'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('maintenance', 'status', {
      type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'approved', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Trạng thái của công việc bảo trì'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('maintenance', 'status', {
      type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Trạng thái của công việc bảo trì'
    });
  }
};
