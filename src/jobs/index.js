const syncDatabase = require('./syncDatabase');
const { startNotificationScheduler } = require('./notificationScheduler');

let hasInitialized = false;
async function startJobs() {
   if (hasInitialized) {
      return;
   }
   hasInitialized = true;
   
   console.log('[JOBS] Initializing jobs...');
   
   try {
      // Run sync database
      await syncDatabase();
      console.log('[JOBS] Database sync completed');
   } catch (err) {
      console.error('[JOBS] Database sync failed:', err.message);
   }
   
   try {
      // Start scheduler
      startNotificationScheduler();
      console.log('[JOBS] Scheduler started');
   } catch (err) {
      console.error('[JOBS] Scheduler start failed:', err.message);
   }
}

// Don't call startJobs() here - let it be called from index.js after server starts

module.exports = { startJobs };

