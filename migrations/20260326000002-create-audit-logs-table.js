'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.ENUM('incident', 'maintenance', 'work_request', 'asset'),
        allowNull: false,
        comment: 'Loại entity'
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID của entity'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Action được thực hiện (triage, approve, close...)'
      },
      from_state: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Trạng thái trước khi thay đổi'
      },
      to_state: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Trạng thái sau khi thay đổi'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID người thực hiện',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      user_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Role của người thực hiện tại thời điểm đó'
      },
      payload: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'Dữ liệu bổ sung (JSON)'
      },
      ip_address: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'IP address'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Indexes
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_logs');
  }
};
