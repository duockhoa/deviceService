/**
 * Migration: Enhance Audit Log for SAP PM-lite State Transitions
 * 
 * Purpose: Add tracking fields for system status transitions and side effects
 * 
 * New fields:
 * - action_type: Category of action (state_transition, data_update, system_event)
 * - from_state: Previous state value (JSON for multiple state types)
 * - to_state: New state value (JSON for multiple state types)
 * - side_effects_executed: Array of side effects that were triggered
 * - execution_duration_ms: Time taken to execute transition
 * - error_details: JSON object for failed transitions
 * 
 * Enables:
 * - Full audit trail of state machine transitions
 * - Debugging side effects (e.g., why asset went to MNTC)
 * - Compliance reporting (who changed what, when, why)
 * - Performance monitoring of transitions
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Enhancing audit_log table for SAP PM-lite...');
      
      // 1. Add action_type ENUM
      await queryInterface.addColumn('audit_log', 'action_type', {
        type: Sequelize.ENUM('state_transition', 'data_update', 'system_event', 'migration', 'other'),
        allowNull: true,
        defaultValue: 'other',
        comment: 'Category of action: state_transition (status change), data_update (field change), system_event (auto action), migration (data migration), other'
      }, { transaction });
      
      // 2. Add state transition tracking
      await queryInterface.addColumn('audit_log', 'from_state', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous state value(s) - JSON object with status, system_status, operational_status, notification_type'
      }, { transaction });
      
      await queryInterface.addColumn('audit_log', 'to_state', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New state value(s) - JSON object with status, system_status, operational_status, notification_type'
      }, { transaction });
      
      // 3. Add side effects tracking
      await queryInterface.addColumn('audit_log', 'side_effects_executed', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of side effect names that were executed (e.g., ["setAssetMNTC", "sendNotification"])'
      }, { transaction });
      
      // 4. Add performance tracking
      await queryInterface.addColumn('audit_log', 'execution_duration_ms', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Time taken to execute transition in milliseconds'
      }, { transaction });
      
      // 5. Add error tracking
      await queryInterface.addColumn('audit_log', 'error_details', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Error details for failed transitions - JSON object with error, stack, retry_count'
      }, { transaction });
      
      // 6. Add IP address for compliance
      await queryInterface.addColumn('audit_log', 'ip_address', {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of user who performed action (supports IPv6)'
      }, { transaction });
      
      // 7. Add user agent for compliance
      await queryInterface.addColumn('audit_log', 'user_agent', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/client user agent string'
      }, { transaction });
      
      // 8. Create indexes for performance
      await queryInterface.addIndex('audit_log', ['action_type'], {
        name: 'idx_audit_log_action_type',
        transaction
      });
      
      await queryInterface.addIndex('audit_log', ['entity_type', 'action_type'], {
        name: 'idx_audit_log_entity_action_type',
        transaction
      });
      
      await queryInterface.addIndex('audit_log', ['created_at'], {
        name: 'idx_audit_log_created_at',
        transaction
      });
      
      // 9. DATA MIGRATION: Classify existing audit_log records
      console.log('[MIGRATION] Classifying existing audit_log records...');
      
      // Classify migration records
      const [migrationCount] = await queryInterface.sequelize.query(`
        UPDATE audit_log 
        SET action_type = 'migration'
        WHERE action IN (
          'MIGRATION_SYSTEM_STATUS', 
          'MIGRATION_OPERATIONAL_STATUS', 
          'MIGRATION_NOTIFICATION_TYPE'
        )
        AND action_type = 'other'
      `, { transaction });
      console.log(`  ✅ Migration records: ${migrationCount.affectedRows || 0}`);
      
      // Classify state transition records (status change in changes field)
      const [transitionCount] = await queryInterface.sequelize.query(`
        UPDATE audit_log 
        SET action_type = 'state_transition'
        WHERE (
          JSON_CONTAINS_PATH(changes, 'one', '$.old_status', '$.new_status')
          OR JSON_CONTAINS_PATH(changes, 'one', '$.old_system_status', '$.new_system_status')
          OR JSON_CONTAINS_PATH(changes, 'one', '$.old_operational_status', '$.new_operational_status')
          OR JSON_CONTAINS_PATH(changes, 'one', '$.old_notification_type', '$.new_notification_type')
        )
        AND action_type = 'other'
      `, { transaction });
      console.log(`  ✅ State transition records: ${transitionCount.affectedRows || 0}`);
      
      // Classify data update records
      const [dataUpdateCount] = await queryInterface.sequelize.query(`
        UPDATE audit_log 
        SET action_type = 'data_update'
        WHERE action IN ('UPDATE', 'update', 'edit', 'modify')
        AND action_type = 'other'
      `, { transaction });
      console.log(`  ✅ Data update records: ${dataUpdateCount.affectedRows || 0}`);
      
      // Classify system event records
      const [systemEventCount] = await queryInterface.sequelize.query(`
        UPDATE audit_log 
        SET action_type = 'system_event'
        WHERE action IN ('auto_escalate', 'auto_close', 'scheduled_maintenance', 'cron_job')
        AND action_type = 'other'
      `, { transaction });
      console.log(`  ✅ System event records: ${systemEventCount.affectedRows || 0}`);
      
      // 10. Verification
      const [distribution] = await queryInterface.sequelize.query(`
        SELECT 
          action_type,
          entity_type,
          COUNT(*) as count,
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM audit_log
        GROUP BY action_type, entity_type
        ORDER BY action_type, entity_type
      `, { transaction });
      
      console.log('[MIGRATION] Audit log action_type distribution:');
      distribution.forEach(row => {
        console.log(`  ${row.action_type} (${row.entity_type}): ${row.count} records`);
      });
      
      // 11. Verify JSON columns
      const [jsonVerification] = await queryInterface.sequelize.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN from_state IS NOT NULL THEN 1 ELSE 0 END) as has_from_state,
          SUM(CASE WHEN to_state IS NOT NULL THEN 1 ELSE 0 END) as has_to_state,
          SUM(CASE WHEN side_effects_executed IS NOT NULL THEN 1 ELSE 0 END) as has_side_effects,
          SUM(CASE WHEN error_details IS NOT NULL THEN 1 ELSE 0 END) as has_errors
        FROM audit_log
      `, { transaction });
      
      console.log('[MIGRATION] New column usage (should be 0 for migration):');
      console.log(`  Total records: ${jsonVerification[0].total}`);
      console.log(`  Has from_state: ${jsonVerification[0].has_from_state}`);
      console.log(`  Has to_state: ${jsonVerification[0].has_to_state}`);
      console.log(`  Has side_effects: ${jsonVerification[0].has_side_effects}`);
      console.log(`  Has errors: ${jsonVerification[0].has_errors}`);
      
      await transaction.commit();
      console.log('[MIGRATION] ✅ Successfully enhanced audit_log table');
      console.log('[MIGRATION] ℹ️  New fields will be populated by TransitionService');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Failed to enhance audit_log:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[ROLLBACK] Removing audit_log enhancements...');
      
      // 1. Remove indexes
      await queryInterface.removeIndex('audit_log', 'idx_audit_log_created_at', { transaction });
      await queryInterface.removeIndex('audit_log', 'idx_audit_log_entity_action_type', { transaction });
      await queryInterface.removeIndex('audit_log', 'idx_audit_log_action_type', { transaction });
      
      // 2. Remove columns
      await queryInterface.removeColumn('audit_log', 'user_agent', { transaction });
      await queryInterface.removeColumn('audit_log', 'ip_address', { transaction });
      await queryInterface.removeColumn('audit_log', 'error_details', { transaction });
      await queryInterface.removeColumn('audit_log', 'execution_duration_ms', { transaction });
      await queryInterface.removeColumn('audit_log', 'side_effects_executed', { transaction });
      await queryInterface.removeColumn('audit_log', 'to_state', { transaction });
      await queryInterface.removeColumn('audit_log', 'from_state', { transaction });
      await queryInterface.removeColumn('audit_log', 'action_type', { transaction });
      
      await transaction.commit();
      console.log('[ROLLBACK] ✅ Successfully removed audit_log enhancements');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[ROLLBACK] ❌ Failed to remove audit_log enhancements:', error);
      throw error;
    }
  }
};
