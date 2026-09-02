import type {RoutineVersion} from '../types';

export function localISO(date = new Date()): string {
  const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function mondayOf(date = new Date()): Date {
  const result = new Date(date); result.setHours(12,0,0,0); result.setDate(result.getDate()-((result.getDay()+6)%7)); return result;
}
export function activeVersion(versions: RoutineVersion[], date = localISO()): RoutineVersion | undefined {
  return versions.filter(v => v.effectiveFrom <= date && (!v.effectiveTo || v.effectiveTo >= date)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function cycleWeek(version: RoutineVersion, monday = mondayOf()): number {
  const start = mondayOf(new Date(`${version.effectiveFrom}T12:00:00`));
  const elapsed = Math.floor((monday.getTime()-start.getTime())/604800000);
  return ((elapsed % version.cycleWeeks)+version.cycleWeeks)%version.cycleWeeks+1;
}
export function dateForDay(dayOfWeek:number, monday=mondayOf()): string { const d=new Date(monday); d.setDate(d.getDate()+dayOfWeek-1); return localISO(d); }
