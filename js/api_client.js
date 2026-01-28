// api_client.js

const ApiClient = {
    // URL for the Local Proxy Server (run: 'node server.js')
    // This solves CORS and allows authenticated 5s updates.
    baseUrl: 'http://localhost:3000',
    // Fallback public proxies (only used if local server is down - future enhancement)
    // For now we rely on the local server for stability.
    // proxies: [
    //     'https://corsproxy.io/?', // Often most reliable
    //     'https://api.allorigins.win/raw?url=',
    //     'https://api.codetabs.com/v1/proxy?quest='
    // ],
    // currentProxyIndex: 0,

    lastRequestTime: 0,
    minPollInterval: 5000,  // User Request: 5s updates
    authHeader: null,
    fallbackPoolInterval: 20000,

    // Limits
    maxBoxSizeDegrees: 180.0,

    init: function () {
        if (typeof CONFIG !== 'undefined' && CONFIG.username && CONFIG.password) {
            console.log("Auto-loading credentials from config.js");
            this.setCredentials(CONFIG.username, CONFIG.password);
        }
    },

    setCredentials: function (username, password) {
        if (username && password) {
            const hash = btoa(`${username}:${password}`);
            this.authHeader = `Basic ${hash}`;
            this.minPollInterval = 5000;
            console.log("Credentials set. Polling interval reduced to 5s.");
            return true;
        }
        return false;
    },

    // getProxyUrl: function () {
    //     return this.proxies[this.currentProxyIndex];
    // },

    // rotateProxy: function () {
    //     this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    //     console.warn(`Switching to proxy #${this.currentProxyIndex}: ${this.getProxyUrl()}`);
    // },

    // Simplified fetch for Local Proxy
    getAircraftInBox: async function (north, south, east, west) {
        if (!this.canPoll()) {
            console.log("Skipping poll (Rate limit protection)");
            return { error: 'rate_limited' };
        }

        const latDiff = Math.abs(north - south);
        const lonDiff = Math.abs(east - west);
        const timeParam = `&_=${Date.now()}`;
        let queryString;

        // Smart Query Switch:
        // If the view is "Large" (> 10 degrees), the OpenSky API often errors with "Area too large" 
        // if we try to bound it. In this case, it's safer to request the GLOBAL state (no bounds).
        // This is heavier (receives all planes), but ensures visibility when zoomed out.
        if (latDiff > 10 || lonDiff > 10) {
            console.log("View > 10°. Switching to Global Query (One request for all aircraft).");
            queryString = `?${timeParam.substring(1)}`; // Remove initial '&'
        } else {
            const clamped = this.clampBox(north, south, east, west);
            queryString = `?lamin=${clamped.south}&lomin=${clamped.west}&lamax=${clamped.north}&lomax=${clamped.east}${timeParam}`;
        }

        const url = this.baseUrl + queryString;

        try {
            // console.log(`Fetching via Local Proxy: ${url}`);

            const options = {};
            if (this.authHeader) {
                // Safe to force Auth buffer for local proxy
                options.headers = { 'Authorization': this.authHeader };
            }

            const response = await fetch(url, options);
            this.lastRequestTime = Date.now();

            if (response.status === 429) return { error: 'rate_limited_server' };

            if (response.status === 401) {
                return { error: 'auth_failed' };
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return {
                data: data.states || [],
                time: data.time
            };

        } catch (error) {
            console.error("Fetch Error:", error.message);
            // Hint for the user if local server is down
            if (error.message.includes("Failed to fetch")) {
                console.error("IS THE SERVER RUNNING? Run 'node server.js' in terminal.");
                return { error: 'network_error', details: "Is 'node server.js' running?" };
            }
            return { error: 'network_error', details: error.message };
        }
    },

    // Check if enough time has passed since last request
    canPoll: function () {
        const now = Date.now();
        return (now - this.lastRequestTime) >= this.minPollInterval;
    },

    // Ensure bounding box isn't too massive
    clampBox: function (n, s, e, w) {
        let latDiff = n - s;
        let lonDiff = e - w;

        // Simple clamping: if box is too big, shrink it around the center
        if (latDiff > this.maxBoxSizeDegrees || lonDiff > this.maxBoxSizeDegrees) {
            console.warn("Bounding box too large, clamping query.");
            const centerLat = (n + s) / 2;
            const centerLon = (e + w) / 2;
            const halfSize = this.maxBoxSizeDegrees / 2;

            return {
                north: Math.min(90, centerLat + halfSize),
                south: Math.max(-90, centerLat - halfSize),
                east: Math.min(180, centerLon + halfSize),
                west: Math.max(-180, centerLon - halfSize)
            };
        }

        return { north: n, south: s, east: e, west: w };
    },

    // Calculate bounding box from center and radius (km)
    // Very rough approximation: 1 deg lat ~= 111km. 1 deg lon varies.
    getBoundingBox: function (lat, lon, radiusKm) {
        const latDelta = radiusKm / 111;
        // Lon delta depends on latitude: 111 * cos(lat)
        const lonDelta = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));

        return {
            north: lat + latDelta,
            south: lat - latDelta,
            east: lon + lonDelta,
            west: lon - lonDelta
        };
    }
};
