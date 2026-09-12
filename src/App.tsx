import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from 'baseui/button';
import ReactMarkdown from 'react-markdown';
import {apiFetch,isMiniApp,useTelegramNavigation} from './lib/telegram';
import type {Bootstrap,WorkoutSet} from './types';
import {activeVersion} from './lib/date';
import {loadSheetCache,saveSheetCache} from './lib/localStorage';
import {CurrentWeek} from './components/CurrentWeek';
import {History} from './components/History';
import {Stats} from './components/Stats';

export default function App(){
 const [data,setData]=useState<Bootstrap|null>(()=>isMiniApp()?null:loadSheetCache()??null); const [error,setError]=useState(''); const [stale,setStale]=useState(()=>!isMiniApp()&&Boolean(loadSheetCache())); const [view,setView]=useState(1); const rail=useRef<HTMLDivElement>(null);
 const [contextText,setContextText]=useState('');
 useTelegramNavigation(view,setView);
 useEffect(()=>{void apiFetch('/api/v1/context').then(r=>r.ok?r.json():Promise.reject()).then(value=>setContextText(value.text)).catch(()=>setContextText('Context is unavailable. Reopen the app to retry.'))},[]);
 const load=()=>apiFetch('/api/v1/bootstrap').then(async r=>{if(!r.ok)throw new Error((await r.json().catch(()=>null))?.error?.message||'Could not load workout data'); return r.json() as Promise<Bootstrap>}).then(value=>{if(!isMiniApp())saveSheetCache(value);setData(value);setStale(false);setError('')}).catch(e=>{setStale(Boolean(data));setError(e.message)});
 useEffect(()=>{void load()},[]); useEffect(()=>{rail.current?.scrollTo({left:view*window.innerWidth,behavior:data?'auto':'smooth'})},[view,data]);
 const current=useMemo(()=>data&&activeVersion(data.versions),[data]);
 const submit=useCallback(async(sessionDate:string,results:WorkoutSet[])=>{const response=await apiFetch('/api/v1/results/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionDate,results})}); if(!response.ok)throw new Error('Submit failed'); setData(current=>{if(!current)return current;const next={...current,workouts:[...current.workouts.filter(w=>w.sessionDate!==sessionDate),...results]};if(!isMiniApp())saveSheetCache(next);return next})},[]);
 if(error&&!data)return <main className="state"><p>{error}</p><Button onClick={load}>Retry</Button></main>;
 if(!data||!current)return <main className="state">Loading routine…</main>;
 return <div className="app">{stale&&<div className="offline-notice" role="status">Offline · showing saved data <Button kind="tertiary" size="compact" onClick={load}>Retry</Button></div>}<div className="rail" ref={rail} onScroll={e=>{const el=e.currentTarget; clearTimeout(Number(el.dataset.timer)); el.dataset.timer=String(setTimeout(()=>setView(Math.round(el.scrollLeft/el.clientWidth)),80))}}>
   <section className="view" aria-label="History"><History workouts={data.workouts}/></section>
   <section className="view current-workout-view" aria-label="Current week"><CurrentWeek active={view===1} version={current} exercises={data.exercises} workouts={data.workouts} onSubmit={submit}/></section>
   <section className="view" aria-label="Stats"><Stats stats={data.stats}/></section>
   <section className="view markdown" aria-label="Context"><ReactMarkdown>{contextText}</ReactMarkdown></section>
 </div></div>;
}
