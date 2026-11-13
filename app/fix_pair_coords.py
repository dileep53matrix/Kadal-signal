
from pathlib import Path
import re

source = Path("../data/LandingCentres_4.js")
text = source.read_text(encoding="utf-8")

fixes = {
    "KR044": ("13.967932", "74.532182",
              "13.968145437591389", "74.53216054232765"),
    "KR045": ("13.967219", "74.534109",
              "13.967338733685231", "74.53415191536321"),
    "KR014": ("14.653521", "74.281855",
              "14.653785686323037", "74.28187645767235"),
    "KR015": ("14.651352", "74.28178",
              "14.651610204855059", "74.28176706599757"),
}

matches = list(re.finditer(r'"Code":\s*"(KR\d+)"', text))

if len(matches) != 93:
    raise SystemExit(f"STOP: Expected 93 records, found {len(matches)}")

updated = text
for i in range(len(matches) - 1, -1, -1):
    code = matches[i].group(1)
    if code not in fixes:
        continue

    start = matches[i].start()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(updated)
    block = updated[start:end]

    old_lat, old_lon, new_lat, new_lon = fixes[code]

    old_geometry = f'"coordinates": [{old_lon}, {old_lat}]'
    new_geometry = f'"coordinates": [{new_lon}, {new_lat}]'

    if f'"Latitude": "{old_lat}"' not in block:
        raise SystemExit(f"STOP: Latitude check failed for {code}")
    if f'"Longitude": "{old_lon}"' not in block:
        raise SystemExit(f"STOP: Longitude check failed for {code}")
    if old_geometry not in block:
        raise SystemExit(f"STOP: Geometry check failed for {code}")

    block = block.replace(
        f'"Latitude": "{old_lat}"',
        f'"Latitude": "{new_lat}"', 1
    )
    block = block.replace(
        f'"Longitude": "{old_lon}"',
        f'"Longitude": "{new_lon}"', 1
    )
    block = block.replace(old_geometry, new_geometry, 1)

    updated = updated[:start] + block + updated[end:]

source.write_text(updated, encoding="utf-8")

print("SUCCESS: Four coordinate corrections applied.")
print("KR044, KR045, KR014 and KR015 updated.")
