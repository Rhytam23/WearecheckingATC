// aircraft_renderer.js
const AircraftRenderer = {
    markers: {}, // Hash map of ICAO24 -> Leaflet Marker
    markerData: {}, // Store flight data for side panel
    pathHistory: {}, // Store historical positions for trails
    selectedIcao: null, // Currently selected aircraft
    selectedPathPolyline: null, // Leaflet Polyline for selected aircraft

    // Icon Configuration
    planeIcon: L.divIcon({
        className: 'plane-marker-container',
        html: '<div class="plane-marker">✈</div>', // Simple unicode plane, rotated via CSS
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    }),

    render: function (data, map) {
        const currentIcaos = new Set();
        let renderData = data;

        // PERFORMANCE LIMIT: 
        // If > 750 aircraft, only render a subset to prevent browser freeze.
        // We prioritize the Selected Aircraft + High Velocity planes (interesting traffic).
        if (data.length > 750) {
            console.warn(`[Renderer] High Traffic (${data.length}). Capping to 750.`);

            // Show toast if available
            const toast = document.getElementById('no-data-toast');
            if (toast) {
                toast.textContent = `High Traffic: Showing 750 of ${data.length} aircraft`;
                toast.classList.remove('hidden');
                setTimeout(() => toast.classList.add('hidden'), 3000);
            }

            // Sort by velocity (fastest first) as a heuristic for "interesting" jets vs small planes
            // Copy array to avoid mutating original if needed elsewhere
            let sorted = [...data].sort((a, b) => (b[9] || 0) - (a[9] || 0));

            // Ensure selected aircraft is included if it exists
            if (this.selectedIcao) {
                const selected = data.find(f => f[0] === this.selectedIcao);
                if (selected) {
                    sorted = [selected, ...sorted.filter(f => f[0] !== this.selectedIcao)];
                }
            }

            renderData = sorted.slice(0, 750);
        }

        renderData.forEach(flight => {
            // OpenSky State Vector indices:
            // 0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact,
            // 5: longitude, 6: latitude, 7: baro_altitude, 8: on_ground, 9: velocity, 10: true_track
            // 11: vertical_rate, 12: sensors, 13: geo_altitude, 14: squawk, 15: spi, 16: position_source

            const icao24 = flight[0];
            const callsign = flight[1] ? flight[1].trim() : 'N/A';
            const origin_country = flight[2];
            const last_contact = flight[4];
            const lon = flight[5];
            const lat = flight[6];
            const alt = flight[7]; // baro
            const on_ground = flight[8]; // boolean
            const velocity = flight[9];
            const heading = flight[10];
            const vertical_rate = flight[11];
            const geo_altitude = flight[13];
            const squawk = flight[14];
            const position_source = flight[16];

            // Skip if no position
            if (lat === null || lon === null) return;

            currentIcaos.add(icao24);

            // Bundle data
            const fullData = {
                callsign, origin_country, last_contact, lon, lat, alt, on_ground,
                velocity, heading, vertical_rate, geo_altitude, squawk, position_source
            };

            // Update History
            if (!this.pathHistory[icao24]) this.pathHistory[icao24] = [];
            const history = this.pathHistory[icao24];
            // Only add if position changed significantly to avoid jitter
            const lastPos = history.length > 0 ? history[history.length - 1] : null;
            if (!lastPos || lastPos[0] !== lat || lastPos[1] !== lon) {
                history.push([lat, lon]);
                if (history.length > 50) history.shift(); // Keep last 50 points
            }

            if (this.markers[icao24]) {
                // UPDATE existing marker
                this.updateMarker(this.markers[icao24], fullData, map);
            } else {
                // CREATE new marker
                this.createMarker(icao24, fullData, map);
            }
        });

        // Cleanup old markers
        this.cleanup(currentIcaos, map);
    },

    createMarker: function (icao, data, map) {
        const marker = L.marker([data.lat, data.lon], {
            icon: this.getIcon(data.heading, data.alt, icao === this.selectedIcao)
        });

        // Add popup
        marker.bindPopup(this.getPopupContent(data.callsign, data.alt, data.velocity, icao));

        // Click Handler for Side Panel
        marker.on('click', (e) => {
            this.selectAircraft(icao, map);
            L.DomEvent.stopPropagation(e);
        });

        marker.addTo(map);
        this.markers[icao] = marker;
        this.markerData[icao] = data;
    },

    updateMarker: function (marker, data, map) {
        // Move marker
        marker.setLatLng([data.lat, data.lon]);

        // Update Rotation & Color
        marker.setIcon(this.getIcon(data.heading, data.alt, this.getIcaoFromMarker(marker) === this.selectedIcao));

        // Update Popup context
        marker.setPopupContent(this.getPopupContent(data.callsign, data.alt, data.velocity, this.getIcaoFromMarker(marker), data.on_ground));

        // Update stored data
        const icao = this.getIcaoFromMarker(marker);
        if (icao) {
            this.markerData[icao] = data;

            // If this is the selected aircraft, update the panel immediately
            if (this.selectedIcao === icao) {
                this.updatePanelUI(icao, data);
                this.updatePathPolyline(icao, map);
            }
        }
    },

    selectAircraft: function (icao, map) {
        this.selectedIcao = icao;
        const data = this.markerData[icao];
        if (data) {
            this.updatePanelUI(icao, data);
            this.updatePathPolyline(icao, map);
            document.getElementById('side-panel').classList.remove('hidden');
        }
    },

    deselectAircraft: function () {
        this.selectedIcao = null;
        this.stopLiveTimer();
        if (this.selectedPathPolyline) {
            this.selectedPathPolyline.remove();
            this.selectedPathPolyline = null;
        }
        document.getElementById('side-panel').classList.add('hidden');
    },

    updatePathPolyline: function (icao, map) {
        const history = this.pathHistory[icao];
        if (!history || history.length < 2) return;

        // Create or update polyline
        if (!this.selectedPathPolyline) {
            this.selectedPathPolyline = L.polyline(history, {
                color: '#00ffcc',
                weight: 2,
                opacity: 0.8,
                dashArray: '5, 5' // Dashed line style
            }).addTo(map);
        } else {
            this.selectedPathPolyline.setLatLngs(history);
        }
    },

    updatePanelUI: function (icao, data) {
        const getEl = (id) => document.getElementById(id);

        getEl('sp-callsign').textContent = data.callsign || 'N/A';
        getEl('sp-icao').textContent = `Hex: ${icao.toUpperCase()}`;
        getEl('sp-country').textContent = data.origin_country || 'Unknown';

        // Conversions
        let altFt = data.alt ? Math.round(data.alt * 3.28084) : '---';
        if (data.on_ground) altFt = "GND";

        const geoAltFt = data.geo_altitude ? Math.round(data.geo_altitude * 3.28084) : '---';
        const spdKts = data.velocity ? Math.round(data.velocity * 1.94384) : '---';

        // Vertical Rate with Arrow
        const vRate = data.vertical_rate || 0;
        const vRateFt = Math.round(vRate * 3.28084 * 60);
        let vArrow = '<span class="vert-level">&mdash;</span>'; // Level
        if (vRate > 0.5) vArrow = '<span class="vert-up">&uarr;</span>';
        if (vRate < -0.5) vArrow = '<span class="vert-down">&darr;</span>';

        getEl('sp-speed').textContent = `${spdKts} kt`;
        getEl('sp-alt').textContent = `${altFt} ft`;
        getEl('sp-geo-alt').textContent = `${geoAltFt} ft`;
        getEl('sp-vert').innerHTML = `${vArrow} ${Math.abs(vRateFt)} ft/min`;
        getEl('sp-track').textContent = `${data.heading ? Math.round(data.heading) : '---'}°`;
        getEl('sp-pos').textContent = `${data.lat?.toFixed(4)}, ${data.lon?.toFixed(4)}`;

        getEl('sp-squawk').textContent = data.squawk || '----';
        getEl('sp-source').textContent = this.getSourceLabel(data.position_source);
        getEl('sp-seen').textContent = data.last_contact ? `${Math.round(Date.now() / 1000 - data.last_contact)}s ago` : '---';

        // Links
        getEl('sp-link-fr24').href = `https://www.flightradar24.com/${data.callsign || ''}`;
        getEl('sp-link-fa').href = `https://flightaware.com/live/flight/${data.callsign || ''}`;

        this.startLiveTimer();
    },

    liveTimer: null,

    startLiveTimer: function () {
        if (this.liveTimer) clearInterval(this.liveTimer);
        const update = () => {
            if (!this.selectedIcao || !this.markerData[this.selectedIcao]) return;
            const data = this.markerData[this.selectedIcao];
            const el = document.getElementById('sp-seen');
            if (el && data.last_contact) {
                const diff = Math.round(Date.now() / 1000 - data.last_contact);
                el.textContent = `${diff}s ago`;

                // Visual warning for stale data (>5 min?)
                if (diff > 300) el.style.color = 'red';
                else el.style.color = '#00ffcc';
            }
        };
        update(); // Immediate run
        this.liveTimer = setInterval(update, 1000);
    },

    stopLiveTimer: function () {
        if (this.liveTimer) {
            clearInterval(this.liveTimer);
            this.liveTimer = null;
        }
    },

    getSourceLabel: function (code) {
        const labels = { 0: 'ADS-B', 1: 'ASTERIX', 2: 'MLAT' };
        return labels[code] || 'Unknown';
    },

    getIcon: function (heading, alt, isSelected) {
        // Create a DivIcon with rotation transform
        // Note: Unicode plane ✈ points roughly NE or N depending on font.
        // Better to use an SVG or ensure the character points UP (0 deg) by default.
        // We'll calculate rotation assuming the base icon points North (0deg).

        const color = this.getColorByAltitude(alt);
        const extraClass = isSelected ? 'selected-plane' : '';

        return L.divIcon({
            className: `plane-icon-wrapper ${extraClass}`,
            // Apply color dynamically
            html: `<div style="transform: rotate(${heading}deg); font-size: 24px; color: ${color}; text-shadow: 0 0 5px rgba(0,0,0,0.8);">✈</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    },

    getColorByAltitude: function (alt) {
        // Updated Scale matching User Reference (Orange -> Green -> Blue -> Purple)
        if (!alt) return '#999999';

        if (alt < 1000) return '#FF4500'; // OrangeRed (Ground/Takeoff)
        if (alt < 3000) return '#FF8C00'; // DarkOrange
        if (alt < 5000) return '#FFD700'; // Gold
        if (alt < 7000) return '#32CD32'; // LimeGreen
        if (alt < 9000) return '#00CED1'; // DarkTurquoise
        if (alt < 11000) return '#1E90FF'; // DodgerBlue (Typical Cruise)
        if (alt < 13000) return '#0000FF'; // Blue
        return '#8A2BE2';                  // BlueViolet (High Altitude)
    },

    getPopupContent: function (callsign, alt, velocity, icao, on_ground) {
        let altFt = alt ? Math.round(alt * 3.28084) : 'N/A';
        if (on_ground) altFt = "GND";

        const spdKts = velocity ? Math.round(velocity * 1.94384) : 'N/A';

        return `
            <div class="flight-popup">
                <strong>${callsign}</strong><br>
                <span class="mono">Alt: ${altFt} ft</span><br>
                <span class="mono">Spd: ${spdKts} kts</span><br>
                <span class="tiny">ICAO: ${icao}</span>
            </div>
        `;
    },

    cleanup: function (currentIcaos, map) {
        for (let icao in this.markers) {
            if (!currentIcaos.has(icao)) {
                map.removeLayer(this.markers[icao]);
                delete this.markers[icao];
                delete this.markerData[icao];
                delete this.pathHistory[icao]; // Clear history

                // If selected aircraft disappeared
                if (this.selectedIcao === icao) {
                    this.deselectAircraft();
                }
            }
        }
    },

    getIcaoFromMarker: function (marker) {
        // Reverse lookup or store ICAO on marker object
        return Object.keys(this.markers).find(key => this.markers[key] === marker);
    }
};
