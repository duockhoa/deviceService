const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getMyWorkOrders,
    getWorkOrderById,
    updateChecklistItem,
    addProgressUpdate,
    uploadImage,
    completeWork,
    getPendingApproval,
    approveWork
} = require('../controllers/maintenanceWork.controllers');

router.use(authMiddleware);

// Routes cho kỹ thuật viên
router.get('/my-tasks', permissionGuard('maintenance_work.view'), getMyWorkOrders);                       // Lấy WO được giao
router.get('/pending-approval', permissionGuard('maintenance_work.approve'), getPendingApproval);            // Lấy WO chờ duyệt (cho trưởng BP)
router.get('/:id', permissionGuard('maintenance_work.view'), getWorkOrderById);                           // Chi tiết WO
router.put('/:id/checklist/:checklistId', permissionGuard('maintenance_work.update'), updateChecklistItem); // Cập nhật checklist
router.post('/:id/progress', permissionGuard('maintenance_work.update'), addProgressUpdate);                // Thêm tiến độ
router.post('/:id/images', permissionGuard('maintenance_work.update'), uploadImage);                        // Upload hình ảnh
router.put('/:id/complete', permissionGuard('maintenance_work.update'), completeWork);                      // Hoàn thành WO
router.post('/:id/approve', permissionGuard('maintenance_work.approve'), approveWork);                       // Duyệt WO (trưởng BP)

module.exports = router;
