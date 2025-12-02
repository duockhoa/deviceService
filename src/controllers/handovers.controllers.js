const { Handover, HandoverFollowUp, Assets, User } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('../service/NotificationService');

// Tạo mã bàn giao tự động
const buildHandoverCode = async () => {
    const year = new Date().getFullYear();
    const last = await Handover.findOne({
        where: { handover_code: { [Op.like]: `HO-${year}-%` } },
        order: [['handover_code', 'DESC']]
    });
    const next = last ? parseInt(last.handover_code.split('-')[2]) + 1 : 1;
    return `HO-${year}-${String(next).padStart(4, '0')}`;
};

// GET /api/handovers - Lấy danh sách lệnh bàn giao
const getAllHandovers = async (req, res) => {
    try {
        const handovers = await Handover.findAll({
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code']
                },
                {
                    model: HandoverFollowUp,
                    as: 'followUps',
                    separate: true,
                    order: [['created_at', 'DESC']]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: handovers
        });
    } catch (error) {
        console.error('Error fetching handovers:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn giao',
            error: error.message
        });
    }
};

// POST /api/handovers - Tạo lệnh bàn giao mới
const createHandover = async (req, res) => {
    try {
        const { asset_id, fromDept, toDept, reason, items } = req.body;
        const handover_code = await buildHandoverCode();

        // Lấy thông tin asset nếu có
        let asset = null;
        if (asset_id) {
            asset = await Assets.findByPk(asset_id);
        }

        const handover = await Handover.create({
            handover_code,
            asset_id,
            asset_code: asset?.asset_code,
            asset_name: asset?.name,
            from_dept: fromDept,
            to_dept: toDept,
            reason,
            items: items || [],
            status: 'pending',
            created_by: req.user?.id
        });

        // Gửi thông báo đến bộ phận tiếp nhận
        await NotificationService.createNotification({
            type: 'handover_created',
            title: 'Lệnh bàn giao mới',
            message: `Lệnh bàn giao ${handover_code} từ ${fromDept} đến ${toDept}`,
            reference_type: 'handover',
            reference_id: handover.id,
            recipient_type: 'department',
            recipient_id: toDept,
            sender_id: req.user?.id,
            sender_type: 'user',
            priority: 'high',
            metadata: {
                handover_code,
                from_dept: fromDept,
                to_dept: toDept,
                asset_code: asset?.asset_code,
                asset_name: asset?.name
            }
        });

        res.status(201).json({
            success: true,
            data: handover,
            message: 'Tạo lệnh bàn giao thành công'
        });
    } catch (error) {
        console.error('Error creating handover:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo lệnh bàn giao',
            error: error.message
        });
    }
};

// POST /api/handovers/:id/accept - Tiếp nhận lệnh bàn giao
const acceptHandover = async (req, res) => {
    try {
        const { id } = req.params;
        
        const handover = await Handover.findByPk(id);
        if (!handover) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lệnh bàn giao'
            });
        }

        if (handover.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Lệnh bàn giao đã được xử lý'
            });
        }

        await handover.update({
            status: 'accepted',
            accepted_at: new Date(),
            accepted_by: req.user?.id
        });

        // Gửi thông báo đến bộ phận bàn giao
        await NotificationService.createNotification({
            type: 'handover_accepted',
            title: 'Lệnh bàn giao đã được tiếp nhận',
            message: `Lệnh bàn giao ${handover.handover_code} đã được ${handover.to_dept} tiếp nhận`,
            reference_type: 'handover',
            reference_id: handover.id,
            recipient_type: 'department',
            recipient_id: handover.from_dept,
            sender_id: req.user?.id,
            sender_type: 'user',
            priority: 'medium',
            metadata: {
                handover_code: handover.handover_code,
                from_dept: handover.from_dept,
                to_dept: handover.to_dept
            }
        });

        res.status(200).json({
            success: true,
            data: handover,
            message: 'Tiếp nhận lệnh bàn giao thành công'
        });
    } catch (error) {
        console.error('Error accepting handover:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tiếp nhận lệnh bàn giao',
            error: error.message
        });
    }
};

// POST /api/handovers/:id/follow-up - Thêm đánh giá theo dõi
const addFollowUpRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { actualCondition, issues, actionTaken, completionDate, qaReview, notes } = req.body;

        const handover = await Handover.findByPk(id);
        if (!handover) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lệnh bàn giao'
            });
        }

        if (handover.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Không thể thêm đánh giá cho lệnh đã đóng'
            });
        }

        const followUp = await HandoverFollowUp.create({
            handover_id: id,
            actual_condition: actualCondition,
            issues,
            action_taken: actionTaken,
            completion_date: completionDate,
            qa_review: qaReview,
            notes,
            created_by: req.user?.id
        });

        // Cập nhật trạng thái handover
        if (handover.status === 'accepted') {
            await handover.update({ status: 'follow_up' });
        }

        // Gửi thông báo đến cả 2 bộ phận
        await Promise.all([
            NotificationService.createNotification({
                type: 'handover_follow_up',
                title: 'Đánh giá theo dõi bàn giao',
                message: `Có đánh giá mới cho lệnh bàn giao ${handover.handover_code}`,
                reference_type: 'handover',
                reference_id: handover.id,
                recipient_type: 'department',
                recipient_id: handover.from_dept,
                sender_id: req.user?.id,
                sender_type: 'user',
                priority: 'medium',
                metadata: {
                    handover_code: handover.handover_code,
                    qa_review: qaReview
                }
            }),
            NotificationService.createNotification({
                type: 'handover_follow_up',
                title: 'Đánh giá theo dõi bàn giao',
                message: `Có đánh giá mới cho lệnh bàn giao ${handover.handover_code}`,
                reference_type: 'handover',
                reference_id: handover.id,
                recipient_type: 'department',
                recipient_id: handover.to_dept,
                sender_id: req.user?.id,
                sender_type: 'user',
                priority: 'medium',
                metadata: {
                    handover_code: handover.handover_code,
                    qa_review: qaReview
                }
            })
        ]);

        res.status(201).json({
            success: true,
            data: followUp,
            message: 'Thêm đánh giá theo dõi thành công'
        });
    } catch (error) {
        console.error('Error adding follow-up:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm đánh giá theo dõi',
            error: error.message
        });
    }
};

// POST /api/handovers/:id/close - Đóng lệnh bàn giao
const closeHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const { closeReason } = req.body;

        const handover = await Handover.findByPk(id);
        if (!handover) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lệnh bàn giao'
            });
        }

        if (handover.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Lệnh bàn giao đã được đóng'
            });
        }

        await handover.update({
            status: 'closed',
            closed_at: new Date(),
            close_reason: closeReason
        });

        // Gửi thông báo đến cả 2 bộ phận
        await Promise.all([
            NotificationService.createNotification({
                type: 'handover_closed',
                title: 'Lệnh bàn giao đã đóng',
                message: `Lệnh bàn giao ${handover.handover_code} đã được đóng`,
                reference_type: 'handover',
                reference_id: handover.id,
                recipient_type: 'department',
                recipient_id: handover.from_dept,
                sender_id: req.user?.id,
                sender_type: 'user',
                priority: 'low',
                metadata: {
                    handover_code: handover.handover_code,
                    close_reason: closeReason
                }
            }),
            NotificationService.createNotification({
                type: 'handover_closed',
                title: 'Lệnh bàn giao đã đóng',
                message: `Lệnh bàn giao ${handover.handover_code} đã được đóng`,
                reference_type: 'handover',
                reference_id: handover.id,
                recipient_type: 'department',
                recipient_id: handover.to_dept,
                sender_id: req.user?.id,
                sender_type: 'user',
                priority: 'low',
                metadata: {
                    handover_code: handover.handover_code,
                    close_reason: closeReason
                }
            })
        ]);

        res.status(200).json({
            success: true,
            data: handover,
            message: 'Đóng lệnh bàn giao thành công'
        });
    } catch (error) {
        console.error('Error closing handover:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đóng lệnh bàn giao',
            error: error.message
        });
    }
};

module.exports = {
    getAllHandovers,
    createHandover,
    acceptHandover,
    addFollowUpRecord,
    closeHandover
};
