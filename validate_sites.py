
import json
import urllib.request
from collections import Counter
from datetime import datetime, timezone

URL = "http://127.0.0.1:8000/api/sites"

print("KADAL SIGNAL - KARNATAKA DATA VALIDATION")
print("=" * 48)

try:
    with urllib.request.urlopen(URL, timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))
except Exception as error:
    print("Could not read the API:", error)
    raise SystemExit(1)

if isinstance(data, dict):
    sites = data.get("sites", [])
else:
    sites = data

if not isinstance(sites, list):
    print("Unexpected API response format.")
    raise SystemExit(1)

ids = [s.get("id") for s in sites]
colors = Counter()
sources = Counter()
confidence = Counter()

missing_kn = []
bad_coordinates = []
missing_signals = []
simulated = []
expired = []
duplicate_ids = sorted({
    site_id for site_id in ids
    if site_id and ids.count(site_id) > 1
})

now = datetime.now(timezone.utc)

for site in sites:
    site_id = site.get("id", "UNKNOWN")

    if not site.get("name_kn"):
        missing_kn.append(site_id)

    lat = site.get("lat")
    lon = site.get("lon")

    try:
        if not (-90 <= float(lat) <= 90 and
                -180 <= float(lon) <= 180):
            bad_coordinates.append(site_id)
    except (TypeError, ValueError):
        bad_coordinates.append(site_id)

    confidence[site.get("confidence_label", "missing")] += 1

    signal = site.get("signal") or {}

    if not signal:
        missing_signals.append(site_id)
        continue

    colors[signal.get("color", "missing")] += 1
    sources[signal.get("forecast_source", "missing")] += 1

    if signal.get("simulated"):
        simulated.append(site_id)

    expiry = signal.get("valid_until")
    if expiry:
        try:
            expiry_time = datetime.fromisoformat(
                expiry.replace("Z", "+00:00")
            )
            if expiry_time < now:
                expired.append(site_id)
        except ValueError:
            print("Invalid expiry timestamp:", site_id, expiry)

print("\nTOTAL SITES:", len(sites))
print("UNIQUE SITE IDs:", len(set(ids)))
print("DUPLICATE IDs:", duplicate_ids or "None")

print("\nKANNADA NAMES")
print("Available:", len(sites) - len(missing_kn))
print("Missing:", len(missing_kn))
print("Missing site IDs:", missing_kn)

print("\nCOORDINATES")
print("Invalid or missing:", len(bad_coordinates))
print("Affected IDs:", bad_coordinates)

print("\nATLAS CONFIDENCE")
for label, count in sorted(confidence.items()):
    print(label, ":", count)

print("\nSIGNAL COLOURS")
for color, count in sorted(colors.items()):
    print(color, ":", count)

print("\nFORECAST SOURCES")
for source, count in sorted(sources.items()):
    print(source, ":", count)

print("\nSIGNAL CHECKS")
print("Missing signals:", len(missing_signals), missing_signals)
print("Simulated signals:", len(simulated), simulated)
print("Expired signals:", len(expired), expired)

print("\n" + "=" * 48)
print("VALIDATION COMPLETE - NO DATA WAS MODIFIED")
