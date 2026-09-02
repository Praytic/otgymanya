import {useState} from 'react';
import type {ComponentType} from 'react';
import {Button} from 'baseui/button';
import {ButtonGroup} from 'baseui/button-group';
import type {Stat} from '../types';
import {LucideIcon} from './LucideIcon';
const periods=[['all','Since starting'],['year','Last year'],['quarter','Last 3 months']] as const;
const BaseButtonGroup=ButtonGroup as unknown as ComponentType<any>;
export function Stats({stats}:{stats:Stat[]}){
 const [period,setPeriod]=useState('all');
 const [expanded,setExpanded]=useState<string|null>(null);
 const rows=stats.filter(stat=>stat.period===period);
 const changePeriod=(id:string)=>{setPeriod(id);setExpanded(null)};
 const selected=periods.findIndex(([id])=>id===period);
 return <><header className="compact-header"><h1>Stats</h1><p>Calculated in Google Sheets</p></header><div className="periods"><BaseButtonGroup selected={selected} mode="radio">{periods.map(([id,label])=><Button onClick={()=>changePeriod(id)} key={id}>{label}</Button>)}</BaseButtonGroup></div>{rows.length===0?<p className="empty">Stats appear after recorded workouts.</p>:<div className="stats-list">{rows.map(stat=>{
  const isExpanded=expanded===stat.exerciseId;
  const panelId=`stat-${period}-${stat.exerciseId}`;
  return <section className="stat-block" key={stat.exerciseId}><button className="stat-row" type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={()=>setExpanded(current=>current===stat.exerciseId?null:stat.exerciseId)}><strong>{stat.exerciseName}</strong><LucideIcon name={isExpanded?'collapse':'expand'}/></button>{isExpanded&&<article className="stat-details stat" id={panelId}><dl><div><dt>Latest</dt><dd>{stat.latestWeight||'—'} lb</dd></div><div><dt>Best</dt><dd>{stat.bestWeight||'—'} lb</dd></div><div><dt>Change</dt><dd>{stat.change||'—'} lb {stat.changePercent&&`(${stat.changePercent})`}</dd></div><div><dt>Sessions</dt><dd>{stat.sessions}</dd></div></dl></article>}</section>;
 })}</div>}</>;
}
