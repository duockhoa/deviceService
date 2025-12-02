const { Op } = require('sequelize');
const { WorkRequest, WorkRequestProgress, Assets, User, Maintenance, MaintenanceWorkTask, Incidents } = require('../models');

const buildRequestCode = async () => {
    const year = new Date().getFullYear();
    const last = await WorkRequest.findOne({
        where: { request_code: { [Op.like]: `WR-${year}-%` } },
        order: [['request_code', 'DESC']]
    });
    const next = last ? parseInt(last.request_code.split('-')[2]) + 1 : 1;
    return `WR-${year}-${String(next).padStart(4, '0')}`;
};

const normalizePriority = (value) => {
    const map = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' };
    return map[(value || '').toLowerCase()] || 'medium';
};

const buildMaintenanceCode = async () => {
    const year = new Date().getFullYear();
    const last = await Maintenance.findOne({
        where: { maintenance_code: { [Op.like]: `MT-${year}-%` } },
        order: [['maintenance_code', 'DESC']]
    });
    const next = last ? parseInt(last.maintenance_code.split('-')[2]) + 1 : 1;
    return `MT-${year}-${String(next).padStart(4, '0')}`;
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

// GET /api/work-requests/my-tasks - yêu cầu được phân công cho user, chưa tạo maintenance
const getMyAssignedWorkRequests = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const data = await WorkRequest.findAll({
            where: { technician_id: userId, maintenance_id: null },
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'asset_code', 'name'] },
                { model: User, as: 'requester', attributes: ['id', 'name', 'employee_code'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể lấy danh sách yêu cầu được giao', error: error.message });
    }
};

const createWorkRequest = async (req, res) => {
    try {
        const code = await buildRequestCode();
        const payload = {
            request_code: code,
            asset_id: req.body.asset_id ? parseInt(req.body.asset_id) : null,
            title: req.body.title,
            description: req.body.description || null,
            type: (req.body.type || 'support').toLowerCase(),
            priority: normalizePriority(req.body.priority),
            status: 'pending',
            requester_id: req.user.id,
            technician_id: req.body.technician_id || null,
            due_date: req.body.due_date ? new Date(req.body.due_date) : null,
            location: req.body.location || null,
            images: req.body.images || null,
            notes: req.body.notes || null,
            created_by: req.user.id
        };
        const created = await WorkRequest.create(payload);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể tạo yêu cầu', error: error.message });
    }
};

const getWorkRequests = async (req, res) => {
    try {
        const where = {};
        const { status, priority, asset_id, requester_id, technician_id, type } = req.query;
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (asset_id) where.asset_id = asset_id;
        if (requester_id) where.requester_id = requester_id;
        if (technician_id) where.technician_id = technician_id;
        if (type) where.type = type;

        const data = await WorkRequest.findAll({
            where,
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'asset_code', 'name'] },
                { model: User, as: 'requester', attributes: ['id', 'name', 'employee_code'] },
                { model: User, as: 'technician', attributes: ['id', 'name', 'employee_code'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể lấy danh sách yêu cầu', error: error.message });
    }
};

const getWorkRequestById = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id, {
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'asset_code', 'name'] },
                { model: User, as: 'requester', attributes: ['id', 'name', 'employee_code'] },
                { model: User, as: 'technician', attributes: ['id', 'name', 'employee_code'] },
                { model: WorkRequestProgress, as: 'progress', include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }] }
            ]
        });
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        res.status(200).json({ success: true, data: wr });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể lấy chi tiết yêu cầu', error: error.message });
    }
};

const updateWorkRequest = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id);
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        const prevStatus = wr.status;
        const prevTech = wr.technician_id;
        const fields = ['title', 'description', 'status', 'priority', 'technician_id', 'due_date', 'location', 'notes'];
        fields.forEach((f) => {
            if (req.body[f] !== undefined) wr[f] = req.body[f];
        });
        if (req.body.priority) wr.priority = normalizePriority(req.body.priority);
        if (req.body.due_date) wr.due_date = new Date(req.body.due_date);
        // Nếu được phân công kỹ thuật viên mà chưa có trạng thái, tự chuyển sang "assigned"
        if (req.body.technician_id && !req.body.status && wr.status === 'pending') {
            wr.status = 'assigned';
        }
        await wr.save();
        // Ghi nhận tiến độ khi có thay đổi trạng thái hoặc phân công
        const statusChanged = prevStatus !== wr.status;
        const techChanged = prevTech !== wr.technician_id;
        if (statusChanged || techChanged) {
            await WorkRequestProgress.create({
                work_request_id: wr.id,
                status: wr.status,
                note: req.body.note || (techChanged ? 'Phân công kỹ thuật viên' : null),
                created_by: req.user.id
            });
        }

        res.status(200).json({ success: true, data: wr });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể cập nhật yêu cầu', error: error.message });
    }
};

const addProgress = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id);
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        const progress = await WorkRequestProgress.create({
            work_request_id: wr.id,
            status: req.body.status || wr.status,
            note: req.body.note || null,
            images: req.body.images || null,
            created_by: req.user.id
        });
        if (req.body.status) {
            wr.status = req.body.status;
            await wr.save();
        }
        res.status(201).json({ success: true, data: progress });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể thêm tiến độ', error: error.message });
    }
};

const closeWorkRequest = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id);
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        wr.status = req.body.status || 'closed';
        wr.notes = req.body.note || wr.notes;
        await wr.save();
        await WorkRequestProgress.create({
            work_request_id: wr.id,
            status: wr.status,
            note: req.body.note || null,
            images: null,
            created_by: req.user.id
        });
        res.status(200).json({ success: true, data: wr });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể đóng yêu cầu', error: error.message });
    }
};

const deleteWorkRequest = async (req, res) => {
    try {
        if (!req.user || req.user.employee_code !== '0947') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa yêu cầu' });
        }
        const count = await WorkRequest.destroy({ where: { id: req.params.id } });
        if (!count) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        res.status(200).json({ success: true, message: 'Đã xóa yêu cầu' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể xóa yêu cầu', error: error.message });
    }
};

// Tạo lịch bảo trì từ yêu cầu
const createMaintenanceFromRequest = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id);
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        if (!wr.asset_id) {
            return res.status(400).json({ success: false, message: 'Yêu cầu này không gắn thiết bị nên không thể tạo lịch bảo trì.' });
        }

        const maintenance_code = await buildMaintenanceCode();
        // Map loại
        const typeMap = {
            cleaning: 'cleaning',
            inspection: 'inspection',
            repair_request: 'corrective',
            support: 'maintenance',
            other: 'maintenance'
        };
        const mType = typeMap[wr.type] || 'maintenance';
        const scheduleDate = wr.due_date ? new Date(wr.due_date) : new Date();
        const priority = wr.priority || 'medium';

        const maintenance = await Maintenance.create({
            maintenance_code,
            maintenance_type: mType,
            priority,
            title: wr.title,
            description: wr.description || null,
            asset_id: wr.asset_id,
            technician_id: wr.technician_id || null,
            scheduled_date: scheduleDate,
            estimated_duration: 1,
            status: 'pending',
            created_by: req.user.id
        });

        // Công việc chính
        const tasks = [];
        if (mType === 'cleaning') tasks.push({ task_name: 'Vệ sinh', task_type: 'cleaning', description: 'Vệ sinh thiết bị' });
        else if (mType === 'inspection') tasks.push({ task_name: 'Kiểm tra', task_type: 'inspection', description: 'Kiểm tra thiết bị' });
        else if (mType === 'corrective') tasks.push({ task_name: 'Sửa chữa', task_type: 'corrective', description: 'Sửa chữa/khắc phục' });
        else tasks.push({ task_name: 'Bảo trì', task_type: 'maintenance', description: 'Bảo trì thiết bị' });

        await MaintenanceWorkTask.bulkCreate(tasks.map((t, idx) => ({
            maintenance_id: maintenance.id,
            task_name: t.task_name,
            task_type: t.task_type,
            description: t.description,
            assigned_to: JSON.stringify([]),
            priority,
            status: 'pending',
            order_index: idx
        })));

        wr.maintenance_id = maintenance.id;
        wr.status = 'in_progress';
        await wr.save();

        return res.status(200).json({ success: true, maintenance_id: maintenance.id, code: maintenance.maintenance_code });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tạo lịch bảo trì', error: error.message });
    }
};

// Tạo sự cố từ yêu cầu
const createIncidentFromRequest = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id);
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });

        if (!wr.asset_id) {
            return res.status(400).json({ success: false, message: 'Yêu cầu này không gắn thiết bị nên không thể tạo sự cố/lệnh sửa chữa.' });
        }

        const code = await buildIncidentCode();
        const incident = await Incidents.create({
            incident_code: code,
            asset_id: wr.asset_id,
            title: wr.title,
            description: wr.description || null,
            severity: wr.priority || 'medium',
            status: 'reported',
            reported_by: req.user.id,
            assigned_to: wr.technician_id || null,
            reported_date: new Date()
        });

        wr.incident_id = incident.id;
        wr.status = 'in_progress';
        await wr.save();

        return res.status(200).json({ success: true, incident_id: incident.id, code: incident.incident_code });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tạo sự cố', error: error.message });
    }
};

// Tạo đồng thời sự cố và lệnh sửa chữa từ yêu cầu
const createIncidentAndMaintenanceFromRequest = async (req, res) => {
    try {
        const wr = await WorkRequest.findByPk(req.params.id);
        if (!wr) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        if (!wr.asset_id) {
            return res.status(400).json({ success: false, message: 'Yêu cầu này không gắn thiết bị nên không thể tạo sự cố/lệnh sửa chữa.' });
        }

        // Tạo sự cố
        const incidentCode = await buildIncidentCode();
        const incident = await Incidents.create({
            incident_code: incidentCode,
            asset_id: wr.asset_id,
            title: wr.title,
            description: wr.description || null,
            severity: wr.priority || 'medium',
            status: 'reported',
            reported_by: req.user.id,
            assigned_to: wr.technician_id || null,
            reported_date: new Date()
        });

        // Tạo lệnh bảo trì corrective
        const maintenanceCode = await buildMaintenanceCode();
        const typeMap = {
            cleaning: 'cleaning',
            inspection: 'inspection',
            repair_request: 'corrective',
            support: 'maintenance',
            other: 'maintenance'
        };
        const mType = typeMap[wr.type] || 'maintenance';
        const scheduleDate = wr.due_date ? new Date(wr.due_date) : new Date();
        const priority = wr.priority || 'medium';

        const maintenance = await Maintenance.create({
            maintenance_code: maintenanceCode,
            maintenance_type: mType,
            priority,
            title: wr.title,
            description: wr.description || null,
            asset_id: wr.asset_id,
            technician_id: wr.technician_id || null,
            scheduled_date: scheduleDate,
            estimated_duration: 1,
            status: 'pending',
            created_by: req.user.id
        });

        const tasks = [];
        if (mType === 'cleaning') tasks.push({ task_name: 'Vệ sinh', task_type: 'cleaning', description: 'Vệ sinh thiết bị' });
        else if (mType === 'inspection') tasks.push({ task_name: 'Kiểm tra', task_type: 'inspection', description: 'Kiểm tra thiết bị' });
        else if (mType === 'corrective') tasks.push({ task_name: 'Sửa chữa', task_type: 'corrective', description: 'Sửa chữa/khắc phục' });
        else tasks.push({ task_name: 'Bảo trì', task_type: 'maintenance', description: 'Bảo trì thiết bị' });

        await MaintenanceWorkTask.bulkCreate(tasks.map((t, idx) => ({
            maintenance_id: maintenance.id,
            task_name: t.task_name,
            task_type: t.task_type,
            description: t.description,
            assigned_to: JSON.stringify([]),
            priority,
            status: 'pending',
            order_index: idx
        })));

        wr.incident_id = incident.id;
        wr.maintenance_id = maintenance.id;
        wr.status = 'in_progress';
        await wr.save();

        return res.status(200).json({
            success: true,
            incident_id: incident.id,
            incident_code: incident.incident_code,
            maintenance_id: maintenance.id,
            maintenance_code: maintenance.maintenance_code
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tạo sự cố và lệnh bảo trì', error: error.message });
    }
};

module.exports = {
    createWorkRequest,
    getWorkRequests,
    getMyAssignedWorkRequests,
    getWorkRequestById,
    updateWorkRequest,
    addProgress,
    closeWorkRequest,
    deleteWorkRequest,
    createMaintenanceFromRequest,
    createIncidentFromRequest,
    createIncidentAndMaintenanceFromRequest
};
