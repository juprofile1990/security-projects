// MITRE ATT&CK technique database — relevant subset covering the most common
// techniques seen in enterprise security incidents.

export const TACTICS = [
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command & Control",
  "Exfiltration",
  "Impact",
];

export const TECHNIQUES = [
  // Initial Access
  { id: "T1566",     name: "Phishing",                          tactic: "Initial Access" },
  { id: "T1566.001", name: "Spearphishing Attachment",          tactic: "Initial Access" },
  { id: "T1190",     name: "Exploit Public-Facing Application", tactic: "Initial Access" },
  { id: "T1091",     name: "Replication via Removable Media",   tactic: "Initial Access" },
  { id: "T1078",     name: "Valid Accounts",                    tactic: "Initial Access" },

  // Execution
  { id: "T1059",     name: "Command & Scripting Interpreter",   tactic: "Execution" },
  { id: "T1059.001", name: "PowerShell",                        tactic: "Execution" },
  { id: "T1204",     name: "User Execution",                    tactic: "Execution" },
  { id: "T1204.002", name: "Malicious File",                    tactic: "Execution" },

  // Persistence
  { id: "T1547",     name: "Boot/Logon Autostart Execution",    tactic: "Persistence" },
  { id: "T1053",     name: "Scheduled Task/Job",                tactic: "Persistence" },
  { id: "T1505",     name: "Server Software Component",         tactic: "Persistence" },

  // Privilege Escalation
  { id: "T1548",     name: "Abuse Elevation Control",           tactic: "Privilege Escalation" },
  { id: "T1055",     name: "Process Injection",                 tactic: "Privilege Escalation" },
  { id: "T1068",     name: "Exploitation for Privilege Escalation", tactic: "Privilege Escalation" },

  // Defense Evasion
  { id: "T1070",     name: "Indicator Removal",                 tactic: "Defense Evasion" },
  { id: "T1027",     name: "Obfuscated Files or Information",   tactic: "Defense Evasion" },
  { id: "T1550",     name: "Use Alternate Auth Material",        tactic: "Defense Evasion" },
  { id: "T1562",     name: "Impair Defenses",                   tactic: "Defense Evasion" },

  // Credential Access
  { id: "T1110",     name: "Brute Force",                       tactic: "Credential Access" },
  { id: "T1003",     name: "OS Credential Dumping",             tactic: "Credential Access" },
  { id: "T1555",     name: "Credentials from Password Stores",  tactic: "Credential Access" },
  { id: "T1539",     name: "Steal Web Session Cookie",          tactic: "Credential Access" },

  // Discovery
  { id: "T1046",     name: "Network Service Discovery",         tactic: "Discovery" },
  { id: "T1082",     name: "System Information Discovery",      tactic: "Discovery" },
  { id: "T1083",     name: "File and Directory Discovery",      tactic: "Discovery" },
  { id: "T1018",     name: "Remote System Discovery",           tactic: "Discovery" },

  // Lateral Movement
  { id: "T1021",     name: "Remote Services",                   tactic: "Lateral Movement" },
  { id: "T1570",     name: "Lateral Tool Transfer",             tactic: "Lateral Movement" },
  { id: "T1534",     name: "Internal Spearphishing",            tactic: "Lateral Movement" },
  { id: "T1210",     name: "Exploitation of Remote Services",   tactic: "Lateral Movement" },

  // Collection
  { id: "T1530",     name: "Data from Cloud Storage",           tactic: "Collection" },
  { id: "T1560",     name: "Archive Collected Data",            tactic: "Collection" },
  { id: "T1074",     name: "Data Staged",                       tactic: "Collection" },

  // Command & Control
  { id: "T1071",     name: "Application Layer Protocol",        tactic: "Command & Control" },
  { id: "T1102",     name: "Web Service",                       tactic: "Command & Control" },
  { id: "T1008",     name: "Fallback Channels",                 tactic: "Command & Control" },
  { id: "T1095",     name: "Non-Application Layer Protocol",    tactic: "Command & Control" },

  // Exfiltration
  { id: "T1048",     name: "Exfiltration Over Alt Protocol",    tactic: "Exfiltration" },
  { id: "T1041",     name: "Exfiltration Over C2 Channel",      tactic: "Exfiltration" },
  { id: "T1052",     name: "Exfiltration via Physical Medium",  tactic: "Exfiltration" },

  // Impact
  { id: "T1486",     name: "Data Encrypted for Impact",         tactic: "Impact" },
  { id: "T1490",     name: "Inhibit System Recovery",           tactic: "Impact" },
  { id: "T1489",     name: "Service Stop",                      tactic: "Impact" },
  { id: "T1485",     name: "Data Destruction",                  tactic: "Impact" },
];

// Map from alert `type` values (as stored in the database) to MITRE technique IDs.
// Multiple techniques can be triggered by a single alert type.
export const ALERT_TYPE_TO_TECHNIQUES = {
  malware_detected:   ["T1204.002", "T1059", "T1486", "T1490"],
  lateral_movement:   ["T1021", "T1570", "T1550", "T1018"],
  rate_limit_breach:  ["T1110", "T1078"],
  impossible_travel:  ["T1078", "T1550", "T1539"],
  malicious_url:      ["T1566", "T1204"],
  attachment_sandbox: ["T1566.001", "T1204.002"],
  public_bucket:      ["T1530", "T1190"],
  usb_block:          ["T1091", "T1052"],
  suspicious_script:  ["T1059", "T1059.001", "T1070"],
  beaconing:          ["T1071", "T1102", "T1008"],
};

// Given a list of alert objects from an incident, return deduplicated technique objects.
export function suggestTechniques(alerts) {
  const ids = new Set();
  for (const alert of alerts) {
    if (alert.is_false_positive) continue;
    const mapped = ALERT_TYPE_TO_TECHNIQUES[alert.type] ?? [];
    mapped.forEach((id) => ids.add(id));
  }
  return TECHNIQUES.filter((t) => ids.has(t.id));
}

// Given a list of incidents (each with .alerts), return a map of techniqueId → incidentIds[]
export function buildTechniqueIncidentMap(incidents) {
  const map = {}; // techniqueId → Set of incident ids
  for (const inc of incidents) {
    const techniques = suggestTechniques(inc.alerts ?? []);
    for (const t of techniques) {
      if (!map[t.id]) map[t.id] = new Set();
      map[t.id].add(inc.id);
    }
  }
  // Convert sets to arrays
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, [...v]])
  );
}

// Given a list of incidents, return pairs that share at least minShared techniques.
export function findCorrelatedIncidents(incidents, minShared = 2) {
  const incTechMap = {}; // incidentId → Set of technique ids
  for (const inc of incidents) {
    incTechMap[inc.id] = new Set(
      suggestTechniques(inc.alerts ?? []).map((t) => t.id)
    );
  }

  const pairs = [];
  const ids = Object.keys(incTechMap);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = incTechMap[ids[i]];
      const b = incTechMap[ids[j]];
      const shared = [...a].filter((id) => b.has(id));
      if (shared.length >= minShared) {
        pairs.push({
          incidentA: incidents.find((inc) => inc.id === ids[i]),
          incidentB: incidents.find((inc) => inc.id === ids[j]),
          sharedTechniques: TECHNIQUES.filter((t) => shared.includes(t.id)),
        });
      }
    }
  }
  return pairs.sort((a, b) => b.sharedTechniques.length - a.sharedTechniques.length);
}

// Cluster incidents into campaigns using connected-component analysis.
// Two incidents belong to the same campaign if they share >= minShared techniques.
// Returns an array of campaigns, each with: id, incidents, techniques, severity, latestActivity.
export function clusterIntoCampaigns(incidents, minShared = 2) {
  const incTechMap = {};
  for (const inc of incidents) {
    incTechMap[inc.id] = new Set(
      suggestTechniques(inc.alerts ?? []).map((t) => t.id)
    );
  }

  // Build adjacency list
  const adj = {};
  const ids = incidents.map((i) => i.id);
  for (const id of ids) adj[id] = new Set();

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const shared = [...incTechMap[ids[i]]].filter((t) => incTechMap[ids[j]].has(t));
      if (shared.length >= minShared) {
        adj[ids[i]].add(ids[j]);
        adj[ids[j]].add(ids[i]);
      }
    }
  }

  // BFS to find connected components (campaigns)
  const visited = new Set();
  const campaigns = [];
  let campaignIndex = 0;

  for (const startId of ids) {
    if (visited.has(startId) || adj[startId].size === 0) continue;
    const component = [];
    const queue = [startId];
    visited.add(startId);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (const neighbour of adj[current]) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }

    const campIncidents = incidents.filter((i) => component.includes(i.id));

    // Union of all techniques across the campaign
    const allTechIds = new Set();
    for (const inc of campIncidents) {
      for (const id of incTechMap[inc.id]) allTechIds.add(id);
    }
    const techniques = TECHNIQUES.filter((t) => allTechIds.has(t.id));

    // Shared techniques (appear in ALL incidents of the campaign)
    const sharedTechIds = [...allTechIds].filter((tid) =>
      campIncidents.every((inc) => incTechMap[inc.id].has(tid))
    );
    const sharedTechniques = TECHNIQUES.filter((t) => sharedTechIds.includes(t.id));

    // Severity = highest across incidents
    const SORDER = { critical: 4, high: 3, medium: 2, low: 1 };
    const topSeverity = campIncidents.reduce(
      (top, inc) => (SORDER[inc.severity] > SORDER[top] ? inc.severity : top),
      "low"
    );

    const latestActivity = campIncidents.reduce((latest, inc) => {
      const d = new Date(inc.updated_at ?? inc.created_at ?? 0);
      return d > latest ? d : latest;
    }, new Date(0));

    campaignIndex++;
    campaigns.push({
      id: `campaign-${campaignIndex}`,
      label: `Campaign ${String.fromCharCode(64 + campaignIndex)}`,
      incidents: campIncidents,
      techniques,
      sharedTechniques,
      severity: topSeverity,
      latestActivity,
    });
  }

  return campaigns.sort((a, b) => b.latestActivity - a.latestActivity);
}

// Build a technique co-occurrence matrix.
// Returns { techniques: [...], matrix: [[count]] } where matrix[i][j] = number of
// incidents where technique i and technique j both appear.
export function buildCoOccurrenceMatrix(incidents) {
  const observed = new Set();
  const incTechs = incidents.map((inc) => {
    const ts = new Set(suggestTechniques(inc.alerts ?? []).map((t) => t.id));
    ts.forEach((id) => observed.add(id));
    return ts;
  });

  const techList = TECHNIQUES.filter((t) => observed.has(t.id));
  const n = techList.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (const techSet of incTechs) {
    const indices = techList
      .map((t, i) => (techSet.has(t.id) ? i : -1))
      .filter((i) => i >= 0);
    for (const i of indices) {
      for (const j of indices) {
        if (i !== j) matrix[i][j]++;
      }
    }
  }

  return { techniques: techList, matrix };
}

// Generate a human-readable attack signature for an incident.
export function generateSignature(incident) {
  const alerts = incident.alerts ?? [];
  const techniques = suggestTechniques(alerts);
  const byTactic = {};
  for (const t of techniques) {
    if (!byTactic[t.tactic]) byTactic[t.tactic] = [];
    byTactic[t.tactic].push(t);
  }

  const lines = [];
  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║              ATTACK SIGNATURE                           ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`Name      : ${incident.title}`);
  lines.push(`Generated : ${new Date().toISOString()}`);
  lines.push(`Severity  : ${incident.severity.toUpperCase()}`);
  lines.push(`Status    : ${incident.status}`);
  lines.push(`Reporter  : ${incident.reporter?.name ?? incident.reported_by}`);
  lines.push(`Assignee  : ${incident.assignee?.name ?? incident.assigned_to ?? "Unassigned"}`);
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("DESCRIPTION");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push(incident.description);
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("MITRE ATT&CK TECHNIQUES");
  lines.push("──────────────────────────────────────────────────────────");

  if (Object.keys(byTactic).length === 0) {
    lines.push("  No techniques mapped (no alerts or all false positives).");
  } else {
    for (const [tactic, techs] of Object.entries(byTactic)) {
      lines.push(`  [${tactic.toUpperCase()}]`);
      for (const t of techs) {
        lines.push(`    ${t.id.padEnd(10)} ${t.name}`);
      }
    }
  }

  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("INDICATORS (ALERTS)");
  lines.push("──────────────────────────────────────────────────────────");

  const realAlerts = alerts.filter((a) => !a.is_false_positive);
  if (realAlerts.length === 0) {
    lines.push("  No confirmed indicators.");
  } else {
    for (const a of realAlerts) {
      lines.push(`  Source  : ${a.source}`);
      lines.push(`  Type    : ${a.type}`);
      lines.push(`  Payload : ${JSON.stringify(a.raw_payload)}`);
      lines.push("");
    }
  }

  lines.push("──────────────────────────────────────────────────────────");
  lines.push("AFFECTED ASSETS");
  lines.push("──────────────────────────────────────────────────────────");
  const assets = incident.incident_assets ?? [];
  if (assets.length === 0) {
    lines.push("  No assets linked.");
  } else {
    for (const row of assets) {
      const a = row.asset;
      lines.push(`  ${a?.hostname ?? "?"} (${a?.ip_address ?? "?"}) — ${a?.type ?? "?"} — ${a?.criticality?.toUpperCase() ?? "?"}`);
    }
  }

  lines.push("");
  lines.push("══════════════════════════════════════════════════════════");

  return lines.join("\n");
}
