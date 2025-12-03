const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getNotificationsByUserId,
    getNotificationsByDepartment,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require('../controllers/notification.controllers');

// Apply authentication to all notification routes
router.use(authMiddleware);

// GET routes
router.get('/user/:userId', permissionGuard('notifications.view'), getNotificationsByUserId);
router.get('/department/:departmentName', permissionGuard('notifications.view'), getNotificationsByDepartment);
router.get('/unread-count/:userId', permissionGuard('notifications.view'), getUnreadCount);

// POST routes
router.post('/', permissionGuard('notifications.manage'), createNotification);

// PUT routes
router.put('/:id/read', permissionGuard('notifications.view'), markAsRead);
router.put('/mark-all-read/:userId', permissionGuard('notifications.view'), markAllAsRead);

// DELETE routes
router.delete('/:id', permissionGuard('notifications.manage'), deleteNotification);

module.exports = router;
