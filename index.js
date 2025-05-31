const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const { DiffieHellmanGroup } = require('crypto');

let mainWindow;
let authServer;
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = 'http://127.0.0.1:8888/callback';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Spoof user agent to Chrome
    mainWindow.webContents.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    mainWindow.loadFile('index.html');
    startAuthServer();
}

function startAuthServer() {
    const spotifyApi = new SpotifyWebApi({
        clientId,
        clientSecret,
        redirectUri
    });

    const authApp = express();

    authApp.get('/callback', async (req, res) => {
        try {
            console.log('Received callback with query:', req.query);

            if (!req.query.code) {
                throw new Error('No authorization code received');
            }

            const data = await spotifyApi.authorizationCodeGrant(req.query.code);
            const { access_token, refresh_token, expires_in } = data.body;

            mainWindow.webContents.send('auth-success', {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in
            });

            res.send(`
                <html>
                    <body>
                        <h1>Authentication successful!</h1>
                        <p>You can now close this window and return to the app.</p>
                        <script>
                            setTimeout(window.close, 2000);
                        </script>
                    </body>
                </html>
            `);
        } catch (err) {
            console.error('Auth error:', err);
            mainWindow.webContents.send('auth-error', err.message);
            res.status(500).send(`
                <html>
                    <body>
                        <h1>Authentication failed</h1>
                        <p>${err.message}</p>
                        <p>Please try again.</p>
                    </body>
                </html>
            `);
        }
    });

    authServer = authApp.listen(8888, () => {
        console.log('Auth server running on port 8888');
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (authServer) authServer.close();
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-auth-url', () => {
    const scopes = [
        'user-read-private',
        'user-read-email',
        'streaming',
        'user-read-playback-state',
        'user-modify-playback-state'
    ];
    const spotifyApi = new SpotifyWebApi({
        clientId,
        redirectUri,
        scopes
    });
    return spotifyApi.createAuthorizeURL(scopes, 'state', true);
});

