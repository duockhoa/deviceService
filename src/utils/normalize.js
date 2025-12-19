const normalizeCode = (code) => {
    if (code === undefined || code === null) return null;
    const normalized = code.toString().trim().toUpperCase();
    return normalized || null;
};

const sanitizeKey = (key) => {
    if (!key) return null;
    return key.toString().trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128);
};

module.exports = {
    normalizeCode,
    sanitizeKey
};
