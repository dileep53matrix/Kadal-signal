
import json
import csv
import urllib.request

url = "http://127.0.0.1:8000/api/sites"

with urllib.request.urlopen(url) as response:
    data = json.loads(response.read().decode("utf-8"))

sites = data.get("sites", []) if isinstance(data, dict) else data

missing = [
    site for site in sites
    if not site.get("name_kn")
]

with open(
    "missing_kannada_names.csv",
    "w",
    newline="",
    encoding="utf-8-sig"
) as file:
    writer = csv.writer(file)
    writer.writerow(["CMFRI Code", "English Name", "District", "Taluk", "Kannada Name"])

    for site in missing:
        writer.writerow([
            site.get("id"),
            site.get("name"),
            site.get("district"),
            site.get("taluk"),
            ""
        ])

print("Missing Kannada names exported:", len(missing))
print("File: missing_kannada_names.csv")
