"""Step 1: database schema for Kadal Signal (Karnataka pilot). SQLite, no setup needed."""
import os, sqlite3, pathlib

DB_PATH = pathlib.Path(os.environ.get("KADAL_DB") or (pathlib.Path(__file__).resolve().parent.parent / "data" / "kadal.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,              -- e.g. KA-001
    cmfri_code TEXT,                  -- CMFRI code, e.g. KR069
    taluk TEXT,
    gears TEXT,                       -- gears operated (CMFRI text)
    operation_period TEXT,            -- CMFRI text, e.g. 'Sep to May'
    colocated_with TEXT,              -- other site(s) with identical coordinates
    name TEXT NOT NULL,
    name_kn TEXT,                     -- Kannada name
    district TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    src_cmfri INTEGER DEFAULT 0,      -- which sources list this site
    src_pib INTEGER DEFAULT 0,
    src_osm INTEGER DEFAULT 0,
    osm_distance_m REAL,              -- distance between CMFRI and OSM points
    fishing_range_km REAL,            -- from CMFRI: usual fishing distance
    fishing_depth_m REAL,             -- from CMFRI: usual fishing depth
    facilities TEXT DEFAULT '{}',     -- JSON: {"ice":true,"fuel":false,"shelter":true,"auction":true}
    confidence_score REAL DEFAULT 0,  -- 0..100
    confidence_label TEXT DEFAULT 'low',   -- low / medium / verified
    last_verified TEXT                -- ISO timestamp of last matching report
);

CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL REFERENCES sites(id),
    reporter_id TEXT NOT NULL,        -- demo: made-up names only, no personal data
    lat REAL, lon REAL,
    facilities TEXT NOT NULL,         -- JSON, same keys as sites.facilities
    distance_m REAL,                  -- distance from the reporter to the site (if GPS given)
    counted INTEGER DEFAULT 1,        -- 0 = too far from the site: stored but not counted
    photo_path TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,               -- demo names only
    site_id TEXT NOT NULL REFERENCES sites(id),
    status TEXT DEFAULT 'in_port',    -- in_port / at_sea
    last_departed TEXT,
    last_returned TEXT
);

CREATE TABLE IF NOT EXISTS alert_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),   -- one row: the INCOIS high-wave alert for Karnataka
    state TEXT NOT NULL,                     -- active / none  (anything else = unknown)
    set_at TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    note TEXT,
    source TEXT                              -- manual (read from the INCOIS page by a person)
);

CREATE TABLE IF NOT EXISTS forecast_cache (
    key TEXT PRIMARY KEY,                    -- offshore point rounded to 0.05 degrees
    fetched_at TEXT NOT NULL,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL REFERENCES sites(id),
    color TEXT NOT NULL,              -- green / amber / red
    reason_en TEXT NOT NULL,
    reason_kn TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    inputs TEXT                       -- JSON snapshot of wave height, alert status etc.
);
"""

def connect():
    DB_PATH.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

NEW_SITE_COLUMNS = {"cmfri_code": "TEXT", "taluk": "TEXT", "gears": "TEXT",
                    "operation_period": "TEXT", "colocated_with": "TEXT"}

NEW_CONTRIB_COLUMNS = {"distance_m": "REAL", "counted": "INTEGER DEFAULT 1"}

def _migrate(con, table, wanted):
    have = {r["name"] for r in con.execute(f"PRAGMA table_info({table})")}
    for col, typ in wanted.items():
        if col not in have:
            con.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typ}")

def init():
    con = connect()
    con.executescript(SCHEMA)
    _migrate(con, "sites", NEW_SITE_COLUMNS)              # databases made in Step 1 / 2
    _migrate(con, "contributions", NEW_CONTRIB_COLUMNS)
    con.commit()
    return con
