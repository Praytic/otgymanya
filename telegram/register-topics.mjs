import os from 'node:os';
import path from 'node:path';
import {createStateStore} from './state-store.mjs';
import {createTelegramApi} from './telegram-api.mjs';

const token=process.env.TELEGRAM_GYM_BOT_TOKEN;
const chatId=String(process.env.TELEGRAM_GYM_CHAT_ID||'');
if(!chatId)throw new Error('TELEGRAM_GYM_CHAT_ID is required');
const output=process.env.TELEGRAM_GYM_TOPICS_PATH||path.join(os.homedir(),'.local','state','gym-routine-tracker','topics.json');
const store=createStateStore(output);
const state={topics:{},...store.load()};
const api=createTelegramApi(token);
await api.call('deleteWebhook',{drop_pending_updates:false});
console.log(`Listening for topic instructions (${Object.keys(state.topics).length}/3 recorded)`);
let offset;
while(Object.keys(state.topics).length<3){
 const updates=await api.call('getUpdates',{offset,timeout:30,allowed_updates:['message']});
 for(const update of updates){
  offset=update.update_id+1;const message=update.message;
  if(!message||String(message.chat?.id)!==chatId||!message.is_topic_message||!message.message_thread_id||!message.text?.trim())continue;
  const id=String(message.message_thread_id);
  if(state.topics[id])continue;
  state.topics[id]={messageThreadId:message.message_thread_id,instruction:message.text.trim(),instructionMessageId:message.message_id};
  store.save(state);console.log(`Recorded topic ${Object.keys(state.topics).length}/3 (thread ${id})`);
 }
}
console.log('All three topic instructions recorded');
