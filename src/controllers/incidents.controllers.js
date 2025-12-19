const { Incidents, Assets, User, Maintenance } = require('../models');
const { Op } = require('sequelize');
const { buildMaintenanceCode } = require('./maintenance.controllers');
const NotificationService = require('../service/NotificationService');
const { assertRBAC, nextActions, getUserRole, ENTITIES } = require('../utils/workflowRbac');

const withActions = (entity, record, role) => {
    const payload = record?.toJSON ? record.toJSON() : record;
    return {
        ...payload,
        allowed_actions: nextActions(entity, payload?.status, role)
    };
};

const sendError = (res, error, fallback) => {
    if (error?.statusCode === 403) {
        return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: fallback, error: error.message });
};

const buildIncidentCode = async () => {
    const year = new Date().getFullYear();
    const last = await Incidents.findOne({
        where: { incident_code: { [Op.like]: `INC-${year}-%` } },
        order: [['incident_code', 'DESC']]
    });
    const next = last ? parseInt(last.incident_code.split('-')[2]) + 1 : 1;
    return `INC-${year}-${String(next).padStart(4, '0')}`;
};

const includeCommon = [
    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code', 'location'] },
    { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
];

// GET /api/v1/incidents
const getAllIncidents = async (req, res) => {
    try {
        const role = getUserRole(req.user);
        const incidents = await Incidents.findAll({
            include: includeCommon,
            order: [['reported_date', 'DESC']]
        });
        const data = incidents.map((i) => withActions(ENTITIES.incident, i, role));
        res.status(200).json(data);
    } catch (error) {
        sendError(res, error, 'Error fetching incidents');
    }
};

// GET /api/v1/incidents/:id
const getIncidentById = async (req, res) => {
    try {
        const role = getUserRole(req.user);
        const incident = await Incidents.findByPk(req.params.id, { include: includeCommon });
        if (!incident) return res.status(404).json({ message: 'Incident not found' });
        res.status(200).json(withActions(ENTITIES.incident, incident, role));
    } catch (error) {
        sendError(res, error, 'Error fetching incident');
    }
};

// POST /api/v1/incidents
const createIncident = async (req, res) => {
    try {
        const {
            asset_id,
            title,
            description,
            severity = 'medium',
            impact,
            images,
            handover_required = false,
            handover_notes,
            follow_up_notes
        } = req.body;
        const userId = req.user?.id;
        const role = getUserRole(req.user);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const incident_code = await buildIncidentCode();
        const newIncident = await Incidents.create({
            incident_code,
            asset_id: asset_id || null,
            title,
            description,
            severity,
            status: 'reported',
            reported_by: userId,
            reported_date: new Date(),
            impact,
            images: images ? JSON.stringify(images) : null,
            handover_required: Boolean(handover_required),
            handover_notes,
            notes: follow_up_notes || null
        });

        const detail = await Incidents.findByPk(newIncident.id, { include: includeCommon });
        res.status(201).json({ message: 'Incident created', incident: withActions(ENTITIES.incident, detail, role) });

        // Send notification after successful incident creation
        try {
            await NotificationService.onIncidentReported({
                incidentId: detail.id,
                incidentCode: detail.incident_code,
                assetCode: detail.asset?.asset_code,
                assetName: detail.asset?.name,
                title: detail.title,
                severity: detail.severity,
                reportedBy: userId
            });
        } catch (notifError) {
            console.error('Error sending incident creation notification:', notifError);
        }
    } catch (error) {
        sendError(res, error, 'Error creating incident');
    }
};

// PUT /api/v1/incidents/:id
const updateIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const role = getUserRole(req.user);
        const data = { ...req.body };
        if (data.images && Array.isArray(data.images)) {
            data.images = JSON.stringify(data.images);
        }
        const incident = await Incidents.findByPk(id, { include: includeCommon });
        if (!incident) return res.status(404).json({ message: 'Incident not found' });
        await incident.update(data);
        await incident.reload({ include: includeCommon });
        res.status(200).json({ message: 'Incident updated', incident: withActions(ENTITIES.incident, incident, role) });
    } catch (error) {
        sendError(res, error, 'Error updating incident');
    }
};

// PUT /api/v1/incidents/:id/assess
const assessIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { assessment_notes, solution_plan, device_status, handover_required, handover_notes } = req.body;
        const userId = req.user?.id;
        const role = getUserRole(req.user);
        const incident = await Incidents.findByPk(id, { include: includeCommon });
        if (!incident) return res.status(404).json({ message: 'Incident not found' });

        assertRBAC(ENTITIES.incident, incident.status, 'investigating', role);

        await incident.update({
            assessment_status: 'pending',
            assessment_notes,
            solution_plan,
            device_status,
            handover_required,
            handover_notes,
            status: 'investigating'
        });

        await incident.reload({ include: includeCommon });
        res.status(200).json({ message: 'Assessment submitted', incident: withActions(ENTITIES.incident, incident, role) });
    } catch (error) {
        sendError(res, error, 'Error assessing incident');
    }
};

// POST /api/v1/incidents/:id/approve-solution
const approveSolution = async (req, res) => {
    try {
        const { id } = req.params;
        const approverId = req.user?.id;
        const role = getUserRole(req.user);
        if (!approverId) return res.status(401).json({ message: 'Unauthorized' });

        const incident = await Incidents.findByPk(id);
        if (!incident) return res.status(404).json({ message: 'Incident not found' });

        assertRBAC(ENTITIES.incident, incident.status, 'in_progress', role);

        // Tạo lệnh bảo trì corrective
        const maintenanceCode = typeof buildMaintenanceCode === 'function'
            ? await buildMaintenanceCode()
            : `MT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const maintenance = await Maintenance.create({
            maintenance_code: maintenanceCode,
            maintenance_type: 'corrective',
            priority: incident.severity === 'critical' ? 'critical' : incident.severity,
            title: `Sửa chữa sự cố ${incident.incident_code}`,
            description: incident.solution_plan || incident.description,
            status: 'pending',
            asset_id: incident.asset_id,
            scheduled_date: new Date(),
            estimated_duration: 1,
            created_by: approverId
        });

        await incident.update({
            assessment_status: 'approved',
            approved_by: approverId,
            approved_at: new Date(),
            maintenance_id: maintenance.id,
            status: 'in_progress'
        });

        await incident.reload({ include: includeCommon });
        res.status(200).json({
            message: 'Solution approved and maintenance created',
            incident: withActions(ENTITIES.incident, incident, role),
            maintenance
        });

        // Send notification after solution approval
        try {
            await NotificationService.onIncidentSolutionApproved({
                incidentId: incident.id,
                incidentCode: incident.incident_code,
                assetCode: incident.asset?.asset_code,
                assetName: incident.asset?.name,
                title: incident.title,
                maintenanceId: maintenance.id,
                maintenanceCode: maintenance.maintenance_code,
                assignedTo: detail.assigned_to,
                reportedBy: detail.reported_by,
                approvedBy: approverId
            });
        } catch (notifError) {
            console.error('Error sending incident solution approval notification:', notifError);
        }
    } catch (error) {
        sendError(res, error, 'Error approving solution');
    }
};

// Misc helpers
const assignIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to } = req.body;
        const role = getUserRole(req.user);
        const incident = await Incidents.findByPk(id, { include: includeCommon });
        if (!incident) return res.status(404).json({ message: 'Incident not found' });

        assertRBAC(ENTITIES.incident, incident.status, 'investigating', role);

        await incident.update({ assigned_to, status: 'investigating' });
        await incident.reload({ include: includeCommon });
        res.status(200).json(withActions(ENTITIES.incident, incident, role));

        // Send notification after assignment
        try {
            await NotificationService.onIncidentAssigned({
                incidentId: incident.id,
                incidentCode: incident.incident_code,
                assetCode: incident.asset?.asset_code,
                assetName: incident.asset?.name,
                title: incident.title,
                severity: incident.severity,
                assignedTo: assigned_to,
                reportedBy: incident.reported_by
            });
        } catch (notifError) {
            console.error('Error sending incident assignment notification:', notifError);
        }
    } catch (error) {
        sendError(res, error, 'Error assigning incident');
    }
};

const startIncident = async (req, res) => {
    try {
        const role = getUserRole(req.user);
        const incident = await Incidents.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ message: 'Incident not found' });

        assertRBAC(ENTITIES.incident, incident.status, 'in_progress', role);

        await incident.update({ status: 'in_progress', started_date: new Date() });
        res.status(200).json(withActions(ENTITIES.incident, incident, role));
    } catch (error) {
        sendError(res, error, 'Error starting incident');
    }
};

const resolveIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { root_cause, solution, prevention_measures, cost, downtime_hours } = req.body;
        const role = getUserRole(req.user);
        const incident = await Incidents.findByPk(id, { include: includeCommon });
        if (!incident) return res.status(404).json({ message: 'Incident not found' });

        assertRBAC(ENTITIES.incident, incident.status, 'resolved', role);

        await incident.update({
            status: 'resolved',
            resolved_date: new Date(),
            root_cause,
            solution,
            prevention_measures,
            cost,
            downtime_hours
        });
        
        await incident.reload({ include: includeCommon });
        res.status(200).json(withActions(ENTITIES.incident, incident, role));

        // Send notification after resolution
        try {
            await NotificationService.onIncidentResolved({
                incidentId: incident.id,
                incidentCode: incident.incident_code,
                assetCode: incident.asset?.asset_code,
                assetName: incident.asset?.name,
                title: incident.title,
                severity: incident.severity,
                assignedTo: incident.assigned_to,
                reportedBy: incident.reported_by,
                rootCause: root_cause
            });
        } catch (notifError) {
            console.error('Error sending incident resolution notification:', notifError);
        }
    } catch (error) {
        sendError(res, error, 'Error resolving incident');
    }
};

const closeIncident = async (req, res) => {
    try {
        const role = getUserRole(req.user);
        const incident = await Incidents.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ message: 'Incident not found' });

        assertRBAC(ENTITIES.incident, incident.status, 'closed', role);

        await incident.update({ status: 'closed', closed_date: new Date() });
        res.status(200).json(withActions(ENTITIES.incident, incident, role));
    } catch (error) {
        sendError(res, error, 'Error closing incident');
    }
};

const deleteIncident = async (req, res) => {
    try {
        const incident = await Incidents.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ message: 'Incident not found' });
        await incident.destroy();
        res.status(200).json({ message: 'Incident deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting incident', error: error.message });
    }
};

const getMyIncidents = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = getUserRole(req.user);
        const incidents = await Incidents.findAll({
            where: { assigned_to: userId, status: { [Op.in]: ['investigating', 'in_progress'] } },
            include: includeCommon,
            order: [['reported_date', 'DESC']]
        });
        const data = incidents.map((i) => withActions(ENTITIES.incident, i, role));
        res.status(200).json(data);
    } catch (error) {
        sendError(res, error, 'Error fetching my incidents');
    }
};

const getIncidentStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.reported_date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        }

        const total = await Incidents.count({ where });
        const byStatus = await Incidents.findAll({
            where,
            attributes: ['status', [Incidents.sequelize.fn('COUNT', Incidents.sequelize.col('id')), 'count']],
            group: ['status']
        });
        const bySeverity = await Incidents.findAll({
            where,
            attributes: ['severity', [Incidents.sequelize.fn('COUNT', Incidents.sequelize.col('id')), 'count']],
            group: ['severity']
        });

        res.status(200).json({ total, byStatus, bySeverity });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};

module.exports = {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    assignIncident,
    startIncident,
    resolveIncident,
    closeIncident,
    deleteIncident,
    getMyIncidents,
    getIncidentStatistics,
    assessIncident,
    approveSolution
};
