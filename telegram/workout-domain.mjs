export function localISO(date=new Date()){
 const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`;
}
export function mondayOf(date=new Date()){
 const result=new Date(date);result.setHours(12,0,0,0);result.setDate(result.getDate()-((result.getDay()+6)%7));return result;
}
export function activeVersion(versions,date=localISO()){
 return versions.filter(version=>version.effectiveFrom<=date&&(!version.effectiveTo||version.effectiveTo>=date)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function cycleWeek(version,monday=mondayOf()){
 const start=mondayOf(new Date(`${version.effectiveFrom}T12:00:00`));const elapsed=Math.floor((monday.getTime()-start.getTime())/604800000);return ((elapsed%version.cycleWeeks)+version.cycleWeeks)%version.cycleWeeks+1;
}
export function nextWorkout(version,exercises,today=new Date()){
 const start=new Date(today);start.setHours(12,0,0,0);const routine=exercises.filter(exercise=>exercise.versionId===version.id);
 for(let offset=0;offset<version.cycleWeeks*7;offset++){
  const candidate=new Date(start);candidate.setDate(candidate.getDate()+offset);const date=localISO(candidate);
  if(date<version.effectiveFrom||(version.effectiveTo&&date>version.effectiveTo))continue;
  const week=cycleWeek(version,mondayOf(candidate));const dayOfWeek=(candidate.getDay()+6)%7+1;
  const day=routine.filter(exercise=>exercise.dayOfWeek===dayOfWeek&&week>=exercise.weekFrom&&week<=exercise.weekTo).sort((a,b)=>a.exerciseOrder-b.exerciseOrder);
  if(day.length)return {day,date,week,isToday:offset===0};
 }
}
export function createDraft(workout,existing=[]){
 const sameVersion=existing.every(row=>row.versionId===workout.day[0]?.versionId);
 return workout.day.filter(exercise=>existing.length===0||!sameVersion||existing.some(row=>row.exerciseId===exercise.exerciseId)).map(exercise=>{
  const saved=existing.filter(row=>row.exerciseId===exercise.exerciseId).sort((a,b)=>a.setNumber-b.setNumber);const count=saved.length||Math.max(exercise.sets,1);
  return {exercise,sets:Array.from({length:count},(_,index)=>({reps:saved[index]?.reps||'',weight:saved[index]?.weight||''})),comment:saved[0]?.comment||'',removed:false};
 });
}
export function sessionRows(workout,version,draft,now=new Date()){
 const updatedAt=now.toISOString();
 return draft.filter(item=>!item.removed).flatMap(item=>item.sets.map((set,index)=>({recordId:`${workout.date}:${item.exercise.exerciseId}:${index+1}`,sessionDate:workout.date,versionId:version.id,cycleWeek:workout.week,dayName:item.exercise.dayName,exerciseId:item.exercise.exerciseId,exerciseName:item.exercise.exerciseName,setNumber:index+1,reps:set.reps,weight:set.weight,comment:index===0?item.comment:'',updatedAt})));
}
export function recordedWorkouts(workouts){
 const sessions=new Map();for(const row of workouts)sessions.set(row.sessionDate,[...(sessions.get(row.sessionDate)||[]),row]);
 return [...sessions.entries()].map(([date,rows])=>{const exercises=new Map();for(const row of rows){const found=exercises.get(row.exerciseId);if(found)found.sets.push(row);else exercises.set(row.exerciseId,{id:row.exerciseId,name:row.exerciseName,sets:[row]})}return {date,dayName:rows[0]?.dayName||'',exercises:[...exercises.values()]}}).sort((a,b)=>b.date.localeCompare(a.date));
}
