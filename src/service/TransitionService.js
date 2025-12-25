/**
 * TransitionService - Central State Machine Service for SAP PM-lite Core
 * 
 * Purpose: Single point of control for ALL state transitions
 * - Enforces state machine rules
 * - Validates RBAC permissions
 * - Executes side effects (operational status changes)
 * - Records comprehensive audit trail
 * - Handles errors with rollback
 * 
 * Critical Rules:
 * 1. Controllers MUST NOT set status directly
 * 2. All status changes MUST go through TransitionService.transition()
 * 3. Side effects MUST be atomic (rollback on error)
 * 4. Audit trail MUST include from_state, to_state, side_effects
 * 
 * @module TransitionService
 */

const { incidents: Incident, maintenance: Maintenance, assets: Asset, audit_log: AuditLog } = require('../models');
const stateMachine = require('../utils/stateMachine');
const AssetOperationalStatusService = require('./AssetOperationalStatusService');

class TransitionService {
  /**
   * Execute a state transition with full validation and side effects
   * 
   * @param {Object} params - Transition parameters
   * @param {string} params.entityType - 'incident' or 'maintenance'
   * @param {number} params.entityId - ID of entity to transition
   * @param {string} params.action - Action to perform (e.g., 'triage', 'release', 'teco')
   * @param {Object} params.user - User performing action { id, role }
   * @param {Object} params.additionalData - Additional data for transition (e.g., notes, downtime)
   * @param {Object} params.context - Request context { ip_address, user_agent }
   * @param {Object} params.transaction - Sequelize transaction (optional, created if not provided)
   * @returns {Promise<Object>} - { success, fromState, toState, sideEffects, entity }
   */
  async transition({ entityType, entityId, action, user, additionalData = {}, context = {}, transaction = null }) {
    const startTime = Date.now();
    const shouldCommit = !transaction;
    let tx = transaction;
    
    try {
      // Create transaction if not provided
      if (!tx) {
        tx = await require('../models').sequelize.transaction();
      }
      
      // 1. Load entity with lock
      const entity = await this._loadEntity(entityType, entityId, tx);
      if (!entity) {
        throw new Error(`${entityType} with id ${entityId} not found`);
      }
      
      // 2. Get current state
      const fromState = this._extractState(entityType, entity);
      
      // 3. Validate transition
      const stateMachineConfig = this._getStateMachineConfig(entityType);
      const transitionDef = stateMachineConfig.transitions[action];
      
      if (!transitionDef) {
        throw new Error(`Invalid action '${action}' for ${entityType}`);
      }
      
      // Check current status is in fromStatuses
      if (!transitionDef.fromStatuses.includes(entity.status)) {
        throw new Error(
          `Cannot ${action} from status '${entity.status}'. ` +
          `Valid statuses: ${transitionDef.fromStatuses.join(', ')}`
        );
      }
      
      // 4. Validate RBAC
      const hasPermission = await this._checkPermission(user, transitionDef.requiredRole);
      if (!hasPermission) {
        throw new Error(`User role '${user.role}' does not have permission to ${action}`);
      }
      
      // 5. Custom validation
      await this._validateTransition(entityType, entity, action, transitionDef, additionalData);
      
      // 6. Execute side effects (BEFORE status update)
      const sideEffects = [];
      if (transitionDef.sideEffects && transitionDef.sideEffects.length > 0) {
        for (const sideEffect of transitionDef.sideEffects) {
          const result = await this._executeSideEffect(
            sideEffect, 
            entityType, 
            entity, 
            action, 
            additionalData, 
            user,
            tx
          );
          sideEffects.push({
            name: sideEffect,
            success: result.success,
            details: result.details
          });
        }
      }
      
      // 7. Update entity status
      const updateFields = {
        status: transitionDef.toStatus,
        updated_at: new Date(),
        updated_by: user.id
      };
      
      // Update system_status for maintenance
      if (entityType === 'maintenance' && transitionDef.systemStatus) {
        updateFields.system_status = transitionDef.systemStatus;
        updateFields.system_status_changed_at = new Date();
        updateFields.system_status_changed_by = user.id;
        
        // Lock scope on REL
        if (transitionDef.systemStatus === 'REL' && !entity.scope_locked_at) {
          updateFields.scope_locked_at = new Date();
        }
        
        // Lock cost on TECO
        if (transitionDef.systemStatus === 'TECO' && !entity.cost_locked_at) {
          updateFields.cost_locked_at = new Date();
        }
      }
      
      // Merge additional data (e.g., notes, resolution, downtime)
      Object.assign(updateFields, this._filterAdditionalData(entityType, additionalData));
      
      await entity.update(updateFields, { transaction: tx });
      
      // 8. Get new state
      const toState = this._extractState(entityType, entity);
      
      // 9. Record audit trail
      const executionDuration = Date.now() - startTime;
      await AuditLog.create({
        entity_type: entityType,
        entity_id: entityId,
        action_type: 'state_transition',
        action: action,
        user_id: user.id,
        from_state: fromState,
        to_state: toState,
        side_effects_executed: sideEffects.map(se => se.name),
        execution_duration_ms: executionDuration,
        ip_address: context.ip_address || null,
        user_agent: context.user_agent || null,
        changes: {
          action: action,
          from_status: fromState.status,
          to_status: toState.status,
          additional_data: additionalData,
          side_effects: sideEffects
        }
      }, { transaction: tx });
      
      // 10. Commit transaction if we created it
      if (shouldCommit) {
        await tx.commit();
      }
      
      return {
        success: true,
        fromState,
        toState,
        sideEffects,
        entity: entity.toJSON(),
        executionDuration
      };
      
    } catch (error) {
      // Rollback transaction if we created it
      if (shouldCommit && tx) {
        await tx.rollback();
      }
      
      // Record failed transition
      await this._recordFailedTransition(
        entityType, 
        entityId, 
        action, 
        user, 
        error, 
        Date.now() - startTime,
        context
      );
      
      throw error;
    }
  }
  
  /**
   * Load entity with pessimistic lock
   */
  async _loadEntity(entityType, entityId, transaction) {
    const Model = entityType === 'incident' ? Incident : Maintenance;
    return await Model.findByPk(entityId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
  }
  
  /**
   * Extract current state from entity
   */
  _extractState(entityType, entity) {
    const state = {
      status: entity.status
    };
    
    if (entityType === 'incident') {
      state.notification_type = entity.notification_type;
      state.severity = entity.severity;
      state.is_isolated = entity.is_isolated;
    } else if (entityType === 'maintenance') {
      state.system_status = entity.system_status;
      state.maintenance_type = entity.maintenance_type;
      state.priority = entity.priority;
    }
    
    return state;
  }
  
  /**
   * Get state machine configuration
   */
  _getStateMachineConfig(entityType) {
    return entityType === 'incident' 
      ? stateMachine.INCIDENT_STATE_MACHINE
      : stateMachine.MAINTENANCE_STATE_MACHINE;
  }
  
  /**
   * Check RBAC permission
   */
  async _checkPermission(user, requiredRole) {
    // Role hierarchy: admin > manager > technician > operator
    const roleHierarchy = {
      'admin': 4,
      'manager': 3,
      'technician': 2,
      'operator': 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }
  
  /**
   * Custom validation for specific transitions
   */
  async _validateTransition(entityType, entity, action, transitionDef, additionalData) {
    // Maintenance-specific validations
    if (entityType === 'maintenance') {
      // Cannot modify scope if REL/TECO (unless migrated record)
      if (entity.system_status === 'REL' || entity.system_status === 'TECO') {
        if (!entity.is_migrated_record) {
          const scopeFields = ['asset_id', 'plan_id', 'planned_date', 'assigned_to'];
          const attemptingScopeChange = scopeFields.some(field => additionalData[field] !== undefined);
          
          if (attemptingScopeChange && entity.system_status === 'REL') {
            throw new Error('Cannot modify scope after REL status (scope is locked)');
          }
        }
      }
      
      // Cannot modify cost if TECO (unless migrated record)
      if (entity.system_status === 'TECO') {
        if (!entity.is_migrated_record) {
          const costFields = ['actual_cost', 'labor_cost', 'material_cost'];
          const attemptingCostChange = costFields.some(field => additionalData[field] !== undefined);
          
          if (attemptingCostChange) {
            throw new Error('Cannot modify cost after TECO status (cost is locked)');
          }
        }
      }
    }
    
    // Incident-specific validations
    if (entityType === 'incident') {
      // M1 must have downtime_minutes when isolated
      if (action === 'isolate' && entity.notification_type === 'M1') {
        if (!additionalData.downtime_minutes && !entity.downtime_minutes) {
          throw new Error('M1 incidents must have downtime_minutes when isolated (required for MTBF/MTTR)');
        }
      }
    }
    
    // Custom validation function from state machine
    if (transitionDef.validate) {
      const validationResult = await transitionDef.validate(entity, additionalData);
      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }
    }
  }
  
  /**
   * Execute a side effect
   */
  async _executeSideEffect(sideEffect, entityType, entity, action, additionalData, user, transaction) {
    try {
      switch (sideEffect) {
        // Asset operational status side effects
        case 'setAssetMNTC':
          await AssetOperationalStatusService.setMaintenanceStatus(
            entity.asset_id, 
            user, 
            `${entityType} ${action}: ${entity[`${entityType}_code`]}`,
            transaction
          );
          return { success: true, details: 'Asset set to MNTC' };
          
        case 'setAssetDOWN':
          await AssetOperationalStatusService.setDownStatus(
            entity.asset_id,
            user,
            `${entityType} ${action}: ${entity[`${entityType}_code`]} - ${additionalData.notes || 'Breakdown'}`,
            transaction
          );
          return { success: true, details: 'Asset set to DOWN' };
          
        case 'setAssetAVLB':
          await AssetOperationalStatusService.setAvailableStatus(
            entity.asset_id,
            user,
            `${entityType} ${action}: ${entity[`${entityType}_code`]} completed`,
            transaction
          );
          return { success: true, details: 'Asset set to AVLB' };
          
        // Notification side effects
        case 'sendNotification':
          // TODO: Implement notification service
          return { success: true, details: 'Notification sent (placeholder)' };
          
        case 'escalate':
          // TODO: Implement escalation logic
          return { success: true, details: 'Escalation triggered (placeholder)' };
          
        default:
          console.warn(`Unknown side effect: ${sideEffect}`);
          return { success: false, details: `Unknown side effect: ${sideEffect}` };
      }
    } catch (error) {
      console.error(`Side effect ${sideEffect} failed:`, error);
      throw new Error(`Side effect ${sideEffect} failed: ${error.message}`);
    }
  }
  
  /**
   * Filter additional data to only allowed fields
   */
  _filterAdditionalData(entityType, additionalData) {
    const allowedFields = entityType === 'incident'
      ? ['notes', 'resolution', 'downtime_minutes', 'root_cause', 'corrective_action']
      : ['notes', 'actual_start_date', 'actual_end_date', 'actual_cost', 'labor_cost', 'material_cost'];
    
    const filtered = {};
    for (const field of allowedFields) {
      if (additionalData[field] !== undefined) {
        filtered[field] = additionalData[field];
      }
    }
    return filtered;
  }
  
  /**
   * Record failed transition attempt
   */
  async _recordFailedTransition(entityType, entityId, action, user, error, duration, context) {
    try {
      await AuditLog.create({
        entity_type: entityType,
        entity_id: entityId,
        action_type: 'state_transition',
        action: action,
        user_id: user.id,
        execution_duration_ms: duration,
        ip_address: context.ip_address || null,
        user_agent: context.user_agent || null,
        error_details: {
          error: error.message,
          stack: error.stack
        },
        changes: {
          action: action,
          error: error.message
        }
      });
    } catch (auditError) {
      console.error('Failed to record failed transition:', auditError);
    }
  }
}

module.exports = new TransitionService();
