PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS learner_progress (
  profile_hash TEXT PRIMARY KEY,
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
PRAGMA user_version = 1;
