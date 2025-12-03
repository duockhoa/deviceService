const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const { 
    getAllDepartments, 
    getAssetsByDepartment, 
    getDepartmentByName, 
    getUsersByDepartment,
    getMechanicalElectricalTechnicians 
} = require("../controllers/department.controllers");

router.use(authMiddleware);

router.get('/', permissionGuard('departments.view'), getAllDepartments);
router.get('/mechanical-electrical/technicians', permissionGuard('departments.view'), getMechanicalElectricalTechnicians); // Đặt trước /:name
router.get('/:name', permissionGuard('departments.view'), getDepartmentByName);
router.get('/:name/users', permissionGuard('departments.view'), getUsersByDepartment);
router.get('/:name/assets', permissionGuard('departments.view'), getAssetsByDepartment);

module.exports = router;
