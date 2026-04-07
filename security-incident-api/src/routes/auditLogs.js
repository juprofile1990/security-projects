const express = require("express");
const { query } = require("express-validator");
const auditLogController = require("../controllers/auditLogController");
const { validateRequest } = require("../middleware/validateRequest");
const { requireAdmin } = require("../middleware/rbac");

const router = express.Router();

router.get(
  "/",
  requireAdmin,
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("offset").optional().isInt({ min: 0 }),
  validateRequest,
  auditLogController.list
);

module.exports = router;
