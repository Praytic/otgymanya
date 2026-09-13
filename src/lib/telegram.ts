import {useEffect} from 'react';
type WebApp={initData:string;ready:()=>void;expand:()=>void;isVersionAtLeast:(v:string)=>boolean;setHeaderColor:(c:string)=>void;setBackgroundColor:(c:string)=>void;setBottomBarColor?:(c:string)=>void;disableVerticalSwipes?:()=>void;BackButton:{show:()=>void;hide:()=>void;onClick:(fn:()=>void)=>void;offClick:(fn:()=>void)=>void}};
declare global{interface Window{Telegram?:{WebApp:WebApp}}}
export function initializeTelegram(){
 const app=window.Telegram?.WebApp;if(!app?.initData)return;
 document.documentElement.classList.add('telegram');
 app.ready();app.expand();
 if(app.isVersionAtLeast('6.1')){app.setHeaderColor('#ffffff');app.setBackgroundColor('#ffffff')}
 if(app.isVersionAtLeast('7.10'))app.setBottomBarColor?.('#ffffff');
 if(app.isVersionAtLeast('7.7'))app.disableVerticalSwipes?.();
}
export function apiFetch(url:string,options:RequestInit={}){
 const headers=new Headers(options.headers);
 const raw=window.Telegram?.WebApp.initData;
 if(raw)headers.set('X-Telegram-Init-Data',raw);
 return fetch(url,{...options,headers});
}
export function useTelegramNavigation(view:number,setView:(view:number)=>void){
 useEffect(()=>{
  const app=window.Telegram?.WebApp;if(!app?.initData)return;
  const back=()=>setView(1);
  if(view===1)app.BackButton.hide();else app.BackButton.show();
  app.BackButton.onClick(back);return()=>app.BackButton.offClick(back);
 },[view,setView]);
}
