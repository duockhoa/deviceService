/**
 * Migration: Add Asset Operational Status (SAP PM-lite Core)
 * 
 * Purpose: Add operational_status field to track asset availability per SAP PM standard
 * Values: AVLB (Available), MNTC (Maintenance), DOWN (Breakdown), DCOM (Decommissioned)
 * 
 * This replaces the simple active/inactive status with proper SAP PM operational states
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Adding operational_status to assets table...');
      
      // 1. Add operational_status column
      await queryInterface.addColumn('assets', 'operational_status', {
        type: Sequelize.ENUM('AVLB', 'MNTC', 'DOWN', 'DCOM'),
        allowNull: false,
        defaultValue: 'AVLB',
        comment: 'SAP PM Operational Status: AVLB=Available, MNTC=Maintenance, DOWN=Breakdown, DCOM=Decommissioned'
      }, { transaction });
      
      // 2. Add audit trail fields
      await queryInterface.addColumn('assets', 'operational_status_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when operational_status last changed'
      }, { transaction });
      
      await queryInterface.addColumn('assets', 'operational_status_changed_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User ID who changed operational_status'
      }, { transaction });
      
      await queryInterface.addColumn('assets', 'operational_status_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes explaining operational status change'
      }, { transaction });
      
      // 3. Create indexes for performance
      await queryInterface.addIndex('assets', ['operational_status'], {
        name: 'idx_assets_operational_status',
        transaction
      });
      
      await queryInterface.addIndex('assets', ['operational_status_changed_at'], {
        name: 'idx_assets_op_status_changed_at',
        transaction
      });
      
      // 4. DATA MIGRATION: Map old status to new operational_status
      console.log('[MIGRATION] Migrating existing data: status → operational_status...');
      
      // active → AVLB (Available)
      await queryInterface.sequelize.query(`
        UPDATE assets 
        SET 
          operational_status = 'AVLB',
          operational_status_changed_at = NOW(),
          operational_status_notes = 'Migrated from status=active'
        WHERE status = 'active'
      `, { transaction });
      
      // inactive → DCOM (Decommissioned)
      await queryInterface.sequelize.query(`
        UPDATE assets 
        SET 
          operational_status = 'DCOM',
          operational_status_changed_at = NOW(),
          operational_status_notes = 'Migrated from status=inactive'
        WHERE status = 'inactive'
      `, { transaction });
      
      // 5. Insert audit log for migration
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
          'asset' as entity_type,
          id as entity_id,
          'MIGRATION_OPERATIONAL_STATUS' as action,
          created_by as user_id,
          JSON_OBJECT(
            'old_status', status,
            'new_operational_status', operational_status,
            'migration_date', NOW()
          ) as changes,
          NOW() as created_at
        FROM assets
      `, { transaction });
      
      // 6. Verification
      const [results] = await queryInterface.sequelize.query(`
        SELECT 
          operational_status, 
          COUNT(*) as count 
        FROM assets 
        GROUP BY operational_status
      `, { transaction });
      
      console.log('[MIGRATION] Operational status distribution:');
      results.forEach(row => {
        console.log(`  ${row.operational_status}: ${row.count} assets`);
      });
      
      await transaction.commit();
      console.log('[MIGRATION] ✅ Successfully added operational_status to assets');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Failed to add operational_status:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[ROLLBACK] Removing operational_status from assets table...');
      
      // 1. Remove indexes
      await queryInterface.removeIndex('assets', 'idx_assets_operational_status', { transaction });
      await queryInterface.removeIndex('assets', 'idx_assets_op_status_changed_at', { transaction });
      
      // 2. Remove audit log entries
      await queryInterface.sequelize.query(`
        DELETE FROM audit_log 
        WHERE entity_type = 'asset' 
        AND action = 'MIGRATION_OPERATIONAL_STATUS'
      `, { transaction });
      
      // 3. Remove columns
      await queryInterface.removeColumn('assets', 'operational_status_notes', { transaction });
      await queryInterface.removeColumn('assets', 'operational_status_changed_by', { transaction });
      await queryInterface.removeColumn('assets', 'operational_status_changed_at', { transaction });
      await queryInterface.removeColumn('assets', 'operational_status', { transaction });
      
      await transaction.commit();
      console.log('[ROLLBACK] ✅ Successfully removed operational_status from assets');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[ROLLBACK] ❌ Failed to remove operational_status:', error);
      throw error;
    }
  }
};
