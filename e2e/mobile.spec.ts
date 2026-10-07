import {test,expect} from '@playwright/test';
const cachedVersion={id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''};
const cachedExercise={versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'',guidance:''};
const cachedWorkout=(reps:string,weight:string)=>({recordId:'2026-09-02:bench:1',sessionDate:'2026-09-02',versionId:'v1',cycleWeek:6,dayName:'Wednesday — Strength',exerciseId:'bench',exerciseName:'Bench Press',setNumber:1,reps,weight,comment:'',updatedAt:'2026-09-02T12:00:00.000Z'});
test('version-specific exercise instructions override shared catalog guidance',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-16T12:00:00'));
 const exercise={...cachedExercise,exerciseId:'push-up',exerciseName:'Push-Up',targetReps:'5–20',instructions:'Start at RPE 7, about three reps in reserve.',guidance:'Old program: progress after three sets of fifteen.'};
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions:[cachedVersion],exercises:[exercise],workouts:[],stats:[]}}));
 await page.goto('/gym/');
 await page.getByRole('button',{name:/Push-Up.*reps/}).click();
 await expect(page.getByText(exercise.instructions,{exact:true})).toBeVisible();
 await expect(page.getByText(exercise.guidance,{exact:true})).toHaveCount(0);
 await expect(page.locator('.exercise-icon')).toHaveCount(1);
 await expect(page.locator('.current-workout-view time')).toHaveText('2026-09-16');
});
test('mobile workout editor groups a day and submits it as one replacement',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 let writes=0;
 const versions=[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}];
 const exercises=[{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'',guidance:'Work up through warm-up sets to a heavy 3–5-rep max.'},{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,exerciseId:'row',exerciseName:'Bent Over Row',exerciseOrder:2,sets:2,targetReps:'8–12',restSeconds:90,equipment:'Barbell',instructions:'',guidance:'Pair this pull with face pulls.'},{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:5,dayName:'Friday — Strength',dayOrder:2,exerciseId:'squat',exerciseName:'Squat',exerciseOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'',guidance:'Work up to a heavy set.'}];
 const saved=(exerciseId:string,exerciseName:string,setNumber:number)=>({recordId:`2026-09-02:${exerciseId}:${setNumber}`,sessionDate:'2026-09-02',versionId:'v1',cycleWeek:6,dayName:'Wednesday — Strength',exerciseId,exerciseName,setNumber,reps:'5',weight:'100',comment:'',updatedAt:'2026-09-02T12:00:00.000Z'});
 let workouts=[saved('bench','Bench Press',1),saved('bench','Bench Press',2),saved('row','Bent Over Row',1),saved('row','Bent Over Row',2)];
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions,exercises,workouts,stats:[]}}));
 await page.route('**/api/v1/results/session',async r=>{writes++;workouts=(await r.request().postDataJSON()).results;return r.fulfill({status:204})});
 await page.goto('/gym/');
 await expect(page.locator('nav')).toHaveCount(0);
 await expect.poll(()=>page.locator('.rail').evaluate(e=>e.scrollLeft)).toBeGreaterThan(300);
 await expect(page.getByRole('heading',{name:"Today's workout"})).toBeInViewport();
 const rootOverflow=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).overflowY}));
 expect(rootOverflow).toEqual({html:'visible',body:'visible'});
 await expect(page.getByRole('button',{name:/Bench Press/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Bent Over Row/})).toBeVisible();
 await expect(page.locator('.view').nth(1).evaluate(view=>getComputedStyle(view).overflowY)).resolves.toBe('auto');
 await expect(page.getByRole('button',{name:'All workout days',exact:true})).toHaveCount(0);
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
 expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('gym-tracker:workout-draft:')))).toBe(false);
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
 await page.goto('/gym/');
 await expect(page.getByRole('heading',{name:'Next workout'})).toBeInViewport();
 await expect(page.locator('.compact-header').getByText('Friday — Strength')).toBeVisible();
 await expect(page.getByText(/2026-09-04/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Squat'})).toBeVisible();
 await expect(page.getByRole('button',{name:'All workout days',exact:true})).toHaveCount(0);
});

test('renders a superset as one expandable row with two editable blocks',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 const shared={versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,sets:3,targetReps:'8–12',restSeconds:90,instructions:''};
 const exercises=[
  {...shared,exerciseId:'pulldown',exerciseName:'Lat Pulldown',exerciseOrder:1,equipment:'Cable',supersetId:'pull-rear-delt',guidance:'Pair these with reverse flyes as a superset.'},
  {...shared,exerciseId:'reverse-fly',exerciseName:'Reverse Fly',exerciseOrder:2,equipment:'Dumbbell',supersetId:'pull-rear-delt',guidance:'Pair these with lat pulldowns as a superset.'},
 ];
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[cachedVersion],exercises,workouts:[],stats:[]}}));
 await page.goto('/gym/');
 const superset=page.locator('.current-exercise.superset');
 await expect(superset).toHaveCount(1);
 await expect(superset.getByRole('button',{name:/Lat Pulldown.*Reverse Fly.*Superset/})).toBeVisible();
 await expect(page.getByLabel('Lat Pulldown set 1 reps')).toHaveCount(0);
 await expect(superset.getByRole('heading',{name:'Reverse Fly'})).toHaveCount(0);
 await superset.locator('.exercise-row').click();
 const details=superset.locator('.exercise-details');
 await expect(details).toHaveCount(2);
 await expect(details.nth(0).getByRole('heading')).toHaveCount(0);
 await expect(details.nth(1).locator(':scope > h3:first-child')).toHaveText('Reverse Fly');
 await expect(page.getByLabel('Lat Pulldown set 1 reps')).toBeVisible();
 await expect(page.getByLabel('Reverse Fly set 1 reps')).toBeVisible();
 await expect(page.getByLabel('Add comment for Lat Pulldown')).toBeVisible();
 await expect(page.getByLabel('Add comment for Reverse Fly')).toBeVisible();
 await expect(page.getByLabel('Remove Lat Pulldown')).toBeVisible();
 await expect(page.getByLabel('Remove Reverse Fly')).toBeVisible();
});

test('shows the complete new routine when today has results from an older version',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 const shared={versionId:'v2',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,sets:3,targetReps:'8–12',restSeconds:90,instructions:'',supersetId:'pull-pair',guidance:''};
 const exercises=[
  {...shared,exerciseId:'pulldown',exerciseName:'Lat Pulldown',exerciseOrder:1,equipment:'Cable'},
  {...shared,exerciseId:'reverse-fly',exerciseName:'Reverse Fly',exerciseOrder:2,equipment:'Dumbbell'},
 ];
 const versions=[{...cachedVersion,id:'v1',effectiveTo:'2026-09-01'},{...cachedVersion,id:'v2',effectiveFrom:'2026-09-02'}];
 const oldResult={...cachedWorkout('10','80'),versionId:'v1',exerciseId:'pulldown',exerciseName:'Lat Pulldown'};
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions,exercises,workouts:[oldResult],stats:[]}}));
 await page.goto('/gym/');
 const superset=page.locator('.current-exercise.superset');
 await expect(superset).toContainText('Lat Pulldown');
 await expect(superset).toContainText('Reverse Fly');
 await superset.locator('.exercise-row').click();
 await expect(page.getByLabel('Lat Pulldown set 1 reps')).toHaveValue('10');
 await expect(page.getByLabel('Reverse Fly set 1 reps')).toHaveValue('');
});

test('local draft survives reload and overrides refreshed Sheet values',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 let sheetWeight='100';
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[cachedVersion],exercises:[cachedExercise],workouts:[cachedWorkout('5',sheetWeight)],stats:[]}}));
 await page.goto('/gym/');
 await page.getByRole('button',{name:/Bench Press/}).click();
 const reps=page.getByLabel('Bench Press set 1 reps');
 const weight=page.getByLabel('Bench Press set 1 weight');
 await expect(reps).toHaveValue('5');
 await expect(reps.evaluate(input=>getComputedStyle(input).color)).resolves.toBe('rgb(119, 119, 119)');
 await reps.focus();
 await expect(reps).toHaveValue('');
 await reps.fill('6');
 await weight.focus();
 await weight.fill('135');
 sheetWeight='225';
 await page.reload();
 await page.getByRole('button',{name:/Bench Press/}).click();
 await expect(reps).toHaveValue('6');
 await expect(weight).toHaveValue('135');
 await expect(weight.evaluate(input=>getComputedStyle(input).color)).resolves.not.toBe('rgb(119, 119, 119)');
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect(page.getByText('Submit failed — try again')).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:/Bench Press/}).click();
 await expect(reps).toHaveValue('6');
 await expect(weight).toHaveValue('135');
});

test('history expands workouts and preserves recorded exercise order',async({page})=>{
 const base={sessionDate:'2026-08-31',versionId:'v1',cycleWeek:1,dayName:'Monday — Strength',reps:'5',weight:'100',comment:'',updatedAt:'2026-08-31T12:00:00.000Z'};
 const workouts=[
  {...base,recordId:'row-1',exerciseId:'row',exerciseName:'Bent Over Row',setNumber:1},
  {...base,recordId:'row-2',exerciseId:'row',exerciseName:'Bent Over Row',setNumber:2},
  {...base,recordId:'bench-1',exerciseId:'bench',exerciseName:'Bench Press',setNumber:1},
 ];
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}],exercises:[],workouts,stats:[]}}));
 await page.goto('/gym/');
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

test('opens a historical workout in the editor and saves its changes',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-23T12:00:00'));
 let workouts=[cachedWorkout('5','100')];
 let writes=0;
 let submitted:any;
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[cachedVersion],exercises:[cachedExercise],workouts,stats:[]}}));
 await page.route('**/api/v1/results/session',async route=>{writes++;submitted=route.request().postDataJSON();workouts=submitted.results;await route.fulfill({status:204})});
 await page.goto('/gym/');
 await page.locator('.rail').evaluate(element=>element.scrollTo({left:0}));
 await page.getByRole('button',{name:/2026-09-02.*1 exercise/}).click();
 await page.getByRole('button',{name:'Edit workout'}).click();
 await expect(page.getByRole('heading',{name:'Edit workout'})).toBeInViewport();
 await expect(page.locator('.current-workout-view time')).toHaveText('2026-09-02');
 await page.getByRole('button',{name:/Bench Press.*reps/}).click();
 await page.getByLabel('Bench Press set 1 weight').fill('105');
 await page.getByRole('button',{name:'Cancel'}).click();
 await expect(page.getByRole('heading',{name:'History'})).toBeInViewport();
 expect(writes).toBe(0);
 await page.getByRole('button',{name:'Edit workout'}).click();
 await page.getByRole('button',{name:/Bench Press.*reps/}).click();
 await expect(page.getByLabel('Bench Press set 1 weight')).toHaveValue('100');
 await page.getByLabel('Bench Press set 1 weight').fill('105');
 await page.getByRole('button',{name:'Save'}).click();
 await expect(page.getByText('Changes saved',{exact:true})).toBeVisible();
 expect(writes).toBe(1);
 expect(submitted.sessionDate).toBe('2026-09-02');
 expect(submitted.results[0]).toMatchObject({versionId:'v1',exerciseId:'bench',weight:'105'});
});

test('stats uses expandable exercise blocks instead of pages',async({page})=>{
 const stats=[
  {exerciseId:'bench',exerciseName:'Bench Press',period:'all',sessions:4,firstWeight:'100',latestWeight:'120',bestWeight:'125',change:'20',changePercent:'20%',lastPerformed:'2026-08-31'},
  {exerciseId:'row',exerciseName:'Bent Over Row',period:'all',sessions:3,firstWeight:'80',latestWeight:'90',bestWeight:'90',change:'10',changePercent:'12.5%',lastPerformed:'2026-08-31'},
 ];
 await page.route('**/api/v1/bootstrap',route=>route.fulfill({json:{versions:[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}],exercises:[],workouts:[],stats}}));
 await page.goto('/gym/');
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

test('browse workout days, retain drafts, and submit a past or upcoming date',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 const friday={...cachedExercise,dayOfWeek:5,dayName:'Friday — Strength',exerciseId:'squat',exerciseName:'Squat'};
 let submitted:any;
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions:[cachedVersion],exercises:[cachedExercise,friday],workouts:[],stats:[]}}));
 await page.route('**/api/v1/results/session',async r=>{submitted=r.request().postDataJSON();await r.fulfill({status:204})});
 await page.goto('/gym/');
 const fridayButton=page.getByRole('button',{name:/Next workout: Friday — Strength.*2026-09-04/});
 await revealEdge(page,1);await fridayButton.click();
 await page.getByRole('button',{name:/Squat.*reps/}).click();
 await page.getByLabel('Squat set 1 reps').fill('8');
 await revealEdge(page,-1);await page.getByRole('button',{name:/Previous workout: Wednesday — Strength.*2026-09-02/}).click();
 await revealEdge(page,1);await fridayButton.click();
 await page.getByRole('button',{name:/Squat.*reps/}).click();
 await expect(page.getByLabel('Squat set 1 reps')).toHaveValue('8');
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect(page.getByText('Submitted',{exact:true})).toBeVisible();
 expect(submitted.sessionDate).toBe('2026-09-04');
 expect(submitted.results[0]).toMatchObject({exerciseId:'squat',reps:'8',sessionDate:'2026-09-04'});
 await revealEdge(page,-1);await page.getByRole('button',{name:/Previous workout: Wednesday/}).click();
 await revealEdge(page,-1);await page.getByRole('button',{name:/Previous workout: Friday/}).click();
 await revealEdge(page,-1);await page.getByRole('button',{name:/Previous workout: Wednesday/}).click();
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect(page.getByText('Submitted',{exact:true})).toBeVisible();
 expect(submitted.sessionDate).toBe('2026-08-26');
 await expect(page.locator('.view').nth(1).evaluate(view=>view.scrollWidth<=view.clientWidth)).resolves.toBe(true);
 await revealEdge(page,1);await page.getByRole('button',{name:/Next workout: Friday/}).click();
 await revealEdge(page,1);await page.getByRole('button',{name:/Next workout: Wednesday/}).click();
 await expect(page.getByRole('heading',{name:"Today's workout"})).toBeVisible();
});

async function navigationFixture(page:import('@playwright/test').Page){
 await page.clock.install({time:new Date('2026-09-02T12:00:00')});
 const friday={...cachedExercise,dayOfWeek:5,dayName:'Friday — Strength',exerciseId:'squat',exerciseName:'Squat'};
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions:[cachedVersion],exercises:[{...cachedExercise,sets:12},friday],workouts:[],stats:[]}}));
 await page.goto('/gym/');
 await page.clock.pauseAt(new Date('2026-09-02T12:01:00'));
}
async function touch(page:import('@playwright/test').Page,type:string,y:number){
 await page.locator('[aria-label="Current week"]').evaluate((view,{type,y})=>{
  const point=new Touch({identifier:1,target:view,clientX:200,clientY:y});
  view.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[point]}));
 },{type,y});
}
test('touch pressure needs half a second at an edge and cancels on release',async({page})=>{
 await navigationFixture(page);
 await page.getByRole('button',{name:/Bench Press.*reps/}).click();
 const view=page.locator('[aria-label="Current week"]');
 await view.evaluate(el=>el.scrollTop=100);
 await touch(page,'touchstart',600);await touch(page,'touchmove',550);await touch(page,'touchmove',500);
 await page.clock.runFor(600);
 await expect(page.getByRole('heading',{name:"Today's workout"})).toBeVisible();
 await touch(page,'touchend',500);
 await view.evaluate(el=>el.scrollTop=el.scrollHeight);
 await touch(page,'touchstart',600);await touch(page,'touchmove',580);await touch(page,'touchmove',530);
 await page.clock.runFor(499);
 await expect(page.getByRole('heading',{name:"Today's workout"})).toHaveCount(1);
 await touch(page,'touchend',530);await page.clock.runFor(600);
 await expect(page.getByRole('heading',{name:"Today's workout"})).toHaveCount(1);
 await touch(page,'touchstart',600);await touch(page,'touchmove',580);await touch(page,'touchmove',530);
 await page.clock.runFor(501);
 await expect(page.getByRole('button',{name:/Squat.*reps/})).toBeVisible();
 await touch(page,'touchmove',450);await page.clock.runFor(600);
 await expect(page.getByRole('button',{name:/Squat.*reps/})).toBeVisible();
 await touch(page,'touchend',450);
});
test('Mac wheel pressure advances once, while ordinary PC wheel does not',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'Win32'}));
 await navigationFixture(page);
 const view=page.locator('[aria-label="Current week"]');
 const wheel=()=>view.dispatchEvent('wheel',{deltaY:50,deltaX:0});
 await view.evaluate(el=>el.scrollTop=el.scrollHeight);
 for(let i=0;i<7;i++){await wheel();await page.clock.runFor(100)}
 await expect(page.getByRole('heading',{name:"Today's workout"})).toHaveCount(1);
 await page.evaluate(()=>Object.defineProperty(navigator,'platform',{get:()=> 'MacIntel'}));
 for(let i=0;i<7;i++){await wheel();await page.clock.runFor(100)}
 await expect(page.getByRole('button',{name:/Squat.*reps/})).toBeVisible();
 for(let i=0;i<7;i++){await wheel();await page.clock.runFor(100)}
 await expect(page.getByRole('button',{name:/Squat.*reps/})).toBeVisible();
});

async function revealEdge(page:import('@playwright/test').Page,direction:number){
 const view=page.locator('[aria-label="Current week"]');
 await view.evaluate((el,d)=>el.scrollTop=d===1?el.scrollHeight:0,direction);
 // Allow the prior page transition and gesture lock to settle.
 await page.waitForTimeout(320);
 await view.dispatchEvent('wheel',{deltaY:direction*60,deltaX:0});
}
test('workout header explains a transition from a six-week cycle to a weekly routine',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-14T12:00:00'));
 const versions=[
  {...cachedVersion,id:'old',name:'Previous strength program',effectiveFrom:'2026-09-14',effectiveTo:'2026-09-15'},
  {...cachedVersion,id:'new',name:'New weekly program',effectiveFrom:'2026-09-16',cycleWeeks:1},
 ];
 const exercises=[
  {...cachedExercise,versionId:'old',dayOfWeek:1,dayName:'Monday — Gym'},
  {...cachedExercise,versionId:'new',weekTo:1},
  {...cachedExercise,versionId:'new',weekTo:1,dayOfWeek:5,dayName:'Friday — Home'},
 ];
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions,exercises,workouts:[],stats:[]}}));
 await page.goto('/gym/');
 const header=page.locator('.current-workout-view .compact-header');
 await expect(header).toContainText("Today's workout");
 await expect(header.locator('.eyebrow')).toHaveText('Previous strength program · Week 1 of 6');
 await revealEdge(page,1);
 await page.getByRole('button',{name:/Next workout: Wednesday/}).click();
 await expect(header.locator('time')).toHaveText('2026-09-16');
 await expect(header.locator('.eyebrow')).toHaveText('New weekly program · Repeats weekly');
 await expect(header).not.toContainText('Week 1 of 1');
 await expect(page.locator('.current-workout-view').evaluate(el=>el.scrollWidth<=el.clientWidth)).resolves.toBe(true);
 await page.screenshot({path:'test-results/routine-cycle-transition.png'});
 await revealEdge(page,1);
 await page.getByRole('button',{name:/Next workout: Friday/}).click();
 await expect(header.locator('.eyebrow')).toHaveText('New weekly program · Repeats weekly');
 await revealEdge(page,-1);
 await page.getByRole('button',{name:/Previous workout: Wednesday/}).click();
 await revealEdge(page,-1);
 await page.getByRole('button',{name:/Previous workout: Monday/}).click();
 await expect(header.locator('time')).toHaveText('2026-09-14');
 await expect(header.locator('.eyebrow')).toHaveText('Previous strength program · Week 1 of 6');
});
test('edge popup stays hidden until an extra scroll and disappears on reversal',async({page})=>{
 await navigationFixture(page);
 await page.getByRole('button',{name:/Bench Press.*reps/}).click();
 const view=page.locator('[aria-label="Current week"]');
 await expect(page.locator('.workout-edge')).toHaveCount(0);
 await view.evaluate(el=>el.scrollTop=100);
 await view.dispatchEvent('wheel',{deltaY:100});
 await expect(page.locator('.workout-edge')).toHaveCount(0);
 await view.evaluate(el=>el.scrollTop=el.scrollHeight);
 await expect(page.locator('.workout-edge')).toHaveCount(0);
 await view.dispatchEvent('wheel',{deltaY:20});
 await expect(page.locator('.workout-edge')).toHaveCount(0);
 await view.dispatchEvent('wheel',{deltaY:30});
 await expect(page.getByRole('button',{name:/Next workout: Friday/})).toBeVisible();
 await view.dispatchEvent('wheel',{deltaY:-30});
 await expect(page.locator('.workout-edge')).toHaveCount(0);
 await view.evaluate(el=>el.scrollTop=0);
 await view.dispatchEvent('wheel',{deltaY:-60});
 await expect(page.getByRole('button',{name:/Previous workout: Friday/})).toBeVisible();
 const control=page.getByRole('button',{name:/Previous workout: Friday/});
 await expect(control).toHaveText('Friday');
 const top=await control.boundingBox();
 const header=await view.locator('.compact-header').boundingBox();
 expect(top!.height).toBeLessThanOrEqual(40);
 expect(top!.width).toBeLessThan(130);
 expect(top!.y+top!.height).toBeLessThanOrEqual(header!.y);
 await view.dispatchEvent('wheel',{deltaY:60});
 await view.evaluate(el=>el.scrollTop=el.scrollHeight);
 await view.dispatchEvent('wheel',{deltaY:60});
 const bottomControl=page.getByRole('button',{name:/Next workout: Friday/});
 await expect(bottomControl).toHaveText('Friday');
 const bottom=await bottomControl.boundingBox();
 const submit=await page.getByRole('button',{name:'Submit workout'}).boundingBox();
 expect(bottom!.y).toBeGreaterThanOrEqual(submit!.y+submit!.height);
 await page.screenshot({path:'test-results/workout-edge-inline.png'});
});

test('native Android touch scrolls content before revealing the next-page popup',async({page,context})=>{
 await navigationFixture(page);
 await page.getByRole('button',{name:/Bench Press.*reps/}).click();
 const view=page.locator('[aria-label="Current week"]');
 const cdp=await context.newCDPSession(page);
 const send=(type:string,y:number)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:30,y}]});
 await send('touchStart',700);
 for(const y of [650,600,550,500,450])await send('touchMove',y);
 await send('touchEnd',450);
 await expect.poll(()=>view.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await expect(page.locator('.workout-edge')).toHaveCount(0);
 await view.evaluate(el=>el.scrollTop=el.scrollHeight);
 await send('touchStart',700);
 for(const y of [680,650,620,590])await send('touchMove',y);
 await expect(page.getByRole('button',{name:/Next workout: Friday/})).toBeVisible();
 await page.clock.runFor(501);
 await expect(page.getByRole('button',{name:/Squat.*reps/})).toBeVisible();
 await send('touchEnd',590);
});

test('Friday navigates to Wednesday across routine versions and submits its original version',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-11T12:00:00'));
 const versions=[{...cachedVersion,id:'old',effectiveFrom:'2026-09-02',effectiveTo:'2026-09-09'},{...cachedVersion,id:'current',effectiveFrom:'2026-09-10',effectiveTo:'2026-09-13'},{...cachedVersion,id:'future',effectiveFrom:'2026-09-14'}];
 const exercises=[{...cachedExercise,versionId:'old'},{...cachedExercise,versionId:'current',dayOfWeek:5,dayName:'Friday — Home Upper',exerciseId:'squat',exerciseName:'Squat'},{...cachedExercise,versionId:'future',dayOfWeek:1,dayName:'Monday — New routine'}];
 let submitted:any;
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions,exercises,workouts:[],stats:[]}}));
 await page.route('**/api/v1/results/session',async r=>{submitted=r.request().postDataJSON();await r.fulfill({status:204})});
 await page.goto('/gym/');
 await expect(page.locator('.current-workout-view .compact-header')).toContainText('2026-09-11');
 await revealEdge(page,-1);
 await page.getByRole('button',{name:/Previous workout: Wednesday.*2026-09-09/}).click({timeout:2500});
 await expect(page.locator('.current-workout-view .compact-header')).toContainText('2026-09-09');
 await page.getByRole('button',{name:/Bench Press.*reps/}).click();
 await page.getByLabel('Bench Press set 1 reps').fill('7');
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect(page.getByText('Submitted',{exact:true})).toBeVisible();
 expect(submitted.sessionDate).toBe('2026-09-09');
 expect(submitted.results[0]).toMatchObject({versionId:'old',exerciseId:'bench',reps:'7'});
 await revealEdge(page,1);
 await page.getByRole('button',{name:/Next workout: Friday.*2026-09-11/}).click();
 await revealEdge(page,1);
 await page.getByRole('button',{name:/Next workout: Monday.*2026-09-14/}).click();
 await expect(page.locator('.current-workout-view .compact-header')).toContainText('2026-09-14');
});

test('replaces a workout exercise with a catalogue exercise',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 const versions=[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}];
 const shared={versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:3,dayName:'Wednesday — Strength',dayOrder:1,sets:2,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:'',guidance:''};
 const exercises=[{...shared,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1},{...shared,exerciseId:'row',exerciseName:'Bent Over Row',exerciseOrder:2}];
 const catalogue=[{exerciseId:'goblet-squat',exerciseName:'Goblet Squat',guidance:'Hold the bell at your chest.'},{exerciseId:'row',exerciseName:'Bent Over Row',guidance:''}];
 let submitted:any[]=[];
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions,exercises,catalogue,workouts:[],stats:[]}}));
 await page.route('**/api/v1/results/session',async r=>{submitted=(await r.request().postDataJSON()).results;return r.fulfill({status:204})});
 await page.goto('/gym/');
 await page.getByRole('button',{name:/Bench Press/}).click();
 await page.getByLabel('Bench Press set 1 reps').fill('5');
 await page.getByRole('button',{name:'Replace Bench Press'}).click();
 await expect(page.getByLabel('Search exercise catalogue')).toBeVisible();
 // Exercises already in the workout are not offered as replacements.
 await expect(page.getByRole('button',{name:'Replace with Bent Over Row'})).toHaveCount(0);
 await page.getByLabel('Search exercise catalogue').fill('goblet');
 await page.getByRole('button',{name:'Replace with Goblet Squat'}).click();
 await expect(page.getByRole('button',{name:'Goblet Squat 3–5 reps · 180s rest'})).toBeVisible();
 // Logged values are cleared, catalogue guidance is shown, the slot scheme is kept.
 await expect(page.getByLabel('Goblet Squat set 1 reps')).toHaveValue('');
 await expect(page.getByText('Hold the bell at your chest.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Goblet Squat 3–5 reps · 180s rest'}).getByText('3–5 reps · 180s rest')).toBeVisible();
 // The replacement survives a reload through the draft.
 await page.reload();
 await page.getByRole('button',{name:'Goblet Squat 3–5 reps · 180s rest'}).click();
 await expect(page.getByLabel('Goblet Squat set 1 reps')).toBeVisible();
 await page.getByLabel('Goblet Squat set 1 reps').fill('10');
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect(page.getByText('Submitted')).toBeVisible();
 expect(submitted[0].exerciseId).toBe('goblet-squat');
 expect(submitted[0].exerciseName).toBe('Goblet Squat');
 expect(submitted[0].reps).toBe('10');
});
