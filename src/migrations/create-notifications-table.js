'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM(
          'maintenance_created',
          'maintenance_assigned',
          'maintenance_started',
          'maintenance_completed',
          'maintenance_approved',
          'maintenance_rejected',
          'maintenance_due_soon',
          'maintenance_overdue',
          'calibration_created',
          'calibration_completed',
          'calibration_due_soon',
          'work_request_created',
          'work_request_assigned',
          'work_request_updated',
          'work_request_completed',
          'incident_created',
          'incident_assigned',
          'incident_updated',
          'incident_resolved',
          'asset_status_changed',
          'asset_warranty_expiring',
          'plan_created',
          'plan_approved',
          'plan_rejected',
          'plan_due_soon'
        ),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      reference_type: {
        type: Sequelize.ENUM('maintenance', 'calibration', 'work_request', 'incident', 'asset', 'plan'),
        allowNull: false
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      recipient_type: {
        type: Sequelize.ENUM('user', 'department'),
        allowNull: false
      },
      recipient_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'user_id hoặc department_name'
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      sender_type: {
        type: Sequelize.ENUM('system', 'user'),
        defaultValue: 'system'
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON data: {asset_code, maintenance_code, etc.}'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Thông báo có thể tự động hết hạn'
      }
    });

    // Tạo indexes
    await queryInterface.addIndex('notifications', ['recipient_type', 'recipient_id'], {
      name: 'idx_recipient'
    });
    
    await queryInterface.addIndex('notifications', ['reference_type', 'reference_id'], {
      name: 'idx_reference'
    });
    
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_created_at'
    });
    
    await queryInterface.addIndex('notifications', ['is_read'], {
      name: 'idx_is_read'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
  }
};
