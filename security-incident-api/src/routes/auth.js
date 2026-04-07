const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { validateRequest } = require("../middleware/validateRequest");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 2000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, try again later." },
});

router.post(
  "/register",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isString()
    .isLength({ min: 8, max: 128 })
    .custom((value) => {
      if (!/[A-Z]/.test(value)) {
        throw new Error("password must contain an uppercase letter");
      }
      if (!/[a-z]/.test(value)) {
        throw new Error("password must contain a lowercase letter");
      }
      if (!/[0-9]/.test(value)) {
        throw new Error("password must contain a number");
      }
      if (!/[^A-Za-z0-9]/.test(value)) {
        throw new Error("password must contain a symbol");
      }
      return true;
    }),
  body("name").trim().isLength({ min: 1, max: 120 }),
  validateRequest,
  authController.register
);

router.post(
  "/login",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 1 }),
  validateRequest,
  authController.login
);

module.exports = router;
