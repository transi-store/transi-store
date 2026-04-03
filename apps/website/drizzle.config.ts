import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: [".env", "../../.env"] });

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // ignore all tables that start with "pg_" and the "query_stats" table, and only include tables in the "public" schema
  tablesFilter: ["!pg_*", "!query_stats"],
  schemaFilter: ["!ppg"],
});
