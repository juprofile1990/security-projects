const ROLE_ORDER = { analyst: 0, responder: 1, admin: 2 };

function requireRole(minRole) {
  const min = ROLE_ORDER[minRole];
  if (min === undefined) {
    throw new Error(`Unknown role: ${minRole}`);
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userLevel = ROLE_ORDER[req.user.role];
    if (userLevel === undefined || userLevel < min) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole("admin")(req, res, next);
}

function requireResponder(req, res, next) {
  return requireRole("responder")(req, res, next);
}

function requireAnalyst(req, res, next) {
  return requireRole("analyst")(req, res, next);
}

module.exports = {
  requireRole,
  requireAdmin,
  requireResponder,
  requireAnalyst,
  ROLE_ORDER,
};
