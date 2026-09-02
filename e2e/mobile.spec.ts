import {test,expect} from '@playwright/test';
test('four-view mobile flow starts on Current and saves a set',async({page})=>{
 let writes=0;
 await page.route('**/api/v1/bootstrap',r=>r.fulfill({json:{versions:[{id:'v1',name:'Test routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:6,notes:''}],exercises:[{versionId:'v1',weekFrom:1,weekTo:6,dayOfWeek:1,dayName:'Monday — Strength',dayOrder:1,exerciseId:'bench',exerciseName:'Bench Press',exerciseOrder:1,sets:5,targetReps:'3–5',restSeconds:180,equipment:'Barbell',instructions:''}],workouts:[],stats:[]}}));
 await page.route('**/api/v1/results',r=>{writes++; return r.fulfill({status:204})});
 await page.goto('/');
 await expect(page.locator('nav').getByRole('button')).toHaveCount(4);
 await expect.poll(()=>page.locator('.rail').evaluate(e=>e.scrollLeft)).toBeGreaterThan(300);
 await expect(page.getByRole('heading',{name:'Current week'})).toBeInViewport();
 await expect(page.locator('footer')).toHaveCount(0);
 await expect(page.locator('nav')).not.toContainText('Menu');
 await expect.poll(()=>page.locator('.view').evaluateAll(views=>views.slice(0,3).every(view=>getComputedStyle(view).overflowY==='hidden'&&view.scrollHeight===view.clientHeight))).toBe(true);
 await page.getByLabel('Bench Press set 1 reps').fill('5');
 await page.getByLabel('Bench Press set 1 weight').fill('135');
 await expect.poll(()=>writes).toBe(5);
 await page.getByRole('button',{name:'Context'}).click();
 await expect(page.getByRole('heading',{name:'About the app'})).toBeInViewport();
});
