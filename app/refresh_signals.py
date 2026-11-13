"""Compute the light for every site and store it.
  python refresh_signals.py                    live Open-Meteo forecast (needs internet)
  python refresh_signals.py --fake-waves 2.8   SIMULATION for a demo: every light is labelled [SIMULATED]
  python refresh_signals.py --site KR069       one site only"""
import argparse, collections, db, lights
ap = argparse.ArgumentParser()
ap.add_argument("--fake-waves", type=float)
ap.add_argument("--site")
ap.add_argument("-v", action="store_true", help="list every site")
a = ap.parse_args()
con = db.init()
res, alert = lights.refresh_all(con, fake_wave=a.fake_waves, only=a.site, pause=0.15)
print(f"INCOIS alert entry: {alert['state']}" + (f" ({alert.get('note')})" if alert.get("note") else ""))
print("Lights:", dict(collections.Counter(r["color"] for r in res)))
print("Forecast sources:", dict(collections.Counter(r["source"] for r in res)))
if a.v:
    for r in res:
        print(f"  {r['site_id']:<6} {r['color']:<6} wave={r['max_wave_m']}  [{r['source']}]")
if a.fake_waves is not None:
    print("NOTE: these lights are SIMULATED. Run again without --fake-waves for real data.")
