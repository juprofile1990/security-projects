const express = require("express");
const { body, param, query } = require("express-validator");
const incidentController = require("../controllers/incidentController");
const assetController = require("../controllers/assetController");
const alertsRouter = require("./alerts");
const { validateRequest } = require("../middleware/validateRequest");
const { requireAnalyst, requireResponder } = require("../middleware/rbac");

const router = express.Router();

const incidentAssetLink = express.Router({ mergeParams: true });

incidentAssetLink.post(
  "/",
  requireResponder,
  body("asset_id").isUUID(),
  validateRequest,
  assetController.linkToIncident
);

router.get(
  "/",
  requireAnalyst,
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("offset").optional().isInt({ min: 0 }),
  validateRequest,
  incidentController.list
);

router.post(
  "/",
  requireResponder,
  body("title").trim().isLength({ min: 1, max: 200 }),
  body("description").trim().isLength({ min: 1, max: 8000 }),
  body("severity").isIn(["critical", "high", "medium", "low"]),
  body("status")
    .optional()
    .isIn(["open", "investigating", "contained", "resolved", "closed"]),
  body("assigned_to").optional({ nullable: true }).isUUID(),
  validateRequest,
  incidentController.create
);

router.use("/:id/alerts", alertsRouter);
router.use("/:id/assets", incidentAssetLink);

router.get(
  "/:id",
  requireAnalyst,
  param("id").isUUID(),
  validateRequest,
  incidentController.getOne
);

router.patch(
  "/:id",
  requireResponder,
  param("id").isUUID(),
  body("title").optional().trim().isLength({ min: 1, max: 200 }),
  body("description").optional().trim().isLength({ min: 1, max: 8000 }),
  body("severity").optional().isIn(["critical", "high", "medium", "low"]),
  body("status").optional().isIn(["open", "investigating", "contained", "resolved", "closed"]),
  body("assigned_to").optional({ nullable: true }).isUUID(),
  body("resolved_at").optional({ nullable: true }).isISO8601(),
  validateRequest,
  incidentController.update
);

module.exports = router;
