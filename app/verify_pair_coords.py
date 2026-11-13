
from pathlib import Path
import re

path = Path("../data/LandingCentres_4.js")
text = path.read_text(encoding="utf-8")

expected = {
    "KR013": ("14.866676079304654", "74.10819139055002"),
    "KR014": ("14.653785686323037", "74.28187645767235"),
    "KR015": ("14.651610204855059", "74.28176706599757"),
    "KR044": ("13.968145437591389", "74.53216054232765"),
    "KR045": ("13.967338733685231", "74.53415191536321"),
}

matches = list(re.finditer(r'"Code":\s*"(KR\d+)"', text))
print("Source records:", len(matches))

for i, match in enumerate(matches):
    code = match.group(1)
    if code not in expected:
        continue

    end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    block = text[match.start():end]

    lat, lon = expected[code]
    checks = [
        f'"Latitude": "{lat}"' in block,
        f'"Longitude": "{lon}"' in block,
        f'"coordinates": [{lon}, {lat}]' in block,
    ]

    print(("PASS" if all(checks) else "FAIL"), code)

if len(matches) != 93:
    print("WARNING: Expected 93 records")
