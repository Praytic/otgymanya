import {describe,expect,it,vi} from 'vitest';
import {GymTelegramBot} from './gym-bot.mjs';

const data={versions:[{id:'v1',name:'Routine',effectiveFrom:'2026-01-01',effectiveTo:'',cycleWeeks:1,notes:''}],exercises:[{versionId:'v1',weekFrom:1,weekTo:1,dayOfWeek:1,dayName:'Monday',dayOrder:1,exerciseId:'squat',exerciseName:'Squat',exerciseOrder:1,sets:1,targetReps:'5',restSeconds:180,equipment:'Barbell',instructions:'',supersetId:'',guidance:'Stay tight.'}],workouts:[],stats:[{exerciseId:'squat',exerciseName:'Squat',period:'all',sessions:'2',firstWeight:'100',latestWeight:'110',bestWeight:'110',change:'10',changePercent:'10%',lastPerformed:'2026-09-07'}]};
function setup(){const calls=[];const api={call:vi.fn(async(method,body)=>{calls.push([method,body]);if(method==='sendMessage')return {message_id:9};return true})};const sheets={loadBootstrap:vi.fn(async()=>structuredClone(data)),replaceSession:vi.fn(async()=>{})};const stateStore={load:()=>({}),save:vi.fn()};const bot=new GymTelegramBot({api,sheets,chatId:'42',stateStore,contextPath:'WORKOUT_CONTEXT.md',now:()=>new Date('2026-09-07T12:00:00')});return {bot,api,sheets,calls}}

describe('GymTelegramBot',()=>{
 it('renders all navigation as inline buttons on its dashboard',async()=>{const {bot,calls}=setup();await bot.refresh();await bot.render();const body=calls.at(-1)[1];expect(body.reply_markup.inline_keyboard.flat().map(item=>item.text)).toEqual(expect.arrayContaining(['History','Current','Stats','Context','Squat','Submit workout']))});
 it('ignores messages outside the configured chat',async()=>{const {bot,api}=setup();await bot.handle({message:{chat:{id:99},text:'/start'}});expect(api.call).not.toHaveBeenCalled()});
 it('answers foreign callback queries without changing state',async()=>{const {bot,api}=setup();await bot.handle({callback_query:{id:'q1',message:{chat:{id:99}},data:'v:h'}});expect(api.call).toHaveBeenCalledWith('answerCallbackQuery',expect.objectContaining({show_alert:true}));expect(bot.state.view).toBe('c')});
 it('submits and verifies a whole session through the shared Sheet store',async()=>{const {bot,sheets}=setup();await bot.refresh();await bot.action('submit');expect(sheets.replaceSession).toHaveBeenCalledWith('2026-09-07',expect.arrayContaining([expect.objectContaining({exerciseId:'squat'})]))});
});
