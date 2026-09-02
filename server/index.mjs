import {google} from 'googleapis';
import {createApp} from './app.mjs';
import path from 'node:path';
const auth=new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets=google.sheets({version:'v4',auth}); const port=Number(process.env.PORT||8081); const host=process.env.HOST||'127.0.0.1';
createApp({sheets,staticDir:path.resolve('dist')}).listen(port,host,()=>console.log(`Gym tracker listening on http://${host}:${port}`));
