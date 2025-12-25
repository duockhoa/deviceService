// Stub service for compatibility
module.exports = {
    createAuditLog: async () => { return null; },
    getAuditLogsForEntity: async () => { return []; },
    getAuditLogsForUser: async () => { return []; }
};
