import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {ExerciseIcon} from './ExerciseIcon';

const routineExerciseIds=[
 'bench-press','bulgarian-split-squat','romanian-deadlift','bent-over-row','face-pull',
 'jump-squat','box-squat','dumbbell-bench','lat-pulldown','reverse-fly','v-up',
 'incline-bench','deadlift','close-grip-bench','squat','seated-cable-row','leg-curl',
 'dumbbell-floor-press','one-arm-dumbbell-row','dumbbell-shoulder-press',
 'dumbbell-lateral-raise','hammer-curl','overhead-dumbbell-triceps-extension',
 'goblet-squat','dumbbell-romanian-deadlift','reverse-lunge','single-leg-calf-raise',
 'bodyweight-bulgarian-split-squat','bodyweight-row','push-up','pull-up','plank',
 'bodyweight-squat','bodyweight-split-squat','bodyweight-single-leg-calf-raise','deadbug',
 'dumbbell-front-squat','single-leg-dumbbell-deadlift','sit-up','dumbbell-bent-over-row',
 'bodyweight-single-leg-hip-thrust','dumbbell-biceps-curl','lying-leg-raise',
 'dumbbell-standing-calf-raise','chin-up','dumbbell-upright-row',
 'ab-wheel',
];

describe('ExerciseIcon',()=>{
 it('renders an illustration for every routine exercise',()=>{
  for(const exerciseId of routineExerciseIds){
   expect(renderToStaticMarkup(<ExerciseIcon exerciseId={exerciseId}/>),exerciseId).toContain('<img');
  }
 });

 it('renders nothing for an unknown exercise',()=>{
  expect(renderToStaticMarkup(<ExerciseIcon exerciseId="unknown"/>)).toBe('');
 });
});
