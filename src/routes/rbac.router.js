const express = require('express');
const router = express.Router();
const {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
    getAllPermissions,
    createPermission,
    getAllUsers,
    getUserRoles,
    assignUserRoles,
    getUserPermissions,
    getMyPermissions,
    seedRBAC
} = require('../controllers/rbac.controllers');
const authMiddleware = require('../middleware/authMiddleware');

// Seed route đã được đặt ở index.js (public, không cần auth)

// Apply authentication to all routes
router.use(authMiddleware);

// ==================== ROLES ====================
router.get('/roles', getAllRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// ==================== PERMISSIONS ====================
router.get('/permissions', getAllPermissions);
router.post('/permissions', createPermission);

// ==================== USERS ====================
router.get('/users', getAllUsers);

// ==================== MY PERMISSIONS ====================
router.get('/me/permissions', getMyPermissions);

// ==================== USER ROLES ====================
router.get('/users/:userId/roles', getUserRoles);
router.post('/users/:userId/roles', assignUserRoles);
router.get('/users/:userId/permissions', getUserPermissions);

module.exports = router;
