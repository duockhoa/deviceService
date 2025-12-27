'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('asset_sub_categories', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Soft delete timestamp'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('asset_sub_categories', 'deleted_at');
  }
};
