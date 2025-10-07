const { Areas, Plants, Positions } = require('../models');

// GET /api/areas - Lấy tất cả areas
const getAllAreas = async (req, res) => {
    try {
        const areas = await Areas.findAll({
            include: [
                {
                    model: Plants,
                    as: 'Plant',
                    attributes: ['id', 'code', 'name', 'description']
                },
                {
                    model: Positions,
                    as: 'Positions',
                    attributes: ['id', 'code', 'name'],
                    required: false
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: areas,
            count: areas.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching areas',
            error: error.message
        });
    }
};

// GET /api/areas/:id - Lấy area theo ID
const getAreaById = async (req, res) => {
    try {
        const { id } = req.params;
        const area = await Areas.findByPk(id, {
            include: [
                {
                    model: Plants,
                    as: 'Plant',
                    attributes: ['id', 'code', 'name', 'description']
                },
                {
                    model: Positions,
                    as: 'Positions',
                    attributes: ['id', 'code', 'name', 'description']
                }
            ]
        });

        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }

        res.status(200).json({
            success: true,
            data: area
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching area',
            error: error.message
        });
    }
};

// POST /api/areas - Tạo area mới
const createArea = async (req, res) => {
    try {
        const { code, name, plant_id, description } = req.body;

        // Validation
        if (!code || !name || !plant_id) {
            return res.status(400).json({
                success: false,
                message: 'Code, name, and plant_id are required'
            });
        }

        // Kiểm tra plant có tồn tại không
        const plant = await Plants.findByPk(plant_id);
        if (!plant) {
            return res.status(400).json({
                success: false,
                message: 'Plant not found'
            });
        }

        // Kiểm tra trùng code
        const existingArea = await Areas.findOne({
            where: { code }
        });

        if (existingArea) {
            return res.status(409).json({
                success: false,
                message: 'Area code already exists'
            });
        }

        const newArea = await Areas.create({
            code,
            name,
            plant_id,
            description
        });

        // Lấy area mới tạo với thông tin plant
        const areaWithPlant = await Areas.findByPk(newArea.id, {
            include: [
                { model: Plants, as: 'Plant' }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Area created successfully',
            data: areaWithPlant
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Area code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating area',
            error: error.message
        });
    }
};

// PUT /api/areas/:id - Cập nhật area
const updateArea = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, plant_id, description } = req.body;

        const area = await Areas.findByPk(id);

        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }

        // Kiểm tra plant có tồn tại không (nếu có thay đổi)
        if (plant_id && plant_id !== area.plant_id) {
            const plant = await Plants.findByPk(plant_id);
            if (!plant) {
                return res.status(400).json({
                    success: false,
                    message: 'Plant not found'
                });
            }
        }

        // Kiểm tra trùng code (nếu có thay đổi)
        if (code && code !== area.code) {
            const existingArea = await Areas.findOne({
                where: { code }
            });

            if (existingArea) {
                return res.status(409).json({
                    success: false,
                    message: 'Area code already exists'
                });
            }
        }

        await area.update({
            code: code || area.code,
            name: name || area.name,
            plant_id: plant_id || area.plant_id,
            description: description !== undefined ? description : area.description
        });

        // Lấy area đã cập nhật với thông tin plant
        const updatedArea = await Areas.findByPk(id, {
            include: [
                { model: Plants, as: 'Plant' },
                { model: Positions, as: 'Positions' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Area updated successfully',
            data: updatedArea
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Area code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating area',
            error: error.message
        });
    }
};

// DELETE /api/areas/:id - Xóa area
const deleteArea = async (req, res) => {
    try {
        const { id } = req.params;

        const area = await Areas.findByPk(id, {
            include: [{ model: Positions, as: 'Positions' }]
        });

        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }

        // Kiểm tra xem có position nào thuộc area này không
        if (area.Positions && area.Positions.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete area. It has ${area.Positions.length} position(s) assigned to it.`
            });
        }

        await area.destroy();

        res.status(200).json({
            success: true,
            message: 'Area deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting area',
            error: error.message
        });
    }
};

// GET /api/areas/by-plant/:plantId - Lấy areas theo plant
const getAreasByPlant = async (req, res) => {
    try {
        const { plantId } = req.params;

        const plant = await Plants.findByPk(plantId);
        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Plant not found'
            });
        }

        const areas = await Areas.findAll({
            where: { plant_id: plantId },
            include: [
                {
                    model: Plants,
                    as: 'Plant',
                    attributes: ['id', 'code', 'name']
                },
                {
                    model: Positions,
                    as: 'Positions',
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

// GET /api/areas/:id/positions - Lấy tất cả positions thuộc area
const getPositionsByArea = async (req, res) => {
    try {
        const { id } = req.params;

        const area = await Areas.findByPk(id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }

        const positions = await Positions.findAll({
            where: { area_id: id },
            include: [
                {
                    model: Areas,
                    as: 'Area',
                    attributes: ['id', 'code', 'name']
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                area: area,
                positions: positions,
                count: positions.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching positions by area',
            error: error.message
        });
    }
};

module.exports = {
    getAllAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea,
    getAreasByPlant,
    getPositionsByArea
};