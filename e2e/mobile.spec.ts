import {test,expect} from '@playwright/test';
test('mobile workout editor groups a day and submits it as one replacement',async({page})=>{
 let writes=0;
 const versions=[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}];
 const exercises=[{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:1,dayName:'Monday — Strength',dayOrder:1,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:''},{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:1,dayName:'Monday — Strength',dayOrder:1,exerciseId:'row',exerciseName:'Bent Over Row',exerciseOrder:2,sets:2,targetReps:'8–12',restSeconds:90,equipment:'Barbell',instructions:''}];
 const saved=(exerciseId:string,exerciseName:string,setNumber:number)=>({recordId:`2026-08-31:${exerciseId}:${setNumber}`,sessionDate:'2026-08-31',versionId:'v1',cycleWeek:1,dayName:'Monday — Strength',exerciseId,exerciseName,setNumber,reps:'5',weight:'100',comment:'',updatedAt:'2026-08-31T12:00:00.000Z'});
 let workouts=[saved('bench','Bench Press',1),saved('bench','Bench Press',2),saved('row','Bent Over Row',1),saved('row','Bent Over Row',2)];
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions,exercises,workouts,stats:[]}}));
 await page.route('**/api/v1/results/session',async r=>{writes++;workouts=(await r.request().postDataJSON()).results;return r.fulfill({status:204})});
 await page.goto('/');
 await expect(page.locator('nav')).toHaveCount(0);
 await expect.poll(()=>page.locator('.rail').evaluate(e=>e.scrollLeft)).toBeGreaterThan(300);
 await expect(page.getByRole('heading',{name:'Current week'})).toBeInViewport();
 await expect(page.getByRole('button',{name:/Bench Press/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toBeVisible();
 await expect(page.locator('.view').nth(1).evaluate(view=>getComputedStyle(view).overflowY)).resolves.toBe('auto');
 await expect(page.locator('.pagination strong')).toHaveCount(0);
 await expect(page.getByLabel('Bench Press set 1 reps')).toHaveCount(0);
 await page.getByRole('button',{name:/Bench Press/}).click();
 await page.getByLabel('Bench Press set 1 reps').fill('5');
 await page.getByLabel('Bench Press set 1 weight').fill('135');
 await page.getByLabel('Remove set from Bench Press').click();
 await expect(page.getByLabel('Remove set from Bench Press')).toBeDisabled();
 await page.getByLabel('Add set to Bench Press').click();
 await expect(page.getByLabel('Bench Press set 2 reps')).toBeVisible();
 await page.getByLabel('Remove set from Bench Press').click();
 await page.getByRole('button',{name:/Bent Over Row/}).click();
 await page.getByLabel('Remove Bent Over Row').click();
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toHaveCount(0);
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect.poll(()=>writes).toBe(1);
 await expect(page.getByText('Submitted')).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:/Bench Press/}).click();
 await expect(page.getByLabel('Bench Press set 2 reps')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toHaveCount(0);
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
