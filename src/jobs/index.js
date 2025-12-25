const syncDatabase = require('./syncDatabase');
const { startNotificationScheduler } = require('./notificationScheduler');

let hasInitialized = false;
async function startJobs() {
   if (hasInitialized) {
      return;
   }
   hasInitialized = true;
   
   console.log('🔧 Initializing jobs...');
   
   try {
      // Run sync database
      await syncDatabase();
      console.log('✅ Database sync completed');
   } catch (err) {
      console.error('❌ Database sync failed:', err.message);
   }
   
   try {
      // Start scheduler
      startNotificationScheduler();
      console.log('✅ Scheduler started');
   } catch (err) {
      console.error('❌ Scheduler start failed:', err.message);
   }
}

// Don't call startJobs() here - let it be called from index.js after server starts

module.exports = { startJobs };

