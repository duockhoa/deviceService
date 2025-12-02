// Simple department-based guard. Allows dev team IDs by default.
const DEV_TEAM_IDS = [596, 947];

const departmentGuard = (allowedDepartments = []) => {
    return (req, res, next) => {
        const user = req.user || {};

        // Dev team bypass
        if (DEV_TEAM_IDS.includes(user.id)) {
            return next();
        }

        if (!user.department) {
            return res.status(403).json({ success: false, message: 'Không xác định phòng ban của bạn.' });
        }

        if (allowedDepartments.length === 0 || allowedDepartments.includes(user.department)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập chức năng này theo phòng ban.'
        });
    };
};

module.exports = departmentGuard;
