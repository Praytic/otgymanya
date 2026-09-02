export function exerciseCatalog(routineRows, workoutRows = []) {
  const exercises = new Map();
  for (const row of [...routineRows, ...workoutRows]) {
    const id = String(row[0] ?? '').trim();
    const name = String(row[1] ?? '').trim();
    if (!id || !name) continue;
    const existing = exercises.get(id);
    if (existing && existing !== name) throw new Error(`Conflicting names for exercise ${id}`);
    exercises.set(id, name);
  }
  return [...exercises].sort((a, b) => a[1].localeCompare(b[1]));
}

export function recordedExercises(workoutRows, catalogRows) {
  const catalog = new Map(catalogRows.filter(row => row[0] && row[1]).map(row => [String(row[0]), String(row[1])]));
  const ids = new Set(workoutRows.map(row => String(row[0] ?? '')).filter(Boolean));
  return [...ids].sort().map(id => {
    const name = catalog.get(id);
    if (!name) throw new Error(`Recorded exercise ${id} is missing from Exercises`);
    return [id, name];
  });
}
