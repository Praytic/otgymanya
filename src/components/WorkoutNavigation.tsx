import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';

type Direction=-1|1;
interface Props{previous?:string;next?:string;previousWeekday?:string;nextWeekday?:string;pageKey:string;active:boolean;onNavigate:(direction:Direction)=>void;children:ReactNode}
const EDGE_PX=2;
const WHEEL_INTENT_PX=48;
const TOUCH_INTENT_PX=32;
const PRESS_MS=500;
const WHEEL_IDLE_MS=180;

export function WorkoutNavigation({previous,next,previousWeekday,nextWeekday,pageKey,active,onNavigate,children}:Props){
 const root=useRef<HTMLDivElement>(null);
 const gestureLocked=useRef(false);
 const lastWheel=useRef(0);
 const transition=useRef<Direction|null>(null);
 const navigate=useRef(onNavigate);navigate.current=onNavigate;
 const [preview,setPreview]=useState<Direction|null>(null);
 const [pressing,setPressing]=useState(false);
 const turn=(d:Direction)=>{
  if(transition.current)return;
  gestureLocked.current=true;transition.current=d;setPreview(null);setPressing(false);
  navigate.current(d);
 };
 useLayoutEffect(()=>{
  const content=root.current;const view=content?.closest<HTMLElement>('.view');
  if(!content||!view)return;
  const d=transition.current;
  // Backwards pagination lands at the previous page's bottom, forwards at its top.
  view.scrollTop=d===-1?view.scrollHeight:0;
  transition.current=null;
  if(d&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const animation=content.animate([{transform:`translateY(${d*view.clientHeight}px)`,opacity:.3},{transform:'translateY(0)',opacity:1}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
   return()=>animation.cancel();
  }
 },[pageKey]);
 useEffect(()=>{
  const view=root.current?.closest<HTMLElement>('.view');
  if(!view||!active)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let idle:ReturnType<typeof setTimeout>|undefined;
  let dismiss:ReturnType<typeof setTimeout>|undefined;
  let direction:Direction|null=null;let amount=0;let wheelStart=0;let shown=false;
  let touch:{x:number;y:number;lastY:number;edge:Direction|null}|undefined;
  const cancel=(hide=true)=>{clearTimeout(timer);timer=undefined;direction=null;amount=0;wheelStart=0;setPressing(false);if(hide){shown=false;setPreview(null)}};
  const edge=(d:Direction)=>d===-1?Boolean(previous)&&view.scrollTop<=EDGE_PX:Boolean(next)&&view.scrollTop+view.clientHeight>=view.scrollHeight-EDGE_PX;
  const ignored=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable=true]'));
  const reveal=(d:Direction)=>{clearTimeout(dismiss);shown=true;setPreview(d)};
  const release=()=>{cancel(false);shown=false;clearTimeout(dismiss);dismiss=setTimeout(()=>{shown=false;setPreview(null)},2000)};
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||ignored(event.target)){cancel();return}
   const now=performance.now();
   if(now-lastWheel.current>WHEEL_IDLE_MS)gestureLocked.current=false;
   lastWheel.current=now;
   clearTimeout(idle);idle=setTimeout(()=>{release();gestureLocked.current=false},WHEEL_IDLE_MS);
   if(gestureLocked.current)return;
   const d:Direction=event.deltaY>0?1:-1;
   if(!edge(d)){cancel();return}
   if(event.cancelable)event.preventDefault();
   if(direction!==d){cancel();direction=d}
   // Normalize line/page wheel units; ignore horizontal and pinch gestures above.
   amount+=Math.abs(event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?view.clientHeight:1);
   if(amount<WHEEL_INTENT_PX)return;
   if(!shown){reveal(d);wheelStart=now;setPressing(/Mac/i.test(navigator.platform))}
   if(/Mac/i.test(navigator.platform)&&now-wheelStart>=PRESS_MS){cancel();turn(d)}
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
   if(Math.abs(t.clientY-touch.y)<TOUCH_INTENT_PX){cancel();return}
   if(direction!==d){cancel();direction=d;reveal(d);setPressing(true);timer=setTimeout(()=>{if(edge(d)){cancel();turn(d)}else cancel()},PRESS_MS)}
  };
  const end=()=>{touch=undefined;gestureLocked.current=false;release()};
  const abort=()=>{touch=undefined;cancel()};
  const scroll=()=>{if((direction&&!edge(direction))||(!edge(-1)&&!edge(1)))cancel()};
  const key=(event:KeyboardEvent)=>{
   if(ignored(event.target))return;
   const d=event.key==='ArrowDown'||event.key==='PageDown'?1:event.key==='ArrowUp'||event.key==='PageUp'?-1:null;
   if(d&&edge(d)){event.preventDefault();reveal(d)}
   if(event.key==='Escape')cancel();
  };
  view.addEventListener('wheel',wheel,{passive:false});view.addEventListener('keydown',key);
  view.addEventListener('touchstart',start,{passive:true});view.addEventListener('touchmove',move,{passive:false});
  view.addEventListener('touchend',end);view.addEventListener('touchcancel',abort);
  view.addEventListener('scroll',scroll);window.addEventListener('blur',abort);
  return()=>{cancel();clearTimeout(idle);clearTimeout(dismiss);view.removeEventListener('wheel',wheel);view.removeEventListener('keydown',key);view.removeEventListener('touchstart',start);view.removeEventListener('touchmove',move);view.removeEventListener('touchend',end);view.removeEventListener('touchcancel',abort);view.removeEventListener('scroll',scroll);window.removeEventListener('blur',abort)};
 },[pageKey,active,previous,next]);
 const control=(d:Direction)=>{
  const label=d===-1?previous:next;const weekday=d===-1?previousWeekday:nextWeekday;
  return <div className="workout-edge-slot">{active&&preview===d&&label&&<button type="button" className={`workout-edge${pressing?' pressing':''}`} aria-label={`${d===-1?'Previous':'Next'} workout: ${label}`} onClick={()=>turn(d)}>{weekday}</button>}</div>;
 };
 return <div className="workout-page" ref={root}>{control(-1)}<div className="workout-page-content">{children}</div>{control(1)}</div>;
}
