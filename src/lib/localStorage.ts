import type {Bootstrap} from '../types';

const CACHE_KEY='gym-tracker:sheet-cache:v1';
const DRAFT_PREFIX='gym-tracker:workout-draft:v1:';

export type StoredDraftSet={reps:string;weight:string;repsSuggested:boolean;weightSuggested:boolean};
export type StoredDraftExercise={exerciseId:string;sets:StoredDraftSet[];comment:string;removed?:boolean};
export type StoredWorkoutDraft={version:1;versionId:string;sessionDate:string;exercises:StoredDraftExercise[]};

function storage(){try{return typeof window==='undefined'?undefined:window.localStorage}catch{return undefined}}
function read<T>(key:string,valid:(value:unknown)=>value is T):T|undefined{
 try{const raw=storage()?.getItem(key);if(!raw)return undefined;const value:unknown=JSON.parse(raw);return valid(value)?value:undefined}catch{return undefined}
}
function write(key:string,value:unknown){try{storage()?.setItem(key,JSON.stringify(value))}catch{/* Cache failure must not block workouts. */}}
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object';

export function loadSheetCache(){return read<Bootstrap>(CACHE_KEY,(value):value is Bootstrap=>object(value)&&Array.isArray(value.versions)&&Array.isArray(value.exercises)&&Array.isArray(value.workouts)&&Array.isArray(value.stats))}
export function saveSheetCache(value:Bootstrap){write(CACHE_KEY,value)}
export function draftKey(versionId:string,sessionDate:string){return `${DRAFT_PREFIX}${encodeURIComponent(versionId)}:${sessionDate}`}
export function loadWorkoutDraft(versionId:string,sessionDate:string){return read<StoredWorkoutDraft>(draftKey(versionId,sessionDate),(value):value is StoredWorkoutDraft=>object(value)&&value.version===1&&value.versionId===versionId&&value.sessionDate===sessionDate&&Array.isArray(value.exercises)&&value.exercises.every(item=>object(item)&&typeof item.exerciseId==='string'&&typeof item.comment==='string'&&Array.isArray(item.sets)&&item.sets.every(set=>object(set)&&typeof set.reps==='string'&&typeof set.weight==='string'&&typeof set.repsSuggested==='boolean'&&typeof set.weightSuggested==='boolean')))}
export function saveWorkoutDraft(value:StoredWorkoutDraft){write(draftKey(value.versionId,value.sessionDate),value)}
export function clearWorkoutDraft(versionId:string,sessionDate:string){try{storage()?.removeItem(draftKey(versionId,sessionDate))}catch{/* Submission already succeeded. */}}
