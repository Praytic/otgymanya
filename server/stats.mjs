const PERIODS=['all','year','quarter'];

function isoDate(date){
 const year=date.getUTCFullYear(); const month=String(date.getUTCMonth()+1).padStart(2,'0'); const day=String(date.getUTCDate()).padStart(2,'0');
 return `${year}-${month}-${day}`;
}

function monthsAgo(date,months){
 const [year,month,day]=isoDate(date).split('-').map(Number);
 const target=new Date(Date.UTC(year,month-1-months,1));
 const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
 target.setUTCDate(Math.min(day,lastDay));
 return isoDate(target);
}

function cutoff(period,today){
 if(period==='year')return isoDate(new Date(today.getTime()-365*24*60*60*1000));
 if(period==='quarter')return monthsAgo(today,3);
 return '0000-01-01';
}

function weight(value){
 const input=String(value??'').trim();
 if(!input)return null;
 const parsed=Number(input.replace(/,/g,''));
 return Number.isFinite(parsed)?parsed:null;
}

function clean(value){return Number(value.toFixed(4)).toString()}

function maxOnDate(rows,date){
 return Math.max(...rows.filter(row=>row.date===date&&row.weight!==null).map(row=>row.weight));
}

export function statsForHistory(workouts,today=new Date()){
 const history=new Map();
 for(const workout of workouts){
  const exerciseId=String(workout.exerciseId??'').trim();
  if(!exerciseId)continue;
  const entry=history.get(exerciseId)??{exerciseId,exerciseName:String(workout.exerciseName??''),rows:[]};
  if(workout.exerciseName)entry.exerciseName=String(workout.exerciseName);
  entry.rows.push({date:String(workout.sessionDate??''),weight:weight(workout.weight)});
  history.set(exerciseId,entry);
 }
 const stats=[];
 for(const exercise of [...history.values()].sort((a,b)=>a.exerciseId.localeCompare(b.exerciseId))){
  for(const period of PERIODS){
   const start=cutoff(period,today);
   const rows=exercise.rows.filter(row=>row.date&&row.date>=start);
   const weighted=rows.filter(row=>row.weight!==null);
   const dates=weighted.map(row=>row.date);
   const earliest=dates.length?dates.reduce((a,b)=>a<b?a:b):'';
   const latest=dates.length?dates.reduce((a,b)=>a>b?a:b):'';
   const firstWeight=earliest?maxOnDate(weighted,earliest):null;
   const latestWeight=latest?maxOnDate(weighted,latest):null;
   const bestWeight=weighted.length?Math.max(...weighted.map(row=>row.weight)):null;
   const change=firstWeight!==null&&latestWeight!==null?latestWeight-firstWeight:null;
   const changePercent=change!==null&&firstWeight!==0?`${clean(change/firstWeight*100)}%`:'';
   const performed=rows.map(row=>row.date).sort();
   stats.push({
    exerciseId:exercise.exerciseId,
    exerciseName:exercise.exerciseName,
    period,
    sessions:String(new Set(performed).size),
    firstWeight:firstWeight===null?'':clean(firstWeight),
    latestWeight:latestWeight===null?'':clean(latestWeight),
    bestWeight:bestWeight===null?'':clean(bestWeight),
    change:change===null?'':clean(change),
    changePercent,
    lastPerformed:performed.at(-1)??'',
   });
  }
 }
 return stats;
}

export function completeHistoricalStats(sheetStats,workouts,today=new Date()){
 const stored=new Map(sheetStats.map(stat=>[`${stat.exerciseId}:${stat.period}`,stat]));
 return statsForHistory(workouts,today).map(stat=>stored.get(`${stat.exerciseId}:${stat.period}`)??stat);
}
