'use strict';

/**
 * Migration: Add Calibration fields to Assets table
 * SAP PM-lite + GMP Compliance
 * 
 * SAFETY: Adds columns only, does not modify existing data
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        
        try {
            console.log('Adding calibration fields to assets table...');
            
            // 1. Add calibration tracking fields
            await queryInterface.addColumn('assets', 'requires_calibration', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether this asset requires periodic calibration'
            }, { transaction });
            
            await queryInterface.addColumn('assets', 'calibration_interval_days', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Calibration frequency in days (e.g., 365 for yearly)'
            }, { transaction });
            
            await queryInterface.addColumn('assets', 'calibration_status', {
                type: Sequelize.ENUM(
                    'valid',
                    'due_soon',
                    'overdue',
                    'in_calibration',
                    'out_of_tolerance'
                ),
                allowNull: false,
                defaultValue: 'valid',
                comment: 'Current calibration compliance status'
            }, { transaction });
            
            // 2. Add calibration dates
            await queryInterface.addColumn('assets', 'last_calibrated_at', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Last successful calibration date'
            }, { transaction });
            
            await queryInterface.addColumn('assets', 'next_due_at', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Next calibration due date'
            }, { transaction });
            
            // 3. Add certificate tracking
            await queryInterface.addColumn('assets', 'certificate_no', {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Latest calibration certificate number'
            }, { transaction });
            
            await queryInterface.addColumn('assets', 'certificate_file_url', {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'URL to certificate document (Cloudinary/storage)'
            }, { transaction });
            
            // 4. Add provider info
            await queryInterface.addColumn('assets', 'calibration_provider', {
                type: Sequelize.ENUM('internal', 'external'),
                allowNull: false,
                defaultValue: 'internal',
                comment: 'Calibration performed by internal team or external vendor'
            }, { transaction });
            
            // 5. Add indexes for performance
            await queryInterface.addIndex('assets', ['calibration_status'], {
                name: 'idx_assets_calibration_status',
                transaction
            });
            
            await queryInterface.addIndex('assets', ['next_due_at'], {
                name: 'idx_assets_next_due_at',
                transaction
            });
            
            await queryInterface.addIndex('assets', ['requires_calibration', 'calibration_status'], {
                name: 'idx_assets_cal_required_status',
                transaction
            });
            
            await transaction.commit();
            console.log('✅ Successfully added calibration fields to assets');
            
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        
        try {
            console.log('Rolling back calibration fields from assets table...');
            
            // Drop indexes first
            await queryInterface.removeIndex('assets', 'idx_assets_calibration_status', { transaction });
            await queryInterface.removeIndex('assets', 'idx_assets_next_due_at', { transaction });
            await queryInterface.removeIndex('assets', 'idx_assets_cal_required_status', { transaction });
            
            // Drop columns
            await queryInterface.removeColumn('assets', 'calibration_provider', { transaction });
            await queryInterface.removeColumn('assets', 'certificate_file_url', { transaction });
            await queryInterface.removeColumn('assets', 'certificate_no', { transaction });
            await queryInterface.removeColumn('assets', 'next_due_at', { transaction });
            await queryInterface.removeColumn('assets', 'last_calibrated_at', { transaction });
            await queryInterface.removeColumn('assets', 'calibration_status', { transaction });
            await queryInterface.removeColumn('assets', 'calibration_interval_days', { transaction });
            await queryInterface.removeColumn('assets', 'requires_calibration', { transaction });
            
            await transaction.commit();
            console.log('✅ Successfully rolled back calibration fields');
            
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
};
