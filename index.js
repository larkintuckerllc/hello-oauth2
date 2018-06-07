const config = require('config');
const Configstore = require('configstore');
const express = require('express');
const { google } = require('googleapis');
const pkg = require('./package.json');

const client_id = config.get('client_id');
const client_secret = config.get('client_secret');
const conf = new Configstore(pkg.name);
const app = express();
const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3000/oauth2callback',
);
const scopes = [
    'https://mail.google.com/'
];
app.use(express.static('public'));
app.get('/login', (req, res) => {
    const user = req.query.user;
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: user, // TODO: ENCRYPT
    });
    res.redirect(url);
});
app.get('/oauth2callback', async (req, res) => {
    // TODO: NOT AUTHORIZED
    const code = req.query.code;
    const user = req.query.state; // TODO: DECRYPT
    try {
        const { tokens } = await oauth2Client.getToken(code)
        const { access_token, expiry_date, refresh_token } = tokens;
        const expiry_date_string = expiry_date.toString(10);
        conf.set('user', user);
        conf.set('access_token', access_token);
        conf.set('refresh_token', refresh_token);
        conf.set('expiry_date', expiry_date_string);
        res.send('Successfully logged in');
    } catch(error) {
        res.send(error);
    }
});
// TODO: WORKER PROCESS TO REFRESH SOON TO EXPIRE TOKENS
// TODO: USE WITH IMAP CLIENT
app.listen(3000, () => console.log('Example app listening on port 3000!'));
