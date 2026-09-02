import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from 'baseui/button';
import ReactMarkdown from 'react-markdown';
import contextText from '../ABOUT.md?raw';
import type {Bootstrap,WorkoutSet} from './types';
import {activeVersion,cycleWeek,dateForDay,mondayOf} from './lib/date';
import {CurrentWeek} from './components/CurrentWeek';
import {History} from './components/History';
import {Stats} from './components/Stats';

const views=['History','Current','Stats','Context'] as const;
export default function App(){
 const [data,setData]=useState<Bootstrap|null>(null); const [error,setError]=useState(''); const [view,setView]=useState(1); const rail=useRef<HTMLDivElement>(null);
 const load=()=>fetch('/api/v1/bootstrap').then(async r=>{if(!r.ok)throw new Error('Could not load workout data'); return r.json()}).then(setData).catch(e=>setError(e.message));
 useEffect(()=>{void load()},[]); useEffect(()=>{rail.current?.scrollTo({left:view*window.innerWidth,behavior:data?'auto':'smooth'})},[view,data]);
 const current=useMemo(()=>data&&activeVersion(data.versions),[data]); const week=current?cycleWeek(current):1; const monday=mondayOf();
 const save=useCallback(async(result:WorkoutSet)=>{const response=await fetch('/api/v1/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)}); if(!response.ok)throw new Error('Save failed'); setData(current=>current?{...current,workouts:[...current.workouts.filter(w=>w.recordId!==result.recordId),result]}:current)},[]);
 if(error)return <main className="state"><p>{error}</p><Button onClick={load}>Retry</Button></main>;
 if(!data||!current)return <main className="state">Loading routine…</main>;
 return <div className="app"><nav className="topnav" aria-label="Views"><div>{views.map((label,i)=><Button key={label} kind={view===i?'primary':'secondary'} aria-current={view===i?'page':undefined} onClick={()=>setView(i)}>{label}</Button>)}</div></nav><div className="rail" ref={rail} onScroll={e=>{const el=e.currentTarget; clearTimeout(Number(el.dataset.timer)); el.dataset.timer=String(setTimeout(()=>setView(Math.round(el.scrollLeft/el.clientWidth)),80))}}>
   <section className="view" aria-label="History"><History workouts={data.workouts}/></section>
   <section className="view" aria-label="Current week"><CurrentWeek version={current} week={week} monday={monday} exercises={data.exercises} workouts={data.workouts} onSave={save}/></section>
   <section className="view" aria-label="Stats"><Stats stats={data.stats}/></section>
   <section className="view markdown" aria-label="Context"><ReactMarkdown>{contextText}</ReactMarkdown></section>
 </div></div>;
}
