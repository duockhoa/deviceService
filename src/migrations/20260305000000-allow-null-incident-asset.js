module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('incidents', 'asset_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID thiết bị gặp sự cố (có thể trống cho yêu cầu không gắn thiết bị)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('incidents', 'asset_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'ID thiết bị gặp sự cố'
    });
  }
};
