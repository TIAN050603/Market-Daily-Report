import { mkdirSync } from "node:fs";
import path from "node:path";
import { schema } from "./schema";

type DatabaseSyncConstructor = new (path: string) => {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  };
};

let dbInstance: InstanceType<DatabaseSyncConstructor> | null = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data", "market-intel.db");
  mkdirSync(path.dirname(dbPath), { recursive: true });

  // Node 24 ships a built-in SQLite driver. It is still marked experimental in Node,
  // but it keeps this MVP free from native npm SQLite bindings.
  const runtimeRequire = eval("require") as (specifier: string) => unknown;
  const sqlite = runtimeRequire("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor };
  dbInstance = new sqlite.DatabaseSync(dbPath);
  dbInstance.exec("PRAGMA foreign_keys = ON;");
  return dbInstance;
}

export function migrate() {
  getDatabase().exec(schema);
}

export function json<T>(value: T): string {
  return JSON.stringify(value ?? []);
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
