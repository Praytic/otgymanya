import {useMemo,useState} from 'react';
import type {WorkoutSet} from '../types';
import {Pager} from './CurrentWeek';
import {LucideIcon} from './LucideIcon';

type RecordedExercise={id:string;name:string;sets:WorkoutSet[]};
type RecordedWorkout={date:string;dayName:string;exercises:RecordedExercise[]};

function recordedWorkouts(workouts:WorkoutSet[]):RecordedWorkout[]{
 const sessions=new Map<string,WorkoutSet[]>();
 workouts.forEach(row=>sessions.set(row.sessionDate,[...(sessions.get(row.sessionDate)??[]),row]));
 return [...sessions.entries()].map(([date,rows])=>{
  const exercises=new Map<string,RecordedExercise>();
  rows.forEach(row=>{
   const exercise=exercises.get(row.exerciseId);
   if(exercise)exercise.sets.push(row);
   else exercises.set(row.exerciseId,{id:row.exerciseId,name:row.exerciseName,sets:[row]});
  });
  return {date,dayName:rows[0]?.dayName??'',exercises:[...exercises.values()]};
 }).sort((a,b)=>b.date.localeCompare(a.date));
}

export function History({workouts}:{workouts:WorkoutSet[]}){
 const items=useMemo(()=>recordedWorkouts(workouts),[workouts]);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [pages,setPages]=useState<Record<string,number>>({});
 const toggle=(date:string)=>setExpanded(current=>current===date?null:date);
 return <><header className="compact-header"><h1>History</h1><p>Recorded workouts</p></header>{items.length===0?<p className="empty">No workouts recorded yet.</p>:<div className="history-list">{items.map(workout=>{
  const isExpanded=expanded===workout.date;
  const page=Math.min(pages[workout.date]??0,workout.exercises.length-1);
  const exercise=workout.exercises[page];
  const panelId=`workout-${workout.date}`;
  const comment=exercise?.sets.find(row=>row.comment)?.comment;
  return <section className="history-workout" key={workout.date}>
   <button className="history-row" type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={()=>toggle(workout.date)}>
    <span><time>{workout.date}</time><strong>{workout.dayName||'Workout'}</strong></span>
    <span>{workout.exercises.length} exercise{workout.exercises.length===1?'':'s'} <LucideIcon name={isExpanded?'collapse':'expand'}/></span>
   </button>
   {isExpanded&&exercise&&<div className="history-details" id={panelId}>
    <article className="history-card"><h2>{exercise.name}</h2><div className="history-sets">{exercise.sets.map((row,index)=><p key={row.recordId||index}><strong>Set {row.setNumber}</strong><span>{row.weight||'—'} lb × {row.reps||'—'}</span></p>)}</div>{comment&&<p className="comment">{comment}</p>}</article>
    {workout.exercises.length>1&&<Pager page={page} count={workout.exercises.length} label="completed exercise" onPage={next=>setPages(current=>({...current,[workout.date]:next}))}/>}</div>}
  </section>;
 })}</div>}</>;
}
