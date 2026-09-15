import {describe,expect,it,vi} from 'vitest';
import request from 'supertest';
import {createApp} from './app.mjs';
const allow=(_req,_res,next)=>next();
const app=options=>createApp({...options,apiAuth:allow});

describe('server',()=>{
 it('requires a spreadsheet ID',()=>expect(()=>createApp({sheets:{}})).toThrow('GOOGLE_SHEETS_ID is required'));
 it('requires a Sheets client',()=>expect(()=>createApp({sheetId:'test'})).toThrow('Sheets client is required'));
 it('requires API authentication',()=>expect(()=>createApp({sheets:{},sheetId:'test'})).toThrow('API authentication is required'));
 it('creates an app with the fixed API',()=>{const sheets={spreadsheets:{values:{batchGet:vi.fn()}}}; expect(app({sheets,sheetId:'test'})).toBeTruthy()});
 it('adds Sheet-backed program guidance to routine exercises',async()=>{
  const batchGet=vi.fn().mockResolvedValue({data:{valueRanges:[
   {values:[['v1','Routine','2026-01-01','',1,'']]},
   {values:[['v1',1,1,1,'Day',1,'squat','Squat',1,1,'3–5',180,'Barbell','','lower-a']]},
   {values:[]},
   {values:[]},
   {values:[['squat','Squat','Work up to a heavy 3–5-rep max.']]},
  ]}});
  const sheets={spreadsheets:{values:{batchGet}}};
  const response=await request(app({sheets,sheetId:'test'})).get('/api/v1/bootstrap').expect(200);
  expect(batchGet).toHaveBeenCalledWith(expect.objectContaining({ranges:expect.arrayContaining(['Exercises!A2:C'])}));
  expect(response.body.exercises[0].guidance).toBe('Work up to a heavy 3–5-rep max.');
  expect(response.body.exercises[0].supersetId).toBe('lower-a');
 });
 it('returns every historical exercise even when the Stats tab is incomplete',async()=>{
  const batchGet=vi.fn().mockResolvedValue({data:{valueRanges:[
   {values:[]},
   {values:[]},
   {values:[
    ['squat-1','2026-09-01','v1','1','Day','squat','Squat','1','5','100','',''],
    ['row-1','2026-09-01','v1','1','Day','row','Bent Over Row','1','8','80','',''],
   ]},
   {values:[]},
   {values:[]},
  ]}});
  const sheets={spreadsheets:{values:{batchGet}}};
  const response=await request(app({sheets,sheetId:'test'})).get('/api/v1/bootstrap').expect(200);
  const allTime=response.body.stats.filter(stat=>stat.period==='all').map(stat=>stat.exerciseId);
  expect(allTime).toEqual(['row','squat']);
  expect(response.body.stats).toHaveLength(6);
 });
 it('writes browser input as raw values',async()=>{
  const update=vi.fn().mockResolvedValue({});
  const sheets={spreadsheets:{values:{get:vi.fn().mockResolvedValue({data:{values:[['record-1']]}}),update}}};
  const result={recordId:'record-1',sessionDate:'2026-01-01',versionId:'v1',cycleWeek:1,dayName:'Day',exerciseId:'exercise',exerciseName:'Exercise',setNumber:1,reps:'5',weight:'100',comment:'=1+1',updatedAt:'2026-01-01T00:00:00.000Z'};
  await request(app({sheets,sheetId:'test'})).post('/api/v1/results').send(result).expect(204);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({valueInputOption:'RAW'}));
 });
 it('replaces every row for a submitted session date and verifies the sheet',async()=>{
  let stored=[['old-other','2026-01-01','v1','1','Day','other','Other','1','8','50','','old'],['old-set-1','2026-01-02','v1','1','Day','exercise','Exercise','1','5','100','','old'],['old-set-2','2026-01-02','v1','1','Day','exercise','Exercise','2','5','100','','old']];
  const get=vi.fn().mockImplementation(()=>Promise.resolve({data:{values:stored}}));
  const update=vi.fn().mockImplementation(({requestBody})=>{stored=requestBody.values;return Promise.resolve({})});
  const clear=vi.fn().mockResolvedValue({});
  const sheets={spreadsheets:{values:{get,update,clear}}};
  const row={recordId:'new-set-1',sessionDate:'2026-01-02',versionId:'v1',cycleWeek:1,dayName:'Day',exerciseId:'exercise',exerciseName:'Exercise',setNumber:1,reps:'6',weight:'105',comment:'done',updatedAt:'2026-01-02T00:00:00.000Z'};
  await request(app({sheets,sheetId:'test'})).post('/api/v1/results/session').send({sessionDate:'2026-01-02',results:[row]}).expect(204);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({valueInputOption:'RAW',requestBody:{values:[expect.arrayContaining(['old-other']),expect.arrayContaining(['new-set-1'])]}}));
  expect(clear).toHaveBeenCalled();
  expect(get).toHaveBeenCalledTimes(2);
 });
});
