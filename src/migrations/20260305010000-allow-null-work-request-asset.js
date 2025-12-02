module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('work_requests', 'asset_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Thiết bị liên quan (có thể trống cho yêu cầu chung)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('work_requests', 'asset_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Thiết bị liên quan'
    });
  }
};
