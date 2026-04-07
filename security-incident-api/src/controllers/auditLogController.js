const prisma = require("../lib/prisma");

const userEmbed = {
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    created_at: true,
  },
};

async function list(req, res, next) {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { created_at: "desc" },
        take,
        skip,
        include: { user: userEmbed },
      }),
      prisma.auditLog.count(),
    ]);

    return res.json({ logs, total, take, skip });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };
