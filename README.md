# Kadal Signal (practice build, Karnataka pilot, Kannada)

Steps
1. Foundation: schema (done)
2. Real data: CMFRI Karnataka (KR codes) + OSM merge + confidence score (done)
3. API: sites, contribute, validate (2 matching = verified)
4. Signal rules: Open-Meteo + INCOIS alert -> green/amber/red + Kannada reason
5. Map UI (Leaflet) + site card, Kannada text review
6. Departure/return log + "still at sea"
7. Polish, demo script for the boss

Run Step 2
  1. Put the CMFRI file in data/ as LandingCentres_4.js (qgis2web .js or GeoJSON both work)
  2. cd app
  3. python build_atlas.py --inspect ../data/LandingCentres_4.js
  4. python build_atlas.py --cmfri ../data/LandingCentres_4.js --osm ../data/osm.json --pib-count N
Without --osm there is no OSM data (all sites stay "low"). Sample CMFRI rows: data/sample_cmfri.js
Kannada names: data/names_kn.csv (code,name_kn). 18 filled so far; all need a native reader's review.
