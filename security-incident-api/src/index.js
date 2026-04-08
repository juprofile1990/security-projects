require("dotenv").config();
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config({ path: ".env.local", override: true });
}

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
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

// Global rate limiter — 300 requests per 15 min per IP across all routes.
// Auth routes have their own tighter limiter (10 per 15 min) on top of this.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    // Lock CORS to your GitHub Pages domain. Override via CORS_ORIGIN env var for local dev.
    origin: process.env.CORS_ORIGIN || "https://juprofile1990.github.io",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(globalLimiter);

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
