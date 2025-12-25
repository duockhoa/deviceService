/**
 * Migration: Add Traceability Cross-References (SAP PM-lite Core)
 * 
 * Purpose: Establish bidirectional traceability between entities
 * 
 * Traceability Chain (SAP PM-lite flow):
 * 1. Work Request (Optional) → Notification (M1/M2/M3/M4)
 * 2. Notification → Work Order (Maintenance)
 * 3. Work Order → Follow-up Notification (if needed)
 * 
 * New Fields:
 * - incidents.work_request_id: Link to originating work request
 * - incidents.parent_incident_id: Link to parent incident (for follow-ups)
 * - maintenance.incident_id: Link to triggering notification
 * - maintenance.parent_maintenance_id: Link to parent work order (for follow-ups)
 * 
 * Benefits:
 * - Full audit trail from request → notification → work → result
 * - Compliance reporting (trace asset history)
 * - KPI accuracy (link M1 incident to maintenance duration)
 * - Follow-up tracking (recurrent issues)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Adding traceability cross-references...');
      
      // ===== INCIDENTS TABLE =====
      
      // 1. Add work_request_id (link to originating request)
      await queryInterface.addColumn('incidents', 'work_request_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'work_requests',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Work request that triggered this notification (optional)'
      }, { transaction });
      
      // 2. Add parent_incident_id (for follow-up notifications)
      await queryInterface.addColumn('incidents', 'parent_incident_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'incidents',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Parent incident if this is a follow-up notification'
      }, { transaction });
      
      // 3. Add follow-up tracking
      await queryInterface.addColumn('incidents', 'has_follow_ups', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag indicating if this incident has follow-up notifications'
      }, { transaction });
      
      // 4. Add follow-up reason
      await queryInterface.addColumn('incidents', 'follow_up_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for creating follow-up notification (e.g., issue recurred, additional work needed)'
      }, { transaction });
      
      // ===== MAINTENANCE TABLE =====
      
      // 5. Add incident_id (link to triggering notification)
      await queryInterface.addColumn('maintenance', 'incident_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'incidents',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Notification that triggered this work order (for corrective maintenance)'
      }, { transaction });
      
      // 6. Add parent_maintenance_id (for follow-up work orders)
      await queryInterface.addColumn('maintenance', 'parent_maintenance_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'maintenance',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Parent work order if this is a follow-up or split work'
      }, { transaction });
      
      // 7. Add follow-up tracking
      await queryInterface.addColumn('maintenance', 'has_follow_ups', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag indicating if this work order has follow-up work orders'
      }, { transaction });
      
      // 8. Add follow-up reason
      await queryInterface.addColumn('maintenance', 'follow_up_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for creating follow-up work order (e.g., additional work discovered, scope expansion)'
      }, { transaction });
      
      // ===== CREATE INDEXES =====
      
      console.log('[MIGRATION] Creating indexes for traceability...');
      
      // Incidents indexes
      await queryInterface.addIndex('incidents', ['work_request_id'], {
        name: 'idx_incidents_work_request_id',
        transaction
      });
      
      await queryInterface.addIndex('incidents', ['parent_incident_id'], {
        name: 'idx_incidents_parent_incident_id',
        transaction
      });
      
      await queryInterface.addIndex('incidents', ['has_follow_ups'], {
        name: 'idx_incidents_has_follow_ups',
        transaction
      });
      
      // Maintenance indexes
      await queryInterface.addIndex('maintenance', ['incident_id'], {
        name: 'idx_maintenance_incident_id',
        transaction
      });
      
      await queryInterface.addIndex('maintenance', ['parent_maintenance_id'], {
        name: 'idx_maintenance_parent_maintenance_id',
        transaction
      });
      
      await queryInterface.addIndex('maintenance', ['has_follow_ups'], {
        name: 'idx_maintenance_has_follow_ups',
        transaction
      });
      
      // ===== DATA MIGRATION =====
      
      console.log('[MIGRATION] Attempting to infer traceability from existing data...');
      
      // STEP 1: Link maintenance to incidents (if maintenance.incident_code matches incident.incident_code)
      const [maintenanceLinked] = await queryInterface.sequelize.query(`
        UPDATE maintenance m
        INNER JOIN incidents i ON m.incident_code = i.incident_code
        SET m.incident_id = i.id
        WHERE m.incident_id IS NULL
        AND m.incident_code IS NOT NULL
        AND m.incident_code != ''
      `, { transaction });
      console.log(`  Linked maintenance to incidents: ${maintenanceLinked.affectedRows || 0} work orders`);
      
      // STEP 2: Detect follow-up incidents (same asset + similar title + created within 30 days)
      const [followUpIncidents] = await queryInterface.sequelize.query(`
        UPDATE incidents i1
        INNER JOIN (
          SELECT 
            i2.id as child_id,
            i1.id as parent_id
          FROM incidents i1
          INNER JOIN incidents i2 ON i1.asset_id = i2.asset_id
          WHERE i2.created_at > i1.created_at
          AND i2.created_at <= DATE_ADD(i1.created_at, INTERVAL 30 DAY)
          AND i1.status IN ('closed', 'resolved')
          AND (
            LOWER(i2.title) LIKE CONCAT('%', LOWER(SUBSTRING_INDEX(i1.title, ' ', 3)), '%')
            OR i2.description LIKE CONCAT('%follow-up%')
            OR i2.description LIKE CONCAT('%tái phát%')
          )
          GROUP BY i2.id
          HAVING MIN(i1.created_at) = (
            SELECT MIN(i3.created_at)
            FROM incidents i3
            WHERE i3.asset_id = i2.asset_id
            AND i3.status IN ('closed', 'resolved')
            AND i3.created_at < i2.created_at
          )
        ) matches ON i1.id = matches.child_id
        SET 
          i1.parent_incident_id = matches.parent_id,
          i1.follow_up_reason = 'Auto-detected: Similar issue on same asset within 30 days'
        WHERE i1.parent_incident_id IS NULL
      `, { transaction });
      console.log(`   Detected follow-up incidents: ${followUpIncidents.affectedRows || 0} incidents`);
      
      // STEP 3: Mark parent incidents that have follow-ups
      const [parentIncidents] = await queryInterface.sequelize.query(`
        UPDATE incidents i1
        INNER JOIN (
          SELECT DISTINCT parent_incident_id
          FROM incidents
          WHERE parent_incident_id IS NOT NULL
        ) children ON i1.id = children.parent_incident_id
        SET i1.has_follow_ups = true
      `, { transaction });
      console.log(`   Marked parent incidents with follow-ups: ${parentIncidents.affectedRows || 0} incidents`);
      
      // STEP 4: Detect follow-up maintenance (same asset + created within 7 days of parent completion)
      const [followUpMaintenance] = await queryInterface.sequelize.query(`
        UPDATE maintenance m1
        INNER JOIN (
          SELECT 
            m2.id as child_id,
            m1.id as parent_id
          FROM maintenance m1
          INNER JOIN maintenance m2 ON m1.asset_id = m2.asset_id
          WHERE m2.created_at > m1.closed_date
          AND m2.created_at <= DATE_ADD(m1.closed_date, INTERVAL 7 DAY)
          AND m1.status = 'closed'
          AND (
            m2.description LIKE CONCAT('%follow-up%')
            OR m2.description LIKE CONCAT('%tiếp theo%')
            OR m2.description LIKE CONCAT('%bổ sung%')
          )
          GROUP BY m2.id
          HAVING MIN(m1.closed_date) = (
            SELECT MIN(m3.closed_date)
            FROM maintenance m3
            WHERE m3.asset_id = m2.asset_id
            AND m3.status = 'closed'
            AND m3.closed_date < m2.created_at
          )
        ) matches ON m1.id = matches.child_id
        SET 
          m1.parent_maintenance_id = matches.parent_id,
          m1.follow_up_reason = 'Auto-detected: Additional work within 7 days of parent completion'
        WHERE m1.parent_maintenance_id IS NULL
      `, { transaction });
      console.log(`  ✅ Detected follow-up maintenance: ${followUpMaintenance.affectedRows || 0} work orders`);
      
      // STEP 5: Mark parent maintenance that have follow-ups
      const [parentMaintenance] = await queryInterface.sequelize.query(`
        UPDATE maintenance m1
        INNER JOIN (
          SELECT DISTINCT parent_maintenance_id
          FROM maintenance
          WHERE parent_maintenance_id IS NOT NULL
        ) children ON m1.id = children.parent_maintenance_id
        SET m1.has_follow_ups = true
      `, { transaction });
      console.log(`  ✅ Marked parent maintenance with follow-ups: ${parentMaintenance.affectedRows || 0} work orders`);
      
      // ===== VERIFICATION =====
      
      const [incidentTraceability] = await queryInterface.sequelize.query(`
        SELECT 
          COUNT(*) as total_incidents,
          SUM(CASE WHEN work_request_id IS NOT NULL THEN 1 ELSE 0 END) as has_work_request,
          SUM(CASE WHEN parent_incident_id IS NOT NULL THEN 1 ELSE 0 END) as is_follow_up,
          SUM(CASE WHEN has_follow_ups = true THEN 1 ELSE 0 END) as has_follow_ups_count
        FROM incidents
      `, { transaction });
      
      console.log('[MIGRATION] Incident traceability:');
      console.log(`  Total incidents: ${incidentTraceability[0].total_incidents}`);
      console.log(`  Linked to work request: ${incidentTraceability[0].has_work_request}`);
      console.log(`  Follow-up incidents: ${incidentTraceability[0].is_follow_up}`);
      console.log(`  Incidents with follow-ups: ${incidentTraceability[0].has_follow_ups_count}`);
      
      const [maintenanceTraceability] = await queryInterface.sequelize.query(`
        SELECT 
          COUNT(*) as total_maintenance,
          SUM(CASE WHEN incident_id IS NOT NULL THEN 1 ELSE 0 END) as linked_to_incident,
          SUM(CASE WHEN parent_maintenance_id IS NOT NULL THEN 1 ELSE 0 END) as is_follow_up,
          SUM(CASE WHEN has_follow_ups = true THEN 1 ELSE 0 END) as has_follow_ups_count
        FROM maintenance
      `, { transaction });
      
      console.log('[MIGRATION] Maintenance traceability:');
      console.log(`  Total work orders: ${maintenanceTraceability[0].total_maintenance}`);
      console.log(`  Linked to notification: ${maintenanceTraceability[0].linked_to_incident}`);
      console.log(`  Follow-up work orders: ${maintenanceTraceability[0].is_follow_up}`);
      console.log(`  Work orders with follow-ups: ${maintenanceTraceability[0].has_follow_ups_count}`);
      
      // ===== INSERT AUDIT LOG =====
      
      await queryInterface.sequelize.query(`
        INSERT INTO audit_log (
          entity_type, 
          action_type,
          action, 
          user_id, 
          changes, 
          created_at
        )
        VALUES (
          'system',
          'migration',
          'MIGRATION_TRACEABILITY',
          NULL,
          JSON_OBJECT(
            'incidents_linked_to_work_request', ${incidentTraceability[0].has_work_request},
            'follow_up_incidents_detected', ${incidentTraceability[0].is_follow_up},
            'maintenance_linked_to_incident', ${maintenanceTraceability[0].linked_to_incident},
            'follow_up_maintenance_detected', ${maintenanceTraceability[0].is_follow_up},
            'migration_date', NOW()
          ),
          NOW()
        )
      `, { transaction });
      
      await transaction.commit();
      console.log('[MIGRATION] ✅ Successfully added traceability cross-references');
      console.log('[MIGRATION] ℹ️  Auto-detection is best-effort. Manual review recommended.');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Failed to add traceability:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[ROLLBACK] Removing traceability cross-references...');
      
      // Remove indexes - Maintenance
      await queryInterface.removeIndex('maintenance', 'idx_maintenance_has_follow_ups', { transaction });
      await queryInterface.removeIndex('maintenance', 'idx_maintenance_parent_maintenance_id', { transaction });
      await queryInterface.removeIndex('maintenance', 'idx_maintenance_incident_id', { transaction });
      
      // Remove indexes - Incidents
      await queryInterface.removeIndex('incidents', 'idx_incidents_has_follow_ups', { transaction });
      await queryInterface.removeIndex('incidents', 'idx_incidents_parent_incident_id', { transaction });
      await queryInterface.removeIndex('incidents', 'idx_incidents_work_request_id', { transaction });
      
      // Remove columns - Maintenance
      await queryInterface.removeColumn('maintenance', 'follow_up_reason', { transaction });
      await queryInterface.removeColumn('maintenance', 'has_follow_ups', { transaction });
      await queryInterface.removeColumn('maintenance', 'parent_maintenance_id', { transaction });
      await queryInterface.removeColumn('maintenance', 'incident_id', { transaction });
      
      // Remove columns - Incidents
      await queryInterface.removeColumn('incidents', 'follow_up_reason', { transaction });
      await queryInterface.removeColumn('incidents', 'has_follow_ups', { transaction });
      await queryInterface.removeColumn('incidents', 'parent_incident_id', { transaction });
      await queryInterface.removeColumn('incidents', 'work_request_id', { transaction });
      
      // Remove audit log
      await queryInterface.sequelize.query(`
        DELETE FROM audit_log 
        WHERE action = 'MIGRATION_TRACEABILITY'
      `, { transaction });
      
      await transaction.commit();
      console.log('[ROLLBACK] ✅ Successfully removed traceability cross-references');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[ROLLBACK] ❌ Failed to remove traceability:', error);
      throw error;
    }
  }
};
