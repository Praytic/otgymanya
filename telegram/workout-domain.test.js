import {describe,expect,it} from 'vitest';
import {activeVersion,createDraft,nextWorkout,recordedWorkouts,sessionRows} from './workout-domain.mjs';

const version={id:'v2',name:'Routine',effectiveFrom:'2026-09-02',effectiveTo:'',cycleWeeks:6,notes:''};
const exercise=(id,order=1)=>({versionId:'v2',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday',dayOrder:1,exerciseId:id,exerciseName:id,exerciseOrder:order,sets:2,targetReps:'8-12',restSeconds:90,equipment:'',instructions:'',supersetId:'',guidance:''});

describe('Telegram workout domain',()=>{
 it('selects the active version and date-driven workout',()=>{
  expect(activeVersion([{...version,id:'v1',effectiveTo:'2026-09-01'},version],'2026-09-02')).toEqual(version);
  expect(nextWorkout(version,[exercise('row')],new Date('2026-09-02T12:00:00')).date).toBe('2026-09-02');
 });
 it('hydrates every new-version exercise when saved rows belong to an older version',()=>{
  const workout=nextWorkout(version,[exercise('row'),exercise('curl',2)],new Date('2026-09-02T12:00:00'));
  const existing=[{versionId:'v1',exerciseId:'row',setNumber:1,reps:'8',weight:'80',comment:''}];
  expect(createDraft(workout,existing).map(item=>item.exercise.exerciseId)).toEqual(['row','curl']);
 });
 it('creates a complete date-scoped replacement and preserves order in history',()=>{
  const workout=nextWorkout(version,[exercise('row')],new Date('2026-09-02T12:00:00'));const draft=createDraft(workout,[]);draft[0].sets[0]={reps:'10',weight:'100'};draft[0].comment='Good';
  const rows=sessionRows(workout,version,draft,new Date('2026-09-02T20:00:00Z'));
  expect(rows[0]).toMatchObject({recordId:'2026-09-02:row:1',reps:'10',weight:'100',comment:'Good'});
  expect(recordedWorkouts(rows)[0].exercises[0].name).toBe('row');
 });
});
