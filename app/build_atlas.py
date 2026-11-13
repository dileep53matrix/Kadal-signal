"""Step 2: build the Karnataka atlas: load -> dedupe -> match OSM -> score -> DB + GeoJSON.

  python build_atlas.py --inspect ../data/India_LC.geojson
  python build_atlas.py --cmfri ../data/India_LC.geojson --osm ../data/osm.json --pib-count 0
Without arguments it uses the made-up sample files so you can see it run."""
import argparse, csv, json, pathlib, collections
from db import init
import load_cmfri, load_osm, merge, contribute

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cmfri", default=str(DATA / "sample_cmfri.js"))
    ap.add_argument("--osm", default=None, help="Overpass JSON/GeoJSON file; omit for no OSM data")
    ap.add_argument("--state-code", default="KR", help="CMFRI code prefix (KR = Karnataka)")
    ap.add_argument("--pib-count", type=int, help="Karnataka notified landing centres from the PIB annex [4]")
    ap.add_argument("--show-matches", action="store_true", help="list every CMFRI<->OSM match")
    ap.add_argument("--inspect", metavar="GEOJSON", help="just print the property names of a GeoJSON")
    a = ap.parse_args()

    if a.inspect:
        load_cmfri.inspect(a.inspect)
        return

    sites, skipped = load_cmfri.load_state(a.cmfri, a.state_code)
    n_raw = len(sites)
    sites, dups = merge.find_duplicates(sites)
    osm = []
    if a.osm and a.osm.lower() != "none":
        if not pathlib.Path(a.osm).exists():
            raise SystemExit(f"OSM file not found: {a.osm}  (check the path and file name)")
        osm = load_osm.load(a.osm)
        print(f"OSM file: {a.osm}")
        if not osm:
            print("WARNING: that file has 0 usable objects (empty query result, or wrong export type)")
    matches = merge.match_osm(sites, osm)
    matched = len(matches)
    colocated = merge.mark_colocated(sites)
    kn = {}
    kn_path = DATA / "names_kn.csv"
    if kn_path.exists():
        kn = {r["code"]: r["name_kn"] for r in csv.DictReader(open(kn_path, encoding="utf-8")) if r["name_kn"]}
        for s_ in sites:
            s_["name_kn"] = kn.get(s_["cmfri_code"]) or s_["name_kn"]
    sites.sort(key=lambda s: (s["district"] or "", s["name"]))

    con = init()
    con.execute("DELETE FROM sites")
    features, labels = [], collections.Counter()
    for i, s in enumerate(sites, 1):
        s["id"] = s["cmfri_code"] or f"KA-{i:03d}"   # stable id: reports stay attached on rebuild
        s["confidence_score"], s["confidence_label"] = merge.confidence(s)
        labels[s["confidence_label"]] += 1
        con.execute(
            """INSERT INTO sites (id,cmfri_code,taluk,gears,operation_period,colocated_with,name,name_kn,district,lat,lon,
               src_cmfri,src_osm,osm_distance_m,fishing_range_km,fishing_depth_m,
               confidence_score,confidence_label,last_verified)
               VALUES (:id,:cmfri_code,:taluk,:gears,:operation_period,:colocated_with,:name,:name_kn,
               :district,:lat,:lon,:src_cmfri,:src_osm,:osm_distance_m,:fishing_range_km,:fishing_depth_m,
               :confidence_score,:confidence_label,:last_verified)""", s)
        features.append({"type": "Feature",
            "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
            "properties": {k: s[k] for k in ("id", "cmfri_code", "name", "name_kn", "district", "confidence_score",
                           "confidence_label", "src_cmfri", "src_osm", "fishing_range_km", "fishing_depth_m")}})
    con.commit()
    kept = 0
    for r in con.execute("SELECT DISTINCT site_id FROM contributions").fetchall():
        if con.execute("SELECT 1 FROM sites WHERE id=?", (r["site_id"],)).fetchone():
            contribute.evaluate(con, r["site_id"])        # re-apply verification after a rebuild
            kept += 1
    if kept:
        print(f"Re-applied reports for {kept} site(s)")
    labels = collections.Counter(r["confidence_label"] for r in con.execute("SELECT confidence_label FROM sites"))
    (DATA / "atlas_karnataka.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"CMFRI Karnataka sites read: {n_raw} (skipped {skipped})")
    print(f"Duplicates dropped: {len(dups)} {dups}")
    print(f"OSM objects: {len(osm)}, matched to sites: {matched}")
    if a.show_matches:
        for m in sorted(matches, key=lambda m: m["distance_m"]):
            print(f"  {m['code']} {m['site']:<28} <-> OSM {m['osm_name']:<30} {m['distance_m']:>5} m  name-sim {m['name_sim']}")
        print(f"OSM objects with no matching site: {len(osm) - matched}")
    print(f"Co-located sites (same coordinates, different names): {colocated}")
    print(f"Kannada names filled: {sum(1 for x in sites if x['name_kn'])} of {len(sites)}")
    print(f"Atlas: {len(sites)} sites, confidence: {dict(labels)}")
    if a.pib_count is not None:
        print(f"PIB count check: CMFRI {len(sites)} vs PIB {a.pib_count} -> "
              f"{'consistent' if len(sites) >= a.pib_count else 'CMFRI has FEWER sites than notified, investigate'}")
    print("Exported data/atlas_karnataka.geojson")

if __name__ == "__main__":
    main()
