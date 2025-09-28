const { Assets, AssetCategories, User } = require('../models');

// GET /api/assets - Lấy tất cả assets
const getAllAssets = async (req, res) => {
    try {
        const assets = await Assets.findAll({
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] }
            ]
        });
        
        res.status(200).json({
            success: true,
            data: assets,
            count: assets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets',
            error: error.message
        });
    }
};

// GET /api/assets/:id - Lấy asset theo ID
const getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id, {
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] }
            ]
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        res.status(200).json({
            success: true,
            data: asset
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset',
            error: error.message
        });
    }
};

// POST /api/assets - Tạo asset mới
const createAsset = async (req, res) => {
    try {
        const assetData = {
            ...req.body,
            created_by: req.user.id // Từ auth middleware
        };

        const newAsset = await Assets.create(assetData);
        
        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: newAsset
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating asset',
            error: error.message
        });
    }
};

// PUT /api/assets/:id - Cập nhật asset
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        await asset.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: asset
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating asset',
            error: error.message
        });
    }
};

// DELETE /api/assets/:id - Xóa asset
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        await asset.destroy();

        res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting asset',
            error: error.message
        });
    }
};

module.exports = {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset
};