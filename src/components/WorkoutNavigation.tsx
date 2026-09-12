import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';

type Direction=-1|1;
interface Props{previous?:string;next?:string;pageKey:string;active:boolean;onNavigate:(direction:Direction)=>void;children:ReactNode}

// Native scrolling owns the page. Only deliberate pressure beyond an edge turns it.
export function WorkoutNavigation({previous,next,pageKey,active,onNavigate,children}:Props){
 const root=useRef<HTMLDivElement>(null);
 const gestureLocked=useRef(false);
 const lastWheel=useRef(0);
 const navigate=useRef(onNavigate);navigate.current=onNavigate;
 const [pressing,setPressing]=useState<Direction|null>(null);
 useEffect(()=>{
  const content=root.current;const view=content?.closest<HTMLElement>('.view');
  if(!content||!view)return;
  view.scrollTop=0;
  if(!active)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let idle:ReturnType<typeof setTimeout>|undefined;
  let direction:Direction|null=null;let wheelStart=0;
  let touch:{x:number;y:number;lastY:number;edge:Direction|null}|undefined;
  const cancel=()=>{clearTimeout(timer);timer=undefined;direction=null;wheelStart=0;setPressing(null)};
  const edge=(d:Direction)=>d===-1?Boolean(previous)&&view.scrollTop<=2:Boolean(next)&&view.scrollTop+view.clientHeight>=view.scrollHeight-2;
  const ignored=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable=true]'));
  const turn=(d:Direction)=>{cancel();gestureLocked.current=true;navigate.current(d)};
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||ignored(event.target)){cancel();return}
   // Mouse wheels remain click-only; macOS supplies wheel events for trackpads.
   if(!/Mac/i.test(navigator.platform))return;
   if(performance.now()-lastWheel.current>180)gestureLocked.current=false;
   lastWheel.current=performance.now();
   clearTimeout(idle);idle=setTimeout(()=>{cancel();gestureLocked.current=false},180);
   if(gestureLocked.current)return;
   const d:Direction=event.deltaY>0?1:-1;
   if(!edge(d)){cancel();return}
   if(event.cancelable)event.preventDefault();
   if(direction!==d){cancel();direction=d;wheelStart=performance.now();setPressing(d)}
   if(performance.now()-wheelStart>=500)turn(d);
  };
  const start=(event:TouchEvent)=>{
   cancel();gestureLocked.current=false;
   if(event.touches.length!==1||ignored(event.target)){touch=undefined;return}
   const t=event.touches[0];touch={x:t.clientX,y:t.clientY,lastY:t.clientY,edge:null};
  };
  const move=(event:TouchEvent)=>{
   if(!touch||gestureLocked.current||event.touches.length!==1){cancel();return}
   const t=event.touches[0];const dy=touch.lastY-t.clientY;touch.lastY=t.clientY;
   if(Math.abs(t.clientX-touch.x)>Math.abs(t.clientY-touch.y)){cancel();touch=undefined;return}
   if(Math.abs(dy)<1)return;
   const d:Direction=dy>0?1:-1;
   if(!edge(d)){cancel();touch.edge=null;touch.y=t.clientY;return}
   if(event.cancelable)event.preventDefault();
   if(touch.edge!==d){cancel();touch.edge=d;touch.y=t.clientY;return}
   if(Math.abs(t.clientY-touch.y)<32){cancel();return}
   if(direction!==d){cancel();direction=d;setPressing(d);timer=setTimeout(()=>{if(edge(d))turn(d);else cancel()},500)}
  };
  const end=()=>{touch=undefined;gestureLocked.current=false;cancel()};
  const scroll=()=>{if(direction&&!edge(direction))cancel()};
  view.addEventListener('wheel',wheel,{passive:false});
  view.addEventListener('touchstart',start,{passive:true});
  view.addEventListener('touchmove',move,{passive:false});
  view.addEventListener('touchend',end);view.addEventListener('touchcancel',end);
  view.addEventListener('scroll',scroll);window.addEventListener('blur',end);
  return()=>{cancel();clearTimeout(idle);view.removeEventListener('wheel',wheel);view.removeEventListener('touchstart',start);view.removeEventListener('touchmove',move);view.removeEventListener('touchend',end);view.removeEventListener('touchcancel',end);view.removeEventListener('scroll',scroll);window.removeEventListener('blur',end)};
 },[pageKey,active,previous,next]);
 const button=(d:Direction,label?:string)=>label?<button type="button" className={`workout-edge${pressing===d?' pressing':''}`} aria-label={`${d===-1?'Previous':'Next'} workout: ${label}`} onClick={()=>navigate.current(d)}><span aria-hidden="true">{d===-1?'↑':'↓'}</span><span>{label}</span></button>:null;
 return <div className="workout-page" ref={root}>{button(-1,previous)}<div className="workout-page-content">{children}</div>{button(1,next)}</div>;
}
