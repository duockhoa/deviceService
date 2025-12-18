'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('assets', 'dk_code', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'Mã DK nội bộ, tùy chọn'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('assets', 'dk_code');
  }
};
