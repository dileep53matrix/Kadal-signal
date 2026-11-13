"""Step 4: daily green / amber / red light per landing centre. (Not called signal.py: that would hide Python's own 'signal'.)

Inputs
  * wave forecast (Open-Meteo Marine) at a point OFFSHORE of the site (CMFRI points sit on the shore, and the
    marine model returns nothing on land)
  * the INCOIS high-wave alert for Karnataka, typed in by a person (the INCOIS alert page is a JavaScript map:
    there is nothing a simple program can read), with an expiry time
Rules (numbers in data/signal_config.json)
  alert active                      -> RED
  no wave forecast                  -> GREY  (never green by default)
  max wave in next 12 h >= red      -> RED ;  >= amber -> AMBER
  waves low but alert unchecked     -> AMBER (policy) ; waves low + alert 'none' -> GREEN
"""
import json, math, pathlib, time, datetime as dt
import urllib.parse, urllib.request
from merge import haversine_m

CFG_PATH = pathlib.Path(__file__).resolve().parent.parent / "data" / "signal_config.json"
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
API = "https://marine-api.open-meteo.com/v1/marine"
DISCLAIMER_EN = "Decision aid, not an official advisory."
DISCLAIMER_KN = "ಇದು ನಿರ್ಧಾರಕ್ಕೆ ಸಹಾಯ ಮಾತ್ರ; ಅಧಿಕೃತ ಎಚ್ಚರಿಕೆ ಅಲ್ಲ."
CREDITS = ("Wave data: Open-Meteo Marine API (CC BY 4.0, non-commercial use; Open-Meteo states it is not suitable for "
           "coastal navigation). Alert: INCOIS, entered manually.")

# One sentence per light. Kannada = DRAFT, needs a native reader's review.
TEXT = {
    "red_alert": ("INCOIS high-wave alert is active for Karnataka. Going to sea is risky today.",
                  "ಕರ್ನಾಟಕಕ್ಕೆ INCOIS ಎತ್ತರದ ಅಲೆ ಎಚ್ಚರಿಕೆ ಜಾರಿಯಲ್ಲಿದೆ. ಇಂದು ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವುದು ಅಪಾಯಕಾರಿ."),
    "red_wave": ("Waves up to {h} m expected. Going to sea is risky today.",
                 "ಅಲೆಗಳು {h} ಮೀ ವರೆಗೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ಇಂದು ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವುದು ಅಪಾಯಕಾರಿ."),
    "amber_wave": ("Waves up to {h} m expected. Go with caution and watch the weather.",
                   "ಅಲೆಗಳು {h} ಮೀ ವರೆಗೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ಎಚ್ಚರಿಕೆಯಿಂದ ಹೋಗಿ, ಹವಾಮಾನ ಗಮನಿಸಿ."),
    "amber_unchecked": ("Waves are low ({h} m) but the INCOIS alert has not been checked. Confirm before going.",
                        "ಅಲೆಗಳು ಕಡಿಮೆ ({h} ಮೀ), ಆದರೆ INCOIS ಎಚ್ಚರಿಕೆ ಪರಿಶೀಲಿಸಿಲ್ಲ. ಹೋಗುವ ಮೊದಲು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ."),
    "green": ("Waves up to {h} m and no INCOIS alert.",
              "ಅಲೆಗಳು {h} ಮೀ ವರೆಗೆ ಮಾತ್ರ, INCOIS ಎಚ್ಚರಿಕೆ ಇಲ್ಲ."),
    "grey": ("No wave forecast available. Check official notices before going.",
             "ಅಲೆಗಳ ಮುನ್ಸೂಚನೆ ಲಭ್ಯವಿಲ್ಲ. ಹೋಗುವ ಮೊದಲು ಅಧಿಕೃತ ಸೂಚನೆ ನೋಡಿ."),
}


def load_config(path=None):
    return json.load(open(path or CFG_PATH, encoding="utf-8"))


def _now(now=None):
    return now or dt.datetime.now(dt.timezone.utc)


def _parse(ts):
    t = dt.datetime.fromisoformat(ts)
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


# ---------- geometry ----------
def destination(lat, lon, bearing_deg, dist_km):
    R, br, d = 6371.0, math.radians(bearing_deg), dist_km / 6371.0
    p1, l1 = math.radians(lat), math.radians(lon)
    p2 = math.asin(math.sin(p1) * math.cos(d) + math.cos(p1) * math.sin(d) * math.cos(br))
    l2 = l1 + math.atan2(math.sin(br) * math.sin(d) * math.cos(p1), math.cos(d) - math.sin(p1) * math.sin(p2))
    return math.degrees(p2), math.degrees(l2)


def offshore_point(site, cfg):
    """A point out at sea from the site: its usual fishing distance, kept between 5 and 20 km. Rounded to 0.05 deg
    (about 5 km, the model's grid) so neighbouring sites share one forecast call."""
    rng = site["fishing_range_km"] if site["fishing_range_km"] else cfg["offshore_min_km"]
    km = min(max(rng, cfg["offshore_min_km"]), cfg["offshore_max_km"])
    lat, lon = destination(site["lat"], site["lon"], cfg["offshore_bearing_deg"], km)
    return round(lat * 20) / 20, round(lon * 20) / 20


# ---------- forecast ----------
def fetch_live(lat, lon):
    q = urllib.parse.urlencode({"latitude": lat, "longitude": lon, "hourly": "wave_height",
                                "forecast_days": 2, "timezone": "Asia/Kolkata"})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "KadalSignal-practice/0.4"})
    data = json.load(urllib.request.urlopen(req, timeout=10))
    if data.get("error"):
        raise RuntimeError(data.get("reason", "Open-Meteo error"))
    return {"time": data["hourly"]["time"], "wave_height": data["hourly"]["wave_height"]}


def get_forecast(con, lat, lon, now=None, cfg=None, fetcher=None):
    """-> (payload or None, meta). Uses a cache: fresh < 3 h; if the live call fails, an older copy up to 12 h
    is used and labelled 'stale-cache'; older than that = no data."""
    cfg, now, fetcher = cfg or load_config(), _now(now), fetcher or fetch_live
    key = f"{lat:.2f},{lon:.2f}"
    row = con.execute("SELECT fetched_at, payload FROM forecast_cache WHERE key=?", (key,)).fetchone()
    age = (now - _parse(row["fetched_at"])).total_seconds() / 3600 if row else None
    if row and age < cfg["forecast_fresh_hours"]:
        return json.loads(row["payload"]), {"source": "cache", "age_h": round(age, 1), "point": key}
    try:
        payload = fetcher(lat, lon)
        con.execute("INSERT OR REPLACE INTO forecast_cache (key, fetched_at, payload) VALUES (?,?,?)",
                    (key, now.isoformat(), json.dumps(payload)))
        con.commit()
        return payload, {"source": "live", "age_h": 0, "point": key}
    except Exception as e:
        if row and age <= cfg["forecast_max_age_hours"]:
            return json.loads(row["payload"]), {"source": "stale-cache", "age_h": round(age, 1), "point": key}
        return None, {"source": "none", "error": str(e)[:120], "point": key}


def max_wave_in_window(payload, now=None, hours=12):
    """Highest wave height from 1 hour ago to `hours` ahead (Open-Meteo times are IST, no timezone given)."""
    if not payload:
        return None
    local = _now(now).astimezone(IST).replace(tzinfo=None)
    lo, hi = local - dt.timedelta(hours=1), local + dt.timedelta(hours=hours)
    vals = [v for t, v in zip(payload["time"], payload["wave_height"])
            if v is not None and lo <= dt.datetime.fromisoformat(t) <= hi]
    return max(vals) if vals else None


# ---------- the INCOIS alert (typed in by a person) ----------
def set_alert(con, state, hours=12, note=None, source="manual", now=None):
    if state not in ("active", "none"):
        raise ValueError("state must be 'active' or 'none'")
    hours = float(hours)
    if not 0 < hours <= 48:
        raise ValueError("hours must be between 0 and 48")
    now = _now(now)
    con.execute("INSERT OR REPLACE INTO alert_state (id, state, set_at, valid_until, note, source) VALUES (1,?,?,?,?,?)",
                (state, now.isoformat(), (now + dt.timedelta(hours=hours)).isoformat(), note, source))
    con.commit()
    return get_alert(con, now)


def get_alert(con, now=None):
    now = _now(now)
    r = con.execute("SELECT * FROM alert_state WHERE id=1").fetchone()
    if not r or _parse(r["valid_until"]) <= now:
        return {"state": "unknown", "note": "no current alert entry (expired or never set)"}
    return {"state": r["state"], "set_at": r["set_at"], "valid_until": r["valid_until"],
            "note": r["note"], "source": r["source"]}


# ---------- the decision ----------
def decide(max_wave_m, alert_state, cfg):
    """-> (color, kind). Pure function: easy to test and to explain."""
    if alert_state == "active":
        return "red", "red_alert"
    if max_wave_m is None:
        return "grey", "grey"
    if max_wave_m >= cfg["red_wave_m"]:
        return "red", "red_wave"
    if max_wave_m >= cfg["amber_wave_m"]:
        return "amber", "amber_wave"
    if alert_state != "none" and cfg.get("alert_unknown_policy", "amber") == "amber":
        return "amber", "amber_unchecked"
    return "green", "green"


def sentence(kind, max_wave_m):
    en, kn = TEXT[kind]
    h = "" if max_wave_m is None else f"{max_wave_m:.1f}"
    return en.format(h=h), kn.format(h=h)


# ---------- compute and store ----------
def compute_site(con, site, cfg, alert, now=None, fetcher=None, fake_wave=None):
    now = _now(now)
    if fake_wave is not None:
        meta, wave = {"source": "simulated", "point": "-"}, float(fake_wave)
    else:
        lat, lon = offshore_point(site, cfg)
        payload, meta = get_forecast(con, lat, lon, now, cfg, fetcher)
        wave = max_wave_in_window(payload, now, cfg["forecast_window_hours"])
    color, kind = decide(wave, alert["state"], cfg)
    en, kn = sentence(kind, wave)
    if meta["source"] == "simulated":
        en, kn = "[SIMULATED] " + en, "[ಅನುಕರಣೆ] " + kn
    valid_until = now + dt.timedelta(hours=cfg["validity_hours"])
    inputs = {"max_wave_m": wave, "window_h": cfg["forecast_window_hours"], "alert_state": alert["state"],
              "forecast_source": meta["source"], "forecast_age_h": meta.get("age_h"), "point": meta.get("point"),
              "kind": kind, "simulated": meta["source"] == "simulated"}
    con.execute("INSERT INTO signals (site_id, color, reason_en, reason_kn, valid_from, valid_until, inputs) "
                "VALUES (?,?,?,?,?,?,?)", (site["id"], color, en, kn, now.isoformat(), valid_until.isoformat(),
                                           json.dumps(inputs)))
    con.commit()
    return {"site_id": site["id"], "color": color, "kind": kind, "max_wave_m": wave, "source": meta["source"]}


def refresh_all(con, now=None, fetcher=None, fake_wave=None, only=None, cfg=None, pause=0.0):
    cfg, now = cfg or load_config(), _now(now)
    alert = get_alert(con, now)
    sites = con.execute("SELECT id, name, lat, lon, fishing_range_km FROM sites" +
                        (" WHERE id=?" if only else "") + " ORDER BY id", (only,) if only else ()).fetchall()
    out = []
    for s in sites:
        out.append(compute_site(con, s, cfg, alert, now, fetcher, fake_wave))
        if pause and out[-1]["source"] == "live":
            time.sleep(pause)
    return out, alert


def latest_signal(con, site_id, now=None):
    r = con.execute("SELECT * FROM signals WHERE site_id=? ORDER BY id DESC LIMIT 1", (site_id,)).fetchone()
    now = _now(now)
    if not r or _parse(r["valid_until"]) <= now:
        return None
    i = json.loads(r["inputs"] or "{}")
    return {"color": r["color"], "reason_en": r["reason_en"], "reason_kn": r["reason_kn"],
            "valid_from": r["valid_from"], "valid_until": r["valid_until"], "max_wave_m": i.get("max_wave_m"),
            "alert_state": i.get("alert_state"), "forecast_source": i.get("forecast_source"),
            "simulated": bool(i.get("simulated")), "disclaimer_en": DISCLAIMER_EN, "disclaimer_kn": DISCLAIMER_KN}
