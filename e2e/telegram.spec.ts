import {test,expect} from '@playwright/test';
test('Telegram uses the web UI, signed API requests, safe areas and native Back',async({page})=>{
 await page.route('https://telegram.org/js/**',route=>route.fulfill({body:''}));
 await page.addInitScript(()=>{
  const calls:string[]=[];(window as any).telegramCalls=calls;
  (window as any).Telegram={WebApp:{initData:'signed-test-session',ready:()=>{calls.push('ready');document.documentElement.style.setProperty('--tg-viewport-stable-height','720px');document.documentElement.style.setProperty('--tg-content-safe-area-inset-top','32px')},expand:()=>calls.push('expand'),isVersionAtLeast:()=>true,setHeaderColor:()=>{},setBackgroundColor:()=>{},setBottomBarColor:()=>{},disableVerticalSwipes:()=>calls.push('disable-swipes'),BackButton:{show:()=>calls.push('show-back'),hide:()=>calls.push('hide-back'),onClick:(fn:()=>void)=>(window as any).telegramBack=fn,offClick:()=>{}}}};
 });
 await page.route('**/api/v1/**',async route=>{
  expect(route.request().headers()['x-telegram-init-data']).toBe('signed-test-session');
  if(route.request().url().endsWith('/context'))return route.fulfill({json:{text:'# Workout context\nExample context'}});
  return route.fulfill({json:{versions:[{id:'v1',name:'Routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:1}],exercises:[],workouts:[],stats:[]}});
 });
 await page.goto('/?telegram=1');
 await expect(page.locator('.view')).toHaveCount(4);
 await expect(page.locator('html')).toHaveClass('telegram');
 expect(await page.locator('.rail').evaluate(el=>el.clientHeight)).toBe(720);
 expect(await page.locator('.view').first().evaluate(el=>getComputedStyle(el).paddingTop)).toBe('52px');
 await page.locator('.rail').evaluate(el=>el.scrollTo({left:el.clientWidth*3}));
 await expect(page.getByRole('heading',{name:'Workout context'})).toBeInViewport();
 await expect.poll(()=>page.evaluate(()=>(window as any).telegramCalls.includes('show-back'))).toBe(true);
 await page.evaluate(()=>(window as any).telegramBack());
 await expect.poll(()=>page.locator('.rail').evaluate(el=>Math.round(el.scrollLeft/el.clientWidth))).toBe(1);
 expect(await page.evaluate(()=>(window as any).telegramCalls)).toEqual(expect.arrayContaining(['ready','expand','disable-swipes','hide-back']));
});
test('unsigned Mini App cannot display a previously cached routine',async({page})=>{
 await page.route('https://telegram.org/js/**',route=>route.fulfill({body:''}));
 await page.addInitScript(()=>localStorage.setItem('gym-tracker:sheet-cache:v1',JSON.stringify({versions:[{id:'v1',effectiveFrom:'2026-01-01',cycleWeeks:1}],exercises:[],workouts:[],stats:[]})));
 await page.route('**/api/v1/**',route=>route.fulfill({status:401,json:{error:{message:'Open Gym from Telegram to continue.'}}}));
 await page.goto('/?telegram=1');
 await expect(page.getByText('Open Gym from Telegram to continue.')).toBeVisible();
 await expect(page.locator('.rail')).toHaveCount(0);
});

test('Telegram workout draft survives reopening and submits through the signed API',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-02T12:00:00'));
 await page.route('https://telegram.org/js/**',route=>route.fulfill({body:''}));
 await page.addInitScript(()=>{(window as any).Telegram={WebApp:{initData:'signed-test-session',ready:()=>{},expand:()=>{},isVersionAtLeast:()=>false,BackButton:{show:()=>{},hide:()=>{},onClick:()=>{},offClick:()=>{}}}}});
 let submitted:any;
 await page.route('**/api/v1/**',async route=>{
  expect(route.request().headers()['x-telegram-init-data']).toBe('signed-test-session');
  if(route.request().url().endsWith('/results/session')){submitted=route.request().postDataJSON();return route.fulfill({status:204})}
  if(route.request().url().endsWith('/context'))return route.fulfill({json:{text:'# Context'}});
  return route.fulfill({json:{versions:[{id:'v1',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:1}],exercises:[{versionId:'v1',weekFrom:1,weekTo:1,dayOfWeek:3,dayName:'Wednesday',dayOrder:1,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1,sets:1,targetReps:'5',restSeconds:120}],workouts:[],stats:[]}});
 });
 await page.goto('/?telegram=1');
 await page.getByRole('button',{name:/Bench Press/}).click();
 await page.getByLabel('Bench Press set 1 reps').fill('5');
 await page.getByLabel('Bench Press set 1 weight').fill('135');
 await page.reload();
 await page.getByRole('button',{name:/Bench Press/}).click();
 await expect(page.getByLabel('Bench Press set 1 weight')).toHaveValue('135');
 await page.getByRole('button',{name:'Submit workout'}).click();
 await expect(page.getByText('Submitted',{exact:true})).toBeVisible();
 expect(submitted.results).toHaveLength(1);
 expect(submitted.results[0]).toMatchObject({reps:'5',weight:'135',exerciseId:'bench'});
 expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('gym-tracker:workout-draft:')))).toBe(false);
});
