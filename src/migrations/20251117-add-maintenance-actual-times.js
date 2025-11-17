'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Actual times đã có rồi, chỉ cần đảm bảo chúng tồn tại
        // Kiểm tra và thêm nếu chưa có
        const tableDescription = await queryInterface.describeTable('maintenance');
        
        if (!tableDescription.actual_start_date) {
            await queryInterface.addColumn('maintenance', 'actual_start_date', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Thời gian thực tế bắt đầu bảo trì'
            });
        }

        if (!tableDescription.actual_end_date) {
            await queryInterface.addColumn('maintenance', 'actual_end_date', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Thời gian thực tế kết thúc bảo trì'
            });
        }

        // actual_duration đã có sẵn từ trước
    },

    down: async (queryInterface, Sequelize) => {
        // Không xóa vì có thể đã có data
    }
};
