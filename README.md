# Local Airspace

A zero-cost, open-source web application that visualizes civilian aircraft flying near your location using free and public data.

> **Note:** This tool is intended for educational purposes only. It uses delayed data and should **never** be used for air navigation or safety-critical applications.

---

## 🌟 Features

*   **Real-time(ish) Visualization:** Tracks aircraft within a ~100km radius of your location.
*   **Zero Cost:** Powered by the OpenSky Network's free API and OpenStreetMap.
*   **Privacy Focused:** Runs locally on your machine. No accounts required, no tracking.
*   **Detailed Metrics:** Click on any aircraft to see:
    *   Callsign & ICAO Hex
    *   Altitude (Barometric & Geometric)
    *   Ground Speed & Vertical Rate
    *   Track/Heading
    *   Squawk Code

---

## 🛠️ Prerequisites

To run this application, you need **Node.js** installed on your computer. This is required to run the local proxy server that handles API requests.

*   [Download Node.js](https://nodejs.org/) (LTS version recommended)

---

## 🚀 Installation & Setup

Follow these steps to get up and running in minutes.

### 1. Project Setup
Download the code or clone the repository to your local machine.
```bash
git clone https://github.com/your-username/local-airspace.git
cd local-airspace
```

### 2. Start the Local Proxy Server (Critical Step)
This application uses a lightweight local server to proxy requests to the OpenSky API. This resolves Cross-Origin (CORS) issues and manages rate limits.

Open your terminal/command prompt in the project folder and run:
```bash
node server.js
```
*You should see a message saying:*
> `Local ATC Proxy Server Running > Listening on: http://localhost:3000`

**Keep this terminal window OPEN.** If you close it, the app will stop receiving data.

### 3. Launch the Application
Simply open `index.html` in your web browser.
*   You can double-click the file in your file explorer.
*   Or, if using VS Code, use the "Live Server" extension.

---

## 📖 Usage Guide

### 📍 Positioning
When the app loads, you have two options:
1.  **"Locate Me"**: Grants the browser permission to find your GPS coordinates. This is the easiest way to see traffic above you.
2.  **Manual Location**: If you prefer privacy or want to view another city, click "Manual Location" and type a city name (e.g., "Paris", "New York", "Tokyo").

### 🔐 OpenSky Login (Optional - "Fast Mode")
By default, the app uses the anonymous OpenSky API, which limits updates to roughly every **10 seconds**.

For faster updates (~5 seconds) and higher request limits:
1.  Create a free account at [OpenSky Network](https://opensky-network.org/).
2.  In the app, click **"Enable Fast Mode (Login)"**.
3.  Enter your OpenSky username and website password.
    *   *Note: Credentials are stored temporarily in memory for the proxy session and are never sent to third parties.*

---

## 📂 File Structure

Here is a quick overview of how the project is organized:

```
e:\ATC\
├── server.js                 # Local Node.js proxy server (Start this first!)
├── index.html                # Main entry point for the frontend
├── App Data/
│   ├── css/
│   │   └── style.css         # Styling for map and UI overlay
│   └── js/
│       ├── app.js            # Main application logic (Map init, UI events)
│       ├── api_client.js     # Handles communication with server.js
│       ├── aircraft_renderer.js # Manages map markers and popups
│       └── config.js         # (Optional) User configuration file
├── .vscode/
│   └── launch.json           # VS Code debug configuration
└── README.md                 # This documentation file
```

---

## 🔧 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"No aircraft detected"** | 1. Ensure `node server.js` is running.<br>2. Check if it's night time or a quiet airspace.<br>3. Try expanding the view by zooming out. |
| **"Network Error" in Console** | The frontend cannot talk to the backend. Make sure the terminal running `server.js` is still open and listening on port 3000. |
| **Map is grey/blank** | Check your internet connection. The map tiles (OpenStreetMap) require an active connection to load. |
| **Updates are slow** | Anonymous usage is rate-limited. Log in within the app to unlock faster 5-second updates. |

---

## Disclaimer
Data source: [The OpenSky Network](https://opensky-network.org/).
Map data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

This project is not affiliated with the OpenSky Network or any government aviation authority.
