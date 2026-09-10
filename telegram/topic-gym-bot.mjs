import fs from 'node:fs';
import {activeVersion,createDraft,localISO,nextWorkout,recordedWorkouts,sessionRows} from './workout-domain.mjs';

const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const escapeRichMarkdown=value=>String(value??'').replace(/([\\`*_[\]{}()<>#+\-.!|])/g,'\\$1');
const button=(text,data)=>({text,callback_data:data});
const clamp=(value,max)=>Math.max(0,Math.min(value,Math.max(0,max-1)));
const savedDraft=(date,draft)=>({date,items:draft.map(item=>({exerciseId:item.exercise.exerciseId,sets:item.sets,comment:item.comment,removed:item.removed}))});

export function markdownToTelegram(markdown){
 const inline=value=>{const links=[];const marked=String(value).replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g,(_match,label,url)=>{links.push(`<a href="${escape(url).replaceAll('"','&quot;')}">${escape(label)}</a>`);return `\u0000${links.length-1}\u0000`});return escape(marked).replace(/\u0000(\d+)\u0000/g,(_match,index)=>links[Number(index)])};
 return markdown.trim().split('\n').map(line=>{
  const heading=line.match(/^(#{1,3})\s+(.+)$/);if(heading)return `${heading[1].length===1?'🏋️ ':heading[2].toLowerCase().includes('personal')?'👤 ':'📋 '}<b>${inline(heading[2])}</b>`;
  const item=line.match(/^\s*-\s+(.+)$/);if(item)return `  • ${inline(item[1])}`;
  return inline(line);
 }).join('\n').replace(/\n{3,}/g,'\n\n');
}

function hydrateDraft(saved,workout){
 if(!saved||saved.date!==workout.date)return undefined;
 const byId=new Map(saved.items.map(item=>[item.exerciseId,item]));
 return workout.day.map(exercise=>{const item=byId.get(exercise.exerciseId);return {exercise,sets:item?.sets?.length?item.sets:[{reps:'',weight:''}],comment:item?.comment||'',removed:Boolean(item?.removed)}});
}

export class TopicGymTelegramBot{
 constructor({api,sheets,chatId,topics,stateStore,contextPath,now=()=>new Date(),logger=console}){
  this.api=api;this.sheets=sheets;this.chatId=String(chatId);this.topics=topics;this.stateStore=stateStore;this.contextPath=contextPath;this.now=now;this.logger=logger;
  const stored=stateStore.load();this.state={screen:'current',page:0,historyMessages:{},contextHistory:[],savedDraft:stored.savedDraft,...stored,topics};if(!this.state.currentMessageId&&stored.messageId)this.state.currentMessageId=stored.messageId;this.data=null;this.version=null;this.workout=null;this.draft=[];this.queue=Promise.resolve();
 }
 persist(){if(this.workout)this.state.savedDraft=savedDraft(this.workout.date,this.draft);this.stateStore.save(this.state)}
 thread(message){return Number(message?.message_thread_id??1)}
 authorized(chat){return chat&&String(chat.id)===this.chatId}
 async refresh(){
  this.data=await this.sheets.loadBootstrap();this.version=activeVersion(this.data.versions,localISO(this.now()));if(!this.version)throw new Error('No active routine version');
  this.workout=nextWorkout(this.version,this.data.exercises,this.now());
  if(this.workout){const existing=this.data.workouts.filter(row=>row.sessionDate===this.workout.date);this.draft=hydrateDraft(this.state.savedDraft,this.workout)||createDraft(this.workout,existing)}else this.draft=[];
 }
 async start(){
  await this.api.call('deleteWebhook',{drop_pending_updates:false});await this.api.call('getMe');await this.api.call('getChat',{chat_id:this.chatId});await this.refresh();await this.syncHistory();await this.renderContext();await this.renderCurrent();this.logger.info('Topic-aware Telegram gym bot is polling its configured chat');let offset;
  for(;;){try{const updates=await this.api.call('getUpdates',{offset,timeout:50,allowed_updates:['message','callback_query']});for(const update of updates){offset=update.update_id+1;this.queue=this.queue.then(()=>this.handle(update)).catch(error=>this.report(error))}await this.queue}catch(error){this.report(error);await new Promise(resolve=>setTimeout(resolve,2000))}}
 }
 report(error){this.logger.error(error instanceof Error?error.message:String(error))}
 async handle(update){
  const query=update.callback_query;
  if(query){if(!this.authorized(query.message?.chat)||this.thread(query.message)!==this.topics.current){await this.api.call('answerCallbackQuery',{callback_query_id:query.id,text:'This control belongs to the Current topic',show_alert:true});return}await this.api.call('answerCallbackQuery',{callback_query_id:query.id});await this.action(query.data||'');return}
  const message=update.message;if(!this.authorized(message?.chat))return;
  if(this.thread(message)===this.topics.context&&!message.text?.startsWith('/topic')){if(message.text?.trim())await this.recordContext(message);return}
  if(this.thread(message)!==this.topics.current)return;
  if(this.state.prompt&&message.reply_to_message?.message_id===this.state.prompt.messageId){await this.acceptInput(message);return}
  if(message.text?.startsWith('/')){await this.refresh();this.state.screen='current';await this.renderCurrent(true)}
 }
 async recordContext(message){
  const text=message.text.trim().replace(/^\/context(?:@[A-Za-z0-9_]+)?\s*/,'');if(!text)return;
  const update={text,messageId:message.message_id,updatedAt:new Date(message.date*1000).toISOString()};this.state.contextPreference=update;this.state.contextHistory=[...this.state.contextHistory,update].slice(-100);this.persist();await this.renderContext();this.logger.info('Workout context preference updated from its configured topic');
 }
 item(){const item=this.draft[this.state.exercise];if(!item)throw new Error('Workout selection is no longer available');return item}
 async action(data){
  if(data==='noop')return this.renderCurrent();
  if(data==='home'){this.state.screen='current';this.state.exercise=null;this.state.set=null}
  else if(data==='stats'){this.state.screen='stats';this.state.page=0;this.state.stat=null;await this.refresh()}
  else if(data.startsWith('sp:')){this.state.period=data.slice(3);this.state.page=0;this.state.stat=null}
  else if(data.startsWith('pg:'))this.state.page=Math.max(0,Number(data.slice(3))||0);
  else if(data.startsWith('st:'))this.state.stat=Number(data.slice(3));
  else if(data.startsWith('ex:')){this.state.screen='exercise';this.state.exercise=Number(data.slice(3));this.state.set=null}
  else if(data.startsWith('set:')){this.state.screen='set';this.state.set=Number(data.slice(4))}
  else if(data==='exercise')this.state.screen='exercise';
  else if(data==='add'){this.item().sets.push({reps:'',weight:''});this.state.screen='exercise'}
  else if(data==='delset'){if(this.item().sets.length>1)this.item().sets.splice(this.state.set,1);this.state.set=null;this.state.screen='exercise'}
  else if(data==='remove'){this.item().removed=true;this.state.screen='current';this.state.exercise=null;this.state.set=null}
  else if(data.startsWith('undo:'))this.draft[Number(data.slice(5))].removed=false;
  else if(data==='submit')await this.submit();
  else if(data==='refresh')await this.refresh();
  else if(['reps','weight','comment'].includes(data))return this.prompt(data);
  this.persist();await this.renderCurrent();
 }
 async prompt(field){
  const item=this.item();const set=item.sets[this.state.set];const current=field==='comment'?item.comment:set?.[field]||'';const label=field==='comment'?`Comment for ${item.exercise.exerciseName}`:`${field==='reps'?'Reps':'Weight (lb)'} for ${item.exercise.exerciseName}, set ${this.state.set+1}`;
  const sent=await this.api.call('sendMessage',{chat_id:this.chatId,message_thread_id:this.topics.current,text:`${label}\nCurrent: ${current||'empty'}\nReply with a new value, or - to clear it.`,reply_markup:{force_reply:true,selective:true,input_field_placeholder:field==='comment'?'Optional comment':'Number or -'}});
  this.state.prompt={messageId:sent.message_id,field,exercise:this.state.exercise,set:this.state.set};this.persist();
 }
 async acceptInput(message){
  const prompt=this.state.prompt;const value=message.text==='-'?'':String(message.text??'').trim();const item=this.draft[prompt.exercise];let error='';
  if(!item)error='That exercise is no longer available.';else if(prompt.field!=='comment'&&!/^(?:\d+(?:\.\d+)?)?$/.test(value))error='Use a positive number, decimal, or - to clear.';else if(prompt.field==='comment'&&value.length>2000)error='Comment is too long.';
  if(error){await this.api.call('sendMessage',{chat_id:this.chatId,message_thread_id:this.topics.current,text:error,reply_parameters:{message_id:message.message_id}});return}
  if(prompt.field==='comment')item.comment=value;else item.sets[prompt.set][prompt.field]=value;delete this.state.prompt;this.persist();
  await this.api.call('deleteMessage',{chat_id:this.chatId,message_id:prompt.messageId}).catch(()=>{});await this.api.call('deleteMessage',{chat_id:this.chatId,message_id:message.message_id}).catch(()=>{});await this.renderCurrent();
 }
 async submit(){
  const rows=sessionRows(this.workout,this.version,this.draft,this.now());await this.sheets.replaceSession(this.workout.date,rows);delete this.state.savedDraft;this.state.notice='Workout submitted and verified in Google Sheets.';this.state.screen='current';await this.refresh();await this.syncHistory(this.workout.date);
 }
 async renderCurrent(forceNew=false){
  const rendered=this.renderScreen();const body={chat_id:this.chatId,message_thread_id:this.topics.current,text:rendered.text.slice(0,4096),parse_mode:'HTML',reply_markup:{inline_keyboard:rendered.keyboard}};
  if(this.state.currentMessageId&&!forceNew){try{await this.api.call('editMessageText',{...body,message_id:this.state.currentMessageId});return}catch(error){if(/message is not modified/i.test(error.message))return;this.report(error)}}
  const sent=await this.api.call('sendMessage',body);this.state.currentMessageId=sent.message_id;this.persist();
 }
 renderScreen(){if(this.state.screen==='stats')return this.renderStats();if(this.state.screen==='exercise')return this.renderExercise();if(this.state.screen==='set')return this.renderSet();return this.renderWorkout()}
 renderWorkout(){
  if(!this.workout)return {text:'<b>Current workout</b>\n\nNo upcoming workouts.',keyboard:[[button('Stats','stats')]]};
  const title=this.workout.isToday?"Today's workout":'Next workout';const rows=this.draft.map((item,index)=>item.removed?[button(`Undo · ${item.exercise.exerciseName}`,`undo:${index}`)]:[button(`${item.exercise.supersetId?'↕ ':''}${item.exercise.exerciseName}`,`ex:${index}`)]);const notice=this.state.notice?`\n\n✅ ${escape(this.state.notice)}`:'';delete this.state.notice;
  return {text:`<b>${title}</b>\nWeek ${this.workout.week} of ${this.version.cycleWeeks}\n${escape(this.workout.day[0].dayName)}\n${this.workout.date}${notice}`,keyboard:[...rows,[button('Submit workout','submit'),button('Refresh','refresh')],[button('Stats','stats')]]};
 }
 renderExercise(){const item=this.item();const sets=item.sets.map((set,index)=>[button(`Set ${index+1} · ${set.weight||'—'} lb × ${set.reps||'—'}`,`set:${index}`)]);return {text:`<b>${escape(item.exercise.exerciseName)}</b>\n${escape(item.exercise.targetReps)} reps · ${item.exercise.restSeconds}s rest${item.exercise.equipment?` · ${escape(item.exercise.equipment)}`:''}${item.exercise.guidance?`\n\n${escape(item.exercise.guidance)}`:''}\n\nComment: ${escape(item.comment||'—')}`,keyboard:[...sets,[button('＋ Set','add'),button('Comment','comment')],[button('Remove exercise','remove')],[button('‹ Current','home')]]}}
 renderSet(){const item=this.item();const set=item.sets[this.state.set];return {text:`<b>${escape(item.exercise.exerciseName)} · Set ${this.state.set+1}</b>\n\nReps: <b>${escape(set.reps||'—')}</b>\nWeight: <b>${escape(set.weight||'—')} lb</b>`,keyboard:[[button('Edit reps','reps'),button('Edit weight','weight')],[button('Delete set','delset')],[button('‹ Exercise','exercise')]]}}
 renderStats(){
  const period=this.state.period||'all';const stats=this.data.stats.filter(row=>row.period===period);
  if(this.state.stat!=null){const stat=stats[this.state.stat];if(!stat){this.state.stat=null;return this.renderStats()}return {text:`<b>${escape(stat.exerciseName)}</b>\n\nLatest: <b>${escape(stat.latestWeight||'—')} lb</b>\nBest: <b>${escape(stat.bestWeight||'—')} lb</b>\nChange: <b>${escape(stat.change||'—')} lb${stat.changePercent?` (${escape(stat.changePercent)})`:''}</b>\nSessions: <b>${escape(stat.sessions)}</b>\nLast performed: ${escape(stat.lastPerformed||'—')}`,keyboard:[[button('‹ Stats','stats')],[button('‹ Current','home')]]}}
  const size=7,pages=Math.max(1,Math.ceil(stats.length/size));this.state.page=clamp(this.state.page,pages);const start=this.state.page*size;const rows=stats.slice(start,start+size).map((stat,index)=>[button(stat.exerciseName,`st:${start+index}`)]);
  return {text:`<b>Stats</b>\nCalculated on request from Google Sheets${stats.length?'':'\n\nStats appear after recorded workouts.'}`,keyboard:[[button(period==='all'?'✓ Since starting':'Since starting','sp:all'),button(period==='year'?'✓ Last year':'Last year','sp:year')],[button(period==='quarter'?'✓ Last 3 months':'Last 3 months','sp:quarter')],...rows,[button('‹',`pg:${Math.max(0,this.state.page-1)}`),button(`${this.state.page+1}/${pages}`,'noop'),button('›',`pg:${Math.min(pages-1,this.state.page+1)}`)],[button('‹ Current','home')]]};
 }
 historyRichMessage(workout){
  const day=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(`${workout.date}T00:00:00Z`));const recordedName=String(workout.dayName||'').trim();const workoutType=recordedName.replace(new RegExp(`^${day}\\s*(?:—|–|-)\\s*`,'i'),'').trim();const type=!workoutType||workoutType.toLowerCase()===day.toLowerCase()?'Workout':workoutType;
  const lines=[`**Day**: ${escapeRichMarkdown(day)}`,'',`**Workout**: ${escapeRichMarkdown(type)}`,''];let previousSuperset='';
  const supersetOf=exercise=>exercise?this.data.exercises.find(item=>item.versionId===exercise.sets[0]?.versionId&&item.exerciseId===exercise.id)?.supersetId||'':'';
  for(const [index,exercise] of workout.exercises.entries()){const superset=supersetOf(exercise);const continuesSuperset=Boolean(superset&&superset===previousSuperset);if(index>0&&!continuesSuperset)lines.push('---');if(!continuesSuperset)lines.push('<blockquote>');lines.push(`<details><summary>${escapeRichMarkdown(exercise.name)}</summary>`,'','| Set | Weight | Reps |','|---:|---:|---:|',...exercise.sets.map(row=>`| ${escapeRichMarkdown(row.setNumber)} | ${escapeRichMarkdown(row.weight||'—')} lb | ${escapeRichMarkdown(row.reps||'—')} |`));const comment=exercise.sets.find(row=>row.comment)?.comment;if(comment)lines.push('',...String(comment).split('\n').map(line=>`> ${escapeRichMarkdown(line)}`));lines.push('','</details>','');if(!superset||superset!==supersetOf(workout.exercises[index+1]))lines.push('</blockquote>','');previousSuperset=superset}
  return {markdown:lines.join('\n').trim(),skip_entity_detection:true};
 }
 async syncHistory(onlyDate){
  const workouts=recordedWorkouts(this.data.workouts).filter(item=>!onlyDate||item.date===onlyDate).reverse();
  for(const [index,workout] of workouts.entries()){const body={chat_id:this.chatId,message_thread_id:this.topics.history,rich_message:this.historyRichMessage(workout)};const existing=this.state.historyMessages[workout.date];if(existing){try{await this.api.call('editMessageText',{...body,message_id:existing});continue}catch(error){if(/message is not modified/i.test(error.message))continue;this.report(error)}}const sent=await this.api.call('sendRichMessage',body);this.state.historyMessages[workout.date]=sent.message_id;this.persist();this.logger.info(`History topic synchronized ${index+1}/${workouts.length}`);if(index<workouts.length-1)await new Promise(resolve=>setTimeout(resolve,3200))}
 }
 async renderContext(){
  const source=markdownToTelegram(fs.readFileSync(this.contextPath,'utf8'));const override=this.state.contextPreference?.text;const text=`${source}${override?`\n\n<blockquote><b>Latest preference override</b>\n${escape(override)}</blockquote>`:''}`.slice(0,4096);const body={chat_id:this.chatId,message_thread_id:this.topics.context,text,parse_mode:'HTML',link_preview_options:{is_disabled:true}};
  if(this.state.contextMessageId){try{await this.api.call('editMessageText',{...body,message_id:this.state.contextMessageId});return}catch(error){if(/message is not modified/i.test(error.message))return;this.report(error)}}
  const sent=await this.api.call('sendMessage',body);this.state.contextMessageId=sent.message_id;this.persist();
 }
}
