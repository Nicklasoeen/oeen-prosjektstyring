import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const connectionString = databaseUrl.includes("postgres:postgres@supabase_db_")
  ? rewriteLocalSupabaseHost(databaseUrl)
  : databaseUrl;

export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

function rewriteLocalSupabaseHost(url: string) {
  const parsed = new URL(url);
  parsed.hostname = parsed.hostname.split("_")[1] ?? parsed.hostname;
  return parsed.href;
}
