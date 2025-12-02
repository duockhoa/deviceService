const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
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
router.get('/user/:userId', getNotificationsByUserId);
router.get('/department/:departmentName', getNotificationsByDepartment);
router.get('/unread-count/:userId', getUnreadCount);

// POST routes
router.post('/', createNotification);

// PUT routes
router.put('/:id/read', markAsRead);
router.put('/mark-all-read/:userId', markAllAsRead);

// DELETE routes
router.delete('/:id', deleteNotification);

module.exports = router;
