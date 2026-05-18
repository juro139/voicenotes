import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/voicenotes.db";
const filePath = url.startsWith("file:") ? url.slice("file:".length) : url;
const absPath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(process.cwd(), filePath);

fs.mkdirSync(path.dirname(absPath), { recursive: true });

const sqlite = new Database(absPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
