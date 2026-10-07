import {describe,expect,it} from 'vitest';
import type {CatalogueExercise,RoutineExercise,WorkoutSet} from '../types';
import {hydrateDayExercises,replacementExercise,sheetDayExercises,storedExercise} from './CurrentWeek';

const slot=(overrides:Partial<RoutineExercise>={}):RoutineExercise=>({versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday',dayOrder:1,exerciseId:'box-squat',exerciseName:'Box Squat',exerciseOrder:1,sets:3,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'Brace hard.',supersetId:'',guidance:'Old guidance.',...overrides});
const catalogue:CatalogueExercise[]=[{exerciseId:'goblet-squat',exerciseName:'Goblet Squat',guidance:'Hold the bell at your chest.'},{exerciseId:'leg-curl',exerciseName:'Leg Curl',guidance:''}];
const row=(exerciseId:string,exerciseName:string,setNumber:number):WorkoutSet=>({recordId:`2026-10-07:${exerciseId}:${setNumber}`,sessionDate:'2026-10-07',versionId:'v1',cycleWeek:1,dayName:'Wednesday',exerciseId,exerciseName,setNumber,reps:'5',weight:'100',comment:'',updatedAt:'2026-10-07T12:00:00.000Z'});

describe('replacementExercise',()=>{
 it('swaps identity but keeps the slot scheme',()=>{
  const replaced=replacementExercise(slot(),catalogue[0]);
  expect(replaced.exerciseId).toBe('goblet-squat');
  expect(replaced.exerciseName).toBe('Goblet Squat');
  expect(replaced.guidance).toBe('Hold the bell at your chest.');
  expect(replaced.instructions).toBe('');
  expect(replaced.sets).toBe(3);
  expect(replaced.targetReps).toBe('3–5');
  expect(replaced.restSeconds).toBe(180);
  expect(replaced.exerciseOrder).toBe(1);
  expect(replaced.supersetId).toBe('');
 });
});

describe('sheetDayExercises',()=>{
 const day=[slot(),slot({exerciseId:'incline-bench',exerciseName:'Incline Bench Press',exerciseOrder:2,sets:2})];
 it('keeps routine exercises untouched when nothing was replaced',()=>{
  const items=sheetDayExercises({day,existing:[row('box-squat','Box Squat',1),row('box-squat','Box Squat',2),row('incline-bench','Incline Bench Press',1)],versionId:'v1',catalogue});
  expect(items.map(i=>i.exercise.exerciseId)).toEqual(['box-squat','incline-bench']);
  expect(items[0].sets).toHaveLength(2);
  expect(items[0].sets[0].reps).toBe('5');
 });
 it('resolves a replaced exercise back into its slot with catalogue guidance',()=>{
  const items=sheetDayExercises({day,existing:[row('goblet-squat','Goblet Squat',1),row('goblet-squat','Goblet Squat',2),row('incline-bench','Incline Bench Press',1)],versionId:'v1',catalogue});
  expect(items.map(i=>i.exercise.exerciseId)).toEqual(['goblet-squat','incline-bench']);
  const replaced=items[0].exercise;
  expect(replaced.exerciseName).toBe('Goblet Squat');
  expect(replaced.guidance).toBe('Hold the bell at your chest.');
  expect(replaced.sets).toBe(3);
  expect(replaced.targetReps).toBe('3–5');
 });
 it('prefills matching exercises from an older version as suggestions',()=>{
  const oldRow={...row('box-squat','Box Squat',1),versionId:'v0'};
  const items=sheetDayExercises({day,existing:[oldRow],versionId:'v1',catalogue});
  expect(items).toHaveLength(2);
  expect(items[0].sets[0].reps).toBe('5');
  expect(items[0].sets[0].repsSuggested).toBe(true);
  expect(items[1].sets[0].reps).toBe('');
 });
 it('drops slots that were removed without shifting replacements',()=>{
  const items=sheetDayExercises({day,existing:[row('goblet-squat','Goblet Squat',1)],versionId:'v1',catalogue});
  expect(items.map(i=>i.exercise.exerciseId)).toEqual(['goblet-squat']);
 });
});

describe('storedExercise',()=>{
 it('rebuilds a replaced exercise from the stored draft fields',()=>{
  const exercise=storedExercise({versionId:'v1',week:2,dayName:'Wednesday',dayOrder:1},{exerciseId:'goblet-squat',exerciseName:'Goblet Squat',targetReps:'3–5',restSeconds:180,sets:[{reps:'',weight:'',repsSuggested:false,weightSuggested:false}],comment:''},catalogue);
  expect(exercise?.exerciseName).toBe('Goblet Squat');
  expect(exercise?.targetReps).toBe('3–5');
  expect(exercise?.restSeconds).toBe(180);
  expect(exercise?.versionId).toBe('v1');
  expect(exercise?.guidance).toBe('Hold the bell at your chest.');
 });
 it('falls back to the catalogue when the draft predates the display fields',()=>{
  const exercise=storedExercise({versionId:'v1',week:1,dayName:'Wednesday',dayOrder:1},{exerciseId:'leg-curl',sets:[],comment:''},catalogue);
  expect(exercise?.exerciseName).toBe('Leg Curl');
 });
 it('returns undefined for unknown ids with no stored name',()=>{
  expect(storedExercise({versionId:'v1',week:1,dayName:'Wednesday',dayOrder:1},{exerciseId:'mystery',sets:[],comment:''},catalogue)).toBeUndefined();
 });
});

describe('hydrateDayExercises',()=>{
 const day=[slot(),slot({exerciseId:'incline-bench',exerciseName:'Incline Bench Press',exerciseOrder:2,sets:2})];
 it('keeps stored order and appends routine exercises missing from the draft',()=>{
  const items=hydrateDayExercises({day,versionId:'v1',week:1,stored:[{exerciseId:'goblet-squat',exerciseName:'Goblet Squat',sets:[{reps:'8',weight:'25',repsSuggested:false,weightSuggested:false}],comment:'felt good'}, {exerciseId:'box-squat',sets:[],comment:''}],catalogue});
  expect(items.map(i=>i.exercise.exerciseId)).toEqual(['goblet-squat','box-squat','incline-bench']);
  expect(items[0].sets[0].weight).toBe('25');
  expect(items[0].comment).toBe('felt good');
  expect(items[2].sets).toHaveLength(2);
 });
});
