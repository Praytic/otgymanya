import {useEffect,useMemo,useState} from 'react';
import {Input} from 'baseui/input';
import {Textarea} from 'baseui/textarea';
import {Button} from 'baseui/button';
import type {ComponentType} from 'react';
import type {CatalogueExercise,RoutineExercise,RoutineVersion,WorkoutSet} from '../types';
import {cycleWeek,localISO,mondayOf} from '../lib/date';
import {clearWorkoutDraft,loadWorkoutDraft,saveWorkoutDraft,type StoredDraftExercise} from '../lib/localStorage';
import {LucideIcon} from './LucideIcon';
import {ExerciseIcon} from './ExerciseIcon';
import {WorkoutNavigation} from './WorkoutNavigation';

const BaseInput=Input as unknown as ComponentType<any>;
const BaseTextarea=Textarea as unknown as ComponentType<any>;
export type DraftSet={reps:string;weight:string;repsSuggested:boolean;weightSuggested:boolean};
export type DraftExercise={exercise:RoutineExercise;sets:DraftSet[];comment:string;removed?:boolean};
type DraftGroup={id:string;items:DraftExercise[];superset:boolean};

interface Props{version:RoutineVersion;versions?:RoutineVersion[];exercises:RoutineExercise[];catalogue?:CatalogueExercise[];workouts:WorkoutSet[];onSubmit:(date:string,rows:WorkoutSet[])=>Promise<void>;today?:Date;active?:boolean;editDate?:string|null;onEditDateOpened?:()=>void;onCancelEdit?:()=>void}
export function CurrentWeek({version:initialVersion,versions,exercises,catalogue,workouts,onSubmit,today=new Date(),active=true,editDate,onEditDateOpened,onCancelEdit}:Props){
 const availableVersions=useMemo(()=>versions??[initialVersion],[versions,initialVersion]);
 const [selected,setSelected]=useState<string|null>(null);
 const [editingDate,setEditingDate]=useState<string|null>(null);
 useEffect(()=>{if(editDate){setSelected(editDate);setEditingDate(editDate);onEditDateOpened?.()}},[editDate,onEditDateOpened]);
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
 const isEditing=editingDate===date;
 const cancelEditing=()=>{clearWorkoutDraft(version.id,date);setEditingDate(null);setSelected(null);onCancelEdit?.()};
 return <WorkoutNavigation pageKey={`${version.id}:${date}`} active={active} previous={label(previous)} next={label(next)} previousWeekday={weekday(previous)} nextWeekday={weekday(next)} onNavigate={direction=>{const target=direction===-1?previous:next;if(target){setSelected(target.date);setEditingDate(null)}}}>
 <header className="compact-header"><span className="eyebrow">{version.name} · {version.cycleWeeks===1?'Repeats weekly':`Week ${week} of ${version.cycleWeeks}`}</span><h1>{isEditing?'Edit workout':date===localISO(today)?"Today's workout":date===upcoming?.date?'Next workout':'Workout'}</h1><p>{day[0].dayName}<br/><time>{date}</time></p></header>
 <DayEditor key={`${version.id}:${date}:${day.map(e=>e.exerciseId).join(':')}:${isEditing?'edit':'view'}`} day={day} date={date} version={version} week={week} catalogue={catalogue??[]} existing={workouts.filter(w=>w.sessionDate===date)} onSubmit={onSubmit} isEditing={isEditing} onCancel={cancelEditing}/>
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

const emptySet=():DraftSet=>({reps:'',weight:'',repsSuggested:false,weightSuggested:false});

/** A catalogue exercise takes over a routine slot, keeping the slot's scheme (set count, rep target, rest) but clearing logged values. */
export function replacementExercise(slot:RoutineExercise,entry:CatalogueExercise):RoutineExercise{
 return {...slot,exerciseId:entry.exerciseId,exerciseName:entry.exerciseName,instructions:'',guidance:entry.guidance};
}

/** A catalogue exercise appended to the workout with a neutral scheme (3 sets of 8-12, 90s rest); the set rows stay adjustable. */
export function addedExercise(base:{versionId:string;week:number;dayName:string;dayOrder:number;exerciseOrder:number},entry:CatalogueExercise):RoutineExercise{
 return {versionId:base.versionId,weekFrom:base.week,weekTo:base.week,dayOfWeek:0,dayName:base.dayName,dayOrder:base.dayOrder,exerciseId:entry.exerciseId,exerciseName:entry.exerciseName,exerciseOrder:base.exerciseOrder,sets:3,targetReps:'8–12',restSeconds:90,equipment:'',instructions:'',supersetId:'',guidance:entry.guidance};
}

function makeDraftExercise(exercise:RoutineExercise,saved:WorkoutSet[]):DraftExercise{
 const count=saved.length||Math.max(exercise.sets,1);
 return {exercise,sets:Array.from({length:count},(_,i)=>({reps:saved[i]?.reps||'',weight:saved[i]?.weight||'',repsSuggested:Boolean(saved[i]?.reps),weightSuggested:Boolean(saved[i]?.weight)})),comment:saved[0]?.comment||''};
}

/** Rebuilds a RoutineExercise for a stored exercise id that is no longer (or never was) in the routine day — e.g. a replacement. */
export function storedExercise(slot:{versionId:string;week:number;dayName:string;dayOrder:number},item:StoredDraftExercise,catalogue:CatalogueExercise[]):RoutineExercise|undefined{
 const entry=catalogue.find(candidate=>candidate.exerciseId===item.exerciseId);
 const exerciseName=item.exerciseName||entry?.exerciseName;
 if(!exerciseName)return undefined;
 return {versionId:slot.versionId,weekFrom:slot.week,weekTo:slot.week,dayOfWeek:0,dayName:slot.dayName,dayOrder:slot.dayOrder,exerciseId:item.exerciseId,exerciseName,exerciseOrder:-1,sets:Math.max(item.sets.length,1),targetReps:item.targetReps??'',restSeconds:item.restSeconds??0,equipment:item.equipment??'',instructions:item.instructions??'',supersetId:item.supersetId??'',guidance:item.guidance??entry?.guidance??''};
}

function replacementFromRows(slot:RoutineExercise,exerciseId:string,rows:WorkoutSet[],catalogue:CatalogueExercise[]):RoutineExercise{
 const entry=catalogue.find(item=>item.exerciseId===exerciseId);
 return replacementExercise(slot,{exerciseId,exerciseName:rows[0]?.exerciseName||entry?.exerciseName||exerciseId,guidance:entry?.guidance??''});
}

/** Builds the editable day from already-saved rows, resolving replacements (saved exercise ids that are not routine exercises) back into their slots. */
export function sheetDayExercises({day,existing,versionId,week,catalogue}:{day:RoutineExercise[];existing:WorkoutSet[];versionId:string;week:number;catalogue:CatalogueExercise[]}):DraftExercise[]{
 const byExercise=new Map<string,WorkoutSet[]>();
 for(const row of existing){const list=byExercise.get(row.exerciseId);if(list)list.push(row);else byExercise.set(row.exerciseId,[row])}
 for(const list of byExercise.values())list.sort((a,b)=>a.setNumber-b.setNumber);
 const sameVersion=existing.every(row=>row.versionId===versionId);
 if(existing.length===0)return day.map(exercise=>makeDraftExercise(exercise,[]));
 // Rows from an older version prefill matching exercises as suggestions without filtering the day.
 if(!sameVersion)return day.map(exercise=>makeDraftExercise(exercise,byExercise.get(exercise.exerciseId)??[]));
 const queue=[...byExercise.keys()];
 const items:DraftExercise[]=[];
 for(const exercise of day){
  const direct=byExercise.get(exercise.exerciseId);
  if(direct){queue.splice(queue.indexOf(exercise.exerciseId),1);items.push(makeDraftExercise(exercise,direct));continue}
  // Sheet order is submission order is draft order: a non-routine group at the head replaces this slot.
  const head=queue[0];
  if(head!==undefined&&!day.some(other=>other.exerciseId===head)){
   queue.shift();
   items.push(makeDraftExercise(replacementFromRows(exercise,head,byExercise.get(head)!,catalogue),byExercise.get(head)!));
   continue;
  }
  // Slot was removed or never performed: dropped, as before.
 }
 // Leftover groups (added exercises, or replacements whose positions shifted after removals) are appended with the neutral scheme.
 queue.forEach((exerciseId,index)=>{
  const rows=byExercise.get(exerciseId)!;
  const entry=catalogue.find(item=>item.exerciseId===exerciseId);
  const exercise=addedExercise({versionId,week,dayName:day[0].dayName,dayOrder:day[0].dayOrder,exerciseOrder:day.length+index},{exerciseId,exerciseName:rows[0]?.exerciseName||entry?.exerciseName||exerciseId,guidance:entry?.guidance??''});
  items.push(makeDraftExercise(exercise,rows));
 });
 return items;
}

/** Hydrates the draft from localStorage in stored order, appending routine exercises that the draft does not cover. */
export function hydrateDayExercises({day,versionId,week,stored,catalogue}:{day:RoutineExercise[];versionId:string;week:number;stored:StoredDraftExercise[];catalogue:CatalogueExercise[]}):DraftExercise[]{
 const items:DraftExercise[]=[];
 const seen=new Set<string>();
 for(const storedItem of stored){
  const inDay=day.find(exercise=>exercise.exerciseId===storedItem.exerciseId);
  const exercise=inDay??storedExercise({versionId,week,dayName:day[0].dayName,dayOrder:day[0].dayOrder},storedItem,catalogue);
  if(!exercise||seen.has(exercise.exerciseId))continue;
  seen.add(exercise.exerciseId);
  items.push({exercise,sets:storedItem.sets.length?storedItem.sets:[emptySet()],comment:storedItem.comment,removed:storedItem.removed});
 }
 for(const exercise of day){
  if(seen.has(exercise.exerciseId))continue;
  items.push({exercise,sets:Array.from({length:Math.max(exercise.sets,1)},emptySet),comment:''});
 }
 return items;
}

function DayEditor({day,date,version,week,catalogue,existing,onSubmit,isEditing=false,onCancel}:{day:RoutineExercise[];date:string;version:RoutineVersion;week:number;catalogue:CatalogueExercise[];existing:WorkoutSet[];onSubmit:(date:string,rows:WorkoutSet[])=>Promise<void>;isEditing?:boolean;onCancel?:()=>void}){
 const fromSheet=()=>sheetDayExercises({day,existing,versionId:version.id,week,catalogue});
 const hydrate=()=>{
  const stored=loadWorkoutDraft(version.id,date);
  if(!stored)return fromSheet();
  return hydrateDayExercises({day,versionId:version.id,week,stored:stored.exercises,catalogue});
 };
 const [draft,setDraft]=useState<DraftExercise[]>(hydrate); const [status,setStatus]=useState(''); const [expanded,setExpanded]=useState<string|null>(null); const [replacing,setReplacing]=useState<string|null>(null); const [adding,setAdding]=useState(false); const [replaceQuery,setReplaceQuery]=useState(''); const [commenting,setCommenting]=useState<Set<string>>(()=>new Set(hydrate().filter(item=>item.comment).map(item=>item.exercise.exerciseId)));
 const persist=(items:DraftExercise[])=>saveWorkoutDraft({version:1,versionId:version.id,sessionDate:date,exercises:items.map(({exercise,sets,comment,removed}):StoredDraftExercise=>({exerciseId:exercise.exerciseId,exerciseName:exercise.exerciseName,targetReps:exercise.targetReps,restSeconds:exercise.restSeconds,equipment:exercise.equipment,instructions:exercise.instructions,supersetId:exercise.supersetId,guidance:exercise.guidance,sets,comment,removed}))});
 const update=(change:(items:DraftExercise[])=>DraftExercise[])=>setDraft(items=>{const next=change(items);persist(next);return next});
 const changeSet=(exerciseId:string,index:number,field:'reps'|'weight',value:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,sets:item.sets.map((set,i)=>i===index?{...set,[field]:value,[`${field}Suggested`]:false}:set)}:item));
 const clearSuggested=(exerciseId:string,index:number,field:'reps'|'weight')=>{const item=draft.find(value=>value.exercise.exerciseId===exerciseId);if(!item?.sets[index]?.[`${field}Suggested`])return;changeSet(exerciseId,index,field,'')};
 const addSet=(exerciseId:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,sets:[...item.sets,{reps:'',weight:'',repsSuggested:false,weightSuggested:false}]}:item));
 const removeSet=(exerciseId:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId&&item.sets.length>1?{...item,sets:item.sets.slice(0,-1)}:item));
 const removeExercise=(exerciseId:string)=>{update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,removed:true}:item));setExpanded(current=>current===exerciseId?null:current)};
 const undoRemoveExercise=(exerciseId:string)=>update(items=>items.map(item=>item.exercise.exerciseId===exerciseId?{...item,removed:false}:item));
 const toggleComment=(exerciseId:string)=>setCommenting(current=>{const next=new Set(current);next.has(exerciseId)?next.delete(exerciseId):next.add(exerciseId);return next});
 const toggleReplacing=(exerciseId:string)=>{setReplacing(current=>current===exerciseId?null:exerciseId);setAdding(false);setReplaceQuery('')};
 const toggleAdding=()=>{setAdding(current=>!current);setReplacing(null);setReplaceQuery('')};
 const replaceExercise=(exerciseId:string,entry:CatalogueExercise)=>{update(items=>{const next=items.map(item=>item.exercise.exerciseId===exerciseId?{exercise:replacementExercise(item.exercise,entry),sets:item.sets.map(()=>emptySet()),comment:'',removed:false}:item);const group=groupDraftExercises(next).find(candidate=>candidate.items.some(item=>item.exercise.exerciseId===entry.exerciseId));setExpanded(group?group.id:null);return next});setReplacing(null);setReplaceQuery('')};
 const addExercise=(entry:CatalogueExercise)=>{update(items=>{const exercise=addedExercise({versionId:version.id,week,dayName:day[0].dayName,dayOrder:day[0].dayOrder,exerciseOrder:items.length},entry);const next=[...items,{exercise,sets:Array.from({length:exercise.sets},emptySet),comment:''}];const group=groupDraftExercises(next).find(candidate=>candidate.items.some(item=>item.exercise.exerciseId===entry.exerciseId));setExpanded(group?group.id:null);return next});setAdding(false);setReplaceQuery('')};
 const exercisePicker=(excludeId:string|null,actionLabel:(name:string)=>string,onPick:(entry:CatalogueExercise)=>void)=>{
  const used=new Set(draft.map(item=>item.exercise.exerciseId));
  const query=replaceQuery.trim().toLowerCase();
  const options=catalogue
   .filter(entry=>(excludeId===null||entry.exerciseId!==excludeId)&&!used.has(entry.exerciseId))
   .filter(entry=>!query||entry.exerciseName.toLowerCase().includes(query))
   .sort((a,b)=>a.exerciseName.localeCompare(b.exerciseName));
  return <div className="exercise-picker"><BaseInput aria-label="Search exercise catalogue" placeholder="Search exercises" value={replaceQuery} onChange={(e:any)=>setReplaceQuery(e.currentTarget.value)}/><ul>{options.map(entry=><li key={entry.exerciseId}><button type="button" className="replace-option" onClick={()=>onPick(entry)} aria-label={actionLabel(entry.exerciseName)}><ExerciseIcon exerciseId={entry.exerciseId}/><span>{entry.exerciseName}</span></button></li>)}</ul>{options.length===0&&<p className="empty">No exercises match.</p>}</div>;
 };

 const submit=async()=>{setStatus(isEditing?'Saving…':'Submitting…'); const updatedAt=new Date().toISOString(); const rows=draft.filter(item=>!item.removed).flatMap(({exercise,sets,comment})=>sets.map((set,i)=>({recordId:`${date}:${exercise.exerciseId}:${i+1}`,sessionDate:date,versionId:version.id,cycleWeek:week,dayName:exercise.dayName,exerciseId:exercise.exerciseId,exerciseName:exercise.exerciseName,setNumber:i+1,reps:set.reps,weight:set.weight,comment:i===0?comment:'',updatedAt}))); try{await onSubmit(date,rows);clearWorkoutDraft(version.id,date);setDraft(items=>items.map(item=>({...item,sets:item.sets.map(set=>({...set,repsSuggested:Boolean(set.reps),weightSuggested:Boolean(set.weight)}))})));setStatus(isEditing?'Changes saved':'Submitted')}catch{setStatus(isEditing?'Save failed — try again':'Submit failed — try again')}};
 const activeCount=draft.filter(item=>!item.removed).length;
 const groups=groupDraftExercises(draft);
 const details=(item:DraftExercise,showTitle=false)=>{const exerciseId=item.exercise.exerciseId;const isCommenting=commenting.has(exerciseId);const commentId=`comment-${exerciseId}`;return <article className="exercise-details" key={exerciseId}>{showTitle&&<h3 className="exercise-details-title">{item.exercise.exerciseName}</h3>}{(item.exercise.instructions||item.exercise.guidance)&&<p className="exercise-guidance">{item.exercise.instructions||item.exercise.guidance}</p>}<div className="set-head"><span>Set</span><span>Reps</span><span>lb</span></div>{item.sets.map((set,i)=><div className="set-row" key={i}><strong>{i+1}</strong><span className={set.repsSuggested?'suggested-value':''}><BaseInput aria-label={`${item.exercise.exerciseName} set ${i+1} reps`} inputMode="numeric" value={set.reps} onFocus={()=>clearSuggested(exerciseId,i,'reps')} onChange={(e:any)=>changeSet(exerciseId,i,'reps',e.currentTarget.value)}/></span><span className={set.weightSuggested?'suggested-value':''}><BaseInput aria-label={`${item.exercise.exerciseName} set ${i+1} weight`} inputMode="decimal" value={set.weight} onFocus={()=>clearSuggested(exerciseId,i,'weight')} onChange={(e:any)=>changeSet(exerciseId,i,'weight',e.currentTarget.value)}/></span></div>)}<div className="exercise-controls"><Button className="icon-button" kind="secondary" onClick={()=>addSet(exerciseId)} aria-label={`Add set to ${item.exercise.exerciseName}`}><LucideIcon name="add"/></Button><Button className="icon-button" kind="secondary" onClick={()=>removeSet(exerciseId)} disabled={item.sets.length===1} aria-label={`Remove set from ${item.exercise.exerciseName}`}><LucideIcon name="minus"/></Button><Button className="icon-button" kind="secondary" onClick={()=>toggleComment(exerciseId)} aria-label={`${isCommenting?'Hide':'Add'} comment for ${item.exercise.exerciseName}`} aria-expanded={isCommenting} aria-controls={commentId}><LucideIcon name="comment"/></Button>{catalogue.length>0&&<Button className="icon-button" kind="secondary" onClick={()=>toggleReplacing(exerciseId)} aria-label={`Replace ${item.exercise.exerciseName}`} aria-expanded={replacing===exerciseId}><LucideIcon name="replace"/></Button>}<span className="controls-spacer"/><Button className="icon-button" kind="secondary" onClick={()=>removeExercise(exerciseId)} aria-label={`Remove ${item.exercise.exerciseName}`}><LucideIcon name="delete"/></Button></div>{isCommenting&&<div className="comment-area" id={commentId}><BaseTextarea aria-label={`${item.exercise.exerciseName} comment`} placeholder="Optional comment" rows={1} value={item.comment} onChange={(e:any)=>update(items=>items.map(value=>value.exercise.exerciseId===exerciseId?{...value,comment:e.currentTarget.value}:value))}/></div>}{replacing===exerciseId&&exercisePicker(exerciseId,name=>`Replace with ${name}`,entry=>replaceExercise(exerciseId,entry))}</article>};
 return <div className="day-editor">{groups.map(group=>{const active=group.items.filter(item=>!item.removed);const isExpanded=expanded===group.id;const panelId=`exercise-${group.id}`;return <section className={`current-exercise${group.superset?' superset':''}`} key={group.id}>{active.length>0&&<button className="exercise-row icon-button" type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={()=>setExpanded(current=>current===group.id?null:group.id)}><span className="group-exercises">{active.map(item=><span className="group-exercise" key={item.exercise.exerciseId}><ExerciseIcon exerciseId={item.exercise.exerciseId}/><span className="exercise-copy"><strong>{item.exercise.exerciseName}</strong><small>{item.exercise.targetReps} reps · {item.exercise.restSeconds}s rest</small></span></span>)}</span><span className="group-toggle">{group.superset&&<small>Superset</small>}<LucideIcon name={isExpanded?'collapse':'expand'}/></span></button>}{group.items.filter(item=>item.removed).map(item=><div className="removed-exercise grouped-removed" key={item.exercise.exerciseId}><span>{item.exercise.exerciseName} removed</span><Button className="icon-button" kind="tertiary" onClick={()=>undoRemoveExercise(item.exercise.exerciseId)} aria-label={`Undo remove ${item.exercise.exerciseName}`}><LucideIcon name="undo"/></Button></div>)}{isExpanded&&active.length>0&&<div className="exercise-group-details" id={panelId}>{active.map((item,index)=>details(item,group.superset&&index===1))}</div>}</section>})}{activeCount===0&&<p className="empty removed-empty">All exercises removed from this workout.</p>}{catalogue.length>0&&<div className="add-exercise-row"><Button className="icon-button" kind="secondary" onClick={toggleAdding} aria-label="Add exercise" aria-expanded={adding}><LucideIcon name="add"/></Button></div>}{adding&&exercisePicker(null,name=>`Add ${name}`,addExercise)}<div className="submit-row">{isEditing&&<Button kind="secondary" onClick={onCancel} disabled={status==='Saving…'}>Cancel</Button>}<Button onClick={submit} isLoading={status==='Submitting…'||status==='Saving…'}>{isEditing?'Save':'Submit workout'}</Button><span aria-live="polite">{status}</span></div></div>;
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
