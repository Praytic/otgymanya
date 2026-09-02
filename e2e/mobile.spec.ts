import {test,expect} from '@playwright/test';
test('mobile workout editor groups a day and submits it as one replacement',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 let writes=0;
 const versions=[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}];
 const exercises=[{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'',guidance:'Work up through warm-up sets to a heavy 3–5-rep max.'},{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,exerciseId:'row',exerciseName:'Bent Over Row',exerciseOrder:2,sets:2,targetReps:'8–12',restSeconds:90,equipment:'Barbell',instructions:'',guidance:'Pair this pull with face pulls.'},{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:5,dayName:'Friday — Strength',dayOrder:2,exerciseId:'squat',exerciseName:'Squat',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'',guidance:'Work up to a heavy set.'}];
 const saved=(exerciseId:string,exerciseName:string,setNumber:number)=>({recordId:`2026-09-02:${exerciseId}:${setNumber}`,sessionDate:'2026-09-02',versionId:'v1',cycleWeek:6,dayName:'Wednesday — Strength',exerciseId,exerciseName,setNumber,reps:'5',weight:'100',comment:'',updatedAt:'2026-09-02T12:00:00.000Z'});
 let workouts=[saved('bench','Bench Press',1),saved('bench','Bench Press',2),saved('row','Bent Over Row',1),saved('row','Bent Over Row',2)];
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions,exercises,workouts,stats:[]}}));
 await page.route('**/api/v1/results/session',async r=>{writes++;workouts=(await r.request().postDataJSON()).results;return r.fulfill({status:204})});
 await page.goto('/');
 await expect(page.locator('nav')).toHaveCount(0);
 await expect.poll(()=>page.locator('.rail').evaluate(e=>e.scrollLeft)).toBeGreaterThan(300);
 await expect(page.getByRole('heading',{name:"Today's workout"})).toBeInViewport();
 const rootOverflow=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).overflowY}));
 expect(rootOverflow).toEqual({html:'visible',body:'visible'});
 await expect(page.getByRole('button',{name:/Bench Press/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toBeVisible();
 await expect(page.locator('.view').nth(1).evaluate(view=>getComputedStyle(view).overflowY)).resolves.toBe('auto');
 await expect(page.getByLabel(/workout day/)).toHaveCount(0);
 await expect(page.getByLabel('Bench Press set 1 reps')).toHaveCount(0);
 await page.getByRole('button',{name:/Bench Press/}).click();
 await expect(page.getByText('Work up through warm-up sets to a heavy 3–5-rep max.')).toBeVisible();
 await expect(page.getByLabel('Bench Press comment')).toHaveCount(0);
 await page.getByRole('button',{name:'Add comment for Bench Press'}).click();
 await expect(page.getByLabel('Bench Press comment')).toBeVisible();
 await page.getByLabel('Bench Press comment').fill('Strong set');
 await page.getByLabel('Bench Press set 1 reps').fill('5');
 await page.getByLabel('Bench Press set 1 weight').fill('135');
 await page.getByLabel('Remove set from Bench Press').click();
 await expect(page.getByLabel('Remove set from Bench Press')).toBeDisabled();
 await page.getByLabel('Add set to Bench Press').click();
 await expect(page.getByLabel('Bench Press set 2 reps')).toBeVisible();
 await page.getByLabel('Remove set from Bench Press').click();
 await page.getByRole('button',{name:/Bent Over Row/}).click();
 await page.getByLabel('Bent Over Row set 1 reps').fill('9');
 await page.getByLabel('Add comment for Bent Over Row').click();
 await page.getByLabel('Bent Over Row comment').fill('Keep this note');
 const removeExercise=page.getByLabel('Remove Bent Over Row');
 await expect(removeExercise.evaluate(button=>getComputedStyle(button).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
 await expect(removeExercise.evaluate(button=>getComputedStyle(button.parentElement!).borderTopStyle)).resolves.toBe('solid');
 await page.getByLabel('Remove Bent Over Row').click();
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toHaveCount(0);
 await expect(page.getByText('Bent Over Row removed')).toBeVisible();
 await page.getByRole('button',{name:'Undo'}).click();
 await page.getByRole('button',{name:/Bent Over Row/}).click();
 await expect(page.getByLabel('Bent Over Row set 1 reps')).toHaveValue('9');
 await expect(page.getByLabel('Bent Over Row comment')).toHaveValue('Keep this note');
 await page.getByLabel('Remove Bent Over Row').click();
 await expect(page.locator('.lucide-icon')).not.toHaveCount(0);
 await expect(page.locator('.view').nth(1).evaluate(view=>view.scrollWidth<=view.clientWidth)).resolves.toBe(true);
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect.poll(()=>writes).toBe(1);
 await expect(page.getByText('Submitted')).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:/Bench Press/}).click();
 await expect(page.getByLabel('Bench Press set 2 reps')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toHaveCount(0);
});

test('shows the next upcoming workout when today is a rest day',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-03T12:00:00'));
 const versions=[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}];
 const exercises=[{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:5,dayName:'Friday — Strength',dayOrder:1,exerciseId:'squat',exerciseName:'Squat',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:''}];
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions,exercises,workouts:[],stats:[]}}));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Next workout'})).toBeInViewport();
 await expect(page.getByText('Friday — Strength')).toBeVisible();
 await expect(page.getByText(/2026-09-04/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Squat'})).toBeVisible();
 await expect(page.getByLabel(/workout day/)).toHaveCount(0);
});

test('history expands workouts and preserves recorded exercise order',async({page})=>{
 const base={sessionDate:'2026-08-31',versionId:'v1',cycleWeek:1,dayName:'Monday — Strength',reps:'5',weight:'100',comment:'',updatedAt:'2026-08-31T12:00:00.000Z'};
 const workouts=[
  {...base,recordId:'row-1',exerciseId:'row',exerciseName:'Bent Over Row',setNumber:1},
  {...base,recordId:'row-2',exerciseId:'row',exerciseName:'Bent Over Row',setNumber:2},
  {...base,recordId:'bench-1',exerciseId:'bench',exerciseName:'Bench Press',setNumber:1},
 ];
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}],exercises:[],workouts,stats:[]}}));
 await page.goto('/');
 await page.locator('.rail').evaluate(element=>element.scrollTo({left:0}));
 const workout=page.getByRole('button',{name:/2026-08-31.*2 exercises/});
 await expect(workout).toBeVisible();
 await expect(page.getByRole('heading',{name:'Bent Over Row'})).toHaveCount(0);
 await workout.click();
 await expect(page.getByRole('heading',{name:'Bent Over Row'})).toBeVisible();
 await expect(page.locator('.history-sets p')).toHaveCount(2);
 await page.getByRole('button',{name:'Next completed exercise'}).click();
 await expect(page.getByRole('heading',{name:'Bench Press'})).toBeVisible();
});

test('stats uses expandable exercise blocks instead of pages',async({page})=>{
 const stats=[
  {exerciseId:'bench',exerciseName:'Bench Press',period:'all',sessions:4,firstWeight:'100',latestWeight:'120',bestWeight:'125',change:'20',changePercent:'20%',lastPerformed:'2026-08-31'},
  {exerciseId:'row',exerciseName:'Bent Over Row',period:'all',sessions:3,firstWeight:'80',latestWeight:'90',bestWeight:'90',change:'10',changePercent:'12.5%',lastPerformed:'2026-08-31'},
 ];
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}],exercises:[],workouts:[],stats}}));
 await page.goto('/');
 await page.locator('.rail').evaluate(element=>element.scrollTo({left:element.clientWidth*2}));
 await expect(page.getByRole('heading',{name:'Stats'})).toBeInViewport();
 const bench=page.getByRole('button',{name:'Bench Press'});
 const row=page.getByRole('button',{name:'Bent Over Row'});
 await expect(bench).toHaveAttribute('aria-expanded','false');
 await expect(row).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.pagination')).toHaveCount(0);
 await bench.click();
 await expect(bench).toHaveAttribute('aria-expanded','true');
 await expect(page.getByText('125 lb')).toBeVisible();
 await row.click();
 await expect(bench).toHaveAttribute('aria-expanded','false');
 await expect(row).toHaveAttribute('aria-expanded','true');
 await expect(page.getByText('90 lb').first()).toBeVisible();
});
