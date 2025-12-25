'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Thêm column plant_id
      await queryInterface.addColumn('assets', 'plant_id', {
        type: Sequelize.INTEGER,
        allowNull: true, // Tạm thời nullable để migrate dữ liệu cũ
        references: {
          model: 'plants',
          key: 'id'
        },
        after: 'sub_category_id'
      }, { transaction });

      // 2. Thêm column responsible_user_id
      await queryInterface.addColumn('assets', 'responsible_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true, // Tạm thời nullable để migrate dữ liệu cũ
        references: {
          model: 'users',
          key: 'id'
        },
        after: 'team_id'
      }, { transaction });

      // 3. Cập nhật ENUM status để thêm các giá trị mới
      await queryInterface.sequelize.query(
        `ALTER TABLE assets MODIFY COLUMN status ENUM('active', 'inactive', 'under_maintenance', 'broken', 'pending') NOT NULL DEFAULT 'active'`,
        { transaction }
      );

      // 4. Thêm index cho plant_id
      await queryInterface.addIndex('assets', ['plant_id'], {
        name: 'idx_assets_plant_id',
        transaction
      });

      // 5. Thêm index cho responsible_user_id
      await queryInterface.addIndex('assets', ['responsible_user_id'], {
        name: 'idx_assets_responsible_user_id',
        transaction
      });

      // 6. Thêm index cho dk_code để tăng performance khi lookup
      await queryInterface.addIndex('assets', ['dk_code'], {
        name: 'idx_assets_dk_code',
        transaction
      });

      await transaction.commit();
      console.log('✅ Migration completed: Added plant_id, responsible_user_id, updated status ENUM');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes
      await queryInterface.removeIndex('assets', 'idx_assets_dk_code', { transaction });
      await queryInterface.removeIndex('assets', 'idx_assets_responsible_user_id', { transaction });
      await queryInterface.removeIndex('assets', 'idx_assets_plant_id', { transaction });

      // Revert status ENUM to original
      await queryInterface.sequelize.query(
        `ALTER TABLE assets MODIFY COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'`,
        { transaction }
      );

      // Remove columns
      await queryInterface.removeColumn('assets', 'responsible_user_id', { transaction });
      await queryInterface.removeColumn('assets', 'plant_id', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed: Removed plant_id, responsible_user_id, reverted status ENUM');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
