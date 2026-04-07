const prisma = require("../lib/prisma");

function deriveAuditFields(req, res, parsedBody) {
  const method = req.method;
  const path = req.originalUrl.split("?")[0];

  let action = `${method} ${path}`;
  let target_type = "unknown";
  let target_id = null;
  let metadata = {
    path,
    method,
    statusCode: res.statusCode,
  };

  if (path === "/auth/register" && method === "POST") {
    action = "USER_REGISTER";
    target_type = "user";
    target_id = parsedBody?.user?.id ?? null;
    metadata = { ...metadata, email: parsedBody?.user?.email };
  } else if (path === "/auth/login" && method === "POST") {
    action = "USER_LOGIN";
    target_type = "session";
    target_id = null;
    metadata = { ...metadata, email: req.body?.email };
  } else if (path === "/incidents" && method === "POST") {
    action = "INCIDENT_CREATE";
    target_type = "incident";
    target_id = parsedBody?.incident?.id ?? null;
  } else if (/^\/incidents\/[^/]+$/.test(path) && method === "PATCH") {
    action = "INCIDENT_UPDATE";
    target_type = "incident";
    target_id = req.params.id;
  } else if (/^\/incidents\/[^/]+\/alerts$/.test(path) && method === "POST") {
    action = "ALERT_CREATE";
    target_type = "alert";
    target_id = parsedBody?.alert?.id ?? null;
    metadata = { ...metadata, incident_id: req.params.id };
  } else if (/^\/assets$/.test(path) && method === "POST") {
    action = "ASSET_CREATE";
    target_type = "asset";
    target_id = parsedBody?.asset?.id ?? null;
  } else if (/^\/incidents\/[^/]+\/assets$/.test(path) && method === "POST") {
    action = "INCIDENT_ASSET_LINK";
    target_type = "incident_asset";
    const aid = parsedBody?.link?.asset_id ?? req.body?.asset_id;
    target_id = `${req.params.id}:${aid ?? "unknown"}`;
    metadata = { ...metadata, incident_id: req.params.id, asset_id: aid };
  } else if (method === "DELETE") {
    action = `${method} ${path}`;
    target_type = "unknown";
    target_id = req.params.id ?? null;
    metadata = { ...metadata, note: "delete_route" };
  } else {
    metadata = { ...metadata, note: "unclassified_route" };
  }

  return { action, target_type, target_id, metadata };
}

function auditLogMiddleware() {
  return (req, res, next) => {
    if (!["POST", "PATCH", "DELETE"].includes(req.method)) {
      return next();
    }

    let wrote = false;
    const tryWrite = (parsedBody) => {
      if (wrote) return;
      const status = res.statusCode;
      if (status < 200 || status >= 400) return;
      wrote = true;

      const userId = req.user?.id ?? null;
      const { action, target_type, target_id, metadata } = deriveAuditFields(
        req,
        res,
        parsedBody
      );

      prisma.auditLog
        .create({
          data: {
            user_id: userId,
            action,
            target_type,
            target_id,
            metadata: metadata ?? undefined,
          },
        })
        .catch((err) => {
          console.error("audit_log_failed", err.message);
        });
    };

    const originalJson = res.json.bind(res);
    res.json = function auditWrappedJson(body) {
      tryWrite(body);
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = function auditWrappedSend(data) {
      if (Buffer.isBuffer(data)) {
        return originalSend(data);
      }
      let parsed = null;
      if (typeof data === "string") {
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = null;
        }
      } else if (data && typeof data === "object") {
        parsed = data;
      }
      tryWrite(parsed);
      return originalSend(data);
    };

    next();
  };
}

module.exports = { auditLogMiddleware, deriveAuditFields };
