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
  for(const route of ['/gym/api/v1/bootstrap','/gym/api/v1/context'])await request(app).get(route).expect(401);
  for(const route of ['/gym/api/v1/results','/gym/api/v1/results/session'])await request(app).post(route).send({}).expect(401);
  await request(app).get('/gym/api/v1/context').set('X-Telegram-Init-Data',signed()).expect(200);
  await request(app).get('/gym/api/v1/context').set('X-Telegram-Init-Data',signed().replace('42','43')).expect(401);
 });
});

describe('Tailscale browser access',()=>{
 const app=createApp({sheets:{},sheetId:'test',apiAuth:telegramAuth({token})});
 const browser={'Tailscale-User-Login':'synthetic@example.test'};
 it('allows browser reads, keeps invalid launches rejected, and rejects foreign writes',async()=>{
  await request(app).get('/gym/api/v1/context').set(browser).expect(200);
  await request(app).get('/gym/api/v1/context').set({...browser,'X-Telegram-Init-Data':'invalid'}).expect(401);
  await request(app).post('/gym/api/v1/results/session').set(browser).send({}).expect(403);
  await request(app).post('/gym/api/v1/results/session').set({...browser,'X-Gym-Request':'1',Origin:'https://foreign.test'}).send({}).expect(403);
  // An application request passes authentication and reaches payload validation.
  await request(app).post('/gym/api/v1/results/session').set({...browser,'X-Gym-Request':'1'}).send({}).expect(400);
 });
});

describe('Gym path mount',()=>{
 const app=createApp({sheets:{},sheetId:'test',apiAuth:telegramAuth({token})});
 it('serves the prefixed API with the same browser and Telegram permissions',async()=>{
  await request(app).get('/gym/api/health/live').expect(200);
  await request(app).get('/gym/api/v1/context').expect(401);
  await request(app).get('/gym/api/v1/context').set('Tailscale-User-Login','synthetic@example.test').expect(200);
  await request(app).get('/gym/api/v1/context').set('X-Telegram-Init-Data',signed()).expect(200);
  await request(app).post('/gym/api/v1/results/session').set({'Tailscale-User-Login':'synthetic@example.test','X-Gym-Request':'1'}).send({}).expect(400);
 });
});
