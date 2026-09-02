import {describe,expect,it} from 'vitest';
import {activeVersion,cycleWeek,dateForDay,mondayOf} from './date';

describe('routine dates',()=>{
  it('selects latest effective version',()=>expect(activeVersion([{id:'a',name:'',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''},{id:'b',name:'',effectiveFrom:'2026-02-01',effectiveTo:'',cycleWeeks:6,notes:''}],'2026-02-10')?.id).toBe('b'));
  it('cycles weeks from effective week',()=>expect(cycleWeek({id:'a',name:'',effectiveFrom:'2026-08-31',effectiveTo:'',cycleWeeks:6,notes:''},mondayOf(new Date('2026-09-14T12:00:00')))).toBe(3));
  it('maps Monday and Wednesday',()=>{const m=mondayOf(new Date('2026-09-02T12:00:00')); expect(dateForDay(1,m)).toBe('2026-08-31'); expect(dateForDay(3,m)).toBe('2026-09-02')});
});
