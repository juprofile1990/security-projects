const express = require("express");
const { body, query } = require("express-validator");
const assetController = require("../controllers/assetController");
const { validateRequest } = require("../middleware/validateRequest");
const { requireAnalyst, requireResponder } = require("../middleware/rbac");

const router = express.Router();

router.get(
  "/",
  requireAnalyst,
  query("limit").optional().isInt({ min: 1, max: 500 }),
  query("offset").optional().isInt({ min: 0 }),
  validateRequest,
  assetController.list
);

router.post(
  "/",
  requireResponder,
  body("hostname").trim().isLength({ min: 1, max: 253 }),
  body("ip_address").isIP(),
  body("type").trim().isLength({ min: 1, max: 120 }),
  body("owner").trim().isLength({ min: 1, max: 120 }),
  body("criticality").isIn(["critical", "high", "medium", "low"]),
  validateRequest,
  assetController.create
);

module.exports = router;
