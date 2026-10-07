import {completeHistoricalStats} from './stats.mjs';

const READ_RANGES=['Routine Versions!A2:F','Routine Exercises!A2:O','Workout Log!A2:L','Stats!A2:J','Exercises!A2:C'];

export function spreadsheetId(){
 const value=process.env.GOOGLE_SHEETS_ID;
 if(!value)throw new Error('GOOGLE_SHEETS_ID is required');
 return value;
}

export function sheetDate(value){
 const input=String(value||'');
 const match=input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 return match?`${match[3]}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}`:input;
}

const text=(value,max=500)=>{if(typeof value!=='string'||value.length>max)throw Object.assign(new Error('Invalid text value'),{status:400});return value};
const number=(value,min,max)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw Object.assign(new Error('Invalid number value'),{status:400});return value};

export function resultRow(value,sessionDate){
 const v=value??{};
 const row=[text(v.recordId,200),text(v.sessionDate,10),text(v.versionId,100),number(v.cycleWeek,1,100),text(v.dayName,100),text(v.exerciseId,100),text(v.exerciseName,150),number(v.setNumber,1,100),text(v.reps,20),text(v.weight,20),text(v.comment,2000),text(v.updatedAt,50)];
 if((sessionDate&&row[1]!==sessionDate)||!/^(?:\d+(?:\.\d+)?)?$/.test(row[8])||!/^(?:\d+(?:\.\d+)?)?$/.test(row[9]))throw Object.assign(new Error('Invalid workout values'),{status:400});
 return row;
}

export async function loadBootstrap(sheets,sheetId=spreadsheetId()){
 const result=await sheets.spreadsheets.values.batchGet({spreadsheetId:sheetId,ranges:READ_RANGES});
 const rows=index=>result.data.valueRanges?.[index]?.values??[];
 const exerciseRows=rows(4);
 const guidance=new Map(exerciseRows.map(row=>[row[0]||'',row[2]||'']));
 const catalogue=exerciseRows.map(row=>({exerciseId:row[0]||'',exerciseName:row[1]||'',guidance:row[2]||''})).filter(entry=>entry.exerciseId);
 const workouts=rows(2).map(r=>({recordId:r[0]||'',sessionDate:sheetDate(r[1]),versionId:r[2]||'',cycleWeek:Number(r[3]),dayName:r[4]||'',exerciseId:r[5]||'',exerciseName:r[6]||'',setNumber:Number(r[7]),reps:r[8]||'',weight:r[9]||'',comment:r[10]||'',updatedAt:r[11]||''}));
 const stats=rows(3).map(r=>({exerciseId:r[0]||'',exerciseName:r[1]||'',period:r[2]||'',sessions:r[3]||'',firstWeight:r[4]||'',latestWeight:r[5]||'',bestWeight:r[6]||'',change:r[7]||'',changePercent:r[8]||'',lastPerformed:sheetDate(r[9])}));
 return {
  versions:rows(0).map(r=>({id:r[0]||'',name:r[1]||'',effectiveFrom:sheetDate(r[2]),effectiveTo:sheetDate(r[3]),cycleWeeks:Number(r[4])||1,notes:r[5]||''})),
  exercises:rows(1).map(r=>({versionId:r[0]||'',weekFrom:Number(r[1]),weekTo:Number(r[2]),dayOfWeek:Number(r[3]),dayName:r[4]||'',dayOrder:Number(r[5]),exerciseId:r[6]||'',exerciseName:r[7]||'',exerciseOrder:Number(r[8]),sets:Number(r[9]),targetReps:r[10]||'',restSeconds:Number(r[11]),equipment:r[12]||'',instructions:r[13]||'',supersetId:r[14]||'',guidance:guidance.get(r[6]||'')||''})),
  catalogue,
  workouts,
  stats:completeHistoricalStats(stats,workouts),
 };
}

export async function upsertResult(sheets,sheetId,value){
 const row=resultRow(value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(row[1]))throw Object.assign(new Error('Invalid workout values'),{status:400});
 const ids=await sheets.spreadsheets.values.get({spreadsheetId:sheetId,range:'Workout Log!A2:A'});
 const index=(ids.data.values??[]).findIndex(r=>r[0]===row[0]);
 if(index>=0)await sheets.spreadsheets.values.update({spreadsheetId:sheetId,range:`Workout Log!A${index+2}:L${index+2}`,valueInputOption:'RAW',requestBody:{values:[row]}});
 else await sheets.spreadsheets.values.append({spreadsheetId:sheetId,range:'Workout Log!A:L',valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[row]}});
}

export async function replaceSession(sheets,sheetId,sessionDateValue,results){
 const sessionDate=text(sessionDateValue,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)||!Array.isArray(results)||results.length>500)throw Object.assign(new Error('Invalid workout session'),{status:400});
 const incoming=results.map(value=>resultRow(value,sessionDate));
 const range='Workout Log!A2:L';
 const before=await sheets.spreadsheets.values.get({spreadsheetId:sheetId,range});
 const oldRows=before.data.values??[];
 const rows=[...oldRows.filter(row=>sheetDate(row[1])!==sessionDate),...incoming];
 const last=Math.max(oldRows.length,rows.length)+1;
 if(rows.length)await sheets.spreadsheets.values.update({spreadsheetId:sheetId,range:`Workout Log!A2:L${rows.length+1}`,valueInputOption:'RAW',requestBody:{values:rows}});
 if(rows.length<oldRows.length)await sheets.spreadsheets.values.clear({spreadsheetId:sheetId,range:`Workout Log!A${rows.length+2}:L${last}`});
 const after=await sheets.spreadsheets.values.get({spreadsheetId:sheetId,range});
 const stored=after.data.values??[];
 const normalize=row=>Array.from({length:12},(_,index)=>String(row[index]??''));
 if(stored.length!==rows.length||stored.some((row,index)=>JSON.stringify(normalize(row))!==JSON.stringify(normalize(rows[index]))))throw new Error('Workout session verification failed');
}
