"""Step 2: name normalisation, distance matching, duplicate detection, confidence score."""
import math, re, difflib, datetime as dt

STOP = {"fish", "fishing", "landing", "centre", "center", "harbour", "harbor",
        "port", "flc", "jetty", "old", "new", "village", "bunder"}

def norm(name: str) -> str:
    s = re.sub(r"\(.*?\)", " ", (name or "").lower())
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    words = [w for w in s.split() if w not in STOP]
    return " ".join(words) or s.strip()

def sim(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()

def haversine_m(lat1, lon1, lat2, lon2) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

def find_duplicates(sites, max_m=300, min_sim=0.85):
    """Return (kept_sites, dropped_pairs). A later site within 300 m with a
    near-identical name is treated as a duplicate of the earlier one."""
    kept, dropped = [], []
    for s in sites:
        dup = next((k for k in kept
                    if haversine_m(s["lat"], s["lon"], k["lat"], k["lon"]) <= max_m
                    and sim(s["name"], k["name"]) >= min_sim), None)
        if dup:
            dropped.append((s["name"], dup["name"]))
        else:
            kept.append(s)
    return kept, dropped

def match_osm(sites, osm_objects, tight_m=500, near_m=3000, near_sim=0.75):
    """One-to-one greedy matching. An OSM object counts as agreeing with a CMFRI site only if
      - it is within 500 m (same spot), or
      - it is within 3 km AND the names are similar (>= 0.75).
    Distance alone is NOT enough: a big cargo port 2 km from a fishing beach is not the beach.
    Returns the list of accepted matches (for --show-matches)."""
    pairs = []
    for i, s in enumerate(sites):
        for j, o in enumerate(osm_objects):
            d = haversine_m(s["lat"], s["lon"], o["lat"], o["lon"])
            sm = sim(s["name"], o["name"]) if o.get("name") else 0.0
            if d <= tight_m or (d <= near_m and sm >= near_sim):
                pairs.append((-sm, d, i, j))
    pairs.sort()
    used_s, used_o, matches = set(), set(), []
    for nsm, d, i, j in pairs:
        if i in used_s or j in used_o:
            continue
        used_s.add(i); used_o.add(j)
        sites[i]["src_osm"] = 1
        sites[i]["osm_distance_m"] = round(d)
        matches.append({"site": sites[i]["name"], "code": sites[i].get("cmfri_code"),
                        "osm_name": osm_objects[j].get("name") or "(no name)",
                        "distance_m": round(d), "name_sim": round(-nsm, 2)})
    return matches

def confidence(site, now=None):
    """0..100. CMFRI listing 30, OSM agreement 30, position distance 20,
    freshness of last verification 20. 'verified' is NOT earned here: only
    two matching contributions set it (Step 3)."""
    now = now or dt.datetime.now(dt.timezone.utc)
    score = 30 if site.get("src_cmfri") else 0
    if site.get("src_osm"):
        score += 30
    d = site.get("osm_distance_m")
    if d is not None:
        score += 20 * max(0.0, 1 - d / 3000)
    lv = site.get("last_verified")
    if lv:
        age = (now - dt.datetime.fromisoformat(lv)).days
        score += 20 if age <= 90 else 20 * max(0.0, 1 - (age - 90) / 275)
    if d is not None and d > 3000:      # far OSM match: probably a different place (e.g. cargo port)
        score = min(score, 45)
    label = "medium" if score >= 50 else "low"
    return round(score, 1), label

def mark_colocated(sites, places=5):
    """Different sites with identical coordinates (e.g. KR012 Keni / KR013 Gabitwada).
    Not duplicates (names differ): flagged so the atlas shows them honestly."""
    groups = {}
    for s in sites:
        groups.setdefault((round(s["lat"], places), round(s["lon"], places)), []).append(s)
    n = 0
    for g in groups.values():
        if len(g) > 1:
            for s in g:
                s["colocated_with"] = ", ".join(o["name"] for o in g if o is not s)
            n += len(g)
    return n
