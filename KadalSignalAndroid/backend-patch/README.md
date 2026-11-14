# Connect the Python API to Android on your local demo network

The latest uploaded `app/server.py` currently starts its HTTP server on `127.0.0.1`. That prevents an Android emulator or physical phone from reaching it.

## Minimal safe development change

In `app/server.py`, replace:

```python
def make_server(port=8000):
    db.init().close()
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)
```

with:

```python
def make_server(port=8000, host="0.0.0.0"):
    db.init().close()
    return ThreadingHTTPServer((host, port), Handler)
```

Then replace the final server startup call:

```python
server = make_server(port)
```

with:

```python
host = sys.argv[2] if len(sys.argv) > 2 else "0.0.0.0"
server = make_server(port, host)
```

Start it from the `app` folder:

```powershell
python server.py 8000 0.0.0.0
```

This keeps the server reachable on your laptop's network interfaces for the local hackathon demo. Do not port-forward it or expose it to the public internet.

## Why CORS does not need to be opened for this Android app

The Android app uses native `HttpURLConnection`, not browser JavaScript, so browser CORS restrictions do not apply to its API calls. Keep the website's existing CORS policy as restrictive as possible.

## Windows Firewall

If the phone cannot connect, allow Python on the Windows **Private** network profile. Do not disable Windows Firewall globally. Use a trusted Wi-Fi network and remove the rule after the demo if no longer needed.
