const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const CalibrationOrder = sequelize.define('calibration_orders', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    order_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id'
        }
    },
    
    // SAP PM System Status
    system_status: {
        type: DataTypes.ENUM('CRTD', 'REL', 'TECO'),
        allowNull: false,
        defaultValue: 'CRTD'
    },
    
    // User Status
    status: {
        type: DataTypes.ENUM(
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
        defaultValue: 'draft'
    },
    
    calibration_type: {
        type: DataTypes.ENUM('initial', 'periodic', 'after_repair', 'spot_check'),
        allowNull: false,
        defaultValue: 'periodic'
    },
    calibration_method: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    
    // Scheduling
    scheduled_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    scheduled_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    scheduled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    
    // Execution
    calibrator_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    calibrator_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    
    // Results
    result_status: {
        type: DataTypes.ENUM('pass', 'fail', 'oot', 'na'),
        allowNull: true
    },
    tolerance_spec: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    measured_values: {
        type: DataTypes.JSON,
        allowNull: true
    },
    deviation_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // QA Review
    qa_reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    qa_reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    qa_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    qa_decision: {
        type: DataTypes.ENUM('accepted', 'rejected', 'oot'),
        allowNull: true
    },
    
    // OOT Handling
    is_oot: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    oot_detected_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    oot_severity: {
        type: DataTypes.ENUM('minor', 'major', 'critical'),
        allowNull: true
    },
    corrective_action_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    corrective_action_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    capa_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    maintenance_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    // Certificate
    certificate_no: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    certificate_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    certificate_valid_until: {
        type: DataTypes.DATE,
        allowNull: true
    },
    certificate_file_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Cost
    cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    external_service_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    
    // Audit
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    closed_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    // Soft delete
    is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    deleted_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'calibration_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false // Soft delete handled manually
});

module.exports = CalibrationOrder;
