
from pathlib import Path
import re

root = Path(__file__).resolve().parent
html = (root / "static" / "index.html").read_text(encoding="utf-8")
server = (root / "app" / "server.py").read_text(encoding="utf-8")
db = (root / "app" / "db.py").read_text(encoding="utf-8")

lines = html.splitlines()

print("===== BACKUP STATUS =====")
for name in ["index.html", "server.py", "db.py", "kadal.db"]:
    path = root / "emergency_backup" / name
    print(name, "FOUND" if path.exists() else "NOT FOUND")

print("\n===== WEBSITE STRUCTURE =====")
for i, line in enumerate(lines, 1):
    if re.search(r"<(header|main|nav|section|footer)|<script", line, re.I):
        print(f"{i}: {line.strip()[:150]}")

print("\n===== WEBSITE FEATURES / API REFERENCES =====")
for i, line in enumerate(lines, 1):
    if re.search(r"fetch\(|/api/|function |addEventListener", line):
        print(f"{i}: {line.strip()[:180]}")

print("\n===== BACKEND ROUTES =====")
for i, line in enumerate(server.splitlines(), 1):
    if re.search(r'path ==|path in|fullmatch|def _route|def do_', line):
        print(f"{i}: {line.strip()}")

print("\n===== DATABASE TABLES =====")
for table in re.findall(r"CREATE TABLE IF NOT EXISTS\s+(\w+)", db, re.I):
    print(table)

print("\n===== INSPECTION COMPLETE =====")
