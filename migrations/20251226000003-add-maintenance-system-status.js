/**
 * Migration: Add Maintenance System Status (SAP PM-lite Core)
 * 
 * Purpose: Add system_status field to implement SAP PM-lite gates
 * Values: CRTD (Created), REL (Released - scope locked), TECO (Technically Complete - cost locked)
 * 
 * Gates:
 * - REL: Cannot modify scope fields (asset_id, plan_id, planned_date, assigned_to)
 * - TECO: Cannot modify cost fields (actual_cost, labor_cost, material_cost)
 * 
 * Note: Gates NOT applied retroactively to existing closed records
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Adding system_status to maintenance table...');
      
      // 1. Add system_status column (nullable for backward compat)
      await queryInterface.addColumn('maintenance', 'system_status', {
        type: Sequelize.ENUM('CRTD', 'REL', 'TECO'),
        allowNull: true,
        comment: 'SAP PM System Status: CRTD=Created, REL=Released (scope locked), TECO=Technically Complete (cost locked)'
      }, { transaction });
      
      // 2. Add audit trail fields
      await queryInterface.addColumn('maintenance', 'system_status_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when system_status last changed'
      }, { transaction });
      
      await queryInterface.addColumn('maintenance', 'system_status_changed_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User ID who changed system_status'
      }, { transaction });
      
      // 3. Add gate lock timestamps
      await queryInterface.addColumn('maintenance', 'scope_locked_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when scope was locked (REL status)'
      }, { transaction });
      
      await queryInterface.addColumn('maintenance', 'cost_locked_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when cost was locked (TECO status)'
      }, { transaction });
      
      // 4. Add flag for migrated records (gates not enforced)
      await queryInterface.addColumn('maintenance', 'is_migrated_record', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag to indicate migrated record (gates not enforced retroactively)'
      }, { transaction });
      
      // 5. Create indexes
      await queryInterface.addIndex('maintenance', ['system_status'], {
        name: 'idx_maintenance_system_status',
        transaction
      });
      
      await queryInterface.addIndex('maintenance', ['scope_locked_at'], {
        name: 'idx_maintenance_scope_locked_at',
        transaction
      });
      
      // 6. DATA MIGRATION: Map user_status to system_status
      console.log('[MIGRATION] Migrating existing maintenance records to system_status...');
      
      // RULE 1: closed → TECO (cost locked)
      const [tecoCount] = await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET 
          system_status = 'TECO',
          system_status_changed_at = COALESCE(closed_date, NOW()),
          cost_locked_at = COALESCE(closed_date, NOW()),
          is_migrated_record = true
        WHERE status = 'closed'
        AND system_status IS NULL
      `, { transaction });
      console.log(`  ✅ TECO (closed): ${tecoCount.affectedRows || 0} records`);
      
      // RULE 2: in_progress/awaiting_acceptance/accepted → REL (scope locked)
      const [relCount] = await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET 
          system_status = 'REL',
          system_status_changed_at = COALESCE(actual_start_date, scheduled_at, NOW()),
          scope_locked_at = COALESCE(actual_start_date, scheduled_at, NOW()),
          is_migrated_record = true
        WHERE status IN ('in_progress', 'awaiting_acceptance', 'accepted')
        AND system_status IS NULL
      `, { transaction });
      console.log(`  ✅ REL (in progress): ${relCount.affectedRows || 0} records`);
      
      // RULE 3: scheduled → REL (if has scheduled_at)
      const [scheduledRelCount] = await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET 
          system_status = 'REL',
          system_status_changed_at = COALESCE(scheduled_at, NOW()),
          scope_locked_at = COALESCE(scheduled_at, NOW()),
          is_migrated_record = true
        WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND system_status IS NULL
      `, { transaction });
      console.log(`  ✅ REL (scheduled): ${scheduledRelCount.affectedRows || 0} records`);
      
      // RULE 4: draft/pending/approved → CRTD
      const [crtdCount] = await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET 
          system_status = 'CRTD',
          system_status_changed_at = created_at,
          is_migrated_record = true
        WHERE status IN ('draft', 'pending', 'approved', 'scheduled')
        AND system_status IS NULL
      `, { transaction });
      console.log(`  ✅ CRTD (draft/pending): ${crtdCount.affectedRows || 0} records`);
      
      // RULE 5: cancelled → NULL (no system status)
      const [cancelledCount] = await queryInterface.sequelize.query(`
        UPDATE maintenance 
        SET 
          is_migrated_record = true
        WHERE status = 'cancelled'
        AND system_status IS NULL
      `, { transaction });
      console.log(`  ✅ NULL (cancelled): ${cancelledCount.affectedRows || 0} records`);
      
      // 7. Insert audit log for migration
      await queryInterface.sequelize.query(`
        INSERT INTO audit_log (
          entity_type, 
          entity_id, 
          action, 
          user_id, 
          changes, 
          created_at
        )
        SELECT 
          'maintenance' as entity_type,
          id as entity_id,
          'MIGRATION_SYSTEM_STATUS' as action,
          created_by as user_id,
          JSON_OBJECT(
            'old_user_status', status,
            'new_system_status', system_status,
            'is_migrated_record', is_migrated_record,
            'migration_date', NOW()
          ) as changes,
          NOW() as created_at
        FROM maintenance
        WHERE system_status IS NOT NULL OR status = 'cancelled'
      `, { transaction });
      
      // 8. Verification
      const [results] = await queryInterface.sequelize.query(`
        SELECT 
          status as user_status,
          system_status,
          COUNT(*) as count,
          SUM(CASE WHEN is_migrated_record = true THEN 1 ELSE 0 END) as migrated_count
        FROM maintenance 
        GROUP BY status, system_status
        ORDER BY system_status, status
      `, { transaction });
      
      console.log('[MIGRATION] System status distribution:');
      results.forEach(row => {
        console.log(`  ${row.system_status || 'NULL'} (user_status=${row.user_status}): ${row.count} records (${row.migrated_count} migrated)`);
      });
      
      // 9. Verify gates won't break existing records
      const [gateVerification] = await queryInterface.sequelize.query(`
        SELECT 
          system_status,
          COUNT(*) as total,
          SUM(CASE WHEN is_migrated_record = true THEN 1 ELSE 0 END) as migrated,
          SUM(CASE WHEN scope_locked_at IS NOT NULL THEN 1 ELSE 0 END) as scope_locked,
          SUM(CASE WHEN cost_locked_at IS NOT NULL THEN 1 ELSE 0 END) as cost_locked
        FROM maintenance
        WHERE system_status IS NOT NULL
        GROUP BY system_status
      `, { transaction });
      
      console.log('[MIGRATION] Gate lock verification:');
      gateVerification.forEach(row => {
        console.log(`  ${row.system_status}: ${row.total} total, ${row.migrated} migrated, ${row.scope_locked} scope locked, ${row.cost_locked} cost locked`);
      });
      
      await transaction.commit();
      console.log('[MIGRATION] ✅ Successfully added system_status to maintenance');
      console.log('[MIGRATION] ⚠️  Gates NOT enforced for migrated records (is_migrated_record=true)');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Failed to add system_status:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[ROLLBACK] Removing system_status from maintenance table...');
      
      // 1. Remove indexes
      await queryInterface.removeIndex('maintenance', 'idx_maintenance_system_status', { transaction });
      await queryInterface.removeIndex('maintenance', 'idx_maintenance_scope_locked_at', { transaction });
      
      // 2. Remove audit log entries
      await queryInterface.sequelize.query(`
        DELETE FROM audit_log 
        WHERE entity_type = 'maintenance' 
        AND action = 'MIGRATION_SYSTEM_STATUS'
      `, { transaction });
      
      // 3. Remove columns
      await queryInterface.removeColumn('maintenance', 'is_migrated_record', { transaction });
      await queryInterface.removeColumn('maintenance', 'cost_locked_at', { transaction });
      await queryInterface.removeColumn('maintenance', 'scope_locked_at', { transaction });
      await queryInterface.removeColumn('maintenance', 'system_status_changed_by', { transaction });
      await queryInterface.removeColumn('maintenance', 'system_status_changed_at', { transaction });
      await queryInterface.removeColumn('maintenance', 'system_status', { transaction });
      
      await transaction.commit();
      console.log('[ROLLBACK] ✅ Successfully removed system_status from maintenance');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[ROLLBACK] ❌ Failed to remove system_status:', error);
      throw error;
    }
  }
};
