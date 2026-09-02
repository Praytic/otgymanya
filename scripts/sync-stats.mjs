import {google} from 'googleapis';
import {spreadsheetId} from '../server/app.mjs';
import {recordedExercises} from './exercise-data.mjs';

const SPREADSHEET_ID=spreadsheetId();

let auth;
if(process.env.GOOGLE_ACCESS_TOKEN){auth=new google.auth.OAuth2(); auth.setCredentials({access_token:process.env.GOOGLE_ACCESS_TOKEN})}
else auth=new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets=google.sheets({version:'v4',auth});
const source=await sheets.spreadsheets.values.batchGet({spreadsheetId:SPREADSHEET_ID,ranges:['Workout Log!F2:F','Exercises!A2:B']});
const unique=recordedExercises(source.data.valueRanges?.[0]?.values??[],source.data.valueRanges?.[1]?.values??[]);
const stats=[];
for(const [id,name] of unique)for(const period of ['all','year','quarter']){
 const n=stats.length+2; const cutoff=`IF(C${n}="all",DATE(1900,1,1),IF(C${n}="year",TODAY()-365,EDATE(TODAY(),-3)))`;
 const dates=`IFERROR(DATEVALUE('Workout Log'!B$2:B),'Workout Log'!B$2:B)`;
 const weights=`IFERROR(VALUE('Workout Log'!J$2:J),"")`;
 const performed=`'Workout Log'!F$2:F=A${n},${dates}>=${cutoff}`;
 const weighted=`${performed},'Workout Log'!J$2:J<>""`;
 const earliest=`MIN(FILTER(${dates},${weighted}))`; const latest=`MAX(FILTER(${dates},${weighted}))`;
 stats.push([id,name,period,`=IFERROR(COUNTUNIQUE(FILTER(${dates},${performed})),0)`,`=IFERROR(MAX(FILTER(${weights},${weighted},${dates}=${earliest})),"")`,`=IFERROR(MAX(FILTER(${weights},${weighted},${dates}=${latest})),"")`,`=IFERROR(MAX(FILTER(${weights},${weighted})),"")`,`=IF(OR(E${n}="",F${n}=""),"",F${n}-E${n})`,`=IFERROR(H${n}/E${n},"")`,`=IFERROR(TEXT(MAX(FILTER(${dates},${performed})),"yyyy-mm-dd"),"")`]);
}
await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID,range:'Stats!A2:J'});
await sheets.spreadsheets.values.clear({spreadsheetId:SPREADSHEET_ID,range:'Stats!A2:J'});
if(stats.length)await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`Stats!A2:J${stats.length+1}`,valueInputOption:'USER_ENTERED',requestBody:{values:stats}});
const verified=await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID,range:`Stats!A1:J${stats.length+1}`,valueRenderOption:'FORMULA'});
const stored=verified.data.values??[];
if(stored.length!==stats.length+1||stats.some((row,i)=>JSON.stringify(stored[i+1])!==JSON.stringify(row)))throw new Error('Stats verification failed');
console.log(`Synchronized and verified ${stats.length} statistic rows.`);
