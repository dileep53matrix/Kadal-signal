"""Fills a few made-up reports so the demo has something to show (made-up ids only, no personal data)."""
import db, contribute
from contribute import ApiError

F1 = {"ice": True, "fuel": True, "shelter": True, "auction": True}
F2 = {"ice": True, "fuel": False, "shelter": True, "auction": False}
F3 = {"ice": False, "fuel": False, "shelter": True, "auction": False}
DEMO = [("KR069", "demo-fisher-1", F1), ("KR069", "demo-coop-2", F1),        # Malpe: verified
        ("KR007", "demo-fisher-3", F2),                                      # Karwar: waiting
        ("KR090", "demo-fisher-4", F1), ("KR090", "demo-fisher-5", F3)]      # Mangalore: conflict

con = db.init()
for code, who, fac in DEMO:
    try:
        r = contribute.add_contribution(con, code, who, fac)
        print(f"{code} {who:<14} -> {r['status']}")
    except ApiError as e:
        print(f"{code} {who:<14} skipped: {e.message}")
