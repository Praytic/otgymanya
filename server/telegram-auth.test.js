import {createHmac} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import request from 'supertest';
import {validateInitData,telegramAuth} from './telegram-auth.mjs';
import {createApp} from './app.mjs';
const token='test-token';
function signed(fields={}){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:42}),...fields});const key=createHmac('sha256','WebAppData').update(token).digest();p.set('hash',createHmac('sha256',key).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')).digest('hex'));return p.toString()}
describe('Telegram access',()=>{
 it('validates signed users and rejects tampering, expiry, future and duplicate fields',()=>{
  expect(validateInitData(signed(),token).id).toBe(42);
  for(const raw of [undefined,'',signed().replace('42','43'),signed({auth_date:'1'}),signed({auth_date:String(Math.floor(Date.now()/1000)+120)}),signed()+'&user=x'])expect(()=>validateInitData(raw,token)).toThrow();
 });
 it('guards all data reads and writes before Sheets access',async()=>{
  const app=createApp({sheets:{},sheetId:'test',apiAuth:telegramAuth({token})});
  for(const route of ['/api/v1/bootstrap','/api/v1/context'])await request(app).get(route).expect(401);
  for(const route of ['/api/v1/results','/api/v1/results/session'])await request(app).post(route).send({}).expect(401);
  await request(app).get('/api/v1/context').set('X-Telegram-Init-Data',signed()).expect(200);
  await request(app).get('/api/v1/context').set('X-Telegram-Init-Data',signed().replace('42','43')).expect(401);
 });
});
