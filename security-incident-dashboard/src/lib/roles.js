export function canMutate(role) {
  return role === "responder" || role === "admin";
}

export function canViewAuditLogs(role) {
  return role === "admin";
}
