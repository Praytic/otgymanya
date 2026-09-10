import express from 'express';
import path from 'node:path';
import {loadBootstrap,replaceSession,spreadsheetId,upsertResult} from './workout-store.mjs';
export {spreadsheetId} from './workout-store.mjs';

export function createApp({sheets,staticDir,sheetId=spreadsheetId()}={}){
 if(!sheets)throw new Error('Sheets client is required'); const app=express(); app.disable('x-powered-by'); app.use(express.json({limit:'8kb'}));
 app.get('/api/health/live',(_req,res)=>res.json({status:'ok'}));
 app.get('/api/v1/bootstrap',async(_req,res,next)=>{try{res.json(await loadBootstrap(sheets,sheetId))}catch(e){next(e)}});
 app.post('/api/v1/results',async(req,res,next)=>{try{await upsertResult(sheets,sheetId,req.body);res.status(204).end()}catch(e){next(e)}});
 app.post('/api/v1/results/session',async(req,res,next)=>{try{await replaceSession(sheets,sheetId,req.body?.sessionDate,req.body?.results);res.status(204).end()}catch(e){next(e)}});
 if(staticDir){app.use(express.static(staticDir)); app.get(/.*/,(_req,res)=>res.sendFile(path.join(staticDir,'index.html')))}
 app.use((e,_req,res,_next)=>{const status=e.status||500; res.status(status).json({error:{code:status===400?'INVALID_RESULT':'SHEETS_ERROR',message:status===400?e.message:'Google Sheets request failed'}})}); return app;
}
