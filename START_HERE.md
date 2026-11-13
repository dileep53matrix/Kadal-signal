# Kadal Signal — start here

This is the protected working copy of the Karnataka pilot. Keep the original ZIP unchanged as your backup.

## Requirements
- Windows 10/11
- Python 3.10 or newer
- A browser
- Internet connection for the Leaflet map tiles and live marine forecast requests

The API itself uses Python's standard library; no `pip install` is required for the current prototype.

## Run the project
1. Extract this ZIP to a folder you can find, for example `Desktop\\kadal-signal`.
2. Open that folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run:

   ```powershell
   cd app
   python server.py
   ```

5. Open `http://127.0.0.1:8000` in your browser.
6. Keep the terminal open while using the site. Press `Ctrl+C` to stop the server.

## Run the tests
Open a second VS Code terminal (leave the server running in the first terminal), then run:

```powershell
cd app
python test_step3.py
python test_step4.py
```

Both test scripts create temporary test databases. They do not overwrite `data/kadal.db`.

## Important limitations
- Wave thresholds in `data/signal_config.json` are placeholders, not official safety limits.
- A green status is not permission or a guarantee that it is safe to sail. We will redesign this status system before presenting it as a decision-support feature.
- The INCOIS alert in this prototype is manually entered; it is not a verified live integration.
- Kannada labels and landing-centre locations still need independent review.
- Do not collect real people's names, phone numbers, or sensitive location data in demo reports.

## First maintenance note
The Step 4 test now passes a fixed test time into the site-view function. This removes a test failure caused by comparing historical test data with the actual current clock. The production API continues to use the real current time by default.
