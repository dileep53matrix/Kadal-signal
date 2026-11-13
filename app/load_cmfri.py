"""Step 2: read the CMFRI landing-centre file (plain GeoJSON or qgis2web .js).

Real property names (checked on LandingCentres_4.js): Code, Landing Centre, District,
Taluk, Latitude, Longitude, Gears Operated, Operation Period,
Distance Covered for Fishing, Depth Covered for Fishing, Major Group of Fishes Caught.
There is NO state field: the first letters of Code are the state (KR = Karnataka,
KL = Kerala, GO = Goa, ...), so we filter on that."""
import json, re

STATE_PREFIX = {"KR": "Karnataka", "KL": "Kerala", "GO": "Goa", "MH": "Maharashtra", "GJ": "Gujarat"}

# CMFRI writes the old district names for some Karnataka rows
DISTRICT_FIX = {"north kanara": "Uttara Kannada", "south kanara": "Dakshina Kannada",
                "uttara kannada": "Uttara Kannada", "dakshina kannada": "Dakshina Kannada",
                "udupi": "Udupi"}

def _read(path):
    """Accepts plain GeoJSON or a qgis2web .js file ('var json_X = {...};')."""
    t = open(path, encoding="utf-8-sig").read()
    t = t[t.index("{"): t.rindex("}") + 1]
    return json.loads(t)

def _find(props, *needles):
    for k in props:
        kl = k.lower().replace(" ", "").replace("_", "")
        if any(n in kl for n in needles):
            return props[k]
    return None

def _num(v):
    """'Upto 25 km' -> 25.0 ; 'upto 18km' -> 18.0 ; None / text with no number -> None"""
    if v is None:
        return None
    nums = re.findall(r"\d+(?:\.\d+)?", str(v))
    return max(float(n) for n in nums) if nums else None

def inspect(path, n=3):
    gj = _read(path)
    feats = gj["features"]
    prefixes = {}
    for f in feats:
        c = str(_find(f["properties"], "code") or "")
        p = re.match(r"[A-Za-z]+", c)
        if p:
            prefixes[p.group(0)] = prefixes.get(p.group(0), 0) + 1
    print(f"{len(feats)} features. Property names: {sorted({k for f in feats for k in f['properties']})}")
    print(f"Sites per code prefix: {prefixes}")
    for f in feats[:n]:
        print(f["geometry"], f["properties"])

def load_state(path, state_code="KR"):
    gj = _read(path)
    out, skipped = [], 0
    for f in gj["features"]:
        p = f.get("properties", {})
        geom = f.get("geometry") or {}
        if geom.get("type") != "Point":
            skipped += 1
            continue
        lon, lat = geom["coordinates"][:2]
        code = str(_find(p, "code") or "").strip()
        if code:
            if not code.upper().startswith(state_code.upper()):
                continue
        elif not (12.7 <= lat <= 14.95 and 74.0 <= lon <= 75.0):   # no code column: coastal box
            continue
        name = str(_find(p, "lcname", "landingcent", "centre", "center", "name", "site", "place") or "").strip()
        if not name:
            skipped += 1
            continue
        district = _find(p, "district")
        if district:
            district = DISTRICT_FIX.get(str(district).strip().lower(), str(district).strip())
        out.append({
            "cmfri_code": code or None, "name": name, "name_kn": None,
            "district": district, "taluk": (_find(p, "taluk") or None),
            "lat": lat, "lon": lon,
            "gears": _find(p, "gears"), "operation_period": _find(p, "operationperiod"),
            "src_cmfri": 1, "src_osm": 0, "osm_distance_m": None,
            "fishing_range_km": _num(_find(p, "distance", "range")),
            "fishing_depth_m": _num(_find(p, "depth")),
            "last_verified": None, "colocated_with": None,
        })
    return out, skipped

load_karnataka = load_state   # name used in Step 2 first version
