/**
 * AssetOperationalStatusService - Manage Asset Operational Status (SAP PM-lite)
 * 
 * Purpose: Central service for updating asset operational_status with side effects
 * 
 * Operational Status Values (SAP PM):
 * - AVLB: Available (asset ready for production)
 * - MNTC: Maintenance (asset under scheduled maintenance)
 * - DOWN: Breakdown (asset failed, production stopped)
 * - DCOM: Decommissioned (asset retired)
 * 
 * Business Rules:
 * 1. Status changes are triggered by incident/maintenance transitions
 * 2. DOWN status MUST have linked M1 incident (for MTBF/MTTR tracking)
 * 3. MNTC status MUST have linked maintenance work order
 * 4. Multiple concurrent maintenance → asset stays MNTC until all complete
 * 5. Audit trail MUST record who/when/why status changed
 * 
 * @module AssetOperationalStatusService
 */

const { assets: Asset, maintenance: Maintenance, incidents: Incident, audit_log: AuditLog } = require('../models');

class AssetOperationalStatusService {
  /**
   * Set asset to MNTC (Maintenance) status
   * Called when maintenance work order starts
   * 
   * @param {number} assetId - Asset ID
   * @param {Object} user - User object { id, name, role }
   * @param {string} reason - Reason for status change (e.g., "WO-12345: Preventive maintenance")
   * @param {Object} transaction - Sequelize transaction
   */
  async setMaintenanceStatus(assetId, user, reason, transaction = null) {
    const shouldCommit = !transaction;
    let tx = transaction;
    
    try {
      if (!tx) {
        tx = await require('../models').sequelize.transaction();
      }
      
      // Load asset with lock
      const asset = await Asset.findByPk(assetId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx
      });
      
      if (!asset) {
        throw new Error(`Asset with id ${assetId} not found`);
      }
      
      const oldStatus = asset.operational_status;
      
      // Only change if not already MNTC or DOWN
      if (oldStatus !== 'MNTC' && oldStatus !== 'DOWN') {
        await asset.update({
          operational_status: 'MNTC',
          operational_status_changed_at: new Date(),
          operational_status_changed_by: user.id,
          operational_status_notes: reason
        }, { transaction: tx });
        
        // Record audit
        await this._recordStatusChange(
          asset.id,
          oldStatus,
          'MNTC',
          user,
          reason,
          'Maintenance work started',
          tx
        );
      }
      
      if (shouldCommit) {
        await tx.commit();
      }
      
      return { success: true, oldStatus, newStatus: 'MNTC' };
      
    } catch (error) {
      if (shouldCommit && tx) {
        await tx.rollback();
      }
      throw error;
    }
  }
  
  /**
   * Set asset to DOWN (Breakdown) status
   * Called when M1 incident is isolated (production stopped)
   * 
   * @param {number} assetId - Asset ID
   * @param {Object} user - User object { id, name, role }
   * @param {string} reason - Reason for breakdown (e.g., "INC-12345: Motor failure")
   * @param {Object} transaction - Sequelize transaction
   */
  async setDownStatus(assetId, user, reason, transaction = null) {
    const shouldCommit = !transaction;
    let tx = transaction;
    
    try {
      if (!tx) {
        tx = await require('../models').sequelize.transaction();
      }
      
      // Load asset with lock
      const asset = await Asset.findByPk(assetId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx
      });
      
      if (!asset) {
        throw new Error(`Asset with id ${assetId} not found`);
      }
      
      const oldStatus = asset.operational_status;
      
      // Always change to DOWN (highest priority status)
      await asset.update({
        operational_status: 'DOWN',
        operational_status_changed_at: new Date(),
        operational_status_changed_by: user.id,
        operational_status_notes: reason
      }, { transaction: tx });
      
      // Record audit
      await this._recordStatusChange(
        asset.id,
        oldStatus,
        'DOWN',
        user,
        reason,
        'Asset breakdown - production stopped',
        tx
      );
      
      if (shouldCommit) {
        await tx.commit();
      }
      
      return { success: true, oldStatus, newStatus: 'DOWN' };
      
    } catch (error) {
      if (shouldCommit && tx) {
        await tx.rollback();
      }
      throw error;
    }
  }
  
  /**
   * Set asset to AVLB (Available) status
   * Called when maintenance/incident is closed and asset is back to production
   * 
   * Business Logic:
   * - Check if asset has other open maintenance or DOWN incidents
   * - Only set AVLB if no blocking work remains
   * 
   * @param {number} assetId - Asset ID
   * @param {Object} user - User object { id, name, role }
   * @param {string} reason - Reason for availability (e.g., "WO-12345 completed")
   * @param {Object} transaction - Sequelize transaction
   */
  async setAvailableStatus(assetId, user, reason, transaction = null) {
    const shouldCommit = !transaction;
    let tx = transaction;
    
    try {
      if (!tx) {
        tx = await require('../models').sequelize.transaction();
      }
      
      // Load asset with lock
      const asset = await Asset.findByPk(assetId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx
      });
      
      if (!asset) {
        throw new Error(`Asset with id ${assetId} not found`);
      }
      
      const oldStatus = asset.operational_status;
      
      // Check for blocking work
      const hasOpenMaintenance = await Maintenance.count({
        where: {
          asset_id: assetId,
          status: ['in_progress', 'scheduled', 'pending']
        },
        transaction: tx
      }) > 0;
      
      const hasDownIncident = await Incident.count({
        where: {
          asset_id: assetId,
          notification_type: 'M1',
          status: ['open', 'in_progress', 'isolated']
        },
        transaction: tx
      }) > 0;
      
      // Only set AVLB if no blocking work
      if (!hasOpenMaintenance && !hasDownIncident) {
        await asset.update({
          operational_status: 'AVLB',
          operational_status_changed_at: new Date(),
          operational_status_changed_by: user.id,
          operational_status_notes: reason
        }, { transaction: tx });
        
        // Record audit
        await this._recordStatusChange(
          asset.id,
          oldStatus,
          'AVLB',
          user,
          reason,
          'Asset returned to service',
          tx
        );
        
        if (shouldCommit) {
          await tx.commit();
        }
        
        return { success: true, oldStatus, newStatus: 'AVLB' };
      } else {
        // Asset still has blocking work
        if (shouldCommit) {
          await tx.commit();
        }
        
        return {
          success: false,
          oldStatus,
          newStatus: oldStatus,
          reason: 'Asset has open maintenance or DOWN incidents',
          hasOpenMaintenance,
          hasDownIncident
        };
      }
      
    } catch (error) {
      if (shouldCommit && tx) {
        await tx.rollback();
      }
      throw error;
    }
  }
  
  /**
   * Set asset to DCOM (Decommissioned) status
   * Called when asset is permanently retired
   * 
   * @param {number} assetId - Asset ID
   * @param {Object} user - User object { id, name, role }
   * @param {string} reason - Reason for decommissioning
   * @param {Object} transaction - Sequelize transaction
   */
  async setDecommissionedStatus(assetId, user, reason, transaction = null) {
    const shouldCommit = !transaction;
    let tx = transaction;
    
    try {
      if (!tx) {
        tx = await require('../models').sequelize.transaction();
      }
      
      // Load asset with lock
      const asset = await Asset.findByPk(assetId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx
      });
      
      if (!asset) {
        throw new Error(`Asset with id ${assetId} not found`);
      }
      
      const oldStatus = asset.operational_status;
      
      // Check for open work (warn but allow)
      const openMaintenance = await Maintenance.count({
        where: {
          asset_id: assetId,
          status: ['in_progress', 'scheduled', 'pending']
        },
        transaction: tx
      });
      
      const openIncidents = await Incident.count({
        where: {
          asset_id: assetId,
          status: ['open', 'in_progress', 'isolated']
        },
        transaction: tx
      });
      
      if (openMaintenance > 0 || openIncidents > 0) {
        console.warn(
          `Asset ${assetId} being decommissioned with ${openMaintenance} open maintenance ` +
          `and ${openIncidents} open incidents`
        );
      }
      
      // Update asset
      await asset.update({
        operational_status: 'DCOM',
        operational_status_changed_at: new Date(),
        operational_status_changed_by: user.id,
        operational_status_notes: reason,
        status: 'inactive' // Also set legacy status
      }, { transaction: tx });
      
      // Record audit
      await this._recordStatusChange(
        asset.id,
        oldStatus,
        'DCOM',
        user,
        reason,
        'Asset decommissioned',
        tx
      );
      
      if (shouldCommit) {
        await tx.commit();
      }
      
      return {
        success: true,
        oldStatus,
        newStatus: 'DCOM',
        warnings: {
          openMaintenance,
          openIncidents
        }
      };
      
    } catch (error) {
      if (shouldCommit && tx) {
        await tx.rollback();
      }
      throw error;
    }
  }
  
  /**
   * Get current operational status with context
   * 
   * @param {number} assetId - Asset ID
   * @returns {Object} - { operational_status, changed_at, changed_by, notes, blocking_work }
   */
  async getStatus(assetId) {
    const asset = await Asset.findByPk(assetId, {
      attributes: [
        'id',
        'asset_code',
        'dk_code',
        'name',
        'operational_status',
        'operational_status_changed_at',
        'operational_status_changed_by',
        'operational_status_notes'
      ]
    });
    
    if (!asset) {
      throw new Error(`Asset with id ${assetId} not found`);
    }
    
    // Get blocking work
    const openMaintenance = await Maintenance.findAll({
      where: {
        asset_id: assetId,
        status: ['in_progress', 'scheduled', 'pending']
      },
      attributes: ['id', 'maintenance_code', 'status', 'system_status']
    });
    
    const openIncidents = await Incident.findAll({
      where: {
        asset_id: assetId,
        status: ['open', 'in_progress', 'isolated']
      },
      attributes: ['id', 'incident_code', 'status', 'notification_type', 'severity']
    });
    
    return {
      ...asset.toJSON(),
      blocking_work: {
        open_maintenance: openMaintenance.map(m => m.toJSON()),
        open_incidents: openIncidents.map(i => i.toJSON())
      }
    };
  }
  
  /**
   * Record operational status change in audit log
   */
  async _recordStatusChange(assetId, fromStatus, toStatus, user, reason, description, transaction) {
    await AuditLog.create({
      entity_type: 'asset',
      entity_id: assetId,
      action_type: 'state_transition',
      action: 'operational_status_change',
      user_id: user.id,
      from_state: { operational_status: fromStatus },
      to_state: { operational_status: toStatus },
      changes: {
        old_operational_status: fromStatus,
        new_operational_status: toStatus,
        reason: reason,
        description: description
      }
    }, { transaction });
  }
}

module.exports = new AssetOperationalStatusService();
