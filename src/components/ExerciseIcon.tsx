import benchPress from '@bryllim/workout-guide/assets/bench-press/frame-1.png';
import barbellRow from '@bryllim/workout-guide/assets/barbell-row/frame-1.png';
import squat from '@bryllim/workout-guide/assets/squat/frame-1.png';
import bulgarianSplitSquat from '@bryllim/workout-guide/assets/bulgarian-split-squat/frame-1.png';
import closeGripBenchPress from '@bryllim/workout-guide/assets/close-grip-bench-press/frame-1.png';
import deadlift from '@bryllim/workout-guide/assets/deadlift/frame-1.png';
import dumbbellBenchPress from '@bryllim/workout-guide/assets/dumbbell-bench-press/frame-1.png';
import bandedFacePull from '@bryllim/workout-guide/assets/banded-face-pull/frame-1.png';
import inclineBenchPress from '@bryllim/workout-guide/assets/incline-bench-press/frame-1.png';
import jumpSquat from '@bryllim/workout-guide/assets/jump-squat/frame-1.png';
import latPulldown from '@bryllim/workout-guide/assets/lat-pulldown/frame-1.png';
import rearDeltFly from '@bryllim/workout-guide/assets/rear-delt-fly/frame-1.png';
import dumbbellRomanianDeadlift from '@bryllim/workout-guide/assets/dumbbell-romanian-deadlift/frame-1.png';
import vUp from '@bryllim/workout-guide/assets/v-up/frame-1.png';

const icons:Record<string,string>={
 'bench-press':benchPress,
 'bent-over-row':barbellRow,
 'box-squat':squat,
 'bulgarian-split-squat':bulgarianSplitSquat,
 'close-grip-bench':closeGripBenchPress,
 deadlift,
 'dumbbell-bench':dumbbellBenchPress,
 'face-pull':bandedFacePull,
 'incline-bench':inclineBenchPress,
 'jump-squat':jumpSquat,
 'lat-pulldown':latPulldown,
 'reverse-fly':rearDeltFly,
 'romanian-deadlift':dumbbellRomanianDeadlift,
 squat,
 'v-up':vUp,
};

export function ExerciseIcon({exerciseId}:{exerciseId:string}){
 const src=icons[exerciseId];
 return src?<img className="exercise-icon" src={src} alt="" aria-hidden="true"/>:null;
}
