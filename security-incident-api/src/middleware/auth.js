const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  created_at: true,
};

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
}

function requireAuth(optional = false) {
  return async (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      if (optional) return next();
      return res.status(401).json({ error: "Authentication required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    try {
      const payload = jwt.verify(token, secret);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: userSelect,
      });
      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }
      req.user = user;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = { requireAuth, getBearerToken, userSelect };
