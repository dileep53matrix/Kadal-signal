package com.kadalsignal.app

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val DeepSea = Color(0xFF073B3A)
private val Teal = Color(0xFF12A594)
private val Paper = Color(0xFFF3F7F5)
private val Ink = Color(0xFF173434)
private val Muted = Color(0xFF667D7A)

// Shared app language state. Tapping the Kannada chip toggles this value.
private val useKannada = mutableStateOf(false)
private fun tr(english: String, kannada: String): String =
    if (useKannada.value) kannada else english

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { KadalApp() }
    }
}

data class Site(
    val id: String,
    val name: String,
    val kannada: String,
    val district: String,
    val taluk: String,
    val lat: Double,
    val lon: Double,
    val signal: String,
    val reason: String,
    val wave: String,
    val confidence: String,
    val score: Int,
    val counted: Int,
    val total: Int,
    val facilities: JSONObject?
)

private object KadalApi {
    private val base get() = BuildConfig.API_BASE_URL.trimEnd('/')

    private fun request(
        path: String,
        method: String = "GET",
        body: JSONObject? = null
    ): String {
        val conn = URL(base + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 8000
            conn.readTimeout = 12000
            conn.setRequestProperty("Accept", "application/json")

            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty(
                    "Content-Type",
                    "application/json; charset=utf-8"
                )
                conn.outputStream.use {
                    it.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val responseText = stream?.bufferedReader()?.use { it.readText() } ?: "{}"

            if (code !in 200..299) {
                throw Exception(
                    JSONObject(responseText).optString("error", "HTTP $code")
                )
            }

            return responseText
        } finally {
            conn.disconnect()
        }
    }

    suspend fun sites(): List<Site> = withContext(Dispatchers.IO) {
        val arr = JSONArray(request("/api/sites"))

        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val sig = o.optJSONObject("signal") ?: JSONObject()
            val reports = o.optJSONObject("reports") ?: JSONObject()

            Site(
                id = o.optString("id"),
                name = o.optString("name", "Unnamed centre"),
                kannada = o.optString("name_kn"),
                district = o.optString("district"),
                taluk = o.optString("taluk"),
                lat = o.optDouble("lat", 0.0),
                lon = o.optDouble("lon", 0.0),
                signal = sig.optString("color", "grey").lowercase(),
                reason = sig.optString(
                    "reason_en",
                    "No current signal is available."
                ),
                wave = if (sig.isNull("max_wave_m")) {
                    "—"
                } else {
                    "${sig.optDouble("max_wave_m")} m"
                },
                confidence = o.optString("confidence_label", "unverified"),
                score = o.optInt("confidence_score"),
                counted = reports.optInt("counted"),
                total = reports.optInt("total"),
                facilities = o.optJSONObject("facilities")
            )
        }
    }

    suspend fun alert(): JSONObject = withContext(Dispatchers.IO) {
        JSONObject(request("/api/alert"))
    }

    suspend fun contribute(
        siteId: String,
        reporter: String,
        facilities: JSONObject
    ): JSONObject = withContext(Dispatchers.IO) {
        JSONObject(
            request(
                "/api/sites/$siteId/contributions",
                "POST",
                JSONObject()
                    .put("reporter_id", reporter)
                    .put("facilities", facilities)
            )
        )
    }
}

@Composable
fun KadalApp() {
    var sites by remember { mutableStateOf<List<Site>>(emptyList()) }
    var alert by remember {
        mutableStateOf(JSONObject().put("state", "unknown"))
    }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var tab by remember { mutableIntStateOf(0) }
    var selected by remember { mutableStateOf<Site?>(null) }
    var refreshKey by remember { mutableIntStateOf(0) }

    // One WebView for the whole app session, reused every time the map tab opens.
    val context = LocalContext.current
    val mapView = remember { createMapWebView(context) }
    DisposableEffect(Unit) {
        onDispose {
            (mapView.parent as? ViewGroup)?.removeView(mapView)
            mapView.destroy()
        }
    }

    LaunchedEffect(refreshKey) {
        loading = true
        error = ""
        try {
            sites = KadalApi.sites()
            alert = KadalApi.alert()
        } catch (e: Exception) {
            error = e.message ?: "Unable to connect to Kadal Signal API"
        }
        loading = false
    }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = DeepSea,
            secondary = Teal,
            background = Paper,
            surface = Color.White
        )
    ) {
        Scaffold(
            containerColor = Paper,
            bottomBar = {
                NavigationBar(containerColor = Color.White) {
                    NavigationBarItem(
                        selected = tab == 0,
                        onClick = { tab = 0 },
                        icon = { Icon(Icons.Default.Home, null) },
                        label = { Text(tr("Home", "ಮುಖಪುಟ")) }
                    )
                    NavigationBarItem(
                        selected = tab == 1,
                        onClick = { tab = 1 },
                        icon = { Icon(Icons.Default.Map, null) },
                        label = { Text(tr("Coast map", "ಕರಾವಳಿ ನಕ್ಷೆ")) }
                    )
                    NavigationBarItem(
                        selected = tab == 2,
                        onClick = { tab = 2 },
                        icon = { Icon(Icons.Default.AddLocationAlt, null) },
                        label = { Text(tr("Report", "ವರದಿ")) }
                    )
                    NavigationBarItem(
                        selected = tab == 3,
                        onClick = { tab = 3 },
                        icon = { Icon(Icons.Default.Info, null) },
                        label = { Text(tr("About", "ಕುರಿತು")) }
                    )
                }
            }
        ) { padding ->
            when (tab) {
                0 -> HomeScreen(
                    Modifier.padding(padding),
                    sites,
                    alert,
                    loading,
                    error,
                    selected,
                    onSelect = { selected = it },
                    onRefresh = { refreshKey++ },
                    onMap = { tab = 1 }
                )

                1 -> MapScreen(
                    Modifier.padding(padding),
                    sites,
                    mapView,
                    onSelect = { selected = it; tab = 0 }
                )

                2 -> ReportScreen(
                    Modifier.padding(padding),
                    sites,
                    selected,
                    onDone = { refreshKey++; tab = 0 }
                )

                else -> AboutScreen(Modifier.padding(padding))
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
private fun createMapWebView(context: Context): WebView {
    WebView.setWebContentsDebuggingEnabled(true)
    return WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.loadWithOverviewMode = false
        settings.useWideViewPort = false
        setBackgroundColor(android.graphics.Color.parseColor("#E8F1EF"))
        webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                android.util.Log.e(
                    "KadalMap",
                    "JS: ${consoleMessage.message()} -- line ${consoleMessage.lineNumber()}"
                )
                return true
            }
        }
        webViewClient = object : WebViewClient() {
            override fun onPageStarted(
                view: WebView,
                url: String?,
                favicon: android.graphics.Bitmap?
            ) {
                android.util.Log.e("KadalMap", "Page started: $url")
            }

            override fun onPageFinished(view: WebView, url: String?) {
                android.util.Log.e(
                    "KadalMap",
                    "Page finished: $url, size=${view.width}x${view.height}"
                )
            }

            override fun onReceivedError(
                view: WebView,
                request: android.webkit.WebResourceRequest,
                error: android.webkit.WebResourceError
            ) {
                android.util.Log.e(
                    "KadalMap",
                    "Web error: ${request.url} ${error.description}"
                )
            }

            override fun onReceivedHttpError(
                view: WebView,
                request: android.webkit.WebResourceRequest,
                errorResponse: android.webkit.WebResourceResponse
            ) {
                android.util.Log.e(
                    "KadalMap",
                    "HTTP ${errorResponse.statusCode}: ${request.url}"
                )
            }

            override fun onRenderProcessGone(
                view: WebView,
                detail: android.webkit.RenderProcessGoneDetail
            ): Boolean {
                android.util.Log.e(
                    "KadalMap",
                    "WebView renderer died. crashed=${detail.didCrash()}"
                )
                return true
            }
        }
    }
}

@Composable
private fun Header() {
    Row(
        Modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(
                    listOf(Color(0xFF062F31), Color(0xFF0B5A52))
                )
            )
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(46.dp)
                .background(Color.White.copy(alpha = .13f), RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text("🌊", fontSize = 25.sp)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                "KADAL SIGNAL",
                color = Color.White,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 19.sp,
                letterSpacing = 1.sp
            )
            Text(
                tr("Karnataka Coastal Safety", "ಕರ್ನಾಟಕ ಕರಾವಳಿ ಸುರಕ್ಷತೆ"),
                color = Color(0xFFB8D9D3),
                fontSize = 11.sp
            )
        }
        Text(
            if (useKannada.value) "English" else "ಕನ್ನಡ",
            color = Color.White,
            fontSize = 12.sp,
            modifier = Modifier
                .background(Color.White.copy(alpha = .12f), CircleShape)
                .clickable { useKannada.value = !useKannada.value }
                .padding(horizontal = 12.dp, vertical = 8.dp)
        )
    }
}

@Composable
private fun HomeScreen(
    modifier: Modifier,
    sites: List<Site>,
    alert: JSONObject,
    loading: Boolean,
    error: String,
    selected: Site?,
    onSelect: (Site) -> Unit,
    onRefresh: () -> Unit,
    onMap: () -> Unit
) {
    Column(modifier.fillMaxSize()) {
        Header()
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            tr("Coastal situation", "ಕರಾವಳಿ ಪರಿಸ್ಥಿತಿ"),
                            fontSize = 23.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink
                        )
                        Text(
                            tr("Know the sea-state signal before heading out.", "ಸಮುದ್ರಕ್ಕೆ ತೆರಳುವ ಮೊದಲು ಸಮುದ್ರ ಸ್ಥಿತಿಯ ಸೂಚನೆಯನ್ನು ತಿಳಿಯಿರಿ."),
                            fontSize = 12.sp,
                            color = Muted
                        )
                    }
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, "Refresh", tint = DeepSea)
                    }
                }
            }

            if (error.isNotBlank()) item { ErrorCard(error) }
            if (loading) {
                item {
                    LinearProgressIndicator(
                        Modifier.fillMaxWidth(),
                        color = Teal
                    )
                }
            }

            item { AlertCard(alert) }
            if (selected != null) item { SiteDetailCard(selected) }

            item {
                val reds = sites.count { it.signal == "red" }
                val verified = sites.count {
                    it.confidence.equals("verified", true)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard("${sites.size}", "Landing centres", Modifier.weight(1f))
                    StatCard("$verified", "Verified", Modifier.weight(1f))
                    StatCard("$reds", "Red signals", Modifier.weight(1f))
                }
            }

            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        tr("Explore the coast", "ಕರಾವಳಿಯನ್ನು ಅನ್ವೇಷಿಸಿ"),
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = Ink,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = onMap) {
                        Text(tr("Open map →", "ನಕ್ಷೆ ತೆರೆಯಿರಿ →"))
                    }
                }
            }

            items(sites.take(12), key = { it.id }) { site ->
                SiteCard(site, onClick = { onSelect(site) })
            }

            item { Disclaimer() }
        }
    }
}

@Composable
private fun SiteDetailCard(site: Site) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Text(
                "SELECTED LANDING CENTRE",
                fontSize = 10.sp,
                color = Muted,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Text(
                site.name,
                fontSize = 18.sp,
                color = Ink,
                fontWeight = FontWeight.Bold
            )
            Text(
                listOf(site.taluk, site.district, site.id)
                    .filter { it.isNotBlank() }
                    .joinToString(" · "),
                fontSize = 11.sp,
                color = Muted
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(10.dp)
                        .background(signalColor(site.signal), CircleShape)
                )
                Spacer(Modifier.width(7.dp))
                Text(
                    "${site.signal.uppercase()} SIGNAL",
                    color = signalColor(site.signal),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
                Spacer(Modifier.weight(1f))
                Text("Wave: ${site.wave}", color = Ink, fontSize = 12.sp)
            }
            Text(site.reason, color = Muted, fontSize = 12.sp)
            Text(
                "Atlas confidence: ${site.score}/100 · ${site.confidence}  |  Reports: ${site.counted}/${site.total}",
                color = Muted,
                fontSize = 10.sp
            )
        }
    }
}

@Composable
private fun StatCard(
    value: String,
    label: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(15.dp)
    ) {
        Column(Modifier.padding(13.dp)) {
            Text(
                value,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = DeepSea
            )
            Text(label, fontSize = 10.sp, color = Muted, lineHeight = 13.sp)
        }
    }
}

@Composable
private fun AlertCard(alert: JSONObject) {
    val state = alert.optString("state", "unknown")
    val active = state == "active"
    val confirmedNone = state == "none"

    val bg = when {
        active -> Color(0xFFFFE8E5)
        confirmedNone -> Color(0xFFE7F4EF)
        else -> Color(0xFFFFF4DE)
    }

    val fg = when {
        active -> Color(0xFFB52F2A)
        confirmedNone -> Color(0xFF08754F)
        else -> Color(0xFF8A5A0A)
    }

    val title = when {
        active -> "Active high-wave alert"
        confirmedNone -> "No active INCOIS alert recorded"
        else -> "INCOIS alert status is unknown"
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = bg),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(15.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                if (active) Icons.Default.Warning else Icons.Default.Info,
                null,
                tint = fg,
                modifier = Modifier.size(28.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, fontWeight = FontWeight.Bold, color = fg)
                Text(
                    alert.optString("note", "Always check current official advisories."),
                    fontSize = 11.sp,
                    color = Ink
                )
            }
        }
    }
}

@Composable
private fun SiteCard(site: Site, onClick: () -> Unit) {
    val c = signalColor(site.signal)

    Card(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(15.dp)
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(12.dp).background(c, CircleShape))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(site.name, fontWeight = FontWeight.SemiBold, color = Ink)
                Text(
                    listOf(site.taluk, site.district)
                        .filter { it.isNotBlank() }
                        .joinToString(" · "),
                    fontSize = 11.sp,
                    color = Muted
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    site.signal.uppercase(),
                    color = c,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(site.wave, color = Muted, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun MapScreen(
    modifier: Modifier,
    sites: List<Site>,
    mapView: WebView,
    onSelect: (Site) -> Unit
) {
    var query by remember { mutableStateOf("") }

    val filtered = sites.filter {
        it.name.contains(query, true) ||
                it.district.contains(query, true) ||
                it.id.contains(query, true)
    }

    Column(modifier.fillMaxSize()) {
        Header()

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            placeholder = { Text(tr("Search landing centre or district", "ಮೀನು ಇಳಿಸುವ ಕೇಂದ್ರ ಅಥವಾ ಜಿಲ್ಲೆಯನ್ನು ಹುಡುಕಿ")) },
            leadingIcon = { Icon(Icons.Default.Search, null) },
            singleLine = true
        )

        if (sites.isNotEmpty()) {
            AndroidView(
                factory = {
                    (mapView.parent as? ViewGroup)?.removeView(mapView)
                    mapView
                },
                update = { view ->
                    view.onResume()
                    if (view.tag != sites.size) {
                        view.tag = sites.size
                        view.loadDataWithBaseURL(
                            "https://cdnjs.cloudflare.com/",
                            mapHtml(sites),
                            "text/html",
                            "UTF-8",
                            null
                        )
                    } else {
                        view.evaluateJavascript(
                            "if (window.kadalMap) { window.kadalMap.invalidateSize(true); }",
                            null
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )
        } else {
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "Map data will appear when the API connects.",
                    color = Muted
                )
            }
        }

        Text(
            "${tr("LANDING CENTRES", "ಮೀನು ಇಳಿಸುವ ಕೇಂದ್ರಗಳು")} · ${filtered.size}",
            Modifier.padding(start = 16.dp, top = 10.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Muted
        )

        LazyColumn(
            Modifier.heightIn(max = 180.dp),
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            items(filtered.take(20), key = { it.id }) { site ->
                SiteCard(site) { onSelect(site) }
            }
        }
    }
}

private fun mapHtml(sites: List<Site>): String {
    val points = JSONArray()

    sites.filter { site ->
        site.lat != 0.0 && site.lon != 0.0 &&
                site.lat.isFinite() && site.lon.isFinite()
    }.forEach { site ->
        points.put(
            JSONObject()
                .put("id", site.id)
                .put("name", site.name)
                .put("lat", site.lat)
                .put("lon", site.lon)
                .put("color", site.signal)
        )
    }

    val json = points.toString()

    return """
        <!doctype html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css">
            <style>
                html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background: #e8f1ef;
                }
                               #map {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #e8f1ef;
                }
                                #map.leaflet-container {
                                    position: absolute;
                                }
                #map-status {
                    display: none;
                    position: absolute;
                    z-index: 10000;
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    padding: 10px;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #173434;
                    font: 13px sans-serif;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <div id="map-status"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
            <script>
                (function () {
                    const points = $json;
                    const status = document.getElementById('map-status');

                    function showStatus(message) {
                        status.textContent = message;
                        status.style.display = 'block';
                    }

                    window.addEventListener('error', function (e) {
                        showStatus('Script error: ' + e.message);
                    }, true);

                    setTimeout(function () {
    var imgs = document.querySelectorAll('img.leaflet-tile');
    var loaded = 0, broken = 0;
    imgs.forEach(function (i) {
        if (i.complete && i.naturalWidth > 0) loaded++;
        else if (i.complete) broken++;
    });
    var first = imgs.length ? imgs[0].src : 'none';
    var m = document.getElementById('map');
                           showStatus('map=' + m.clientWidth + 'x' + m.clientHeight +
                            ' win=' + window.innerWidth + 'x' + window.innerHeight +
                            ' ok=' + loaded);
}, 4000);

                    try {
                        var mapEl = document.getElementById('map');
                        mapEl.style.position = 'absolute';
                        mapEl.style.left = '0px';
                        mapEl.style.top = '0px';
                        mapEl.style.width = window.innerWidth + 'px';
                        mapEl.style.height = window.innerHeight + 'px';

                        if (typeof L === 'undefined') {
        throw new Error('Leaflet did not load. Check the internet connection.');
    }

    const map = window.kadalMap = L.map('map', {
        zoomControl: true,
        preferCanvas: true
    }).setView([14.15, 74.9], 7);

    const tiles = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 18,
            attribution: '© OpenStreetMap'
        }
    );

                        tiles.on('tileerror', function () {
                            showStatus('Some map tiles could not load. Check your internet connection.');
                        });
                        tiles.addTo(map);

                        const colors = {
                            green: '#15966b',
                            amber: '#e8a22a',
                            red: '#d94b45',
                            grey: '#84918f'
                        };
                        const bounds = [];

                        points.forEach(function (point) {
                            const lat = Number(point.lat);
                            const lon = Number(point.lon);
                            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                            const signal = String(point.color || 'grey').toLowerCase();
                            const markerColor = colors[signal] || colors.grey;

                            L.circleMarker([lat, lon], {
                                radius: 7,
                                color: '#ffffff',
                                weight: 2,
                                fillColor: markerColor,
                                fillOpacity: 1
                            })
                            .addTo(map)
                            .bindPopup(
                                '<b>' + String(point.name || 'Landing Centre').replace(/[<>]/g, '') +
                                '</b><br>' + signal.toUpperCase()
                            );

                            bounds.push([lat, lon]);
                        });

                        if (bounds.length > 0) {
                            map.fitBounds(bounds, { padding: [20, 20] });
                        }

                        setTimeout(function () { map.invalidateSize(true); }, 500);
                        setTimeout(function () { map.invalidateSize(true); }, 1200);
                    } catch (error) {
                        console.error('Kadal Signal map initialization failed:', error);
                        showStatus('Map error: ' + error.message);
                    }
                })();
            </script>
        </body>
        </html>
    """.trimIndent()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportScreen(
    modifier: Modifier,
    sites: List<Site>,
    selected: Site?,
    onDone: () -> Unit
) {
    var chosen by remember(selected) {
        mutableStateOf(selected?.id ?: sites.firstOrNull()?.id.orEmpty())
    }
    var reporter by remember { mutableStateOf("") }
    var ice by remember { mutableStateOf(false) }
    var fuel by remember { mutableStateOf(false) }
    var shelter by remember { mutableStateOf(false) }
    var auction by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }

    Column(modifier.fillMaxSize()) {
        Header()

        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text(
                    "Community report",
                    fontSize = 23.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )
                Text(
                    "Help verify facilities at a coastal landing centre.",
                    color = Muted,
                    fontSize = 12.sp
                )
            }

            item {
                var expanded by remember { mutableStateOf(false) }

                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it }
                ) {
                    OutlinedTextField(
                        value = sites.find { it.id == chosen }?.name
                            ?: "Select a centre",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(tr("Landing centre", "ಮೀನು ಇಳಿಸುವ ಕೇಂದ್ರ")) },
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )

                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        sites.forEach { site ->
                            DropdownMenuItem(
                                text = { Text(site.name) },
                                onClick = {
                                    chosen = site.id
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    reporter,
                    { reporter = it },
                    Modifier.fillMaxWidth(),
                    label = { Text(tr("Made-up reporter ID", "ಕಲ್ಪಿತ ವರದಿಗಾರರ ಗುರುತು")) },
                    placeholder = { Text(tr("e.g. fisher-demo-02", "ಉದಾ. fisher-demo-02")) },
                    singleLine = true
                )
            }

            item {
                Text(
                    "Which facilities are available?",
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )
            }

            item {
                Column {
                    FacilityCheck("Ice", ice) { ice = it }
                    FacilityCheck("Fuel", fuel) { fuel = it }
                    FacilityCheck("Shelter", shelter) { shelter = it }
                    FacilityCheck("Auction", auction) { auction = it }
                }
            }

            item {
                Text(
                    "Use a made-up ID only. Never enter your name or phone number. A second matching report is needed for verification.",
                    color = Muted,
                    fontSize = 11.sp
                )
            }

            item {
                Button(
                    onClick = {
                        if (chosen.isBlank() || reporter.trim().isEmpty()) {
                            message = "Choose a centre and enter a made-up reporter ID."
                            isError = true
                        } else {
                            busy = true
                            message = ""
                        }
                    },
                    enabled = !busy && sites.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = DeepSea
                    )
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            Modifier.size(18.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.Send, null)
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(tr("Submit report", "ವರದಿ ಸಲ್ಲಿಸಿ"))
                }

                LaunchedEffect(busy) {
                    if (busy) {
                        try {
                            val result = KadalApi.contribute(
                                chosen,
                                reporter.trim(),
                                JSONObject()
                                    .put("ice", ice)
                                    .put("fuel", fuel)
                                    .put("shelter", shelter)
                                    .put("auction", auction)
                            )
                            message = result.optString("message", "Report saved.")
                            isError = false
                        } catch (e: Exception) {
                            message = e.message ?: "Submission failed"
                            isError = true
                        }
                        busy = false
                    }
                }
            }

            if (message.isNotBlank()) {
                item {
                    Text(
                        message,
                        color = if (isError) {
                            Color(0xFFB52F2A)
                        } else {
                            Color(0xFF08754F)
                        },
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            item { Disclaimer() }
        }
    }
}

@Composable
private fun FacilityCheck(
    label: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(
            checked,
            onChange,
            colors = CheckboxDefaults.colors(checkedColor = Teal)
        )
        Text(label, color = Ink)
    }
}

@Composable
private fun AboutScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize()) {
        Header()
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                tr("About Kadal Signal", "ಕಡಲ್ ಸಿಗ್ನಲ್ ಕುರಿತು"),
                fontSize = 23.sp,
                fontWeight = FontWeight.Bold,
                color = Ink
            )
            Text(
                "A Karnataka coastal landing-centre atlas and experimental sea-state decision-support prototype.",
                color = Muted
            )
            InfoLine(
                "🌊",
                tr("Coastal atlas", "ಕರಾವಳಿ ಅಟ್ಲಾಸ್"),
                tr("Explore fishing landing centres and their locations.", "ಮೀನು ಇಳಿಸುವ ಕೇಂದ್ರಗಳು ಮತ್ತು ಅವುಗಳ ಸ್ಥಳಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.")
            )
            InfoLine(
                "🛟",
                tr("Safety signals", "ಸುರಕ್ಷತಾ ಸೂಚನೆಗಳು"),
                tr("Green, amber, red and unavailable indicators based on available forecast and alert inputs.", "ಲಭ್ಯವಿರುವ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳ ಆಧಾರದ ಮೇಲೆ ಹಸಿರು, ಹಳದಿ, ಕೆಂಪು ಮತ್ತು ಲಭ್ಯವಿಲ್ಲದ ಸೂಚನೆಗಳು.")
            )
            InfoLine(
                "🤝",
                tr("Community verification", "ಸಮುದಾಯ ಪರಿಶೀಲನೆ"),
                tr("Reports from different contributors help validate site facilities.", "ವಿವಿಧ ಬಳಕೆದಾರರ ವರದಿಗಳು ಸ್ಥಳದ ಸೌಲಭ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ.")
            )
            Disclaimer()
        }
    }
}

@Composable
private fun InfoLine(icon: String, title: String, body: String) {
    Row(verticalAlignment = Alignment.Top) {
        Text(icon, fontSize = 24.sp)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, color = Ink)
            Text(body, fontSize = 12.sp, color = Muted)
        }
    }
}

@Composable
private fun ErrorCard(message: String) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFFFE8E5)
        )
    ) {
        Column(Modifier.padding(13.dp)) {
            Text(
                "Can't reach the Kadal Signal server",
                fontWeight = FontWeight.Bold,
                color = Color(0xFFB52F2A)
            )
            Text(message, fontSize = 11.sp, color = Ink)
            Text(
                "Check that the Python server is running and the API address is correct.",
                fontSize = 11.sp,
                color = Ink
            )
        }
    }
}

@Composable
private fun Disclaimer() {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFFFF6E4)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            "IMPORTANT: Kadal Signal is an experimental decision-support prototype, not an official fishing, weather or navigation advisory. Always follow official IMD, INCOIS and fisheries-department advisories. Forecasts and cached data may be delayed.",
            Modifier.padding(12.dp),
            fontSize = 10.sp,
            color = Color(0xFF73531C),
            lineHeight = 15.sp
        )
    }
}

private fun signalColor(signal: String): Color =
    when (signal.lowercase()) {
        "green" -> Color(0xFF15966B)
        "amber" -> Color(0xFFE8A22A)
        "red" -> Color(0xFFD94B45)
        else -> Color(0xFF84918F)
    }