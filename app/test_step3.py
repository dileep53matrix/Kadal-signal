"""Self-test for Step 3. Run:  python test_step3.py   (uses a temporary database, your real one is untouched)"""
import json, os, subprocess, sys, tempfile, threading, urllib.request, urllib.error

tmp = tempfile.mkdtemp()
os.environ["KADAL_DB"] = os.path.join(tmp, "test.db")
HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, "build_atlas.py"], cwd=HERE, env=os.environ, check=True, capture_output=True)

import db, contribute, server
from contribute import ApiError

F1 = {"ice": True, "fuel": True, "shelter": True, "auction": True}
F2 = {"ice": True, "fuel": False, "shelter": False, "auction": False}
ok = bad = 0
def check(name, cond):
    global ok, bad
    print(("PASS  " if cond else "FAIL  ") + name)
    ok, bad = (ok + 1, bad) if cond else (ok, bad + 1)
def raises(status, fn, *a, **k):
    try:
        fn(*a, **k)
    except ApiError as e:
        return e.status == status
    return False

con = db.connect()
# KR069 Malpe: two matching reports -> verified
r1 = contribute.add_contribution(con, "KR069", "t-fisher-1", F1)
check("1 report -> pending", r1["status"] == "pending")
r2 = contribute.add_contribution(con, "KR069", "t-coop-2", F1)
check("2 matching reports -> verified", r2["status"] == "verified")
s = contribute.get_site(con, "KR069")
check("verified site: label, score 100, facilities saved",
      s["confidence_label"] == "verified" and s["confidence_score"] == 100 and s["facilities"] == F1)
# duplicate reporter
check("same reporter twice -> 409", raises(409, contribute.add_contribution, con, "KR069", "t-coop-2", F1))
# conflict at KR090
contribute.add_contribution(con, "KR090", "t-a", F1)
rc = contribute.add_contribution(con, "KR090", "t-b", F2)
check("2 disagreeing reports -> conflict, not verified",
      rc["status"] == "conflict" and contribute.get_site(con, "KR090")["confidence_label"] != "verified")
rc3 = contribute.add_contribution(con, "KR090", "t-c", F2)
check("third report matching one of them -> verified", rc3["status"] == "verified")
# far away GPS: stored but not counted
site = contribute.get_site(con, "KR007")
far = contribute.add_contribution(con, "KR007", "t-far", F1, lat=site["lat"] + 0.05, lon=site["lon"])
check("report 5+ km away is not counted", far["counted"] is False and far["status"] == "none")
near = contribute.add_contribution(con, "KR007", "t-near1", F1, lat=site["lat"] + 0.001, lon=site["lon"])
near2 = contribute.add_contribution(con, "KR007", "t-near2", F1, lat=site["lat"], lon=site["lon"] + 0.001)
check("two nearby matching reports -> verified (far one ignored)", near2["status"] == "verified")
# validation
check("bad facilities -> 400", raises(400, contribute.add_contribution, con, "KR004", "t-x", {"ice": True}))
check("non-boolean facilities -> 400", raises(400, contribute.add_contribution, con, "KR004", "t-x",
      {"ice": "yes", "fuel": True, "shelter": True, "auction": True}))
check("real-looking name with symbols -> 400", raises(400, contribute.add_contribution, con, "KR004", "Ravi <script>", F1))
check("unknown site -> 404", raises(404, contribute.add_contribution, con, "NOPE", "t-y", F1))
q = contribute.queue(con)
check("queue lists only unverified sites with reports", all(x["confidence_label"] != "verified" for x in q))
# rebuild keeps verification
con.close()
subprocess.run([sys.executable, "build_atlas.py"], cwd=HERE, env=os.environ, check=True, capture_output=True)
con = db.connect()
check("verification survives an atlas rebuild", contribute.get_site(con, "KR069")["confidence_label"] == "verified")
con.close()

# --- real HTTP round trip ---
srv = server.make_server(0)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
def call(method, path, body=None):
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
c, b = call("GET", "/api/sites")
check("GET /api/sites -> 200 with 8 sample sites", c == 200 and len(json.loads(b)) == 8)
c, b = call("POST", "/api/sites/KR045/contributions", {"reporter_id": "h-1", "facilities": F1})
check("POST contribution -> 201 pending", c == 201 and json.loads(b)["status"] == "pending")
c, b = call("POST", "/api/sites/KR045/contributions", {"reporter_id": "h-2", "facilities": F1})
check("second POST -> verified", c == 201 and json.loads(b)["status"] == "verified")
c, b = call("POST", "/api/sites/KR045/contributions", {"reporter_id": "h-2", "facilities": F1})
check("duplicate POST -> 409", c == 409)
c, b = call("GET", "/api/sites/NOPE")
check("unknown site -> 404", c == 404)
c, b = call("GET", "/api/atlas.geojson")
g = json.loads(b)
check("atlas.geojson is a FeatureCollection with credits", g["type"] == "FeatureCollection" and "OpenStreetMap" in g["credits"])
c, b = call("GET", "/api/queue")
check("GET /api/queue -> 200", c == 200)
c, b = call("GET", "/")
check("GET / serves the page", c == 200 and b"Kadal Signal" in b)
c, b = call("POST", "/api/sites/KR045/contributions", None)
check("POST with empty body -> 400 (not a crash)", c == 400)
srv.shutdown()
print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
