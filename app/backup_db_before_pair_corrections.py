
import sqlite3
from pathlib import Path

source = Path("../data/kadal.db")
backup = Path("../data/kadal_before_pair_corrections.db")

if not source.exists():
    raise SystemExit("STOP: Active database not found.")

if backup.exists():
    raise SystemExit("STOP: Backup already exists. Do not overwrite it.")

with sqlite3.connect(source) as original:
    with sqlite3.connect(backup) as copy:
        original.backup(copy)
        result = copy.execute("PRAGMA integrity_check").fetchone()[0]
        print("Backup integrity:", result)

        for table in ("sites", "contributions", "signals"):
            count = copy.execute(
                f"SELECT COUNT(*) FROM {table}"
            ).fetchone()[0]
            print(f"{table}: {count}")

print("SUCCESS: Database backup created.")
print("Backup file:", backup.resolve())
