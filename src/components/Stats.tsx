import {useState} from 'react';
import type {ComponentType} from 'react';
import {Button} from 'baseui/button';
import {ButtonGroup} from 'baseui/button-group';
import {Card} from 'baseui/card';
import type {Stat} from '../types';
import {Pager} from './CurrentWeek';
const periods=[['all','Since starting'],['year','Last year'],['quarter','Last 3 months']] as const;
const BaseButtonGroup=ButtonGroup as unknown as ComponentType<any>;
export function Stats({stats}:{stats:Stat[]}){const [period,setPeriod]=useState('all'); const [page,setPage]=useState(0); const rows=stats.filter(s=>s.period===period); const stat=rows[page]; const changePeriod=(id:string)=>{setPeriod(id);setPage(0)}; const selected=periods.findIndex(([id])=>id===period); return <><header className="compact-header"><h1>Stats</h1><p>Calculated in Google Sheets</p></header><div className="periods"><BaseButtonGroup selected={selected} mode="radio">{periods.map(([id,label])=><Button onClick={()=>changePeriod(id)} key={id}>{label}</Button>)}</BaseButtonGroup></div>{!stat?<p className="empty">Stats appear after recorded workouts.</p>:<><Card><article className="stat"><h2>{stat.exerciseName}</h2><dl><div><dt>Latest</dt><dd>{stat.latestWeight||'—'} lb</dd></div><div><dt>Best</dt><dd>{stat.bestWeight||'—'} lb</dd></div><div><dt>Change</dt><dd>{stat.change||'—'} lb {stat.changePercent&&`(${stat.changePercent})`}</dd></div><div><dt>Sessions</dt><dd>{stat.sessions}</dd></div></dl></article></Card><Pager page={page} count={rows.length} label="stat" onPage={setPage}/></>}</>}
