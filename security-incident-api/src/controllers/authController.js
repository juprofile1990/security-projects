const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES = "1h";

// Dummy hash used to prevent user enumeration via timing attacks.
// When a login email doesn't exist we still run bcrypt.compare so the
// response time is indistinguishable from a real failed attempt.
const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

const userResponseSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  created_at: true,
};

async function register(req, res, next) {
  try {
    // Registration is restricted to admins only.
    // New users can only be created by an existing admin via this endpoint.
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required to register new users" });
    }

    const { email, password, name, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name,
        role: role ?? "analyst",
      },
      select: userResponseSelect,
    });

    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always run bcrypt.compare even if the user doesn't exist.
    // This prevents user enumeration via response-time differences.
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const match = await bcrypt.compare(password, hashToCompare);

    if (!user || !match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      secret,
      { expiresIn: JWT_EXPIRES }
    );

    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: userResponseSelect,
    });

    return res.json({ token, user: safeUser });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, BCRYPT_ROUNDS, JWT_EXPIRES };
