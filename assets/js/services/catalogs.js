import { api } from "./api.js";
import { state } from "../state.js";

export async function ensureCatalogs() {
  const [exercises, workouts, programs, muscles] = await Promise.all([
    api("exercises"),
    api("workout-templates"),
    api("training-programs"),
    api("muscle-groups"),
  ]);

  Object.assign(state, {
    exercises,
    workouts,
    programs,
    muscles,
  });

  return state;
}
