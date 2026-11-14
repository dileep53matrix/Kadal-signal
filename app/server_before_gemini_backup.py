"""Kadal Signal web API.

Run from the app directory:
    python server.py
Then open:
    http://127.0.0.1:8000

Uses only Python's standard library.

Security note:
    POST /api/alert is disabled unless KADAL_ADMIN_TOKEN is configured.
    Set a long, random token in the environment before starting the server.
"""
import hmac
import json
import os
import pathlib
import re
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import db
import contribute
import lights
from contribute import ApiError


STATIC = pathlib.Path(__file__).resolve().parent.parent / "static"
SITE_ID_RE = re.compile(r"/api/sites/([A-Za-z0-9_-]+)")
MAX_BODY_BYTES = 64 * 1024


def atlas_geojson(con):
    feats = []
    for site in contribute.list_sites(con):
        props = {
            key: site[key]
            for key in (
                "id",
                "cmfri_code",
                "name",
                "name_kn",
                "district",
                "confidence_score",
                "confidence_label",
                "facilities",
                "fishing_range_km",
                "fishing_depth_m",
                "last_verified",
            )
        }
        props["sources"] = [
            key.upper()
            for key, enabled in (
                ("cmfri", site["sources"]["cmfri"]),
                ("osm", site["sources"]["osm"]),
            )
            if enabled
        ]
        feats.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [site["lon"], site["lat"]],
                },
                "properties": props,
            }
        )

    return {
        "type": "FeatureCollection",
        "credits": (
            "Sites: ICAR-CMFRI landing centres map "
            "(licence not stated; credited). "
            "OSM objects: (c) OpenStreetMap contributors, ODbL."
        ),
        "features": feats,
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))

    def _send(self, code, payload, content_type="application/json; charset=utf-8"):
        body = (
            payload
            if isinstance(payload, bytes)
            else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        )
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        # This prototype is intended to run locally. Do not expose it publicly
        # without reviewing and tightening the CORS policy.
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:8000")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"")

    def _read_json_body(self):
        raw_length = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_length)
        except (TypeError, ValueError):
            raise ApiError(400, "invalid Content-Length")

        if length < 0 or length > MAX_BODY_BYTES:
            raise ApiError(413, "request body too large")

        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ApiError(400, "body must be valid JSON")

    def _require_admin_token(self):
        configured_token = os.environ.get("KADAL_ADMIN_TOKEN", "")
        if not configured_token:
            # Fail closed: never allow alert changes just because the
            # administrator forgot to configure a token.
            raise ApiError(503, "admin alert updates are disabled: admin token is not configured")

        supplied_token = self.headers.get("X-Admin-Token", "")
        if not hmac.compare_digest(supplied_token, configured_token):
            raise ApiError(401, "admin token required or invalid")

    def _route(self, method):
        path = urlparse(self.path).path.rstrip("/") or "/"
        con = db.connect()
        try:
            if method == "GET":
                if path == "/api/sites":
                    return 200, contribute.list_sites(con)

                match = SITE_ID_RE.fullmatch(path)
                if match:
                    return 200, contribute.get_site(con, match.group(1))

                if path == "/api/signals":
                    return 200, {
                        "alert": lights.get_alert(con),
                        "credits": lights.CREDITS,
                        "sites": [
                            {
                                "id": site["id"],
                                "name": site["name"],
                                "name_kn": site["name_kn"],
                                "signal": site["signal"],
                            }
                            for site in contribute.list_sites(con)
                        ],
                    }

                if path == "/api/alert":
                    return 200, lights.get_alert(con)

                if path == "/api/queue":
                    return 200, contribute.queue(con)

                if path == "/api/atlas.geojson":
                    return 200, atlas_geojson(con)

                if path in ("/", "/index.html"):
                    index_file = STATIC / "index.html"
                    if not index_file.is_file():
                        raise ApiError(404, "dashboard file not found")
                    return 200, index_file.read_bytes()

                raise ApiError(404, "not found")

            if method == "POST":
                if path == "/api/alert":
                    self._require_admin_token()
                    body = self._read_json_body()
                    try:
                        result = lights.set_alert(
                            con,
                            body.get("state"),
                            body.get("hours", 12),
                            body.get("note"),
                        )
                    except (ValueError, TypeError) as exc:
                        raise ApiError(400, str(exc))
                    return 200, result

                match = re.fullmatch(
                    r"/api/sites/([A-Za-z0-9_-]+)/contributions", path
                )
                if match:
                    body = self._read_json_body()
                    return 201, contribute.add_contribution(
                        con,
                        match.group(1),
                        body.get("reporter_id"),
                        body.get("facilities"),
                        body.get("lat"),
                        body.get("lon"),
                        body.get("photo"),
                    )

                raise ApiError(404, "not found")

            raise ApiError(405, "method not allowed")
        finally:
            con.close()

    def _handle(self, method):
        try:
            code, payload = self._route(method)
            content_type = (
                "text/html; charset=utf-8"
                if isinstance(payload, bytes)
                else "application/json; charset=utf-8"
            )
            self._send(code, payload, content_type)
        except ApiError as exc:
            self._send(exc.status, {"error": exc.message})
        except Exception:
            # Keep internal exception details in the server console only.
            traceback.print_exc(file=sys.stderr)
            self._send(500, {"error": "internal server error"})

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")


def make_server(port=8000):
    db.init().close()
    return ThreadingHTTPServer(("0.0.0.0", port), Handler)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = make_server(port)
    print(
        f"Kadal Signal API running: http://127.0.0.1:{port} "
        "(stop with Ctrl+C)"
    )
    if not os.environ.get("KADAL_ADMIN_TOKEN"):
        print(
            "WARNING: KADAL_ADMIN_TOKEN is not set; "
            "POST /api/alert is disabled."
        )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        server.server_close()
