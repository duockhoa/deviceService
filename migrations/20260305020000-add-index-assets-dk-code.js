"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add non-unique index to speed up dk_code lookup without altering existing schema
    // Guard against existing index (e.g., created via sync) to avoid duplicate errors
    const indexes = await queryInterface.showIndex('assets');
    const exists = indexes.some((idx) => idx.name === 'idx_assets_dk_code');
    if (!exists) {
      await queryInterface.addIndex('assets', ['dk_code'], {
        name: 'idx_assets_dk_code'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index if it exists
    const indexes = await queryInterface.showIndex('assets');
    const exists = indexes.some((idx) => idx.name === 'idx_assets_dk_code');
    if (exists) {
      await queryInterface.removeIndex('assets', 'idx_assets_dk_code');
    }
  }
};
