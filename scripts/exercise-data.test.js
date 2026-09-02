import {describe, expect, it} from 'vitest';
import {exerciseCatalog, recordedExercises} from './exercise-data.mjs';

describe('exercise sheet data', () => {
  it('builds one catalog row for every routine or historical exercise', () => {
    expect(exerciseCatalog([['squat', 'Squat'], ['bench', 'Bench Press'], ['squat', 'Squat']], [['row', 'Row']]))
      .toEqual([['bench', 'Bench Press'], ['row', 'Row'], ['squat', 'Squat']]);
  });

  it('includes only exercises that have at least one workout record', () => {
    expect(recordedExercises([['squat'], ['squat'], ['row']], [['bench', 'Bench Press'], ['row', 'Row'], ['squat', 'Squat']]))
      .toEqual([['row', 'Row'], ['squat', 'Squat']]);
  });
});
