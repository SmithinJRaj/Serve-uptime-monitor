import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // Default config for migrations (Prisma Migrate)
  migrate: {
    adapter: "postgresql",
    url: process.env.DATABASE_URL!,
  },

  // Default datasource config for PrismaClient
  datasource: {
    adapter: "postgresql",
    url: process.env.DATABASE_URL!,
  },
});
