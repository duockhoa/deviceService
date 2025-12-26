/**
 * Migration: Add Incident Category for clear separation
 * 
 * Purpose: Phân loại sự cố thành 4 nhóm rõ ràng
 * Categories:
 * - EQUIPMENT: Sửa chữa thiết bị (liên quan asset_id) - M1/M2
 * - FACILITY: Nhà xưởng/Cơ sở hạ tầng (mái, tường, sàn, toilet)
 * - SYSTEM: Hệ thống (điện, nước, khí nén, HVAC, IT)
 * - OPERATION: Vận hành/Yêu cầu hỗ trợ (không sự cố) - M3/M4
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Adding incident_category for separation...');
      
      // 1. Add notification_type first if not exists
      const [tables] = await queryInterface.sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'incidents' 
        AND COLUMN_NAME = 'notification_type'
      `, { transaction });
      
      if (tables.length === 0) {
        console.log('  Adding notification_type column...');
        await queryInterface.addColumn('incidents', 'notification_type', {
          type: Sequelize.ENUM('M1', 'M2', 'M3', 'M4'),
          allowNull: true,
          comment: 'SAP PM: M1=Breakdown, M2=Malfunction, M3=Request, M4=Activity'
        }, { transaction });
      }
      
      // 2. Add incident_category column
      await queryInterface.addColumn('incidents', 'incident_category', {
        type: Sequelize.ENUM('EQUIPMENT', 'FACILITY', 'SYSTEM', 'OPERATION'),
        allowNull: false,
        defaultValue: 'EQUIPMENT',
        comment: 'EQUIPMENT=Thiết bị, FACILITY=Nhà xưởng, SYSTEM=Hệ thống điện/nước/khí, OPERATION=Vận hành/Yêu cầu'
      }, { transaction });
      
      // 3. Add facility/system specific fields
      await queryInterface.addColumn('incidents', 'facility_type', {
        type: Sequelize.ENUM(
          'building_structure', // Kết cấu tòa nhà
          'roof',               // Mái nhà
          'wall',               // Tường
          'floor',              // Sàn
          'door_window',        // Cửa/Cửa sổ
          'lighting',           // Chiếu sáng
          'restroom',           // Toilet/Vệ sinh
          'office',             // Văn phòng
          'warehouse',          // Kho
          'workshop',           // Xưởng sản xuất
          'parking',            // Bãi đỗ xe
          'landscape',          // Cảnh quan
          'other'
        ),
        allowNull: true,
        comment: 'Loại nhà xưởng/cơ sở hạ tầng'
      }, { transaction });
      
      await queryInterface.addColumn('incidents', 'system_type', {
        type: Sequelize.ENUM(
          'electrical',         // Điện
          'water',              // Nước
          'compressed_air',     // Khí nén
          'hvac',               // Điều hòa/Thông gió
          'fire_protection',    // PCCC
          'it_network',         // Mạng IT
          'cctv_security',      // Camera/An ninh
          'telephone',          // Điện thoại
          'waste_treatment',    // Xử lý chất thải
          'steam',              // Hơi nước
          'gas',                // Khí gas
          'other'
        ),
        allowNull: true,
        comment: 'Loại hệ thống'
      }, { transaction });
      
      await queryInterface.addColumn('incidents', 'operation_type', {
        type: Sequelize.ENUM(
          'support_request',    // Yêu cầu hỗ trợ
          'inspection',         // Kiểm tra
          'cleaning',           // Vệ sinh
          'setup',              // Thiết lập/Cài đặt
          'training',           // Đào tạo
          'consultation',       // Tư vấn
          'documentation',      // Lập tài liệu
          'other'
        ),
        allowNull: true,
        comment: 'Loại yêu cầu vận hành'
      }, { transaction });
      
      // 3. Add location fields (for non-equipment incidents)
      await queryInterface.addColumn('incidents', 'building', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Tòa nhà/Khu vực'
      }, { transaction });
      
      await queryInterface.addColumn('incidents', 'floor', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Tầng'
      }, { transaction });
      
      await queryInterface.addColumn('incidents', 'room', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Phòng/Khu vực cụ thể'
      }, { transaction });
      
      // 4. Create indexes
      await queryInterface.addIndex('incidents', ['incident_category'], {
        name: 'idx_incidents_category',
        transaction
      });
      
      await queryInterface.addIndex('incidents', ['incident_category', 'status'], {
        name: 'idx_incidents_category_status',
        transaction
      });
      
      await queryInterface.addIndex('incidents', ['facility_type'], {
        name: 'idx_incidents_facility_type',
        transaction
      });
      
      await queryInterface.addIndex('incidents', ['system_type'], {
        name: 'idx_incidents_system_type',
        transaction
      });
      
      // 5. DATA MIGRATION: Classify existing incidents
      console.log('[MIGRATION] Classifying existing incidents...');
      
      // EQUIPMENT: Incidents with asset_id
      const [equipmentCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET incident_category = 'EQUIPMENT'
        WHERE asset_id IS NOT NULL
      `, { transaction });
      console.log(`  ✅ EQUIPMENT: ${equipmentCount.affectedRows || 0} incidents`);
      
      // OPERATION: M3/M4 without asset
      const [operationCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          incident_category = 'OPERATION',
          operation_type = CASE
            WHEN LOWER(title) LIKE '%vệ sinh%' OR LOWER(title) LIKE '%clean%' THEN 'cleaning'
            WHEN LOWER(title) LIKE '%kiểm tra%' OR LOWER(title) LIKE '%inspect%' THEN 'inspection'
            WHEN LOWER(title) LIKE '%hỗ trợ%' OR LOWER(title) LIKE '%support%' THEN 'support_request'
            ELSE 'other'
          END
        WHERE asset_id IS NULL 
        AND notification_type IN ('M3', 'M4')
      `, { transaction });
      console.log(`  ✅ OPERATION: ${operationCount.affectedRows || 0} incidents`);
      
      // SYSTEM: Based on keywords
      const [systemCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          incident_category = 'SYSTEM',
          system_type = CASE
            WHEN LOWER(title) LIKE '%điện%' OR LOWER(title) LIKE '%electric%' THEN 'electrical'
            WHEN LOWER(title) LIKE '%nước%' OR LOWER(title) LIKE '%water%' THEN 'water'
            WHEN LOWER(title) LIKE '%khí%' OR LOWER(title) LIKE '%air%' THEN 'compressed_air'
            WHEN LOWER(title) LIKE '%điều hòa%' OR LOWER(title) LIKE '%hvac%' OR LOWER(title) LIKE '%thông gió%' THEN 'hvac'
            WHEN LOWER(title) LIKE '%pccc%' OR LOWER(title) LIKE '%chữa cháy%' OR LOWER(title) LIKE '%fire%' THEN 'fire_protection'
            WHEN LOWER(title) LIKE '%mạng%' OR LOWER(title) LIKE '%it%' OR LOWER(title) LIKE '%network%' THEN 'it_network'
            WHEN LOWER(title) LIKE '%camera%' OR LOWER(title) LIKE '%cctv%' OR LOWER(title) LIKE '%an ninh%' THEN 'cctv_security'
            ELSE 'other'
          END
        WHERE asset_id IS NULL 
        AND incident_category = 'EQUIPMENT'
        AND (
          LOWER(title) LIKE '%điện%' OR LOWER(title) LIKE '%nước%' OR 
          LOWER(title) LIKE '%khí%' OR LOWER(title) LIKE '%điều hòa%' OR
          LOWER(title) LIKE '%pccc%' OR LOWER(title) LIKE '%mạng%' OR
          LOWER(title) LIKE '%camera%' OR LOWER(title) LIKE '%it%'
        )
      `, { transaction });
      console.log(`  ✅ SYSTEM: ${systemCount.affectedRows || 0} incidents`);
      
      // FACILITY: Based on keywords
      const [facilityCount] = await queryInterface.sequelize.query(`
        UPDATE incidents 
        SET 
          incident_category = 'FACILITY',
          facility_type = CASE
            WHEN LOWER(title) LIKE '%mái%' OR LOWER(title) LIKE '%roof%' THEN 'roof'
            WHEN LOWER(title) LIKE '%tường%' OR LOWER(title) LIKE '%wall%' THEN 'wall'
            WHEN LOWER(title) LIKE '%sàn%' OR LOWER(title) LIKE '%floor%' THEN 'floor'
            WHEN LOWER(title) LIKE '%cửa%' OR LOWER(title) LIKE '%door%' OR LOWER(title) LIKE '%window%' THEN 'door_window'
            WHEN LOWER(title) LIKE '%toilet%' OR LOWER(title) LIKE '%wc%' OR LOWER(title) LIKE '%vệ sinh%' THEN 'restroom'
            WHEN LOWER(title) LIKE '%chiếu sáng%' OR LOWER(title) LIKE '%đèn%' OR LOWER(title) LIKE '%light%' THEN 'lighting'
            WHEN LOWER(title) LIKE '%xưởng%' OR LOWER(title) LIKE '%workshop%' THEN 'workshop'
            WHEN LOWER(title) LIKE '%kho%' OR LOWER(title) LIKE '%warehouse%' THEN 'warehouse'
            ELSE 'building_structure'
          END
        WHERE asset_id IS NULL 
        AND incident_category = 'EQUIPMENT'
        AND (
          LOWER(title) LIKE '%nhà%' OR LOWER(title) LIKE '%tòa%' OR
          LOWER(title) LIKE '%mái%' OR LOWER(title) LIKE '%tường%' OR
          LOWER(title) LIKE '%sàn%' OR LOWER(title) LIKE '%cửa%' OR
          LOWER(title) LIKE '%toilet%' OR LOWER(title) LIKE '%xưởng%'
        )
      `, { transaction });
      console.log(`  ✅ FACILITY: ${facilityCount.affectedRows || 0} incidents`);
      
      await transaction.commit();
      console.log('[MIGRATION] ✅ Incident category separation completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes
      await queryInterface.removeIndex('incidents', 'idx_incidents_system_type', { transaction });
      await queryInterface.removeIndex('incidents', 'idx_incidents_facility_type', { transaction });
      await queryInterface.removeIndex('incidents', 'idx_incidents_category_status', { transaction });
      await queryInterface.removeIndex('incidents', 'idx_incidents_category', { transaction });
      
      // Remove columns
      await queryInterface.removeColumn('incidents', 'room', { transaction });
      await queryInterface.removeColumn('incidents', 'floor', { transaction });
      await queryInterface.removeColumn('incidents', 'building', { transaction });
      await queryInterface.removeColumn('incidents', 'operation_type', { transaction });
      await queryInterface.removeColumn('incidents', 'system_type', { transaction });
      await queryInterface.removeColumn('incidents', 'facility_type', { transaction });
      await queryInterface.removeColumn('incidents', 'incident_category', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
