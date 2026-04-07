const prisma = require("../lib/prisma");

async function listByIncident(req, res, next) {
  try {
    const { id: incidentId } = req.params;

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const alerts = await prisma.alert.findMany({
      where: { incident_id: incidentId },
      orderBy: { created_at: "desc" },
    });

    return res.json({ alerts });
  } catch (err) {
    return next(err);
  }
}

async function createForIncident(req, res, next) {
  try {
    const { id: incidentId } = req.params;
    const { source, type, raw_payload, is_false_positive } = req.body;

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const alert = await prisma.alert.create({
      data: {
        source,
        type,
        raw_payload,
        incident_id: incidentId,
        is_false_positive: Boolean(is_false_positive),
      },
    });

    return res.status(201).json({ alert });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listByIncident, createForIncident };
