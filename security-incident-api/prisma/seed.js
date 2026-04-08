/* eslint-disable no-console */
require("dotenv").config();
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config({ path: ".env.local", override: true });
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const PASSWORD = "Password123!";
const BCRYPT_ROUNDS = 12;

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function main() {
  const password_hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  // Clean slate
  await prisma.auditLog.deleteMany();
  await prisma.incidentAsset.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────────────────
  const [analyst, responder, admin] = await Promise.all([
    prisma.user.create({ data: { email: "analyst@example.com",   password_hash, name: "Alex Analyst",    role: "analyst"   } }),
    prisma.user.create({ data: { email: "responder@example.com", password_hash, name: "Riley Responder", role: "responder" } }),
    prisma.user.create({ data: { email: "admin@example.com",     password_hash, name: "Avery Admin",     role: "admin"     } }),
  ]);

  // ── Assets ─────────────────────────────────────────────────────────────────
  const [
    finDC, portalWeb, execMail, s3Worker, engWs,
    vpnGw, adServer, ciServer, dbPrimary, cloudProxy,
  ] = await prisma.$transaction([
    prisma.asset.create({ data: { hostname: "fin-dc-01.corp.internal",      ip_address: "10.0.5.2",    type: "domain_controller", owner: "IT Infrastructure",  criticality: "critical" } }),
    prisma.asset.create({ data: { hostname: "portal-web-03.corp.internal",  ip_address: "10.0.10.15",  type: "web_server",         owner: "Customer Experience", criticality: "high"     } }),
    prisma.asset.create({ data: { hostname: "exec-mail-01.corp.internal",   ip_address: "10.0.20.5",   type: "mail_gateway",       owner: "Corporate IT",        criticality: "high"     } }),
    prisma.asset.create({ data: { hostname: "s3-sync-worker",               ip_address: "10.0.30.88",  type: "batch_worker",       owner: "Data Platform",       criticality: "medium"   } }),
    prisma.asset.create({ data: { hostname: "eng-ws-4421",                  ip_address: "10.0.40.121", type: "workstation",        owner: "Engineering",         criticality: "low"      } }),
    prisma.asset.create({ data: { hostname: "vpn-gw-01.corp.internal",      ip_address: "10.0.1.1",    type: "network_device",     owner: "IT Infrastructure",   criticality: "critical" } }),
    prisma.asset.create({ data: { hostname: "ad-server-02.corp.internal",   ip_address: "10.0.5.10",   type: "domain_controller",  owner: "IT Infrastructure",   criticality: "critical" } }),
    prisma.asset.create({ data: { hostname: "ci-build-01.corp.internal",    ip_address: "10.0.50.20",  type: "build_server",       owner: "Engineering",         criticality: "high"     } }),
    prisma.asset.create({ data: { hostname: "db-primary-01.corp.internal",  ip_address: "10.0.60.5",   type: "database_server",    owner: "Data Platform",       criticality: "critical" } }),
    prisma.asset.create({ data: { hostname: "cloud-proxy-01.corp.internal", ip_address: "10.0.70.10",  type: "proxy_server",       owner: "IT Infrastructure",   criticality: "high"     } }),
  ]);

  // ── Incidents ──────────────────────────────────────────────────────────────
  const incidents = await prisma.$transaction([

    // 0 — Ransomware (critical, investigating) — Campaign A
    prisma.incident.create({ data: {
      title: "Ransomware indicators on finance subnet",
      description: "Multiple endpoints showing encryption attempts and suspicious SMB traffic. EDR flagged encrypt.exe and shadow copy deletion. Finance operations partially disrupted.",
      severity: "critical", status: "investigating",
      reported_by: responder.id, assigned_to: responder.id,
      created_at: daysAgo(14), updated_at: daysAgo(1),
    }}),

    // 1 — Credential stuffing (high, contained) — Campaign B
    prisma.incident.create({ data: {
      title: "Credential stuffing against customer portal",
      description: "Spike in failed logins from distributed IPs. WAF partially mitigating. 3 accounts confirmed compromised before containment.",
      severity: "high", status: "contained",
      reported_by: analyst.id, assigned_to: responder.id,
      created_at: daysAgo(12), updated_at: daysAgo(3),
    }}),

    // 2 — Phishing campaign (high, open) — Campaign C
    prisma.incident.create({ data: {
      title: "Phishing campaign targeting executives",
      description: "Spear-phishing emails impersonating legal counsel sent to 12 executives. Two clicked malicious links. No credential harvest confirmed yet.",
      severity: "high", status: "open",
      reported_by: analyst.id, assigned_to: null,
      created_at: daysAgo(10), updated_at: daysAgo(10),
    }}),

    // 3 — S3 misconfiguration (medium, resolved)
    prisma.incident.create({ data: {
      title: "Misconfigured S3 bucket exposure",
      description: "Public read ACL detected on bucket containing non-PII marketing assets. No sensitive data confirmed exposed. Bucket ACL corrected.",
      severity: "medium", status: "resolved",
      reported_by: responder.id, assigned_to: admin.id,
      created_at: daysAgo(20), updated_at: daysAgo(8),
      resolved_at: daysAgo(8),
    }}),

    // 4 — USB violation (low, closed)
    prisma.incident.create({ data: {
      title: "Insider policy violation — USB usage",
      description: "DLP alert: unauthorized removable storage on engineering workstation. Employee interview concluded accidental. No data exfiltration confirmed.",
      severity: "low", status: "closed",
      reported_by: analyst.id, assigned_to: responder.id,
      created_at: daysAgo(30), updated_at: daysAgo(25),
      resolved_at: daysAgo(25),
    }}),

    // 5 — VPN brute force (high, investigating) — Campaign B (same actor as cred stuffing)
    prisma.incident.create({ data: {
      title: "Brute force attack on VPN gateway",
      description: "2,400 failed authentication attempts against VPN gateway from 18 source IPs over 6 hours. Geo-spread suggests distributed infrastructure. 1 successful login from RO IP.",
      severity: "high", status: "investigating",
      reported_by: analyst.id, assigned_to: responder.id,
      created_at: daysAgo(11), updated_at: daysAgo(2),
    }}),

    // 6 — Lateral movement from compromised account (critical, investigating) — Campaign A
    prisma.incident.create({ data: {
      title: "Lateral movement detected from finance workstation",
      description: "Compromised service account performing SMB enumeration across finance subnet. Techniques consistent with Ransomware incident IOCs. Likely same intrusion.",
      severity: "critical", status: "investigating",
      reported_by: responder.id, assigned_to: admin.id,
      created_at: daysAgo(13), updated_at: daysAgo(1),
    }}),

    // 7 — Malicious CI/CD pipeline modification (high, open) — Campaign D (supply chain)
    prisma.incident.create({ data: {
      title: "Suspicious CI/CD pipeline script modification",
      description: "Unauthorized commit detected in build pipeline injecting a base64-encoded PowerShell downloader. Build artifacts from last 48h flagged for review.",
      severity: "high", status: "open",
      reported_by: analyst.id, assigned_to: null,
      created_at: daysAgo(3), updated_at: daysAgo(3),
    }}),

    // 8 — Beaconing from cloud proxy (critical, investigating) — Campaign A
    prisma.incident.create({ data: {
      title: "Persistent C2 beaconing from cloud proxy",
      description: "NetFlow shows regular 5-minute interval connections to known C2 infrastructure at 198.51.100.10. Beacon consistent with Cobalt Strike default profile.",
      severity: "critical", status: "investigating",
      reported_by: responder.id, assigned_to: responder.id,
      created_at: daysAgo(13), updated_at: daysAgo(1),
    }}),

    // 9 — Password spray on AD (high, contained) — Campaign B
    prisma.incident.create({ data: {
      title: "Password spray attack on Active Directory",
      description: "Low-and-slow password spray against 800+ AD accounts using common passwords. Attack spread over 4 days to avoid lockout thresholds. 4 accounts compromised.",
      severity: "high", status: "contained",
      reported_by: analyst.id, assigned_to: responder.id,
      created_at: daysAgo(9), updated_at: daysAgo(4),
    }}),

    // 10 — Data exfil attempt (critical, open) — Campaign D (supply chain)
    prisma.incident.create({ data: {
      title: "Suspected data exfiltration via HTTPS to external host",
      description: "DLP and proxy logs show 4.2GB transfer to uncategorized cloud storage endpoint over 3 hours. Source process: node.js build artifact. Possible supply chain exfil.",
      severity: "critical", status: "open",
      reported_by: analyst.id, assigned_to: admin.id,
      created_at: daysAgo(2), updated_at: daysAgo(2),
    }}),

    // 11 — Malware on exec laptop (high, resolved) — Campaign C
    prisma.incident.create({ data: {
      title: "Malware dropper on executive laptop",
      description: "Sandbox detonation of email attachment confirmed malware dropper. Payload attempted persistence via scheduled task. Isolated and reimaged.",
      severity: "high", status: "resolved",
      reported_by: responder.id, assigned_to: responder.id,
      created_at: daysAgo(9), updated_at: daysAgo(6),
      resolved_at: daysAgo(6),
    }}),

    // 12 — Impossible travel (medium, closed)
    prisma.incident.create({ data: {
      title: "Impossible travel alert — senior engineer account",
      description: "Login from London followed 12 minutes later by login from Singapore. Account temporarily suspended. Employee confirmed only London login. Singapore session terminated.",
      severity: "medium", status: "closed",
      reported_by: analyst.id, assigned_to: responder.id,
      created_at: daysAgo(7), updated_at: daysAgo(5),
      resolved_at: daysAgo(5),
    }}),

    // 13 — DB recon (medium, investigating) — Campaign A
    prisma.incident.create({ data: {
      title: "Unauthorized database enumeration detected",
      description: "Service account querying system tables and schema information across 14 databases. Account not authorized for cross-database access. Consistent with pre-exfil recon.",
      severity: "medium", status: "investigating",
      reported_by: analyst.id, assigned_to: responder.id,
      created_at: daysAgo(12), updated_at: daysAgo(2),
    }}),

    // 14 — Web shell on portal (critical, contained) — Campaign B
    prisma.incident.create({ data: {
      title: "Web shell uploaded to customer portal server",
      description: "File integrity monitoring detected new .php file in web root with obfuscated eval() content. Web shell provides remote code execution. Likely post-exploitation from compromised account.",
      severity: "critical", status: "contained",
      reported_by: responder.id, assigned_to: admin.id,
      created_at: daysAgo(10), updated_at: daysAgo(3),
    }}),
  ]);

  const [i0,i1,i2,i3,i4,i5,i6,i7,i8,i9,i10,i11,i12,i13,i14] = incidents;

  // ── Alerts ─────────────────────────────────────────────────────────────────
  await prisma.alert.createMany({ data: [

    // i0 — Ransomware
    { source: "EDR",     type: "malware_detected",   raw_payload: { process: "encrypt.exe", sha256: "a3f1b2c4d5...", path: "C:\\Temp\\encrypt.exe" }, incident_id: i0.id, is_false_positive: false },
    { source: "SIEM",    type: "lateral_movement",   raw_payload: { src: "10.0.5.12", dst: "10.0.5.40", technique: "T1021", protocol: "SMB" }, incident_id: i0.id, is_false_positive: false },
    { source: "EDR",     type: "suspicious_script",  raw_payload: { script: "wmic shadowcopy delete", confidence: 0.97, user: "SYSTEM" }, incident_id: i0.id, is_false_positive: false },
    { source: "NetFlow", type: "beaconing",           raw_payload: { interval_sec: 300, dest: "198.51.100.10", bytes_out: 1240 }, incident_id: i0.id, is_false_positive: false },
    { source: "EDR",     type: "suspicious_script",  raw_payload: { script: "vssadmin delete shadows /all /quiet", confidence: 0.40 }, incident_id: i0.id, is_false_positive: true },

    // i1 — Credential stuffing
    { source: "WAF",     type: "rate_limit_breach",  raw_payload: { path: "/login", rps: 420, source_ips: 38 }, incident_id: i1.id, is_false_positive: false },
    { source: "IdP",     type: "impossible_travel",  raw_payload: { user: "user@corp", from: "US", to: "RO", minutes: 12 }, incident_id: i1.id, is_false_positive: false },

    // i2 — Phishing
    { source: "Email_Gateway", type: "malicious_url",        raw_payload: { url: "https://evil.example/login", verdict: "phish", recipients: 12 }, incident_id: i2.id, is_false_positive: false },
    { source: "Email_Gateway", type: "attachment_sandbox",   raw_payload: { filename: "invoice.zip", verdict: "malware", family: "AgentTesla" }, incident_id: i2.id, is_false_positive: false },

    // i3 — S3 misconfiguration
    { source: "CSPM",    type: "public_bucket",       raw_payload: { bucket: "marketing-assets-old", region: "us-east-1", objects: 142 }, incident_id: i3.id, is_false_positive: false },

    // i4 — USB
    { source: "DLP",     type: "usb_block",           raw_payload: { device_id: "USBVID_1234", action: "blocked", user: "jsmith" }, incident_id: i4.id, is_false_positive: false },

    // i5 — VPN brute force (Campaign B — same pattern as cred stuffing)
    { source: "VPN",     type: "rate_limit_breach",   raw_payload: { target: "vpn-gw-01", attempts: 2400, source_ips: 18, successful: 1 }, incident_id: i5.id, is_false_positive: false },
    { source: "IdP",     type: "impossible_travel",   raw_payload: { user: "rgarcia@corp", from: "US", to: "RO", minutes: 0 }, incident_id: i5.id, is_false_positive: false },

    // i6 — Lateral movement (Campaign A)
    { source: "SIEM",    type: "lateral_movement",    raw_payload: { src: "10.0.5.15", dst: "10.0.5.0/24", technique: "T1021", scan_ports: [445, 139] }, incident_id: i6.id, is_false_positive: false },
    { source: "EDR",     type: "suspicious_script",   raw_payload: { script: "net use \\\\10.0.5.2\\C$ /user:svc_finance", confidence: 0.92 }, incident_id: i6.id, is_false_positive: false },
    { source: "NetFlow", type: "beaconing",            raw_payload: { interval_sec: 300, dest: "198.51.100.10", bytes_out: 980 }, incident_id: i6.id, is_false_positive: false },

    // i7 — CI/CD supply chain (Campaign D)
    { source: "SCM",     type: "suspicious_script",   raw_payload: { script: "powershell -enc [base64]", commit: "a9f3c21", author: "build-bot", repo: "core-api" }, incident_id: i7.id, is_false_positive: false },
    { source: "EDR",     type: "malware_detected",    raw_payload: { process: "node.exe", child: "powershell.exe", sha256: "b9d2a1f3...", context: "CI runner" }, incident_id: i7.id, is_false_positive: false },

    // i8 — C2 beaconing (Campaign A)
    { source: "NetFlow", type: "beaconing",            raw_payload: { interval_sec: 300, dest: "198.51.100.10", jitter_ms: 50, profile: "Cobalt Strike default" }, incident_id: i8.id, is_false_positive: false },
    { source: "Proxy",   type: "malicious_url",        raw_payload: { url: "https://198.51.100.10/updates", category: "C2", verdict: "malicious" }, incident_id: i8.id, is_false_positive: false },

    // i9 — Password spray (Campaign B)
    { source: "IdP",     type: "rate_limit_breach",   raw_payload: { target: "ad-server-02", attempts_per_account: 3, total_accounts: 800, duration_days: 4 }, incident_id: i9.id, is_false_positive: false },
    { source: "SIEM",    type: "impossible_travel",   raw_payload: { accounts_compromised: 4, spray_pattern: "low-and-slow" }, incident_id: i9.id, is_false_positive: false },

    // i10 — Data exfil (Campaign D)
    { source: "DLP",     type: "beaconing",            raw_payload: { dest: "uploads.unknowncloud.io", bytes: 4509715200, duration_min: 180, source_process: "node.exe" }, incident_id: i10.id, is_false_positive: false },
    { source: "Proxy",   type: "malicious_url",        raw_payload: { url: "https://uploads.unknowncloud.io", category: "uncategorized", bytes_out: "4.2GB" }, incident_id: i10.id, is_false_positive: false },

    // i11 — Malware on exec laptop (Campaign C)
    { source: "Email_Gateway", type: "attachment_sandbox", raw_payload: { filename: "Q4-Report.zip", verdict: "malware", family: "AgentTesla", dropper: true }, incident_id: i11.id, is_false_positive: false },
    { source: "EDR",     type: "malware_detected",    raw_payload: { process: "WScript.exe", child: "cmd.exe", persistence: "schtasks", sha256: "c8e4d2b1..." }, incident_id: i11.id, is_false_positive: false },
    { source: "EDR",     type: "suspicious_script",   raw_payload: { script: "schtasks /create /tn updater /tr C:\\Users\\Public\\svc.exe /sc onlogon", confidence: 0.98 }, incident_id: i11.id, is_false_positive: false },

    // i12 — Impossible travel
    { source: "IdP",     type: "impossible_travel",   raw_payload: { user: "kpatel@corp", from: "London", to: "Singapore", minutes: 12 }, incident_id: i12.id, is_false_positive: false },

    // i13 — DB recon (Campaign A)
    { source: "SIEM",    type: "lateral_movement",    raw_payload: { src: "svc_finance@10.0.5.15", target: "db-primary-01", queries: ["information_schema", "sys.tables"], count: 340 }, incident_id: i13.id, is_false_positive: false },
    { source: "NetFlow", type: "beaconing",            raw_payload: { interval_sec: 300, dest: "198.51.100.10", bytes_out: 1100 }, incident_id: i13.id, is_false_positive: false },

    // i14 — Web shell (Campaign B)
    { source: "FIM",     type: "malicious_url",        raw_payload: { file: "/var/www/html/wp-content/uploads/shell.php", content: "eval(base64_decode(...))", size_bytes: 4096 }, incident_id: i14.id, is_false_positive: false },
    { source: "WAF",     type: "rate_limit_breach",   raw_payload: { path: "/wp-content/uploads/shell.php", requests: 48, src_ip: "10.0.10.90" }, incident_id: i14.id, is_false_positive: false },
    { source: "EDR",     type: "suspicious_script",   raw_payload: { script: "whoami && id && uname -a", parent: "apache2", confidence: 0.99 }, incident_id: i14.id, is_false_positive: false },
  ]});

  // ── Asset links ────────────────────────────────────────────────────────────
  await prisma.incidentAsset.createMany({ data: [
    // Campaign A — ransomware cluster
    { incident_id: i0.id,  asset_id: finDC.id },
    { incident_id: i0.id,  asset_id: engWs.id },
    { incident_id: i6.id,  asset_id: finDC.id },
    { incident_id: i6.id,  asset_id: adServer.id },
    { incident_id: i8.id,  asset_id: cloudProxy.id },
    { incident_id: i13.id, asset_id: dbPrimary.id },
    // Campaign B — credential cluster
    { incident_id: i1.id,  asset_id: portalWeb.id },
    { incident_id: i5.id,  asset_id: vpnGw.id },
    { incident_id: i9.id,  asset_id: adServer.id },
    { incident_id: i14.id, asset_id: portalWeb.id },
    // Campaign C — phishing cluster
    { incident_id: i2.id,  asset_id: execMail.id },
    { incident_id: i11.id, asset_id: execMail.id },
    // Campaign D — supply chain cluster
    { incident_id: i7.id,  asset_id: ciServer.id },
    { incident_id: i10.id, asset_id: ciServer.id },
    // Standalone
    { incident_id: i3.id,  asset_id: s3Worker.id },
    { incident_id: i4.id,  asset_id: engWs.id },
  ]});

  console.log("✅ Seed complete.");
  console.log(`   ${incidents.length} incidents, ${10} assets, 3 users`);
  console.log("   Password for all accounts: Password123!");
  console.log("   analyst@example.com | responder@example.com | admin@example.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
