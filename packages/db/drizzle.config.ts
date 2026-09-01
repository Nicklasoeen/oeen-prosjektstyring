import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(packageRoot, ".env") });
config({ path: resolve(packageRoot, ".env.local"), override: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  dbCredentials: {
    // Supabase: Project Settings → Database → Connect (direct URI, port 5432).
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
  },
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
