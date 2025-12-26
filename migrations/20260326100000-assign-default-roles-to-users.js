'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Gán Manager cho TP, TGĐ, CG, và BGĐ
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by, created_at, updated_at)
      SELECT id, 2, 1, NOW(), NOW()
      FROM users
      WHERE (position IN ('TP', 'TGĐ', 'CG') OR department = 'BGĐ')
      AND deleted_at IS NULL
      AND id NOT IN (SELECT user_id FROM user_roles WHERE role_id = 2);
    `);

    // 2. Gán QA cho ĐBCL
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by, created_at, updated_at)
      SELECT id, 10, 1, NOW(), NOW()
      FROM users
      WHERE department = 'ĐBCL'
      AND deleted_at IS NULL
      AND id NOT IN (SELECT user_id FROM user_roles WHERE role_id = 10);
    `);

    // 3. Gán Technician cho CN (công nhân) trong phân xưởng
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by, created_at, updated_at)
      SELECT id, 3, 1, NOW(), NOW()
      FROM users
      WHERE position = 'CN' AND (department LIKE 'PX%' OR department LIKE 'KỸ THUẬT%')
      AND deleted_at IS NULL
      AND id NOT IN (SELECT user_id FROM user_roles WHERE role_id = 3);
    `);

    // 4. Gán Planner cho phòng Kế hoạch
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by, created_at, updated_at)
      SELECT id, 11, 1, NOW(), NOW()
      FROM users
      WHERE department = 'KHTH'
      AND deleted_at IS NULL
      AND id NOT IN (SELECT user_id FROM user_roles WHERE role_id = 11);
    `);

    console.log('✅ Đã gán roles mặc định cho users theo phòng ban và chức vụ');
  },

  down: async (queryInterface, Sequelize) => {
    // Không revert vì có thể đã có thay đổi thủ công
    console.log('⚠️ Migration down: Giữ nguyên roles đã gán');
  }
};
