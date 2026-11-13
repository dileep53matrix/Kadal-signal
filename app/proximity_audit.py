
import sqlite3
from math import radians, sin, cos, sqrt, atan2
from itertools import combinations

db = sqlite3.connect("../data/kadal.db")
sites = db.execute(
    "SELECT cmfri_code, name, lat, lon FROM sites"
).fetchall()
db.close()

def distance(a, b):
    R = 6371000
    lat1, lon1, lat2, lon2 = map(
        radians, [a[2], a[3], b[2], b[3]]
    )
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2 * R * atan2(sqrt(h), sqrt(1-h))

print("Total sites:", len(sites))
print("\nPairs within 500 metres:")

count = 0
for a, b in combinations(sites, 2):
    d = distance(a, b)
    if d < 500:
        count += 1
        print(
            f"{d:.1f} m | {a[0]} {a[1]} | {b[0]} {b[1]}"
        )

print("\nTotal nearby pairs:", count)
