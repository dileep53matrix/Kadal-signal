
import sqlite3

db = sqlite3.connect("data/kadal.db")
db.row_factory = sqlite3.Row

print("CONTRIBUTION TABLE STRUCTURE:")
for row in db.execute("PRAGMA table_info(contributions)"):
    print(dict(row))

print("\nREPORTS FOR KR090:")
for row in db.execute(
    "SELECT * FROM contributions WHERE site_id = ?",
    ("KR090",)
):
    print(dict(row))

db.close()
