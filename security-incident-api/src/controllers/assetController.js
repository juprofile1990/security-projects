const prisma = require("../lib/prisma");

async function list(req, res, next) {
  try {
    const take = Math.min(Number(req.query.limit) || 200, 500);
    const skip = Number(req.query.offset) || 0;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        orderBy: { hostname: "asc" },
        take,
        skip,
      }),
      prisma.asset.count(),
    ]);

    return res.json({ assets, total, take, skip });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { hostname, ip_address, type, owner, criticality } = req.body;

    const asset = await prisma.asset.create({
      data: {
        hostname,
        ip_address,
        type,
        owner,
        criticality,
      },
    });

    return res.status(201).json({ asset });
  } catch (err) {
    return next(err);
  }
}

async function linkToIncident(req, res, next) {
  try {
    const { id: incidentId } = req.params;
    const { asset_id } = req.body;

    const [incident, asset] = await Promise.all([
      prisma.incident.findUnique({ where: { id: incidentId } }),
      prisma.asset.findUnique({ where: { id: asset_id } }),
    ]);

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    await prisma.incidentAsset.create({
      data: {
        incident_id: incidentId,
        asset_id,
      },
    });

    return res.status(201).json({
      link: { incident_id: incidentId, asset_id },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Asset already linked to incident" });
    }
    return next(err);
  }
}

module.exports = { list, create, linkToIncident };
