module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance', 'shift', {
      type: Sequelize.ENUM('A', 'B', 'C'),
      allowNull: true,
      comment: 'Ca làm việc thực hiện bảo trì',
      after: 'status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('maintenance', 'shift');
  }
};
