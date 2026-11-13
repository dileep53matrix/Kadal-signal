
import sqlite3
from pathlib import Path

backup = Path("../data/kadal_before_pair_corrections.db")

if not backup.exists():
    raise SystemExit("ERROR: Backup file missing.")

with sqlite3.connect(backup) as db:
    print("Integrity:", db.execute("PRAGMA integrity_check").fetchone()[0])

    for table in ("sites", "contributions", "signals"):
        count = db.execute(
            f"SELECT COUNT(*) FROM {table}"
        ).fetchone()[0]
        print(f"{table}: {count}")
