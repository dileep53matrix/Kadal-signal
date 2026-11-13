
import sqlite3
from pathlib import Path

active = Path("../data/kadal.db")
backup = Path("../data/kadal_before_pair_corrections.db")

targets = ("KR013", "KR014", "KR015", "KR044", "KR045")

for label, path in (("BACKUP", backup), ("ACTIVE DATABASE", active)):
    print(f"\n--- {label} ---")

    with sqlite3.connect(path) as db:
        print("Integrity:", db.execute(
            "PRAGMA integrity_check"
        ).fetchone()[0])

        for table in ("sites", "contributions", "signals"):
            count = db.execute(
                f"SELECT COUNT(*) FROM {table}"
            ).fetchone()[0]
            print(f"{table}: {count}")

        columns = [
            row[1] for row in db.execute("PRAGMA table_info(sites)")
        ]
        print("Site columns:", columns)

        code_col = next(
            (c for c in columns if c.lower() in ("code", "site_code")),
            None
        )

        if code_col:
            for code in targets:
                row = db.execute(
                    f'SELECT * FROM sites WHERE "{code_col}" = ?',
                    (code,)
                ).fetchone()
                print(code, row)
        else:
            print("Could not identify the site-code column.")
