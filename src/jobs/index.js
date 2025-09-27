const syncDatabase = require('./syncDatabase')
function startJobs() {
   syncDatabase();
}

startJobs();

