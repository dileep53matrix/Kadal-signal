"""Self-test for Step 4. Run: python test_step4.py  (temporary database; no internet needed)"""
import datetime as dt, json, os, subprocess, sys, tempfile, threading, urllib.request, urllib.error

tmp = tempfile.mkdtemp()
os.environ["KADAL_DB"] = os.path.join(tmp, "t4.db")
HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, "build_atlas.py"], cwd=HERE, env=os.environ, check=True, capture_output=True)
import db, lights, contribute, server
from merge import haversine_m

ok = bad = 0
def check(name, cond):
    global ok, bad
    print(("PASS  " if cond else "FAIL  ") + name)
    ok, bad = (ok + 1, bad) if cond else (ok, bad + 1)

cfg = lights.load_config()
UTC = dt.timezone.utc
NOW = dt.datetime(2026, 11, 10, 6, 0, tzinfo=UTC)          # = 11:30 IST
def payload(fn):                                          # 48 hourly values from 2026-11-10 00:00 IST
    t0 = dt.datetime(2026, 11, 10, 0, 0)
    times = [(t0 + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(48)]
    return {"time": times, "wave_height": [fn(i) for i in range(48)]}
calls = []
def steady(v):
    def f(lat, lon):
        calls.append((lat, lon)); return payload(lambda i: v)
    return f
def broken(lat, lon):
    raise OSError("no internet")

# 1. decide(): thresholds, boundaries, safe defaults
d = lambda w, a: lights.decide(w, a, cfg)[0]
check("1.0 m + alert none -> green", d(1.0, "none") == "green")
check("exactly 1.5 m -> amber", d(1.5, "none") == "amber")
check("2.4 m -> amber", d(2.4, "none") == "amber")
check("exactly 2.5 m -> red", d(2.5, "none") == "red")
check("alert active overrides calm sea -> red", d(0.3, "active") == "red")
check("alert active and no forecast -> still red", d(None, "active") == "red")
check("no forecast -> grey, never green", d(None, "none") == "grey" and d(None, "unknown") == "grey")
check("calm sea but alert unknown -> amber (not green)", d(0.5, "unknown") == "amber")
# 2. geometry
site = {"lat": 13.3466, "lon": 74.7012, "fishing_range_km": 250}
lat, lon = lights.offshore_point(site, cfg)
check("offshore point is west of the coast", lon < site["lon"] - 0.1)
km = haversine_m(site["lat"], site["lon"], lat, lon) / 1000
check("offshore distance capped near 20 km (grid-rounded)", 15 < km < 24)
near = lights.offshore_point({"lat": 13.0, "lon": 74.8, "fishing_range_km": 1}, cfg)
check("tiny fishing range still goes at least ~5 km out", haversine_m(13.0, 74.8, *near) / 1000 > 2)
# 3. window
p = payload(lambda i: 3.5 if i in (4, 40) else 1.0)       # spike at 04:00 (past) and at +28 h (future)
check("spikes outside the window are ignored", lights.max_wave_in_window(p, NOW, 12) == 1.0)
p = payload(lambda i: 2.0 if i == 16 else 1.0)            # 16:00 IST = within next 12 h
check("spike inside the window is seen", lights.max_wave_in_window(p, NOW, 12) == 2.0)
check("None values are skipped", lights.max_wave_in_window(payload(lambda i: None), NOW, 12) is None)

con = db.connect()
# 4. cache behaviour
calls.clear()
lights.get_forecast(con, 13.1, 74.5, NOW, cfg, steady(1.0))
lights.get_forecast(con, 13.1, 74.5, NOW + dt.timedelta(hours=1), cfg, steady(1.0))
check("second call within 3 h uses the cache (1 live call)", len(calls) == 1)
pl, meta = lights.get_forecast(con, 13.1, 74.5, NOW + dt.timedelta(hours=5), cfg, broken)
check("live call fails after 5 h -> stale cache, labelled", pl is not None and meta["source"] == "stale-cache")
pl, meta = lights.get_forecast(con, 13.1, 74.5, NOW + dt.timedelta(hours=20), cfg, broken)
check("older than 12 h and failing -> no data", pl is None and meta["source"] == "none")
# 5. alert handling
check("alert starts as unknown", lights.get_alert(con, NOW)["state"] == "unknown")
lights.set_alert(con, "active", 6, "test", now=NOW)
check("alert active within its time", lights.get_alert(con, NOW + dt.timedelta(hours=5))["state"] == "active")
check("alert expires -> unknown (not 'none')", lights.get_alert(con, NOW + dt.timedelta(hours=7))["state"] == "unknown")
try:
    lights.set_alert(con, "maybe"); bad_state = False
except ValueError:
    bad_state = True
check("invalid alert state rejected", bad_state)
# 6. refresh over all sites
lights.set_alert(con, "none", 12, now=NOW)
res, _ = lights.refresh_all(con, NOW, steady(1.0))
check("calm + alert none -> all 8 green", len(res) == 8 and all(r["color"] == "green" for r in res))
con.execute("DELETE FROM alert_state"); con.commit()
res, _ = lights.refresh_all(con, NOW, steady(1.0))
check("calm + alert unknown -> all amber", all(r["color"] == "amber" for r in res))
lights.set_alert(con, "active", 12, now=NOW)
res, _ = lights.refresh_all(con, NOW, steady(1.0))
check("alert active -> all red", all(r["color"] == "red" for r in res))
lights.set_alert(con, "none", 12, now=NOW)
con.execute("DELETE FROM forecast_cache"); con.commit()
res, _ = lights.refresh_all(con, NOW, broken)
check("forecast down, no cache -> all grey", all(r["color"] == "grey" for r in res))
res, _ = lights.refresh_all(con, NOW, fake_wave=2.0)
check("simulated 2.0 m -> amber, labelled SIMULATED",
      res[0]["color"] == "amber" and lights.latest_signal(con, res[0]["site_id"], NOW)["simulated"])
res, _ = lights.refresh_all(con, NOW, fake_wave=3.0)
sig = lights.latest_signal(con, "KR069", NOW)
check("simulated 3.0 m -> red with English + Kannada sentence",
      sig["color"] == "red" and "3.0" in sig["reason_en"] and "ಅಲೆಗಳು" in sig["reason_kn"] and sig["reason_en"].startswith("[SIMULATED]"))
check("signal expires after 12 h", lights.latest_signal(con, "KR069", NOW + dt.timedelta(hours=13)) is None)
res, _ = lights.refresh_all(con, NOW, steady(1.0), only="KR069")
check("--site refreshes just one site", len(res) == 1 and res[0]["site_id"] == "KR069")
check("site view carries the signal", contribute.get_site(con, "KR069", now=NOW)["signal"]["color"] == "green")
con.close()

# 7. HTTP
srv = server.make_server(0); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
def call(method, path, body=None, headers=None):
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None, headers=dict({"Content-Type": "application/json"}, **(headers or {})))
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())
c, b = call("GET", "/api/signals")
check("GET /api/signals lists 8 sites with credits", c == 200 and len(b["sites"]) == 8 and "Open-Meteo" in b["credits"])
c, b = call("POST", "/api/alert", {"state": "active", "hours": 6, "note": "http test"})
check("POST /api/alert works when no admin token is set", c == 200 and b["state"] == "active")
os.environ["KADAL_ADMIN_TOKEN"] = "s3cret"
c, b = call("POST", "/api/alert", {"state": "none"})
check("alert change refused without the token (401)", c == 401)
c, b = call("POST", "/api/alert", {"state": "none", "hours": 6}, {"X-Admin-Token": "s3cret"})
check("alert change accepted with the token", c == 200 and b["state"] == "none")
c, b = call("POST", "/api/alert", {"state": "bogus"}, {"X-Admin-Token": "s3cret"})
check("invalid state -> 400", c == 400)
c, b = call("GET", "/api/alert")
check("GET /api/alert readable by anyone", c == 200 and b["state"] == "none")
srv.shutdown()
print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
