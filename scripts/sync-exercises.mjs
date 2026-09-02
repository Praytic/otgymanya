import {google} from 'googleapis';
import {spreadsheetId} from '../server/app.mjs';
import {exerciseCatalog} from './exercise-data.mjs';

const SPREADSHEET_ID = spreadsheetId();
let auth;
if (process.env.GOOGLE_ACCESS_TOKEN) { auth = new google.auth.OAuth2(); auth.setCredentials({access_token: process.env.GOOGLE_ACCESS_TOKEN}); }
else auth = new google.auth.GoogleAuth({scopes: ['https://www.googleapis.com/auth/spreadsheets']});
const sheets = google.sheets({version: 'v4', auth});

// Names remain in immutable routine and historical log snapshots; Exercise ID
// is their stable reference to this catalog.
const source = await sheets.spreadsheets.values.batchGet({spreadsheetId: SPREADSHEET_ID, ranges: ['Routine Exercises!G2:H', 'Workout Log!F2:G']});
const routine = source.data.valueRanges?.[0]?.values ?? [];
const workouts = source.data.valueRanges?.[1]?.values ?? [];
const rows = exerciseCatalog(routine, workouts);
const workbook = await sheets.spreadsheets.get({spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties'});
if (!workbook.data.sheets?.some(sheet => sheet.properties?.title === 'Exercises')) {
  await sheets.spreadsheets.batchUpdate({spreadsheetId: SPREADSHEET_ID, requestBody: {requests: [{addSheet: {properties: {title: 'Exercises', gridProperties: {frozenRowCount: 1}}}}]}});
}
const before = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: 'Exercises!A1:B'});
const last = Math.max(before.data.values?.length ?? 1, rows.length + 1);
await sheets.spreadsheets.values.update({spreadsheetId: SPREADSHEET_ID, range: `Exercises!A1:B${rows.length + 1}`, valueInputOption: 'RAW', requestBody: {values: [['Exercise ID', 'Exercise Name'], ...rows]}});
if (last > rows.length + 1) await sheets.spreadsheets.values.clear({spreadsheetId: SPREADSHEET_ID, range: `Exercises!A${rows.length + 2}:B${last}`});
const verified = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: `Exercises!A1:B${rows.length + 1}`});
if (JSON.stringify(verified.data.values) !== JSON.stringify([['Exercise ID', 'Exercise Name'], ...rows])) throw new Error('Exercises verification failed');
console.log(`Synchronized and verified ${rows.length} exercises.`);
