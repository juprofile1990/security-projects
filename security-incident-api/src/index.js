require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const { checkExact } = require("express-validator");

const { errorHandler } = require("./middleware/errorHandler");
const { validateRequest } = require("./middleware/validateRequest");
const { auditLogMiddleware } = require("./middleware/auditLog");
const { requireAuth } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const incidentsRoutes = require("./routes/incidents");
const assetsRoutes = require("./routes/assets");
const auditLogsRoutes = require("./routes/auditLogs");

const PORT = Number(process.env.PORT) || 3000;

function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));

  app.use(auditLogMiddleware());

  app.get("/health", checkExact(), validateRequest, (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/incidents", requireAuth(), incidentsRoutes);
  app.use("/assets", requireAuth(), assetsRoutes);
  app.use("/audit-logs", requireAuth(), auditLogsRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return app;
}

const app = buildApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, buildApp };
