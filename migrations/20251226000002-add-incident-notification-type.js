/**
 * Migration: Add Incident Notification Type (SAP PM-lite Core)
 * 
 * Purpose: Add notification_type field per SAP PM standard
 * Values: M1 (Breakdown - MTBF/MTTR tracked), M2 (Malfunction), M3 (Request), M4 (Activity)
 * 
 * Mapping Logic:
 * - downtime_minutes > 0 → M1 (high confidence)
 * - severity=critical/high + no downtime → M1 (medium confidence)
 * - severity=medium → M2 (medium confidence)
 * - title contains 'request' → M3 (low confidence)
 * - default → M2 (low confidence)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Adding notification_type to incidents table...');
      
      // 1. Add notification_type column (nullable for backward compat)
      await queryInterface.addColumn('incidents', 'notification_type', {
        type: Sequelize.ENUM('M1', 'M2', 'M3', 'M4'),
        allowNull: true,
        comment: 'SAP PM Notification Type: M1=Breakdown (MTBF/MTTR), M2=Malfunction, M3=Request, M4=Activity'
      }, { transaction });
      
      // 2. Add confidence tracking for migration
      await queryInterface.addColumn('incidents', 'notification_type_confidence', {
        type: Sequelize.ENUM('high', 'medium', 'low'),
        allowNull: true,
        comment: 'Confidence level of automatic notification_type mapping'
      }, { transaction });
      
      await queryInterface.addColumn('incidents', 'notification_type_migrated_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when notification_type was auto-migrated'
      }, { transaction });
      
      // 3. Create index
      await queryInterface.addIndex('incidents', ['notification_type'], {
        name: 'idx_incidents_notification_type',
        transaction
      });
      
      // 4. DATA MIGRATION: Intelligent mapping with confidence scoring
      console.log('[MIGRATION] Migrating existing incidents to notification_type...');
      
      // RULE 1: downtime_minutes > 0 → M1 (high confidence)
      const [m1Count] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          notification_type = 'M1',
          notification_type_confidence = 'high',
          notification_type_migrated_at = NOW()
        WHERE downtime_minutes > 0 
        AND notification_type IS NULL
      `, { transaction });
      console.log(`  ✅ M1 (high confidence): ${m1Count.affectedRows || 0} incidents`);
      
      // RULE 2: severity=critical/high + no downtime → M1 (medium confidence)
      const [m1MediumCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          notification_type = 'M1',
          notification_type_confidence = 'medium',
          notification_type_migrated_at = NOW()
        WHERE severity IN ('critical', 'high')
        AND (downtime_minutes IS NULL OR downtime_minutes = 0)
        AND notification_type IS NULL
      `, { transaction });
      console.log(`  ✅ M1 (medium confidence): ${m1MediumCount.affectedRows || 0} incidents`);
      
      // RULE 3: title contains 'request'/'yêu cầu' → M3 (low confidence)
      const [m3Count] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          notification_type = 'M3',
          notification_type_confidence = 'low',
          notification_type_migrated_at = NOW()
        WHERE (
          LOWER(title) LIKE '%request%' OR 
          LOWER(title) LIKE '%yêu cầu%' OR
          LOWER(title) LIKE '%đề xuất%'
        )
        AND notification_type IS NULL
      `, { transaction });
      console.log(`  ✅ M3 (low confidence): ${m3Count.affectedRows || 0} incidents`);
      
      // RULE 4: severity=medium → M2 (medium confidence)
      const [m2MediumCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          notification_type = 'M2',
          notification_type_confidence = 'medium',
          notification_type_migrated_at = NOW()
        WHERE severity = 'medium'
        AND notification_type IS NULL
      `, { transaction });
      console.log(`  ✅ M2 (medium confidence): ${m2MediumCount.affectedRows || 0} incidents`);
      
      // RULE 5: Default → M2 (low confidence)
      const [m2DefaultCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          notification_type = 'M2',
          notification_type_confidence = 'low',
          notification_type_migrated_at = NOW()
        WHERE notification_type IS NULL
      `, { transaction });
      console.log(`  ✅ M2 (low confidence - default): ${m2DefaultCount.affectedRows || 0} incidents`);
      
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
          'incident' as entity_type,
          id as entity_id,
          'MIGRATION_NOTIFICATION_TYPE' as action,
          reported_by as user_id,
          JSON_OBJECT(
            'old_severity', severity,
            'new_notification_type', notification_type,
            'confidence', notification_type_confidence,
            'downtime_minutes', downtime_minutes,
            'migration_date', NOW()
          ) as changes,
          NOW() as created_at
        FROM incidents
        WHERE notification_type_migrated_at IS NOT NULL
      `, { transaction });
      
      // 6. Verification
      const [results] = await queryInterface.sequelize.query(`
        SELECT 
          notification_type, 
          notification_type_confidence,
          COUNT(*) as count 
        FROM incidents 
        GROUP BY notification_type, notification_type_confidence
        ORDER BY notification_type, notification_type_confidence
      `, { transaction });
      
      console.log('[MIGRATION] Notification type distribution:');
      results.forEach(row => {
        console.log(`  ${row.notification_type} (${row.notification_type_confidence}): ${row.count} incidents`);
      });
      
      // 7. Verify M1 distribution (critical for MTBF/MTTR)
      const [m1Verification] = await queryInterface.sequelize.query(`
        SELECT 
          COUNT(*) as total_m1,
          SUM(CASE WHEN downtime_minutes > 0 THEN 1 ELSE 0 END) as m1_with_downtime,
          AVG(downtime_minutes) as avg_downtime_m1
        FROM incidents
        WHERE notification_type = 'M1'
      `, { transaction });
      
      console.log('[MIGRATION] M1 (Breakdown) verification:');
      console.log(`  Total M1: ${m1Verification[0].total_m1}`);
      console.log(`  M1 with downtime: ${m1Verification[0].m1_with_downtime}`);
      console.log(`  Average downtime (M1): ${Math.round(m1Verification[0].avg_downtime_m1 || 0)} minutes`);
      
      await transaction.commit();
      console.log('[MIGRATION] ✅ Successfully added notification_type to incidents');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Failed to add notification_type:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[ROLLBACK] Removing notification_type from incidents table...');
      
      // 1. Remove index
      await queryInterface.removeIndex('incidents', 'idx_incidents_notification_type', { transaction });
      
      // 2. Remove audit log entries
      await queryInterface.sequelize.query(`
        DELETE FROM audit_log 
        WHERE entity_type = 'incident' 
        AND action = 'MIGRATION_NOTIFICATION_TYPE'
      `, { transaction });
      
      // 3. Remove columns
      await queryInterface.removeColumn('incidents', 'notification_type_migrated_at', { transaction });
      await queryInterface.removeColumn('incidents', 'notification_type_confidence', { transaction });
      await queryInterface.removeColumn('incidents', 'notification_type', { transaction });
      
      await transaction.commit();
      console.log('[ROLLBACK] ✅ Successfully removed notification_type from incidents');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[ROLLBACK] ❌ Failed to remove notification_type:', error);
      throw error;
    }
  }
};
