import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createTelegramApi} from './telegram-api.mjs';
const url=new URL(process.env.TELEGRAM_GYM_MINI_APP_URL||'');
if(url.protocol!=='https:')throw new Error('An HTTPS TELEGRAM_GYM_MINI_APP_URL is required');
url.searchParams.set('telegram','1');
const api=createTelegramApi(process.env.TELEGRAM_GYM_BOT_TOKEN);
const chatId=process.env.TELEGRAM_GYM_CHAT_ID;
if(!chatId)throw new Error('TELEGRAM_GYM_CHAT_ID is required');
const health=await fetch(new URL('/api/health/live',url));
if(!health.ok)throw new Error('Mini App endpoint is unavailable');
const unsigned=await fetch(new URL('/api/v1/bootstrap',url));
if(unsigned.status!==401)throw new Error('Mini App endpoint must require Telegram authorization');
const me=await api.call('getMe');
await api.call('setChatMenuButton',{menu_button:{type:'web_app',text:'Open Gym',web_app:{url:url.href}}});
const menu=await api.call('getChatMenuButton');
if(menu.web_app?.url!==url.href)throw new Error('Menu read-back verification failed');
if(!me.has_main_web_app)throw new Error(`Enable the Main Mini App for @${me.username} in BotFather using ${url.href}, then rerun setup.`);
const statePath=process.env.TELEGRAM_GYM_MINI_APP_STATE_PATH||path.join(os.homedir(),'.local/state/gym-routine-tracker/mini-app.json');
let state={};try{state=JSON.parse(await fs.readFile(statePath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const body={chat_id:chatId,text:'Gym\n\nOpen your workout tracker: History, Current week, Stats, and Context.',reply_markup:{inline_keyboard:[[{text:'Open Gym',url:`https://t.me/${me.username}?startapp=gym`}]]}};
if(state.chatId===chatId&&state.messageId){
 try{await api.call('editMessageText',{...body,message_id:state.messageId})}catch(e){if(!e.message.includes('message is not modified'))throw e}
}else{
 // General topic: omit message_thread_id; Telegram rejects an explicit ID of 1.
 const message=await api.call('sendMessage',body);
 state={chatId,messageId:message.message_id};
 await fs.mkdir(path.dirname(statePath),{recursive:true,mode:0o700});
 await fs.writeFile(statePath,JSON.stringify(state),{mode:0o600});
}
console.log('Verified bot menu and installed Gym group launcher.');
