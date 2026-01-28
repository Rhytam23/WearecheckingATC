# Known Problems & Limitations

This document lists known issues, technical limitations, and areas for future improvement in the Local Airspace Visualizer.

## 🛑 API & Data Limitations

### 1. Rate Limiting (OpenSky Network)
*   **Problem:** The OpenSky API strictly limits anonymous requests.
*   **Symptom:** Aircraft stop moving or disappear for 10-20 seconds.
*   **Workaround:** Users can log in via the app settings to increase the rate limit (allows ~5s updates).

### 2. Data Latency
*   **Problem:** The free public data feed has a variable delay (often 10-60 seconds) compared to real-time.
*   **Impact:** Attempting to "spot" a plane visibly in the sky might fail if the data is lagging behind the physical aircraft.

### 3. "Area Too Large" Errors
*   **Problem:** Requesting a bounding box larger than a few degrees of latitude/longitude specifically fails with an OpenSky error.
*   **Mitigation:** The code (`api_client.js`) attempts to switch to a "Global" query when zoomed out, or clamps the box. This makes the query heavier and slower.

## ⚠️ Technical Challenges

### 1. CORS & Browser Security
*   **Problem:** Browsers block direct requests from `index.html` to `opensky-network.org` due to Cross-Origin Resource Sharing (CORS) policies.
*   **Current Solution:** We use a local Node.js proxy (`server.js`) to strip/add headers.
*   **Fragility:** If the user forgets to run `node server.js`, the app completely fails to load data.

### 2. No Offline Mode
*   **Problem:** The application requires an active internet connection for both the map tiles (OpenStreetMap) and aircraft data.
*   **Status:** No offline caching is currently implemented.

## 🔧 Future Enhancements (TODOs)

*   **Proxy Fallback:** `js/api_client.js` contains commented-out code for public CORS proxies. Implementing this would allow the app to work without `node server.js` (though less reliably).
*   **History/Trails:** Currently, no flight paths are drawn, only current positions.
*   **Better Error UI:** The "No Data" toast is generic. We could differentiate between "Network Error" vs "Empty Sky".
