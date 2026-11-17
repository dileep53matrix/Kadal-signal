# Kadal Signal Android — Hackathon build

Native Android starter for the current Kadal Signal Python API.

## What is included
- Kotlin + Jetpack Compose dashboard
- Live reads from `GET /api/sites` and `GET /api/alert`
- Site list with signal colour, wave value, district/taluk, confidence and report counts
- Coastal map rendered with Leaflet inside Android WebView (internet required for map tiles)
- Community facilities report using `POST /api/sites/{id}/contributions`
- Clear warning treatment when the INCOIS alert state is unknown (unknown is not presented as safe)

## Open in Android Studio
1. Extract this folder.
2. Android Studio → **Open** → choose `KadalSignalAndroid`.
3. Wait for Gradle Sync.
4. Select an emulator and press Run.

Use JDK 17. If Android Studio asks to install Android SDK 35 or Android Gradle Plugin components, accept the installation.

## Run your current Python backend
Use your **updated** `kadal-signal` working folder, not the old ZIP.

1. Open a terminal in the updated project folder.
2. Start the API from its `app` folder after applying the small host-binding change in `backend-patch/README.md`.
3. Keep the Python terminal running while testing Android.

The current uploaded `app/server.py` binds to `127.0.0.1`, which is reachable only from the laptop itself. The Android emulator/phone cannot connect to that loopback address.

## Configure the Android API URL

### Android Studio emulator
The default is already configured:
`http://10.0.2.2:8000`

`10.0.2.2` is the special address that lets the Android emulator reach the development host computer.

### Physical Android phone
1. Connect the phone and laptop to the same trusted Wi-Fi network.
2. Find the laptop's IPv4 address using `ipconfig` on Windows.
3. In `app/build.gradle.kts`, change the default API URL from `http://10.0.2.2:8000` to `http://YOUR-LAPTOP-IP:8000`, OR add this line to the project's `gradle.properties`:
   `KADAL_API_BASE_URL=http://YOUR-LAPTOP-IP:8000`
4. Allow Python through Windows Firewall for the **Private** network only.
5. Rebuild/run the app.

Do not use `127.0.0.1` or `localhost` as the phone's API URL: on the phone those refer to the phone itself.

## Quick connection check
On the laptop, open:
`http://127.0.0.1:8000/api/sites`

On the phone browser, open:
`http://YOUR-LAPTOP-IP:8000/api/sites`

If the phone browser cannot open the endpoint, fix the server bind/firewall/Wi-Fi first. The Android app cannot work until this succeeds.

## Important project limitations
- This is a hackathon prototype, not a certified marine navigation or official fishing advisory.
- The INCOIS alert state is manually entered in the current backend; it is not a verified live INCOIS integration.
- The wave thresholds are placeholders and must not be interpreted as validated safety limits.
- A `green` signal is not clearance or a guarantee that conditions are safe.
- Reporter IDs are self-declared. The backend explicitly does not independently verify contributor identity.
- The report screen currently sends the facility selections and made-up reporter ID; it does not collect GPS coordinates. Review the backend's distance-counting behavior before treating submitted reports as geographically verified.
- Do not expose the Python development server directly to the public internet. Use only a trusted local demo network.

## Build APK
Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The debug APK is normally created under:
`app/build/outputs/apk/debug/app-debug.apk`

This project archive has not been built on your specific Android Studio installation. Resolve any SDK/Gradle prompts shown by Android Studio before the demo.
