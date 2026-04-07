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

const incidentInclude = {
  reporter: userEmbed,
  assignee: userEmbed,
};

async function list(req, res, next) {
  try {
    const take = Math.min(Number(req.query.limit) || 100, 200);
    const skip = Number(req.query.offset) || 0;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        orderBy: { created_at: "desc" },
        take,
        skip,
        include: incidentInclude,
      }),
      prisma.incident.count(),
    ]);

    return res.json({ incidents, total, take, skip });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        ...incidentInclude,
        alerts: { orderBy: { created_at: "desc" } },
        incident_assets: { include: { asset: true } },
      },
    });
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }
    return res.json({ incident });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, description, severity, status, assigned_to } = req.body;

    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        severity,
        status: status ?? "open",
        reported_by: req.user.id,
        assigned_to: assigned_to ?? null,
      },
      include: incidentInclude,
    });

    return res.status(201).json({ incident });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, severity, status, assigned_to, resolved_at } =
      req.body;

    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (severity !== undefined) data.severity = severity;
    if (status !== undefined) data.status = status;
    if (assigned_to !== undefined) data.assigned_to = assigned_to;
    if (resolved_at !== undefined) {
      data.resolved_at = resolved_at ? new Date(resolved_at) : null;
    }

    const incident = await prisma.incident.update({
      where: { id },
      data,
      include: incidentInclude,
    });

    return res.json({ incident });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getOne, create, update };
