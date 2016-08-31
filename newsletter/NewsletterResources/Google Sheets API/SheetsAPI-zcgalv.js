var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-zcgalv.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || 
	process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-zcgalv.json';

// Load client secrest from a local file.
fs.readFile('zcgalv-client-secret.json', function processClientSecrets(err, content) {
	if (err) {
		console.log('Error loading client secret file: ' + err);
		return;
	}
	// Authorize a client with the loaded credentials, then call the
	// Google Sheets API.
	
	switch (process.argv[2]){
		case "date":
			authorize(JSON.parse(content), getDate);
			break;
		case "promos":
			authorize(JSON.parse(content), getPromos);
			break;
		case "promoID":
			authorize(JSON.parse(content), getPromoID);
			break;
	} // end switch
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback){
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function(err, token){
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token);
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});
	console.log ('Authorize this app by visiting this url: ', authUrl);
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter the code form that page here: ', function(code) {
		rl.close();
		oauth2Client.getToken(code, function(err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}
			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Grab the date of the current mailing the main spreadsheet:
 * https://docs.google.com/spreadsheets/d/1xd0l1yGnct4JR-EEdkwQTKSFIQ2Ad91afA8xq4zx5cw
 */
function getDate(auth) {
	var sheets = google.sheets('v4');
	sheets.spreadsheets.values.get({
		auth: auth,
		spreadsheetId: '1xd0l1yGnct4JR-EEdkwQTKSFIQ2Ad91afA8xq4zx5cw',
		range: 'Current!A11:F',
	}, function (err, response) {
		if (err) {
			throw ('The API returned an error: ' + err + '\n\n Some suggestions: Is the current sheet named "Current"? Did the layout of the sheet change?');
			return;
		}
		var rows = response.values;
		if (rows.length == 0){
			throw ("No Data Detected!");
		} else {
			for (var i = 0; i < rows.length; i++) {
				if (rows[i][0] == process.argv[3]){
					console.log(rows[i][4] + rows[i][5]);
					return;
				}
			}
			throw "Finished spreadsheet";
		}
	});
}

function getPromoID(auth) {
	var sheets = google.sheets('v4');
	sheets.spreadsheets.values.get({
		auth: auth,
		spreadsheetId: '1xd0l1yGnct4JR-EEdkwQTKSFIQ2Ad91afA8xq4zx5cw',
		range: 'Current!A11:O',
	}, function (err, response) {
		if (err) {
			throw ('The API returned an error: ' + err + '\n\n Some suggestions: Is the current sheet named "Current"? Did the layout of the sheet change?');
			return;
		}
		var rows = response.values;
		if (rows.length == 0){
			throw ("No Data Detected!");
		} else {
			for (var i = 0; i < rows.length; i++) {
				if (rows[i][0] == process.argv[3]){
					console.log(rows[i][14].substring(44,52));
					return;
				}
			}
			throw "Finished spreadsheet";
		}
	});
}

function getPromos(auth){
	var sheets = google.sheets('v4');
	sheets.spreadsheets.values.get({
		auth: auth,
		spreadsheetId: '1GNIysxles9wGQd6br959-UXwgIuCzUVmsmGaGwxhQ0M',
		range: 'Sheet1!A2:B',
	}, function (err, response) {
		if (err) {
			throw ('The API returned an error: ' + err + '\n\n I don\'t know what could have caused this one...');
			return;
		}
		var rows = response.values;
		if (rows.length == 0){
			throw ("No Data Detected!");
		} else {
			var returner = "";
			for (var i = 0; i < rows.length; i++) {
				returner += (rows[i][0] + "~" + rows[i][1]);
				if (i != rows.length - 1){
					returner += "~";
				}
			}
			console.log(returner);
		}
	});
}