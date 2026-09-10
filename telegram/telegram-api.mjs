export class TelegramApiError extends Error{
 constructor(method,status,description){super(`Telegram ${method} failed (${status}): ${description}`);this.name='TelegramApiError';this.status=status}
}

export function createTelegramApi(token,{fetchImpl=fetch}={}){
 if(!token)throw new Error('TELEGRAM_GYM_BOT_TOKEN is required');
 const base=`https://api.telegram.org/bot${token}`;
 const call=async(method,body={})=>{
  const response=await fetchImpl(`${base}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  let payload;
  try{payload=await response.json()}catch{throw new TelegramApiError(method,response.status,'invalid JSON response')}
  if(!response.ok||!payload.ok)throw new TelegramApiError(method,response.status,payload.description||'unknown error');
  return payload.result;
 };
 return {call};
}
