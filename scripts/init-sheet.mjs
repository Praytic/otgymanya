import {google} from 'googleapis';
import {spreadsheetId} from '../server/app.mjs';

const sheetId=spreadsheetId();
let auth;
if(process.env.GOOGLE_ACCESS_TOKEN){auth=new google.auth.OAuth2();auth.setCredentials({access_token:process.env.GOOGLE_ACCESS_TOKEN})}
else auth=new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets=google.sheets({version:'v4',auth});
const existing=(await sheets.spreadsheets.get({spreadsheetId:sheetId,fields:'sheets.properties'})).data.sheets??[];
const values=await sheets.spreadsheets.values.get({spreadsheetId:sheetId,range:"'Sheet1'!A1:Z1000"});
if(existing.length!==1||existing[0].properties?.title!=='Sheet1'||(values.data.values??[]).length)throw new Error('Refusing to initialize a workbook that is not blank');

const titles=['Exercises','Routine Versions','Routine Exercises','Workout Log','Stats'];
await sheets.spreadsheets.batchUpdate({spreadsheetId:sheetId,requestBody:{requests:[...titles.map(title=>({addSheet:{properties:{title}}})),{deleteSheet:{sheetId:existing[0].properties.sheetId}}]}});
const data=[
 {range:'Exercises!A1:C1',values:[['Exercise ID','Exercise Name','Program Guidance']]},
 {range:'Routine Versions!A1:F2',values:[['Version ID','Name','Effective From','Effective To','Cycle Weeks','Notes'],['starter-v1','Starter routine',new Date().toISOString().slice(0,10),'',1,'Add exercises before using the app']]},
 {range:'Routine Exercises!A1:O1',values:[['Version ID','Week From','Week To','Day of Week','Day Name','Day Order','Exercise ID','Exercise Name','Exercise Order','Sets','Target Reps','Rest Seconds','Equipment','Instructions','Superset ID']]},
 {range:'Workout Log!A1:L1',values:[['Record ID','Session Date','Version ID','Cycle Week','Day Name','Exercise ID','Exercise Name','Set Number','Reps','Weight (lb)','Comment','Updated At']]},
 {range:'Stats!A1:J1',values:[['Exercise ID','Exercise Name','Period','Sessions','First Weight','Latest Weight','Best Weight','Change','Change %','Last Performed']]},
];
await sheets.spreadsheets.values.batchUpdate({spreadsheetId:sheetId,requestBody:{valueInputOption:'RAW',data}});
const created=await sheets.spreadsheets.get({spreadsheetId:sheetId,fields:'sheets.properties'});
await sheets.spreadsheets.batchUpdate({spreadsheetId:sheetId,requestBody:{requests:(created.data.sheets??[]).map(sheet=>({updateSheetProperties:{properties:{sheetId:sheet.properties.sheetId,gridProperties:{frozenRowCount:1}},fields:'gridProperties.frozenRowCount'}}))}});
const verified=await sheets.spreadsheets.values.batchGet({spreadsheetId:sheetId,ranges:data.map(item=>item.range)});
if(verified.data.valueRanges?.length!==5||verified.data.valueRanges[1].values?.[1]?.[0]!=='starter-v1')throw new Error('Sheet verification failed');
console.log('Initialized and verified the workbook. Add routine exercises before starting the app.');
