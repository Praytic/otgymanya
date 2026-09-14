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
import {WorkoutNavigation} from './WorkoutNavigation';

const BaseInput=Input as unknown as ComponentType<any>;
const BaseTextarea=Textarea as unknown as ComponentType<any>;
type DraftSet={reps:string;weight:string;repsSuggested:boolean;weightSuggested:boolean};
type DraftExercise={exercise:RoutineExercise;sets:DraftSet[];comment:string;removed?:boolean};
type DraftGroup={id:string;items:DraftExercise[];superset:boolean};

interface Props{version:RoutineVersion;versions?:RoutineVersion[];exercises:RoutineExercise[];workouts:WorkoutSet[];onSubmit:(date:string,rows:WorkoutSet[])=>Promise<void>;today?:Date;active?:boolean}
export function CurrentWeek({version:initialVersion,versions,exercises,workouts,onSubmit,today=new Date(),active=true}:Props){
 const availableVersions=useMemo(()=>versions??[initialVersion],[versions,initialVersion]);
 const [selected,setSelected]=useState<string|null>(null);
 const upcoming=useMemo(()=>scheduledWorkout(availableVersions,exercises,today),[availableVersions,exercises,localISO(today)]);
 const workout=selected?scheduledWorkout(availableVersions,exercises,new Date(`${selected}T12:00:00`)):upcoming;
 const adjacent=(direction:-1|1)=>{
  if(!workout)return;
  const date=new Date(`${workout.date}T12:00:00`);date.setDate(date.getDate()+direction);
  return scheduledWorkout(availableVersions,exercises,date,direction);
 };
 const previous=adjacent(-1);const next=adjacent(1);
 if(!workout)return <><header><h1>Today</h1></header><p className="empty">No upcoming workouts.</p></>;
 const {day,date,week,version}=workout;
 const weekday=(item:typeof workout|undefined)=>item?new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long'}):undefined;
 const label=(item:typeof workout|undefined)=>item?`${item.day[0].dayName} · ${item.date}`:undefined;
 return <WorkoutNavigation pageKey={`${version.id}:${date}`} active={active} previous={label(previous)} next={label(next)} previousWeekday={weekday(previous)} nextWeekday={weekday(next)} onNavigate={direction=>{const target=direction===-1?previous:next;if(target)setSelected(target.date)}}>
 <header className="compact-header"><span className="eyebrow">{version.name} · {version.cycleWeeks===1?'Repeats weekly':`Week ${week} of ${version.cycleWeeks}`}</span><h1>{date===localISO(today)?"Today's workout":date===upcoming?.date?'Next workout':'Workout'}</h1><p>{day[0].dayName}<br/><time>{date}</time></p></header>
 <DayEditor key={`${version.id}:${date}:${day.map(e=>e.exerciseId).join(':')}`} day={day} date={date} version={version} week={week} existing={workouts.filter(w=>w.sessionDate===date)} onSubmit={onSubmit}/>
 </WorkoutNavigation>;
}

export function scheduledWorkout(versions:RoutineVersion[],exercises:RoutineExercise[],date:Date,direction:-1|1=1){
 const requested=localISO(date);
 const candidates=versions.flatMap(version=>{
  // Search each immutable snapshot within its own effective dates, including gaps.
  const boundary=direction===1&&requested<version.effectiveFrom?version.effectiveFrom:
   direction===-1&&version.effectiveTo&&requested>version.effectiveTo?version.effectiveTo:requested;
  const workout=nextWorkout(version,exercises,new Date(`${boundary}T12:00:00`),direction);
  return workout?[{...workout,version}]:[];
 });
 return candidates.sort((a,b)=>direction*a.date.localeCompare(b.date))[0];
}

export function nextWorkout(version:RoutineVersion,exercises:RoutineExercise[],today:Date,direction:-1|1=1){
 const start=new Date(today); start.setHours(12,0,0,0);
 const routineExercises=exercises.filter(exercise=>exercise.versionId===version.id);
 for(let offset=0;offset<version.cycleWeeks*7;offset++){
  const candidate=new Date(start); candidate.setDate(candidate.getDate()+offset*direction);
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
 const fromSheet=()=>{const sameVersion=existing.every(row=>row.versionId===version.id);return day.filter(exercise=>existing.length===0||!sameVersion||existing.some(row=>row.exerciseId===exercise.exerciseId)).map(exercise=>{const saved=existing.filter(row=>row.exerciseId===exercise.exerciseId).sort((a,b)=>a.setNumber-b.setNumber); const count=saved.length||Math.max(exercise.sets,1); return {exercise,sets:Array.from({length:count},(_,i)=>({reps:saved[i]?.reps||'',weight:saved[i]?.weight||'',repsSuggested:Boolean(saved[i]?.reps),weightSuggested:Boolean(saved[i]?.weight)})),comment:saved[0]?.comment||''}})};
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
 const groups=groupDraftExercises(draft);
 const details=(item:DraftExercise,showTitle=false)=>{const exerciseId=item.exercise.exerciseId;const isCommenting=commenting.has(exerciseId);const commentId=`comment-${exerciseId}`;return <article className="exercise-details" key={exerciseId}>{showTitle&&<h3 className="exercise-details-title">{item.exercise.exerciseName}</h3>}{(item.exercise.instructions||item.exercise.guidance)&&<p className="exercise-guidance">{item.exercise.instructions||item.exercise.guidance}</p>}<div className="set-head"><span>Set</span><span>Reps</span><span>lb</span></div>{item.sets.map((set,i)=><div className="set-row" key={i}><strong>{i+1}</strong><span className={set.repsSuggested?'suggested-value':''}><BaseInput aria-label={`${item.exercise.exerciseName} set ${i+1} reps`} inputMode="numeric" value={set.reps} onFocus={()=>clearSuggested(exerciseId,i,'reps')} onChange={(e:any)=>changeSet(exerciseId,i,'reps',e.currentTarget.value)}/></span><span className={set.weightSuggested?'suggested-value':''}><BaseInput aria-label={`${item.exercise.exerciseName} set ${i+1} weight`} inputMode="decimal" value={set.weight} onFocus={()=>clearSuggested(exerciseId,i,'weight')} onChange={(e:any)=>changeSet(exerciseId,i,'weight',e.currentTarget.value)}/></span></div>)}<div className="set-actions"><Button className="icon-button" kind="secondary" onClick={()=>removeSet(exerciseId)} disabled={item.sets.length===1} aria-label={`Remove set from ${item.exercise.exerciseName}`}><LucideIcon name="delete"/></Button><Button className="icon-button" kind="secondary" onClick={()=>addSet(exerciseId)} aria-label={`Add set to ${item.exercise.exerciseName}`}><LucideIcon name="add"/></Button></div><div className="comment-area"><Button className="icon-button text-icon-button" kind="tertiary" onClick={()=>toggleComment(exerciseId)} aria-label={`${isCommenting?'Hide':'Add'} comment for ${item.exercise.exerciseName}`} aria-expanded={isCommenting} aria-controls={commentId}><LucideIcon name="comment"/>{isCommenting?'Hide comment':'Add comment'}</Button>{isCommenting&&<div id={commentId}><BaseTextarea aria-label={`${item.exercise.exerciseName} comment`} placeholder="Optional comment" rows={1} value={item.comment} onChange={(e:any)=>update(items=>items.map(value=>value.exercise.exerciseId===exerciseId?{...value,comment:e.currentTarget.value}:value))}/></div>}</div><div className="exercise-actions"><Button className="icon-button text-icon-button" kind="tertiary" onClick={()=>removeExercise(exerciseId)} aria-label={`Remove ${item.exercise.exerciseName}`}><LucideIcon name="delete"/>Remove exercise</Button></div></article>};
 return <div className="day-editor">{groups.map(group=>{const active=group.items.filter(item=>!item.removed);const isExpanded=expanded===group.id;const panelId=`exercise-${group.id}`;return <section className={`current-exercise${group.superset?' superset':''}`} key={group.id}>{active.length>0&&<button className="exercise-row icon-button" type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={()=>setExpanded(current=>current===group.id?null:group.id)}><span className="group-exercises">{active.map(item=><span className="group-exercise" key={item.exercise.exerciseId}><ExerciseIcon exerciseId={item.exercise.exerciseId}/><span className="exercise-copy"><strong>{item.exercise.exerciseName}</strong><small>{item.exercise.targetReps} reps · {item.exercise.restSeconds}s rest</small></span></span>)}</span><span className="group-toggle">{group.superset&&<small>Superset</small>}<LucideIcon name={isExpanded?'collapse':'expand'}/></span></button>}{group.items.filter(item=>item.removed).map(item=><div className="removed-exercise grouped-removed" key={item.exercise.exerciseId}><span>{item.exercise.exerciseName} removed</span><Button kind="tertiary" onClick={()=>undoRemoveExercise(item.exercise.exerciseId)}>Undo</Button></div>)}{isExpanded&&active.length>0&&<div className="exercise-group-details" id={panelId}>{active.map((item,index)=>details(item,group.superset&&index===1))}</div>}</section>})}{activeCount===0&&<p className="empty removed-empty">All exercises removed from this workout.</p>}<div className="submit-row"><Button onClick={submit} isLoading={status==='Submitting…'}>Submit workout</Button><span aria-live="polite">{status}</span></div></div>;
}

export function groupDraftExercises(items:DraftExercise[]):DraftGroup[]{
 const groups:DraftGroup[]=[];
 for(let index=0;index<items.length;index++){
  const first=items[index];const second=items[index+1];
  if(second&&first.exercise.supersetId&&first.exercise.supersetId===second.exercise.supersetId){
   groups.push({id:`${first.exercise.exerciseId}--${second.exercise.exerciseId}`,items:[first,second],superset:true});index++;
  }else groups.push({id:first.exercise.exerciseId,items:[first],superset:false});
 }
 return groups;
}
export function Pager({page,count,label,onPage,hideCount=false}:{page:number;count:number;label:string;onPage:(page:number)=>void;hideCount?:boolean}){return <div className={`pagination${hideCount?' no-count':''}`}><Button className="icon-button" kind="secondary" disabled={page===0} onClick={()=>onPage(page-1)} aria-label={`Previous ${label}`}><LucideIcon name="previous"/></Button>{!hideCount&&<strong>{page+1} / {count}</strong>}<Button className="icon-button" kind="secondary" disabled={page===count-1} onClick={()=>onPage(page+1)} aria-label={`Next ${label}`}><LucideIcon name="next"/></Button></div>}
