const syncDatabase = require('./syncDatabase');
const { startNotificationScheduler } = require('./notificationScheduler');

function startJobs() {
   syncDatabase();
   startNotificationScheduler();
}

startJobs();

