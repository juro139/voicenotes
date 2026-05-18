import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/voicenotes.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
});
