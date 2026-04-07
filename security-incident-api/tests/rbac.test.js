const request = require("supertest");
const { app } = require("../src/index");

const SEED_PASSWORD = "Password123!";

async function login(email) {
  const res = await request(app).post("/auth/login").send({
    email,
    password: SEED_PASSWORD,
  });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe("RBAC", () => {
  let incidentId;

  beforeAll(async () => {
    const token = await login("responder@example.com");
    const list = await request(app)
      .get("/incidents")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    incidentId = list.body.incidents[0]?.id;
    expect(incidentId).toBeDefined();
  });

  it("returns 401 without a token for protected routes", async () => {
    const res = await request(app).get("/incidents");
    expect(res.status).toBe(401);
  });

  it("denies analysts from creating incidents", async () => {
    const token = await login("analyst@example.com");
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Blocked",
        description: "Should not be created",
        severity: "low",
      });
    expect(res.status).toBe(403);
  });

  it("allows responders to create incidents", async () => {
    const token = await login("responder@example.com");
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "RBAC test incident",
        description: "Created by responder in Jest",
        severity: "medium",
      });
    expect(res.status).toBe(201);
    expect(res.body.incident.title).toBe("RBAC test incident");
  });

  it("allows analysts to read incidents", async () => {
    const token = await login("analyst@example.com");
    const res = await request(app)
      .get(`/incidents/${incidentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.incident.id).toBe(incidentId);
  });

  it("denies analysts from reading audit logs", async () => {
    const token = await login("analyst@example.com");
    const res = await request(app)
      .get("/audit-logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows admins to read audit logs", async () => {
    const token = await login("admin@example.com");
    const res = await request(app)
      .get("/audit-logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });
});
