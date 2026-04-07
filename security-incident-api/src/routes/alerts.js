const express = require("express");
const { body } = require("express-validator");
const alertController = require("../controllers/alertController");
const { validateRequest } = require("../middleware/validateRequest");
const { requireAnalyst, requireResponder } = require("../middleware/rbac");

const router = express.Router({ mergeParams: true });

router.get("/", requireAnalyst, alertController.listByIncident);

router.post(
  "/",
  requireResponder,
  body("source").trim().isLength({ min: 1, max: 120 }),
  body("type").trim().isLength({ min: 1, max: 120 }),
  body("raw_payload").custom((v) => v !== null && typeof v === "object" && !Array.isArray(v)),
  body("is_false_positive").optional().isBoolean(),
  validateRequest,
  alertController.createForIncident
);

module.exports = router;
