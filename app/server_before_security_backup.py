"""Step 3: web API. Run:  python server.py   then open http://127.0.0.1:8000
Uses only Python's standard library, so there is nothing to pip install."""
import json, os, re, pathlib, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import db, contribute, lights
from contribute import ApiError

STATIC = pathlib.Path(__file__).resolve().parent.parent / "static"


def atlas_geojson(con):
    feats = []
    for s in contribute.list_sites(con):
        props = {k: s[k] for k in ("id", "cmfri_code", "name", "name_kn", "district", "confidence_score",
                                   "confidence_label", "facilities", "fishing_range_km", "fishing_depth_m", "last_verified")}
        props["sources"] = [k.upper() for k, v in (("cmfri", s["sources"]["cmfri"]), ("osm", s["sources"]["osm"])) if v]
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]}, "properties": props})
    return {"type": "FeatureCollection",
            "credits": "Sites: ICAR-CMFRI landing centres map (licence not stated; credited). OSM objects: (c) OpenStreetMap contributors, ODbL.",
            "features": feats}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))

    def _send(self, code, payload, ctype="application/json; charset=utf-8"):
        body = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"")

    def _route(self, method):
        path = urlparse(self.path).path.rstrip("/") or "/"
        con = db.connect()
        try:
            if method == "GET":
                if path == "/api/sites":
                    return 200, contribute.list_sites(con)
                m = re.fullmatch(r"/api/sites/([A-Za-z0-9\-]+)", path)
                if m:
                    return 200, contribute.get_site(con, m.group(1))
                if path == "/api/signals":
                    return 200, {"alert": lights.get_alert(con), "credits": lights.CREDITS,
                                 "sites": [{"id": x["id"], "name": x["name"], "name_kn": x["name_kn"],
                                            "signal": x["signal"]} for x in contribute.list_sites(con)]}
                if path == "/api/alert":
                    return 200, lights.get_alert(con)
                if path == "/api/queue":
                    return 200, contribute.queue(con)
                if path == "/api/atlas.geojson":
                    return 200, atlas_geojson(con)
                if path in ("/", "/index.html"):
                    return 200, (STATIC / "index.html").read_bytes()
                raise ApiError(404, "not found")
            if method == "POST":
                if path == "/api/alert":
                    token = os.environ.get("KADAL_ADMIN_TOKEN")        # if set, the alert can only be changed with it
                    if token and self.headers.get("X-Admin-Token") != token:
                        raise ApiError(401, "admin token required")
                    n = int(self.headers.get("Content-Length") or 0)
                    try:
                        body = json.loads(self.rfile.read(n) or b"{}")
                        return 200, lights.set_alert(con, body.get("state"), body.get("hours", 12), body.get("note"))
                    except ValueError as e:
                        raise ApiError(400, str(e))
                m = re.fullmatch(r"/api/sites/([A-Za-z0-9\-]+)/contributions", path)
                if m:
                    n = int(self.headers.get("Content-Length") or 0)
                    try:
                        body = json.loads(self.rfile.read(n) or b"{}")
                    except ValueError:
                        raise ApiError(400, "body must be JSON")
                    return 201, contribute.add_contribution(
                        con, m.group(1), body.get("reporter_id"), body.get("facilities"),
                        body.get("lat"), body.get("lon"), body.get("photo"))
                raise ApiError(404, "not found")
            raise ApiError(405, "method not allowed")
        finally:
            con.close()

    def _handle(self, method):
        try:
            code, payload = self._route(method)
            ctype = "text/html; charset=utf-8" if isinstance(payload, bytes) else "application/json; charset=utf-8"
            self._send(code, payload, ctype)
        except ApiError as e:
            self._send(e.status, {"error": e.message})
        except Exception as e:                      # never crash the server in a demo
            self._send(500, {"error": f"server error: {e}"})

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")


def make_server(port=8000):
    db.init().close()
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    srv = make_server(port)
    print(f"Kadal Signal API running: http://127.0.0.1:{port}   (stop with Ctrl+C)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
