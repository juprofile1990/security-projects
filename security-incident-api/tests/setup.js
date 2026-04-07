require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set; integration tests will fail.");
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "jest-jwt-secret-minimum-32-chars-long!!";
}

const prisma = require("../src/lib/prisma");

afterAll(async () => {
  await prisma.$disconnect();
});
