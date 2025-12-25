/**
 * AnalyticsService - SAP PM-lite KPI Calculations
 * 
 * Purpose: Calculate maintenance KPIs per SAP PM standard definitions
 * 
 * Key Metrics:
 * 1. MTBF (Mean Time Between Failures) - Only M1 incidents
 * 2. MTTR (Mean Time To Repair) - Only M1 incidents
 * 3. Availability - (Operating Time / Total Time) * 100%
 * 4. Planned vs Unplanned Maintenance Ratio
 * 5. Backlog (Open corrective maintenance work)
 * 
 * SAP PM Business Rules:
 * - MTBF/MTTR: Only count M1 (Breakdown) notifications
 * - M2 (Malfunction), M3 (Request), M4 (Activity) excluded from failure metrics
 * - Downtime: From incident isolation to resolution (downtime_minutes)
 * - Operating time: Total time - (M1 downtime + planned maintenance downtime)
 * - Planned maintenance: maintenance_type IN ('preventive', 'predictive')
 * - Unplanned maintenance: maintenance_type = 'corrective'
 * 
 * @module AnalyticsService
 */

const { Op } = require('sequelize');
const { sequelize, incidents: Incident, maintenance: Maintenance, assets: Asset } = require('../models');

class AnalyticsService {
  /**
   * Calculate MTBF (Mean Time Between Failures) for asset
   * 
   * SAP PM Definition:
   * MTBF = Operating Hours / Number of Failures
   * 
   * Failures = M1 incidents only (notification_type = 'M1')
   * Operating Hours = Total Hours - Downtime Hours
   * 
   * @param {number} assetId - Asset ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Object} - { mtbf_hours, failure_count, operating_hours, period_hours }
   */
  async calculateMTBF(assetId, startDate, endDate) {
    // Get period duration in hours
    const periodMs = endDate.getTime() - startDate.getTime();
    const periodHours = periodMs / (1000 * 60 * 60);
    
    // Get M1 incidents (failures only)
    const m1Incidents = await Incident.findAll({
      where: {
        asset_id: assetId,
        notification_type: 'M1',
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['id', 'incident_code', 'downtime_minutes', 'created_at', 'resolved_at']
    });
    
    const failureCount = m1Incidents.length;
    
    // Calculate total downtime from M1 incidents
    const m1DowntimeMinutes = m1Incidents.reduce((sum, incident) => {
      return sum + (incident.downtime_minutes || 0);
    }, 0);
    const m1DowntimeHours = m1DowntimeMinutes / 60;
    
    // Calculate planned maintenance downtime
    const plannedMaintenanceDowntime = await this._getPlannedMaintenanceDowntime(
      assetId,
      startDate,
      endDate
    );
    const plannedDowntimeHours = plannedMaintenanceDowntime / 60;
    
    // Operating hours = Total hours - All downtime
    const operatingHours = periodHours - m1DowntimeHours - plannedDowntimeHours;
    
    // MTBF calculation
    const mtbf = failureCount > 0 ? operatingHours / failureCount : null;
    
    return {
      mtbf_hours: mtbf,
      failure_count: failureCount,
      operating_hours: operatingHours,
      period_hours: periodHours,
      m1_downtime_hours: m1DowntimeHours,
      planned_downtime_hours: plannedDowntimeHours,
      m1_incidents: m1Incidents.map(i => ({
        incident_code: i.incident_code,
        downtime_minutes: i.downtime_minutes,
        created_at: i.created_at,
        resolved_at: i.resolved_at
      }))
    };
  }
  
  /**
   * Calculate MTTR (Mean Time To Repair) for asset
   * 
   * SAP PM Definition:
   * MTTR = Total Repair Time / Number of Failures
   * 
   * Repair Time = downtime_minutes from M1 incidents
   * Failures = M1 incidents only
   * 
   * @param {number} assetId - Asset ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Object} - { mttr_minutes, mttr_hours, failure_count, total_downtime_minutes }
   */
  async calculateMTTR(assetId, startDate, endDate) {
    // Get M1 incidents with downtime
    const m1Incidents = await Incident.findAll({
      where: {
        asset_id: assetId,
        notification_type: 'M1',
        created_at: {
          [Op.between]: [startDate, endDate]
        },
        downtime_minutes: {
          [Op.ne]: null,
          [Op.gt]: 0
        }
      },
      attributes: ['id', 'incident_code', 'downtime_minutes', 'created_at', 'resolved_at', 'isolated_at']
    });
    
    const failureCount = m1Incidents.length;
    
    // Calculate total repair time
    const totalDowntimeMinutes = m1Incidents.reduce((sum, incident) => {
      return sum + (incident.downtime_minutes || 0);
    }, 0);
    
    // MTTR calculation
    const mttrMinutes = failureCount > 0 ? totalDowntimeMinutes / failureCount : null;
    const mttrHours = mttrMinutes !== null ? mttrMinutes / 60 : null;
    
    return {
      mttr_minutes: mttrMinutes,
      mttr_hours: mttrHours,
      failure_count: failureCount,
      total_downtime_minutes: totalDowntimeMinutes,
      m1_incidents: m1Incidents.map(i => ({
        incident_code: i.incident_code,
        downtime_minutes: i.downtime_minutes,
        created_at: i.created_at,
        isolated_at: i.isolated_at,
        resolved_at: i.resolved_at
      }))
    };
  }
  
  /**
   * Calculate Availability for asset
   * 
   * SAP PM Definition:
   * Availability = (Operating Time / Total Time) * 100%
   * 
   * Operating Time = Total Time - Downtime
   * Downtime = M1 downtime + Planned maintenance downtime
   * 
   * @param {number} assetId - Asset ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Object} - { availability_percent, operating_hours, total_hours, downtime_hours }
   */
  async calculateAvailability(assetId, startDate, endDate) {
    // Get period duration in hours
    const periodMs = endDate.getTime() - startDate.getTime();
    const totalHours = periodMs / (1000 * 60 * 60);
    
    // Get M1 downtime
    const m1DowntimeResult = await Incident.findAll({
      where: {
        asset_id: assetId,
        notification_type: 'M1',
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('downtime_minutes')), 'total_m1_downtime']
      ],
      raw: true
    });
    
    const m1DowntimeMinutes = parseFloat(m1DowntimeResult[0]?.total_m1_downtime || 0);
    const m1DowntimeHours = m1DowntimeMinutes / 60;
    
    // Get planned maintenance downtime
    const plannedDowntimeMinutes = await this._getPlannedMaintenanceDowntime(
      assetId,
      startDate,
      endDate
    );
    const plannedDowntimeHours = plannedDowntimeMinutes / 60;
    
    // Calculate availability
    const totalDowntimeHours = m1DowntimeHours + plannedDowntimeHours;
    const operatingHours = totalHours - totalDowntimeHours;
    const availabilityPercent = (operatingHours / totalHours) * 100;
    
    return {
      availability_percent: availabilityPercent,
      operating_hours: operatingHours,
      total_hours: totalHours,
      downtime_hours: totalDowntimeHours,
      m1_downtime_hours: m1DowntimeHours,
      planned_downtime_hours: plannedDowntimeHours
    };
  }
  
  /**
   * Calculate Planned vs Unplanned Maintenance Ratio
   * 
   * SAP PM Definition:
   * Ratio = Planned Maintenance Hours / Unplanned Maintenance Hours
   * 
   * Planned = maintenance_type IN ('preventive', 'predictive')
   * Unplanned = maintenance_type = 'corrective'
   * 
   * @param {number} assetId - Asset ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Object} - { ratio, planned_hours, unplanned_hours, planned_count, unplanned_count }
   */
  async calculatePlannedVsUnplannedRatio(assetId, startDate, endDate) {
    // Get planned maintenance
    const plannedMaintenance = await Maintenance.findAll({
      where: {
        asset_id: assetId,
        maintenance_type: {
          [Op.in]: ['preventive', 'predictive']
        },
        created_at: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.in]: ['closed', 'accepted']
        }
      },
      attributes: ['id', 'maintenance_code', 'maintenance_type', 'actual_start_date', 'actual_end_date']
    });
    
    const plannedCount = plannedMaintenance.length;
    const plannedHours = plannedMaintenance.reduce((sum, maint) => {
      if (maint.actual_start_date && maint.actual_end_date) {
        const durationMs = new Date(maint.actual_end_date) - new Date(maint.actual_start_date);
        return sum + (durationMs / (1000 * 60 * 60));
      }
      return sum;
    }, 0);
    
    // Get unplanned maintenance (corrective)
    const unplannedMaintenance = await Maintenance.findAll({
      where: {
        asset_id: assetId,
        maintenance_type: 'corrective',
        created_at: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.in]: ['closed', 'accepted']
        }
      },
      attributes: ['id', 'maintenance_code', 'maintenance_type', 'actual_start_date', 'actual_end_date']
    });
    
    const unplannedCount = unplannedMaintenance.length;
    const unplannedHours = unplannedMaintenance.reduce((sum, maint) => {
      if (maint.actual_start_date && maint.actual_end_date) {
        const durationMs = new Date(maint.actual_end_date) - new Date(maint.actual_start_date);
        return sum + (durationMs / (1000 * 60 * 60));
      }
      return sum;
    }, 0);
    
    // Calculate ratio (target: > 4:1 for world-class maintenance)
    const ratio = unplannedHours > 0 ? plannedHours / unplannedHours : null;
    
    return {
      ratio: ratio,
      planned_hours: plannedHours,
      unplanned_hours: unplannedHours,
      planned_count: plannedCount,
      unplanned_count: unplannedCount,
      planned_maintenance: plannedMaintenance.map(m => ({
        maintenance_code: m.maintenance_code,
        maintenance_type: m.maintenance_type
      })),
      unplanned_maintenance: unplannedMaintenance.map(m => ({
        maintenance_code: m.maintenance_code,
        maintenance_type: m.maintenance_type
      }))
    };
  }
  
  /**
   * Calculate Maintenance Backlog
   * 
   * SAP PM Definition:
   * Backlog = Open corrective maintenance work orders
   * 
   * Priority breakdown: critical, high, medium, low
   * Age breakdown: < 7 days, 7-30 days, > 30 days
   * 
   * @param {number} assetId - Asset ID (optional, null for all assets)
   * @returns {Object} - { total_backlog, by_priority, by_age, oldest_wo }
   */
  async calculateBacklog(assetId = null) {
    const whereClause = {
      maintenance_type: 'corrective',
      system_status: {
        [Op.in]: ['CRTD', 'REL']
      },
      status: {
        [Op.notIn]: ['closed', 'cancelled', 'rejected']
      }
    };
    
    if (assetId) {
      whereClause.asset_id = assetId;
    }
    
    const backlogWorkOrders = await Maintenance.findAll({
      where: whereClause,
      attributes: [
        'id',
        'maintenance_code',
        'priority',
        'system_status',
        'created_at',
        'asset_id'
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['id', 'asset_code', 'name']
        }
      ]
    });
    
    const totalBacklog = backlogWorkOrders.length;
    
    // Group by priority
    const byPriority = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    backlogWorkOrders.forEach(wo => {
      if (byPriority[wo.priority] !== undefined) {
        byPriority[wo.priority]++;
      }
    });
    
    // Group by age
    const now = new Date();
    const byAge = {
      'less_than_7_days': 0,
      '7_to_30_days': 0,
      'more_than_30_days': 0
    };
    
    backlogWorkOrders.forEach(wo => {
      const ageMs = now - new Date(wo.created_at);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      
      if (ageDays < 7) {
        byAge.less_than_7_days++;
      } else if (ageDays <= 30) {
        byAge['7_to_30_days']++;
      } else {
        byAge.more_than_30_days++;
      }
    });
    
    // Find oldest work order
    const oldestWO = backlogWorkOrders.reduce((oldest, wo) => {
      if (!oldest || new Date(wo.created_at) < new Date(oldest.created_at)) {
        return wo;
      }
      return oldest;
    }, null);
    
    return {
      total_backlog: totalBacklog,
      by_priority: byPriority,
      by_age: byAge,
      oldest_wo: oldestWO ? {
        maintenance_code: oldestWO.maintenance_code,
        priority: oldestWO.priority,
        created_at: oldestWO.created_at,
        age_days: Math.floor((now - new Date(oldestWO.created_at)) / (1000 * 60 * 60 * 24)),
        asset: oldestWO.asset
      } : null,
      work_orders: backlogWorkOrders.map(wo => ({
        maintenance_code: wo.maintenance_code,
        priority: wo.priority,
        system_status: wo.system_status,
        created_at: wo.created_at,
        asset: wo.asset
      }))
    };
  }
  
  /**
   * Get comprehensive KPI dashboard for asset
   * 
   * @param {number} assetId - Asset ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Object} - All KPIs combined
   */
  async getAssetKPIDashboard(assetId, startDate, endDate) {
    const [mtbf, mttr, availability, plannedVsUnplanned, backlog] = await Promise.all([
      this.calculateMTBF(assetId, startDate, endDate),
      this.calculateMTTR(assetId, startDate, endDate),
      this.calculateAvailability(assetId, startDate, endDate),
      this.calculatePlannedVsUnplannedRatio(assetId, startDate, endDate),
      this.calculateBacklog(assetId)
    ]);
    
    // Get asset info
    const asset = await Asset.findByPk(assetId, {
      attributes: ['id', 'asset_code', 'dk_code', 'name', 'operational_status']
    });
    
    return {
      asset: asset ? asset.toJSON() : null,
      period: {
        start_date: startDate,
        end_date: endDate
      },
      kpis: {
        mtbf,
        mttr,
        availability,
        planned_vs_unplanned: plannedVsUnplanned,
        backlog
      },
      generated_at: new Date()
    };
  }
  
  /**
   * Helper: Get planned maintenance downtime in minutes
   */
  async _getPlannedMaintenanceDowntime(assetId, startDate, endDate) {
    const plannedMaintenance = await Maintenance.findAll({
      where: {
        asset_id: assetId,
        maintenance_type: {
          [Op.in]: ['preventive', 'predictive']
        },
        created_at: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.in]: ['closed', 'accepted']
        },
        actual_start_date: {
          [Op.ne]: null
        },
        actual_end_date: {
          [Op.ne]: null
        }
      },
      attributes: ['actual_start_date', 'actual_end_date']
    });
    
    const totalMinutes = plannedMaintenance.reduce((sum, maint) => {
      const durationMs = new Date(maint.actual_end_date) - new Date(maint.actual_start_date);
      return sum + (durationMs / (1000 * 60));
    }, 0);
    
    return totalMinutes;
  }
}

module.exports = new AnalyticsService();
