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
import seatedRow from '@bryllim/workout-guide/assets/seated-row/frame-1.png';
import legCurl from '@bryllim/workout-guide/assets/leg-curl/frame-1.png';
import oneArmDumbbellRow from '@bryllim/workout-guide/assets/one-arm-dumbbell-row/frame-1.png';
import standingDumbbellPress from '@bryllim/workout-guide/assets/standing-dumbbell-press/frame-1.png';
import lateralRaise from '@bryllim/workout-guide/assets/lateral-raise/frame-1.png';
import hammerCurl from '@bryllim/workout-guide/assets/hammer-curl/frame-1.png';
import dumbbellOverheadTricepExtension from '@bryllim/workout-guide/assets/dumbbell-overhead-tricep-extension/frame-1.png';
import gobletSquat from '@bryllim/workout-guide/assets/goblet-squat/frame-1.png';
import reverseLunge from '@bryllim/workout-guide/assets/reverse-lunge/frame-1.png';
import singleLegCalfRaise from '@bryllim/workout-guide/assets/single-leg-calf-raise/frame-1.png';
import invertedRow from '@bryllim/workout-guide/assets/inverted-row/frame-1.png';
import pushUp from '@bryllim/workout-guide/assets/push-up/frame-1.png';
import pullUp from '@bryllim/workout-guide/assets/pull-up/frame-1.png';
import plank from '@bryllim/workout-guide/assets/plank/frame-1.png';
import bodyweightSquat from '@bryllim/workout-guide/assets/bodyweight-squat/frame-1.png';
import splitSquat from '@bryllim/workout-guide/assets/split-squat/frame-1.png';
import deadBug from '@bryllim/workout-guide/assets/dead-bug/frame-1.png';
import dumbbellBentOverRow from '@bryllim/workout-guide/assets/dumbbell-bent-over-row/frame-1.png';
import singleLegDeadlift from '@bryllim/workout-guide/assets/single-leg-romanian-deadlift/frame-1.png';
import singleLegHipThrust from '../assets/exercises/single-leg-hip-thrust.svg';
import dumbbellFrontSquat from '../assets/exercises/dumbbell-front-squat.svg';
import sitUp from '../assets/exercises/sit-up.svg';
import dumbbellUprightRow from '../assets/exercises/dumbbell-upright-row.svg';
import bicepCurl from '@bryllim/workout-guide/assets/bicep-curl/frame-1.png';
import lyingLegRaise from '@bryllim/workout-guide/assets/lying-leg-raise/frame-1.png';
import standingCalfRaise from '@bryllim/workout-guide/assets/standing-calf-raise/frame-1.png';
import chinUp from '@bryllim/workout-guide/assets/chin-up/frame-1.png';
import abWheel from '@bryllim/workout-guide/assets/ab-wheel/frame-1.png';

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
 'seated-cable-row':seatedRow,
 'leg-curl':legCurl,
 'dumbbell-floor-press':dumbbellBenchPress,
 'one-arm-dumbbell-row':oneArmDumbbellRow,
 'dumbbell-shoulder-press':standingDumbbellPress,
 'dumbbell-lateral-raise':lateralRaise,
 'hammer-curl':hammerCurl,
 'overhead-dumbbell-triceps-extension':dumbbellOverheadTricepExtension,
 'goblet-squat':gobletSquat,
 'dumbbell-romanian-deadlift':dumbbellRomanianDeadlift,
 'reverse-lunge':reverseLunge,
 'single-leg-calf-raise':singleLegCalfRaise,
 'bodyweight-bulgarian-split-squat':bulgarianSplitSquat,
 'bodyweight-row':invertedRow,
 'push-up':pushUp,
 'pull-up':pullUp,
 plank,
 'bodyweight-squat':bodyweightSquat,
 'bodyweight-split-squat':splitSquat,
 'bodyweight-single-leg-calf-raise':singleLegCalfRaise,
 deadbug:deadBug,
 'dumbbell-front-squat':dumbbellFrontSquat,
 'single-leg-dumbbell-deadlift':singleLegDeadlift,
 'sit-up':sitUp,
 'dumbbell-bent-over-row':dumbbellBentOverRow,
 'bodyweight-single-leg-hip-thrust':singleLegHipThrust,
 'dumbbell-biceps-curl':bicepCurl,
 'lying-leg-raise':lyingLegRaise,
 'dumbbell-standing-calf-raise':standingCalfRaise,
 'chin-up':chinUp,
 'dumbbell-upright-row':dumbbellUprightRow,
 'ab-wheel':abWheel,
};

export function ExerciseIcon({exerciseId}:{exerciseId:string}){
 const src=icons[exerciseId];
 return src?<img className="exercise-icon" src={src} alt="" aria-hidden="true"/>:null;
}
