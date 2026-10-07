export interface RoutineVersion {id:string; name:string; effectiveFrom:string; effectiveTo:string; cycleWeeks:number; notes:string}
export interface RoutineExercise {versionId:string; weekFrom:number; weekTo:number; dayOfWeek:number; dayName:string; dayOrder:number; exerciseId:string; exerciseName:string; exerciseOrder:number; sets:number; targetReps:string; restSeconds:number; equipment:string; instructions:string; supersetId:string; guidance:string}
export interface WorkoutSet {recordId:string; sessionDate:string; versionId:string; cycleWeek:number; dayName:string; exerciseId:string; exerciseName:string; setNumber:number; reps:string; weight:string; comment:string; updatedAt:string}
export interface Stat {exerciseId:string; exerciseName:string; period:string; sessions:string; firstWeight:string; latestWeight:string; bestWeight:string; change:string; changePercent:string; lastPerformed:string}
export interface CatalogueExercise {exerciseId:string; exerciseName:string; guidance:string}
export interface Bootstrap {versions:RoutineVersion[]; exercises:RoutineExercise[]; catalogue:CatalogueExercise[]; workouts:WorkoutSet[]; stats:Stat[]}
