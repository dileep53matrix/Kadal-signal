"""Step 3: contributions and the 'two matching reports = verified' rule.

A report = who (made-up id, no personal data) + the four facility checks
(ice, fuel, shelter, auction: true/false) + optional GPS position.

Rules
 - One report per reporter per site.
 - A report with GPS more than 1 km from the site is stored but NOT counted.
   (No GPS: counted, so a desk demo works.)
 - Two counted reports from different reporters with IDENTICAL facility answers
   => the site becomes 'verified' (score 100, facilities saved, last_verified = now).
 - Counted reports that disagree => 'conflict' (waits for a third opinion).
"""
import json, re, datetime as dt
from db import connect
from merge import haversine_m
import lights

FACILITY_KEYS = ("ice", "fuel", "shelter", "auction")
MAX_DISTANCE_M = 1000
REPORTER_RE = re.compile(r"^[A-Za-z0-9 _.\-]{1,40}$")


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def _now(now=None):
    return (now or dt.datetime.now(dt.timezone.utc)).isoformat()


def clean_facilities(f):
    if not isinstance(f, dict) or set(f) != set(FACILITY_KEYS) or not all(isinstance(v, bool) for v in f.values()):
        raise ApiError(400, f"facilities must contain exactly {list(FACILITY_KEYS)}, each true or false")
    return {k: f[k] for k in FACILITY_KEYS}


def _canon(f):
    return json.dumps({k: f[k] for k in FACILITY_KEYS}, sort_keys=True)


def report_status(con, site_id):
    rows = con.execute("SELECT facilities FROM contributions WHERE site_id=? AND counted=1", (site_id,)).fetchall()
    total = con.execute("SELECT COUNT(*) c FROM contributions WHERE site_id=?", (site_id,)).fetchone()["c"]
    sets = {}
    for r in rows:
        sets[r["facilities"]] = sets.get(r["facilities"], 0) + 1
    if any(n >= 2 for n in sets.values()):
        status = "verified"
    elif len(sets) >= 2:
        status = "conflict"
    elif len(sets) == 1:
        status = "pending"
    else:
        status = "none"
    return {"status": status, "counted": len(rows), "total": total}


def evaluate(con, site_id, now=None):
    """Re-check one site and update it if two counted reports match. Safe to call any time."""
    rows = con.execute("SELECT id, facilities FROM contributions WHERE site_id=? AND counted=1 ORDER BY id",
                       (site_id,)).fetchall()
    seen, winner = {}, None
    for r in rows:                      # the facility set that reached 2 reports most recently wins
        seen[r["facilities"]] = seen.get(r["facilities"], 0) + 1
        if seen[r["facilities"]] == 2:
            winner = r["facilities"]
    if winner:
        con.execute("UPDATE sites SET facilities=?, confidence_label='verified', confidence_score=100, "
                    "last_verified=? WHERE id=?", (winner, _now(now), site_id))
        con.commit()
    return report_status(con, site_id)["status"]


def site_view(con, row, now=None):
    d = dict(row)
    fac = json.loads(d["facilities"]) if d.get("facilities") and d["facilities"] != "{}" else None
    return {
        "id": d["id"], "cmfri_code": d.get("cmfri_code"), "name": d["name"], "name_kn": d.get("name_kn"),
        "district": d.get("district"), "taluk": d.get("taluk"), "lat": d["lat"], "lon": d["lon"],
        "fishing_range_km": d.get("fishing_range_km"), "fishing_depth_m": d.get("fishing_depth_m"),
        "operation_period": d.get("operation_period"), "colocated_with": d.get("colocated_with"),
        "confidence_score": d["confidence_score"], "confidence_label": d["confidence_label"],
        "facilities": fac, "last_verified": d.get("last_verified"),
        "sources": {"cmfri": bool(d["src_cmfri"]), "osm": bool(d["src_osm"]), "osm_distance_m": d.get("osm_distance_m")},
        "reports": report_status(con, d["id"]),
        "signal": lights.latest_signal(con, d["id"], now),
    }


def list_sites(con, now=None):
    return [site_view(con, r, now) for r in con.execute("SELECT * FROM sites ORDER BY district, name")]


def get_site(con, site_id, now=None):
    r = con.execute("SELECT * FROM sites WHERE id=?", (site_id,)).fetchone()
    if not r:
        raise ApiError(404, f"no site {site_id}")
    return site_view(con, r, now)


def queue(con, now=None):
    """Validation queue: sites with reports that are not verified yet."""
    out = []
    for s in list_sites(con, now):
        if s["reports"]["counted"] >= 1 and s["confidence_label"] != "verified":
            out.append(s)
    return out


def add_contribution(con, site_id, reporter_id, facilities, lat=None, lon=None, photo=None, now=None):
    site = con.execute("SELECT * FROM sites WHERE id=?", (site_id,)).fetchone()
    if not site:
        raise ApiError(404, f"no site {site_id}")
    if not isinstance(reporter_id, str) or not REPORTER_RE.match(reporter_id.strip()):
        raise ApiError(400, "reporter_id: 1-40 letters/digits (use a made-up id, never a real name or phone number)")
    reporter_id = reporter_id.strip()
    fac = clean_facilities(facilities)
    if con.execute("SELECT 1 FROM contributions WHERE site_id=? AND reporter_id=?", (site_id, reporter_id)).fetchone():
        raise ApiError(409, "this reporter already sent a report for this site")
    dist, counted = None, 1
    if lat is not None or lon is not None:
        try:
            lat, lon = float(lat), float(lon)
        except (TypeError, ValueError):
            raise ApiError(400, "lat and lon must both be numbers")
        dist = round(haversine_m(lat, lon, site["lat"], site["lon"]))
        counted = 1 if dist <= MAX_DISTANCE_M else 0
    con.execute("INSERT INTO contributions (site_id, reporter_id, lat, lon, facilities, distance_m, counted, photo_path, created_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                (site_id, reporter_id, lat, lon, _canon(fac), dist, counted, photo, _now(now)))
    con.commit()
    status = evaluate(con, site_id, now)
    msg = {"verified": "Site verified by two matching reports.",
           "pending": "Report saved. One more matching report will verify this site.",
           "conflict": "Reports disagree. A third report is needed.",
           "none": "Report saved but NOT counted: too far from the site."}[status]
    if not counted:
        msg = f"Report saved but NOT counted: {dist} m from the site (limit {MAX_DISTANCE_M} m)."
    return {"status": status, "counted": bool(counted), "distance_m": dist, "message": msg,
            "site": get_site(con, site_id)}
