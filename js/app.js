// app.js

const App = {
    map: null,
    userLocation: null,
    isIdle: false,

    // London default coordinates
    defaultLocation: { lat: 51.5074, lon: -0.1278 },

    init: function () {
        console.log("App initializing...");
        if (ApiClient.init) ApiClient.init(); // Load credentials if any
        this.initMap();
        this.initUI();
        // this.requestLocation(); // Disabled per User Request
        this.startPolling(); // Start polling immediately for global view
    },

    initMap: function () {
        // Initialize map with a default view (Global)
        this.map = L.map('map', {
            zoomControl: false,
            attributionControl: false // Custom footer used
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Add Scale Control (Metric & Imperial) - User Request
        L.control.scale({
            metric: true,
            imperial: true,
            position: 'bottomleft'
        }).addTo(this.map);
    },

    initUI: function () {
        // Radius Slider removed (User Request)

        // Locate Me Button
        document.getElementById('btn-locate-me').addEventListener('click', () => {
            this.requestLocation();
        });


        // Manual Location Modal
        document.getElementById('btn-manual-submit').addEventListener('click', async () => {
            const city = document.getElementById('manual-city').value;
            const btn = document.getElementById('btn-manual-submit');

            if (!city) {
                alert("Please enter a city name.");
                return;
            }

            btn.textContent = "Searching...";
            btn.disabled = true;

            try {
                // Use Nominatim Open Source Geocoding
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);

                    this.setLocation(lat, lon);
                    document.getElementById('manual-location-modal').classList.add('hidden');
                } else {
                    alert("City not found. Please try another name.");
                }
            } catch (e) {
                console.error(e);
                alert("Error searching for city. Network issue?");
            } finally {
                btn.textContent = "Search & Go";
                btn.disabled = false;
            }
        });

        document.getElementById('btn-use-default').addEventListener('click', () => {
            this.setLocation(this.defaultLocation.lat, this.defaultLocation.lon);
            document.getElementById('manual-location-modal').classList.add('hidden');
        });

        // Login UI Events
        const loginModal = document.getElementById('login-modal');

        document.getElementById('btn-login-open').addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });

        document.getElementById('btn-login-cancel').addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });

        document.getElementById('btn-login-submit').addEventListener('click', () => {
            const u = document.getElementById('api-username').value;
            const p = document.getElementById('api-password').value;

            if (u && p) {
                ApiClient.setCredentials(u, p);
                loginModal.classList.add('hidden');
                document.getElementById('btn-login-open').textContent = "Fast Mode Active ✓";
                document.getElementById('btn-login-open').disabled = true;

                // Trigger immediate update
                this.pollData();
            } else {
                alert("Please enter both username and password.");
            }
        });

        // Side Panel Close
        document.getElementById('btn-close-panel').addEventListener('click', () => {
            if (AircraftRenderer.deselectAircraft) AircraftRenderer.deselectAircraft();
        });
    },

    requestLocation: function () {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.setLocation(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Geolocation denied or failed:", error);
                    // Show modal for manual input
                    document.getElementById('manual-location-modal').classList.remove('hidden');
                }
            );
        } else {
            // No geolocation support
            document.getElementById('manual-location-modal').classList.remove('hidden');
        }
    },

    setLocation: function (lat, lon) {
        this.userLocation = { lat, lon };
        console.log("Location set:", this.userLocation);

        this.map.setView([lat, lon], 10);

        // Add user marker
        L.circleMarker([lat, lon], {
            radius: 5,
            fillColor: "#00ffcc",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map).bindPopup("You are here");

        // Local Context Ring (High-Value Feature #1)
        // 50km visual range guide
        if (this.localContextRing) this.map.removeLayer(this.localContextRing);
        this.localContextRing = L.circle([lat, lon], {
            radius: 50000, // 50km
            color: '#00ffcc',
            dashArray: '10, 20',
            weight: 1,
            fill: false,
            opacity: 0.3,
            interactive: false
        }).addTo(this.map);

        this.startPolling();
    },

    startPolling: function () {
        if (this.pollInterval) clearInterval(this.pollInterval);

        let secondsSinceLastPoll = 0;
        const pollFrequency = 5; // User Request: 5s updates

        // Initial poll
        this.pollData();

        // Set up interval (check every second)
        this.pollInterval = setInterval(() => {
            secondsSinceLastPoll++;
            const remaining = Math.max(0, pollFrequency - secondsSinceLastPoll);

            // Update Timer UI
            const timerEl = document.getElementById('refresh-timer');
            if (this.isIdle) {
                timerEl.textContent = "";
            } else if (remaining > 0) {
                timerEl.textContent = `(${remaining}s)`;
            } else {
                timerEl.textContent = "(Updating...)";
            }

            // Poll logic
            // We use ApiClient.canPoll() which tracks real time, but we use this loop to trigger it
            if (!this.isIdle && ApiClient.canPoll()) {
                this.pollData();
                secondsSinceLastPoll = 0;
            }
        }, 1000);

        this.manageIdleState();
    },

    pollData: async function () {
        if (this.isIdle) return;

        // Check if ApiClient allows polling (rate limit check)
        if (!ApiClient.canPoll()) return;

        // NEW: specific request to use Map Bounds instead of fixed radius
        const bounds = this.map.getBounds();

        // Check zoom level - if too zoomed out, the bounding box might be too large
        // Restriction removed per User Request to see "all aircraft"
        /*
        if (this.map.getZoom() < 6) {
            this.updateStatus("Zoom in to see traffic", "idle");
            return;
        }
        */

        this.updateStatus("Fetching...", "active");

        const result = await ApiClient.getAircraftInBox(
            bounds.getNorth(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getWest()
        );

        if (result.error) {
            this.handleError(result.error, result.details);
        } else {
            this.updateStatus("Updated", "active");
            this.handleData(result.data);
        }
    },

    handleData: function (data) {
        // Toggle Toast if empty
        const toast = document.getElementById('no-data-toast');
        const countEl = document.getElementById('aircraft-count');

        if (!data || data.length === 0) {
            toast.classList.remove('hidden');
            toast.textContent = "No aircraft detected in this region.";
            if (countEl) countEl.textContent = "0 Aircraft";
        } else {
            toast.classList.add('hidden');
            if (countEl) countEl.textContent = `${data.length} Aircraft`;
        }

        // Send to Renderer
        if (typeof AircraftRenderer !== 'undefined' && AircraftRenderer.render) {
            AircraftRenderer.render(data, this.map);
        } else {
            console.log("Aircraft data received:", data.length, "planes");
        }
    },

    handleError: function (type, details) {
        const toast = document.getElementById('no-data-toast');
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-indicator');

        if (type === 'rate_limited_server') {
            toast.textContent = "Data temporarily unavailable (Rate Limit).";
            toast.classList.remove('hidden');
            statusText.textContent = "Rate Limited";
            statusDot.className = "status-dot error";
        } else if (type === 'auth_failed') {
            toast.textContent = "Login Failed: Invalid Username/Password.";
            toast.classList.remove('hidden');
            statusText.textContent = "Auth Error";
            statusDot.className = "status-dot error";
        } else if (type === 'ip_blocked') {
            toast.textContent = "Access Blocked: Proxy is banned. Try later.";
            toast.classList.remove('hidden');
            statusText.textContent = "Proxy Blocked";
            statusDot.className = "status-dot error";
        } else if (type === 'network_error') {
            toast.textContent = `Network Error (${details || 'Check Console'})`;
            toast.classList.remove('hidden');
            statusText.textContent = "Network Error";
            statusDot.className = "status-dot error";
        }
    },

    updateStatus: function (text, className) {
        document.getElementById('status-text').textContent = text;
        document.getElementById('status-indicator').className = `status-dot ${className}`;
    },

    manageIdleState: function () {
        let idleTimer;
        const resetIdle = () => {
            this.isIdle = false;
            this.updateStatus("Active", "active");
            clearTimeout(idleTimer);
            // Go idle after 60s of no interaction
            idleTimer = setTimeout(() => {
                this.isIdle = true;
                this.updateStatus("Idle (Paused)", "idle");
                console.log("App state: Idle");
            }, 60000);
        };

        // Reset on map move or interaction
        this.map.on('moveend', resetIdle);
        this.map.on('zoomend', resetIdle);
        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('keydown', resetIdle);

        // Page Visibility API
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isIdle = true;
                this.updateStatus("Background (Paused)", "idle");
            } else {
                resetIdle();
                // Trigger immediate poll on return
                this.pollData();
            }
        });

        resetIdle();
    },

    isValidCoordinate: function (lat, lon) {
        return !isNaN(lat) && !isNaN(lon) &&
            lat >= -90 && lat <= 90 &&
            lon >= -180 && lon <= 180;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
