// Flip dry-run or otherwise stale transcriptions back to status='pending' so
// the worker picks them up again with whatever backend is currently configured
// (Groq, faster-whisper, …).
//
// Usage:
//   node scripts/retry-transcription.mjs          # only [dry-run] notes
//   node scripts/retry-transcription.mjs --all    # every transcribed note
//   node scripts/retry-transcription.mjs <id>...  # specific ids
import Database from "better-sqlite3";

const DB_PATH = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/voicenotes.db";
const db = new Database(DB_PATH);

const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith("--"));
const flagAll = args.includes("--all");

let result;
if (ids.length > 0) {
  const placeholders = ids.map(() => "?").join(",");
  result = db
    .prepare(`UPDATE voicenote SET status = 'pending' WHERE id IN (${placeholders})`)
    .run(...ids);
} else if (flagAll) {
  result = db
    .prepare("UPDATE voicenote SET status = 'pending' WHERE status != 'pending'")
    .run();
} else {
  result = db
    .prepare(
      "UPDATE voicenote SET status = 'pending' WHERE raw_text LIKE '[dry-run]%'",
    )
    .run();
}

console.log(`Reset ${result.changes} note(s) to status='pending'.`);
console.log("The running worker will pick them up on the next poll.");
db.close();
