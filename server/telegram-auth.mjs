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

export function telegramAuth({token}){
 if(!token)throw new Error('Telegram access configuration is required');
 return(req,res,next)=>{
  res.set('Cache-Control','no-store');
  const launch=req.get('X-Telegram-Init-Data');
  // Serve strips client-supplied identity headers; the backend binds to loopback.
  if(launch!==undefined){
   try{validateInitData(launch,token)}catch{return res.status(401).json({error:{message:'Invalid Telegram session. Reopen the app.'}})}
  }else{
   if(!req.get('Tailscale-User-Login')?.trim())return res.status(401).json({error:{message:'Connect to Tailscale to open Gym.'}});
   if(!['GET','HEAD','OPTIONS'].includes(req.method)){
    const origin=req.get('Origin');
    if(req.get('X-Gym-Request')!=='1'||['cross-site','same-site'].includes(req.get('Sec-Fetch-Site'))||(origin&&origin!==`https://${req.get('Host')}`))return res.status(403).json({error:{message:'Same-origin application request required.'}});
   }
  }
  next();
 };
}
