/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const PASSWORD = "Password123!";
const BCRYPT_ROUNDS = 12;

async function main() {
  const password_hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  await prisma.auditLog.deleteMany();
  await prisma.incidentAsset.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  const [analyst, responder, admin] = await Promise.all([
    prisma.user.create({
      data: {
        email: "analyst@example.com",
        password_hash,
        name: "Alex Analyst",
        role: "analyst",
      },
    }),
    prisma.user.create({
      data: {
        email: "responder@example.com",
        password_hash,
        name: "Riley Responder",
        role: "responder",
      },
    }),
    prisma.user.create({
      data: {
        email: "admin@example.com",
        password_hash,
        name: "Avery Admin",
        role: "admin",
      },
    }),
  ]);

  const incidents = await prisma.$transaction([
    prisma.incident.create({
      data: {
        title: "Ransomware indicators on finance subnet",
        description:
          "Multiple endpoints showing encryption attempts and suspicious SMB traffic.",
        severity: "critical",
        status: "investigating",
        reported_by: responder.id,
        assigned_to: responder.id,
      },
    }),
    prisma.incident.create({
      data: {
        title: "Credential stuffing against customer portal",
        description: "Spike in failed logins from distributed IPs; WAF partially mitigating.",
        severity: "high",
        status: "contained",
        reported_by: analyst.id,
        assigned_to: responder.id,
      },
    }),
    prisma.incident.create({
      data: {
        title: "Phishing campaign targeting executives",
        description: "Reported malicious links in spear-phishing emails impersonating legal.",
        severity: "high",
        status: "open",
        reported_by: analyst.id,
        assigned_to: null,
      },
    }),
    prisma.incident.create({
      data: {
        title: "Misconfigured S3 bucket exposure",
        description: "Public read ACL detected on bucket containing non-PII marketing assets.",
        severity: "medium",
        status: "resolved",
        reported_by: responder.id,
        assigned_to: admin.id,
        resolved_at: new Date(),
      },
    }),
    prisma.incident.create({
      data: {
        title: "Insider policy violation — USB usage",
        description: "DLP alert: unauthorized removable storage on engineering workstation.",
        severity: "low",
        status: "closed",
        reported_by: analyst.id,
        assigned_to: responder.id,
        resolved_at: new Date(Date.now() - 86400000),
      },
    }),
  ]);

  const [i0, i1, i2, i3, i4] = incidents;

  await prisma.alert.createMany({
    data: [
      {
        source: "EDR",
        type: "malware_detected",
        raw_payload: { process: "encrypt.exe", sha256: "abc123..." },
        incident_id: i0.id,
        is_false_positive: false,
      },
      {
        source: "SIEM",
        type: "lateral_movement",
        raw_payload: { src: "10.0.5.12", dst: "10.0.5.40", technique: "T1021" },
        incident_id: i0.id,
        is_false_positive: false,
      },
      {
        source: "WAF",
        type: "rate_limit_breach",
        raw_payload: { path: "/login", rps: 420 },
        incident_id: i1.id,
        is_false_positive: false,
      },
      {
        source: "IdP",
        type: "impossible_travel",
        raw_payload: { user: "user@corp", from: "US", to: "RO", minutes: 12 },
        incident_id: i1.id,
        is_false_positive: false,
      },
      {
        source: "Email_Gateway",
        type: "malicious_url",
        raw_payload: { url: "https://evil.example/login", verdict: "phish" },
        incident_id: i2.id,
        is_false_positive: false,
      },
      {
        source: "Email_Gateway",
        type: "attachment_sandbox",
        raw_payload: { filename: "invoice.zip", verdict: "malware" },
        incident_id: i2.id,
        is_false_positive: false,
      },
      {
        source: "CSPM",
        type: "public_bucket",
        raw_payload: { bucket: "marketing-assets-old", region: "us-east-1" },
        incident_id: i3.id,
        is_false_positive: false,
      },
      {
        source: "DLP",
        type: "usb_block",
        raw_payload: { device_id: "USBVID_1234", action: "blocked" },
        incident_id: i4.id,
        is_false_positive: false,
      },
      {
        source: "EDR",
        type: "suspicious_script",
        raw_payload: { script: "wmic shadowcopy delete", confidence: 0.72 },
        incident_id: i0.id,
        is_false_positive: true,
      },
      {
        source: "NetFlow",
        type: "beaconing",
        raw_payload: { interval_sec: 300, dest: "198.51.100.10" },
        incident_id: i0.id,
        is_false_positive: false,
      },
    ],
  });

  const assets = await prisma.$transaction([
    prisma.asset.create({
      data: {
        hostname: "fin-dc-01.corp.internal",
        ip_address: "10.0.5.2",
        type: "domain_controller",
        owner: "IT Infrastructure",
        criticality: "critical",
      },
    }),
    prisma.asset.create({
      data: {
        hostname: "portal-web-03.corp.internal",
        ip_address: "10.0.10.15",
        type: "web_server",
        owner: "Customer Experience",
        criticality: "high",
      },
    }),
    prisma.asset.create({
      data: {
        hostname: "exec-mail-01.corp.internal",
        ip_address: "10.0.20.5",
        type: "mail_gateway",
        owner: "Corporate IT",
        criticality: "high",
      },
    }),
    prisma.asset.create({
      data: {
        hostname: "s3-sync-worker",
        ip_address: "10.0.30.88",
        type: "batch_worker",
        owner: "Data Platform",
        criticality: "medium",
      },
    }),
    prisma.asset.create({
      data: {
        hostname: "eng-ws-4421",
        ip_address: "10.0.40.121",
        type: "workstation",
        owner: "Engineering",
        criticality: "low",
      },
    }),
  ]);

  await prisma.incidentAsset.createMany({
    data: [
      { incident_id: i0.id, asset_id: assets[0].id },
      { incident_id: i0.id, asset_id: assets[4].id },
      { incident_id: i1.id, asset_id: assets[1].id },
      { incident_id: i2.id, asset_id: assets[2].id },
      { incident_id: i3.id, asset_id: assets[3].id },
    ],
  });

  console.log("Seed complete.");
  console.log("Users (password for all):", PASSWORD);
  console.log("  analyst@example.com (analyst)");
  console.log("  responder@example.com (responder)");
  console.log("  admin@example.com (admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
