import {useMemo,useState} from 'react';
import {Input} from 'baseui/input';
import {Textarea} from 'baseui/textarea';
import {Button} from 'baseui/button';
import type {ComponentType} from 'react';
import type {RoutineExercise,RoutineVersion,WorkoutSet} from '../types';
import {cycleWeek,localISO,mondayOf} from '../lib/date';
import {clearWorkoutDraft,loadWorkoutDraft,saveWorkoutDraft,type StoredDraftExercise} from '../lib/localStorage';
import {LucideIcon} from './LucideIcon';
import {ExerciseIcon} from './ExerciseIcon';

const BaseInput=Input as unknown as ComponentType<any>;
const BaseTextarea=Textarea as unknown as ComponentType<any>;
type DraftSet={reps:string;weight:string;repsSuggested:boolean;weightSuggested:boolean};
type DraftExercise={exercise:RoutineExercise;sets:DraftSet[];comment:string;removed?:boolean};

interface Props{version:RoutineVersion;exercises:RoutineExercise[];workouts:WorkoutSet[];onSubmit:(date:string,rows:WorkoutSet[])=>Promise<void>;today?:Date}
export function CurrentWeek({version,exercises,workouts,onSubmit,today=new Date()}:Props){
 const workout=useMemo(()=>nextWorkout(version,exercises,today),[version,exercises,localISO(today)]);
 if(!workout)return <><header><h1>Today</h1></header><p className="empty">No upcoming workouts.</p></>;
 const {day,date,week,isToday}=workout;
 return <><header className="compact-header"><span className="eyebrow">Week {week} of {version.cycleWeeks}</span><h1>{isToday?"Today's workout":'Next workout'}</h1><p>{day[0].dayName}<br/><time>{date} · 12:15–1:15 PM</time></p></header><DayEditor key={`${date}:${day.map(e=>e.exerciseId).join(':')}`} day={day} date={date} version={version} week={week} existing={workouts.filter(w=>w.sessionDate===date)} onSubmit={onSubmit}/></>;
}

export function nextWorkout(version:RoutineVersion,exercises:RoutineExercise[],today:Date){
 const start=new Date(today); start.setHours(12,0,0,0);
 const routineExercises=exercises.filter(exercise=>exercise.versionId===version.id);
 for(let offset=0;offset<version.cycleWeeks*7;offset++){
  const candidate=new Date(start); candidate.setDate(candidate.getDate()+offset);
  const date=localISO(candidate);
  if(date<version.effectiveFrom||version.effectiveTo&&date>version.effectiveTo)continue;
  const week=cycleWeek(version,mondayOf(candidate));
  const dayOfWeek=(candidate.getDay()+6)%7+1;
  const day=routineExercises.filter(exercise=>exercise.dayOfWeek===dayOfWeek&&week>=exercise.weekFrom&&week<=exercise.weekTo).sort((a,b)=>a.exerciseOrder-b.exerciseOrder);
  if(day.length)return {day,date,week,isToday:offset===0};
 }
 return undefined;
}
function DayEditor({day,date,version,week,existing,onSubmit}:{day:RoutineExercise[];date:string;version:RoutineVersion;week:number;existing:WorkoutSet[];onSubmit:(date:string,rows:WorkoutSet[])=>Promise<void>}){
 const fromSheet=()=>day.filter(exercise=>existing.length===0||existing.some(row=>row.exerciseId===exercise.exerciseId)).map(exercise=>{const saved=existing.filter(row=>row.exerciseId===exercise.exerciseId).sort((a,b)=>a.setNumber-b.setNumber); const count=saved.length||Math.max(exercise.sets,1); return {exercise,sets:Array.from({length:count},(_,i)=>({reps:saved[i]?.reps||'',weight:saved[i]?.weight||'',repsSuggested:Boolean(saved[i]?.reps),weightSuggested:Boolean(saved[i]?.weight)})),comment:saved[0]?.comment||''}});
 const hydrate=()=>{const stored=loadWorkoutDraft(version.id,date);if(!stored)return fromSheet();const byId=new Map(stored.exercises.map(item=>[item.exerciseId,item]));return day.map(exercise=>{const item=byId.get(exercise.exerciseId);return item?{exercise,sets:item.sets.length?item.sets:[{reps:'',weight:'',repsSuggested:false,weightSuggested:false}],comment:item.comment,removed:item.removed}:{exercise,sets:Array.from({length:Math.max(exercise.sets,1)},()=>({reps:'',weight:'',repsSuggested:false,weightSuggested:false})),comment:''}})};
 const [draft,setDraft]=useState<DraftExercise[]>(hydrate); const [status,setStatus]=useState(''); const [expanded,setExpanded]=useState<string|null>(null); const [commenting,setCommenting]=useState<Set<string>>(()=>new Set(hydrate().filter(item=>item.comment).map(item=>item.exercise.exerciseId)));
 const persist=(items:DraftExercise[])=>saveWorkoutDraft({version:1,versionId:version.id,sessionDate:date,exercises:items.map(({exercise,sets,comment,removed}):StoredDraftExercise=>({exerciseId:exercise.exerciseId,sets,comment,removed}))});
 const update=(change:(items:DraftExercise[])=>DraftExercise[])=>setDraft(items=>{const next=change(items);persist(next);return next});
 const changeSet=(exerciseId:string,index:number,field:'reps'|'weight',value:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,sets:item.sets.map((set,i)=>i===index?{...set,[field]:value,[`${field}Suggested`]:false}:set)}:item));
 const clearSuggested=(exerciseId:string,index:number,field:'reps'|'weight')=>{const item=draft.find(value=>value.exercise.exerciseId===exerciseId);if(!item?.sets[index]?.[`${field}Suggested`])return;changeSet(exerciseId,index,field,'')};
 const addSet=(exerciseId:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,sets:[...item.sets,{reps:'',weight:'',repsSuggested:false,weightSuggested:false}]}:item));
 const removeSet=(exerciseId:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId&&item.sets.length>1?{...item,sets:item.sets.slice(0,-1)}:item));
 const removeExercise=(exerciseId:string)=>{update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,removed:true}:item));setExpanded(current=>current===exerciseId?null:current)};
 const undoRemoveExercise=(exerciseId:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,removed:false}:item));
 const toggleComment=(exerciseId:string)=>setCommenting(current=>{const next=new Set(current);next.has(exerciseId)?next.delete(exerciseId):next.add(exerciseId);return next});
 const submit=async()=>{setStatus('Submitting…'); const updatedAt=new Date().toISOString(); const rows=draft.filter(item=>!item.removed).flatMap(({exercise,sets,comment})=>sets.map((set,i)=>({recordId:`${date}:${exercise.exerciseId}:${i+1}`,sessionDate:date,versionId:version.id,cycleWeek:week,dayName:exercise.dayName,exerciseId:exercise.exerciseId,exerciseName:exercise.exerciseName,setNumber:i+1,reps:set.reps,weight:set.weight,comment:i===0?comment:'',updatedAt}))); try{await onSubmit(date,rows);clearWorkoutDraft(version.id,date);setDraft(items=>items.map(item=>({...item,sets:item.sets.map(set=>({...set,repsSuggested:Boolean(set.reps),weightSuggested:Boolean(set.weight)}))})));setStatus('Submitted')}catch{setStatus('Submit failed — try again')}};
 const activeCount=draft.filter(item=>!item.removed).length;
 return <div className="day-editor">{draft.map(item=>{const exerciseId=item.exercise.exerciseId;if(item.removed)return <div className="removed-exercise" key={exerciseId}><span>{item.exercise.exerciseName} removed</span><Button kind="tertiary" onClick={()=>undoRemoveExercise(exerciseId)}>Undo</Button></div>;const isExpanded=expanded===exerciseId;const isCommenting=commenting.has(exerciseId);const panelId=`exercise-${exerciseId}`;const commentId=`comment-${exerciseId}`;return <section className="current-exercise" key={exerciseId}><button className="exercise-row icon-button" type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={()=>setExpanded(current=>current===exerciseId?null:exerciseId)}><ExerciseIcon exerciseId={exerciseId}/><span className="exercise-copy"><strong>{item.exercise.exerciseName}</strong><small>{item.exercise.targetReps} reps · {item.exercise.restSeconds}s rest</small></span><LucideIcon name={isExpanded?'collapse':'expand'}/></button>{isExpanded&&<article className="exercise-details" id={panelId}>{item.exercise.guidance&&<p className="exercise-guidance">{item.exercise.guidance}</p>}<div className="set-head"><span>Set</span><span>Reps</span><span>lb</span></div>{item.sets.map((set,i)=><div className="set-row" key={i}><strong>{i+1}</strong><span className={set.repsSuggested?'suggested-value':''}><BaseInput aria-label={`${item.exercise.exerciseName} set ${i+1} reps`} inputMode="numeric" value={set.reps} onFocus={()=>clearSuggested(exerciseId,i,'reps')} onChange={(e:any)=>changeSet(exerciseId,i,'reps',e.currentTarget.value)}/></span><span className={set.weightSuggested?'suggested-value':''}><BaseInput aria-label={`${item.exercise.exerciseName} set ${i+1} weight`} inputMode="decimal" value={set.weight} onFocus={()=>clearSuggested(exerciseId,i,'weight')} onChange={(e:any)=>changeSet(exerciseId,i,'weight',e.currentTarget.value)}/></span></div>)}<div className="set-actions"><Button className="icon-button" kind="secondary" onClick={()=>removeSet(exerciseId)} disabled={item.sets.length===1} aria-label={`Remove set from ${item.exercise.exerciseName}`}><LucideIcon name="delete"/></Button><Button className="icon-button" kind="secondary" onClick={()=>addSet(exerciseId)} aria-label={`Add set to ${item.exercise.exerciseName}`}><LucideIcon name="add"/></Button></div><div className="comment-area"><Button className="icon-button text-icon-button" kind="tertiary" onClick={()=>toggleComment(exerciseId)} aria-label={`${isCommenting?'Hide':'Add'} comment for ${item.exercise.exerciseName}`} aria-expanded={isCommenting} aria-controls={commentId}><LucideIcon name="comment"/>{isCommenting?'Hide comment':'Add comment'}</Button>{isCommenting&&<div id={commentId}><BaseTextarea aria-label={`${item.exercise.exerciseName} comment`} placeholder="Optional comment" rows={1} value={item.comment} onChange={(e:any)=>update(items=>items.map(value=>value.exercise.exerciseId===exerciseId?{...value,comment:e.currentTarget.value}:value))}/></div>}</div><div className="exercise-actions"><Button className="icon-button text-icon-button" kind="tertiary" onClick={()=>removeExercise(exerciseId)} aria-label={`Remove ${item.exercise.exerciseName}`}><LucideIcon name="delete"/>Remove exercise</Button></div></article>}</section>})}{activeCount===0&&<p className="empty removed-empty">All exercises removed from this workout.</p>}<div className="submit-row"><Button onClick={submit} isLoading={status==='Submitting…'}>Submit workout</Button><span aria-live="polite">{status}</span></div></div>;
}
export function Pager({page,count,label,onPage,hideCount=false}:{page:number;count:number;label:string;onPage:(page:number)=>void;hideCount?:boolean}){return <div className={`pagination${hideCount?' no-count':''}`}><Button className="icon-button" kind="secondary" disabled={page===0} onClick={()=>onPage(page-1)} aria-label={`Previous ${label}`}><LucideIcon name="previous"/></Button>{!hideCount&&<strong>{page+1} / {count}</strong>}<Button className="icon-button" kind="secondary" disabled={page===count-1} onClick={()=>onPage(page+1)} aria-label={`Next ${label}`}><LucideIcon name="next"/></Button></div>}
