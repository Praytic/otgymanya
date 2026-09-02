import {google} from 'googleapis';
import {spreadsheetId} from '../server/app.mjs';

const SPREADSHEET_ID=spreadsheetId();

let auth;
if(process.env.GOOGLE_ACCESS_TOKEN){auth=new google.auth.OAuth2(); auth.setCredentials({access_token:process.env.GOOGLE_ACCESS_TOKEN})}
else auth=new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets=google.sheets({version:'v4',auth});
const routine=await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID,range:'Routine Exercises!G2:H'});
const unique=[...new Map((routine.data.values??[]).filter(r=>r[0]&&r[1]).map(r=>[r[0],[r[0],r[1]]])).values()];
const stats=[];
for(const [id,name] of unique)for(const period of ['all','year','quarter']){
 const n=stats.length+2; const cutoff=`IF(C${n}="all",DATE(1900,1,1),IF(C${n}="year",TODAY()-365,EDATE(TODAY(),-3)))`;
 const condition=`'Workout Log'!F$2:F=A${n},'Workout Log'!J$2:J<>"",'Workout Log'!B$2:B>=${cutoff}`;
 const earliest=`MIN(FILTER('Workout Log'!B$2:B,${condition}))`; const latest=`MAX(FILTER('Workout Log'!B$2:B,${condition}))`;
 stats.push([id,name,period,`=IF(COUNTIFS('Workout Log'!F$2:F,A${n},'Workout Log'!J$2:J,"<>",'Workout Log'!B$2:B,">="&${cutoff})=0,0,COUNTUNIQUE(FILTER('Workout Log'!B$2:B,${condition})))`,`=IFERROR(MAX(FILTER('Workout Log'!J$2:J,${condition},'Workout Log'!B$2:B=${earliest})),"")`,`=IFERROR(MAX(FILTER('Workout Log'!J$2:J,${condition},'Workout Log'!B$2:B=${latest})),"")`,`=IFERROR(MAX(FILTER('Workout Log'!J$2:J,${condition})),"")`,`=IF(OR(E${n}="",F${n}=""),"",F${n}-E${n})`,`=IFERROR(H${n}/E${n},"")`,`=IFERROR(${latest},"")`]);
}
await sheets.spreadsheets.values.clear({spreadsheetId:SPREADSHEET_ID,range:'Stats!A2:J'});
await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`Stats!A2:J${stats.length+1}`,valueInputOption:'USER_ENTERED',requestBody:{values:stats}});
const verified=await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID,range:`Stats!A1:J${stats.length+1}`});
if(verified.data.values?.length!==stats.length+1)throw new Error('Stats verification failed');
console.log(`Synchronized and verified ${stats.length} statistic rows.`);
