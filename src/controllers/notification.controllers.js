const { Notification, User } = require('../models');
const { Op } = require('sequelize');

// GET /api/v1/notifications/user/:userId - Lấy thông báo của user
const getNotificationsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0, unread_only = false } = req.query;

        const whereClause = {
            recipient_type: 'user',
            recipient_id: userId.toString(),
            [Op.or]: [
                { expires_at: null },
                { expires_at: { [Op.gt]: new Date() } }
            ]
        };

        if (unread_only === 'true') {
            whereClause.is_read = false;
        }

        const notifications = await Notification.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'employee_code', 'avatar']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const total = await Notification.count({ where: whereClause });

        res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications by user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông báo',
            error: error.message
        });
    }
};

// GET /api/v1/notifications/department/:departmentName - Lấy thông báo của bộ phận
const getNotificationsByDepartment = async (req, res) => {
    try {
        const { departmentName } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const notifications = await Notification.findAll({
            where: {
                recipient_type: 'department',
                recipient_id: departmentName,
                [Op.or]: [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'employee_code', 'avatar']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const total = await Notification.count({
            where: {
                recipient_type: 'department',
                recipient_id: departmentName
            }
        });

        res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications by department:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông báo bộ phận',
            error: error.message
        });
    }
};

// GET /api/v1/notifications/unread-count/:userId - Đếm số thông báo chưa đọc
const getUnreadCount = async (req, res) => {
    try {
        const { userId } = req.params;

        const count = await Notification.count({
            where: {
                recipient_type: 'user',
                recipient_id: userId.toString(),
                is_read: false,
                [Op.or]: [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ]
            }
        });

        res.status(200).json({
            success: true,
            data: { unread_count: count }
        });
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đếm thông báo chưa đọc',
            error: error.message
        });
    }
};

// POST /api/v1/notifications - Tạo thông báo mới
const createNotification = async (req, res) => {
    try {
        const {
            type,
            title,
            message,
            reference_type,
            reference_id,
            recipient_type,
            recipient_id,
            sender_id,
            sender_type = 'system',
            priority = 'medium',
            metadata,
            expires_at
        } = req.body;

        // Validation
        if (!type || !title || !message || !reference_type || !reference_id || !recipient_type || !recipient_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        const notification = await Notification.create({
            type,
            title,
            message,
            reference_type,
            reference_id,
            recipient_type,
            recipient_id: recipient_id.toString(),
            sender_id,
            sender_type,
            priority,
            metadata,
            expires_at
        });

        res.status(201).json({
            success: true,
            data: notification,
            message: 'Tạo thông báo thành công'
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo thông báo',
            error: error.message
        });
    }
};

// PUT /api/v1/notifications/:id/read - Đánh dấu đã đọc
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }

        await notification.update({
            is_read: true,
            read_at: new Date()
        });

        res.status(200).json({
            success: true,
            data: notification,
            message: 'Đã đánh dấu thông báo là đã đọc'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh dấu thông báo',
            error: error.message
        });
    }
};

// PUT /api/v1/notifications/mark-all-read/:userId - Đánh dấu tất cả đã đọc
const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        await Notification.update(
            {
                is_read: true,
                read_at: new Date()
            },
            {
                where: {
                    recipient_type: 'user',
                    recipient_id: userId.toString(),
                    is_read: false
                }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Đã đánh dấu tất cả thông báo là đã đọc'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh dấu tất cả thông báo',
            error: error.message
        });
    }
};

// DELETE /api/v1/notifications/:id - Xóa thông báo
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }

        await notification.destroy();

        res.status(200).json({
            success: true,
            message: 'Xóa thông báo thành công'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa thông báo',
            error: error.message
        });
    }
};

module.exports = {
    getNotificationsByUserId,
    getNotificationsByDepartment,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
