import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from 'baseui/button';
import ReactMarkdown from 'react-markdown';
import contextText from '../ABOUT.md?raw';
import type {Bootstrap,WorkoutSet} from './types';
import {activeVersion,cycleWeek,mondayOf} from './lib/date';
import {CurrentWeek} from './components/CurrentWeek';
import {History} from './components/History';
import {Stats} from './components/Stats';

export default function App(){
 const [data,setData]=useState<Bootstrap|null>(null); const [error,setError]=useState(''); const [view,setView]=useState(1); const [refreshing,setRefreshing]=useState(false); const rail=useRef<HTMLDivElement>(null); const touchY=useRef<number|null>(null);
 const load=()=>fetch('/api/v1/bootstrap').then(async r=>{if(!r.ok)throw new Error('Could not load workout data'); return r.json()}).then(value=>{setData(value);setError('')}).catch(e=>setError(e.message));
 useEffect(()=>{void load()},[]); useEffect(()=>{rail.current?.scrollTo({left:view*window.innerWidth,behavior:data?'auto':'smooth'})},[view,data]);
 const current=useMemo(()=>data&&activeVersion(data.versions),[data]); const week=current?cycleWeek(current):1; const monday=mondayOf();
 const submit=useCallback(async(sessionDate:string,results:WorkoutSet[])=>{const response=await fetch('/api/v1/results/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionDate,results})}); if(!response.ok)throw new Error('Submit failed'); setData(current=>current?{...current,workouts:[...current.workouts.filter(w=>w.sessionDate!==sessionDate),...results]}:current)},[]);
 const refresh=async()=>{if(refreshing)return;setRefreshing(true);await load();setRefreshing(false)};
 if(error)return <main className="state"><p>{error}</p><Button onClick={load}>Retry</Button></main>;
 if(!data||!current)return <main className="state">Loading routine…</main>;
 return <div className="app">{refreshing&&<div className="refreshing" role="status">Refreshing…</div>}<div className="rail" ref={rail} onTouchStart={e=>{const target=e.target as HTMLElement; const scroll=target.closest('.view');touchY.current=scroll?.scrollTop===0?e.touches[0].clientY:null}} onTouchEnd={e=>{if(touchY.current!==null&&e.changedTouches[0].clientY-touchY.current>80)void refresh();touchY.current=null}} onScroll={e=>{const el=e.currentTarget; clearTimeout(Number(el.dataset.timer)); el.dataset.timer=String(setTimeout(()=>setView(Math.round(el.scrollLeft/el.clientWidth)),80))}}>
   <section className="view" aria-label="History"><History workouts={data.workouts}/></section>
   <section className="view" aria-label="Current week"><CurrentWeek version={current} week={week} monday={monday} exercises={data.exercises} workouts={data.workouts} onSubmit={submit}/></section>
   <section className="view" aria-label="Stats"><Stats stats={data.stats}/></section>
   <section className="view markdown" aria-label="Context"><ReactMarkdown>{contextText}</ReactMarkdown></section>
 </div></div>;
}
