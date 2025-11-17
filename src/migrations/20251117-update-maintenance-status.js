'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Step 1: Add a temporary column
      await queryInterface.addColumn('maintenance', 'status_new', {
        type: Sequelize.ENUM('pending', 'in_progress', 'awaiting_approval', 'completed', 'cancelled'),
        allowNull: true
      });

      // Step 2: Copy data from old column to new column, mapping old values to new values
      await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET status_new = CASE 
          WHEN status = 'approved' THEN 'awaiting_approval'
          WHEN status IN ('pending', 'in_progress', 'completed', 'cancelled') THEN status
          ELSE 'pending'
        END;
      `);

      // Step 3: Remove old column
      await queryInterface.removeColumn('maintenance', 'status');

      // Step 4: Rename new column to original name
      await queryInterface.renameColumn('maintenance', 'status_new', 'status');

      // Step 5: Make it NOT NULL with default
      await queryInterface.changeColumn('maintenance', 'status', {
        type: Sequelize.ENUM('pending', 'in_progress', 'awaiting_approval', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Trạng thái của công việc bảo trì: pending (chờ xử lý), in_progress (đang thực hiện), awaiting_approval (chờ phê duyệt), completed (hoàn thành), cancelled (đã hủy)'
      });

      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert: Add temporary column with old enum
      await queryInterface.addColumn('maintenance', 'status_old', {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'approved', 'cancelled'),
        allowNull: true
      });

      // Map new values back to old values
      await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET status_old = CASE 
          WHEN status = 'awaiting_approval' THEN 'approved'
          WHEN status IN ('pending', 'in_progress', 'completed', 'cancelled') THEN status
          ELSE 'pending'
        END;
      `);

      // Remove new column
      await queryInterface.removeColumn('maintenance', 'status');

      // Rename old column back
      await queryInterface.renameColumn('maintenance', 'status_old', 'status');

      // Make it NOT NULL with default
      await queryInterface.changeColumn('maintenance', 'status', {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'approved', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Trạng thái của công việc bảo trì'
      });

      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback error:', error);
      throw error;
    }
  }
};
