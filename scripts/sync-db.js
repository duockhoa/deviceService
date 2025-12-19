const { sequelize } = require('../src/configs/sequelize');

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ DB recreated from models');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
})();
