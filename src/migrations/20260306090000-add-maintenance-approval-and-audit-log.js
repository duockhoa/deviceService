'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('maintenance', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'in_progress', 'awaiting_approval', 'completed', 'cancelled', 'closed'),
      allowNull: false,
      defaultValue: 'pending'
    });

    await queryInterface.addColumn('maintenance', 'approved_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'technician_id'
    });
    await queryInterface.addColumn('maintenance', 'approved_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'approved_by'
    });
    await queryInterface.addColumn('maintenance', 'approval_comment', {
      type: Sequelize.STRING(500),
      allowNull: true,
      after: 'approved_at'
    });

    await queryInterface.addColumn('maintenance', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'approval_comment'
    });
    await queryInterface.addColumn('maintenance', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'is_deleted'
    });
    await queryInterface.addColumn('maintenance', 'deleted_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'deleted_at'
    });

    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      before_json: {
        type: Sequelize.JSON,
        allowNull: true
      },
      after_json: {
        type: Sequelize.JSON,
        allowNull: true
      },
      reason: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      correlation_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.changeColumn('maintenance', 'status', {
      type: queryInterface.sequelize.literal("ENUM('pending', 'in_progress', 'awaiting_approval', 'completed', 'cancelled')"),
      allowNull: false,
      defaultValue: 'pending'
    });
    await queryInterface.removeColumn('maintenance', 'approved_by');
    await queryInterface.removeColumn('maintenance', 'approved_at');
    await queryInterface.removeColumn('maintenance', 'approval_comment');
    await queryInterface.removeColumn('maintenance', 'is_deleted');
    await queryInterface.removeColumn('maintenance', 'deleted_at');
    await queryInterface.removeColumn('maintenance', 'deleted_by');
    await queryInterface.dropTable('audit_logs');
  }
};
