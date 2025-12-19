// Deprecated: permissionGuard is now a no-op. Authorization is enforced via workflow RBAC.
const permissionGuard = () => (_req, _res, next) => next();
const permissionGuardAny = () => (_req, _res, next) => next();

module.exports = {
    permissionGuard,
    permissionGuardAny
};
