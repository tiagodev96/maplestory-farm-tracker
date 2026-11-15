import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Overridable so automated checks can run against a throwaway database.
const LOCAL_DATA_DIR = process.env.PGLITE_DATA_DIR ?? ".pglite";
const MIGRATIONS_DIR = "drizzle";

async function createNeonDatabase(connectionString: string): Promise<Database> {
  const { Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  return drizzle(new Pool({ connectionString }), { schema });
}

async function createLocalDatabase(): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const localDb = drizzle(new PGlite(LOCAL_DATA_DIR), { schema });
  await migrate(localDb, { migrationsFolder: MIGRATIONS_DIR });
  return localDb;
}

// PGlite allows a single open instance per data directory, and dev hot reload
// re-evaluates modules, so the instance has to live on globalThis.
const globalForDb = globalThis as typeof globalThis & {
  farmTrackerDb?: Promise<Database>;
};

export function getDb(): Promise<Database> {
  const connectionString = process.env.DATABASE_URL;
  globalForDb.farmTrackerDb ??= connectionString
    ? createNeonDatabase(connectionString)
    : createLocalDatabase();
  return globalForDb.farmTrackerDb;
}
