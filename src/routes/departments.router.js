const express = require('express');
const router = express.Router();
const { getAllDepartments, getAssetsByDepartment, getDepartmentByName, getUsersByDepartment } = require("../controllers/department.controllers");
router.get('/', getAllDepartments);
router.get('/:name', getDepartmentByName);
router.get('/:name/users', getUsersByDepartment);
router.get('/:name/assets', getAssetsByDepartment);
module.exports = router;
