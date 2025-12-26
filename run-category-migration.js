const migration = require('./migrations/20251227000000-add-incident-category.js');
const { Sequelize } = require('sequelize');
const config = require('./config/config.json').development;

const sequelize = new Sequelize(config.database, config.username, config.password, config);

migration.up(sequelize.getQueryInterface(), Sequelize)
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  });
