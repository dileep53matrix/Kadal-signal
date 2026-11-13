"""Type in what the INCOIS page says. Examples:
  python set_alert.py none --hours 12
  python set_alert.py active --hours 24 --note "INCOIS high wave alert, Karnataka coast"
  python set_alert.py status
Read it at https://incois.gov.in/site/services/Alerts.html (pick Karnataka). It is a JavaScript page, so a person has to read it."""
import argparse, db, lights
ap = argparse.ArgumentParser()
ap.add_argument("state", choices=["active", "none", "status"])
ap.add_argument("--hours", type=float, default=12)
ap.add_argument("--note")
a = ap.parse_args()
con = db.init()
print(lights.get_alert(con) if a.state == "status" else lights.set_alert(con, a.state, a.hours, a.note))
