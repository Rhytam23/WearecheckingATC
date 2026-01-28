const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
require('dotenv').config();
const PORT = 3000;
const OPENSKY_API_BASE = 'https://opensky-network.org/api/states/all';

const USERNAME = process.env.OPENSKY_USERNAME;
const PASSWORD = process.env.OPENSKY_PASSWORD;

const server = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Only allow GET
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }

    try {
        // Parse incoming URL using modern URL API
        // We use 'http://localhost' as the base because req.url is just the path (e.g., /?lamin...)
        const myUrl = new URL(req.url, `http://${req.headers.host}`);

        // Construct OpenSky URL with original query parameters
        const openSkyUrl = OPENSKY_API_BASE + myUrl.search;

        // Log with timestamp
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`[${time}] Proxying: ${myUrl.search}`);


        // Forward the Authorization header if provided by the client, otherwise use env vars
        const headers = {};
        if (req.headers['authorization']) {
            console.log(`[Proxy] Auth Header Received: YES (Len: ${req.headers['authorization'].length})`);
            headers['Authorization'] = req.headers['authorization'];
        } else if (USERNAME && PASSWORD) {
            console.log(`[Proxy] Auth Header Received: NO - Using server-side credentials`);
            const authString = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
            headers['Authorization'] = `Basic ${authString}`;
        } else {
            console.log(`[Proxy] Auth Header Received: NO`);
        }

        https.get(openSkyUrl, { headers }, (apiRes) => {
            // Pipe status code and headers
            console.log(`[Proxy] Upstream Status: ${apiRes.statusCode}`);
            res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });

            // Pipe data
            apiRes.pipe(res);
        }).on('error', (e) => {
            console.error(`[Proxy] Upstream Error: ${e.message}`);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'upstream_error', details: e.message }));
            }
        });

    } catch (err) {
        console.error(`[Proxy] Request Error: ${err.message}`);
        res.writeHead(400);
        res.end('Invalid URL');
    }
});

server.listen(PORT, () => {
    console.log(`
===========================================================
  Local ATC Proxy Server Running
===========================================================
  > Listening on: http://localhost:${PORT}
  > Forwarding to: OpenSky Network API
  > CORS Enabled: Yes

  Keep this window open while using the application.
===========================================================
`);
});
