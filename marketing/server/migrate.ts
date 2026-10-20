import "dotenv/config";
import knex from "knex";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function migrate(db: ReturnType<typeof knex>) {
  await db.transaction(async tx => {
    await tx.raw("select pg_advisory_xact_lock(613047201)");
    await tx.raw("create table if not exists smartwerk_marketing_migration (id text primary key, applied_at timestamptz not null default now())");
    for (const id of ["001-marketing", "002-accounts", "003-sessions"]) {
      const applied = await tx("smartwerk_marketing_migration").where({ id }).first();
      if (applied) continue;
      await tx.raw(await readFile(join(__dirname, "../migrations", `${id}.sql`), "utf8"));
      await tx("smartwerk_marketing_migration").insert({ id });
    }
  });
}
if (process.argv[1]?.endsWith("migrate.ts")) {
  if (!process.env.MARKETING_DATABASE_URL) throw new Error("MARKETING_DATABASE_URL fehlt.");
  const db = knex({ client: "pg", connection: process.env.MARKETING_DATABASE_URL });
  migrate(db).then(() => process.stdout.write("Marketing-Migrationen angewendet.\n")).catch(() => {
    process.stderr.write("Migration fehlgeschlagen. PostgreSQL-Konfiguration prüfen.\n");
    process.exitCode = 1;
  }).finally(() => db.destroy());
}
