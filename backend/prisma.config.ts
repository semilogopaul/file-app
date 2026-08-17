// Config for the Prisma CLI (migrate/generate/studio) only - the running
// Nest application reads DATABASE_URL through @nestjs/config instead.
//
// dotenv is loaded here because the CLI runs outside Nest and would
// otherwise not see backend/.env during local development. In Docker the
// variable is already present in the environment, so the .env file is
// simply absent and this is a no-op.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
