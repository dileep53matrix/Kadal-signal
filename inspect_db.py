
import sqlite3
import os
import json

files = [
    "data/kadal.db",
    "data/kadal_before_conflict_test.db"
]

for filename in files:
    print("\n" + "=" * 45)
    print("DATABASE:", filename)
    print("SIZE:", os.path.getsize(filename), "bytes")

    connection = sqlite3.connect(
        "file:" + os.path.abspath(filename) + "?mode=ro",
        uri=True
    )

    tables = connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()

    print("TABLES:", [table[0] for table in tables])

    for (table,) in tables:
        count = connection.execute(
            'SELECT COUNT(*) FROM "' + table + '"'
        ).fetchone()[0]

        print(table, "ROWS:", count)

    connection.close()

print("\n" + "=" * 45)

atlas_file = "data/atlas_karnataka.geojson"

print("ATLAS SIZE:", os.path.getsize(atlas_file), "bytes")

with open(atlas_file, encoding="utf-8") as file:
    atlas = json.load(file)

print("ATLAS FEATURES:", len(atlas.get("features", [])))
