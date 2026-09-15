import {describe,expect,it} from 'vitest';
import {completeHistoricalStats,statsForHistory} from './stats.mjs';

const workout=(exerciseId,exerciseName,sessionDate,weight)=>({exerciseId,exerciseName,sessionDate,weight});

describe('historical stats',()=>{
 it('creates all periods for every exercise ever present in workout history',()=>{
  const rows=statsForHistory([
   workout('squat','Squat','2026-08-01','100'),
   workout('squat','Squat','2026-09-01','110'),
   workout('row','Bent Over Row','2026-09-01',''),
  ],new Date('2026-09-14T12:00:00Z'));

  expect(rows.map(row=>`${row.exerciseId}:${row.period}`)).toEqual([
   'row:all','row:year','row:quarter',
   'squat:all','squat:year','squat:quarter',
  ]);
  expect(rows.find(row=>row.exerciseId==='squat'&&row.period==='all')).toMatchObject({sessions:'2',firstWeight:'100',latestWeight:'110',bestWeight:'110',change:'10',changePercent:'10%'});
  expect(rows.find(row=>row.exerciseId==='row'&&row.period==='all')).toMatchObject({sessions:'1',firstWeight:'',latestWeight:'',bestWeight:'',lastPerformed:'2026-09-01'});
 });

 it('keeps computed Sheet rows and fills exercises missing from the Stats tab',()=>{
  const workouts=[workout('squat','Squat','2026-09-01','110'),workout('row','Bent Over Row','2026-09-01','80')];
  const stored={exerciseId:'squat',exerciseName:'Squat',period:'all',sessions:'9',firstWeight:'90',latestWeight:'110',bestWeight:'115',change:'20',changePercent:'22.2%',lastPerformed:'2026-09-01'};
  const rows=completeHistoricalStats([stored],workouts,new Date('2026-09-14T12:00:00Z'));

  expect(rows.find(row=>row.exerciseId==='squat'&&row.period==='all')).toBe(stored);
  expect(rows.find(row=>row.exerciseId==='row'&&row.period==='all')).toMatchObject({exerciseName:'Bent Over Row',sessions:'1',latestWeight:'80'});
  expect(rows).toHaveLength(6);
 });
});
