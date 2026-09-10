import fs from 'node:fs';
import {activeVersion,createDraft,localISO,nextWorkout,recordedWorkouts,sessionRows} from './workout-domain.mjs';

const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const button=(text,data)=>({text,callback_data:data});
const NAV=[[button('History','v:h'),button('Current','v:c')],[button('Stats','v:s'),button('Context','v:x')]];
const clamp=(value,max)=>Math.max(0,Math.min(value,Math.max(0,max-1)));
const saveableDraft=(date,draft)=>({date,items:draft.map(item=>({exerciseId:item.exercise.exerciseId,sets:item.sets,comment:item.comment,removed:item.removed}))});

function restoreDraft(saved,workout){
 if(!saved||saved.date!==workout.date)return undefined;
 const byId=new Map(saved.items.map(item=>[item.exerciseId,item]));
 return workout.day.map(exercise=>{const item=byId.get(exercise.exerciseId);return {exercise,sets:item?.sets?.length?item.sets:[{reps:'',weight:''}],comment:item?.comment||'',removed:Boolean(item?.removed)}});
}

export class GymTelegramBot{
 constructor({api,sheets,chatId,stateStore,contextPath,now=()=>new Date(),logger=console}){
  this.api=api;this.sheets=sheets;this.chatId=String(chatId);this.stateStore=stateStore;this.contextPath=contextPath;this.now=now;this.logger=logger;
  this.state={view:'c',page:0,...stateStore.load()};this.data=null;this.version=null;this.workout=null;this.draft=[];this.queue=Promise.resolve();
 }
 persist(){if(this.workout)this.state.savedDraft=saveableDraft(this.workout.date,this.draft);this.stateStore.save(this.state)}
 async refresh(){
  this.data=await this.sheets.loadBootstrap();this.version=activeVersion(this.data.versions,localISO(this.now()));
  if(!this.version)throw new Error('No active routine version');this.workout=nextWorkout(this.version,this.data.exercises,this.now());
  if(this.workout){const existing=this.data.workouts.filter(row=>row.sessionDate===this.workout.date);this.draft=restoreDraft(this.state.savedDraft,this.workout)||createDraft(this.workout,existing)}else this.draft=[];
 }
 async start(){
  await this.api.call('deleteWebhook',{drop_pending_updates:false});await this.api.call('getMe');await this.api.call('getChat',{chat_id:this.chatId});await this.refresh();await this.render();this.logger.info('Telegram gym bot is polling its configured chat');let offset;
  for(;;){try{const updates=await this.api.call('getUpdates',{offset,timeout:50,allowed_updates:['message','callback_query']});for(const update of updates){offset=update.update_id+1;this.queue=this.queue.then(()=>this.handle(update)).catch(error=>this.report(error))}await this.queue}catch(error){this.report(error);await new Promise(resolve=>setTimeout(resolve,2000))}}
 }
 report(error){this.logger.error(error instanceof Error?error.message:String(error))}
 authorized(chat){return chat&&String(chat.id)===this.chatId}
 async handle(update){
  const query=update.callback_query;
  if(query){if(!this.authorized(query.message?.chat)){await this.api.call('answerCallbackQuery',{callback_query_id:query.id,text:'This bot is not available in this chat',show_alert:true});return}await this.api.call('answerCallbackQuery',{callback_query_id:query.id});await this.action(query.data||'');return}
  const message=update.message;if(!this.authorized(message?.chat))return;
  if(this.state.prompt&&message.reply_to_message?.message_id===this.state.prompt.messageId){await this.acceptInput(message);return}
  if(message.text?.startsWith('/')){await this.refresh();await this.render(true)}
 }
 async action(data){
  if(data==='noop')return this.render();
  if(data.startsWith('v:')){this.state.view=data.slice(2);this.state.page=0;this.state.selected=null;this.state.set=null;await this.refresh()}
  else if(data.startsWith('p:'))this.state.page=Math.max(0,Number(data.slice(2))||0);
  else if(data.startsWith('hx:')){this.state.selected=data.slice(3);this.state.historyExercise=0}
  else if(data.startsWith('he:'))this.state.historyExercise=Number(data.slice(3))||0;
  else if(data.startsWith('sp:')){this.state.period=data.slice(3);this.state.page=0;this.state.selected=null}
  else if(data.startsWith('sx:'))this.state.selected=data.slice(3);
  else if(data.startsWith('cx:'))this.state.selected=Number(data.slice(3));
  else if(data.startsWith('cs:'))this.state.set=Number(data.slice(3));
  else if(data==='back'){this.state.selected=null;this.state.set=null}
  else if(data==='cb')this.state.set=null;
  else if(data==='add')this.item().sets.push({reps:'',weight:''});
  else if(data==='delset'){if(this.item().sets.length>1)this.item().sets.splice(this.state.set,1);this.state.set=null}
  else if(data==='remove'){this.item().removed=true;this.state.selected=null;this.state.set=null}
  else if(data.startsWith('undo:'))this.draft[Number(data.slice(5))].removed=false;
  else if(data==='submit')await this.submit();
  else if(data==='refresh')await this.refresh();
  else if(['reps','weight','comment'].includes(data))return this.prompt(data);
  this.persist();await this.render();
 }
 item(){const item=this.draft[this.state.selected];if(!item)throw new Error('Workout selection is no longer available');return item}
 async prompt(field){
  const item=this.item();const set=item.sets[this.state.set];const current=field==='comment'?item.comment:set?.[field]||'';
  const label=field==='comment'?`Comment for ${item.exercise.exerciseName}`:`${field==='reps'?'Reps':'Weight (lb)'} for ${item.exercise.exerciseName}, set ${this.state.set+1}`;
  const sent=await this.api.call('sendMessage',{chat_id:this.chatId,text:`${label}\nCurrent: ${current||'empty'}\nReply with a new value, or - to clear it.`,reply_markup:{force_reply:true,selective:true,input_field_placeholder:field==='comment'?'Optional comment':'Number or -'}});
  this.state.prompt={messageId:sent.message_id,field,exercise:this.state.selected,set:this.state.set};this.persist();
 }
 async acceptInput(message){
  const prompt=this.state.prompt;const value=message.text==='-'?'':String(message.text??'').trim();const item=this.draft[prompt.exercise];
  let error='';if(!item)error='That exercise is no longer available.';else if(prompt.field!=='comment'&&!/^(?:\d+(?:\.\d+)?)?$/.test(value))error='Use a positive number, decimal, or - to clear.';else if(prompt.field==='comment'&&value.length>2000)error='Comment is too long.';
  if(error){await this.api.call('sendMessage',{chat_id:this.chatId,text:error,reply_parameters:{message_id:message.message_id}});return}
  if(prompt.field==='comment')item.comment=value;else item.sets[prompt.set][prompt.field]=value;
  delete this.state.prompt;this.persist();await this.api.call('deleteMessage',{chat_id:this.chatId,message_id:prompt.messageId}).catch(()=>{});await this.api.call('deleteMessage',{chat_id:this.chatId,message_id:message.message_id}).catch(()=>{});await this.render();
 }
 async submit(){
  const rows=sessionRows(this.workout,this.version,this.draft,this.now());await this.sheets.replaceSession(this.workout.date,rows);delete this.state.savedDraft;this.state.notice='Workout submitted and verified in Google Sheets.';await this.refresh();
 }
 async render(forceNew=false){
  const rendered=this.renderView();const body={chat_id:this.chatId,text:rendered.text.slice(0,4096),parse_mode:'HTML',reply_markup:{inline_keyboard:rendered.keyboard}};
  if(this.state.messageId&&!forceNew){try{await this.api.call('editMessageText',{...body,message_id:this.state.messageId});return}catch(error){if(/message is not modified/i.test(error.message))return;this.report(error)}}
  const sent=await this.api.call('sendMessage',body);this.state.messageId=sent.message_id;this.persist();
 }
 renderView(){if(this.state.view==='h')return this.renderHistory();if(this.state.view==='s')return this.renderStats();if(this.state.view==='x')return this.renderContext();return this.renderCurrent()}
 renderCurrent(){
  if(!this.workout)return {text:'<b>Current workout</b>\n\nNo upcoming workouts.',keyboard:[...NAV]};
  if(this.state.selected!=null){const item=this.item();if(this.state.set!=null){const set=item.sets[this.state.set];return {text:`<b>${escape(item.exercise.exerciseName)} · Set ${this.state.set+1}</b>\n\nReps: <b>${escape(set.reps||'—')}</b>\nWeight: <b>${escape(set.weight||'—')} lb</b>`,keyboard:[[button('Edit reps','reps'),button('Edit weight','weight')],[button('Delete set','delset')],[button('‹ Exercise','cb')],...NAV]}}
   const setRows=item.sets.map((set,index)=>[button(`Set ${index+1} · ${set.weight||'—'} lb × ${set.reps||'—'}`,`cs:${index}`)]);
   return {text:`<b>${escape(item.exercise.exerciseName)}</b>\n${escape(item.exercise.targetReps)} reps · ${item.exercise.restSeconds}s rest${item.exercise.equipment?` · ${escape(item.exercise.equipment)}`:''}${item.exercise.guidance?`\n\n${escape(item.exercise.guidance)}`:''}\n\nComment: ${escape(item.comment||'—')}`,keyboard:[...setRows,[button('＋ Set','add'),button('Comment','comment')],[button('Remove exercise','remove')],[button('‹ Workout','back')],...NAV]};
  }
  const title=this.workout.isToday?"Today's workout":'Next workout';const rows=this.draft.map((item,index)=>item.removed?[button(`Undo · ${item.exercise.exerciseName}`,`undo:${index}`)]:[button(`${item.exercise.supersetId?'↕ ':''}${item.exercise.exerciseName}`,`cx:${index}`)]);
  const notice=this.state.notice?`\n\n✅ ${escape(this.state.notice)}`:'';delete this.state.notice;
  return {text:`<b>${title}</b>\nWeek ${this.workout.week} of ${this.version.cycleWeeks}\n${escape(this.workout.day[0].dayName)}\n${this.workout.date}${notice}`,keyboard:[...rows,[button('Submit workout','submit'),button('Refresh','refresh')],...NAV]};
 }
 renderHistory(){
  const sessions=recordedWorkouts(this.data.workouts);if(this.state.selected){const workout=sessions.find(item=>item.date===this.state.selected);if(!workout){this.state.selected=null;return this.renderHistory()}const index=clamp(this.state.historyExercise||0,workout.exercises.length);const exercise=workout.exercises[index];const sets=exercise.sets.map(row=>`Set ${row.setNumber}: <b>${escape(row.weight||'—')} lb × ${escape(row.reps||'—')}</b>`).join('\n');const comment=exercise.sets.find(row=>row.comment)?.comment;return {text:`<b>${workout.date} · ${escape(workout.dayName||'Workout')}</b>\n\n<b>${escape(exercise.name)}</b>\n${sets}${comment?`\n\n${escape(comment)}`:''}`,keyboard:[[button('‹',`he:${Math.max(0,index-1)}`),button(`${index+1}/${workout.exercises.length}`,'noop'),button('›',`he:${Math.min(workout.exercises.length-1,index+1)}`)],[button('‹ History','back')],...NAV]}}
  const size=6;const pages=Math.max(1,Math.ceil(sessions.length/size));this.state.page=clamp(this.state.page,pages);const rows=sessions.slice(this.state.page*size,this.state.page*size+size).map(item=>[button(`${item.date} · ${item.dayName||'Workout'}`,`hx:${item.date}`)]);return {text:`<b>History</b>\nRecorded workouts${sessions.length?'':'\n\nNo workouts recorded yet.'}`,keyboard:[...rows,[button('‹',`p:${Math.max(0,this.state.page-1)}`),button(`${this.state.page+1}/${pages}`,'noop'),button('›',`p:${Math.min(pages-1,this.state.page+1)}`)],...NAV]};
 }
 renderStats(){
  const period=this.state.period||'all';const stats=this.data.stats.filter(row=>row.period===period);if(this.state.selected){const stat=stats.find(row=>row.exerciseId===this.state.selected);if(!stat){this.state.selected=null;return this.renderStats()}return {text:`<b>${escape(stat.exerciseName)}</b>\n\nLatest: <b>${escape(stat.latestWeight||'—')} lb</b>\nBest: <b>${escape(stat.bestWeight||'—')} lb</b>\nChange: <b>${escape(stat.change||'—')} lb${stat.changePercent?` (${escape(stat.changePercent)})`:''}</b>\nSessions: <b>${escape(stat.sessions)}</b>\nLast performed: ${escape(stat.lastPerformed||'—')}`,keyboard:[[button('‹ Stats','back')],...NAV]}}
  const size=7;const pages=Math.max(1,Math.ceil(stats.length/size));this.state.page=clamp(this.state.page,pages);const rows=stats.slice(this.state.page*size,this.state.page*size+size).map(stat=>[button(stat.exerciseName,`sx:${stat.exerciseId}`)]);return {text:`<b>Stats</b>\nCalculated in Google Sheets${stats.length?'':'\n\nStats appear after recorded workouts.'}`,keyboard:[[button(period==='all'?'✓ Since starting':'Since starting','sp:all'),button(period==='year'?'✓ Last year':'Last year','sp:year')],[button(period==='quarter'?'✓ Last 3 months':'Last 3 months','sp:quarter')],...rows,[button('‹',`p:${Math.max(0,this.state.page-1)}`),button(`${this.state.page+1}/${pages}`,'noop'),button('›',`p:${Math.min(pages-1,this.state.page+1)}`)],...NAV]};
 }
 renderContext(){const raw=fs.readFileSync(this.contextPath,'utf8');const chunks=raw.replace(/^#+\s*/gm,'').match(/[\s\S]{1,3300}(?:\n|$)/g)||['No context available.'];const pages=chunks.length;this.state.page=clamp(this.state.page,pages);return {text:`<b>Context</b>\n\n${escape(chunks[this.state.page].trim())}`,keyboard:[[button('‹',`p:${Math.max(0,this.state.page-1)}`),button(`${this.state.page+1}/${pages}`,'noop'),button('›',`p:${Math.min(pages-1,this.state.page+1)}`)],...NAV]}}
}
