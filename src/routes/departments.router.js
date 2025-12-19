const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getAllDepartments, 
    getAssetsByDepartment, 
    getDepartmentByName, 
    getUsersByDepartment,
    getMechanicalElectricalTechnicians 
} = require("../controllers/department.controllers");

router.use(authMiddleware);

router.get('/',getAllDepartments);
router.get('/mechanical-electrical/technicians',getMechanicalElectricalTechnicians); // Đặt trước /:name
router.get('/:name',getDepartmentByName);
router.get('/:name/users',getUsersByDepartment);
router.get('/:name/assets',getAssetsByDepartment);

module.exports = router;
