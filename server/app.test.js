import {describe,expect,it,vi} from 'vitest';
import request from 'supertest';
import {createApp} from './app.mjs';

describe('server',()=>{
 it('requires a spreadsheet ID',()=>expect(()=>createApp({sheets:{}})).toThrow('GOOGLE_SHEETS_ID is required'));
 it('requires a Sheets client',()=>expect(()=>createApp({sheetId:'test'})).toThrow('Sheets client is required'));
 it('creates an app with the fixed API',()=>{const sheets={spreadsheets:{values:{batchGet:vi.fn()}}}; expect(createApp({sheets,sheetId:'test'})).toBeTruthy()});
 it('writes browser input as raw values',async()=>{
  const update=vi.fn().mockResolvedValue({});
  const sheets={spreadsheets:{values:{get:vi.fn().mockResolvedValue({data:{values:[['record-1']]}}),update}}};
  const result={recordId:'record-1',sessionDate:'2026-01-01',versionId:'v1',cycleWeek:1,dayName:'Day',exerciseId:'exercise',exerciseName:'Exercise',setNumber:1,reps:'5',weight:'100',comment:'=1+1',updatedAt:'2026-01-01T00:00:00.000Z'};
  await request(createApp({sheets,sheetId:'test'})).post('/api/v1/results').send(result).expect(204);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({valueInputOption:'RAW'}));
 });
});
