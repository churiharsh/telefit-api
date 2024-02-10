import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';

import url from 'url';

// Load environment variables from .env
dotenv.config();
const PORT = 8000;
const app = express();
 
const oAuth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI
);

app.get('/', (req, res) => {
	const url = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: process.env.GOOGLE_SCOPE
	});
	res.json({ url });
});

app.get('/get-token', async (req, res, next) => {
	try {
        // console.log((req.url));
		
		const code  = url.parse(req.url, true).query;
		console.log(code);
		const { tokens } = await oAuth2Client.getToken(code);
		res.json({ token: tokens.access_token });
	} catch (error) {
		next(error);
	}
});

app.use((req, res, next) => {
	const token = req.headers?.authorization?.split(' ')[1];
	if (!token) {
		return next(new Error('Please provide a token to access this resource'));
	}
	req.token = token;
	next();
});

app.get('/steps', async (req, res, next) => {
	try {
		oAuth2Client.setCredentials({ access_token: req.token });
		const fitnessStore = google.fitness({ version: 'v1', auth: oAuth2Client });
		const dataTypeName = 'com.google.step_count.delta';
		const dataSourceId = 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps';
		const data = {
			aggregateBy: [{ dataTypeName, dataSourceId }],
			bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
			startTimeMillis: Date.now() - 20 * 24 * 60 * 60 * 1000,
			endTimeMillis: Date.now()
		};
		const result = await fitnessStore.users.dataset.aggregate({
			userId: 'me',
			requestBody: data
		});
		res.json(result);
	} catch (error) {
		next(error);
	}
});
 
app.listen(PORT, () => {
	console.log(`App listening at ${PORT}`);
});

