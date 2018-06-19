const config = require('config');
const Configstore = require('configstore');
const express = require('express');
const { google } = require('googleapis');
const pkg = require('./package.json');
const fs = require('fs');

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
const success = fs.readFileSync('./success.html', 'utf8');
const error = fs.readFileSync('./error.html', 'utf8');
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
    const code = req.query.code;
    if (code === undefined) {
        res.send(error);
        return;
    }
    const user = req.query.state; // TODO: DECRYPT
    try {
        const { tokens } = await oauth2Client.getToken(code)
        const { access_token, expiry_date, refresh_token } = tokens;
        const expiry_date_string = expiry_date.toString(10);
        conf.set('user', user);
        conf.set('access_token', access_token);
        conf.set('refresh_token', refresh_token);
        conf.set('expiry_date', expiry_date_string);
        res.send(success);
    } catch(error) {
        res.send(error);
    }
});
app.get('/send', async (req, res) => {
    const access_token = conf.get('access_token');
    console.log(access_token);
    oauth2Client.credentials = {
        access_token,
    };
    const gmailClass = google.gmail({
        version: 'v1',
        auth: oauth2Client,
    });
    var email_lines = [];

    email_lines.push('From: "test" <john.sckmkny.com@gmail.com>');
    email_lines.push('To: john.tucker@sharpspring.com');
    email_lines.push('Content-type: text/html;charset=iso-8859-1');
    email_lines.push('MIME-Version: 1.0');
    email_lines.push('Subject: this would be the subject');
    email_lines.push('');
    email_lines.push('And this would be the content.<br/>');
    email_lines.push('The body is in HTML so <b>we could even use bold</b>');
    var email = email_lines.join('\r\n').trim();
    var base64EncodedEmail = new Buffer(email).toString('base64');
    base64EncodedEmail = base64EncodedEmail.replace(/\+/g, '-').replace(/\//g, '_');
    gmailClass.users.messages.send({
      userId: 'me',
      resource: {
        raw: base64EncodedEmail
      }
    }, (err, response) => {
        console.log(err);
        console.log(response);
        res.send('done');
    });
});
// TODO: WORKER PROCESS TO REFRESH SOON TO EXPIRE TOKENS
app.listen(3000, () => console.log('Example app listening on port 3000!'));

