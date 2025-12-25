'use strict';

/**
 * Migration: Create Calibration Orders table
 * SAP PM-lite pattern: System Status + User Status
 * GMP Compliance: Full audit trail
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        
        try {
            console.log('Creating calibration_orders table...');
            
            await queryInterface.createTable('calibration_orders', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                order_code: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    unique: true,
                    comment: 'Unique code: CAL-2025-0001'
                },
                asset_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'assets',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'RESTRICT', // Cannot delete asset with calibration history
                    comment: 'Asset being calibrated'
                },
                
                // SAP PM System Status (Hard Gate)
                system_status: {
                    type: Sequelize.ENUM('CRTD', 'REL', 'TECO'),
                    allowNull: false,
                    defaultValue: 'CRTD',
                    comment: 'System status: CRTD=Created, REL=Released, TECO=Tech Complete'
                },
                
                // User Status (Business Workflow)
                status: {
                    type: Sequelize.ENUM(
                        'draft',
                        'scheduled',
                        'in_progress',
                        'awaiting_qa_review',
                        'accepted',
                        'rejected',
                        'out_of_tolerance',
                        'corrective_action',
                        'closed',
                        'cancelled'
                    ),
                    allowNull: false,
                    defaultValue: 'draft',
                    comment: 'Business workflow status'
                },
                
                // Calibration details
                calibration_type: {
                    type: Sequelize.ENUM('initial', 'periodic', 'after_repair', 'spot_check'),
                    allowNull: false,
                    defaultValue: 'periodic',
                    comment: 'Type of calibration'
                },
                calibration_method: {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                    comment: 'Standard method/procedure reference (e.g., SOP-CAL-001)'
                },
                
                // Scheduling
                scheduled_date: {
                    type: Sequelize.DATE,
                    allowNull: true,
                    comment: 'Planned calibration date'
                },
                scheduled_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                scheduled_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                
                // Execution
                calibrator_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    comment: 'Internal technician performing calibration'
                },
                calibrator_name: {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                    comment: 'External provider name if applicable'
                },
                started_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                completed_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                
                // Results
                result_status: {
                    type: Sequelize.ENUM('pass', 'fail', 'oot', 'na'),
                    allowNull: true,
                    comment: 'Overall calibration result'
                },
                tolerance_spec: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                    comment: 'Acceptance criteria / tolerance specification'
                },
                measured_values: {
                    type: Sequelize.JSON,
                    allowNull: true,
                    comment: 'Array of measurement results with expected vs actual'
                },
                deviation_notes: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                    comment: 'Notes on any deviations observed'
                },
                
                // QA Review (GMP Critical)
                qa_reviewed_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                qa_reviewed_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                qa_notes: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                qa_decision: {
                    type: Sequelize.ENUM('accepted', 'rejected', 'oot'),
                    allowNull: true
                },
                
                // OOT Handling (GMP Critical)
                is_oot: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                    comment: 'Out of Tolerance flag'
                },
                oot_detected_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                oot_severity: {
                    type: Sequelize.ENUM('minor', 'major', 'critical'),
                    allowNull: true,
                    comment: 'Severity of OOT condition'
                },
                corrective_action_required: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                corrective_action_notes: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                capa_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Link to CAPA if required'
                },
                maintenance_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Link to corrective maintenance WO if created'
                },
                
                // Certificate
                certificate_no: {
                    type: Sequelize.STRING(100),
                    allowNull: true
                },
                certificate_date: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                certificate_valid_until: {
                    type: Sequelize.DATE,
                    allowNull: true,
                    comment: 'Expiry date = certificate_date + calibration_interval'
                },
                certificate_file_url: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                    comment: 'URL to certificate document'
                },
                
                // Cost tracking
                cost: {
                    type: Sequelize.DECIMAL(15, 2),
                    allowNull: true,
                    comment: 'Total calibration cost'
                },
                external_service_cost: {
                    type: Sequelize.DECIMAL(15, 2),
                    allowNull: true,
                    comment: 'External vendor cost if applicable'
                },
                
                // Audit trail
                created_by: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
                },
                closed_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                closed_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                
                // Soft delete (GMP requirement - never hard delete)
                is_deleted: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                deleted_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                deleted_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                }
            }, { 
                transaction,
                comment: 'Calibration Orders - SAP PM-lite pattern with GMP compliance'
            });
            
            // Indexes for performance and compliance
            await queryInterface.addIndex('calibration_orders', ['asset_id', 'scheduled_date'], {
                name: 'idx_cal_asset_scheduled',
                transaction
            });
            
            await queryInterface.addIndex('calibration_orders', ['status'], {
                name: 'idx_cal_status',
                transaction
            });
            
            await queryInterface.addIndex('calibration_orders', ['system_status'], {
                name: 'idx_cal_system_status',
                transaction
            });
            
            await queryInterface.addIndex('calibration_orders', ['result_status'], {
                name: 'idx_cal_result_status',
                transaction
            });
            
            await queryInterface.addIndex('calibration_orders', ['is_oot'], {
                name: 'idx_cal_is_oot',
                transaction
            });
            
            await queryInterface.addIndex('calibration_orders', ['certificate_valid_until'], {
                name: 'idx_cal_cert_valid_until',
                transaction
            });
            
            await queryInterface.addIndex('calibration_orders', ['qa_reviewed_by', 'qa_reviewed_at'], {
                name: 'idx_cal_qa_review',
                transaction
            });
            
            // Index for compliance reports
            await queryInterface.addIndex('calibration_orders', ['created_at', 'status'], {
                name: 'idx_cal_created_status',
                transaction
            });
            
            await transaction.commit();
            console.log('✅ Successfully created calibration_orders table');
            
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        
        try {
            console.log('Dropping calibration_orders table...');
            await queryInterface.dropTable('calibration_orders', { transaction });
            await transaction.commit();
            console.log('✅ Successfully dropped calibration_orders table');
            
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
};
