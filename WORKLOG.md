# Kadal Signal working log

## Baseline setup
- Original uploaded ZIP retained unchanged.
- Extracted a separate working copy.
- Existing SQLite database was not modified.
- Python compilation check passed for the edited files.
- Step 3 tests: 23 passed, 0 failed.
- Step 4 tests: 36 passed, 0 failed.

## Small reliability fix
- `app/contribute.py`: allow a fixed `now` value to flow through `site_view`, `list_sites`, `get_site`, and `queue` to signal expiry evaluation.
- `app/test_step4.py`: pass the test's fixed `NOW` timestamp when asserting the site view's signal.
- Reason: the test generated a signal on 2026-11-10 but then queried it using the machine's current date, after the 12-hour validity window had expired.

## Next risks to address
- The alert endpoint currently permits changes when `KADAL_ADMIN_TOKEN` is not configured. This should fail closed for any shared/deployed demo.
- Green/amber/red wave thresholds are explicitly placeholders, not validated safety standards.
- Alert status is manually entered and statewide in the current prototype.
- Location/source confidence and Kannada labels need review.
