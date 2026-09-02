import {useEffect,useMemo,useState} from 'react';
import {Input} from 'baseui/input';
import {Textarea} from 'baseui/textarea';
import {Button} from 'baseui/button';
import {Card} from 'baseui/card';
import type {ComponentType} from 'react';
import type {RoutineExercise,RoutineVersion,WorkoutSet} from '../types';
import {dateForDay} from '../lib/date';

// Base Web 16 bundles older React declaration files; these aliases retain its
// runtime components while the application uses the machine-supported React 18.
const BaseInput=Input as unknown as ComponentType<any>;
const BaseTextarea=Textarea as unknown as ComponentType<any>;

interface Props{version:RoutineVersion;week:number;monday:Date;exercises:RoutineExercise[];workouts:WorkoutSet[];onSave:(r:WorkoutSet)=>Promise<void>}
export function CurrentWeek({version,week,monday,exercises,workouts,onSave}:Props){
 const rows=useMemo(()=>exercises.filter(e=>e.versionId===version.id&&week>=e.weekFrom&&week<=e.weekTo).sort((a,b)=>a.dayOrder-b.dayOrder||a.exerciseOrder-b.exerciseOrder),[version,week,exercises]);
 const [page,setPage]=useState(0); useEffect(()=>setPage(p=>Math.min(p,Math.max(rows.length-1,0))),[rows.length]); const exercise=rows[page];
 if(!exercise)return <><header><span className="eyebrow">Week {week} of {version.cycleWeeks}</span><h1>Current week</h1></header><p className="empty">No exercises this week.</p></>;
 const date=dateForDay(exercise.dayOfWeek,monday);
 return <><header className="compact-header"><span className="eyebrow">Week {week} of {version.cycleWeeks}</span><h1>Current week</h1><p>{exercise.dayName}<br/><time>{date} · 12:15–1:15 PM</time></p></header><Exercise key={`${date}:${exercise.exerciseId}`} exercise={exercise} date={date} version={version} week={week} existing={workouts.filter(w=>w.sessionDate===date&&w.exerciseId===exercise.exerciseId)} onSave={onSave}/><Pager page={page} count={rows.length} label="exercise" onPage={setPage}/></>;
}
function Exercise({exercise,date,version,week,existing,onSave}:{exercise:RoutineExercise;date:string;version:RoutineVersion;week:number;existing:WorkoutSet[];onSave:(r:WorkoutSet)=>Promise<void>}){
 const [sets,setSets]=useState(()=>Array.from({length:exercise.sets},(_,i)=>({reps:existing.find(x=>x.setNumber===i+1)?.reps||'',weight:existing.find(x=>x.setNumber===i+1)?.weight||''}))); const [comment,setComment]=useState(existing[0]?.comment||''); const [status,setStatus]=useState('');
 useEffect(()=>{if(!sets.some(s=>s.reps||s.weight)&&!comment)return; setStatus('Unsaved'); const timer=setTimeout(async()=>{setStatus('Saving…'); try{for(let i=0;i<sets.length;i++)await onSave({recordId:`${date}:${exercise.exerciseId}:${i+1}`,sessionDate:date,versionId:version.id,cycleWeek:week,dayName:exercise.dayName,exerciseId:exercise.exerciseId,exerciseName:exercise.exerciseName,setNumber:i+1,reps:sets[i].reps,weight:sets[i].weight,comment:i===0?comment:'',updatedAt:new Date().toISOString()}); setStatus('Saved')}catch{setStatus('Retry needed')}},700); return()=>clearTimeout(timer)},[sets,comment]);
 return <Card><article className="exercise"><div className="exercise-title"><div><h2>{exercise.exerciseName}</h2><p>{exercise.sets} × {exercise.targetReps} · {exercise.restSeconds}s rest</p></div><span aria-live="polite">{status}</span></div><div className="set-head"><span>Set</span><span>Reps</span><span>lb</span></div>{sets.map((set,i)=><div className="set-row" key={i}><strong>{i+1}</strong><BaseInput aria-label={`${exercise.exerciseName} set ${i+1} reps`} inputMode="numeric" value={set.reps} onChange={(e:any)=>setSets(v=>v.map((x,n)=>n===i?{...x,reps:e.currentTarget.value}:x))}/><BaseInput aria-label={`${exercise.exerciseName} set ${i+1} weight`} inputMode="decimal" value={set.weight} onChange={(e:any)=>setSets(v=>v.map((x,n)=>n===i?{...x,weight:e.currentTarget.value}:x))}/></div>)}<BaseTextarea aria-label={`${exercise.exerciseName} comment`} placeholder="Optional comment" rows={1} value={comment} onChange={(e:any)=>setComment(e.currentTarget.value)}/></article></Card>;
}
export function Pager({page,count,label,onPage}:{page:number;count:number;label:string;onPage:(page:number)=>void}){return <div className="pagination"><Button disabled={page===0} onClick={()=>onPage(page-1)} aria-label={`Previous ${label}`}>Previous</Button><strong>{page+1} / {count}</strong><Button disabled={page===count-1} onClick={()=>onPage(page+1)} aria-label={`Next ${label}`}>Next</Button></div>}
