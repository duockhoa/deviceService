/**
 * Side Effects Service
 * Xử lý các side effects khi transition state: cập nhật asset status, gửi notifications, etc.
 */

const { Assets } = require('../models');
const NotificationService = require('./NotificationService');

class SideEffectsService {
    /**
     * Cập nhật trạng thái thiết bị thành "down" khi cô lập
     */
    static async setAssetDown(incident, context) {
        try {
            if (!incident.asset_id) return;

            const asset = await Assets.findByPk(incident.asset_id);
            if (asset && asset.status !== 'inactive') {
                await asset.update({ status: 'inactive' });
                console.log(`Asset ${asset.asset_code} set to down due to incident ${incident.incident_code}`);
            }
        } catch (error) {
            console.error('Error setting asset down:', error);
        }
    }

    /**
     * Cập nhật trạng thái thiết bị thành "active" khi đóng maintenance
     */
    static async setAssetActive(maintenance, context) {
        try {
            if (!maintenance.asset_id) return;

            const asset = await Assets.findByPk(maintenance.asset_id);
            if (asset && asset.status !== 'active') {
                await asset.update({ status: 'active' });
                console.log(`Asset ${asset.asset_code} set to active after maintenance ${maintenance.maintenance_code}`);
            }
        } catch (error) {
            console.error('Error setting asset active:', error);
        }
    }

    /**
     * Set severity khi triage
     */
    static async setSeverity(incident, context) {
        if (context.payload?.severity) {
            incident.severity = context.payload.severity;
        }
    }

    /**
     * Kiểm tra nếu critical thì phải isolate
     */
    static async checkCriticalIsolation(incident, context) {
        if (incident.severity === 'critical' && !incident.is_isolated) {
            console.warn(`Critical incident ${incident.incident_code} should be isolated`);
            // Có thể throw error hoặc tự động chuyển sang isolated
        }
    }

    /**
     * Set isolation flags
     */
    static async setIsolated(incident, context) {
        incident.is_isolated = true;
        incident.isolated_at = new Date();
        incident.isolation_notes = context.payload?.isolation_notes || null;
    }

    /**
     * Set post-fix result
     */
    static async setPostFixResult(incident, context) {
        incident.post_fix_result = context.payload?.result || 'pending';
        incident.post_fix_checked_at = new Date();
        incident.post_fix_checked_by = context.user.id;
    }

    /**
     * Set started date
     */
    static async setStartedDate(incident, context) {
        if (!incident.started_date) {
            incident.started_date = new Date();
        }
    }

    /**
     * Set resolved date
     */
    static async setResolvedDate(incident, context) {
        incident.resolved_date = new Date();
        if (context.payload?.root_cause) incident.root_cause = context.payload.root_cause;
        if (context.payload?.solution) incident.solution = context.payload.solution;
        if (context.payload?.downtime_minutes) incident.downtime_minutes = context.payload.downtime_minutes;
    }

    /**
     * Set closed date
     */
    static async setClosedDate(record, context) {
        record.closed_date = new Date();
    }

    /**
     * Close linked incident when maintenance is closed/accepted
     */
    static async closeLinkedIncident(maintenance, context) {
        try {
            if (!maintenance.incident_id) return;

            const { Incidents } = require('../models');
            const incident = await Incidents.findByPk(maintenance.incident_id);

            if (!incident) {
                console.warn(`Linked incident ${maintenance.incident_id} not found for maintenance ${maintenance.maintenance_code}`);
                return;
            }

            // Only close if incident is not already closed/resolved
            if (incident.status !== 'closed' && incident.status !== 'resolved') {
                await incident.update({
                    status: 'resolved',
                    resolved_date: new Date(),
                    solution: `Đã xử lý xong qua lệnh bảo trì: ${maintenance.maintenance_code}`,
                    resolution_notes: `Tự động resolved khi maintenance closed`
                });

                console.log(`[SUCCESS] Auto-closed incident ${incident.incident_code} after maintenance ${maintenance.maintenance_code} completed`);

                // Optionally notify
                await NotificationService.sendNotification({
                    type: 'incident_resolved',
                    entityType: 'incident',
                    entityId: incident.id,
                    title: `Sự cố đã giải quyết`,
                    message: `Sự cố ${incident.incident_code} đã được giải quyết qua lệnh bảo trì ${maintenance.maintenance_code}`,
                    recipients: ['reporter', 'assigned']
                });
            }
        } catch (error) {
            console.error('Error closing linked incident:', error);
            // Don't throw, just log - maintenance should still complete
        }
    }

    /**
     * Set actual start date for maintenance
     */
    static async setActualStartDate(maintenance, context) {
        if (!maintenance.actual_start_date) {
            maintenance.actual_start_date = new Date();
        }
    }

    /**
     * Set approved details
     */
    static async setApprovedDetails(maintenance, context) {
        maintenance.approved_by = context.user.id;
        maintenance.approved_at = new Date();
        maintenance.approval_comment = context.payload?.approval_comment || null;
    }

    /**
     * Set accepted details
     */
    static async setAcceptedDetails(maintenance, context) {
        maintenance.accepted_by = context.user.id;
        maintenance.accepted_at = new Date();
        maintenance.acceptance_notes = context.payload?.acceptance_notes || null;
        maintenance.actual_end_date = new Date();
    }

    /**
     * Set rejection notes
     */
    static async setRejectionNotes(maintenance, context) {
        maintenance.rejection_count = (maintenance.rejection_count || 0) + 1;
        const note = context.payload?.rejection_notes || 'Nghiệm thu không đạt';
        maintenance.rejection_notes = maintenance.rejection_notes 
            ? `${maintenance.rejection_notes}\n[${new Date().toISOString()}] ${note}`
            : note;
    }

    /**
     * Set cancelled details
     */
    static async setCancelledDetails(record, context) {
        record.cancelled_by = context.user.id;
        record.cancelled_at = new Date();
        record.cancel_reason = context.payload?.cancel_reason || null;
    }

    /**
     * Check CAPA requirement
     */
    static async checkCAPA(incident, context) {
        if (incident.severity === 'critical' || incident.severity === 'high') {
            incident.capa_required = true;
        }
    }

    /**
     * Notify production/QA/planning về incident isolation
     */
    static async notifyProduction(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'incident_isolation',
                entityType: 'incident',
                entityId: record.id,
                title: `Thiết bị bị cô lập - ${record.incident_code}`,
                message: `Sự cố nghiêm trọng, thiết bị đã được cô lập (Out of Service)`,
                recipients: ['production', 'qa', 'planning']
            });
        } catch (error) {
            console.error('Error notifying production:', error);
        }
    }

    /**
     * Notify technician
     */
    static async notifyTechnician(record, context) {
        try {
            if (record.assigned_to || record.technician_id) {
                await NotificationService.sendNotification({
                    type: 'task_assigned',
                    entityType: record.incident_code ? 'incident' : 'maintenance',
                    entityId: record.id,
                    title: `Công việc được phân công`,
                    message: `Bạn được phân công xử lý: ${record.title}`,
                    userId: record.assigned_to || record.technician_id
                });
            }
        } catch (error) {
            console.error('Error notifying technician:', error);
        }
    }

    /**
     * Notify reporter when incident status changes
     */
    static async notifyReporter(incident, context) {
        try {
            if (incident.reported_by) {
                const statusMessages = {
                    'in_progress': 'đang được xử lý',
                    'resolved': 'đã được giải quyết',
                    'closed': 'đã được đóng'
                };

                await NotificationService.sendNotification({
                    type: 'incident_status_update',
                    entityType: 'incident',
                    entityId: incident.id,
                    title: `Cập nhật sự cố ${incident.incident_code}`,
                    message: `Sự cố của bạn ${statusMessages[incident.status] || 'đã được cập nhật'}`,
                    userId: incident.reported_by
                });
            }
        } catch (error) {
            console.error('Error notifying reporter:', error);
        }
    }

    /**
     * Notify QA for post-fix check or acceptance
     */
    static async notifyQA(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'qa_check_required',
                entityType: record.incident_code ? 'incident' : 'maintenance',
                entityId: record.id,
                title: `Yêu cầu nghiệm thu/kiểm tra`,
                message: `QA cần kiểm tra: ${record.title}`,
                recipients: ['qa']
            });
        } catch (error) {
            console.error('Error notifying QA:', error);
        }
    }

    /**
     * Notify Engineering
     */
    static async notifyEngineering(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'engineering_review',
                entityType: 'maintenance',
                entityId: record.id,
                title: `Yêu cầu nghiệm thu Engineering`,
                message: `Engineering cần nghiệm thu: ${record.title}`,
                recipients: ['engineering']
            });
        } catch (error) {
            console.error('Error notifying engineering:', error);
        }
    }

    /**
     * Notify manager
     */
    static async notifyManager(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'manager_review',
                entityType: record.incident_code ? 'incident' : 'maintenance',
                entityId: record.id,
                title: `Yêu cầu phê duyệt/xem xét`,
                message: `Manager cần xem xét: ${record.title}`,
                recipients: ['manager']
            });
        } catch (error) {
            console.error('Error notifying manager:', error);
        }
    }

    /**
     * Notify planner
     */
    static async notifyPlanner(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'planner_action',
                entityType: 'maintenance',
                entityId: record.id,
                title: `Kế hoạch được duyệt`,
                message: `Kế hoạch bảo trì đã được duyệt, cần lập lịch: ${record.title}`,
                recipients: ['planner']
            });
        } catch (error) {
            console.error('Error notifying planner:', error);
        }
    }

    /**
     * Notify warehouse for materials
     */
    static async notifyWarehouse(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'warehouse_prepare',
                entityType: 'maintenance',
                entityId: record.id,
                title: `Chuẩn bị vật tư`,
                message: `Cần chuẩn bị vật tư cho: ${record.title}`,
                recipients: ['warehouse']
            });
        } catch (error) {
            console.error('Error notifying warehouse:', error);
        }
    }

    /**
     * Notify all stakeholders
     */
    static async notifyAll(record, context) {
        try {
            await NotificationService.sendNotification({
                type: 'task_closed',
                entityType: record.incident_code ? 'incident' : 'maintenance',
                entityId: record.id,
                title: `Công việc đã hoàn thành`,
                message: `${record.incident_code || record.maintenance_code} - ${record.title} đã được đóng`,
                recipients: ['all']
            });
        } catch (error) {
            console.error('Error notifying all:', error);
        }
    }

    /**
     * Execute side effects theo danh sách
     */
    static async executeSideEffects(sideEffects, record, context) {
        if (!sideEffects || sideEffects.length === 0) return;

        for (const effectName of sideEffects) {
            const effectFn = this[effectName];
            if (typeof effectFn === 'function') {
                try {
                    await effectFn.call(this, record, context);
                } catch (error) {
                    console.error(`Error executing side effect ${effectName}:`, error);
                    // Continue với các side effects khác
                }
            } else {
                console.warn(`Side effect function not found: ${effectName}`);
            }
        }
    }
}

module.exports = SideEffectsService;
