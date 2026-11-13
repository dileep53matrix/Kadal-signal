
import json
from pathlib import Path

path = Path("../data/atlas_karnataka.geojson")
data = json.loads(path.read_text(encoding="utf-8"))

expected = {
    "KR013": (14.866676079304654, 74.10819139055002),
    "KR014": (14.653785686323037, 74.28187645767235),
    "KR015": (14.651610204855059, 74.28176706599757),
    "KR044": (13.968145437591389, 74.53216054232765),
    "KR045": (13.967338733685231, 74.53415191536321),
}

features = data.get("features", [])
print("GeoJSON features:", len(features))

found = {}

for feature in features:
    props = feature.get("properties", {})
    code = props.get("Code") or props.get("cmfri_code") or props.get("code")

    if code in expected:
        lon, lat = feature["geometry"]["coordinates"][:2]
        found[code] = (lat, lon)

for code, (expected_lat, expected_lon) in expected.items():
    actual = found.get(code)

    if actual and abs(actual[0] - expected_lat) < 1e-9 and abs(actual[1] - expected_lon) < 1e-9:
        print("PASS", code, actual)
    else:
        print("FAIL", code, "Found:", actual)

print("All five found:", len(found) == 5)
