const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Calibration = sequelize.define('calibration', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    calibration_code: {
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
    calibration_type: {
        type: DataTypes.ENUM('internal', 'external'),
        allowNull: false,
        defaultValue: 'internal',
        comment: 'Loại hiệu chuẩn: internal (nội bộ) hoặc external (bên ngoài)'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Mức độ ưu tiên của công việc hiệu chuẩn'
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Trạng thái của công việc hiệu chuẩn'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tiêu đề công việc hiệu chuẩn'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết công việc cần thực hiện'
    },
    scheduled_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Ngày dự kiến thực hiện hiệu chuẩn'
    },
    actual_start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày bắt đầu thực tế'
    },
    actual_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày hoàn thành thực tế'
    },
    estimated_duration: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Thời gian ước tính (giờ)'
    },
    actual_duration: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Thời gian thực tế (giờ)'
    },
    technician_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID của kỹ thuật viên phụ trách'
    },
    calibration_standard: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Tiêu chuẩn hiệu chuẩn được sử dụng'
    },
    tolerance: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Sai số cho phép'
    },
    measured_value: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Giá trị đo được'
    },
    reference_value: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Giá trị tham chiếu'
    },
    deviation: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Độ lệch'
    },
    result: {
        type: DataTypes.ENUM('pass', 'fail', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Kết quả hiệu chuẩn: pass/fail/pending'
    },
    certificate_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Số chứng chỉ hiệu chuẩn'
    },
    certificate_issued_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày cấp chứng chỉ'
    },
    certificate_expiry_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày hết hạn chứng chỉ'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID của người tạo lịch hiệu chuẩn'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú bổ sung'
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Chi phí hiệu chuẩn'
    }
}, {
    tableName: 'calibrations',
    timestamps: true,
    indexes: [
        {
            fields: ['asset_id']
        },
        {
            fields: ['technician_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['scheduled_date']
        },
        {
            fields: ['result']
        },
        {
            fields: ['calibration_code'],
            unique: true
        },
        {
            fields: ['calibration_type']
        },
        {
            fields: ['priority']
        }
    ]
});

module.exports = {
    Calibration
};