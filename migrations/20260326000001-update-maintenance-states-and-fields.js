'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Cập nhật ENUM cho status
    await queryInterface.sequelize.query(`
      ALTER TABLE maintenance 
      MODIFY COLUMN status ENUM(
        'draft',
        'pending', 
        'approved', 
        'scheduled',
        'in_progress', 
        'awaiting_acceptance',
        'accepted',
        'completed',
        'closed', 
        'cancelled'
      ) DEFAULT 'pending';
    `);

    // 2. Thêm các trường mới theo yêu cầu
    await queryInterface.addColumn('maintenance', 'shift', {
      type: Sequelize.ENUM('A', 'B', 'C'),
      allowNull: true,
      comment: 'Ca làm việc thực hiện bảo trì'
    });

    await queryInterface.addColumn('maintenance', 'accepted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời gian nghiệm thu (QA/Engineering)'
    });

    await queryInterface.addColumn('maintenance', 'accepted_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID người nghiệm thu',
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('maintenance', 'acceptance_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Ghi chú nghiệm thu'
    });

    await queryInterface.addColumn('maintenance', 'handover_confirmed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm bàn giao lại xưởng'
    });

    await queryInterface.addColumn('maintenance', 'handover_confirmed_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID người xác nhận bàn giao',
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('maintenance', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm hủy'
    });

    await queryInterface.addColumn('maintenance', 'cancelled_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID người hủy',
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('maintenance', 'cancel_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Lý do hủy'
    });

    await queryInterface.addColumn('maintenance', 'scheduled_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID người lập lịch',
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('maintenance', 'scheduled_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm lập lịch'
    });

    await queryInterface.addColumn('maintenance', 'rejection_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Số lần bị reject acceptance'
    });

    await queryInterface.addColumn('maintenance', 'rejection_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Ghi chú các lần reject'
    });

    // 3. Thêm indexes
    await queryInterface.addIndex('maintenance', ['shift']);
    await queryInterface.addIndex('maintenance', ['accepted_by']);
    await queryInterface.addIndex('maintenance', ['scheduled_by']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('maintenance', ['scheduled_by']);
    await queryInterface.removeIndex('maintenance', ['accepted_by']);
    await queryInterface.removeIndex('maintenance', ['shift']);

    // Remove columns
    await queryInterface.removeColumn('maintenance', 'rejection_notes');
    await queryInterface.removeColumn('maintenance', 'rejection_count');
    await queryInterface.removeColumn('maintenance', 'scheduled_at');
    await queryInterface.removeColumn('maintenance', 'scheduled_by');
    await queryInterface.removeColumn('maintenance', 'cancel_reason');
    await queryInterface.removeColumn('maintenance', 'cancelled_by');
    await queryInterface.removeColumn('maintenance', 'cancelled_at');
    await queryInterface.removeColumn('maintenance', 'handover_confirmed_by');
    await queryInterface.removeColumn('maintenance', 'handover_confirmed_at');
    await queryInterface.removeColumn('maintenance', 'acceptance_notes');
    await queryInterface.removeColumn('maintenance', 'accepted_by');
    await queryInterface.removeColumn('maintenance', 'accepted_at');
    await queryInterface.removeColumn('maintenance', 'shift');

    // Revert status enum to old values
    await queryInterface.sequelize.query(`
      ALTER TABLE maintenance 
      MODIFY COLUMN status ENUM(
        'pending', 
        'approved', 
        'in_progress', 
        'awaiting_approval', 
        'completed', 
        'cancelled', 
        'closed'
      ) DEFAULT 'pending';
    `);
  }
};
