'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Cập nhật ENUM cho status
    await queryInterface.sequelize.query(`
      ALTER TABLE incidents 
      MODIFY COLUMN status ENUM(
        'reported', 
        'triaged', 
        'out_of_service', 
        'assigned', 
        'in_progress', 
        'post_fix_check', 
        'resolved', 
        'closed', 
        'cancelled'
      ) DEFAULT 'reported';
    `);

    // 2. Thêm các trường mới theo yêu cầu
    await queryInterface.addColumn('incidents', 'is_isolated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Thiết bị đã được cô lập (out of service)'
    });

    await queryInterface.addColumn('incidents', 'isolated_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm cô lập thiết bị'
    });

    await queryInterface.addColumn('incidents', 'isolation_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Ghi chú về việc cô lập'
    });

    await queryInterface.addColumn('incidents', 'post_fix_result', {
      type: Sequelize.ENUM('pass', 'fail', 'pending'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Kết quả kiểm tra sau sửa chữa'
    });

    await queryInterface.addColumn('incidents', 'downtime_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Thời gian downtime tính bằng phút'
    });

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

    await queryInterface.addColumn('incidents', 'triaged_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm phân loại'
    });

    await queryInterface.addColumn('incidents', 'triaged_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID người phân loại',
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('incidents', 'post_fix_checked_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm kiểm tra sau sửa chữa'
    });

    await queryInterface.addColumn('incidents', 'post_fix_checked_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID người kiểm tra sau sửa chữa',
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // 3. Thêm indexes
    await queryInterface.addIndex('incidents', ['is_isolated']);
    await queryInterface.addIndex('incidents', ['post_fix_result']);
    await queryInterface.addIndex('incidents', ['capa_required']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('incidents', ['capa_required']);
    await queryInterface.removeIndex('incidents', ['post_fix_result']);
    await queryInterface.removeIndex('incidents', ['is_isolated']);

    // Remove columns
    await queryInterface.removeColumn('incidents', 'post_fix_checked_by');
    await queryInterface.removeColumn('incidents', 'post_fix_checked_at');
    await queryInterface.removeColumn('incidents', 'triaged_by');
    await queryInterface.removeColumn('incidents', 'triaged_at');
    await queryInterface.removeColumn('incidents', 'capa_actions');
    await queryInterface.removeColumn('incidents', 'capa_required');
    await queryInterface.removeColumn('incidents', 'downtime_minutes');
    await queryInterface.removeColumn('incidents', 'post_fix_result');
    await queryInterface.removeColumn('incidents', 'isolation_notes');
    await queryInterface.removeColumn('incidents', 'isolated_at');
    await queryInterface.removeColumn('incidents', 'is_isolated');

    // Revert status enum to old values
    await queryInterface.sequelize.query(`
      ALTER TABLE incidents 
      MODIFY COLUMN status ENUM(
        'reported', 
        'investigating', 
        'in_progress', 
        'resolved', 
        'closed'
      ) DEFAULT 'reported';
    `);
  }
};
