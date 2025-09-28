const { Departments, User, Assets } = require('../models');

// GET /api/departments - Lấy tất cả departments
const getAllDepartments = async (req, res) => {
    try {
        const departments = await Departments.findAll({
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: departments,
            count: departments.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching departments',
            error: error.message
        });
    }
};

// GET /api/departments/:name - Lấy department theo name
const getDepartmentByName = async (req, res) => {
    try {
        const { name } = req.params;
        const department = await Departments.findByPk(name, {
            include: [
                {
                    model: User,
                    as: 'Users',
                    attributes: ['id', 'name', 'employee_code', 'email', 'position', 'phoneNumber']
                },
                {
                    model: Assets,
                    as: 'DepartmentAssets',
                    attributes: ['id', 'name', 'asset_code', 'description', 'serial_number']
                }
            ]
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        res.status(200).json({
            success: true,
            data: department
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching department',
            error: error.message
        });
    }
};

// GET /api/departments/:name/users - Lấy tất cả users thuộc department
const getUsersByDepartment = async (req, res) => {
    try {
        const { name } = req.params;

        const department = await Departments.findByPk(name);
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        const users = await User.findAll({
            where: { department: name },
            attributes: ['id', 'name', 'employee_code', 'email', 'position', 'phoneNumber', 'sex'],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                department: department,
                users: users,
                count: users.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users by department',
            error: error.message
        });
    }
};

// GET /api/departments/:name/assets - Lấy tất cả assets thuộc department
const getAssetsByDepartment = async (req, res) => {
    try {
        const { name } = req.params;

        const department = await Departments.findByPk(name);
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        const assets = await Assets.findAll({
            where: { team_id: name },
            include: [
                {
                    model: Departments,
                    as: 'Team',
                    attributes: ['name', 'description']
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                department: department,
                assets: assets,
                count: assets.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets by department',
            error: error.message
        });
    }
};

module.exports = {
    getAllDepartments,
    getDepartmentByName,
    getUsersByDepartment,
    getAssetsByDepartment
};