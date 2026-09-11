import {createHmac,timingSafeEqual} from 'node:crypto';

export function validateInitData(raw,token,now=Math.floor(Date.now()/1000)){
 if(typeof raw!=='string'||raw.length>16384)throw new Error('Invalid Telegram session');
 const params=new URLSearchParams(raw);
 if(new Set(params.keys()).size!==[...params.keys()].length)throw new Error('Invalid Telegram session');
 const hash=params.get('hash');params.delete('hash');
 const text=[...params].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=createHmac('sha256','WebAppData').update(token).digest();
 const expected=createHmac('sha256',secret).update(text).digest();
 if(!/^[a-f0-9]{64}$/.test(hash||'')||!timingSafeEqual(expected,Buffer.from(hash,'hex')))throw new Error('Invalid Telegram session');
 const date=Number(params.get('auth_date'));
 if(!Number.isInteger(date)||date>now+30||now-date>86400)throw new Error('Expired Telegram session');
 const user=JSON.parse(params.get('user')||'null');
 if(!Number.isSafeInteger(user?.id)||user.id<=0)throw new Error('Invalid Telegram user');
 return user;
}

export function telegramAuth({token,chatId,api}){
 if(!token||!chatId||!api)throw new Error('Telegram access configuration is required');
 return async(req,res,next)=>{
  res.set('Cache-Control','no-store');
  let user;
  try{user=validateInitData(req.get('X-Telegram-Init-Data'),token)}catch{return res.status(401).json({error:{message:'Open Gym from Telegram to continue.'}})}
  try{
   const member=await api.call('getChatMember',{chat_id:chatId,user_id:user.id});
   if(!['creator','administrator','member'].includes(member.status)&&!(member.status==='restricted'&&member.is_member))return res.status(403).json({error:{message:'This app is available to Gym group members only.'}});
   next();
  }catch{res.status(503).json({error:{message:'Could not verify Gym membership. Please retry.'}})}
 };
}
