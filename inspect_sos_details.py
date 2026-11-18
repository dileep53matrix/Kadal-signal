
from pathlib import Path

root = Path(__file__).resolve().parent

def read_lines(path):
    return (root / path).read_text(encoding="utf-8").splitlines()

db = read_lines("app/db.py")
server = read_lines("app/server.py")
html = read_lines("static/index.html")

out = []

def section(title, lines):
    out.append("\n\n========== " + title + " ==========\n")
    out.extend(f"{i+1}: {line}" for i, line in enumerate(lines))

section("COMPLETE DATABASE FILE", db)
section("SERVER IMPORTS AND SETUP", server[:125])
section("SERVER API ROUTES", server[136:225])
section("WEBSITE DASHBOARD HTML AND JAVASCRIPT", html[899:1125])

out.append("\n\n========== WEBSITE STYLE BOUNDARIES ==========\n")
for i, line in enumerate(html):
    if "</style>" in line or "<style" in line:
        out.append(f"{i+1}: {line.strip()}")

(root / "sos_details.txt").write_text("\n".join(out), encoding="utf-8")
print("Created sos_details.txt successfully.")
