"""Step 2: read a saved Overpass result. Accepts BOTH formats:
 - raw OSM JSON   ({"elements": [...]})     from Overpass Turbo: Export > raw OSM data
 - GeoJSON        ({"features": [...]})     from Overpass Turbo: Export > GeoJSON
Lines/polygons are reduced to their centre point."""
import json

def _centre(geom):
    pts = []
    def walk(c):
        if c and isinstance(c[0], (int, float)):
            pts.append(c)
        else:
            for x in c:
                walk(x)
    walk(geom.get("coordinates", []))
    if not pts:
        return None
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)   # lat, lon

def load(path):
    data = json.load(open(path, encoding="utf-8-sig"))
    out = []
    for e in data.get("elements", []):
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lon = e.get("lon") or (e.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        tags = e.get("tags", {})
        out.append({"name": tags.get("name") or tags.get("name:en") or "", "lat": lat, "lon": lon})
    for f in data.get("features", []):
        c = _centre(f.get("geometry") or {})
        if not c:
            continue
        p = f.get("properties") or {}
        tags = p.get("tags", p)
        out.append({"name": tags.get("name") or tags.get("name:en") or "", "lat": c[0], "lon": c[1]})
    return out
