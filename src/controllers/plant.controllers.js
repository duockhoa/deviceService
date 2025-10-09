const { Plants, Areas } = require('../models'); // Bỏ Positions

// GET /api/plants - Lấy tất cả plants
const getAllPlants = async (req, res) => {
    try {
        const plants = await Plants.findAll({
            include: [
                {
                    model: Areas,
                    as: 'Areas',
                    attributes: ['id', 'code', 'name'],
                    required: false
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: plants,
            count: plants.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching plants',
            error: error.message
        });
    }
};

// GET /api/plants/:id - Lấy plant theo ID
const getPlantById = async (req, res) => {
    try {
        const { id } = req.params;
        const plant = await Plants.findByPk(id, {
            include: [
                {
                    model: Areas,
                    as: 'Areas',
                    attributes: ['id', 'code', 'name', 'description']
                }
            ]
        });

        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Plant not found'
            });
        }

        res.status(200).json({
            success: true,
            data: plant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching plant',
            error: error.message
        });
    }
};

// POST /api/plants - Tạo plant mới
const createPlant = async (req, res) => {
    try {
        const { code, name, description } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({
                success: false,
                message: 'Code and name are required'
            });
        }

        // Kiểm tra trùng code
        const existingPlant = await Plants.findOne({
            where: { code }
        });

        if (existingPlant) {
            return res.status(409).json({
                success: false,
                message: 'Plant code already exists'
            });
        }

        const newPlant = await Plants.create({
            code,
            name,
            description
        });

        res.status(201).json({
            success: true,
            message: 'Plant created successfully',
            data: newPlant
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Plant code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating plant',
            error: error.message
        });
    }
};

// PUT /api/plants/:id - Cập nhật plant
const updatePlant = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, description } = req.body;

        const plant = await Plants.findByPk(id);

        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Plant not found'
            });
        }

        // Kiểm tra trùng code (nếu có thay đổi)
        if (code && code !== plant.code) {
            const existingPlant = await Plants.findOne({
                where: { code }
            });

            if (existingPlant) {
                return res.status(409).json({
                    success: false,
                    message: 'Plant code already exists'
                });
            }
        }

        await plant.update({
            code: code || plant.code,
            name: name || plant.name,
            description: description !== undefined ? description : plant.description
        });

        // Lấy plant đã cập nhật với thông tin areas
        const updatedPlant = await Plants.findByPk(id, {
            include: [
                {
                    model: Areas,
                    as: 'Areas',
                    attributes: ['id', 'code', 'name']
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Plant updated successfully',
            data: updatedPlant
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Plant code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating plant',
            error: error.message
        });
    }
};

// DELETE /api/plants/:id - Xóa plant
const deletePlant = async (req, res) => {
    try {
        const { id } = req.params;

        const plant = await Plants.findByPk(id, {
            include: [{ model: Areas, as: 'Areas' }]
        });

        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Plant not found'
            });
        }

        // Kiểm tra xem có area nào thuộc plant này không
        if (plant.Areas && plant.Areas.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete plant. It has ${plant.Areas.length} area(s) assigned to it.`
            });
        }

        await plant.destroy();

        res.status(200).json({
            success: true,
            message: 'Plant deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting plant',
            error: error.message
        });
    }
};

// GET /api/plants/:id/areas - Lấy tất cả areas thuộc plant
const getAreasByPlant = async (req, res) => {
    try {
        const { id } = req.params;

        const plant = await Plants.findByPk(id);
        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Plant not found'
            });
        }

        const areas = await Areas.findAll({
            where: { plant_id: id },
            include: [
                {
                    model: Plants,
                    as: 'Plant',
                    attributes: ['id', 'code', 'name']
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                plant: plant,
                areas: areas,
                count: areas.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching areas by plant',
            error: error.message
        });
    }
};

// GET /api/plants/by-code/:code - Lấy plant theo code
const getPlantByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const plant = await Plants.findOne({
            where: { code },
            include: [
                {
                    model: Areas,
                    as: 'Areas',
                    attributes: ['id', 'code', 'name', 'description']
                }
            ]
        });

        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Plant not found'
            });
        }

        res.status(200).json({
            success: true,
            data: plant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching plant by code',
            error: error.message
        });
    }
};

module.exports = {
    getAllPlants,
    getPlantById,
    createPlant,
    updatePlant,
    deletePlant,
    getAreasByPlant,
    getPlantByCode
};