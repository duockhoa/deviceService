const express = require('express');
const router = express.Router();
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

// Routes cho kỹ thuật viên
router.get('/my-tasks', getMyWorkOrders);                       // Lấy WO được giao
router.get('/pending-approval', getPendingApproval);            // Lấy WO chờ duyệt (cho trưởng BP)
router.get('/:id', getWorkOrderById);                           // Chi tiết WO
router.put('/:id/checklist/:checklistId', updateChecklistItem); // Cập nhật checklist
router.post('/:id/progress', addProgressUpdate);                // Thêm tiến độ
router.post('/:id/images', uploadImage);                        // Upload hình ảnh
router.put('/:id/complete', completeWork);                      // Hoàn thành WO
router.post('/:id/approve', approveWork);                       // Duyệt WO (trưởng BP)

module.exports = router;
