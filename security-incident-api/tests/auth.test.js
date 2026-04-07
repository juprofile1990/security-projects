const request = require("supertest");
const { app } = require("../src/index");

describe("Auth", () => {
  const email = `test-${Date.now()}@example.com`;
  const password = "Password123!";
  const name = "Test User";

  it("rejects registration with weak password", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "weak@example.com",
      password: "short",
      name: "W",
    });
    expect(res.status).toBe(400);
  });

  it("registers a new analyst user", async () => {
    const res = await request(app).post("/auth/register").send({
      email,
      password,
      name,
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email,
      name,
      role: "analyst",
    });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.id).toBeDefined();
  });

  it("logs in and returns a JWT", async () => {
    const res = await request(app).post("/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app).post("/auth/login").send({
      email,
      password: "WrongPassword123!",
    });
    expect(res.status).toBe(401);
  });
});
