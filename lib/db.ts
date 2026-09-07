import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const globalForDb = globalThis as unknown as { db?: Database.Database };

export const db = globalForDb.db ?? new Database(path.join(dataDir, "app.db"));

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS log_entries (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id TEXT NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL,
    serving_size TEXT NOT NULL,
    logged_at TEXT NOT NULL,
    meal TEXT NOT NULL DEFAULT 'snack'
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

/*
 * There is no migration runner, so a column added to the CREATE TABLE above
 * only reaches databases that do not exist yet. Existing ones need this.
 * Rows logged before meals existed become snacks, which is the honest answer:
 * we genuinely do not know which meal they were.
 */
const columns = db
  .prepare(`PRAGMA table_info(log_entries)`)
  .all() as { name: string }[];

if (!columns.some((column) => column.name === "meal")) {
  db.exec(
    `ALTER TABLE log_entries ADD COLUMN meal TEXT NOT NULL DEFAULT 'snack'`
  );
}
