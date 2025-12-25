'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('incidents', 'capa_required', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Có yêu cầu CAPA hay không'
    });

    await queryInterface.addColumn('incidents', 'capa_actions', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Danh sách hành động CAPA (JSON array)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('incidents', 'capa_actions');
    await queryInterface.removeColumn('incidents', 'capa_required');
  }
};
